import { apiRoutes } from './contracts'

export const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api/nyec'

type ApiEnvelope<T> = {
  ok?: boolean
  data?: T
  message?: string
  error?: {
    code?: string
    message?: string
  }
}

type RequestMethod = 'GET' | 'POST' | 'PUT'
type Identifier = string | number

export type DashboardCampaign = {
  id: Identifier
  name: string
  status: string
  facilityName?: string
  facility?: string
  sent: number
  remaining: number
}

export type DashboardSummary = {
  activeCampaigns: number
  messagesSentToday: number
  deliveredToday: number
  failedToday: number
  retryPending: number
  optOutsToday: number
  dailyLimit: number
  dailyProgress: number
  estimatedCostToday: number
  twilioStatus: string
  nextSchedulerRun: string
  campaigns: DashboardCampaign[]
}

export type MefBatchSummary = {
  id: Identifier
  fileName: string
  mefVersion: string
  sourceNamespace?: string
  status: string
  totalRows: number
  acceptedRows?: number
  validRows?: number
  rejectedRows: number
  createdAt: string
}

export type MefBatchDetail = MefBatchSummary & {
  notes?: string
  rejectedPreview?: string[]
}

export type CampaignSummary = {
  id: Identifier
  name: string
  status: string
  facilityName?: string
  facility?: string
  npiLocation: string
  dailyLimit: number
  sent: number
  remaining: number
  mefBatchId?: Identifier
  messageBody?: string
}

export type CampaignDetail = CampaignSummary & {
  customerName?: string
  facilityCode?: string
  externalSurveyBaseUrl?: string
  startDate?: string
  startTime?: string
  notes?: string
}

export type CampaignDispatchBatch = {
  id: Identifier
  campaignId?: Identifier
  campaignName?: string
  createdAt?: string
  dispatchDate?: string
  selected: number
  sent: number
  delivered: number
  failed: number
  status: string
}

export type DispatchSummary = {
  id: Identifier
  campaignId?: Identifier
  campaignName?: string
  campaign?: string
  createdAt?: string
  dispatchDate?: string
  date?: string
  selected: number
  sent: number
  delivered: number
  failed: number
  status: string
}

export type OutboundMessage = {
  id: Identifier
  dispatchId?: Identifier
  campaignId?: Identifier
  campaignName?: string
  to: string
  bodyPreview: string
  providerStatus: string
  callbackStatus?: string
  errorMessage?: string
  attemptedAt?: string
  updatedAt?: string
}

export type AuditEvent = {
  id: Identifier
  eventType: string
  actor?: string
  payload?: Record<string, unknown> | string
  createdAt: string
}

export type BillingSummary = {
  period: string
  billableMessages: number
  deliveredMessages: number
  twilioCost: number
  platformFee: number
  estimatedInvoice: number
  grossMargin: number
  lastUpdatedAt?: string
}

export type TwilioConfig = {
  mode: string
  accountSid: string
  messagingServiceSid: string
  fromNumber?: string
  callbackBaseUrl: string
  sendWindowStart: string
  sendWindowEnd: string
  maxRetryAttempts: number
  status: string
  authTokenSecretRef?: string
}

export type TwilioSaveResult = {
  status: string
  mode?: string
  message?: string
}

export type TwilioTestResult = {
  status: string
  sid?: string
  provider: string
  to: string
}

export type ResetLocalDataResult = {
  status: string
  message?: string
  deletedCampaigns?: number
  deletedDispatches?: number
  deletedMessages?: number
  deletedAuditEvents?: number
  deletedBatches?: number
}

export type CreateCampaignInput = {
  name: string
  customerName?: string
  facilityName?: string
  facilityCode?: string
  npiLocation: string
  mefBatchId: Identifier
  dailyLimit: number
  startDate?: string
  startTime?: string
  externalSurveyBaseUrl?: string
  smsBody: string
}

export type ImportMefBatchInput = {
  fileName: string
  mefVersion: string
  sourceNamespace?: string
  csvText: string
}

export class ApiClientError extends Error {
  status: number
  code?: string
  method: RequestMethod
  path: string

  constructor(message: string, options: { status: number; code?: string; method: RequestMethod; path: string }) {
    super(message)
    this.name = 'ApiClientError'
    this.status = options.status
    this.code = options.code
    this.method = options.method
    this.path = options.path
  }
}

function endpoint(path: string) {
  return `${API_BASE}${path}`
}

async function request<T>(method: RequestMethod, path: string, body?: unknown): Promise<T> {
  const response = await fetch(endpoint(path), {
    method,
    headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body)
  })

  const text = await response.text()
  let envelope: ApiEnvelope<T> | null = null

  if (text) {
    try {
      envelope = JSON.parse(text) as ApiEnvelope<T>
    } catch {
      envelope = null
    }
  }

  if (!response.ok || envelope?.ok === false) {
    const message =
      envelope?.error?.message ??
      envelope?.message ??
      (text || `${method} ${path} failed with HTTP ${response.status}`)

    throw new ApiClientError(message, {
      status: response.status,
      code: envelope?.error?.code,
      method,
      path
    })
  }

  if (envelope && 'data' in envelope) {
    return envelope.data as T
  }

  return (envelope as T | null) ?? (undefined as T)
}

export const demoDashboard: DashboardSummary = {
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
    {
      id: 101,
      name: 'NYC 1115 Waiver Outreach - Wave 1',
      status: 'RUNNING',
      facility: 'NYC Health Center A',
      sent: 840,
      remaining: 3160
    }
  ]
}

export const demoMefBatches: MefBatchSummary[] = [
  {
    id: 12,
    fileName: 'NYeC_MEF_2026_07_06.csv',
    mefVersion: '2026-W28',
    sourceNamespace: 'hxcommon',
    status: 'IMPORTED',
    totalRows: 48392,
    acceptedRows: 45110,
    validRows: 45110,
    rejectedRows: 3282,
    createdAt: '2026-07-06T06:12:00'
  }
]

export const demoMefBatchDetail: MefBatchDetail = {
  ...demoMefBatches[0],
  notes: 'Seeded local demo snapshot.',
  rejectedPreview: ['missing mobile phone', 'duplicate member id', 'invalid phone format']
}

export const demoCampaigns: CampaignSummary[] = [
  {
    id: 101,
    name: '1115 Waiver Outreach',
    status: 'RUNNING',
    facility: 'NYC Health Center A',
    npiLocation: '1234567891',
    dailyLimit: 50,
    sent: 210,
    remaining: 1100,
    mefBatchId: 12,
    messageBody:
      'Hello {{FirstName}}, your healthcare provider has requested that you complete a secure questionnaire. Please visit {{SurveyLink}}.'
  },
  {
    id: 102,
    name: 'HITS Registration',
    status: 'SCHEDULED',
    facility: 'NYC Health Center B',
    npiLocation: '1234567892',
    dailyLimit: 100,
    sent: 420,
    remaining: 1000,
    mefBatchId: 12
  },
  {
    id: 103,
    name: 'Care Mgmt Follow-up',
    status: 'PAUSED',
    facility: 'NYC Health Center C',
    npiLocation: '1234567893',
    dailyLimit: 150,
    sent: 630,
    remaining: 900,
    mefBatchId: 12
  }
]

export const demoCampaignDetail: CampaignDetail = {
  ...demoCampaigns[0],
  customerName: 'NYC Health Partner',
  facilityName: 'NYC Health Center A',
  facilityCode: 'NYC-A',
  externalSurveyBaseUrl: 'https://survey.customer.org/register',
  startDate: '2026-07-13',
  startTime: '09:00',
  notes: 'Seeded local demo snapshot.'
}

export const demoCampaignDispatchBatches: CampaignDispatchBatch[] = [
  {
    id: 'B-203',
    campaignId: 101,
    campaignName: '1115 Waiver Outreach',
    dispatchDate: '2026-07-08',
    createdAt: '2026-07-08T09:00:00',
    selected: 100,
    sent: 86,
    delivered: 80,
    failed: 6,
    status: 'SENDING'
  }
]

export const demoDispatches: DispatchSummary[] = [
  {
    id: 'B-201',
    campaignId: 101,
    campaign: '1115 Waiver Outreach',
    date: '2026-07-02',
    selected: 50,
    sent: 48,
    delivered: 45,
    failed: 3,
    status: 'COMPLETE'
  },
  {
    id: 'B-202',
    campaignId: 101,
    campaign: '1115 Waiver Outreach',
    date: '2026-07-03',
    selected: 50,
    sent: 50,
    delivered: 49,
    failed: 1,
    status: 'COMPLETE'
  },
  {
    id: 'B-203',
    campaignId: 102,
    campaign: 'HITS Registration',
    date: '2026-07-08',
    selected: 100,
    sent: 86,
    delivered: 80,
    failed: 6,
    status: 'SENDING'
  }
]

export const demoOutboundMessages: OutboundMessage[] = [
  {
    id: 'SM-001',
    dispatchId: 'B-203',
    campaignId: 102,
    campaignName: 'HITS Registration',
    to: '+15555550123',
    bodyPreview: 'Hello Maria, please complete your NYeC registration survey.',
    providerStatus: 'queued',
    callbackStatus: 'accepted',
    attemptedAt: '2026-07-08T09:02:00',
    updatedAt: '2026-07-08T09:02:15'
  },
  {
    id: 'SM-002',
    dispatchId: 'B-203',
    campaignId: 102,
    campaignName: 'HITS Registration',
    to: '+15555550124',
    bodyPreview: 'Hello Denise, please complete your NYeC registration survey.',
    providerStatus: 'failed',
    callbackStatus: 'undelivered',
    errorMessage: 'Carrier rejected destination number.',
    attemptedAt: '2026-07-08T09:03:00',
    updatedAt: '2026-07-08T09:03:20'
  }
]

export const demoBillingSummary: BillingSummary = {
  period: 'July 2026',
  billableMessages: 4180,
  deliveredMessages: 3922,
  twilioCost: 313.6,
  platformFee: 2500,
  estimatedInvoice: 4286.3,
  grossMargin: 3972.7,
  lastUpdatedAt: '2026-07-08T11:30:00'
}

export const demoAuditEvents: AuditEvent[] = [
  {
    id: 1,
    eventType: 'TWILIO_TEST_SMS_SENT',
    actor: 'local-demo',
    payload: { to: '+15555550123', status: 'queued', sid: 'SM789' },
    createdAt: '2026-07-08T10:14:00'
  },
  {
    id: 2,
    eventType: 'CAMPAIGN_LAUNCHED',
    actor: 'local-demo',
    payload: { campaignId: 101, status: 'RUNNING' },
    createdAt: '2026-07-08T09:00:00'
  }
]

export const demoTwilioConfig: TwilioConfig = {
  mode: 'TEST',
  accountSid: 'AC***************1234',
  messagingServiceSid: 'MG***************5678',
  callbackBaseUrl: 'http://localhost:3001',
  sendWindowStart: '09:00',
  sendWindowEnd: '17:00',
  maxRetryAttempts: 5,
  status: 'Configured',
  authTokenSecretRef: 'vault://twilio/default/auth-token'
}

export function acceptedRows(batch: Pick<MefBatchSummary, 'acceptedRows' | 'validRows'>) {
  return batch.acceptedRows ?? batch.validRows ?? 0
}

export function facilityName(value: Pick<CampaignSummary, 'facilityName' | 'facility'> | Pick<DashboardCampaign, 'facilityName' | 'facility'>) {
  return value.facilityName ?? value.facility ?? 'Unassigned'
}

export function dispatchCampaignName(value: Pick<DispatchSummary, 'campaignName' | 'campaign'> | Pick<CampaignDispatchBatch, 'campaignName'>) {
  return value.campaignName ?? ('campaign' in value ? value.campaign : undefined) ?? 'Unknown campaign'
}

export const api = {
  getDashboard() {
    return request<DashboardSummary>('GET', apiRoutes.dashboard)
  },
  listMefBatches() {
    return request<MefBatchSummary[]>('GET', apiRoutes.mefBatches)
  },
  importMefBatch(payload: ImportMefBatchInput) {
    return request<MefBatchDetail>('POST', apiRoutes.mefBatches, payload)
  },
  getMefBatch(id: Identifier) {
    return request<MefBatchDetail>('GET', apiRoutes.mefBatch(id))
  },
  listCampaigns() {
    return request<CampaignSummary[]>('GET', apiRoutes.campaigns)
  },
  createCampaign(payload: CreateCampaignInput) {
    return request<CampaignDetail>('POST', apiRoutes.campaigns, payload)
  },
  getCampaign(id: Identifier) {
    return request<CampaignDetail>('GET', apiRoutes.campaign(id))
  },
  launchCampaign(id: Identifier) {
    return request<CampaignDetail>('POST', apiRoutes.campaignLaunch(id), {})
  },
  pauseCampaign(id: Identifier) {
    return request<CampaignDetail>('POST', apiRoutes.campaignPause(id), {})
  },
  listCampaignDispatchBatches(id: Identifier) {
    return request<CampaignDispatchBatch[]>('GET', apiRoutes.campaignDispatchBatches(id))
  },
  runCampaignDispatch(id: Identifier) {
    return request<CampaignDispatchBatch>('POST', apiRoutes.campaignRunDispatch(id), {})
  },
  listDispatches() {
    return request<DispatchSummary[]>('GET', apiRoutes.dispatches)
  },
  listOutboundMessages() {
    return request<OutboundMessage[]>('GET', apiRoutes.outboundMessages)
  },
  getBillingSummary() {
    return request<BillingSummary>('GET', apiRoutes.billingSummary)
  },
  listAuditEvents() {
    return request<AuditEvent[]>('GET', apiRoutes.auditEvents)
  },
  getTwilioConfig() {
    return request<TwilioConfig>('GET', apiRoutes.twilioConfig)
  },
  saveTwilioConfig(payload: TwilioConfig) {
    return request<TwilioSaveResult>('PUT', apiRoutes.twilioConfig, payload)
  },
  sendTwilioTest(payload: { to: string; body: string }) {
    return request<TwilioTestResult>('POST', apiRoutes.twilioTest, payload)
  },
  resetLocalData() {
    return request<ResetLocalDataResult>('POST', apiRoutes.resetLocalData, {})
  }
}
