import { Readable, Writable } from 'node:stream'

export async function request(app, path, options = {}) {
  const body =
    options.body === undefined || Buffer.isBuffer(options.body)
      ? options.body ?? Buffer.alloc(0)
      : Buffer.from(options.body)
  const requestStream = Readable.from(body.length ? [body] : [])
  requestStream.method = options.method ?? 'GET'
  requestStream.url = path
  requestStream.headers = {
    host: 'localhost',
    ...(body.length ? { 'content-length': String(body.length) } : {}),
    ...(options.headers ?? {})
  }

  let statusCode = 0
  let responseBody = ''
  const responseHeaders = {}
  const responseStream = new Writable({
    write(chunk, _encoding, callback) {
      responseBody += chunk.toString('utf8')
      callback()
    }
  })
  responseStream.writeHead = (code, headers = {}) => {
    statusCode = code
    Object.assign(responseHeaders, headers)
  }
  responseStream.end = (chunk) => {
    if (chunk) responseBody += chunk.toString('utf8')
  }

  await app(requestStream, responseStream)

  return {
    response: { status: statusCode, headers: responseHeaders },
    json: responseBody ? JSON.parse(responseBody) : null
  }
}
