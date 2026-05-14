import { canonicalizeSourceUrl, stableWebResearchId } from './normalization'
import type {
  DirectoryListingCandidate,
  PublishedWebResearchDirectoryRecord,
  WebResearchEvidence,
} from './types'

const CUISINE_HINTS = [
  'italian',
  'french',
  'japanese',
  'sushi',
  'thai',
  'mexican',
  'indian',
  'mediterranean',
  'vegan',
  'bbq',
  'seafood',
  'bakery',
]

function inferBusinessType(
  evidence: WebResearchEvidence[]
): DirectoryListingCandidate['businessType'] {
  const text = evidence
    .map((item) => `${item.title} ${item.snippet}`)
    .join(' ')
    .toLowerCase()
  if (text.includes('private chef')) return 'private_chef'
  if (text.includes('cater')) return 'caterer'
  if (text.includes('venue')) return 'venue'
  if (text.includes('restaurant') || text.includes('menu') || text.includes('bistro'))
    return 'restaurant'
  return 'unknown'
}

function inferCuisineHints(evidence: WebResearchEvidence[]) {
  const text = evidence
    .map((item) => `${item.title} ${item.snippet}`)
    .join(' ')
    .toLowerCase()
  return CUISINE_HINTS.filter((hint) => text.includes(hint))
}

function inferName(evidence: WebResearchEvidence[]) {
  const first = evidence[0]
  if (!first) return 'Unknown listing'
  return first.title
    .replace(/\s+[-|].*$/, '')
    .replace(/\b(public restaurant profile|menu)\b/gi, '')
    .trim()
}

function bestWebsite(evidence: WebResearchEvidence[]) {
  const official = evidence.find((item) => item.sourceType === 'official_site')
  return (official ?? evidence[0])?.canonicalUrl
}

export function buildDirectoryCandidateFromEvidence(params: {
  evidence: WebResearchEvidence[]
  existingCanonicalUrls?: string[]
  city?: string
  state?: string
}): DirectoryListingCandidate | null {
  const evidence = params.evidence.filter((item) => item.usageScope === 'public_browse_candidate')
  if (evidence.length === 0) return null

  const websiteUrl = bestWebsite(evidence)
  const canonicalWebsite = websiteUrl ? canonicalizeSourceUrl(websiteUrl) : undefined
  const existingUrls = new Set((params.existingCanonicalUrls ?? []).map(canonicalizeSourceUrl))
  const duplicateOf =
    canonicalWebsite && existingUrls.has(canonicalWebsite) ? canonicalWebsite : undefined
  const confidence = Math.min(
    0.95,
    evidence.reduce((sum, item) => sum + item.confidence, 0) / evidence.length
  )
  const status = duplicateOf ? 'merged' : confidence >= 0.7 ? 'needs_review' : 'candidate'

  return {
    id: stableWebResearchId('directory-candidate', [
      inferName(evidence),
      canonicalWebsite,
      params.city,
      params.state,
    ]),
    status,
    name: inferName(evidence),
    businessType: inferBusinessType(evidence),
    city: params.city,
    state: params.state,
    websiteUrl: canonicalWebsite,
    cuisineHints: inferCuisineHints(evidence),
    sourceEvidenceIds: evidence.map((item) => item.id),
    confidence,
    freshness: evidence.some((item) => item.freshness === 'fresh')
      ? 'fresh'
      : evidence[0].freshness,
    retrievedAt: evidence[0].retrievedAt,
    fieldProvenance: {
      name: [evidence[0].id],
      websiteUrl: websiteUrl
        ? [evidence.find((item) => item.canonicalUrl === websiteUrl)?.id ?? evidence[0].id]
        : [],
      cuisineHints: evidence.map((item) => item.id),
      businessType: evidence.map((item) => item.id),
    },
    reviewRequired: true,
    publishable: false,
    duplicateOf,
    publicSourceLabel: 'Public web research',
  }
}

export function publishReviewedDirectoryCandidate(candidate: DirectoryListingCandidate) {
  if (candidate.status !== 'reviewed') {
    return {
      ok: false,
      candidate,
      reason: 'Candidate must be reviewed before publication.',
    }
  }
  if (candidate.duplicateOf) {
    return {
      ok: false,
      candidate,
      reason:
        'Candidate must be merged instead of published because it matches an existing listing.',
    }
  }
  if (candidate.confidence < 0.7 || candidate.sourceEvidenceIds.length === 0) {
    return {
      ok: false,
      candidate,
      reason: 'Candidate lacks enough source-backed confidence for publication.',
    }
  }
  return {
    ok: true,
    candidate: {
      ...candidate,
      status: 'published' as const,
      publishable: true,
      reviewRequired: false,
    },
  }
}

export function publicBrowseCandidates(candidates: DirectoryListingCandidate[]) {
  return candidates.filter((candidate) => candidate.status === 'published' && candidate.publishable)
}

export function buildPublishedBrowseRecord(
  candidate: DirectoryListingCandidate
): PublishedWebResearchDirectoryRecord | null {
  if (candidate.status !== 'published' || !candidate.publishable) return null

  return {
    id: candidate.id,
    name: candidate.name,
    businessType: candidate.businessType,
    city: candidate.city,
    state: candidate.state,
    websiteUrl: candidate.websiteUrl,
    cuisineHints: candidate.cuisineHints,
    sourceLabel: candidate.publicSourceLabel ?? 'Public web research',
    sourceEvidenceIds: candidate.sourceEvidenceIds,
    retrievedAt: candidate.retrievedAt,
    freshness: candidate.freshness,
    confidence: candidate.confidence,
    publishedListingSlug: candidate.publishedListingSlug,
  }
}

export function buildDirectoryListingCreateInput(candidate: DirectoryListingCandidate) {
  return {
    name: candidate.name,
    businessType: candidate.businessType === 'unknown' ? 'restaurant' : candidate.businessType,
    city: candidate.city,
    state: candidate.state,
    cuisineTypes: candidate.cuisineHints,
    websiteUrl: candidate.websiteUrl,
    source: 'web_research',
  }
}
