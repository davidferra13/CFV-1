export type PublicFeaturedBookingMenuDish = {
  id: string
  courseName: string
  courseNumber: number
  name: string | null
  description: string | null
  dietaryTags: string[]
  allergenFlags: string[]
}

export type PublicFeaturedBookingMenu = {
  id: string
  name: string
  description: string | null
  cuisineType: string | null
  pricePerPersonCents: number | null
  serviceStyle: string | null
  targetGuestCount: number | null
  timesUsed: number
  dishCount: number
  dishes: PublicFeaturedBookingMenuDish[]
}

export type FeaturedBookingMenuShowcase = {
  badge: string | null
  title: string | null
  pitch: string | null
}

export function resolveRequestedFeaturedMenuId(
  configuredMenuId: string | null | undefined,
  requestedMenuId: string | null | undefined
) {
  const normalizedConfigured = configuredMenuId?.trim() || null
  const normalizedRequested = requestedMenuId?.trim() || null

  if (!normalizedConfigured || !normalizedRequested) {
    return null
  }

  return normalizedConfigured === normalizedRequested ? normalizedRequested : null
}

export function normalizeBookingServiceModeForMenu<T extends string>(
  requestedServiceMode: T,
  hasSelectedFeaturedMenu: boolean
) {
  return hasSelectedFeaturedMenu ? ('one_off' as T) : requestedServiceMode
}

export function buildFeaturedMenuContextLine(menuName: string) {
  return `Featured Menu Selected: ${menuName}`
}

export function formatServiceStyleLabel(serviceStyle: string | null | undefined) {
  if (!serviceStyle) return null

  return serviceStyle
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

export function formatFeaturedMenuPriceLabel(pricePerPersonCents: number | null | undefined) {
  if (typeof pricePerPersonCents !== 'number' || pricePerPersonCents <= 0) {
    return null
  }

  return `From $${Math.round(pricePerPersonCents / 100)} per guest`
}

export function formatFeaturedMenuUsageLabel(timesUsed: number | null | undefined) {
  if (typeof timesUsed !== 'number' || timesUsed <= 0) {
    return null
  }

  return timesUsed === 1 ? 'Booked once before' : `Booked ${timesUsed} times`
}
