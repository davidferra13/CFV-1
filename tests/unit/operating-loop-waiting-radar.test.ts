import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import {
  collectOperatingLoopWaitingItems,
  collectPaymentWaitingItems,
  collectSystemWaitingItems,
  collectVendorWaitingItems,
  collectWaitingRadar,
  rankWaitingRadarItems,
} from '@/lib/operating-loop/waiting-radar'
import type { OperatingLoopItem } from '@/lib/operating-loop/types'
import type { WaitingRadarItem } from '@/lib/operating-loop/waiting-radar'

const NOW = new Date('2026-05-15T17:30:00.000Z')

describe('operating loop waiting radar', () => {
  it('surfaces operating-loop waiting work with canonical proof links', () => {
    const items = collectOperatingLoopWaitingItems(
      [
        loopItem({
          id: 'quote-loop-1',
          sourceId: 'quote-1',
          sourceKind: 'quote',
          loopState: 'waiting',
          title: 'Quote follow-up',
          waitingOn: {
            kind: 'reply',
            label: 'Client reply needed before quote expires',
            followUpAt: '2026-05-15T16:00:00.000Z',
          },
          proofHref: '/clients/client-1/relationship',
        }),
        loopItem({
          id: 'done-loop-1',
          sourceId: 'task-1',
          sourceKind: 'task',
          loopState: 'done',
          title: 'Completed task',
        }),
      ],
      { now: NOW }
    )

    assert.equal(items.length, 1)
    assert.equal(items[0]?.sourceKind, 'quote')
    assert.equal(items[0]?.waitingOn, 'client')
    assert.equal(items[0]?.waitingReason, 'Client reply needed before quote expires')
    assert.equal(items[0]?.followUpState, 'overdue')
    assert.equal(items[0]?.proofHref, '/clients/client-1/relationship')
    assert.equal(items[0]?.riskLevel, 'high')
  })

  it('makes missing follow-up explicit for operating-loop waiting work', () => {
    const items = collectOperatingLoopWaitingItems(
      [
        loopItem({
          id: 'quote-loop-missing-follow-up',
          sourceId: 'quote-1',
          sourceKind: 'quote',
          waitingOn: {
            kind: 'reply',
            label: 'Client reply',
            followUpAt: null,
          },
        }),
      ],
      { now: NOW }
    )

    assert.equal(items.length, 1)
    assert.equal(items[0]?.followUpState, 'no_follow_up')
    assert.equal(items[0]?.riskLevel, 'medium')
    assert.match(items[0]?.waitingReason ?? '', /^Set follow-up:/)
    assert.equal(items[0]?.metadata.operatingLoopContract, 'missing_follow_up')
  })

  it('keeps snoozed waiting work quiet until the follow-up window', () => {
    const hidden = collectOperatingLoopWaitingItems(
      [
        loopItem({
          id: 'snoozed-later',
          loopState: 'snoozed',
          waitingOn: {
            kind: 'time',
            label: 'Quiet period',
            followUpAt: '2026-05-20T09:00:00.000Z',
          },
        }),
      ],
      { now: NOW }
    )
    const visible = collectOperatingLoopWaitingItems(
      [
        loopItem({
          id: 'snoozed-soon',
          loopState: 'snoozed',
          waitingOn: {
            kind: 'time',
            label: 'Quiet period',
            followUpAt: '2026-05-16T09:00:00.000Z',
          },
        }),
      ],
      { now: NOW }
    )

    assert.equal(hidden.length, 0)
    assert.equal(visible.length, 1)
    assert.equal(visible[0]?.waitingOn, 'time')
  })

  it('collects payment, vendor, and system waiting source categories', () => {
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

  it('collects and summarizes at least three source categories', () => {
    const radar = collectWaitingRadar(
      {
        operatingLoopItems: [
          loopItem({
            id: 'event-loop-1',
            sourceId: 'event-1',
            sourceKind: 'event',
            loopState: 'waiting',
            title: 'Menu approval',
            waitingOn: {
              kind: 'reply',
              label: 'Client approval',
              followUpAt: '2026-05-16T09:00:00.000Z',
            },
            proofHref: '/events/event-1/menu-approval',
          }),
        ],
        paymentItems: [
          { id: 'pay-1', status: 'awaiting_payment', href: '/events/event-1/billing' },
        ],
        vendorItems: [
          { id: 'vendor-1', status: 'pending_quote', route: '/culinary/vendors/vendor-1' },
        ],
        systemItems: [{ id: 'job-1', status: 'running', proofHref: '/settings/integrations' }],
      },
      { now: NOW }
    )

    assert.equal(radar.summary.total, 4)
    assert.deepEqual([...radar.summary.sourceCategories].sort(), [
      'event',
      'payment',
      'system',
      'vendor',
    ])
    assert.equal(radar.summary.emptyReason, null)
  })

  it('ranks overdue and high-risk waiting ahead of normal future follow-ups', () => {
    const ranked = rankWaitingRadarItems([
      waitingItem('vendor-1', 'vendor', 'medium', 'scheduled'),
      waitingItem('payment-1', 'payment', 'high', 'overdue'),
      waitingItem('system-1', 'system', 'low', 'no_follow_up'),
    ])

    assert.equal(ranked[0]?.id, 'payment-1')
    assert.equal(ranked[1]?.id, 'vendor-1')
    assert.equal(ranked[2]?.id, 'system-1')
  })

  it('distinguishes no source data from source data with no waiting items', () => {
    const noSource = collectWaitingRadar({}, { now: NOW })
    const noWaiting = collectWaitingRadar(
      {
        operatingLoopItems: [
          loopItem({
            id: 'done-loop-1',
            sourceId: 'task-1',
            sourceKind: 'task',
            loopState: 'done',
            title: 'Completed task',
          }),
        ],
      },
      { now: NOW }
    )

    assert.equal(noSource.summary.emptyReason, 'no_source_data')
    assert.equal(noWaiting.summary.emptyReason, 'no_waiting_items')
  })
})

function loopItem(overrides: Partial<OperatingLoopItem>): OperatingLoopItem {
  return {
    id: 'loop-1',
    sourceId: 'source-1',
    sourceKind: 'task',
    loopState: 'waiting',
    evidenceLabel: 'confirmed',
    confidence: 1,
    title: 'Waiting item',
    description: null,
    nextAction: 'Follow up',
    waitingOn: null,
    resumeContext: null,
    proofHref: '/tasks/source-1',
    sourceRoute: '/tasks/source-1',
    createdAt: '2026-05-15T12:00:00.000Z',
    dueAt: null,
    ...overrides,
  }
}

function waitingItem(
  id: string,
  sourceKind: WaitingRadarItem['sourceKind'],
  riskLevel: WaitingRadarItem['riskLevel'],
  followUpState: WaitingRadarItem['followUpState']
): WaitingRadarItem {
  return {
    id,
    sourceId: id,
    sourceKind,
    title: id,
    description: null,
    waitingOn: 'system',
    waitingReason: 'Waiting',
    followUpAt:
      followUpState === 'overdue'
        ? '2026-05-14T09:00:00.000Z'
        : followUpState === 'scheduled'
          ? '2026-05-17T09:00:00.000Z'
          : null,
    followUpState,
    proofHref: `/${id}`,
    riskLevel,
    createdAt: '2026-05-15T12:00:00.000Z',
    waitingSince: '2026-05-15T12:00:00.000Z',
    metadata: {},
  }
}
