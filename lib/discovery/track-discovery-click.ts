import type { DiscoveryRailItem } from '@/lib/discovery/homepage-discovery-rail'

export const DISCOVERY_RECENTS_STORAGE_KEY = 'cf:public-discovery:recent-clicks'
const DISCOVERY_ANONYMOUS_ID_STORAGE_KEY = 'cf:public-discovery:anonymous-id'
const DISCOVERY_SESSION_ID_STORAGE_KEY = 'cf:public-discovery:session-id'
const DISCOVERY_PENDING_CLICK_STORAGE_KEY = 'cf:public-discovery:pending-click'

export const DISCOVERY_ALGORITHM_VERSION = 'homepage-discovery-v2'

export type DiscoveryInteractionAction =
  | 'impression'
  | 'click'
  | 'ignore'
  | 'love'
  | 'hate'
  | 'hide'
  | 'save'
  | 'pin'
  | 'unpin'
  | 'dismiss'
  | 'undismiss'
  | 'long_dwell'
  | 'quick_back'
  | 'search_submit'
  | 'inquiry_started'
  | 'inquiry_submitted'
  | 'book'
  | 'booking'

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

export type DiscoveryEventPayload = {
  action: DiscoveryInteractionAction
  itemType: DiscoveryRailItem['type'] | string
  itemValue: string
  itemLabel?: string | null
  href?: string | null
  baseHref?: string | null
  destinationPath?: string | null
  rowRole?: string
  rowPosition?: number
  rowItemCount?: number
  isDuplicate?: boolean
  locationAttached?: boolean
  presentation?: DiscoveryRailItem['presentation'] | null
  eventContext?: Record<string, unknown>
}

type StoredDiscoveryClick = Omit<DiscoveryEventPayload, 'action'> & {
  clickedAt: number
  pagePath?: string
}

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
    rememberPendingClick({
      itemType: item.type,
      itemValue: extractItemValue(item, finalHref),
      itemLabel: item.label,
      href: finalHref,
      baseHref: item.href,
      destinationPath: extractDestinationPath(finalHref),
      rowRole: context.rowRole,
      rowPosition: context.rowPosition,
      rowItemCount: context.rowItemCount,
      locationAttached: context.locationAttached === true,
      presentation: item.presentation ?? null,
      eventContext: {
        source: 'homepage_discovery_marquee',
        item_icon: item.icon ?? null,
        item_sublabel: item.sublabel ?? null,
        item_eyebrow: item.eyebrow ?? null,
      },
    })
  }

  trackDiscoveryEvent({
    action,
    itemType: item.type,
    itemValue: extractItemValue(item, finalHref),
    itemLabel: item.label,
    href: finalHref,
    baseHref: item.href,
    destinationPath: extractDestinationPath(finalHref),
    rowRole: context.rowRole,
    rowPosition: context.rowPosition,
    rowItemCount: context.rowItemCount,
    isDuplicate: false,
    locationAttached: context.locationAttached === true,
    presentation: item.presentation ?? null,
    eventContext: {
      source: 'homepage_discovery_marquee',
      item_icon: item.icon ?? null,
      item_sublabel: item.sublabel ?? null,
      item_eyebrow: item.eyebrow ?? null,
    },
  })
}

export function trackDiscoveryEvent(payload: DiscoveryEventPayload): void {
  if (payload.isDuplicate === true) return

  const ids = getDiscoveryBrowserIds()

  fetch('/api/discovery/click', {
    method: 'POST',
    keepalive: true,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: payload.action,
      item_type: payload.itemType,
      item_value: payload.itemValue,
      item_label: payload.itemLabel,
      href: payload.href,
      base_href: payload.baseHref,
      destination_path:
        payload.destinationPath ?? (payload.href ? extractDestinationPath(payload.href) : null),
      row_role: payload.rowRole,
      row_position: payload.rowPosition,
      row_item_count: payload.rowItemCount,
      is_duplicate: false,
      location_attached: payload.locationAttached === true,
      presentation: payload.presentation ?? null,
      anonymous_id: ids.anonymousId,
      session_id: ids.sessionId,
      algorithm_version: DISCOVERY_ALGORITHM_VERSION,
      page_path: typeof window === 'undefined' ? undefined : window.location.pathname,
      event_context: payload.eventContext,
    }),
  }).catch(() => undefined)
}

export function trackDiscoveryClick(
  item: DiscoveryRailItem,
  context: DiscoveryClickContext = {}
): void {
  trackDiscoveryInteraction('click', item, context)
}

export function trackDiscoverySearchSubmit(input: {
  location?: string
  serviceType?: string
  href: string
}): void {
  const itemValue = input.serviceType || input.location || 'homepage_search'
  trackDiscoveryEvent({
    action: 'search_submit',
    itemType: input.serviceType ? 'service' : 'location',
    itemValue,
    itemLabel: input.serviceType || input.location || 'Homepage search',
    href: input.href,
    destinationPath: extractDestinationPath(input.href),
    eventContext: {
      source: 'homepage_search',
      location: input.location || null,
      service_type: input.serviceType || null,
    },
  })
}

export function trackDiscoveryChefSave(input: { chefId: string; saved: boolean }): void {
  trackDiscoveryEvent({
    action: input.saved ? 'save' : 'hide',
    itemType: 'featured_chef',
    itemValue: input.chefId,
    itemLabel: input.saved ? 'Saved chef' : 'Unsaved chef',
    eventContext: {
      source: 'save_chef_button',
    },
  })
}

export function mergeAnonymousDiscoveryHistory(): void {
  if (typeof window === 'undefined') return
  const ids = getDiscoveryBrowserIds()
  if (!ids.anonymousId) return

  fetch('/api/discovery/identify', {
    method: 'POST',
    keepalive: true,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ anonymous_id: ids.anonymousId }),
  }).catch(() => undefined)
}

export function flushDiscoveryDestinationOutcome(): void {
  if (typeof window === 'undefined') return

  const pending = readPendingClick()
  if (!pending) return

  let settled = false
  const dwellTimer = window.setTimeout(() => {
    if (settled) return
    settled = true
    clearPendingClick()
    trackDiscoveryEvent({
      ...pending,
      action: 'long_dwell',
      eventContext: {
        ...pending.eventContext,
        dwell_ms: Date.now() - pending.clickedAt,
        source_page_path: pending.pagePath ?? null,
      },
    })
  }, 15_000)

  const onPageHide = () => {
    if (settled) return
    const dwellMs = Date.now() - pending.clickedAt
    if (dwellMs >= 4000) return
    settled = true
    window.clearTimeout(dwellTimer)
    clearPendingClick()
    trackDiscoveryEvent({
      ...pending,
      action: 'quick_back',
      eventContext: {
        ...pending.eventContext,
        dwell_ms: dwellMs,
        source_page_path: pending.pagePath ?? null,
      },
    })
  }

  window.addEventListener('pagehide', onPageHide, { once: true })
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

function rememberPendingClick(input: Omit<StoredDiscoveryClick, 'clickedAt' | 'pagePath'>): void {
  if (typeof window === 'undefined') return

  try {
    const pending: StoredDiscoveryClick = {
      ...input,
      clickedAt: Date.now(),
      pagePath: window.location.pathname,
    }
    window.sessionStorage.setItem(DISCOVERY_PENDING_CLICK_STORAGE_KEY, JSON.stringify(pending))
  } catch {
    // Session storage is an enhancement only.
  }
}

function readPendingClick(): StoredDiscoveryClick | null {
  try {
    const raw = window.sessionStorage.getItem(DISCOVERY_PENDING_CLICK_STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as StoredDiscoveryClick
    if (!parsed || typeof parsed.itemType !== 'string' || typeof parsed.itemValue !== 'string') {
      clearPendingClick()
      return null
    }
    return parsed
  } catch {
    clearPendingClick()
    return null
  }
}

function clearPendingClick(): void {
  try {
    window.sessionStorage.removeItem(DISCOVERY_PENDING_CLICK_STORAGE_KEY)
  } catch {
    // Session storage is an enhancement only.
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
