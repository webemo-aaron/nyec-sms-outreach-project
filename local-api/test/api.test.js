import assert from 'node:assert/strict'
import { Readable, Writable } from 'node:stream'
import { describe, it } from 'node:test'

import { createApp } from '../src/server.js'

async function request(app, path, options = {}) {
  const body = options.body ?? ''
  const requestStream = Readable.from(body ? [Buffer.from(body)] : [])
  requestStream.method = options.method ?? 'GET'
  requestStream.url = path
  requestStream.headers = {
    host: 'localhost',
    'content-type': 'application/json',
    ...(options.headers ?? {})
  }

  let statusCode = 0
  let responseBody = ''
  const responseStream = new Writable({
    write(chunk, _encoding, callback) {
      responseBody += chunk.toString('utf8')
      callback()
    }
  })
  responseStream.writeHead = (code) => {
    statusCode = code
  }

  await app(requestStream, responseStream)

  return {
    response: { status: statusCode },
    json: JSON.parse(responseBody)
  }
}

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
      body: JSON.stringify({ to: '+15005550006', body: 'Route test' })
    })

    assert.equal(response.status, 200)
    assert.equal(json.ok, true)
    assert.equal(json.data.sid, 'SM789')
    assert.equal(json.data.status, 'queued')
    assert.equal(calls[0].form.Body, 'Route test')
  })
})
