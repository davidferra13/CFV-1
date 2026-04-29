// Chef Breadcrumb Types - Navigation tracking for "Retrace" mode

export type BreadcrumbType = 'page_view' | 'click' | 'form_open' | 'tab_switch' | 'search'

export type BreadcrumbEntry = {
  id: string
  tenant_id: string
  actor_id: string
  breadcrumb_type: BreadcrumbType
  path: string
  label: string | null
  referrer_path: string | null
  metadata: Record<string, unknown>
  session_id: string | null
  created_at: string
}

export type BreadcrumbBatchItem = {
  breadcrumb_type: BreadcrumbType
  path: string
  label?: string
  referrer_path?: string
  metadata?: Record<string, unknown>
  session_id?: string
  timestamp?: string // ISO string, defaults to now on server
}

export type BreadcrumbSession = {
  session_id: string
  started_at: string
  ended_at: string
  duration_minutes: number
  breadcrumbs: BreadcrumbEntry[]
  page_count: number
  summary: string // e.g. "Dashboard → Events → Johnson Wedding → Menu Builder"
}

export type BreadcrumbQueryOptions = {
  limit?: number
  daysBack?: number
  cursor?: string | null
  sessionId?: string
}

export type BreadcrumbQueryResult = {
  sessions: BreadcrumbSession[]
  nextCursor: string | null
}

// Human-readable labels for known routes
export const ROUTE_LABELS: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/daily-ops': 'Daily Ops',
  '/activity': 'Activity Log',
  '/inquiries': 'Inquiries',
  '/events': 'Events',
  '/quotes': 'Quotes',
  '/pipeline/leads': 'Leads',
  '/clients': 'Clients',
  '/clients/recurring': 'Recurring Board',
  '/culinary/menus': 'Menus',
  '/recipes': 'Recipes',
  '/recipes/new': 'New Recipe',
  '/culinary/recipes': 'Recipes',
  '/calendar': 'Calendar',
  '/finance': 'Finance Hub',
  '/finance/expenses': 'Expenses',
  '/finance/ledger': 'Ledger',
  '/settings': 'Settings',
  '/inbox': 'Inbox',
  '/messages': 'Messages',
  '/network': 'Chef Network',
  '/prospecting': 'Prospecting',
}

// Match a path to a human-readable label
export function labelForPath(path: string): string {
  // Exact match
  if (ROUTE_LABELS[path]) return ROUTE_LABELS[path]

  // Try prefix match, for example /events/abc becomes "Event Detail".
  const segments = path.split('/').filter(Boolean)
  if (segments[0] === 'recipes' && segments.length >= 2) {
    if (segments[1] === 'new') return 'New Recipe'
    if (segments.length >= 3 && segments[2] === 'edit') return 'Edit Recipe'
    return 'Recipe Detail'
  }

  if (segments.length >= 3) {
    const prefix = '/' + segments.slice(0, 2).join('/')
    const parentLabel = ROUTE_LABELS[prefix]
    if (parentLabel) return `${parentLabel.replace(/s$/, '')} Detail`
  }

  if (segments.length >= 2) {
    const prefix = '/' + segments.slice(0, 2).join('/')
    if (ROUTE_LABELS[prefix]) return ROUTE_LABELS[prefix]
  }

  // Fallback: humanize the last segment
  const last = segments[segments.length - 1] || 'Page'
  return last.replace(/[-_]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

// Breadcrumb type icons/labels for UI
export const BREADCRUMB_TYPE_CONFIG: Record<BreadcrumbType, { label: string; icon: string }> = {
  page_view: { label: 'Visited', icon: '→' },
  click: { label: 'Clicked', icon: '•' },
  form_open: { label: 'Opened', icon: '✎' },
  tab_switch: { label: 'Switched to', icon: '⇥' },
  search: { label: 'Searched', icon: '⌕' },
}
