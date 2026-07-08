import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname } from 'node:path'

const SCHEMA_VERSION = 2
const TWILIO_MESSAGE_COST = 0.0075

function clone(value) {
  return structuredClone(value)
}

function isoNow(now = new Date()) {
  return now.toISOString()
}

function dateKeyFromIso(value) {
  return value.slice(0, 10)
}

function normalizePhone(value) {
  const digits = String(value ?? '').replace(/\D/g, '')
  if (!digits) return ''
  if (digits.length === 10) return `+1${digits}`
  return `+${digits}`
}

function normalizeHeader(value) {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
}

function parseCsvLine(line) {
  const values = []
  let current = ''
  let inQuotes = false

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index]
    if (char === '"') {
      if (inQuotes && line[index + 1] === '"') {
        current += '"'
        index += 1
      } else {
        inQuotes = !inQuotes
      }
      continue
    }
    if (char === ',' && !inQuotes) {
      values.push(current)
      current = ''
      continue
    }
    current += char
  }

  values.push(current)
  return values.map((value) => value.trim())
}

function parseCsv(text) {
  const lines = String(text ?? '')
    .replace(/\r\n/g, '\n')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)

  if (lines.length < 2) {
    throw new Error('MEF CSV import requires a header row and at least one data row')
  }

  const header = parseCsvLine(lines[0]).map(normalizeHeader)
  return lines.slice(1).map((line, rowIndex) => {
    const values = parseCsvLine(line)
    const row = {}
    for (let columnIndex = 0; columnIndex < header.length; columnIndex += 1) {
      row[header[columnIndex]] = values[columnIndex] ?? ''
    }
    return { lineNumber: rowIndex + 2, row }
  })
}

function rowField(row, names) {
  for (const name of names) {
    if (row[name]) return row[name]
  }
  return ''
}

function normalizeImportRecord(entry, batchId) {
  const row = entry.row
  const phone = normalizePhone(
    rowField(row, ['phone', 'phonenumber', 'mobile', 'mobilenumber', 'cellphone', 'memberphone'])
  )

  if (!phone) {
    return {
      rejected: true,
      rejection: {
        lineNumber: entry.lineNumber,
        reason: 'Missing phone number',
        row: clone(row)
      }
    }
  }

  const memberId =
    rowField(row, ['memberid', 'medicaidid', 'recipientid', 'id']) ||
    `row-${batchId}-${entry.lineNumber}`
  const firstName = rowField(row, ['firstname', 'first', 'givenname'])
  const lastName = rowField(row, ['lastname', 'last', 'surname'])
  const fullName = [firstName, lastName].filter(Boolean).join(' ').trim()

  return {
    rejected: false,
    record: {
      id: `${batchId}:${memberId}:${entry.lineNumber}`,
      batchId,
      lineNumber: entry.lineNumber,
      memberId,
      firstName,
      lastName,
      fullName,
      phone,
      npiLocation: rowField(row, ['npilocation', 'npi', 'locationnpi']),
      facility: rowField(row, ['facility', 'facilityname', 'site']),
      language: rowField(row, ['language', 'preferredlanguage']),
      raw: clone(row)
    }
  }
}

function renderTemplate(template, recipient) {
  const source = String(template ?? '').trim() || 'NYeC outreach update'
  return source.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_match, key) => {
    const normalizedKey = String(key)
    if (normalizedKey === 'firstName') return recipient.firstName || recipient.fullName || 'Member'
    if (normalizedKey === 'lastName') return recipient.lastName || ''
    if (normalizedKey === 'fullName') return recipient.fullName || recipient.firstName || 'Member'
    if (normalizedKey === 'memberId') return recipient.memberId || ''
    if (normalizedKey === 'facility') return recipient.facility || ''
    if (normalizedKey === 'npiLocation') return recipient.npiLocation || ''
    return ''
  })
}

function summarizeTwilioStatus(twilioConfig) {
  if (twilioConfig.mode === 'TEST') return 'Configured for test mode'
  if (twilioConfig.accountSid && twilioConfig.authToken && (twilioConfig.messagingServiceSid || twilioConfig.fromNumber)) {
    return 'Configured for live sends'
  }
  return 'Missing credentials'
}

function createBaseState(seedTwilioConfig = {}) {
  return {
    schemaVersion: SCHEMA_VERSION,
    sequences: {
      batch: 0,
      campaign: 100,
      dispatch: 0,
      message: 0,
      audit: 0,
      billing: 0
    },
    twilioConfig: {
      mode: seedTwilioConfig.mode ?? 'TEST',
      accountSid: seedTwilioConfig.accountSid ?? '',
      authToken: seedTwilioConfig.authToken ?? '',
      messagingServiceSid: seedTwilioConfig.messagingServiceSid ?? '',
      fromNumber: seedTwilioConfig.fromNumber ?? '',
      callbackBaseUrl: seedTwilioConfig.callbackBaseUrl ?? 'http://localhost:3001',
      updatedAt: null
    },
    mefBatches: [],
    campaigns: [],
    dispatches: [],
    outboundMessages: [],
    optOuts: [],
    billingUsage: [],
    auditEvents: []
  }
}

function normalizeState(rawState, seedTwilioConfig) {
  if (!rawState || rawState.schemaVersion !== SCHEMA_VERSION) {
    return createBaseState(seedTwilioConfig)
  }

  const baseState = createBaseState(seedTwilioConfig)
  return {
    ...baseState,
    ...rawState,
    sequences: { ...baseState.sequences, ...(rawState.sequences ?? {}) },
    twilioConfig: { ...baseState.twilioConfig, ...(rawState.twilioConfig ?? {}) },
    mefBatches: Array.isArray(rawState.mefBatches) ? rawState.mefBatches : [],
    campaigns: Array.isArray(rawState.campaigns) ? rawState.campaigns : [],
    dispatches: Array.isArray(rawState.dispatches) ? rawState.dispatches : [],
    outboundMessages: Array.isArray(rawState.outboundMessages) ? rawState.outboundMessages : [],
    optOuts: Array.isArray(rawState.optOuts) ? rawState.optOuts : [],
    billingUsage: Array.isArray(rawState.billingUsage) ? rawState.billingUsage : [],
    auditEvents: Array.isArray(rawState.auditEvents) ? rawState.auditEvents : []
  }
}

function loadState(options) {
  if (options.dataFile && existsSync(options.dataFile)) {
    return normalizeState(JSON.parse(readFileSync(options.dataFile, 'utf8')), options.seedTwilioConfig)
  }

  if (options.initialState) {
    return normalizeState(options.initialState, options.seedTwilioConfig)
  }

  return createBaseState(options.seedTwilioConfig)
}

function persistState(dataFile, state) {
  if (!dataFile) return
  mkdirSync(dirname(dataFile), { recursive: true })
  writeFileSync(dataFile, `${JSON.stringify(state, null, 2)}\n`)
}

export function createStore(options = {}) {
  const normalizedOptions = options.dataFile || options.initialState || options.seedTwilioConfig ? options : { initialState: options }
  let state = loadState(normalizedOptions)

  function persist() {
    persistState(normalizedOptions.dataFile, state)
  }

  function nextSequence(name, prefix = '') {
    state.sequences[name] += 1
    return prefix ? `${prefix}${state.sequences[name]}` : state.sequences[name]
  }

  function recordAudit(eventType, payload, now = new Date()) {
    const event = {
      id: nextSequence('audit'),
      eventType,
      payload: clone(payload),
      createdAt: isoNow(now)
    }
    state.auditEvents.unshift(event)
    persist()
    return clone(event)
  }

  function recordBilling(entry, now = new Date()) {
    const billingEntry = {
      id: nextSequence('billing'),
      category: entry.category,
      units: Number(entry.units ?? 0),
      cost: Number(entry.cost ?? 0),
      metadata: clone(entry.metadata ?? {}),
      createdAt: isoNow(now)
    }
    state.billingUsage.unshift(billingEntry)
    persist()
    return clone(billingEntry)
  }

  function campaignRecipients(campaign) {
    if (!campaign.batchId) return []
    const batch = state.mefBatches.find((entry) => entry.id === campaign.batchId)
    return batch?.records ?? []
  }

  function isOptedOut(phone) {
    return state.optOuts.some((entry) => entry.phone === phone && !entry.removedAt)
  }

  function existingCampaignPhones(campaignId) {
    return new Set(
      state.outboundMessages
        .filter((message) => message.campaignId === campaignId)
        .map((message) => message.to)
    )
  }

  function localDayKey(now = new Date()) {
    return dateKeyFromIso(isoNow(now))
  }

function campaignDetail(campaign) {
    const recipients = campaignRecipients(campaign)
    const messages = state.outboundMessages.filter((message) => message.campaignId === campaign.id)
    const sentPhones = new Set(messages.map((message) => message.to))
    const sentCount = sentPhones.size
    const optOutCount = recipients.filter((recipient) => isOptedOut(recipient.phone)).length
    return {
      ...clone(campaign),
      mefBatchId: campaign.batchId,
      facilityName: campaign.facility,
      messageBody: campaign.messageTemplate,
      smsBody: campaign.messageTemplate,
      sent: sentCount,
      remaining: Math.max((recipients.length || Number(campaign.estimatedRecipients ?? 0)) - sentCount, 0),
      recipientCount: recipients.length || Number(campaign.estimatedRecipients ?? 0),
      sentCount,
      remainingCount: Math.max((recipients.length || Number(campaign.estimatedRecipients ?? 0)) - sentCount, 0),
      optOutCount,
      messages: clone(messages)
    }
  }

  return {
    dashboard() {
      const today = localDayKey()
      const messagesToday = state.outboundMessages.filter((message) => dateKeyFromIso(message.createdAt) === today)
      const runningCampaigns = state.campaigns.filter((campaign) => campaign.status === 'RUNNING')
      const dailyLimit = runningCampaigns.reduce((sum, campaign) => sum + Number(campaign.dailyLimit ?? 0), 0)
      const progress = dailyLimit > 0 ? Number(((messagesToday.length / dailyLimit) * 100).toFixed(1)) : 0

      return {
        activeCampaigns: runningCampaigns.length,
        messagesSentToday: messagesToday.length,
        deliveredToday: messagesToday.filter((message) => message.status === 'delivered').length,
        failedToday: messagesToday.filter((message) => ['failed', 'undelivered'].includes(message.status)).length,
        retryPending: messagesToday.filter((message) => ['queued', 'accepted', 'sending'].includes(message.status)).length,
        optOutsToday: state.optOuts.filter((entry) => entry.createdAt && dateKeyFromIso(entry.createdAt) === today && !entry.removedAt).length,
        dailyLimit,
        dailyProgress: progress,
        estimatedCostToday: Number(
          messagesToday.reduce((sum, message) => sum + Number(message.cost ?? 0), 0).toFixed(2)
        ),
        twilioStatus: summarizeTwilioStatus(state.twilioConfig),
        nextSchedulerRun: runningCampaigns.length ? 'Manual dispatch available' : 'No active campaigns',
        campaigns: runningCampaigns.map((campaign) => {
          const detail = campaignDetail(campaign)
          return {
            id: detail.id,
            name: detail.name,
            status: detail.status,
            facility: detail.facility,
            sent: detail.sentCount,
            remaining: detail.remainingCount
          }
        })
      }
    },
    mefBatches() {
      return clone(state.mefBatches)
    },
    campaigns() {
      return state.campaigns.map((campaign) => campaignDetail(campaign))
    },
    campaign(id) {
      const campaign = state.campaigns.find((entry) => String(entry.id) === String(id))
      if (!campaign) throw new Error(`Campaign ${id} not found`)
      return campaignDetail(campaign)
    },
    dispatches() {
      return clone(state.dispatches)
    },
    dispatchesForCampaign(campaignId) {
      return clone(state.dispatches.filter((dispatch) => String(dispatch.campaignId) === String(campaignId)))
    },
    outboundMessages(filters = {}) {
      let messages = state.outboundMessages
      if (filters.campaignId) {
        messages = messages.filter((message) => String(message.campaignId) === String(filters.campaignId))
      }
      if (filters.dispatchId) {
        messages = messages.filter((message) => String(message.dispatchId) === String(filters.dispatchId))
      }
      return clone(messages.map((message) => ({
        ...message,
        bodyPreview: message.body,
        providerStatus: message.status,
        callbackStatus: message.status,
        attemptedAt: message.createdAt,
        errorMessage: message.error
      })))
    },
    optOuts() {
      return clone(state.optOuts.filter((entry) => !entry.removedAt))
    },
    billing() {
      const billableMessages = state.billingUsage
        .filter((entry) => entry.category === 'dispatch_message')
        .reduce((sum, entry) => sum + entry.units, 0)
      const twilioCost = state.billingUsage.reduce((sum, entry) => sum + Number(entry.cost ?? 0), 0)
      return {
        period: new Date().toLocaleString('en-US', { month: 'long', year: 'numeric', timeZone: 'America/New_York' }),
        billableMessages,
        deliveredMessages: state.outboundMessages.filter((message) => message.status === 'delivered').length,
        queuedMessages: state.outboundMessages.filter((message) => message.status === 'queued').length,
        twilioCost: Number(twilioCost.toFixed(2)),
        estimatedInvoice: Number(twilioCost.toFixed(2)),
        entries: clone(state.billingUsage)
      }
    },
    auditEvents() {
      return clone(state.auditEvents)
    },
    getTwilioConfig() {
      return clone(state.twilioConfig)
    },
    updateTwilioConfig(payload, now = new Date()) {
      state.twilioConfig = {
        ...state.twilioConfig,
        mode: payload.mode ?? state.twilioConfig.mode,
        accountSid: payload.accountSid ?? state.twilioConfig.accountSid,
        authToken: payload.authToken ?? state.twilioConfig.authToken,
        messagingServiceSid: payload.messagingServiceSid ?? state.twilioConfig.messagingServiceSid,
        fromNumber: payload.fromNumber ?? state.twilioConfig.fromNumber,
        callbackBaseUrl: payload.callbackBaseUrl ?? state.twilioConfig.callbackBaseUrl,
        updatedAt: isoNow(now)
      }
      persist()
      recordAudit(
        'TWILIO_CONFIG_CHANGED',
        {
          mode: state.twilioConfig.mode,
          accountSidUpdated: Boolean(payload.accountSid),
          authTokenUpdated: Boolean(payload.authToken),
          messagingServiceSidUpdated: Boolean(payload.messagingServiceSid),
          fromNumberUpdated: Boolean(payload.fromNumber),
          callbackBaseUrl: state.twilioConfig.callbackBaseUrl
        },
        now
      )
      recordBilling(
        {
          category: 'config_change',
          units: 1,
          cost: 0,
          metadata: { scope: 'twilio' }
        },
        now
      )
      return clone(state.twilioConfig)
    },
    createCampaign(payload, now = new Date()) {
      const campaign = {
        id: nextSequence('campaign'),
        name: String(payload.name ?? 'Untitled Campaign'),
        status: 'DRAFT',
        facility: payload.facility ?? '',
        npiLocation: payload.npiLocation ?? '',
        batchId: (payload.batchId ?? payload.mefBatchId) ? Number(payload.batchId ?? payload.mefBatchId) : null,
        dailyLimit: Number(payload.dailyLimit ?? 50),
        estimatedRecipients: Number(payload.estimatedRecipients ?? 0),
        messageTemplate: String(payload.messageTemplate ?? payload.smsBody ?? payload.messageBody ?? 'NYeC outreach update'),
        createdAt: isoNow(now),
        launchedAt: null,
        pausedAt: null
      }
      state.campaigns.push(campaign)
      persist()
      recordAudit(
        'CAMPAIGN_CREATED',
        {
          campaignId: campaign.id,
          batchId: campaign.batchId,
          dailyLimit: campaign.dailyLimit
        },
        now
      )
      recordBilling(
        {
          category: 'campaign_change',
          units: 1,
          cost: 0,
          metadata: { campaignId: campaign.id, action: 'create' }
        },
        now
      )
      return campaignDetail(campaign)
    },
    launchCampaign(id, now = new Date()) {
      const campaign = state.campaigns.find((entry) => String(entry.id) === String(id))
      if (!campaign) throw new Error(`Campaign ${id} not found`)
      campaign.status = 'RUNNING'
      campaign.launchedAt = isoNow(now)
      persist()
      recordAudit('CAMPAIGN_LAUNCHED', { campaignId: campaign.id }, now)
      recordBilling(
        {
          category: 'campaign_change',
          units: 1,
          cost: 0,
          metadata: { campaignId: campaign.id, action: 'launch' }
        },
        now
      )
      return campaignDetail(campaign)
    },
    pauseCampaign(id, now = new Date()) {
      const campaign = state.campaigns.find((entry) => String(entry.id) === String(id))
      if (!campaign) throw new Error(`Campaign ${id} not found`)
      campaign.status = 'PAUSED'
      campaign.pausedAt = isoNow(now)
      persist()
      recordAudit('CAMPAIGN_PAUSED', { campaignId: campaign.id }, now)
      recordBilling(
        {
          category: 'campaign_change',
          units: 1,
          cost: 0,
          metadata: { campaignId: campaign.id, action: 'pause' }
        },
        now
      )
      return campaignDetail(campaign)
    },
    importMefBatch(payload, now = new Date()) {
      const csvText = String(payload.csvText ?? '')
      const fileName = String(payload.fileName ?? 'uploaded.csv')
      const id = nextSequence('batch')
      const parsedRows = parseCsv(csvText)
      const records = []
      const rejections = []

      for (const entry of parsedRows) {
        const normalized = normalizeImportRecord(entry, id)
        if (normalized.rejected) rejections.push(normalized.rejection)
        else records.push(normalized.record)
      }

      const batch = {
        id,
        fileName,
        status: 'IMPORTED',
        totalRows: parsedRows.length,
        validRows: records.length,
        rejectedRows: rejections.length,
        createdAt: isoNow(now),
        records,
        rejections
      }

      state.mefBatches.unshift(batch)
      persist()
      recordAudit(
        'MEF_IMPORT_COMPLETED',
        {
          batchId: batch.id,
          fileName: batch.fileName,
          validRows: batch.validRows,
          rejectedRows: batch.rejectedRows
        },
        now
      )
      recordBilling(
        {
          category: 'mef_import',
          units: batch.validRows,
          cost: 0,
          metadata: { batchId: batch.id }
        },
        now
      )
      return clone(batch)
    },
    async dispatchCampaign(id, options = {}) {
      const now = options.now ?? new Date()
      const campaign = state.campaigns.find((entry) => String(entry.id) === String(id))
      if (!campaign) throw new Error(`Campaign ${id} not found`)
      if (campaign.status !== 'RUNNING') throw new Error(`Campaign ${id} must be running before dispatch`)

      const recipients = campaignRecipients(campaign)
      const previouslySentPhones = existingCampaignPhones(campaign.id)
      const today = localDayKey(now)
      const messagesToday = state.outboundMessages.filter(
        (message) => message.campaignId === campaign.id && dateKeyFromIso(message.createdAt) === today
      ).length
      const remainingQuota = Math.max(Number(campaign.dailyLimit ?? 0) - messagesToday, 0)
      const unsentRecipients = recipients.filter((recipient) => !previouslySentPhones.has(recipient.phone))
      const optedOutRecipients = unsentRecipients.filter((recipient) => isOptedOut(recipient.phone))
      const eligibleRecipients = unsentRecipients.filter((recipient) => !isOptedOut(recipient.phone)).slice(0, remainingQuota)

      const provider = options.provider ?? 'SIMULATED'
      const messages = []
      let queued = 0
      let simulated = 0
      let sent = 0
      let failed = 0

      for (const recipient of eligibleRecipients) {
        const body = renderTemplate(campaign.messageTemplate, recipient)
        try {
          const result = await options.sender({
            campaign: clone(campaign),
            recipient: clone(recipient),
            body
          })

          const message = {
            id: nextSequence('message', 'msg_'),
            sid: result.sid,
            messageSid: result.sid,
            dispatchId: null,
            campaignId: campaign.id,
            campaignName: campaign.name,
            batchId: campaign.batchId,
            recipientId: recipient.id,
            to: recipient.phone,
            body,
            bodyPreview: body,
            provider: result.provider ?? provider,
            simulated: Boolean(result.simulated),
            status: result.status ?? 'queued',
            providerStatus: result.status ?? 'queued',
            callbackStatus: result.status ?? 'queued',
            cost: Number(result.cost ?? 0),
            createdAt: isoNow(now),
            attemptedAt: isoNow(now),
            updatedAt: isoNow(now)
          }
          state.outboundMessages.push(message)
          messages.push(clone(message))

          queued += message.status === 'queued' ? 1 : 0
          simulated += message.simulated ? 1 : 0
          sent += message.status !== 'failed' ? 1 : 0

          recordBilling(
            {
              category: 'dispatch_message',
              units: 1,
              cost: message.cost,
              metadata: { campaignId: campaign.id, simulated: message.simulated, status: message.status }
            },
            now
          )
        } catch (error) {
          const failedMessage = {
            id: nextSequence('message', 'msg_'),
            sid: `FAIL${state.sequences.message}`,
            messageSid: `FAIL${state.sequences.message}`,
            dispatchId: null,
            campaignId: campaign.id,
            campaignName: campaign.name,
            batchId: campaign.batchId,
            recipientId: recipient.id,
            to: recipient.phone,
            body,
            bodyPreview: body,
            provider,
            simulated: false,
            status: 'failed',
            providerStatus: 'failed',
            callbackStatus: 'failed',
            error: error.message,
            errorMessage: error.message,
            cost: 0,
            createdAt: isoNow(now),
            attemptedAt: isoNow(now),
            updatedAt: isoNow(now)
          }
          state.outboundMessages.push(failedMessage)
          messages.push(clone(failedMessage))
          failed += 1
          recordBilling(
            {
              category: 'dispatch_message',
              units: 1,
              cost: 0,
              metadata: { campaignId: campaign.id, simulated: false, status: 'failed' }
            },
            now
          )
        }
      }

      const run = {
        id: nextSequence('dispatch', 'D-'),
        campaignId: campaign.id,
        campaignName: campaign.name,
        campaign: campaign.name,
        date: today,
        dispatchDate: today,
        createdAt: isoNow(now),
        selected: eligibleRecipients.length,
        queued,
        sent,
        delivered: 0,
        simulated,
        failed,
        status: failed > 0 ? 'COMPLETE_WITH_ERRORS' : 'COMPLETE',
        skippedOptOuts: optedOutRecipients.length,
        provider: messages[0]?.provider ?? provider,
        messages
      }
      for (const message of state.outboundMessages) {
        if (messages.some((sentMessage) => sentMessage.id === message.id)) message.dispatchId = run.id
      }
      run.messages = messages.map((message) => ({ ...message, dispatchId: run.id }))
      state.dispatches.unshift(run)
      persist()
      recordAudit(
        'DISPATCH_RUN_COMPLETED',
        {
          campaignId: campaign.id,
          dispatchId: run.id,
          selected: run.selected,
          skippedOptOuts: run.skippedOptOuts,
          simulated: run.simulated
        },
        now
      )
      return clone(run)
    },
    updateMessageStatus(payload, now = new Date()) {
      const sid = payload.MessageSid ?? payload.messageSid ?? payload.sid
      const status = payload.MessageStatus ?? payload.status
      const message = state.outboundMessages.find((entry) => entry.sid === sid || entry.messageSid === sid)
      if (!message) throw new Error(`Outbound message ${sid} not found`)

      message.status = status ?? message.status
      message.updatedAt = isoNow(now)
      persist()
      recordAudit(
        'TWILIO_STATUS_CALLBACK',
        {
          sid,
          status: message.status
        },
        now
      )
      recordBilling(
        {
          category: 'callback',
          units: 1,
          cost: 0,
          metadata: { sid, status: message.status }
        },
        now
      )
      return clone(message)
    },
    processInboundMessage(payload, now = new Date()) {
      const phone = normalizePhone(payload.From ?? payload.from ?? payload.phone)
      const body = String(payload.Body ?? payload.body ?? '').trim().toUpperCase()
      if (!phone) throw new Error('Inbound callback requires From')

      let action = 'IGNORED'
      if (body.startsWith('STOP')) {
        const existing = state.optOuts.find((entry) => entry.phone === phone && !entry.removedAt)
        if (!existing) {
          state.optOuts.unshift({
            phone,
            source: 'twilio_inbound',
            createdAt: isoNow(now),
            removedAt: null
          })
        }
        action = 'OPT_OUT_CREATED'
      } else if (body.startsWith('START')) {
        for (const entry of state.optOuts) {
          if (entry.phone === phone && !entry.removedAt) entry.removedAt = isoNow(now)
        }
        action = 'OPT_OUT_REMOVED'
      }

      persist()
      recordAudit(
        'TWILIO_INBOUND_CALLBACK',
        {
          phone,
          body,
          action
        },
        now
      )
      recordBilling(
        {
          category: 'opt_out',
          units: 1,
          cost: 0,
          metadata: { phone, action }
        },
        now
      )
      return {
        phone,
        body,
        action,
        optedOut: action === 'OPT_OUT_CREATED'
      }
    },
    reset() {
      state = createBaseState(normalizedOptions.seedTwilioConfig)
      persist()
      return {
        campaigns: 0,
        mefBatches: 0,
        dispatches: 0,
        outboundMessages: 0,
        optOuts: 0
      }
    },
    recordAudit
  }
}

export { normalizePhone, summarizeTwilioStatus, TWILIO_MESSAGE_COST }
