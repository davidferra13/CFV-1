export const STRICT_FOCUS_GROUP_ORDER = ['remy', 'sales', 'events', 'clients', 'admin'] as const

export const STRICT_FOCUS_PRIMARY_SHORTCUT_HREFS = [
  '/dashboard',
  '/inbox',
  '/inquiries',
  '/events',
  '/clients',
] as const

const STRICT_FOCUS_GROUP_IDS = new Set<string>(['remy', 'sales', 'events', 'clients'])

export function getStrictFocusGroupRank(groupId: string): number {
  const rank = STRICT_FOCUS_GROUP_ORDER.indexOf(
    groupId as (typeof STRICT_FOCUS_GROUP_ORDER)[number]
  )
  return rank === -1 ? Number.MAX_SAFE_INTEGER : rank
}

export function isStrictFocusGroupVisible(groupId: string, isAdmin: boolean): boolean {
  if (STRICT_FOCUS_GROUP_IDS.has(groupId)) return true
  return isAdmin && groupId === 'admin'
}

export function getEffectiveAdminState(isAdmin: boolean, previewActive: boolean): boolean {
  return isAdmin && !previewActive
}

// ── EVENT LOCK-IN ──
// When a chef locks in to an event, only these nav groups remain visible.
const LOCK_IN_GROUP_IDS = new Set<string>([
  'remy',
  'sales',
  'events',
  'clients',
  'culinary',
  'operations',
  'vendors',
  'inventory',
  'finance',
])

export const LOCK_IN_PRIMARY_SHORTCUT_HREFS = [
  '/dashboard',
  '/inbox',
  '/inquiries',
  '/events',
  '/clients',
  '/documents',
] as const

export function isLockInGroupVisible(groupId: string, isAdmin: boolean): boolean {
  if (LOCK_IN_GROUP_IDS.has(groupId)) return true
  return isAdmin && groupId === 'admin'
}
