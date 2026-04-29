import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { buildThreadCoordinationBrief } from '@/lib/events/thread-coordination-brief'

describe('thread coordination brief', () => {
  it('derives coordination signals from communication thread messages', () => {
    const brief = buildThreadCoordinationBrief({
      messages: [
        {
          id: 'msg-1',
          body: 'Please confirm 18 guests for tomorrow at 6pm. Venue entrance is on Pine Street. One guest has a nut allergy.',
          sent_at: '2026-04-28T14:00:00.000Z',
        },
      ],
      visibility: {
        show_date_time: true,
        show_location: true,
        show_guest_count: true,
        show_dietary_info: false,
      },
      shareExpiresAt: '2026-05-01T04:00:00.000Z',
    })

    assert.equal(brief.sourceMessageCount, 1)
    assert.equal(brief.retention.source, 'communication_thread')
    assert.equal(brief.retention.derivedPersistence, 'runtime_only')
    assert.equal(brief.retention.expiresByDesign, true)
    assert.ok(brief.signals.some((signal) => signal.kind === 'timing'))
    assert.ok(brief.signals.some((signal) => signal.kind === 'headcount'))
    assert.ok(brief.signals.some((signal) => signal.kind === 'location'))
    assert.ok(brief.signals.some((signal) => signal.kind === 'dietary'))
    assert.ok(brief.signals.some((signal) => signal.kind === 'action'))
  })

  it('compartmentalizes role views based on share visibility', () => {
    const brief = buildThreadCoordinationBrief({
      messages: [
        {
          id: 'msg-1',
          body: 'Need to confirm 12 guests at 7pm. Address is 10 Main Street. Gluten-free note for Alex.',
          sent_at: '2026-04-28T14:00:00.000Z',
        },
      ],
      visibility: {
        show_date_time: true,
        show_location: false,
        show_guest_count: false,
        show_dietary_info: false,
      },
    })

    const collaboratorView = brief.roleViews.find((view) => view.role === 'collaborator')
    const guestView = brief.roleViews.find((view) => view.role === 'guest')
    const viewerView = brief.roleViews.find((view) => view.role === 'viewer')

    assert.ok(collaboratorView)
    assert.ok(guestView)
    assert.ok(viewerView)
    assert.ok(collaboratorView.visibleSignals.some((signal) => signal.kind === 'location'))
    assert.ok(guestView.visibleSignals.some((signal) => signal.kind === 'timing'))
    assert.equal(guestView.visibleSignals.some((signal) => signal.kind === 'location'), false)
    assert.equal(guestView.visibleSignals.some((signal) => signal.kind === 'headcount'), false)
    assert.equal(guestView.visibleSignals.some((signal) => signal.kind === 'dietary'), false)
    assert.equal(viewerView.visibleSignals.some((signal) => signal.kind === 'timing'), true)
    assert.equal(viewerView.visibleSignals.some((signal) => signal.kind === 'action'), false)
  })

  it('uses the latest thread signals first', () => {
    const brief = buildThreadCoordinationBrief({
      messages: [
        {
          id: 'old-msg',
          body: 'Please arrive at 5pm.',
          sent_at: '2026-04-27T14:00:00.000Z',
        },
        {
          id: 'new-msg',
          body: 'Please arrive at 6pm instead.',
          sent_at: '2026-04-28T14:00:00.000Z',
        },
      ],
    })

    assert.equal(brief.signals[0].sourceMessageId, 'new-msg')
  })
})
