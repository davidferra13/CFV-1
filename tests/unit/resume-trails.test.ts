import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import {
  dedupeResumeTrails,
  deriveResumeTrail,
  deriveResumeTrails,
  hasResumeTrails,
} from '@/lib/resume-trails'
import type { ResumeTrail } from '@/lib/resume-trails'

const NOW = new Date('2026-05-15T17:30:00.000Z')

describe('resume trails', () => {
  it('derives a rich trail from existing ResumeItem-shaped data', () => {
    const trail = deriveResumeTrail(
      {
        id: 'quote-1',
        type: 'quote',
        title: 'Graduation dinner quote',
        subtitle: 'Maya Chen | $2,800',
        status: 'draft',
        lastActionAt: '2026-05-15T16:00:00.000Z',
        href: '/pipeline/quotes/quote-1',
        context: { next_action: 'Finish quote totals' },
      },
      NOW
    )

    assert.ok(trail)
    assert.equal(trail.id, 'quote:quote-1')
    assert.equal(trail.source.kind, 'quote')
    assert.equal(trail.lastAction, 'Last saved quote')
    assert.equal(trail.nextAction, 'Finish quote totals')
    assert.equal(trail.nextActionKind, 'complete')
    assert.equal(trail.route, '/pipeline/quotes/quote-1')
    assert.equal(trail.evidenceLabel, 'user_entered')
    assert.equal(trail.timestamp, '2026-05-15T16:00:00.000Z')
    assert.equal(typeof trail.rank, 'number')
  })

  it('suppresses trails that would create false certainty', () => {
    assert.equal(
      deriveResumeTrail(
        {
          id: 'menu-1',
          type: 'menu',
          title: 'No timestamp menu',
          href: '/culinary/menus/menu-1',
        },
        NOW
      ),
      null
    )

    assert.equal(
      deriveResumeTrail(
        {
          id: 'menu-2',
          type: 'menu',
          title: 'No route menu',
          lastActionAt: '2026-05-15T16:00:00.000Z',
        },
        NOW
      ),
      null
    )
  })

  it('ranks actionable commercial work ahead of weaker recent notes', () => {
    const trails = deriveResumeTrails(
      [
        {
          id: 'note-1',
          type: 'note',
          title: 'Pinned note on Maya',
          subtitle: 'Client likes family-style service.',
          status: 'preference',
          lastActionAt: '2026-05-15T17:00:00.000Z',
          href: '/clients/client-1',
        },
        {
          id: 'inquiry-1',
          type: 'inquiry',
          title: 'Inquiry from Kai',
          subtitle: 'via email',
          status: 'awaiting_chef',
          lastActionAt: '2026-05-15T12:00:00.000Z',
          href: '/pipeline/inquiries/inquiry-1',
          context: { next_action: 'Reply with availability' },
        },
      ],
      { now: NOW }
    )

    assert.equal(trails[0]?.id, 'inquiry:inquiry-1')
    assert.equal(trails[0]?.nextActionKind, 'follow_up')
    assert.equal(trails[1]?.id, 'note:note-1')
  })

  it('dedupes duplicate source trails by stronger evidence, then actionability', () => {
    const weak = trailFixture({
      evidenceLabel: 'computed',
      nextActionKind: 'review',
      nextAction: 'Review menu',
      timestamp: '2026-05-15T17:00:00.000Z',
    })
    const strong = trailFixture({
      evidenceLabel: 'user_entered',
      nextActionKind: 'verify',
      nextAction: 'Verify dish coverage',
      timestamp: '2026-05-15T16:00:00.000Z',
    })

    const deduped = dedupeResumeTrails([weak, strong])

    assert.equal(deduped.length, 1)
    assert.equal(deduped[0]?.nextAction, 'Verify dish coverage')
  })

  it('labels stale trails and returns quiet empty output', () => {
    const stale = deriveResumeTrail(
      {
        id: 'event-1',
        type: 'event',
        title: 'Old event setup',
        status: 'draft',
        lastActionAt: '2026-04-01T12:00:00.000Z',
        href: '/pipeline/events/event-1',
      },
      NOW
    )

    assert.equal(stale?.evidenceLabel, 'stale')
    assert.deepEqual(deriveResumeTrails([], { now: NOW }), [])
    assert.equal(hasResumeTrails([]), false)
  })
})

function trailFixture(overrides: Partial<ResumeTrail>): ResumeTrail {
  return {
    id: 'menu:menu-1',
    source: {
      id: 'menu-1',
      kind: 'menu',
      status: 'draft',
    },
    title: 'Spring menu',
    description: null,
    lastAction: 'Last saved menu',
    nextAction: 'Continue menu editing',
    nextActionKind: 'continue',
    route: '/culinary/menus/menu-1',
    evidenceLabel: 'computed',
    timestamp: '2026-05-15T15:00:00.000Z',
    rank: 0,
    ...overrides,
  }
}
