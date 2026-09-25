import type {
  ConsumerDiscoveryFilters,
  ConsumerResultCard,
} from '@/lib/public-consumer/discovery-actions'

export type MarketplaceSearch = {
  location: string
  date: string
  guests?: number
  craving: string
  dietary: string
  budget: string
}

type SearchParamInput = URLSearchParams | Record<string, string | string[] | undefined>

function first(input: SearchParamInput, key: string): string {
  if (input instanceof URLSearchParams) return input.get(key)?.trim() ?? ''
  const raw = input[key]
  if (Array.isArray(raw)) return raw.find((value) => value.trim())?.trim() ?? ''
  return typeof raw === 'string' ? raw.trim() : ''
}

function bounded(value: string, maxLength: number): string {
  return value.replace(/\s+/g, ' ').trim().slice(0, maxLength)
}
function parseGuests(value: string): number | undefined {
  const parsed = Number(value)
  if (!Number.isFinite(parsed) || parsed < 1) return undefined
  return Math.min(500, Math.floor(parsed))
}

function normalizeDate(value: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return ''
  const parsed = new Date(`${value}T00:00:00`)
  return Number.isNaN(parsed.getTime()) ? '' : value
}

function discoveryBudget(value: string): string | undefined {
  const map: Record<string, string> = {
    casual: 'budget',
    elevated: 'moderate',
    'fine-dining': 'premium',
    luxury: 'luxury',
  }
  return map[value]
}

export function readMarketplaceSearch(input: SearchParamInput): MarketplaceSearch {
  return {
    location: bounded(first(input, 'location'), 160),
    date: normalizeDate(first(input, 'date') || first(input, 'event_date')),
    guests: parseGuests(
      first(input, 'guests') || first(input, 'partySize') || first(input, 'guest_count')
    ),
    craving: bounded(first(input, 'craving'), 160),
    dietary: bounded(first(input, 'dietary') || first(input, 'dietary_restrictions'), 240),
    budget: bounded(first(input, 'budget') || first(input, 'budget_range'), 80),
  }
}
export function buildMarketplaceDiscoveryFilters(
  search: MarketplaceSearch
): ConsumerDiscoveryFilters {
  return {
    intent: 'private_chef',
    fulfillment: 'private_chef',
    location: search.location || undefined,
    dateWindow: search.date || undefined,
    partySize: search.guests,
    craving: search.craving || undefined,
    dietary: search.dietary || undefined,
    budget: discoveryBudget(search.budget),
  }
}

export function buildMarketplaceBookHref(search: MarketplaceSearch): string {
  const params = new URLSearchParams({
    service_type: 'dinner_party',
    occasion: 'Private chef',
    marketplace: '1',
  })

  if (search.location) params.set('location', search.location)
  if (search.date) params.set('event_date', search.date)
  if (search.guests) params.set('guest_count', String(search.guests))
  if (search.budget) params.set('budget_range', search.budget)
  if (search.dietary) params.set('dietary_restrictions', search.dietary)

  const notes = search.craving ? [`What we want to eat: ${search.craving}`] : []
  if (notes.length > 0) params.set('additional_notes', notes.join('\n'))
  return `/book?${params.toString()}`
}
export function selectMarketplaceChefMatches(
  cards: ConsumerResultCard[],
  limit = 3
): ConsumerResultCard[] {
  const seen = new Set<string>()

  return [...cards]
    .filter((card) => card.type === 'chef' && card.isAvailable)
    .sort((a, b) => b.relevanceScore - a.relevanceScore)
    .filter((card) => {
      const key = card.chefId || card.sourceId
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
    .slice(0, Math.max(1, limit))
}

export function chefProfileHref(card: ConsumerResultCard): string {
  if (card.profileHref?.startsWith('/chef/')) return card.profileHref
  if (card.ctaHref.startsWith('/chef/')) {
    return card.ctaHref.replace(/\/inquire(?:\?.*)?$/, '')
  }
  return '/chefs'
}

export function marketplaceSummary(search: MarketplaceSearch): string {
  const parts = [
    search.location || null,
    search.date || null,
    search.guests ? `${search.guests} guests` : null,
    search.craving || null,
  ].filter((value): value is string => Boolean(value))

  return parts.length > 0 ? parts.join(' · ') : 'Private chef'
}
