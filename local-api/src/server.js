import http from 'node:http'

import { loadConfig } from './config.js'
import { createStore } from './store.js'
import { createTwilioClient } from './twilio.js'

function jsonResponse(response, statusCode, body) {
  response.writeHead(statusCode, {
    'content-type': 'application/json',
    'access-control-allow-origin': '*',
    'access-control-allow-methods': 'GET,POST,PUT,OPTIONS',
    'access-control-allow-headers': 'content-type'
  })
  response.end(JSON.stringify(body))
}

async function readJson(request) {
  const chunks = []
  for await (const chunk of request) chunks.push(chunk)
  const body = Buffer.concat(chunks).toString('utf8')
  if (!body) return {}
  return JSON.parse(body)
}

function ok(response, data, statusCode = 200) {
  jsonResponse(response, statusCode, { ok: true, data })
}

function error(response, statusCode, code, message) {
  jsonResponse(response, statusCode, { ok: false, error: { code, message } })
}

function twilioConfig(config) {
  return {
    mode: config.twilio.mode,
    accountSid: config.twilio.accountSid
      ? `${config.twilio.accountSid.slice(0, 4)}********${config.twilio.accountSid.slice(-4)}`
      : '',
    messagingServiceSid: config.twilio.messagingServiceSid
      ? `${config.twilio.messagingServiceSid.slice(0, 4)}********${config.twilio.messagingServiceSid.slice(-4)}`
      : '',
    callbackBaseUrl: config.twilio.callbackBaseUrl,
    sendWindowStart: '09:00',
    sendWindowEnd: '17:00',
    maxRetryAttempts: 5,
    status: config.twilio.accountSid ? 'Configured' : 'Missing credentials'
  }
}

function missingTwilioCredentials(config) {
  const missing = []
  if (!config.twilio.accountSid) missing.push('TWILIO_ACCOUNT_SID')
  if (!config.twilio.authToken) missing.push('TWILIO_AUTH_TOKEN')
  if (!config.twilio.messagingServiceSid && !config.twilio.fromNumber) {
    missing.push('TWILIO_MESSAGING_SERVICE_SID or TWILIO_FROM_NUMBER')
  }
  return missing
}

export function createApp(options = {}) {
  const config = loadConfig(options.env)
  const store = options.store ?? createStore({ dataFile: config.dataFile })
  const twilioClient = options.twilioClient ?? createTwilioClient(config.twilio, options.twilioTransport)

  return async function app(request, response) {
    const url = new URL(request.url, `http://${request.headers.host ?? 'localhost'}`)

    if (request.method === 'OPTIONS') return ok(response, {})
    if (request.method === 'GET' && url.pathname === '/health') {
      return ok(response, { status: 'ok', service: 'nyec-local-api' })
    }

    try {
      if (request.method === 'GET' && url.pathname === '/api/nyec/dashboard') return ok(response, store.dashboard())
      if (request.method === 'GET' && url.pathname === '/api/nyec/mef/batches') return ok(response, store.mefBatches())
      if (request.method === 'GET' && url.pathname === '/api/nyec/campaigns') return ok(response, store.campaigns())
      if (request.method === 'POST' && url.pathname === '/api/nyec/campaigns') return ok(response, store.createCampaign(await readJson(request)), 201)
      if (request.method === 'GET' && url.pathname === '/api/nyec/dispatches') return ok(response, store.dispatches())
      if (request.method === 'GET' && url.pathname === '/api/nyec/billing/summary') return ok(response, store.billing())
      if (request.method === 'GET' && url.pathname === '/api/nyec/audit/events') return ok(response, store.auditEvents())
      if (request.method === 'GET' && url.pathname === '/api/nyec/twilio/config') return ok(response, twilioConfig(config))
      if (request.method === 'PUT' && url.pathname === '/api/nyec/twilio/config') {
        const payload = await readJson(request)
        store.recordAudit('TWILIO_CONFIG_CHANGED', { ...payload, authToken: undefined })
        return ok(response, { status: 'saved', mode: payload.mode ?? config.twilio.mode })
      }
      if (request.method === 'POST' && url.pathname === '/api/nyec/twilio/test') {
        const missing = missingTwilioCredentials(config)
        if (missing.length) {
          return error(
            response,
            400,
            'TWILIO_NOT_CONFIGURED',
            `Missing Twilio test credential environment variables: ${missing.join(', ')}`
          )
        }
        const payload = await readJson(request)
        const result = await twilioClient.sendTestSms(payload)
        store.recordAudit('TWILIO_TEST_SMS_SENT', { to: payload.to, sid: result.sid, status: result.status })
        return ok(response, { ...result, provider: 'Twilio', to: payload.to })
      }
      if (request.method === 'POST' && url.pathname === '/api/nyec/sms/status') {
        return ok(response, store.recordAudit('TWILIO_STATUS_CALLBACK', await readJson(request)))
      }
      if (request.method === 'POST' && url.pathname === '/api/nyec/sms/inbound') {
        return ok(response, store.recordAudit('TWILIO_INBOUND_CALLBACK', await readJson(request)))
      }
    } catch (caught) {
      return error(response, 400, 'BAD_REQUEST', caught.message)
    }

    return error(response, 404, 'NOT_FOUND', `No route for ${request.method} ${url.pathname}`)
  }
}

export function createServer(options = {}) {
  return http.createServer(createApp(options))
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const config = loadConfig()
  createServer().listen(config.port, config.host, () => {
    console.log(`NYeC local API listening on http://${config.host}:${config.port}`)
  })
}
