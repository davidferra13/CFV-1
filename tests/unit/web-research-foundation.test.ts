import assert from 'node:assert/strict'
import test from 'node:test'
import {
  answerWebResearchQuestionWithCitations,
  buildDirectoryListingCreateInput,
  buildCitations,
  buildDirectoryCandidateFromEvidence,
  buildPublishedBrowseRecord,
  canCreateWebResearchJob,
  canPublishDirectoryCandidate,
  claimHasRequiredCitation,
  createMockWebResearchProvider,
  getPublishedWebResearchDirectoryRecords,
  markDirectoryListingCandidatePublished,
  publicBrowseCandidates,
  publishReviewedDirectoryCandidate,
  resetWebResearchStoreForTests,
  reviewDirectoryListingCandidate,
  runWebResearchJob,
  sanitizeWebResearchQuery,
  saveDirectoryListingCandidate,
} from '@/lib/web-research'
import { API_SKIP_AUTH_PREFIXES } from '@/lib/auth/route-policy'

const now = new Date('2026-05-14T00:00:00.000Z')

test('mock provider creates source-backed evidence without live credentials', async () => {
  const provider = createMockWebResearchProvider()
  const job = await runWebResearchJob({
    provider,
    now,
    request: {
      jobType: 'restaurant_browse_candidate_discovery',
      query: 'Boston restaurant chef',
      usageScope: 'public_browse_candidate',
      requestedBy: 'admin',
      maxResults: 2,
    },
  })

  assert.equal(job.status, 'completed')
  assert.equal(job.provider, 'mock')
  assert.equal(job.evidence.length, 2)
  assert.equal(job.evidence[0].reviewStatus, 'needs_review')
  assert.equal(job.evidence[0].usageScope, 'public_browse_candidate')
  assert.match(job.evidence[0].sourceUrl, /^https:\/\//)
})

test('role policy blocks public users from creating browse discovery jobs', () => {
  assert.equal(canCreateWebResearchJob('admin', 'restaurant_browse_candidate_discovery'), true)
  assert.equal(canCreateWebResearchJob('chef', 'restaurant_profile_enrichment'), true)
  assert.equal(canCreateWebResearchJob('client', 'restaurant_browse_candidate_discovery'), false)
  assert.equal(canCreateWebResearchJob('anonymous', 'seo_query_check'), false)
})

test('query sanitizer redacts secrets and emails before provider use', () => {
  const query = sanitizeWebResearchQuery(
    'find chef david@example.com with key AIzaSyA123456789012345678901234567890'
  )

  assert.equal(query.includes('david@example.com'), false)
  assert.equal(query.includes('AIzaSyA123456789012345678901234567890'), false)
  assert.match(query, /\[redacted-email\]/)
  assert.match(query, /\[redacted-secret\]/)
})

test('claims require citations from available evidence', async () => {
  const job = await runWebResearchJob({
    provider: createMockWebResearchProvider(),
    now,
    request: {
      jobType: 'chef_profile_research',
      query: 'Blue Door Bistro chef',
      usageScope: 'remy_answer',
      requestedBy: 'admin',
      maxResults: 1,
    },
  })
  const citations = buildCitations(job.evidence)

  assert.equal(citations.length, 1)
  assert.equal(
    claimHasRequiredCitation(
      {
        id: 'claim-1',
        text: 'Blue Door Bistro appears in public search.',
        evidenceIds: [job.evidence[0].id],
        confidence: 0.8,
      },
      job.evidence
    ),
    true
  )
  assert.equal(
    claimHasRequiredCitation(
      { id: 'claim-2', text: 'Uncited claim.', evidenceIds: [], confidence: 0.8 },
      job.evidence
    ),
    false
  )
})

test('directory candidates require review before public browse', async () => {
  const job = await runWebResearchJob({
    provider: createMockWebResearchProvider(),
    now,
    request: {
      jobType: 'restaurant_browse_candidate_discovery',
      query: 'Blue Door Bistro Boston',
      usageScope: 'public_browse_candidate',
      requestedBy: 'admin',
      maxResults: 2,
    },
  })

  const candidate = buildDirectoryCandidateFromEvidence({
    evidence: job.evidence,
    city: 'Boston',
    state: 'MA',
  })

  assert.ok(candidate)
  assert.equal(candidate.status, 'needs_review')
  assert.equal(publicBrowseCandidates([candidate]).length, 0)
  assert.equal(
    canPublishDirectoryCandidate('chef', { ...candidate, status: 'reviewed', publishable: true }),
    false
  )

  const published = publishReviewedDirectoryCandidate({
    ...candidate,
    status: 'reviewed',
    publishable: true,
  })
  assert.equal(published.ok, true)
  assert.equal(publicBrowseCandidates([published.candidate]).length, 1)
})

test('candidate dedupe prevents direct publication when source matches an existing listing', async () => {
  const job = await runWebResearchJob({
    provider: createMockWebResearchProvider(),
    now,
    request: {
      jobType: 'restaurant_browse_candidate_discovery',
      query: 'Blue Door Bistro Boston',
      usageScope: 'public_browse_candidate',
      requestedBy: 'admin',
      maxResults: 1,
    },
  })

  const candidate = buildDirectoryCandidateFromEvidence({
    evidence: job.evidence,
    existingCanonicalUrls: ['https://example.com/restaurants/blue-door-bistro'],
  })

  assert.ok(candidate)
  assert.equal(candidate.status, 'merged')
  assert.ok(candidate.duplicateOf)
  assert.equal(publishReviewedDirectoryCandidate({ ...candidate, status: 'reviewed' }).ok, false)
})

test('web research store supports review, publication, and public browse records', async () => {
  resetWebResearchStoreForTests()
  const job = await runWebResearchJob({
    provider: createMockWebResearchProvider(),
    now,
    request: {
      jobType: 'restaurant_browse_candidate_discovery',
      query: 'Blue Door Bistro Boston',
      usageScope: 'public_browse_candidate',
      requestedBy: 'admin',
      maxResults: 1,
    },
  })
  const candidate = buildDirectoryCandidateFromEvidence({
    evidence: job.evidence,
    city: 'Boston',
    state: 'MA',
  })

  assert.ok(candidate)
  saveDirectoryListingCandidate(candidate)
  assert.equal(getPublishedWebResearchDirectoryRecords().length, 0)

  const reviewed = reviewDirectoryListingCandidate(candidate.id)
  assert.equal(reviewed.ok, true)

  const published = markDirectoryListingCandidatePublished({
    candidateId: candidate.id,
    slug: 'blue-door-bistro-boston',
  })
  assert.equal(published.ok, true)

  const records = getPublishedWebResearchDirectoryRecords()
  assert.equal(records.length, 1)
  assert.equal(records[0].publishedListingSlug, 'blue-door-bistro-boston')
  assert.equal(buildPublishedBrowseRecord(published.candidate)?.sourceLabel, 'Public web research')
})

test('Remy web research answer carries citations and review warning', async () => {
  const answer = await answerWebResearchQuestionWithCitations({
    question: 'Blue Door Bistro chef',
    requestedBy: 'admin',
    provider: createMockWebResearchProvider(),
    now,
  })

  assert.equal(answer.status, 'needs_review')
  assert.match(answer.answer, /Treat this as external evidence/)
  assert.ok(answer.citations.length > 0)
  assert.ok(answer.evidenceIds.length > 0)
  assert.match(answer.warnings.join(' '), /not ChefFlow truth/)
})

test('directory listing publish input keeps web research source provenance', async () => {
  const job = await runWebResearchJob({
    provider: createMockWebResearchProvider(),
    now,
    request: {
      jobType: 'restaurant_browse_candidate_discovery',
      query: 'Blue Door Bistro Boston',
      usageScope: 'public_browse_candidate',
      requestedBy: 'admin',
      maxResults: 1,
    },
  })
  const candidate = buildDirectoryCandidateFromEvidence({
    evidence: job.evidence,
    city: 'Boston',
    state: 'MA',
  })

  assert.ok(candidate)
  const input = buildDirectoryListingCreateInput(candidate)
  assert.equal(input.source, 'web_research')
  assert.equal(input.city, 'Boston')
  assert.equal(input.businessType, 'restaurant')
})

test('only web research health bypasses API auth', () => {
  assert.equal(API_SKIP_AUTH_PREFIXES.includes('/api/web-research/health'), true)
  assert.equal((API_SKIP_AUTH_PREFIXES as readonly string[]).includes('/api/web-research'), false)
})
