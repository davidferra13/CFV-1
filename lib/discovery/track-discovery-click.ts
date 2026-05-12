import type { DiscoveryRailItem } from '@/app/(public)/_components/cuisine-marquee'

export const DISCOVERY_RECENTS_STORAGE_KEY = 'cf:public-discovery:recent-clicks'
const DISCOVERY_ANONYMOUS_ID_STORAGE_KEY = 'cf:public-discovery:anonymous-id'
const DISCOVERY_SESSION_ID_STORAGE_KEY = 'cf:public-discovery:session-id'

export type DiscoveryInteractionAction =
  | 'impression'
  | 'click'
  | 'ignore'
  | 'love'
  | 'hate'
  | 'hide'

export type DiscoveryRecentClick = {
  type: DiscoveryRailItem['type']
  label: string
  href: string
  icon?: DiscoveryRailItem['icon']
  sublabel?: string
  selectedAt: string
}

export type DiscoveryClickContext = {
  href?: string
  rowRole?: string
  rowPosition?: number
  rowItemCount?: number
  isDuplicate?: boolean
  locationAttached?: boolean
}

export type DiscoveryInteractionContext = DiscoveryClickContext

export function trackDiscoveryInteraction(
  action: DiscoveryInteractionAction,
  item: DiscoveryRailItem,
  context: DiscoveryInteractionContext = {}
): void {
  if (context.isDuplicate === true) return

  const finalHref = context.href ?? item.href
  const ids = getDiscoveryBrowserIds()

  if (action === 'click') {
    rememberDiscoveryClick(item, finalHref)
  }

  fetch('/api/discovery/click', {
    method: 'POST',
    keepalive: true,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action,
      item_type: item.type,
      item_value: extractItemValue(item, finalHref),
      item_label: item.label,
      href: finalHref,
      base_href: item.href,
      destination_path: extractDestinationPath(finalHref),
      row_role: context.rowRole,
      row_position: context.rowPosition,
      row_item_count: context.rowItemCount,
      is_duplicate: false,
      location_attached: context.locationAttached === true,
      presentation: item.presentation ?? null,
      anonymous_id: ids.anonymousId,
      session_id: ids.sessionId,
      page_path: typeof window === 'undefined' ? undefined : window.location.pathname,
    }),
  }).catch(() => undefined)
}

export function trackDiscoveryClick(
  item: DiscoveryRailItem,
  context: DiscoveryClickContext = {}
): void {
  trackDiscoveryInteraction('click', item, context)
}

function rememberDiscoveryClick(item: DiscoveryRailItem, href: string): void {
  if (typeof window === 'undefined') return

  try {
    const current = JSON.parse(
      window.localStorage.getItem(DISCOVERY_RECENTS_STORAGE_KEY) ?? '[]'
    ) as DiscoveryRecentClick[]
    const nextEntry: DiscoveryRecentClick = {
      type: item.type,
      label: item.label,
      href,
      icon: item.icon,
      sublabel: item.sublabel,
      selectedAt: new Date().toISOString(),
    }
    const next = [
      nextEntry,
      ...current.filter((entry) => entry.href !== href && entry.label !== item.label),
    ].slice(0, 12)
    window.localStorage.setItem(DISCOVERY_RECENTS_STORAGE_KEY, JSON.stringify(next))
  } catch {
    // Local storage is an enhancement only.
  }
}

function getDiscoveryBrowserIds(): { anonymousId?: string; sessionId?: string } {
  if (typeof window === 'undefined') return {}

  return {
    anonymousId: getOrCreateBrowserId(window.localStorage, DISCOVERY_ANONYMOUS_ID_STORAGE_KEY),
    sessionId: getOrCreateBrowserId(window.sessionStorage, DISCOVERY_SESSION_ID_STORAGE_KEY),
  }
}

function getOrCreateBrowserId(storage: Storage, key: string): string | undefined {
  try {
    const current = storage.getItem(key)
    if (current) return current
    const next = createClientId()
    storage.setItem(key, next)
    return next
  } catch {
    return undefined
  }
}

function createClientId(): string {
  if (
    typeof crypto !== 'undefined' &&
    'randomUUID' in crypto &&
    typeof crypto.randomUUID === 'function'
  ) {
    return crypto.randomUUID()
  }

  return `cf_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 12)}`
}

function extractItemValue(item: DiscoveryRailItem, href = item.href): string {
  try {
    const url = new URL(href, 'http://x')
    return (
      url.searchParams.get('cuisine') ??
      url.searchParams.get('serviceType') ??
      url.searchParams.get('dietary') ??
      url.searchParams.get('q') ??
      url.searchParams.get('type') ??
      url.searchParams.get('intent') ??
      url.searchParams.get('craving') ??
      url.searchParams.get('eventStyle') ??
      url.searchParams.get('location') ??
      item.label.toLowerCase().replace(/\s+/g, '_')
    )
  } catch {
    return item.label.toLowerCase().replace(/\s+/g, '_')
  }
}

function extractDestinationPath(href: string): string {
  try {
    return new URL(href, 'http://x').pathname
  } catch {
    return href.split('?')[0] || href
  }
}
