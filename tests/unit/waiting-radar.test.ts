import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import {
  collectActionCenterWaitingItems,
  collectOperatingLoopWaitingItems,
  collectPaymentWaitingItems,
  collectSystemWaitingItems,
  collectVendorWaitingItems,
  collectWaitingRadar,
} from '@/lib/waiting-radar/collect'
import { rankWaitingRadarItems } from '@/lib/waiting-radar/rank'
import type { UnifiedActionItem } from '@/lib/action-center/types'
import type { OperatingLoopItem } from '@/lib/operating-loop/types'
import type { WaitingRadarItem } from '@/lib/waiting-radar/types'

const NOW = new Date('2026-05-15T17:30:00.000Z')

describe('waiting radar collectors', () => {
  it('collects action-center waiting items with canonical proof links', () => {
    const items = collectActionCenterWaitingItems(
      [
        actionItem({
          id: 'notification:quote-1',
          source: 'notification',
          sourceId: 'quote-1',
          title: 'Quote follow-up due',
          description: 'Client has not replied to the quote.',
          priority: 'high',
          dueAt: '2026-05-15T16:00:00.000Z',
          actionUrl: '/clients/client-1/relationship',
          metadata: {
            waitingOn: 'client',
            waitingReason: 'Client reply needed before the quote expires',
            followUpAt: '2026-05-15T16:00:00.000Z',
          },
        }),
        actionItem({
          id: 'task:done-1',
          source: 'task',
          sourceId: 'done-1',
          title: 'Completed task',
          status: 'completed',
          metadata: { waitingOn: 'client' },
        }),
      ],
      { now: NOW }
    )

    assert.equal(items.length, 1)
    assert.equal(items[0]?.sourceKind, 'notification')
    assert.equal(items[0]?.waitingOn, 'client')
    assert.equal(items[0]?.waitingReason, 'Client reply needed before the quote expires')
    assert.equal(items[0]?.followUpAt, '2026-05-15T16:00:00.000Z')
    assert.equal(items[0]?.proofHref, '/clients/client-1/relationship')
    assert.equal(items[0]?.riskLevel, 'high')
  })

  it('collects operating-loop waiting state without mutating source work', () => {
    const items = collectOperatingLoopWaitingItems([loopItem()])

    assert.equal(items.length, 1)
    assert.equal(items[0]?.sourceKind, 'event')
    assert.equal(items[0]?.waitingOn, 'client')
    assert.equal(items[0]?.waitingReason, 'Client approval')
    assert.equal(items[0]?.followUpAt, '2026-05-16T09:00:00.000Z')
    assert.equal(items[0]?.proofHref, '/events/event-1/menu-approval')
  })

  it('turns waiting without follow-up into an explicit contract risk', () => {
    const items = collectOperatingLoopWaitingItems(
      [
        loopItem({
          id: 'loop-missing-follow-up',
          waitingOn: {
            kind: 'reply',
            label: 'Client approval',
            followUpAt: null,
          },
        }),
      ],
      { now: NOW }
    )

    assert.equal(items.length, 1)
    assert.equal(items[0]?.followUpAt, null)
    assert.equal(items[0]?.riskLevel, 'medium')
    assert.match(items[0]?.waitingReason ?? '', /^Set follow-up:/)
    assert.equal(items[0]?.metadata.operatingLoopContract, 'missing_follow_up')
  })

  it('suppresses snoozed work until the quiet period is due soon', () => {
    const hidden = collectOperatingLoopWaitingItems(
      [
        loopItem({
          id: 'loop-snoozed-later',
          loopState: 'snoozed',
          waitingOn: {
            kind: 'time',
            label: 'Quiet period',
            followUpAt: '2026-05-20T09:00:00.000Z',
          },
        }),
      ],
      { now: NOW, dueSoonHours: 24 }
    )
    const visible = collectOperatingLoopWaitingItems(
      [
        loopItem({
          id: 'loop-snoozed-soon',
          loopState: 'snoozed',
          waitingOn: {
            kind: 'time',
            label: 'Quiet period',
            followUpAt: '2026-05-16T09:00:00.000Z',
          },
        }),
      ],
      { now: NOW, dueSoonHours: 24 }
    )

    assert.equal(hidden.length, 0)
    assert.equal(visible.length, 1)
    assert.equal(visible[0]?.waitingOn, 'time')
  })

  it('collects explicit payment, vendor, and system source shapes', () => {
    const payments = collectPaymentWaitingItems(
      [
        {
          id: 'pay-1',
          clientName: 'Maya Chen',
          status: 'awaiting_payment',
          outstandingCents: 42500,
          followUpAt: '2026-05-14T09:00:00.000Z',
          href: '/events/event-1/billing',
        },
      ],
      { now: NOW }
    )
    const vendors = collectVendorWaitingItems(
      [
        {
          id: 'vendor-1',
          vendorName: 'Farm Co-op',
          status: 'pending_quote',
          neededBy: '2026-05-17T09:00:00.000Z',
          route: '/culinary/vendors/vendor-1',
        },
      ],
      { now: NOW }
    )
    const systems = collectSystemWaitingItems(
      [
        {
          id: 'job-1',
          jobName: 'Inbox sync',
          status: 'running',
          followUpAt: '2026-05-15T18:30:00.000Z',
          proofHref: '/settings/integrations',
        },
      ],
      { now: NOW }
    )

    assert.equal(payments[0]?.sourceKind, 'payment')
    assert.equal(payments[0]?.waitingOn, 'payment')
    assert.equal(payments[0]?.proofHref, '/events/event-1/billing')
    assert.equal(payments[0]?.riskLevel, 'critical')

    assert.equal(vendors[0]?.sourceKind, 'vendor')
    assert.equal(vendors[0]?.waitingOn, 'vendor')
    assert.equal(vendors[0]?.proofHref, '/culinary/vendors/vendor-1')

    assert.equal(systems[0]?.sourceKind, 'system')
    assert.equal(systems[0]?.waitingOn, 'system')
    assert.equal(systems[0]?.proofHref, '/settings/integrations')
  })

  it('ranks overdue and high-risk waiting ahead of normal future follow-ups', () => {
    const ranked = rankWaitingRadarItems(
      [
        waitingItem('vendor-1', 'vendor', 'medium', '2026-05-17T09:00:00.000Z'),
        waitingItem('payment-1', 'payment', 'high', '2026-05-14T09:00:00.000Z'),
        waitingItem('system-1', 'system', 'low', null),
      ],
      { now: NOW }
    )

    assert.equal(ranked[0]?.id, 'payment-1')
    assert.equal(ranked[1]?.id, 'vendor-1')
    assert.equal(ranked[2]?.id, 'system-1')
  })

  it('summarizes empty states separately for no source data and no waiting items', () => {
    const noSource = collectWaitingRadar({}, { now: NOW })
    const noWaiting = collectWaitingRadar(
      {
        actionCenterItems: [
          actionItem({
            id: 'task:done-1',
            source: 'task',
            sourceId: 'done-1',
            title: 'Completed task',
            status: 'completed',
            metadata: { waitingOn: 'client' },
          }),
        ],
      },
      { now: NOW }
    )

    assert.equal(noSource.summary.emptyReason, 'no_source_data')
    assert.equal(noWaiting.summary.emptyReason, 'no_waiting_items')
  })

  it('summarizes missing follow-up as first-class waiting pressure', () => {
    const radar = collectWaitingRadar(
      {
        operatingLoopItems: [
          loopItem({
            id: 'loop-missing-follow-up',
            waitingOn: { kind: 'reply', label: 'Client approval', followUpAt: null },
          }),
        ],
      },
      { now: NOW }
    )

    assert.equal(radar.summary.total, 1)
    assert.equal(radar.summary.noFollowUp, 1)
  })
})

function actionItem(overrides: Partial<UnifiedActionItem>): UnifiedActionItem {
  return {
    id: 'task:1',
    source: 'task',
    sourceId: '1',
    title: 'Follow up',
    description: null,
    priority: 'medium',
    status: 'pending',
    createdAt: '2026-05-15T12:00:00.000Z',
    dueAt: null,
    snoozedUntil: null,
    eventId: null,
    clientId: null,
    inquiryId: null,
    actionUrl: null,
    metadata: {},
    linkedTaskId: null,
    linkedNotificationId: null,
    ...overrides,
  }
}

function waitingItem(
  id: string,
  sourceKind: WaitingRadarItem['sourceKind'],
  riskLevel: WaitingRadarItem['riskLevel'],
  followUpAt: string | null
): WaitingRadarItem {
  return {
    id,
    sourceId: id,
    sourceKind,
    title: id,
    description: null,
    waitingOn: 'system',
    waitingReason: 'Waiting',
    followUpAt,
    proofHref: `/${id}`,
    riskLevel,
    createdAt: '2026-05-15T12:00:00.000Z',
    waitingSince: '2026-05-15T12:00:00.000Z',
    metadata: {},
  }
}

function loopItem(overrides: Partial<OperatingLoopItem> = {}): OperatingLoopItem {
  return {
    id: 'loop-1',
    sourceId: 'event-1',
    sourceKind: 'event',
    loopState: 'waiting',
    evidenceLabel: 'confirmed',
    confidence: 1,
    title: 'Menu approval',
    description: 'Menu sent to client.',
    nextAction: 'Follow up on approval',
    waitingOn: {
      kind: 'reply',
      label: 'Client approval',
      followUpAt: '2026-05-16T09:00:00.000Z',
    },
    resumeContext: {
      lastAction: 'Sent menu',
      timestamp: '2026-05-14T12:00:00.000Z',
      sourceRoute: '/events/event-1/menu-approval',
      nextStep: 'Follow up',
    },
    proofHref: '/events/event-1/menu-approval',
    sourceRoute: '/events/event-1',
    createdAt: '2026-05-14T12:00:00.000Z',
    dueAt: null,
    ...overrides,
  }
}
