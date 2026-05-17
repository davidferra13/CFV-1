import type { DiscoveryItemType } from '@/lib/discovery/homepage-discovery-rail'

export type DiscoveryDestinationFamily =
  | 'eat'
  | 'chefs'
  | 'nearby'
  | 'ingredients'
  | 'cuisine_page'
  | 'chef_profile'
  | 'hub'
  | 'public_info'

export type DiscoveryDestinationValidation = {
  valid: boolean
  family: DiscoveryDestinationFamily | null
  reason: string
}

const PUBLIC_INFO_PATHS = new Set([
  '/book',
  '/contact',
  '/gift-cards',
  '/how-it-works',
  '/services',
  '/trust',
  '/cannabis/public',
])

const DISALLOWED_PRIVATE_PREFIXES = [
  '/admin',
  '/api',
  '/dashboard',
  '/events',
  '/invoices',
  '/my-',
  '/quotes',
  '/recipes',
  '/settings',
]

const TYPE_ROUTE_COMPATIBILITY: Record<DiscoveryItemType, readonly DiscoveryDestinationFamily[]> = {
  cuisine: ['chefs', 'nearby', 'cuisine_page', 'eat'],
  food_type: ['nearby', 'eat', 'chefs'],
  craving: ['eat', 'nearby'],
  service: ['chefs', 'eat', 'nearby', 'public_info'],
  occasion: ['eat', 'chefs', 'public_info'],
  dietary: ['chefs', 'eat', 'nearby'],
  featured_chef: ['chef_profile'],
  chef_pick: ['chef_profile', 'chefs', 'eat', 'nearby', 'public_info'],
  combo: ['eat', 'chefs', 'nearby'],
  story: ['eat', 'public_info', 'ingredients', 'chef_profile', 'chefs', 'nearby'],
  surprise: ['eat', 'chefs', 'nearby'],
  seasonal: ['ingredients', 'eat', 'nearby', 'chefs'],
  location: ['chefs', 'nearby', 'eat'],
  mood: ['eat', 'chefs', 'nearby'],
  price: ['eat', 'chefs', 'nearby'],
  time: ['eat', 'chefs', 'nearby'],
  group_size: ['eat', 'chefs'],
  saved: ['chefs', 'eat', 'chef_profile', 'hub'],
  special_dining: ['eat', 'chefs', 'public_info'],
  circle: ['hub', 'eat'],
  culinary_signal: ['ingredients', 'eat', 'nearby'],
  technique: ['eat', 'chefs', 'nearby'],
  ingredient: ['eat', 'ingredients', 'nearby', 'chefs'],
  vibe: ['eat', 'chefs', 'nearby'],
}

export function getDiscoveryDestinationFamily(href: string): DiscoveryDestinationFamily | null {
  let url: URL
  try {
    url = new URL(href, 'https://chef.test')
  } catch {
    return null
  }

  if (url.origin !== 'https://chef.test') return null

  const pathname = normalizePath(url.pathname)
  if (DISALLOWED_PRIVATE_PREFIXES.some((prefix) => pathname.startsWith(prefix))) return null
  if (pathname === '/eat') return 'eat'
  if (pathname === '/chefs') return 'chefs'
  if (pathname === '/nearby' || pathname.startsWith('/nearby/')) return 'nearby'
  if (pathname === '/ingredients' || pathname.startsWith('/ingredients/')) return 'ingredients'
  if (pathname.startsWith('/cuisines/')) return 'cuisine_page'
  if (pathname.startsWith('/chef/')) return 'chef_profile'
  if (pathname === '/hub' || pathname === '/hub/open-tables' || pathname === '/hub/circles') {
    return 'hub'
  }
  if (PUBLIC_INFO_PATHS.has(pathname)) return 'public_info'

  return null
}

export function validateDiscoveryDestination(
  itemType: DiscoveryItemType,
  href: string
): DiscoveryDestinationValidation {
  const family = getDiscoveryDestinationFamily(href)
  if (!family) {
    return {
      valid: false,
      family: null,
      reason: 'Destination is not an approved public discovery route.',
    }
  }

  if (!TYPE_ROUTE_COMPATIBILITY[itemType].includes(family)) {
    return {
      valid: false,
      family,
      reason: `${itemType} cannot route to ${family}.`,
    }
  }

  return {
    valid: true,
    family,
    reason: 'Approved public discovery destination.',
  }
}

export function assertDiscoveryDestination(
  itemType: DiscoveryItemType,
  href: string
): DiscoveryDestinationFamily {
  const validation = validateDiscoveryDestination(itemType, href)
  if (!validation.valid || !validation.family) {
    throw new Error(validation.reason)
  }
  return validation.family
}

function normalizePath(pathname: string): string {
  if (pathname.length > 1 && pathname.endsWith('/')) return pathname.slice(0, -1)
  return pathname
}
