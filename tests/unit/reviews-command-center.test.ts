import assert from 'node:assert/strict'
import test from 'node:test'
import {
  assessReviewSourceUrl,
  attachDuplicateSignals,
  buildReviewAnalytics,
  buildReviewExportPack,
  deriveReviewTrustTier,
  type ReviewCommandCenterEntry,
} from '@/lib/reviews/command-center'

function entry(overrides: Partial<ReviewCommandCenterEntry> = {}): ReviewCommandCenterEntry {
  return {
    id: 'review-1',
    kind: 'logged_feedback',
    sourceKey: 'google',
    sourceLabel: 'Google',
    sourceUrl: 'https://google.com/review/1',
    reviewerName: 'Sarah M.',
    rating: 5,
    reviewText: 'Excellent dinner and thoughtful service.',
    reviewDate: '2026-05-01',
    createdAt: '2026-05-01T00:00:00.000Z',
    publicDisplay: 'public',
    responseState: 'responded',
    trustTier: 'verified_external_platform',
    linkHealth: 'valid',
    importState: 'confirmed',
    directSourceLinkLabel: 'Open on Google',
    isFeatured: false,
    duplicateGroupId: null,
    duplicateCount: 0,
    evidence: {
      provider: 'google',
      sourceUrl: 'https://google.com/review/1',
      importedAt: '2026-05-01T00:00:00.000Z',
      reviewerDisplayName: 'Sarah M.',
      hasRawPayload: true,
      publicDecision: 'public',
    },
    ...overrides,
  }
}

test('review source URL handling flags missing and unsafe platform links', () => {
  assert.equal(assessReviewSourceUrl('google', null), 'missing')
  assert.equal(assessReviewSourceUrl('email', null), 'valid')
  assert.equal(assessReviewSourceUrl('airbnb', 'not-a-url'), 'malformed')
  assert.equal(
    assessReviewSourceUrl('take_a_chef', 'http://localhost/review'),
    'private_suspicious'
  )
  assert.equal(assessReviewSourceUrl('tripadvisor', 'https://tripadvisor.com/review/1'), 'valid')
})

test('trust tiers distinguish ChefFlow events, platform proof, and chef-entered imports', () => {
  assert.equal(
    deriveReviewTrustTier({
      kind: 'client_review',
      sourceKey: 'chef_flow',
      hasVerifiedEvent: true,
    }),
    'verified_chef_flow_event'
  )
  assert.equal(
    deriveReviewTrustTier({
      kind: 'external_review',
      sourceKey: 'google',
      importState: 'confirmed',
      linkHealth: 'valid',
    }),
    'verified_external_platform'
  )
  assert.equal(
    deriveReviewTrustTier({ kind: 'logged_feedback', sourceKey: 'email', linkHealth: 'valid' }),
    'chef_entered'
  )
})

test('duplicate detection is advisory and keeps entries intact', () => {
  const reviews = attachDuplicateSignals([
    entry({ id: 'a' }),
    entry({ id: 'b', sourceKey: 'airbnb', sourceLabel: 'Airbnb' }),
    entry({ id: 'c', reviewerName: 'Other Guest' }),
  ])

  assert.equal(reviews[0].duplicateCount, 2)
  assert.equal(reviews[1].duplicateCount, 2)
  assert.equal(reviews[2].duplicateCount, 0)
})

test('analytics and export packs cover reputation operating needs', () => {
  const reviews = [
    entry(),
    entry({
      id: 'review-2',
      sourceKey: 'chef_flow',
      sourceLabel: 'ChefFlow',
      rating: 4,
      responseState: 'needs_response',
      publicDisplay: 'private',
    }),
  ]

  const analytics = buildReviewAnalytics(reviews)
  const pack = buildReviewExportPack(reviews[0])

  assert.equal(analytics.averageRating, 4.5)
  assert.equal(analytics.responseRate, 50)
  assert.equal(analytics.publicApprovalRate, 50)
  assert.equal(analytics.sourceMix.length, 2)
  assert.match(pack.website, /Excellent dinner/)
  assert.match(pack.followUpEmail, /Recent guest feedback/)
})
