import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { createTwilioClient } from '../src/twilio.js'

describe('Twilio client', () => {
  it('builds a Twilio Messages API request with Basic auth and messaging service', async () => {
    const calls = []
    const client = createTwilioClient(
      {
        accountSid: 'AC1234567890',
        authToken: 'secret-token',
        messagingServiceSid: 'MG1234567890',
        fromNumber: '',
        callbackBaseUrl: 'https://example.test'
      },
      async (request) => {
        calls.push(request)
        return { statusCode: 201, body: { sid: 'SM123', status: 'queued' } }
      }
    )

    const result = await client.sendTestSms({
      to: '+15005550006',
      body: 'NYeC outreach test'
    })

    assert.equal(result.sid, 'SM123')
    assert.equal(calls.length, 1)
    assert.equal(calls[0].method, 'POST')
    assert.equal(calls[0].url, 'https://api.twilio.com/2010-04-01/Accounts/AC1234567890/Messages.json')
    assert.equal(calls[0].headers.authorization, `Basic ${Buffer.from('AC1234567890:secret-token').toString('base64')}`)
    assert.equal(calls[0].form.To, '+15005550006')
    assert.equal(calls[0].form.Body, 'NYeC outreach test')
    assert.equal(calls[0].form.MessagingServiceSid, 'MG1234567890')
    assert.equal(calls[0].form.StatusCallback, 'https://example.test/api/nyec/sms/status')
  })

  it('uses From when no messaging service SID is configured', async () => {
    const calls = []
    const client = createTwilioClient(
      {
        accountSid: 'AC1234567890',
        authToken: 'secret-token',
        messagingServiceSid: '',
        fromNumber: '+15005550006',
        callbackBaseUrl: 'http://localhost:3001'
      },
      async (request) => {
        calls.push(request)
        return { statusCode: 201, body: { sid: 'SM456', status: 'queued' } }
      }
    )

    await client.sendTestSms({ to: '+15005550006', body: 'From number test' })

    assert.equal(calls[0].form.From, '+15005550006')
    assert.equal(calls[0].form.MessagingServiceSid, undefined)
  })
})
