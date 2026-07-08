import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname } from 'node:path'

const defaultState = {
  dashboard: {
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
  },
  mefBatches: [
    {
      id: 12,
      fileName: 'NYeC_MEF_2026_07_06.csv',
      mefVersion: '2026-W28',
      status: 'IMPORTED',
      totalRows: 48392,
      validRows: 45110,
      rejectedRows: 3282,
      createdAt: '2026-07-06T06:12:00'
    }
  ],
  campaigns: [
    {
      id: 101,
      name: '1115 Waiver Outreach',
      status: 'RUNNING',
      facility: 'NYC Health Center A',
      npiLocation: '1234567891',
      dailyLimit: 50,
      sent: 210,
      remaining: 1100
    },
    {
      id: 102,
      name: 'HITS Registration',
      status: 'SCHEDULED',
      facility: 'NYC Health Center B',
      npiLocation: '1234567892',
      dailyLimit: 100,
      sent: 420,
      remaining: 1000
    }
  ],
  dispatches: [
    {
      id: 'B-201',
      campaign: '1115 Waiver Outreach',
      date: '2026-07-02',
      selected: 50,
      sent: 48,
      delivered: 45,
      failed: 3,
      status: 'COMPLETE'
    }
  ],
  billing: {
    period: 'July 2026',
    billableMessages: 4180,
    deliveredMessages: 3922,
    twilioCost: 313.6,
    platformFee: 2500,
    estimatedInvoice: 4286.3,
    grossMargin: 3972.7
  },
  auditEvents: []
}

function loadState(options) {
  if (options.dataFile && existsSync(options.dataFile)) {
    return JSON.parse(readFileSync(options.dataFile, 'utf8'))
  }
  return structuredClone({ ...defaultState, ...(options.initialState ?? {}) })
}

function persistState(dataFile, state) {
  if (!dataFile) return
  mkdirSync(dirname(dataFile), { recursive: true })
  writeFileSync(dataFile, `${JSON.stringify(state, null, 2)}\n`)
}

export function createStore(options = {}) {
  const normalizedOptions = options.dataFile || options.initialState ? options : { initialState: options }
  const state = loadState(normalizedOptions)

  function persist() {
    persistState(normalizedOptions.dataFile, state)
  }

  return {
    dashboard() {
      return structuredClone(state.dashboard)
    },
    mefBatches() {
      return structuredClone(state.mefBatches)
    },
    campaigns() {
      return structuredClone(state.campaigns)
    },
    dispatches() {
      return structuredClone(state.dispatches)
    },
    billing() {
      return structuredClone(state.billing)
    },
    auditEvents() {
      return structuredClone(state.auditEvents)
    },
    createCampaign(payload) {
      const campaign = {
        id: Date.now(),
        name: payload.name ?? 'Untitled Campaign',
        status: 'DRAFT',
        facility: payload.facility ?? '',
        npiLocation: payload.npiLocation ?? '',
        dailyLimit: Number(payload.dailyLimit ?? 50),
        sent: 0,
        remaining: Number(payload.estimatedRecipients ?? 0)
      }
      state.campaigns.push(campaign)
      persist()
      return structuredClone(campaign)
    },
    recordAudit(eventType, payload) {
      const event = {
        id: state.auditEvents.length + 1,
        eventType,
        payload,
        createdAt: new Date().toISOString()
      }
      state.auditEvents.unshift(event)
      persist()
      return structuredClone(event)
    }
  }
}
