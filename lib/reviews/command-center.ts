export const REVIEW_SOURCE_DEFINITIONS = {
  chef_flow: { label: 'ChefFlow', requiresUrl: false, publicLinkAllowed: false },
  manual: { label: 'Manual Entry', requiresUrl: false, publicLinkAllowed: false },
  google: { label: 'Google', requiresUrl: true, publicLinkAllowed: true },
  google_places: { label: 'Google', requiresUrl: true, publicLinkAllowed: true },
  yelp: { label: 'Yelp', requiresUrl: true, publicLinkAllowed: true },
  yelp_guest: { label: 'Yelp', requiresUrl: true, publicLinkAllowed: true },
  airbnb: { label: 'Airbnb', requiresUrl: true, publicLinkAllowed: true },
  take_a_chef: { label: 'TakeAChef', requiresUrl: true, publicLinkAllowed: true },
  tripadvisor: { label: 'TripAdvisor', requiresUrl: true, publicLinkAllowed: true },
  facebook: { label: 'Facebook', requiresUrl: true, publicLinkAllowed: true },
  thumbtack: { label: 'Thumbtack', requiresUrl: true, publicLinkAllowed: true },
  bark: { label: 'Bark', requiresUrl: true, publicLinkAllowed: true },
  gigsalad: { label: 'GigSalad', requiresUrl: true, publicLinkAllowed: true },
  taskrabbit: { label: 'TaskRabbit', requiresUrl: true, publicLinkAllowed: true },
  houzz: { label: 'Houzz', requiresUrl: true, publicLinkAllowed: true },
  angi: { label: 'Angi', requiresUrl: true, publicLinkAllowed: true },
  nextdoor: { label: 'Nextdoor', requiresUrl: true, publicLinkAllowed: true },
  instagram: { label: 'Instagram', requiresUrl: true, publicLinkAllowed: true },
  website_jsonld: { label: 'Website JSON-LD', requiresUrl: true, publicLinkAllowed: true },
  website: { label: 'Website', requiresUrl: true, publicLinkAllowed: true },
  email: { label: 'Email', requiresUrl: false, publicLinkAllowed: false },
  text_message: { label: 'Text Message', requiresUrl: false, publicLinkAllowed: false },
  verbal: { label: 'Verbal', requiresUrl: false, publicLinkAllowed: false },
  social_media: { label: 'Social Media', requiresUrl: false, publicLinkAllowed: true },
  other: { label: 'Other', requiresUrl: false, publicLinkAllowed: false },
  guest_testimonial: { label: 'Guest Testimonial', requiresUrl: false, publicLinkAllowed: false },
} as const

export type ReviewLinkHealth = 'valid' | 'missing' | 'malformed' | 'private_suspicious'
export type ReviewTrustTier =
  | 'verified_chef_flow_event'
  | 'verified_external_platform'
  | 'chef_entered'
  | 'unverified_import'
export type ReviewResponseState =
  | 'needs_response'
  | 'response_drafted'
  | 'responded'
  | 'posted_externally'
export type PublicDisplayState = 'public' | 'private' | 'pending'

export type ReviewCommandCenterEntry = {
  id: string
  kind: string
  sourceKey: string
  sourceLabel: string
  sourceUrl: string | null
  reviewerName: string
  rating: number | null
  reviewText: string
  reviewDate: string
  createdAt: string
  publicDisplay: PublicDisplayState
  responseState: ReviewResponseState
  trustTier: ReviewTrustTier
  linkHealth: ReviewLinkHealth
  importState: 'confirmed' | 'needs_review' | 'rejected'
  directSourceLinkLabel: string | null
  isFeatured: boolean
  duplicateGroupId: string | null
  duplicateCount: number
  evidence: {
    provider: string
    sourceUrl: string | null
    importedAt: string | null
    reviewerDisplayName: string
    hasRawPayload: boolean
    publicDecision: PublicDisplayState
  }
}

export function normalizeReviewSourceKey(source: string | null | undefined) {
  const value = (source || 'other').trim().toLowerCase()
  if (value === 'takeachef' || value === 'take_a_chef') return 'take_a_chef'
  if (value === 'google places' || value === 'google_places') return 'google'
  if (value === 'website_jsonld') return 'website_jsonld'
  return value.replace(/\s+/g, '_')
}

export function getReviewSourceDefinition(sourceKey: string) {
  const normalized = normalizeReviewSourceKey(sourceKey)
  return (
    REVIEW_SOURCE_DEFINITIONS[normalized as keyof typeof REVIEW_SOURCE_DEFINITIONS] ?? {
      label: sourceKey || 'Other',
      requiresUrl: false,
      publicLinkAllowed: false,
    }
  )
}

export function getReviewSourceLabel(sourceKey: string, fallback?: string | null) {
  if (fallback?.trim()) return fallback.trim()
  return getReviewSourceDefinition(sourceKey).label
}

export function assessReviewSourceUrl(sourceKey: string, sourceUrl: string | null | undefined) {
  const definition = getReviewSourceDefinition(sourceKey)
  const raw = sourceUrl?.trim()

  if (!raw) return definition.requiresUrl ? 'missing' : 'valid'

  try {
    const parsed = new URL(raw)
    const host = parsed.hostname.toLowerCase()
    const privateHost =
      host === 'localhost' ||
      host.endsWith('.local') ||
      /^10\./.test(host) ||
      /^127\./.test(host) ||
      /^192\.168\./.test(host) ||
      /^172\.(1[6-9]|2\d|3[01])\./.test(host)

    if (!['http:', 'https:'].includes(parsed.protocol) || privateHost) {
      return 'private_suspicious'
    }

    return 'valid'
  } catch {
    return 'malformed'
  }
}

export function deriveReviewTrustTier(args: {
  kind: string
  sourceKey: string
  hasVerifiedEvent?: boolean
  importState?: 'confirmed' | 'needs_review' | 'rejected'
  linkHealth?: ReviewLinkHealth
}): ReviewTrustTier {
  if (args.hasVerifiedEvent || args.kind === 'client_review' || args.kind === 'guest_testimonial') {
    return 'verified_chef_flow_event'
  }

  const definition = getReviewSourceDefinition(args.sourceKey)
  if (definition.requiresUrl && args.linkHealth === 'valid' && args.importState === 'confirmed') {
    return 'verified_external_platform'
  }

  if (args.kind === 'logged_feedback') return 'chef_entered'
  return 'unverified_import'
}

export function deriveReviewResponseState(args: {
  rating: number | null
  chefResponse?: string | null
  responseDraft?: string | null
  postedExternally?: boolean
}): ReviewResponseState {
  if (args.postedExternally) return 'posted_externally'
  if (args.chefResponse?.trim()) return 'responded'
  if (args.responseDraft?.trim()) return 'response_drafted'
  return args.rating !== null && args.rating <= 4 ? 'needs_response' : 'needs_response'
}

function fingerprintReview(entry: {
  reviewerName: string
  rating: number | null
  reviewText: string
}) {
  const reviewer = entry.reviewerName.toLowerCase().replace(/[^a-z0-9]/g, '')
  const text = entry.reviewText
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .slice(0, 96)
  return `${reviewer}:${entry.rating ?? 'na'}:${text}`
}

export function attachDuplicateSignals<T extends ReviewCommandCenterEntry>(entries: T[]): T[] {
  const groups = new Map<string, T[]>()
  for (const entry of entries) {
    const key = fingerprintReview(entry)
    const list = groups.get(key) ?? []
    list.push(entry)
    groups.set(key, list)
  }

  return entries.map((entry) => {
    const group = groups.get(fingerprintReview(entry)) ?? []
    return {
      ...entry,
      duplicateGroupId: group.length > 1 ? fingerprintReview(entry) : null,
      duplicateCount: group.length > 1 ? group.length : 0,
    }
  })
}

export function buildReviewAnalytics(entries: ReviewCommandCenterEntry[]) {
  const rated = entries.filter((entry) => typeof entry.rating === 'number')
  const responded = entries.filter((entry) =>
    ['responded', 'posted_externally'].includes(entry.responseState)
  )
  const publicEntries = entries.filter((entry) => entry.publicDisplay === 'public')
  const sourceMap = new Map<string, { count: number; ratingSum: number; ratedCount: number }>()
  const monthMap = new Map<string, number>()

  for (const entry of entries) {
    const source = sourceMap.get(entry.sourceLabel) ?? { count: 0, ratingSum: 0, ratedCount: 0 }
    source.count += 1
    if (entry.rating !== null) {
      source.ratingSum += entry.rating
      source.ratedCount += 1
    }
    sourceMap.set(entry.sourceLabel, source)

    const parsed = new Date(entry.reviewDate)
    const month = Number.isNaN(parsed.getTime())
      ? 'Unknown'
      : `${parsed.getFullYear()}-${String(parsed.getMonth() + 1).padStart(2, '0')}`
    monthMap.set(month, (monthMap.get(month) ?? 0) + 1)
  }

  return {
    averageRating:
      rated.length > 0
        ? Number(
            (rated.reduce((sum, entry) => sum + (entry.rating ?? 0), 0) / rated.length).toFixed(2)
          )
        : 0,
    responseRate: entries.length > 0 ? Math.round((responded.length / entries.length) * 100) : 0,
    publicApprovalRate:
      entries.length > 0 ? Math.round((publicEntries.length / entries.length) * 100) : 0,
    sourceMix: Array.from(sourceMap.entries())
      .map(([source, value]) => ({
        source,
        count: value.count,
        averageRating:
          value.ratedCount > 0 ? Number((value.ratingSum / value.ratedCount).toFixed(2)) : 0,
      }))
      .sort((a, b) => b.count - a.count),
    volumeByMonth: Array.from(monthMap.entries())
      .map(([month, count]) => ({ month, count }))
      .sort((a, b) => a.month.localeCompare(b.month)),
    conversion: {
      chefFlowSubmitted: entries.filter((entry) => entry.kind === 'client_review').length,
      externalClicked: entries.filter((entry) => entry.evidence.sourceUrl).length,
      externalImported: entries.filter((entry) => entry.kind === 'external_review').length,
    },
  }
}

export function buildReviewExportPack(entry: ReviewCommandCenterEntry) {
  const rating = entry.rating ? `${entry.rating}/5` : 'Unrated'
  const attribution = `${entry.reviewerName} on ${entry.sourceLabel}`
  const text = `"${entry.reviewText}"`

  return {
    website: `${text}\n- ${attribution} (${rating})`,
    mediaKit: `${entry.sourceLabel}: ${entry.reviewText} - ${entry.reviewerName}`,
    proposalProof: `${entry.reviewerName} rated the experience ${rating}: ${entry.reviewText}`,
    socialCaption: `${entry.reviewText}\n\n- ${entry.reviewerName}`,
    conciergeProof: `${attribution}: ${entry.reviewText}`,
    followUpEmail: `Recent guest feedback from ${attribution}:\n\n${entry.reviewText}`,
  }
}

export function isPublicSafeReview(entry: {
  publicDisplay: PublicDisplayState
  linkHealth: ReviewLinkHealth
  sourceKey: string
}) {
  if (entry.publicDisplay !== 'public') return false
  const definition = getReviewSourceDefinition(entry.sourceKey)
  if (!definition.publicLinkAllowed) return true
  return entry.linkHealth === 'valid'
}
