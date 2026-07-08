import https from 'node:https'

function buildStatusCallback(callbackBaseUrl) {
  const base = callbackBaseUrl.replace(/\/$/, '')
  return `${base}/api/nyec/sms/status`
}

function encodeForm(form) {
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(form)) {
    if (value !== undefined && value !== '') params.set(key, value)
  }
  return params.toString()
}

async function defaultTransport(request) {
  const body = encodeForm(request.form)
  const url = new URL(request.url)

  return new Promise((resolve, reject) => {
    const clientRequest = https.request(
      {
        method: request.method,
        hostname: url.hostname,
        path: `${url.pathname}${url.search}`,
        headers: {
          ...request.headers,
          'content-type': 'application/x-www-form-urlencoded',
          'content-length': Buffer.byteLength(body)
        }
      },
      (response) => {
        const chunks = []
        response.on('data', (chunk) => chunks.push(chunk))
        response.on('end', () => {
          const rawBody = Buffer.concat(chunks).toString('utf8')
          let parsedBody
          try {
            parsedBody = rawBody ? JSON.parse(rawBody) : {}
          } catch {
            parsedBody = { rawBody }
          }
          resolve({ statusCode: response.statusCode ?? 0, body: parsedBody })
        })
      }
    )

    clientRequest.on('error', reject)
    clientRequest.write(body)
    clientRequest.end()
  })
}

export function createTwilioClient(config, transport = defaultTransport) {
  return {
    async sendTestSms(payload) {
      const form = {
        To: payload.to,
        Body: payload.body ?? 'NYeC outreach test message',
        StatusCallback: buildStatusCallback(config.callbackBaseUrl)
      }

      if (config.messagingServiceSid) form.MessagingServiceSid = config.messagingServiceSid
      else form.From = config.fromNumber

      const request = {
        method: 'POST',
        url: `https://api.twilio.com/2010-04-01/Accounts/${config.accountSid}/Messages.json`,
        headers: {
          authorization: `Basic ${Buffer.from(`${config.accountSid}:${config.authToken}`).toString('base64')}`
        },
        form
      }

      const response = await transport(request)
      if (response.statusCode < 200 || response.statusCode >= 300) {
        const message = response.body?.message ?? `Twilio returned HTTP ${response.statusCode}`
        const error = new Error(message)
        error.code = 'TWILIO_REQUEST_FAILED'
        error.statusCode = response.statusCode
        throw error
      }

      return {
        sid: response.body.sid,
        status: response.body.status ?? 'queued'
      }
    }
  }
}
