export function loadConfig(env = process.env) {
  return {
    port: Number(env.PORT ?? 3001),
    host: env.HOST ?? '127.0.0.1',
    nodeEnv: env.NODE_ENV ?? 'development',
    dataFile: env.DATA_FILE ?? (env.NODE_ENV === 'test' ? '' : './data/state.json'),
    twilio: {
      mode: env.TWILIO_MODE ?? 'TEST',
      accountSid: env.TWILIO_ACCOUNT_SID ?? '',
      authToken: env.TWILIO_AUTH_TOKEN ?? '',
      messagingServiceSid: env.TWILIO_MESSAGING_SERVICE_SID ?? '',
      fromNumber: env.TWILIO_FROM_NUMBER ?? '',
      callbackBaseUrl: env.TWILIO_CALLBACK_BASE_URL ?? 'http://localhost:3001'
    }
  }
}
