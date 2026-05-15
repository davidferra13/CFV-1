import type { UniversalRailItem } from './universal-rail-types'
import type {
  DiscoveryRailItem,
  DiscoveryItemType,
  HomepageDiscoveryLane,
  DiscoveryIconKey,
} from './homepage-discovery-rail'

/**
 * Convert Universal Rail items to the DiscoveryRailItem format
 * consumed by the homepage CuisineMarquee and HomepageDiscovery components.
 *
 * This bridges the Universal Rail system (operational, scored, typed) into
 * the consumer-facing discovery surface (visual, emoji-driven, lane-based).
 */
export function toDiscoveryRailItems(universalItems: UniversalRailItem[]): DiscoveryRailItem[] {
  const results: DiscoveryRailItem[] = []

  for (const item of universalItems) {
    const converted = convertItem(item)
    if (converted) results.push(converted)
  }

  return results
}

// ---- Conversion logic ----

function convertItem(item: UniversalRailItem): DiscoveryRailItem | null {
  const lane = categoryToLane(item.category)
  const type = categoryToDiscoveryType(item.category, item.definitionId)

  return {
    type,
    label: item.label,
    href: item.href,
    lane,
    icon: resolveIcon(item),
    presentation: presentationToDiscovery(item.presentation),
    sublabel: item.sublabel,
  }
}

// ---- Mapping tables ----

const CATEGORY_TO_LANE: Record<string, HomepageDiscoveryLane> = {
  taste: 'taste',
  occasion: 'occasion',
  chefflow_picks: 'chefflow_picks',
  engagement: 'chefflow_picks',
  seasonal: 'taste',
  dietary: 'taste',
}

function categoryToLane(category: string): HomepageDiscoveryLane {
  return CATEGORY_TO_LANE[category] ?? 'chefflow_picks'
}

const DEFINITION_PREFIX_TO_TYPE: Record<string, DiscoveryItemType> = {
  'public.cuisine': 'cuisine',
  'public.food_type': 'food_type',
  'public.craving': 'craving',
  'public.dietary': 'dietary',
  'public.occasion': 'occasion',
  'public.service': 'service',
  'public.featured_chef': 'featured_chef',
  'public.seasonal': 'seasonal',
  'public.mood': 'mood',
  'public.location': 'location',
  'public.price': 'price',
  'public.time': 'time',
  'public.group_size': 'group_size',
  'public.chef_pick': 'chef_pick',
  'public.story': 'story',
  'public.surprise': 'surprise',
  'public.technique': 'technique',
  'public.ingredient': 'ingredient',
  'public.vibe': 'mood',
  'public.special_dining': 'special_dining',
  'guest.cuisine': 'cuisine',
  'guest.food_type': 'food_type',
  'guest.craving': 'craving',
  'guest.dietary': 'dietary',
  'guest.occasion': 'occasion',
  'guest.service': 'service',
  'guest.featured_chef': 'featured_chef',
  'guest.seasonal': 'seasonal',
  'guest.saved_chef': 'saved',
  'guest.comparison': 'combo',
}

function categoryToDiscoveryType(category: string, definitionId: string): DiscoveryItemType {
  // Try exact definition match first
  const exactMatch = DEFINITION_PREFIX_TO_TYPE[definitionId]
  if (exactMatch) return exactMatch

  // Try prefix match (strip trailing specifics like _resurface)
  const prefix = definitionId.replace(/_[a-z]+$/, '')
  const prefixMatch = DEFINITION_PREFIX_TO_TYPE[prefix]
  if (prefixMatch) return prefixMatch

  // Fall back by category
  const CATEGORY_DEFAULTS: Record<string, DiscoveryItemType> = {
    taste: 'cuisine',
    occasion: 'occasion',
    chefflow_picks: 'chef_pick',
    engagement: 'story',
    seasonal: 'seasonal',
    dietary: 'dietary',
  }
  return CATEGORY_DEFAULTS[category] ?? 'cuisine'
}

const ICON_MAP: Record<string, DiscoveryIconKey> = {
  taco: 'taco',
  pizza: 'pizza',
  sushi: 'sushi',
  pasta: 'pasta',
  salad: 'salad',
  steak: 'steak',
  seafood: 'seafood',
  ramen: 'ramen',
  burger: 'burger',
  cake: 'cake',
  coffee: 'coffee',
  wine: 'wine',
  bread: 'bread',
  leaf: 'leaf',
  flame: 'flame',
  confetti: 'confetti',
  champagne: 'champagne',
  chef: 'chef',
  search: 'search',
  crown: 'crown',
  spark: 'spark',
  dining: 'dining',
  utensils: 'utensils',
  family: 'family',
  market: 'market',
  location: 'location',
}

function resolveIcon(item: UniversalRailItem): DiscoveryIconKey | undefined {
  if (!item.icon) return undefined
  return ICON_MAP[item.icon] ?? undefined
}

function presentationToDiscovery(
  presentation: string
): 'pill' | 'story' | 'visual_card' | 'badge' | undefined {
  switch (presentation) {
    case 'pill':
      return 'pill'
    case 'story':
      return 'story'
    case 'visual_card':
      return 'visual_card'
    case 'badge':
      return 'badge'
    default:
      return 'pill'
  }
}
