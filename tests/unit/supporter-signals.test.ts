import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  buildPublicSupporterProofReport,
  buildSupporterSignalsReport,
  type SupporterSignalsFacts,
} from '@/lib/supporter-signals/report'

function facts(overrides: Partial<SupporterSignalsFacts> = {}): SupporterSignalsFacts {
  return {
    generatedAt: '2026-04-30T12:00:00.000Z',
    testimonials: [],
    partners: [],
    betaSignups: [],
    feedback: [],
    ...overrides,
  }
}

describe('supporter signals report', () => {
  it('keeps an empty proof inventory honest', () => {
    const report = buildSupporterSignalsReport(facts())

    assert.equal(report.publicReadySignals, 0)
    assert.equal(report.approvedProofSignals, 0)
    assert.equal(report.homepageReadiness.mode, 'empty_honest')
    assert.match(report.homepageReadiness.detail, /Built with input/)
    assert.match(report.homepageReadiness.blockedClaim, /trusted by/)
    assert.deepEqual(
      report.nextActions.map((action) => action.label),
      ['Keep homepage proof copy early-stage']
    )
  })

  it('counts only featured testimonials and showcase partners as public ready', () => {
    const report = buildSupporterSignalsReport(
      facts({
        testimonials: [
          {
            id: 'testimonial-featured',
            guest_name: 'Ava Client',
            testimonial: 'ChefFlow made the event smoother.',
            rating: 5,
            is_approved: true,
            is_featured: true,
            created_at: '2026-04-29T12:00:00.000Z',
          },
          {
            id: 'testimonial-approved',
            guest_name: 'Ben Guest',
            testimonial: 'Strong planning flow.',
            rating: 5,
            is_approved: true,
            is_featured: false,
            created_at: '2026-04-28T12:00:00.000Z',
          },
        ],
        partners: [
          {
            id: 'partner-public',
            name: 'Venue Partner',
            partner_type: 'venue',
            status: 'active',
            contact_name: null,
            is_showcase_visible: true,
            created_at: '2026-04-27T12:00:00.000Z',
          },
          {
            id: 'partner-private',
            name: 'Farm Partner',
            partner_type: 'farm',
            status: 'active',
            contact_name: null,
            is_showcase_visible: false,
            created_at: '2026-04-26T12:00:00.000Z',
          },
        ],
      })
    )

    assert.equal(report.publicReadySignals, 2)
    assert.equal(report.approvedProofSignals, 3)
    assert.equal(report.permissionCandidateSignals, 2)
    assert.equal(report.homepageReadiness.mode, 'mixed_ready')
    assert.equal(
      report.homepageReadiness.safePublicClaim,
      'ChefFlow is building from permissioned operator and event evidence.'
    )
    assert.deepEqual(
      report.candidates.slice(0, 2).map((candidate) => candidate.status),
      ['public_ready', 'public_ready']
    )
    assert.deepEqual(
      report.nextActions.map((action) => action.label),
      ['Review approved testimonials for featuring', 'Ask active partners for public permission']
    )
  })

  it('treats positive feedback and beta signups as permission candidates only', () => {
    const report = buildSupporterSignalsReport(
      facts({
        betaSignups: [
          {
            id: 'signup-1',
            name: 'Chef Mira',
            business_name: 'Mira Events',
            status: 'invited',
            cuisine_type: 'Private dining',
            created_at: '2026-04-29T12:00:00.000Z',
          },
        ],
        feedback: [
          {
            id: 'feedback-1',
            sentiment: 'love',
            message: 'This is exactly the operating system I wanted.',
            anonymous: false,
            user_role: 'chef',
            created_at: '2026-04-30T12:00:00.000Z',
          },
        ],
      })
    )

    assert.equal(report.publicReadySignals, 0)
    assert.equal(report.permissionCandidateSignals, 2)
    assert.equal(report.privateCandidateSignals, 2)
    assert.deepEqual(
      report.nextActions.map((action) => action.label),
      ['Keep homepage proof copy early-stage', 'Convert positive feedback into permissioned proof']
    )
    assert.equal(
      report.candidates.every((candidate) => candidate.status === 'permission_candidate'),
      true
    )
  })

  it('adds a beta reference action after onboarding', () => {
    const report = buildSupporterSignalsReport(
      facts({
        betaSignups: [
          {
            id: 'signup-1',
            name: 'Chef Mira',
            business_name: 'Mira Events',
            status: 'onboarded',
            cuisine_type: 'Private dining',
            created_at: '2026-04-29T12:00:00.000Z',
          },
        ],
      })
    )

    assert.deepEqual(
      report.nextActions.map((action) => action.label),
      ['Keep homepage proof copy early-stage', 'Request beta reference permission']
    )
    assert.equal(report.candidates[0]?.status, 'private_candidate')
  })
})

describe('public supporter proof report', () => {
  it('uses honest early copy when no public proof is approved', () => {
    const report = buildPublicSupporterProofReport({
      generatedAt: '2026-04-30T12:00:00.000Z',
      featuredTestimonials: [],
      publicPartners: [],
    })

    assert.equal(report.status, 'early')
    assert.equal(report.items.length, 0)
    assert.match(report.detail, /before publishing names/)
    assert.equal(report.safePublicClaim, 'Built with input from culinary operators.')
  })

  it('publishes only featured testimonials and showcase partners', () => {
    const report = buildPublicSupporterProofReport({
      generatedAt: '2026-04-30T12:00:00.000Z',
      featuredTestimonials: [
        {
          id: 'testimonial-1',
          guest_name: 'Ava Client',
          testimonial: 'ChefFlow kept every planning detail visible.',
        },
      ],
      publicPartners: [
        {
          id: 'partner-1',
          name: 'Venue Partner',
          partner_type: 'venue',
        },
      ],
    })

    assert.equal(report.status, 'ready')
    assert.equal(report.items.length, 2)
    assert.deepEqual(
      report.items.map((item) => item.kind),
      ['quote', 'partner']
    )
    assert.equal(
      report.safePublicClaim,
      'ChefFlow is building from permissioned operator and event evidence.'
    )
  })

  it('does not render fake proof when public data is unavailable', () => {
    const report = buildPublicSupporterProofReport({
      generatedAt: '2026-04-30T12:00:00.000Z',
      featuredTestimonials: [],
      publicPartners: [],
      unavailable: true,
    })

    assert.equal(report.status, 'unavailable')
    assert.equal(report.items.length, 0)
    assert.match(report.detail, /approval records are available/)
  })
})
