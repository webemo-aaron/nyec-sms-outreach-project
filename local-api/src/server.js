import http from 'node:http'

import { loadConfig } from './config.js'
import { createStore, TWILIO_MESSAGE_COST } from './store.js'
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

async function readRawBody(request) {
  const chunks = []
  for await (const chunk of request) chunks.push(chunk)
  return Buffer.concat(chunks).toString('utf8')
}

function parseFormEncoded(body) {
  const params = new URLSearchParams(body)
  return Object.fromEntries(params.entries())
}

async function readPayload(request) {
  const body = await readRawBody(request)
  if (!body) return {}

  const contentType = String(request.headers['content-type'] ?? '').split(';')[0].trim().toLowerCase()
  if (contentType === 'application/json') return JSON.parse(body)
  if (contentType === 'application/x-www-form-urlencoded') return parseFormEncoded(body)
  if (contentType === 'text/plain' || contentType === 'text/csv') return body
  return body
}

function ok(response, data, statusCode = 200) {
  jsonResponse(response, statusCode, { ok: true, data })
}

function error(response, statusCode, code, message) {
  jsonResponse(response, statusCode, { ok: false, error: { code, message } })
}

function maskSecret(value) {
  if (!value) return ''
  if (value.length <= 8) return `${value[0] ?? ''}********${value.at(-1) ?? ''}`
  return `${value.slice(0, 4)}********${value.slice(-4)}`
}

function twilioConfigView(twilioConfig) {
  const configured =
    Boolean(twilioConfig.accountSid) &&
    Boolean(twilioConfig.authToken) &&
    Boolean(twilioConfig.messagingServiceSid || twilioConfig.fromNumber)

  return {
    mode: twilioConfig.mode,
    accountSid: maskSecret(twilioConfig.accountSid),
    authToken: maskSecret(twilioConfig.authToken),
    messagingServiceSid: maskSecret(twilioConfig.messagingServiceSid),
    fromNumber: twilioConfig.fromNumber,
    callbackBaseUrl: twilioConfig.callbackBaseUrl,
    sendWindowStart: '09:00',
    sendWindowEnd: '17:00',
    maxRetryAttempts: 5,
    configured,
    status: twilioConfig.mode === 'TEST' ? 'Configured for test mode' : configured ? 'Configured' : 'Missing credentials'
  }
}

function missingTwilioCredentials(twilioConfig) {
  const missing = []
  if (!twilioConfig.accountSid) missing.push('TWILIO_ACCOUNT_SID')
  if (!twilioConfig.authToken) missing.push('TWILIO_AUTH_TOKEN')
  if (!twilioConfig.messagingServiceSid && !twilioConfig.fromNumber) {
    missing.push('TWILIO_MESSAGING_SERVICE_SID or TWILIO_FROM_NUMBER')
  }
  return missing
}

function isLiveTwilioEnabled(twilioConfig) {
  return twilioConfig.mode === 'LIVE' && missingTwilioCredentials(twilioConfig).length === 0
}

function matchRoute(pathname, pattern) {
  const match = pathname.match(pattern)
  return match ? match.slice(1) : null
}

function normalizeImportPayload(payload) {
  if (typeof payload === 'string') return { fileName: 'uploaded.csv', csvText: payload }
  if (typeof payload?.csvText === 'string') {
    return {
      fileName: payload.fileName ?? 'uploaded.csv',
      csvText: payload.csvText
    }
  }
  if (typeof payload?.body === 'string') {
    return {
      fileName: payload.fileName ?? 'uploaded.csv',
      csvText: payload.body
    }
  }
  throw new Error('MEF import requires CSV text in the request body or csvText JSON field')
}

export function createApp(options = {}) {
  const config = loadConfig(options.env)
  const store =
    options.store ??
    createStore({
      dataFile: config.dataFile,
      seedTwilioConfig: config.twilio
    })

  async function sendThroughProvider(payload) {
    const twilioConfig = store.getTwilioConfig()
    if (!isLiveTwilioEnabled(twilioConfig)) {
      return {
        sid: `SIM${Date.now()}${Math.floor(Math.random() * 1000)}`,
        status: 'queued',
        provider: 'SIMULATED',
        simulated: true,
        cost: 0
      }
    }

    const twilioClient = options.twilioClient ?? createTwilioClient(twilioConfig, options.twilioTransport)
    const result = await twilioClient.sendMessage(payload)
    return {
      ...result,
      provider: 'Twilio',
      simulated: false,
      cost: TWILIO_MESSAGE_COST
    }
  }

  return async function app(request, response) {
    const url = new URL(request.url, `http://${request.headers.host ?? 'localhost'}`)

    if (request.method === 'OPTIONS') return ok(response, {})
    if (request.method === 'GET' && url.pathname === '/health') {
      return ok(response, { status: 'ok', service: 'nyec-local-api' })
    }

    try {
      const campaignMatch = matchRoute(url.pathname, /^\/api\/nyec\/campaigns\/([^/]+)$/)
      const launchMatch = matchRoute(url.pathname, /^\/api\/nyec\/campaigns\/([^/]+)\/launch$/)
      const pauseMatch = matchRoute(url.pathname, /^\/api\/nyec\/campaigns\/([^/]+)\/pause$/)
      const dispatchMatch = matchRoute(url.pathname, /^\/api\/nyec\/campaigns\/([^/]+)\/(?:dispatch|dispatches|run-dispatch)$/)
      const mefBatchMatch = matchRoute(url.pathname, /^\/api\/nyec\/mef\/batches\/([^/]+)$/)

      if (request.method === 'GET' && url.pathname === '/api/nyec/dashboard') return ok(response, store.dashboard())
      if (request.method === 'GET' && url.pathname === '/api/nyec/mef/batches') return ok(response, store.mefBatches())
      if (request.method === 'GET' && mefBatchMatch) {
        const batch = store.mefBatches().find((entry) => String(entry.id) === String(mefBatchMatch[0]))
        if (!batch) throw new Error(`MEF batch ${mefBatchMatch[0]} not found`)
        return ok(response, batch)
      }
      if (request.method === 'POST' && (url.pathname === '/api/nyec/mef/import' || url.pathname === '/api/nyec/mef/batches')) {
        const payload = normalizeImportPayload(await readPayload(request))
        return ok(response, store.importMefBatch(payload), 201)
      }

      if (request.method === 'GET' && url.pathname === '/api/nyec/campaigns') return ok(response, store.campaigns())
      if (request.method === 'POST' && url.pathname === '/api/nyec/campaigns') {
        return ok(response, store.createCampaign(await readPayload(request)), 201)
      }
      if (request.method === 'GET' && campaignMatch) return ok(response, store.campaign(campaignMatch[0]))
      if (request.method === 'POST' && launchMatch) return ok(response, store.launchCampaign(launchMatch[0]))
      if (request.method === 'POST' && pauseMatch) return ok(response, store.pauseCampaign(pauseMatch[0]))
      if (request.method === 'POST' && dispatchMatch) {
        await readPayload(request)
        return ok(
          response,
          await store.dispatchCampaign(dispatchMatch[0], {
            provider: isLiveTwilioEnabled(store.getTwilioConfig()) ? 'Twilio' : 'SIMULATED',
            sender: async ({ recipient, body }) =>
              sendThroughProvider({
                to: recipient.phone,
                body
              })
          })
        )
      }

      if (request.method === 'GET' && url.pathname === '/api/nyec/dispatches') {
        const campaignId = url.searchParams.get('campaignId')
        return ok(response, campaignId ? store.dispatchesForCampaign(campaignId) : store.dispatches())
      }
      if (request.method === 'GET' && url.pathname === '/api/nyec/outbound-messages') {
        return ok(response, store.outboundMessages({
          campaignId: url.searchParams.get('campaignId'),
          dispatchId: url.searchParams.get('dispatchId')
        }))
      }
      if (request.method === 'GET' && url.pathname === '/api/nyec/opt-outs') return ok(response, store.optOuts())
      if (request.method === 'GET' && url.pathname === '/api/nyec/billing/summary') return ok(response, store.billing())
      if (request.method === 'GET' && url.pathname === '/api/nyec/audit/events') return ok(response, store.auditEvents())
      if (request.method === 'GET' && url.pathname === '/api/nyec/twilio/config') {
        return ok(response, twilioConfigView(store.getTwilioConfig()))
      }
      if (request.method === 'PUT' && url.pathname === '/api/nyec/twilio/config') {
        const updatedConfig = store.updateTwilioConfig(await readPayload(request))
        return ok(response, twilioConfigView(updatedConfig))
      }
      if (request.method === 'POST' && url.pathname === '/api/nyec/twilio/test') {
        const twilioConfig = store.getTwilioConfig()
        const missing = missingTwilioCredentials(twilioConfig)
        if (missing.length) {
          return error(
            response,
            400,
            'TWILIO_NOT_CONFIGURED',
            `Missing Twilio test credential environment variables: ${missing.join(', ')}`
          )
        }
        const payload = await readPayload(request)
        const twilioClient = options.twilioClient ?? createTwilioClient(twilioConfig, options.twilioTransport)
        const result = await twilioClient.sendTestSms(payload)
        store.recordAudit('TWILIO_TEST_SMS_SENT', { to: payload.to, sid: result.sid, status: result.status })
        return ok(response, { ...result, provider: 'Twilio', to: payload.to })
      }
      if (request.method === 'POST' && url.pathname === '/api/nyec/sms/status') {
        return ok(response, store.updateMessageStatus(await readPayload(request)))
      }
      if (request.method === 'POST' && url.pathname === '/api/nyec/sms/inbound') {
        return ok(response, store.processInboundMessage(await readPayload(request)))
      }
      if (request.method === 'POST' && (url.pathname === '/api/nyec/reset' || url.pathname === '/api/nyec/admin/reset' || url.pathname === '/api/nyec/admin/reset-local-data')) {
        if (config.nodeEnv === 'production') return error(response, 403, 'FORBIDDEN', 'Reset is disabled in production')
        const reset = store.reset()
        return ok(response, {
          status: 'reset',
          message: 'Local API data reset',
          deletedCampaigns: reset.campaigns,
          deletedBatches: reset.mefBatches,
          deletedDispatches: reset.dispatches,
          deletedMessages: reset.outboundMessages,
          deletedAuditEvents: reset.auditEvents ?? 0,
          ...reset
        })
      }
    } catch (caught) {
      if (caught.message.includes('not found')) return error(response, 404, 'NOT_FOUND', caught.message)
      if (caught.message.includes('disabled in production')) return error(response, 403, 'FORBIDDEN', caught.message)
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
