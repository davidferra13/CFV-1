import type { DiscoveryRailDebugScore } from '@/lib/discovery/discovery-rail-scoring'

export const HOMEPAGE_DISCOVERY_LANES = ['taste', 'occasion', 'chefflow_picks'] as const

export type HomepageDiscoveryLane = (typeof HOMEPAGE_DISCOVERY_LANES)[number]

export type HomepageDiscoveryLaneLabel = 'Taste' | 'Occasion' | 'ChefFlow Picks'

export type DiscoveryRowRole = 'cuisine' | 'mobile' | 'craving' | 'intent'

export const DISCOVERY_ROW_ROLES: readonly DiscoveryRowRole[] = [
  'cuisine',
  'mobile',
  'craving',
  'intent',
] as const

export type DiscoveryItemType =
  | 'cuisine'
  | 'food_type'
  | 'craving'
  | 'service'
  | 'occasion'
  | 'dietary'
  | 'featured_chef'
  | 'chef_pick'
  | 'combo'
  | 'story'
  | 'surprise'
  | 'seasonal'
  | 'location'
  | 'mood'
  | 'price'
  | 'time'
  | 'group_size'
  | 'saved'
  | 'special_dining'
  | 'circle'
  | 'culinary_signal'
  | 'technique'
  | 'ingredient'
  | 'vibe'

export type DiscoveryIconKey =
  | 'avocado'
  | 'bbq'
  | 'bowl'
  | 'bread'
  | 'brunch'
  | 'burger'
  | 'cake'
  | 'carrot'
  | 'champagne'
  | 'chef'
  | 'cheers'
  | 'coffee'
  | 'concierge'
  | 'confetti'
  | 'comfort'
  | 'cookie'
  | 'crown'
  | 'dining'
  | 'dumpling'
  | 'egg'
  | 'family'
  | 'fish'
  | 'flame'
  | 'graduation'
  | 'grains'
  | 'knife'
  | 'leaf'
  | 'location'
  | 'market'
  | 'noodles'
  | 'pasta'
  | 'pepper'
  | 'pizza'
  | 'plant'
  | 'ramen'
  | 'salad'
  | 'sandwich'
  | 'search'
  | 'seafood'
  | 'small_plates'
  | 'spark'
  | 'stack'
  | 'steak'
  | 'sushi'
  | 'taco'
  | 'utensils'
  | 'wine'

export interface DiscoveryRailItem {
  type: DiscoveryItemType
  label: string
  href: string
  lane?: HomepageDiscoveryLane
  icon?: DiscoveryIconKey
  presentation?: 'pill' | 'story' | 'visual_card' | 'badge'
  eyebrow?: string
  sublabel?: string
  reason?: string
  source?: string
  freshness?: string
  actionLabel?: string
  debugScore?: DiscoveryRailDebugScore
}

export type HomepageDiscoveryRailReconciliation = {
  route: '/'
  ownerComponent: 'HomepageDiscovery'
  rendererComponent: 'CuisineMarquee'
  contractModule: 'lib/discovery/homepage-discovery-rail.ts'
  status: 'canonical_public_homepage_rail'
  staleRenderers: Array<{
    component: string
    status: 'library_primitive_only' | 'unmounted_for_homepage' | 'different_surface'
    reason: string
  }>
  destinationFamilies: readonly ['/eat', '/chefs', '/nearby', '/ingredients', '/chef/[slug]']
}

export const HOMEPAGE_DISCOVERY_RAIL_RECONCILIATION: HomepageDiscoveryRailReconciliation = {
  route: '/',
  ownerComponent: 'HomepageDiscovery',
  rendererComponent: 'CuisineMarquee',
  contractModule: 'lib/discovery/homepage-discovery-rail.ts',
  status: 'canonical_public_homepage_rail',
  staleRenderers: [
    {
      component: 'components/discovery/discovery-row.tsx',
      status: 'library_primitive_only',
      reason: 'Reusable card row primitive, not mounted directly on the public homepage.',
    },
    {
      component: 'components/discovery/universal-rail.tsx',
      status: 'different_surface',
      reason:
        'Operational universal rail for authenticated surfaces, not the public homepage rail.',
    },
    {
      component: 'components/rail/url-capability-rail.tsx',
      status: 'different_surface',
      reason: 'Chef URL capability rail, not the consumer-facing homepage discovery rail.',
    },
  ],
  destinationFamilies: ['/eat', '/chefs', '/nearby', '/ingredients', '/chef/[slug]'],
}

export type DiscoveryRailItemDisplayMeta = {
  lane: HomepageDiscoveryLane
  reason: string
  source: string
  freshness: string
  actionLabel: string
}

export interface HomepageDiscoveryLaneCta {
  label: string
  href: string
  ariaLabel: string
  itemType: DiscoveryItemType
}

export interface HomepageDiscoveryLaneMetadata {
  lane: HomepageDiscoveryLane
  label: HomepageDiscoveryLaneLabel
  description: string
  cta: HomepageDiscoveryLaneCta
  roles: readonly DiscoveryRowRole[]
  itemTypes: readonly DiscoveryItemType[]
}

export const HOMEPAGE_DISCOVERY_LANE_ROLE_MAP: Record<
  HomepageDiscoveryLane,
  readonly DiscoveryRowRole[]
> = {
  taste: ['cuisine', 'craving'],
  occasion: ['intent'],
  chefflow_picks: ['mobile'],
}

export const DISCOVERY_ROW_ROLE_LANE_MAP: Record<DiscoveryRowRole, HomepageDiscoveryLane> = {
  cuisine: 'taste',
  craving: 'taste',
  intent: 'occasion',
  mobile: 'chefflow_picks',
}

export const HOMEPAGE_DISCOVERY_LANE_ITEM_TYPES: Record<
  HomepageDiscoveryLane,
  readonly DiscoveryItemType[]
> = {
  taste: [
    'cuisine',
    'food_type',
    'craving',
    'dietary',
    'mood',
    'seasonal',
    'culinary_signal',
    'technique',
    'ingredient',
    'vibe',
  ],
  occasion: [
    'service',
    'occasion',
    'special_dining',
    'circle',
    'location',
    'price',
    'time',
    'group_size',
  ],
  chefflow_picks: ['featured_chef', 'chef_pick', 'combo', 'story', 'surprise', 'saved'],
}

export const DISCOVERY_ITEM_TYPE_LANE_MAP: Record<DiscoveryItemType, HomepageDiscoveryLane> = {
  cuisine: 'taste',
  food_type: 'taste',
  craving: 'taste',
  dietary: 'taste',
  mood: 'taste',
  seasonal: 'taste',
  culinary_signal: 'taste',
  service: 'occasion',
  occasion: 'occasion',
  special_dining: 'occasion',
  circle: 'occasion',
  location: 'occasion',
  price: 'occasion',
  time: 'occasion',
  group_size: 'occasion',
  featured_chef: 'chefflow_picks',
  chef_pick: 'chefflow_picks',
  combo: 'chefflow_picks',
  story: 'chefflow_picks',
  surprise: 'chefflow_picks',
  saved: 'chefflow_picks',
  technique: 'taste',
  ingredient: 'taste',
  vibe: 'taste',
}

export const HOMEPAGE_DISCOVERY_LANE_METADATA: Record<
  HomepageDiscoveryLane,
  HomepageDiscoveryLaneMetadata
> = {
  taste: {
    lane: 'taste',
    label: 'Taste',
    description: 'Cuisines, dishes, dietary signals, and cravings.',
    cta: {
      label: 'Explore tastes',
      href: '/chefs',
      ariaLabel: 'Explore chefs by taste',
      itemType: 'cuisine',
    },
    roles: HOMEPAGE_DISCOVERY_LANE_ROLE_MAP.taste,
    itemTypes: HOMEPAGE_DISCOVERY_LANE_ITEM_TYPES.taste,
  },
  occasion: {
    lane: 'occasion',
    label: 'Occasion',
    description: 'Services, moments, party size, timing, and local intent.',
    cta: {
      label: 'Plan an occasion',
      href: '/eat',
      ariaLabel: 'Plan a dining occasion',
      itemType: 'occasion',
    },
    roles: HOMEPAGE_DISCOVERY_LANE_ROLE_MAP.occasion,
    itemTypes: HOMEPAGE_DISCOVERY_LANE_ITEM_TYPES.occasion,
  },
  chefflow_picks: {
    lane: 'chefflow_picks',
    label: 'ChefFlow Picks',
    description: 'Featured chefs, saved items, editorial stories, and smart shortcuts.',
    cta: {
      label: 'See ChefFlow picks',
      href: '/chefs?sort=featured',
      ariaLabel: 'See ChefFlow featured picks',
      itemType: 'chef_pick',
    },
    roles: HOMEPAGE_DISCOVERY_LANE_ROLE_MAP.chefflow_picks,
    itemTypes: HOMEPAGE_DISCOVERY_LANE_ITEM_TYPES.chefflow_picks,
  },
}

export interface FeaturedChefRailData {
  slug: string
  displayName: string
  primaryCuisine?: string | null
  city?: string | null
  state?: string | null
  // Proof enrichment (all optional, degrade cleanly)
  specialty?: string | null
  acceptingInquiries?: boolean | null
  priceTier?: 'budget' | 'mid' | 'premium' | 'luxury' | null
  dietaryStrengths?: string[] | null
}

export interface HomepageLocationContext {
  location: string
  lat: number | null
  lng: number | null
}

export function isHomepageDiscoveryLane(value: unknown): value is HomepageDiscoveryLane {
  return (
    typeof value === 'string' && HOMEPAGE_DISCOVERY_LANES.includes(value as HomepageDiscoveryLane)
  )
}

export function isDiscoveryRowRole(value: unknown): value is DiscoveryRowRole {
  return typeof value === 'string' && DISCOVERY_ROW_ROLES.includes(value as DiscoveryRowRole)
}

export function getHomepageDiscoveryLaneMetadata(
  lane: HomepageDiscoveryLane
): HomepageDiscoveryLaneMetadata {
  return HOMEPAGE_DISCOVERY_LANE_METADATA[lane]
}

export function getHomepageDiscoveryLaneForRole(role: DiscoveryRowRole): HomepageDiscoveryLane {
  return DISCOVERY_ROW_ROLE_LANE_MAP[role]
}

export function getHomepageDiscoveryRailReconciliation(): HomepageDiscoveryRailReconciliation {
  return HOMEPAGE_DISCOVERY_RAIL_RECONCILIATION
}

export function getDiscoveryItemLane(
  item: Pick<DiscoveryRailItem, 'type' | 'href'> & { lane?: HomepageDiscoveryLane | null }
): HomepageDiscoveryLane {
  if (isHomepageDiscoveryLane(item.lane)) return item.lane
  return DISCOVERY_ITEM_TYPE_LANE_MAP[item.type] ?? inferDiscoveryLaneFromHref(item.href) ?? 'taste'
}

export function inferDiscoveryLaneFromHref(href: string): HomepageDiscoveryLane | null {
  return getDiscoveryHrefLane(href)
}

export function withDiscoveryItemLane<T extends DiscoveryRailItem>(
  item: T
): T & { lane: HomepageDiscoveryLane } {
  return {
    ...item,
    lane: getDiscoveryItemLane(item),
  }
}

export function getDiscoveryRailItemDisplayMeta(
  item: DiscoveryRailItem,
  locationContext: HomepageLocationContext | null = null
): DiscoveryRailItemDisplayMeta {
  const lane = getDiscoveryItemLane(item)
  const locationLabel = locationContext?.location.trim()
  const defaults = getDefaultDiscoveryRailItemMeta(item, lane, locationLabel)

  return {
    lane,
    reason: item.reason ?? defaults.reason,
    source: item.source ?? defaults.source,
    freshness: item.freshness ?? defaults.freshness,
    actionLabel: item.actionLabel ?? defaults.actionLabel,
  }
}

export function groupDiscoveryItemsByLane<T extends DiscoveryRailItem>(
  items: T[]
): Record<HomepageDiscoveryLane, Array<T & { lane: HomepageDiscoveryLane }>> {
  return items.reduce<Record<HomepageDiscoveryLane, Array<T & { lane: HomepageDiscoveryLane }>>>(
    (groups, item) => {
      const itemWithLane = withDiscoveryItemLane(item)
      groups[itemWithLane.lane].push(itemWithLane)
      return groups
    },
    {
      taste: [],
      occasion: [],
      chefflow_picks: [],
    }
  )
}

export function buildDiscoveryHref(baseHref: string, ctx: HomepageLocationContext | null): string {
  if (!ctx || !ctx.location.trim()) return baseHref
  const [path, qs] = baseHref.split('?')
  const supportsLocation =
    path.startsWith('/chefs') || path.startsWith('/nearby') || path.startsWith('/eat')
  if (!supportsLocation) return baseHref

  const params = new URLSearchParams(qs ?? '')
  params.set('location', ctx.location.trim())
  if (
    ctx.lat !== null &&
    ctx.lng !== null &&
    (path.startsWith('/chefs') || path.startsWith('/nearby'))
  ) {
    params.set('lat', String(ctx.lat))
    if (path.startsWith('/nearby')) {
      params.set('lon', String(ctx.lng))
    } else if (path.startsWith('/chefs')) {
      params.set('lng', String(ctx.lng))
    }
  }
  return `${path}?${params.toString()}`
}

export function dedupeDiscoveryItems(items: DiscoveryRailItem[]): DiscoveryRailItem[] {
  const seen = new Set<string>()
  const next: DiscoveryRailItem[] = []
  for (const item of items) {
    const key = `${item.type}:${item.label}:${item.href}`
    if (seen.has(key)) continue
    seen.add(key)
    next.push(item)
  }
  return next
}

export function buildInterleavedDiscoveryRow(
  staticItems: DiscoveryRailItem[],
  chefItems: DiscoveryRailItem[],
  locationItems: DiscoveryRailItem[],
  signalItems: DiscoveryRailItem[] = []
): DiscoveryRailItem[] {
  if (chefItems.length === 0 && locationItems.length === 0 && signalItems.length === 0) {
    return staticItems
  }

  const inserts: DiscoveryRailItem[] = []
  let ci = 0
  let li = 0
  while (ci < chefItems.length || li < locationItems.length) {
    if (ci < chefItems.length) inserts.push(chefItems[ci++])
    if (li < locationItems.length) inserts.push(locationItems[li++])
  }
  for (const signal of signalItems) {
    inserts.push(signal)
  }

  const spacing = Math.max(4, Math.floor(staticItems.length / (inserts.length + 1)))
  const result: DiscoveryRailItem[] = []
  let insertIdx = 0

  for (let i = 0; i < staticItems.length; i++) {
    result.push(staticItems[i])
    if (insertIdx < inserts.length && (i + 1) % spacing === 0) {
      result.push(inserts[insertIdx++])
    }
  }

  while (insertIdx < inserts.length) {
    result.push(inserts[insertIdx++])
  }

  return result
}

export const buildRow2 = buildInterleavedDiscoveryRow

function getDefaultDiscoveryRailItemMeta(
  item: DiscoveryRailItem,
  lane: HomepageDiscoveryLane,
  locationLabel: string | undefined
): Omit<DiscoveryRailItemDisplayMeta, 'lane'> {
  if (item.type === 'featured_chef') {
    return {
      reason: 'Featured from public chef profile completeness and availability signals.',
      source: 'Public chef profile',
      freshness: 'Refreshed with homepage chef directory data',
      actionLabel: 'Open chef profile',
    }
  }

  if (item.type === 'culinary_signal' || item.type === 'seasonal' || item.type === 'ingredient') {
    return {
      reason: 'Market-aware ingredient signal for what is strong or time-sensitive right now.',
      source: 'Public seasonal market pulse',
      freshness: 'Current seasonal calendar',
      actionLabel: 'Explore ingredients',
    }
  }

  if (item.type === 'location') {
    return {
      reason: locationLabel
        ? `Matched to your saved or searched location: ${locationLabel}.`
        : 'Location-aware discovery shortcut.',
      source: 'Homepage location context',
      freshness: 'Current session',
      actionLabel: item.href.startsWith('/nearby') ? 'Browse nearby' : 'Find local chefs',
    }
  }

  if (item.type === 'service' || item.type === 'occasion' || item.type === 'special_dining') {
    return {
      reason: 'Planning shortcut based on common private dining and event intents.',
      source: 'Public discovery contract',
      freshness: 'Stable route contract',
      actionLabel: item.href.startsWith('/eat') ? 'Plan this' : 'Find matching chefs',
    }
  }

  if (item.type === 'craving' || item.type === 'food_type' || item.type === 'cuisine') {
    return {
      reason:
        lane === 'taste'
          ? 'Taste lane item from the homepage cuisine and appetite catalog.'
          : 'Food discovery shortcut from the public catalog.',
      source: 'Public discovery catalog',
      freshness: 'Rotated per visit',
      actionLabel: item.type === 'cuisine' ? 'Browse cuisine' : 'Explore this taste',
    }
  }

  if (item.type === 'saved') {
    return {
      reason: 'Shortcut from saved or recently viewed discovery behavior.',
      source: 'Your browser or signed-in discovery profile',
      freshness: 'Current profile state',
      actionLabel: 'Reopen shortcut',
    }
  }

  if (item.type === 'circle') {
    return {
      reason: 'Shared dining route for group planning and guest coordination.',
      source: 'Public Dinner Circles surface',
      freshness: 'Stable route contract',
      actionLabel: 'Open circles',
    }
  }

  return {
    reason: 'Curated public discovery prompt for browsing chefs, food, or planning paths.',
    source: 'ChefFlow public discovery rail',
    freshness: 'Current homepage rail',
    actionLabel: item.href.startsWith('/nearby')
      ? 'Browse nearby'
      : item.href.startsWith('/ingredients')
        ? 'Explore ingredients'
        : item.href.startsWith('/chefs') || item.href.startsWith('/chef/')
          ? 'Find chef'
          : 'Open discovery',
  }
}

function getDiscoveryHrefLane(href: string): HomepageDiscoveryLane | null {
  try {
    const url = new URL(href, 'https://chef.test')
    if (url.pathname.startsWith('/chef/')) return 'chefflow_picks'
    if (url.pathname.startsWith('/ingredients')) return 'taste'

    if (url.pathname.startsWith('/eat')) {
      if (url.searchParams.has('craving')) return 'taste'
      return 'occasion'
    }
  } catch {
    return null
  }

  return null
}
