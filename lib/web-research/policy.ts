import type {
  DirectoryListingCandidate,
  EvidenceClaim,
  WebResearchEvidence,
  WebResearchJobType,
  WebResearchRequest,
  WebResearchRole,
  WebResearchUsageScope,
} from './types'

const CLIENT_BLOCKED_JOB_TYPES: WebResearchJobType[] = [
  'venue_client_public_research',
  'restaurant_browse_candidate_discovery',
  'restaurant_profile_enrichment',
  'public_listing_verification',
]

const SECRET_LIKE_PATTERNS = [
  /\bAIza[0-9A-Za-z\-_]{20,}\b/g,
  /\bsk_live_[0-9A-Za-z]{12,}\b/g,
  /\bsk_test_[0-9A-Za-z]{12,}\b/g,
  /\bGOCSPX-[0-9A-Za-z\-_]{8,}\b/g,
]

const EMAIL_PATTERN = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi

export function canCreateWebResearchJob(role: WebResearchRole, jobType: WebResearchJobType) {
  if (role === 'admin') return true
  if (role === 'chef') {
    return (
      !CLIENT_BLOCKED_JOB_TYPES.includes(jobType) || jobType === 'restaurant_profile_enrichment'
    )
  }
  if (role === 'remy') return false
  return false
}

export function sanitizeWebResearchQuery(query: string) {
  let sanitized = query.replace(/\s+/g, ' ').trim()
  for (const pattern of SECRET_LIKE_PATTERNS) {
    sanitized = sanitized.replace(pattern, '[redacted-secret]')
  }
  sanitized = sanitized.replace(EMAIL_PATTERN, '[redacted-email]')
  return sanitized.slice(0, 240)
}

export function validateWebResearchRequest(request: WebResearchRequest) {
  const sanitizedQuery = sanitizeWebResearchQuery(request.query)
  const issues: string[] = []

  if (!sanitizedQuery) issues.push('Query is required.')
  if (!canCreateWebResearchJob(request.requestedBy, request.jobType)) {
    issues.push(`${request.requestedBy} cannot run ${request.jobType}.`)
  }
  if (sanitizedQuery.includes('[redacted-secret]')) {
    issues.push('Query contained a secret-like token and was blocked.')
  }

  return {
    ok: issues.length === 0,
    sanitizedQuery,
    issues,
  }
}

export function computeEvidenceFreshness(retrievedAt: string, now = new Date()) {
  const retrieved = new Date(retrievedAt)
  if (Number.isNaN(retrieved.getTime())) return 'historical' as const
  const ageMs = now.getTime() - retrieved.getTime()
  const ageDays = ageMs / 86_400_000
  if (ageDays > 90) return 'historical' as const
  if (ageDays > 30) return 'stale' as const
  return 'fresh' as const
}

export function buildCitations(evidence: WebResearchEvidence[]) {
  return evidence.map((item, index) => ({
    evidenceId: item.id,
    label: `[${index + 1}] ${item.title}`,
    sourceUrl: item.sourceUrl,
    retrievedAt: item.retrievedAt,
  }))
}

export function claimHasRequiredCitation(claim: EvidenceClaim, evidence: WebResearchEvidence[]) {
  const evidenceIds = new Set(evidence.map((item) => item.id))
  return claim.evidenceIds.length > 0 && claim.evidenceIds.every((id) => evidenceIds.has(id))
}

export function canPromoteEvidenceToDurableKnowledge(
  role: WebResearchRole,
  evidence: WebResearchEvidence
) {
  if (role !== 'admin' && role !== 'chef') return false
  return evidence.reviewStatus === 'reviewed' || evidence.reviewStatus === 'saved'
}

export function canPublishDirectoryCandidate(
  role: WebResearchRole,
  candidate: DirectoryListingCandidate
) {
  if (role !== 'admin') return false
  if (candidate.status !== 'reviewed') return false
  if (candidate.reviewRequired && !candidate.publishable) return false
  if (candidate.duplicateOf) return false
  return candidate.confidence >= 0.7 && candidate.sourceEvidenceIds.length > 0
}

export function defaultUsageScopeForJob(jobType: WebResearchJobType): WebResearchUsageScope {
  if (jobType.includes('restaurant') || jobType.includes('listing'))
    return 'public_browse_candidate'
  if (jobType.includes('seo')) return 'seo_audit'
  if (jobType.includes('supplier') || jobType.includes('ingredient')) return 'supplier_research'
  return 'remy_answer'
}
