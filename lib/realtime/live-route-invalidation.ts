export type LiveRouteInvalidationMessage = {
  event: string
  data?: {
    entity?: string
  }
}

const ENTITY_ROUTE_SEGMENTS: Record<string, string[]> = {
  cannabis_control_packet_evidence: ['cannabis', 'events'],
  cannabis_control_packet_reconciliations: ['cannabis', 'events'],
  cannabis_control_packet_snapshots: ['cannabis', 'events'],
  cannabis_event_details: ['cannabis', 'events'],
  cannabis_host_agreements: ['cannabis'],
  cannabis_tier_invitations: ['cannabis', 'guests'],
  charity_hours: ['charity'],
  chef_daily_briefings: ['briefing', 'daily'],
  chef_preferences: ['settings', 'chef', 'features'],
  chef_profile: ['settings', 'chef', 'portfolio'],
  chef_service_config: ['settings', 'chef'],
  chefs: ['settings', 'chef'],
  daily_revenue: ['finance', 'financials', 'vendors'],
  disputes: ['payments', 'finance', 'financials'],
  event_cannabis_course_config: ['cannabis', 'events'],
  event_share_settings: ['events'],
  expenses: ['expenses', 'finance', 'financials', 'vendors'],
  gift_cards: ['payments', 'commerce', 'store'],
  guest_event_profile: ['guests', 'events', 'cannabis'],
  notifications: ['notifications'],
  payments: ['payments', 'finance', 'financials'],
  tickets: ['events', 'store'],
  vendor_document_uploads: ['vendors'],
  vendor_invoices: ['vendors', 'expenses', 'finance', 'financials'],
  vendor_items: ['vendors', 'inventory', 'prices'],
  vendor_price_alert_settings: ['vendors', 'prices'],
  vendor_price_entries: ['vendors', 'prices'],
  vendors: ['vendors'],
  webhook_endpoints: ['settings', 'dev'],
  wix_connections: ['wix-submissions', 'settings'],
  wix_submissions: ['wix-submissions', 'inquiries'],
}

const OVERVIEW_ROUTE_SEGMENTS = new Set(['activity', 'dashboard', 'pulse', 'reports'])
const NON_ROUTE_REFRESH_ENTITIES = new Set(['notifications'])

function normalizeSegment(value: string) {
  return value.toLowerCase().replace(/_/g, '-').trim()
}

function routeSegments(pathname: string) {
  return pathname
    .split(/[?#]/)[0]
    .split('/')
    .map(normalizeSegment)
    .filter(Boolean)
}

function segmentMatches(routeSegment: string, targetSegment: string) {
  if (routeSegment === targetSegment) return true
  if (routeSegment.replace(/s$/, '') === targetSegment.replace(/s$/, '')) return true
  return false
}

export function shouldRefreshForLiveRouteMutation(
  pathname: string | null | undefined,
  message: LiveRouteInvalidationMessage
) {
  if (message.event !== 'live_mutation') return true

  const entity = message.data?.entity
  if (!entity) return true

  const normalizedEntity = entity.toLowerCase()
  if (NON_ROUTE_REFRESH_ENTITIES.has(normalizedEntity)) return false

  const targets = ENTITY_ROUTE_SEGMENTS[normalizedEntity]
  if (!targets) return true

  const segments = routeSegments(pathname ?? '')
  if (segments.length === 0) return true
  if (segments.some((segment) => OVERVIEW_ROUTE_SEGMENTS.has(segment))) return true

  return segments.some((segment) =>
    targets.some((target) => segmentMatches(segment, normalizeSegment(target)))
  )
}
