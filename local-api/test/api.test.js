import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { createApp } from '../src/server.js'
import { request } from './test-helpers.js'

describe('local API', () => {
  const app = createApp({
    env: {
      NODE_ENV: 'test',
      TWILIO_MODE: 'TEST'
    }
  })

  it('reports health', async () => {
    const { response, json } = await request(app, '/health')

    assert.equal(response.status, 200)
    assert.equal(json.ok, true)
    assert.equal(json.data.status, 'ok')
  })

  it('serves dashboard data under the existing API contract', async () => {
    const { response, json } = await request(app, '/api/nyec/dashboard')

    assert.equal(response.status, 200)
    assert.equal(json.ok, true)
    assert.equal(json.data.twilioStatus, 'Configured for test mode')
    assert.equal(typeof json.data.messagesSentToday, 'number')
  })

  it('returns a clear error when Twilio credentials are missing', async () => {
    const { response, json } = await request(app, '/api/nyec/twilio/test', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ to: '+15005550006', body: 'NYeC test message' })
    })

    assert.equal(response.status, 400)
    assert.equal(json.ok, false)
    assert.equal(json.error.code, 'TWILIO_NOT_CONFIGURED')
    assert.match(json.error.message, /TWILIO_ACCOUNT_SID/)
  })

  it('sends Twilio test SMS through the configured provider', async () => {
    const calls = []
    const configuredApp = createApp({
      env: {
        NODE_ENV: 'test',
        TWILIO_MODE: 'TEST',
        TWILIO_ACCOUNT_SID: 'AC1234567890',
        TWILIO_AUTH_TOKEN: 'secret-token',
        TWILIO_MESSAGING_SERVICE_SID: 'MG1234567890',
        TWILIO_CALLBACK_BASE_URL: 'http://localhost:3001'
      },
      twilioTransport: async (request) => {
        calls.push(request)
        return { statusCode: 201, body: { sid: 'SM789', status: 'queued' } }
      }
    })

    const { response, json } = await request(configuredApp, '/api/nyec/twilio/test', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ to: '+15005550006', body: 'Route test' })
    })

    assert.equal(response.status, 200)
    assert.equal(json.ok, true)
    assert.equal(json.data.sid, 'SM789')
    assert.equal(json.data.status, 'queued')
    assert.equal(calls[0].form.Body, 'Route test')
  })

  it('masks Twilio secrets when reading and updating config', async () => {
    const configurableApp = createApp({
      env: {
        NODE_ENV: 'test',
        TWILIO_MODE: 'TEST'
      }
    })

    const updateResponse = await request(configurableApp, '/api/nyec/twilio/config', {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        mode: 'LIVE',
        accountSid: 'AC1234567890ABCDEF',
        authToken: 'twilio-secret-token',
        messagingServiceSid: 'MG1234567890ABCDE',
        callbackBaseUrl: 'https://example.test/hooks'
      })
    })

    assert.equal(updateResponse.response.status, 200)
    assert.equal(updateResponse.json.ok, true)
    assert.equal(updateResponse.json.data.accountSid, 'AC12********CDEF')
    assert.equal(updateResponse.json.data.messagingServiceSid, 'MG12********BCDE')
    assert.equal(updateResponse.json.data.authToken, 'twil********oken')

    const readResponse = await request(configurableApp, '/api/nyec/twilio/config')
    assert.equal(readResponse.response.status, 200)
    assert.equal(readResponse.json.data.mode, 'LIVE')
    assert.equal(readResponse.json.data.accountSid, 'AC12********CDEF')
    assert.equal(readResponse.json.data.authToken, 'twil********oken')
  })
})
