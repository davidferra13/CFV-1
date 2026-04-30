import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
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
    assert.deepEqual(
      report.candidates.slice(0, 2).map((candidate) => candidate.status),
      ['public_ready', 'public_ready']
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
    assert.equal(
      report.candidates.every((candidate) => candidate.status === 'permission_candidate'),
      true
    )
  })
})
