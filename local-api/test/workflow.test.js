import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { createApp } from '../src/server.js'
import { request } from './test-helpers.js'

const sampleCsv = [
  'member_id,first_name,last_name,phone,npi_location,facility',
  '1001,Alice,Ng,+15550000001,1234567890,Clinic A',
  '1002,Bob,Diaz,+15550000002,1234567890,Clinic A',
  '1003,Missing,Phone,,1234567890,Clinic A'
].join('\n')

async function importBatch(app, csvText = sampleCsv) {
  const { response, json } = await request(app, '/api/nyec/mef/batches', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ fileName: 'sample.csv', csvText })
  })

  assert.equal(response.status, 201)
  assert.equal(json.ok, true)
  return json.data
}

async function createCampaign(app, batchId, overrides = {}) {
  const { response, json } = await request(app, '/api/nyec/campaigns', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      name: 'Launch Batch A',
      batchId,
      dailyLimit: 1,
      messageTemplate: 'Hello {{firstName}}',
      ...overrides
    })
  })

  assert.equal(response.status, 201)
  assert.equal(json.ok, true)
  return json.data
}

describe('operational local workflow', () => {
  it('imports MEF CSV from JSON text and stores rejected rows', async () => {
    const app = createApp({ env: { NODE_ENV: 'test', TWILIO_MODE: 'TEST' } })

    const batch = await importBatch(app)

    assert.equal(batch.fileName, 'sample.csv')
    assert.equal(batch.totalRows, 3)
    assert.equal(batch.validRows, 2)
    assert.equal(batch.rejectedRows, 1)
    assert.equal(batch.records.length, 2)
    assert.equal(batch.rejections.length, 1)
    assert.match(batch.rejections[0].reason, /phone/i)

    const batchesResponse = await request(app, '/api/nyec/mef/batches')
    assert.equal(batchesResponse.response.status, 200)
    assert.equal(batchesResponse.json.data[0].id, batch.id)
  })

  it('dispatches eligible recipients, respects daily limits, and simulates when Twilio is not live-configured', async () => {
    const app = createApp({ env: { NODE_ENV: 'test', TWILIO_MODE: 'TEST' } })
    const batch = await importBatch(app)
    const campaign = await createCampaign(app, batch.id)

    const launchResponse = await request(app, `/api/nyec/campaigns/${campaign.id}/launch`, {
      method: 'POST'
    })
    assert.equal(launchResponse.response.status, 200)

    const dispatchResponse = await request(app, `/api/nyec/campaigns/${campaign.id}/dispatch`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({})
    })

    assert.equal(dispatchResponse.response.status, 200)
    assert.equal(dispatchResponse.json.ok, true)
    assert.equal(dispatchResponse.json.data.selected, 1)
    assert.equal(dispatchResponse.json.data.queued, 1)
    assert.equal(dispatchResponse.json.data.simulated, 1)
    assert.equal(dispatchResponse.json.data.provider, 'SIMULATED')

    const campaignDetail = await request(app, `/api/nyec/campaigns/${campaign.id}`)
    assert.equal(campaignDetail.response.status, 200)
    assert.equal(campaignDetail.json.data.sentCount, 1)
    assert.equal(campaignDetail.json.data.remainingCount, 1)

    const billingSummary = await request(app, '/api/nyec/billing/summary')
    assert.equal(billingSummary.response.status, 200)
    assert.equal(billingSummary.json.data.billableMessages, 1)
  })

  it('honors STOP opt-outs and START re-subscriptions across dispatch runs', async () => {
    const app = createApp({ env: { NODE_ENV: 'test', TWILIO_MODE: 'TEST' } })
    const batch = await importBatch(app, [
      'member_id,first_name,last_name,phone',
      '1001,Alice,Ng,+15550000001',
      '1002,Bob,Diaz,+15550000002'
    ].join('\n'))
    const campaign = await createCampaign(app, batch.id, { dailyLimit: 2 })

    await request(app, '/api/nyec/sms/inbound', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ From: '+15550000001', Body: 'STOP' })
    })
    await request(app, `/api/nyec/campaigns/${campaign.id}/launch`, { method: 'POST' })

    const firstDispatch = await request(app, `/api/nyec/campaigns/${campaign.id}/dispatch`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({})
    })
    assert.equal(firstDispatch.response.status, 200)
    assert.equal(firstDispatch.json.data.selected, 1)
    assert.equal(firstDispatch.json.data.skippedOptOuts, 1)

    await request(app, '/api/nyec/sms/inbound', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ From: '+15550000001', Body: 'START' })
    })

    const secondDispatch = await request(app, `/api/nyec/campaigns/${campaign.id}/dispatch`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({})
    })
    assert.equal(secondDispatch.response.status, 200)
    assert.equal(secondDispatch.json.data.selected, 1)
    assert.equal(secondDispatch.json.data.skippedOptOuts, 0)
  })

  it('updates outbound message status from Twilio callbacks', async () => {
    const app = createApp({ env: { NODE_ENV: 'test', TWILIO_MODE: 'TEST' } })
    const batch = await importBatch(app, [
      'member_id,first_name,last_name,phone',
      '1001,Alice,Ng,+15550000001'
    ].join('\n'))
    const campaign = await createCampaign(app, batch.id)

    await request(app, `/api/nyec/campaigns/${campaign.id}/launch`, { method: 'POST' })
    const dispatchResponse = await request(app, `/api/nyec/campaigns/${campaign.id}/dispatch`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({})
    })
    const messageSid = dispatchResponse.json.data.messages[0].sid

    const callbackResponse = await request(app, '/api/nyec/sms/status', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ MessageSid: messageSid, MessageStatus: 'delivered' })
    })
    assert.equal(callbackResponse.response.status, 200)

    const detailResponse = await request(app, `/api/nyec/campaigns/${campaign.id}`)
    assert.equal(detailResponse.response.status, 200)
    assert.equal(detailResponse.json.data.messages[0].status, 'delivered')
  })

  it('resets local testing state outside production and blocks reset in production', async () => {
    const app = createApp({ env: { NODE_ENV: 'test', TWILIO_MODE: 'TEST' } })
    const batch = await importBatch(app)
    await createCampaign(app, batch.id)

    const resetResponse = await request(app, '/api/nyec/admin/reset', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({})
    })
    assert.equal(resetResponse.response.status, 200)
    assert.equal(resetResponse.json.data.campaigns, 0)
    assert.equal(resetResponse.json.data.mefBatches, 0)

    const campaignsResponse = await request(app, '/api/nyec/campaigns')
    assert.deepEqual(campaignsResponse.json.data, [])

    const productionApp = createApp({ env: { NODE_ENV: 'production', TWILIO_MODE: 'TEST' } })
    const deniedResponse = await request(productionApp, '/api/nyec/admin/reset', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({})
    })
    assert.equal(deniedResponse.response.status, 403)
    assert.equal(deniedResponse.json.error.code, 'FORBIDDEN')
  })
})
