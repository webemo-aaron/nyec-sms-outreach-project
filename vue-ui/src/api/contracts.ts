export type ApiRequestContext = {
  method: string
  path: string
}

function encodePathSegment(value: string | number) {
  return encodeURIComponent(String(value))
}

export const apiRoutes = {
  dashboard: '/dashboard',
  mefBatches: '/mef/batches',
  mefBatch(id: string | number) {
    return `/mef/batches/${encodePathSegment(id)}`
  },
  campaigns: '/campaigns',
  campaign(id: string | number) {
    return `/campaigns/${encodePathSegment(id)}`
  },
  campaignLaunch(id: string | number) {
    return `/campaigns/${encodePathSegment(id)}/launch`
  },
  campaignPause(id: string | number) {
    return `/campaigns/${encodePathSegment(id)}/pause`
  },
  campaignDispatchBatches(id: string | number) {
    return `/dispatches?campaignId=${encodePathSegment(id)}`
  },
  campaignRunDispatch(id: string | number) {
    return `/campaigns/${encodePathSegment(id)}/dispatches`
  },
  dispatches: '/dispatches',
  outboundMessages: '/outbound-messages',
  auditEvents: '/audit/events',
  billingSummary: '/billing/summary',
  twilioConfig: '/twilio/config',
  twilioTest: '/twilio/test',
  resetLocalData: '/admin/reset'
} as const

export function describeApiFailure(error: unknown, context: ApiRequestContext) {
  if (error instanceof Error && error.message) {
    return `${context.method} ${context.path}: ${error.message}`
  }

  return `${context.method} ${context.path}: request failed`
}
