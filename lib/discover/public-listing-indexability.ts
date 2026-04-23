import {
  isDirectoryListingIndexable,
  parseDirectoryListingHours,
  type DirectoryListingTrustInput,
} from './trust'

export type DirectoryListingIndexabilityReason =
  | 'verified_listing'
  | 'claimed_listing_ready'
  | 'status_requires_noindex'
  | 'missing_claim_timestamp'
  | 'listing_stale'
  | 'missing_location'
  | 'insufficient_detail'

export type DirectoryListingIndexability = {
  indexable: boolean
  reason: DirectoryListingIndexabilityReason
}

export type DirectoryListingIndexabilityCandidate = Pick<
  DirectoryListingTrustInput,
  | 'status'
  | 'claimed_at'
  | 'updated_at'
  | 'city'
  | 'state'
  | 'address'
  | 'phone'
  | 'email'
  | 'website_url'
  | 'description'
  | 'hours'
  | 'photo_urls'
  | 'menu_url'
  | 'price_range'
>

export const MIN_INDEXABLE_LISTING_DESCRIPTION_LENGTH = 1

const MS_PER_DAY = 24 * 60 * 60 * 1000
const VERIFIED_INDEX_MAX_AGE_DAYS = 365
const CLAIMED_INDEX_MAX_AGE_DAYS = 180

function hasText(value: string | null | undefined): boolean {
  return typeof value === 'string' && value.trim().length > 0
}

function parseDate(value: string | null | undefined): Date | null {
  if (!value) return null
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

function daysSince(value: string | null | undefined, now: Date): number | null {
  const parsed = parseDate(value)
  if (!parsed) return null
  return Math.floor((now.getTime() - parsed.getTime()) / MS_PER_DAY)
}

function detailSignalCount(candidate: DirectoryListingIndexabilityCandidate): number {
  const contactSignal =
    hasText(candidate.phone) || hasText(candidate.email) || hasText(candidate.website_url)

  return [
    hasText(candidate.description),
    hasText(candidate.address),
    contactSignal,
    Boolean(parseDirectoryListingHours(candidate.hours)),
    Boolean(candidate.photo_urls?.length),
    hasText(candidate.menu_url),
    hasText(candidate.price_range),
  ].filter(Boolean).length
}

export function evaluateDirectoryListingIndexability(
  candidate: DirectoryListingIndexabilityCandidate,
  now: Date = new Date()
): DirectoryListingIndexability {
  if (!isDirectoryListingIndexable(candidate, { now })) {
    if (candidate.status !== 'claimed' && candidate.status !== 'verified') {
      return { indexable: false, reason: 'status_requires_noindex' }
    }

    if (candidate.status === 'claimed' && !hasText(candidate.claimed_at)) {
      return { indexable: false, reason: 'missing_claim_timestamp' }
    }

    const updatedDays = daysSince(candidate.updated_at, now)
    const maxAgeDays =
      candidate.status === 'verified' ? VERIFIED_INDEX_MAX_AGE_DAYS : CLAIMED_INDEX_MAX_AGE_DAYS
    if (updatedDays == null || updatedDays > maxAgeDays) {
      return { indexable: false, reason: 'listing_stale' }
    }

    if (!hasText(candidate.address) && !hasText(candidate.city) && !hasText(candidate.state)) {
      return { indexable: false, reason: 'missing_location' }
    }

    return { indexable: false, reason: 'insufficient_detail' }
  }

  return {
    indexable: true,
    reason: candidate.status === 'verified' ? 'verified_listing' : 'claimed_listing_ready',
  }
}
