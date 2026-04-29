import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import {
  buildRoleInstructionText,
  buildThreadCoordinationBrief,
} from '@/lib/events/thread-coordination-brief'

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
    assert.equal(brief.retentionSummary.persist, 1)
    assert.equal(brief.retentionSummary['auto-expire'], 4)
    assert.equal(brief.retentionSummary['never-store'], 0)
    assert.equal(brief.humanIntervention.recommended, true)
    assert.equal(brief.humanIntervention.urgency, 'critical')
    assert.match(brief.humanIntervention.reason ?? '', /dietary|allergy/i)
    assert.ok(brief.humanIntervention.signalIds.some((id) => id.endsWith(':dietary')))
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

  it('builds role instruction text from only visible scoped signals', () => {
    const brief = buildThreadCoordinationBrief({
      messages: [
        {
          id: 'msg-1',
          body: 'Please confirm 14 guests at 7pm. Address is 10 Main Street. Nut allergy for one guest.',
          sent_at: '2026-04-28T14:00:00.000Z',
        },
      ],
      visibility: {
        show_date_time: true,
        show_location: false,
        show_guest_count: false,
        show_dietary_info: false,
      },
      shareExpiresAt: '2026-05-01T04:00:00.000Z',
    })

    const guestView = brief.roleViews.find((view) => view.role === 'guest')
    assert.ok(guestView)

    const text = buildRoleInstructionText({
      view: guestView,
      shareExpiresAt: brief.retention.shareExpiresAt,
    })

    assert.match(text, /Guest coordination brief/)
    assert.match(text, /Timing \(high, auto-expire\): 7pm/)
    assert.match(text, /Access expires: 2026-05-01T04:00:00.000Z/)
    assert.doesNotMatch(text, /Address/)
    assert.doesNotMatch(text, /14 guests/)
    assert.doesNotMatch(text, /Nut allergy/)
  })

  it('keeps never-store sensitive signals out of external role views', () => {
    const brief = buildThreadCoordinationBrief({
      messages: [
        {
          id: 'msg-1',
          body: "Please keep the surprise cake secret. Guests should arrive at 7pm.",
          sent_at: '2026-04-28T14:00:00.000Z',
        },
      ],
      visibility: {
        show_date_time: true,
      },
    })

    const neverStoreSignals = brief.signals.filter(
      (signal) => signal.retentionPolicy === 'never-store'
    )
    const guestView = brief.roleViews.find((view) => view.role === 'guest')
    assert.ok(guestView)

    assert.ok(neverStoreSignals.length > 0)
    assert.equal(brief.retentionSummary['never-store'], neverStoreSignals.length)
    assert.equal(brief.humanIntervention.recommended, true)
    assert.equal(brief.humanIntervention.urgency, 'critical')
    assert.deepEqual(
      brief.humanIntervention.signalIds.sort(),
      neverStoreSignals.map((signal) => signal.id).sort()
    )
    assert.equal(
      guestView.visibleSignals.some((signal) => signal.retentionPolicy === 'never-store'),
      false
    )
  })

  it('does not recommend human intervention for normal low-risk signals', () => {
    const brief = buildThreadCoordinationBrief({
      messages: [
        {
          id: 'msg-1',
          body: 'We have 18 guests for the dinner.',
          sent_at: '2026-04-28T14:00:00.000Z',
        },
      ],
      visibility: {
        show_guest_count: true,
      },
    })

    assert.equal(brief.humanIntervention.recommended, false)
    assert.equal(brief.humanIntervention.urgency, 'normal')
    assert.deepEqual(brief.humanIntervention.signalIds, [])
  })
})
