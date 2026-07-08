const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api/nyec'

type ApiResponse<T> = { ok: boolean; data?: T; message?: string; error?: { code: string; message: string } }

function warnFallback(path: string, reason: unknown) {
  if (import.meta.env.DEV) {
    console.warn(`Using mock data for ${path}; API request failed.`, reason)
  }
}

async function get<T>(path: string, fallback: T): Promise<T> {
  try {
    const res = await fetch(`${API_BASE}${path}`)
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const json = (await res.json()) as ApiResponse<T>
    return json.data ?? fallback
  } catch (error) {
    warnFallback(path, error)
    return fallback
  }
}

async function post<T>(path: string, body: unknown, fallback: T): Promise<T> {
  try {
    const res = await fetch(`${API_BASE}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const json = (await res.json()) as ApiResponse<T>
    return json.data ?? fallback
  } catch (error) {
    warnFallback(path, error)
    return fallback
  }
}

async function postStrict<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  })
  const json = (await res.json()) as ApiResponse<T>
  if (!res.ok || !json.ok) throw new Error(json.error?.message ?? json.message ?? `HTTP ${res.status}`)
  return json.data as T
}

async function put<T>(path: string, body: unknown, fallback: T): Promise<T> {
  try {
    const res = await fetch(`${API_BASE}${path}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const json = (await res.json()) as ApiResponse<T>
    return json.data ?? fallback
  } catch (error) {
    warnFallback(path, error)
    return fallback
  }
}

export const mockDashboard = {
  activeCampaigns: 4,
  messagesSentToday: 184,
  deliveredToday: 171,
  failedToday: 7,
  retryPending: 6,
  optOutsToday: 3,
  dailyLimit: 250,
  dailyProgress: 73.6,
  estimatedCostToday: 14.72,
  twilioStatus: 'Configured for test mode',
  nextSchedulerRun: 'Tomorrow 09:00',
  campaigns: [
    { id: 101, name: 'NYC 1115 Waiver Outreach - Wave 1', status: 'RUNNING', facility: 'NYC Health Center A', sent: 840, remaining: 3160 }
  ]
}

export const mockMefBatches = [
  { id: 12, fileName: 'NYeC_MEF_2026_07_06.csv', mefVersion: '2026-W28', status: 'IMPORTED', totalRows: 48392, validRows: 45110, rejectedRows: 3282, createdAt: '2026-07-06T06:12:00' }
]

export const mockCampaigns = [
  { id: 101, name: '1115 Waiver Outreach', status: 'RUNNING', facility: 'NYC Health Center A', npiLocation: '1234567891', dailyLimit: 50, sent: 210, remaining: 1100 },
  { id: 102, name: 'HITS Registration', status: 'SCHEDULED', facility: 'NYC Health Center B', npiLocation: '1234567892', dailyLimit: 100, sent: 420, remaining: 1000 },
  { id: 103, name: 'Care Mgmt Follow-up', status: 'PAUSED', facility: 'NYC Health Center C', npiLocation: '1234567893', dailyLimit: 150, sent: 630, remaining: 900 }
]

export const mockDispatches = [
  { id: 'B-201', campaign: '1115 Waiver Outreach', date: '2026-07-02', selected: 50, sent: 48, delivered: 45, failed: 3, status: 'COMPLETE' },
  { id: 'B-202', campaign: '1115 Waiver Outreach', date: '2026-07-03', selected: 50, sent: 50, delivered: 49, failed: 1, status: 'COMPLETE' },
  { id: 'B-203', campaign: 'HITS Registration', date: '2026-07-08', selected: 100, sent: 86, delivered: 80, failed: 6, status: 'SENDING' }
]

export const api = {
  dashboard: () => get('/dashboard', mockDashboard),
  mefBatches: () => get('/mef/batches', mockMefBatches),
  campaigns: () => get('/campaigns', mockCampaigns),
  dispatches: () => get('/dispatches', mockDispatches),
  billing: () => get('/billing/summary', { period: 'July 2026', billableMessages: 4180, deliveredMessages: 3922, twilioCost: 313.6, platformFee: 2500, estimatedInvoice: 4286.3, grossMargin: 3972.7 }),
  twilioConfig: () => get('/twilio/config', { mode: 'TEST', accountSid: 'AC***************1234', messagingServiceSid: 'MG***************5678', callbackBaseUrl: 'http://localhost:3001', sendWindowStart: '09:00', sendWindowEnd: '17:00', maxRetryAttempts: 5, status: 'Configured' }),
  createCampaign: (body: unknown) => post('/campaigns', body, { id: 999, status: 'DRAFT' }),
  saveTwilioConfig: (body: unknown) => put('/twilio/config', body, { status: 'saved' }),
  sendTwilioTest: (body: unknown) => postStrict<{ status: string; sid?: string; provider: string; to: string }>('/twilio/test', body)
}
