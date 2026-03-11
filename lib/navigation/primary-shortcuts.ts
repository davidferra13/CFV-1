import type { ArchetypeId } from '@/lib/archetypes/registry'

export const DEFAULT_PRIMARY_SHORTCUT_HREFS = [
  '/dashboard',
  '/inbox',
  '/clients',
  '/inquiries',
  '/quotes',
  '/schedule',
  '/events',
  '/menus',
  '/recipes',
  '/communications',
  '/inventory',
  '/documents',
  '/finance/invoices',
] as const

export const LEGACY_DEFAULT_PRIMARY_SHORTCUT_HREFS = [
  '/dashboard',
  '/briefing',
  '/daily',
  '/inbox',
  '/clients',
  '/inquiries',
  '/schedule',
  '/events',
  '/documents',
  '/menus',
] as const

export function withPrimaryNavExtras(...extras: string[]) {
  return Array.from(new Set([...DEFAULT_PRIMARY_SHORTCUT_HREFS, ...extras]))
}

export const CURRENT_ARCHETYPE_PRIMARY_NAV_HREFS: Record<ArchetypeId, string[]> = {
  'private-chef': withPrimaryNavExtras('/travel'),
  caterer: withPrimaryNavExtras('/staff', '/tasks', '/travel'),
  'meal-prep': withPrimaryNavExtras('/tasks', '/production'),
  restaurant: withPrimaryNavExtras('/staff', '/stations', '/commerce/register'),
  'food-truck': withPrimaryNavExtras('/travel', '/stations', '/commerce/register'),
  bakery: withPrimaryNavExtras('/bakery/production', '/tasks'),
}

export const LEGACY_ARCHETYPE_PRIMARY_NAV_HREFS: Record<ArchetypeId, readonly string[]> = {
  'private-chef': [
    '/dashboard',
    '/inbox',
    '/clients',
    '/inquiries',
    '/chat',
    '/schedule',
    '/events',
    '/travel',
  ],
  caterer: [
    '/dashboard',
    '/inbox',
    '/inquiries',
    '/schedule',
    '/events',
    '/staff',
    '/tasks',
    '/travel',
  ],
  'meal-prep': ['/dashboard', '/inbox', '/clients', '/chat', '/schedule', '/tasks'],
  restaurant: [
    '/dashboard',
    '/inbox',
    '/commerce/register',
    '/staff',
    '/stations',
    '/tasks',
    '/schedule',
    '/chat',
  ],
  'food-truck': [
    '/dashboard',
    '/commerce/register',
    '/schedule',
    '/stations',
    '/tasks',
    '/travel',
  ],
  bakery: ['/dashboard', '/inbox', '/commerce/register', '/clients', '/schedule', '/tasks'],
}

export function normalizePrimaryNavHrefs(input: readonly string[]): string[] {
  const seen = new Set<string>()
  const normalized: string[] = []

  for (const rawHref of input) {
    const href = rawHref.trim()
    if (!href || !href.startsWith('/')) continue
    if (seen.has(href)) continue
    seen.add(href)
    normalized.push(href)
  }

  return normalized
}

function equalHrefOrder(left: readonly string[], right: readonly string[]) {
  if (left.length !== right.length) return false
  for (let index = 0; index < left.length; index += 1) {
    if (left[index] !== right[index]) return false
  }
  return true
}

export function upgradeLegacyPrimaryNavHrefs(input: readonly string[]): string[] {
  const normalized = normalizePrimaryNavHrefs(input)
  if (normalized.length === 0) return []

  if (equalHrefOrder(normalized, LEGACY_DEFAULT_PRIMARY_SHORTCUT_HREFS)) {
    return [...DEFAULT_PRIMARY_SHORTCUT_HREFS]
  }

  for (const archetypeId of Object.keys(
    LEGACY_ARCHETYPE_PRIMARY_NAV_HREFS
  ) as ArchetypeId[]) {
    if (!equalHrefOrder(normalized, LEGACY_ARCHETYPE_PRIMARY_NAV_HREFS[archetypeId])) continue
    return [...CURRENT_ARCHETYPE_PRIMARY_NAV_HREFS[archetypeId]]
  }

  return normalized
}

export function isLegacyPrimaryNavHrefs(input: readonly string[]) {
  const normalized = normalizePrimaryNavHrefs(input)
  if (normalized.length === 0) return false
  return !equalHrefOrder(normalized, upgradeLegacyPrimaryNavHrefs(normalized))
}
