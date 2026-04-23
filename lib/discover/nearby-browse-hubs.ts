import type { DirectoryStats } from './actions'
import { BUSINESS_TYPES, getBusinessTypeLabel, getStateName } from './constants'

const TYPE_HUB_LIMIT = 6
const CITY_HUB_LIMIT = 4
const COMBO_HUB_LIMIT = 6
const QUICK_LINK_LIMIT = 5
const MIN_LIVE_COMBOS = 3

export type NearbyBrowseHubLink = {
  label: string
  href: string
  count?: number
}

export type NearbyBusinessTypeHub = {
  businessType: string
  label: string
  href: string
  count: number | null
  description: string
  supportingLinks: NearbyBrowseHubLink[]
}

export type NearbyCityHub = {
  city: string
  state: string
  label: string
  href: string
  count: number
  description: string
  supportingLinks: NearbyBrowseHubLink[]
}

export type NearbyCityTypeHub = {
  city: string
  state: string
  businessType: string
  typeLabel: string
  locationLabel: string
  href: string
  count: number
  description: string
}

export type NearbyBrowseHubModel = {
  typeHubs: NearbyBusinessTypeHub[]
  cityHubs: NearbyCityHub[]
  quickTypeLinks: NearbyBrowseHubLink[]
  quickCityLinks: NearbyBrowseHubLink[]
  comboSection:
    | {
        mode: 'live'
        items: NearbyCityTypeHub[]
      }
    | {
        mode: 'fallback'
        description: string
        cityLinks: NearbyBrowseHubLink[]
        typeLinks: NearbyBrowseHubLink[]
      }
}

function buildNearbyHref(filters: { state?: string; city?: string; businessType?: string }) {
  const params = new URLSearchParams()

  if (filters.state) params.set('state', filters.state)
  if (filters.city) params.set('city', filters.city)
  if (filters.businessType) params.set('type', filters.businessType)

  const queryString = params.toString()
  return queryString ? `/nearby?${queryString}` : '/nearby'
}

function formatLabelList(labels: string[]) {
  if (labels.length === 0) return ''
  if (labels.length === 1) return labels[0]
  if (labels.length === 2) return `${labels[0]} and ${labels[1]}`
  return `${labels.slice(0, -1).join(', ')}, and ${labels[labels.length - 1]}`
}

function uniqueOrderedValues(values: string[]) {
  return Array.from(new Set(values))
}

export function buildNearbyBrowseHubModel(stats: DirectoryStats): NearbyBrowseHubModel {
  const typeCountByValue = new Map(
    stats.topBusinessTypes.map((entry) => [entry.businessType, entry.count] as const)
  )
  const combosByType = new Map<
    string,
    { city: string; state: string; businessType: string; count: number }[]
  >()
  const combosByCity = new Map<
    string,
    { city: string; state: string; businessType: string; count: number }[]
  >()

  stats.topCityBusinessTypes.forEach((entry) => {
    const typeEntries = combosByType.get(entry.businessType) ?? []
    typeEntries.push(entry)
    combosByType.set(entry.businessType, typeEntries)

    const cityKey = `${entry.city}::${entry.state}`
    const cityEntries = combosByCity.get(cityKey) ?? []
    cityEntries.push(entry)
    combosByCity.set(cityKey, cityEntries)
  })

  const orderedBusinessTypes = uniqueOrderedValues([
    ...stats.topBusinessTypes.map((entry) => entry.businessType),
    ...BUSINESS_TYPES.map((entry) => entry.value),
  ]).slice(0, TYPE_HUB_LIMIT)

  const typeHubs: NearbyBusinessTypeHub[] = orderedBusinessTypes.map((businessType) => {
    const label = getBusinessTypeLabel(businessType)
    const count = typeCountByValue.get(businessType) ?? null
    const supportingLinks = (combosByType.get(businessType) ?? []).slice(0, 3).map((entry) => ({
      label: `${entry.city}, ${entry.state}`,
      href: buildNearbyHref({
        state: entry.state,
        city: entry.city,
        businessType,
      }),
      count: entry.count,
    }))
    const description =
      count != null && supportingLinks.length > 0
        ? `${count.toLocaleString()} live ${label.toLowerCase()} listings, with stronger pockets in ${formatLabelList(
            supportingLinks.map((entry) => entry.label)
          )}.`
        : count != null
          ? `Browse ${count.toLocaleString()} live ${label.toLowerCase()} listings across the current directory.`
          : `Open the ${label.toLowerCase()} hub first, then narrow by city, state, or cuisine.`

    return {
      businessType,
      label,
      href: buildNearbyHref({ businessType }),
      count,
      description,
      supportingLinks,
    }
  })

  const cityHubs: NearbyCityHub[] = stats.topCities.slice(0, CITY_HUB_LIMIT).map((entry) => {
    const locationLabel = `${entry.city}, ${entry.state}`
    const supportingLinks = (combosByCity.get(`${entry.city}::${entry.state}`) ?? [])
      .slice(0, 3)
      .map((combo) => ({
        label: getBusinessTypeLabel(combo.businessType),
        href: buildNearbyHref({
          state: combo.state,
          city: combo.city,
          businessType: combo.businessType,
        }),
        count: combo.count,
      }))
    const description =
      supportingLinks.length > 0
        ? `${entry.count.toLocaleString()} live listings in ${locationLabel}. Start with ${formatLabelList(
            supportingLinks.map((link) => link.label)
          )}.`
        : `${entry.count.toLocaleString()} live listings currently active in ${locationLabel}.`

    return {
      city: entry.city,
      state: entry.state,
      label: locationLabel,
      href: buildNearbyHref({ state: entry.state, city: entry.city }),
      count: entry.count,
      description,
      supportingLinks,
    }
  })

  const quickTypeLinks = typeHubs.slice(0, QUICK_LINK_LIMIT).map((hub) => ({
    label: hub.label,
    href: hub.href,
    count: hub.count ?? undefined,
  }))
  const quickCityLinks = cityHubs.slice(0, QUICK_LINK_LIMIT).map((hub) => ({
    label: hub.label,
    href: hub.href,
    count: hub.count,
  }))

  const liveComboItems: NearbyCityTypeHub[] = stats.topCityBusinessTypes
    .slice(0, COMBO_HUB_LIMIT)
    .map((entry) => {
      const typeLabel = getBusinessTypeLabel(entry.businessType)
      const locationLabel = `${entry.city}, ${getStateName(entry.state)}`
      const listingLabel = entry.count === 1 ? 'listing' : 'listings'

      return {
        city: entry.city,
        state: entry.state,
        businessType: entry.businessType,
        typeLabel,
        locationLabel,
        href: buildNearbyHref({
          state: entry.state,
          city: entry.city,
          businessType: entry.businessType,
        }),
        count: entry.count,
        description: `${entry.count.toLocaleString()} live ${listingLabel} currently active in this city-and-category path.`,
      }
    })

  if (liveComboItems.length >= MIN_LIVE_COMBOS) {
    return {
      typeHubs,
      cityHubs,
      quickTypeLinks,
      quickCityLinks,
      comboSection: {
        mode: 'live',
        items: liveComboItems,
      },
    }
  }

  const fallbackDescription =
    stats.totalListings > 0
      ? 'Nearby only promotes city-and-category combos once several live listings exist for the same path. Until then, the landing page leans on separate city and category hubs instead of brittle one-off links.'
      : 'Nearby is still building live coverage, so the landing page starts with reusable city and category hubs instead of empty combo pages.'

  return {
    typeHubs,
    cityHubs,
    quickTypeLinks,
    quickCityLinks,
    comboSection: {
      mode: 'fallback',
      description: fallbackDescription,
      cityLinks: quickCityLinks,
      typeLinks: quickTypeLinks,
    },
  }
}
