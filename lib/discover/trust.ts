import { formatDate } from '@/lib/utils/format'

const MS_PER_DAY = 24 * 60 * 60 * 1000
const HOURS_STALE_DAYS = 120
const CONTACT_STALE_DAYS = 180
const MENU_STALE_DAYS = 180
const VERIFIED_INDEX_MAX_AGE_DAYS = 365
const CLAIMED_INDEX_MAX_AGE_DAYS = 180

export type DirectoryListingTrustInput = {
  status: string
  source?: string | null
  updated_at?: string | null
  claimed_at?: string | null
  city?: string | null
  state?: string | null
  address?: string | null
  website_url?: string | null
  phone?: string | null
  email?: string | null
  description?: string | null
  hours?: unknown
  photo_urls?: string[] | null
  menu_url?: string | null
  price_range?: string | null
}

export type DirectoryTrustTone = 'verified' | 'claimed' | 'public' | 'warning' | 'muted'

export type DirectoryFieldTrust = {
  badge: string
  tone: DirectoryTrustTone
  evidence: string
  suppress?: boolean
}

export type ParsedDirectoryHours =
  | { kind: 'raw'; raw: string }
  | { kind: 'structured'; days: Record<string, string> }
  | null

export type DirectoryListingTrust = {
  status: DirectoryFieldTrust
  hours: DirectoryFieldTrust | null
  photos: DirectoryFieldTrust
  menu: DirectoryFieldTrust | null
  contact: DirectoryFieldTrust | null
  shouldIndex: boolean
}

type TrustOptions = {
  now?: Date
}

export function parseDirectoryListingHours(hours: unknown): ParsedDirectoryHours {
  if (!hours) return null

  let parsed = hours
  if (typeof hours === 'string') {
    try {
      parsed = JSON.parse(hours)
    } catch {
      const raw = hours.trim()
      return raw ? { kind: 'raw', raw } : null
    }
  }

  if (!parsed || typeof parsed !== 'object') {
    return null
  }

  if ('raw' in parsed && typeof (parsed as { raw?: unknown }).raw === 'string') {
    const raw = (parsed as { raw: string }).raw.trim()
    return raw ? { kind: 'raw', raw } : null
  }

  const entries = Object.entries(parsed as Record<string, unknown>).filter(
    ([, value]) => typeof value === 'string' && value.trim()
  )

  if (entries.length === 0) {
    return null
  }

  return {
    kind: 'structured',
    days: Object.fromEntries(entries.map(([day, value]) => [day, String(value).trim()])),
  }
}

export function isDirectoryListingIndexable(
  listing: DirectoryListingTrustInput,
  options: TrustOptions = {}
): boolean {
  const now = options.now ?? new Date()
  const updatedDays = daysSince(listing.updated_at, now)
  const hasClaimMarker = Boolean(parseDate(listing.claimed_at))
  const hasLocation = Boolean(listing.address || listing.city || listing.state)
  const contactSignal = Boolean(listing.phone || listing.email || listing.website_url)
  const menuTrust = buildMenuTrust(listing, now)
  const detailSignals = [
    Boolean(listing.description?.trim()),
    Boolean(listing.address?.trim()),
    Boolean(contactSignal),
    Boolean(parseDirectoryListingHours(listing.hours)),
    Boolean(listing.photo_urls?.length),
    Boolean(listing.menu_url && !menuTrust?.suppress),
    Boolean(listing.price_range),
  ].filter(Boolean).length

  if (listing.status === 'verified') {
    return hasLocation && detailSignals >= 3 && (updatedDays == null || updatedDays <= VERIFIED_INDEX_MAX_AGE_DAYS)
  }

  if (listing.status === 'claimed') {
    return (
      hasClaimMarker &&
      hasLocation &&
      detailSignals >= 4 &&
      updatedDays != null &&
      updatedDays <= CLAIMED_INDEX_MAX_AGE_DAYS
    )
  }

  return false
}

export function getDirectoryListingTrust(
  listing: DirectoryListingTrustInput,
  options: TrustOptions = {}
): DirectoryListingTrust {
  const now = options.now ?? new Date()

  return {
    status: buildStatusTrust(listing, now),
    hours: buildHoursTrust(listing, now),
    photos: buildPhotosTrust(listing, now),
    menu: buildMenuTrust(listing, now),
    contact: buildContactTrust(listing, now),
    shouldIndex: isDirectoryListingIndexable(listing, { now }),
  }
}

function buildStatusTrust(listing: DirectoryListingTrustInput, now: Date): DirectoryFieldTrust {
  const updatedDays = daysSince(listing.updated_at, now)
  const staleNote =
    updatedDays != null && updatedDays > CONTACT_STALE_DAYS ? ' Some details may be outdated.' : ''

  if (listing.status === 'verified') {
    return {
      badge: 'Owner verified',
      tone: 'verified',
      evidence: `Verified by the business owner. ${lastUpdatedSentence(listing.updated_at)}${staleNote}`,
    }
  }

  if (listing.status === 'claimed') {
    const claimedOn = listing.claimed_at ? ` on ${formatDateSafe(listing.claimed_at)}` : ''
    return {
      badge: 'Claimed listing',
      tone: 'claimed',
      evidence: `Claimed by the business owner${claimedOn}. Some details may still rely on public data. ${lastUpdatedSentence(listing.updated_at)}`,
    }
  }

  if (isOwnerSubmitted(listing)) {
    const reviewNote =
      listing.status === 'pending_submission' ? ' It is still waiting for review.' : ''
    return {
      badge: 'Owner submitted',
      tone: 'claimed',
      evidence: `Submitted by the business owner.${reviewNote} ${lastUpdatedSentence(listing.updated_at)}`,
    }
  }

  return {
    badge: 'Public source',
    tone: 'public',
    evidence: `Compiled from ${getSourceLabel(listing.source)}. ${lastUpdatedSentence(listing.updated_at)}${staleNote}`,
  }
}

function buildHoursTrust(
  listing: DirectoryListingTrustInput,
  now: Date
): DirectoryFieldTrust | null {
  const hours = parseDirectoryListingHours(listing.hours)
  if (!hours) return null

  const updatedDays = daysSince(listing.updated_at, now)

  if (!hasOwnerBackedStatus(listing) && hours.kind === 'raw') {
    return {
      badge: 'Needs confirmation',
      tone: 'warning',
      evidence: `Hours came from ${getSourceLabel(listing.source)} as a raw listing field. Confirm before visiting.`,
    }
  }

  if (updatedDays != null && updatedDays > HOURS_STALE_DAYS) {
    if (listing.status === 'verified') {
      return {
        badge: 'Needs confirmation',
        tone: 'warning',
        evidence: `Owner-verified listing, but this profile was last updated ${formatDateSafe(listing.updated_at)}. Confirm hours before visiting.`,
      }
    }

    if (listing.status === 'claimed') {
      return {
        badge: 'Needs confirmation',
        tone: 'warning',
        evidence: `Claimed listing, but this profile was last updated ${formatDateSafe(listing.updated_at)}. Hours may still rely on older data.`,
      }
    }

    if (isOwnerSubmitted(listing)) {
      return {
        badge: 'Needs confirmation',
        tone: 'warning',
        evidence: `Submitted by the business owner, but this profile was last updated ${formatDateSafe(listing.updated_at)}. Confirm hours before visiting.`,
      }
    }

    return {
      badge: 'Needs confirmation',
      tone: 'warning',
      evidence: `Public hours were last refreshed ${formatDateSafe(listing.updated_at)}. Confirm before visiting.`,
    }
  }

  if (listing.status === 'verified') {
    return {
      badge: 'Owner verified',
      tone: 'verified',
      evidence: 'Hours appear on an owner-verified listing. Field-level edit tracking is not available yet.',
    }
  }

  if (listing.status === 'claimed') {
    return {
      badge: 'Claimed listing',
      tone: 'claimed',
      evidence: 'Owner claimed this listing, but we do not know whether these hours were updated after claim.',
    }
  }

  if (isOwnerSubmitted(listing)) {
    return {
      badge: 'Owner submitted',
      tone: 'claimed',
      evidence:
        listing.status === 'pending_submission'
          ? 'Hours were submitted by the business and are waiting for review.'
          : 'Hours came from the business submission.',
    }
  }

  return {
    badge: 'Public source',
    tone: 'public',
    evidence: `Public hours from ${getSourceLabel(listing.source)}.`,
  }
}

function buildPhotosTrust(listing: DirectoryListingTrustInput, now: Date): DirectoryFieldTrust {
  const photoCount = listing.photo_urls?.length ?? 0
  const updatedDays = daysSince(listing.updated_at, now)

  if (photoCount === 0) {
    return {
      badge: 'No photos',
      tone: 'muted',
      evidence: 'No photos are on file for this listing yet.',
    }
  }

  if (!hasOwnerBackedStatus(listing) && updatedDays != null && updatedDays > CONTACT_STALE_DAYS) {
    return {
      badge: 'Needs confirmation',
      tone: 'warning',
      evidence: `Photos came from ${getSourceLabel(listing.source)} and may be outdated.`,
    }
  }

  if (listing.status === 'verified') {
    return {
      badge: 'Owner verified',
      tone: 'verified',
      evidence: 'Photos appear on an owner-verified listing. Per-photo source tracking is not available yet.',
    }
  }

  if (listing.status === 'claimed') {
    return {
      badge: 'Claimed listing',
      tone: 'claimed',
      evidence: 'Owner claimed this listing, but we do not track whether each photo was added by the owner or came from public sources.',
    }
  }

  if (isOwnerSubmitted(listing)) {
    return {
      badge: 'Owner submitted',
      tone: 'claimed',
      evidence: 'Photos came from the business submission.',
    }
  }

  return {
    badge: 'Public source',
    tone: 'public',
    evidence: `Photos came from ${getSourceLabel(listing.source)}.`,
  }
}

function buildMenuTrust(listing: DirectoryListingTrustInput, now: Date): DirectoryFieldTrust | null {
  if (!listing.menu_url) return null

  const updatedDays = daysSince(listing.updated_at, now)

  if (!hasOwnerBackedStatus(listing) && updatedDays != null && updatedDays > MENU_STALE_DAYS) {
    return {
      badge: 'Needs confirmation',
      tone: 'warning',
      evidence: `Public menu link hidden because this listing was last refreshed ${formatDateSafe(listing.updated_at)}.`,
      suppress: true,
    }
  }

  if (listing.status === 'verified') {
    return {
      badge: 'Owner verified',
      tone: 'verified',
      evidence: 'Menu link appears on an owner-verified listing. Field-level edit tracking is not available yet.',
    }
  }

  if (listing.status === 'claimed') {
    return {
      badge: 'Claimed listing',
      tone: 'claimed',
      evidence: 'Owner claimed this listing, but we do not know whether the menu link was updated after claim.',
    }
  }

  if (isOwnerSubmitted(listing)) {
    return {
      badge: 'Owner submitted',
      tone: 'claimed',
      evidence: 'Menu link came from the business submission.',
    }
  }

  return {
    badge: 'Public source',
    tone: 'public',
    evidence: `Menu link came from ${getSourceLabel(listing.source)}.`,
  }
}

function buildContactTrust(
  listing: DirectoryListingTrustInput,
  now: Date
): DirectoryFieldTrust | null {
  if (!listing.phone && !listing.email && !listing.website_url) {
    return null
  }

  const updatedDays = daysSince(listing.updated_at, now)

  if (updatedDays != null && updatedDays > CONTACT_STALE_DAYS && listing.status !== 'verified') {
    if (listing.status === 'claimed') {
      return {
        badge: 'Needs confirmation',
        tone: 'warning',
        evidence: `Claimed listing, but this profile was last updated ${formatDateSafe(listing.updated_at)}. Confirm phone, email, or website before relying on them.`,
      }
    }

    if (isOwnerSubmitted(listing)) {
      return {
        badge: 'Needs confirmation',
        tone: 'warning',
        evidence: `Submitted by the business owner, but this profile was last updated ${formatDateSafe(listing.updated_at)}. Confirm contact details before relying on them.`,
      }
    }

    return {
      badge: 'Needs confirmation',
      tone: 'warning',
      evidence: `Public contact info was last refreshed ${formatDateSafe(listing.updated_at)}. Confirm before relying on it.`,
    }
  }

  if (listing.status === 'verified') {
    return {
      badge: 'Owner verified',
      tone: 'verified',
      evidence: 'Contact info appears on an owner-verified listing. We do not track each contact field separately.',
    }
  }

  if (listing.status === 'claimed') {
    return {
      badge: 'Claimed listing',
      tone: 'claimed',
      evidence: 'Owner claimed this listing, but some contact fields may still reflect public data.',
    }
  }

  if (isOwnerSubmitted(listing)) {
    return {
      badge: 'Owner submitted',
      tone: 'claimed',
      evidence: 'Contact info came from the business submission.',
    }
  }

  return {
    badge: 'Public source',
    tone: 'public',
    evidence: `Public contact info from ${getSourceLabel(listing.source)}.`,
  }
}

function hasOwnerBackedStatus(listing: DirectoryListingTrustInput) {
  return listing.status === 'verified' || listing.status === 'claimed' || isOwnerSubmitted(listing)
}

function isOwnerSubmitted(listing: DirectoryListingTrustInput) {
  return listing.status === 'pending_submission' || listing.source === 'submission' || listing.source === 'outreach_join'
}

function getSourceLabel(source: string | null | undefined) {
  switch (source) {
    case 'openstreetmap':
      return 'OpenStreetMap'
    case 'community_nomination':
      return 'a community nomination'
    case 'submission':
    case 'outreach_join':
      return 'the business owner'
    case 'manual':
      return 'directory research'
    default:
      return 'the listing source'
  }
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

function formatDateSafe(value: string | null | undefined) {
  const parsed = parseDate(value)
  return parsed ? formatDate(parsed) : 'an unknown date'
}

function lastUpdatedSentence(value: string | null | undefined) {
  const parsed = parseDate(value)
  return parsed ? `Last listing update ${formatDate(parsed)}.` : 'Last update date unavailable.'
}
