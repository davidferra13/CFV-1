import { parseDirectoryListingHours } from './trust'

export const NEARBY_COLLECTION_READINESS_SCORE_MIN = 7
export const NEARBY_COLLECTION_MIN_READY_RESULTS = 6

export type NearbyCollectionCandidate = {
  id: string
  name: string
  status: string
  featured?: boolean | null
  lead_score?: number | null
  photo_urls?: string[] | null
  website_url?: string | null
  description?: string | null
  phone?: string | null
  address?: string | null
  city?: string | null
  state?: string | null
  hours?: unknown
  menu_url?: string | null
  updated_at?: string | null
}

export type NearbyCollectionReadiness = {
  score: number
  isReady: boolean
  hasOwnerConfidence: boolean
  coreSignalCount: number
  hasPhoto: boolean
  hasWebsite: boolean
  hasDescription: boolean
  hasPhone: boolean
  hasHours: boolean
  hasMenu: boolean
  hasFreshness: boolean
  hasLocation: boolean
}

export type NearbyCollectionCurationSummary = {
  mode: 'ready_only' | 'fallback'
  candidateCount: number
  readyCount: number
  displayedCount: number
  fallbackCount: number
  suppressedCount: number
}

type RankedNearbyCollectionCandidate<T extends NearbyCollectionCandidate> = {
  listing: T
  readiness: NearbyCollectionReadiness
}

function hasNonEmptyValue(value: string | null | undefined) {
  return typeof value === 'string' && value.trim().length > 0
}

function hasRichDescription(value: string | null | undefined) {
  return typeof value === 'string' && value.trim().length >= 80
}

function parseNearbyCollectionDate(value: string | null | undefined) {
  if (!value) return null
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

function compareNearbyCollectionDates(
  leftValue: string | null | undefined,
  rightValue: string | null | undefined
) {
  const left = parseNearbyCollectionDate(leftValue)
  const right = parseNearbyCollectionDate(rightValue)
  const leftTime = left?.getTime() ?? 0
  const rightTime = right?.getTime() ?? 0
  return rightTime - leftTime
}

function hasFreshListingUpdate(listing: NearbyCollectionCandidate) {
  const updatedAt = parseNearbyCollectionDate(listing.updated_at)
  if (!updatedAt) return false

  const now = Date.now()
  const ageDays = Math.floor((now - updatedAt.getTime()) / (24 * 60 * 60 * 1000))
  const freshnessWindowDays = listing.status === 'verified' ? 365 : 180

  return ageDays <= freshnessWindowDays
}

export function evaluateNearbyCollectionReadiness(
  listing: NearbyCollectionCandidate
): NearbyCollectionReadiness {
  const hasPhoto =
    Array.isArray(listing.photo_urls) &&
    listing.photo_urls.some((url) => typeof url === 'string' && url.trim().length > 0)
  const hasWebsite = hasNonEmptyValue(listing.website_url)
  const hasDescription = hasRichDescription(listing.description)
  const hasPhone = hasNonEmptyValue(listing.phone)
  const hasHours = parseDirectoryListingHours(listing.hours) !== null
  const hasMenu = hasNonEmptyValue(listing.menu_url)
  const hasLocation =
    hasNonEmptyValue(listing.address) ||
    (hasNonEmptyValue(listing.city) && hasNonEmptyValue(listing.state))
  const hasOwnerConfidence = listing.status === 'verified' || listing.status === 'claimed'
  const hasFreshness = hasFreshListingUpdate(listing)
  const coreSignalCount = [
    hasPhoto,
    hasWebsite,
    hasDescription,
    hasPhone,
    hasHours,
    hasMenu,
  ].filter(Boolean).length

  const score =
    (listing.status === 'verified' ? 4 : listing.status === 'claimed' ? 2 : 0) +
    (hasPhoto ? 3 : 0) +
    (hasWebsite ? 2 : 0) +
    (hasDescription ? 2 : 0) +
    (hasPhone ? 1 : 0) +
    (hasHours ? 1 : 0) +
    (hasMenu ? 1 : 0) +
    (hasLocation ? 1 : 0) +
    (hasFreshness ? 1 : 0)

  const isReady =
    hasLocation &&
    score >= NEARBY_COLLECTION_READINESS_SCORE_MIN &&
    ((hasOwnerConfidence && coreSignalCount >= 2) || coreSignalCount >= 3)

  return {
    score,
    isReady,
    hasOwnerConfidence,
    coreSignalCount,
    hasPhoto,
    hasWebsite,
    hasDescription,
    hasPhone,
    hasHours,
    hasMenu,
    hasFreshness,
    hasLocation,
  }
}

function compareRankedNearbyCollectionCandidates<T extends NearbyCollectionCandidate>(
  left: RankedNearbyCollectionCandidate<T>,
  right: RankedNearbyCollectionCandidate<T>
) {
  if (left.readiness.isReady !== right.readiness.isReady) {
    return left.readiness.isReady ? -1 : 1
  }

  const scoreDelta = right.readiness.score - left.readiness.score
  if (scoreDelta !== 0) return scoreDelta

  const featuredDelta =
    Number(Boolean(right.listing.featured)) - Number(Boolean(left.listing.featured))
  if (featuredDelta !== 0) return featuredDelta

  const coreSignalDelta = right.readiness.coreSignalCount - left.readiness.coreSignalCount
  if (coreSignalDelta !== 0) return coreSignalDelta

  const photoDelta = Number(right.readiness.hasPhoto) - Number(left.readiness.hasPhoto)
  if (photoDelta !== 0) return photoDelta

  const websiteDelta = Number(right.readiness.hasWebsite) - Number(left.readiness.hasWebsite)
  if (websiteDelta !== 0) return websiteDelta

  const ownerDelta =
    Number(right.readiness.hasOwnerConfidence) - Number(left.readiness.hasOwnerConfidence)
  if (ownerDelta !== 0) return ownerDelta

  const leadScoreDelta = (right.listing.lead_score ?? 0) - (left.listing.lead_score ?? 0)
  if (leadScoreDelta !== 0) return leadScoreDelta

  const updatedAtDelta = compareNearbyCollectionDates(
    left.listing.updated_at,
    right.listing.updated_at
  )
  if (updatedAtDelta !== 0) return updatedAtDelta

  return left.listing.name.localeCompare(right.listing.name)
}

export function curateNearbyCollectionCandidates<T extends NearbyCollectionCandidate>(
  candidates: T[],
  page: number,
  itemsPerPage: number
) {
  const ranked = candidates
    .map((listing) => ({
      listing,
      readiness: evaluateNearbyCollectionReadiness(listing),
    }))
    .sort(compareRankedNearbyCollectionCandidates)

  const ready = ranked.filter((entry) => entry.readiness.isReady)
  const targetCount = Math.min(
    ranked.length,
    Math.max(NEARBY_COLLECTION_MIN_READY_RESULTS, ready.length)
  )
  const curatedPool =
    ready.length >= NEARBY_COLLECTION_MIN_READY_RESULTS ? ready : ranked.slice(0, targetCount)

  const fallbackCount = curatedPool.filter((entry) => !entry.readiness.isReady).length
  const total = curatedPool.length
  const totalPages = Math.max(1, Math.ceil(total / itemsPerPage))
  const safePage = Math.min(Math.max(1, page), totalPages)
  const start = (safePage - 1) * itemsPerPage
  const listings = curatedPool.slice(start, start + itemsPerPage).map((entry) => entry.listing)

  return {
    listings,
    total,
    page: safePage,
    totalPages,
    summary: ranked.length
      ? ({
          mode: fallbackCount > 0 ? 'fallback' : 'ready_only',
          candidateCount: ranked.length,
          readyCount: ready.length,
          displayedCount: curatedPool.length,
          fallbackCount,
          suppressedCount: Math.max(0, ranked.length - curatedPool.length),
        } satisfies NearbyCollectionCurationSummary)
      : null,
  }
}
