export type WebResearchProviderId = 'mock' | 'google-custom-search' | 'disabled'

export type WebResearchJobType =
  | 'competitor_scan'
  | 'seo_query_check'
  | 'supplier_lookup'
  | 'ingredient_lookup'
  | 'chef_profile_research'
  | 'venue_client_public_research'
  | 'local_market_demand'
  | 'menu_service_trend'
  | 'source_freshness_recheck'
  | 'citation_refresh'
  | 'pie_supplier_research'
  | 'restaurant_browse_candidate_discovery'
  | 'restaurant_profile_enrichment'
  | 'public_listing_verification'

export type WebResearchUsageScope =
  | 'remy_answer'
  | 'admin_review'
  | 'public_browse_candidate'
  | 'seo_audit'
  | 'pricing_research'
  | 'supplier_research'

export type WebResearchReviewStatus =
  | 'unreviewed'
  | 'needs_review'
  | 'reviewed'
  | 'saved'
  | 'rejected'
  | 'expired'

export type WebResearchJobStatus =
  | 'draft'
  | 'queued'
  | 'running'
  | 'completed'
  | 'failed'
  | 'partially_completed'
  | 'expired'

export type DirectoryCandidateStatus =
  | 'candidate'
  | 'needs_review'
  | 'reviewed'
  | 'published'
  | 'rejected'
  | 'stale'
  | 'merged'
  | 'blocked_by_policy'

export type WebResearchRole = 'admin' | 'chef' | 'client' | 'guest' | 'anonymous' | 'remy'

export type WebResearchSourceType =
  | 'official_site'
  | 'directory'
  | 'menu'
  | 'social_profile'
  | 'search_result'
  | 'unknown'

export type WebResearchRequest = {
  jobType: WebResearchJobType
  query: string
  locale?: string
  geo?: string
  maxResults?: number
  usageScope: WebResearchUsageScope
  requestedBy: WebResearchRole
  now?: Date
}

export type WebResearchProviderResult = {
  providerResultId?: string
  title: string
  snippet?: string
  sourceUrl: string
  displayUrl?: string
  rank: number
  publishedAt?: string | null
}

export type WebResearchEvidence = {
  id: string
  tenantId?: string
  jobId: string
  query: string
  provider: WebResearchProviderId
  providerResultId?: string
  sourceUrl: string
  canonicalUrl: string
  title: string
  snippet: string
  displayUrl?: string
  rank: number
  retrievedAt: string
  publishedAt?: string | null
  locale?: string
  geo?: string
  sourceType: WebResearchSourceType
  confidence: number
  freshness: 'fresh' | 'stale' | 'historical'
  usageScope: WebResearchUsageScope
  retentionExpiresAt: string
  robotsOrTermsNotes?: string
  attributionRequired: boolean
  rawPayloadRef?: string
  reviewStatus: WebResearchReviewStatus
}

export type WebResearchJob = {
  id: string
  tenantId?: string
  type: WebResearchJobType
  query: string
  provider: WebResearchProviderId
  status: WebResearchJobStatus
  createdAt: string
  completedAt?: string
  error?: string
  requestedBy?: WebResearchRole
  usageScope?: WebResearchUsageScope
  evidence: WebResearchEvidence[]
}

export type EvidenceClaim = {
  id: string
  text: string
  evidenceIds: string[]
  confidence: number
}

export type Citation = {
  evidenceId: string
  label: string
  sourceUrl: string
  retrievedAt: string
}

export type WebResearchAuditEvent = {
  id: string
  jobId?: string
  candidateId?: string
  actorRole: WebResearchRole
  type:
    | 'job_created'
    | 'job_failed'
    | 'evidence_saved'
    | 'candidate_created'
    | 'candidate_reviewed'
    | 'candidate_rejected'
    | 'candidate_published'
    | 'candidate_publish_failed'
  message: string
  createdAt: string
}

export type DirectoryListingCandidate = {
  id: string
  status: DirectoryCandidateStatus
  name: string
  businessType: 'restaurant' | 'private_chef' | 'caterer' | 'venue' | 'unknown'
  city?: string
  state?: string
  websiteUrl?: string
  cuisineHints: string[]
  sourceEvidenceIds: string[]
  confidence: number
  freshness: 'fresh' | 'stale' | 'historical'
  retrievedAt: string
  fieldProvenance?: Record<string, string[]>
  reviewRequired: boolean
  publishable: boolean
  duplicateOf?: string
  rejectionReason?: string
  publishedListingSlug?: string
  publicSourceLabel?: string
}

export type PublishedWebResearchDirectoryRecord = {
  id: string
  name: string
  businessType: DirectoryListingCandidate['businessType']
  city?: string
  state?: string
  websiteUrl?: string
  cuisineHints: string[]
  sourceLabel: string
  sourceEvidenceIds: string[]
  retrievedAt: string
  freshness: DirectoryListingCandidate['freshness']
  confidence: number
  publishedListingSlug?: string
}

export type WebResearchProviderHealth = {
  provider: WebResearchProviderId
  enabled: boolean
  configured: boolean
  credentialStatus: 'configured' | 'missing' | 'not_required'
  message: string
}

export type WebResearchProvider = {
  id: WebResearchProviderId
  displayName: string
  requiresAttribution: boolean
  supportedJobTypes: WebResearchJobType[]
  maxResults: number
  cacheTtlMs: number
  healthcheck(): Promise<WebResearchProviderHealth>
  search(request: WebResearchRequest): Promise<WebResearchProviderResult[]>
}

export type WebResearchAdminDashboard = {
  providers: WebResearchProviderHealth[]
  jobs: WebResearchJob[]
  candidates: DirectoryListingCandidate[]
  publishedRecords: PublishedWebResearchDirectoryRecord[]
  auditEvents: WebResearchAuditEvent[]
}
