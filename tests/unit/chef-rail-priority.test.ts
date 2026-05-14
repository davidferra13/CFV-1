import test from 'node:test'
import assert from 'node:assert/strict'
import type { ChefRailCandidate } from '@/lib/discovery/chef-rail-contracts'
import {
  rankChefRailCandidates,
  transitionChefRailState,
  validateChefRailAction,
} from '@/lib/discovery/chef-rail-priority'

const base: ChefRailCandidate = {
  id: 'rail-1',
  tenantId: 'tenant-1',
  category: 'follow_up',
  title: 'Follow up on quote',
  reasonCode: 'quote.stale',
  reason: 'Quote stale 3 days',
  href: '/quotes/1',
  action: 'send_follow_up',
  urgency: 80,
  moneyImpact: 75,
  eventRisk: 20,
  relationshipValue: 90,
  confidence: 80,
  freshness: 90,
  actionability: 95,
  createdAt: '2026-05-12T12:00:00.000Z',
}

test('chef rail ranks urgent event risk above lower impact actions', () => {
  const ranked = rankChefRailCandidates({
    candidates: [
      base,
      {
        ...base,
        id: 'rail-2',
        category: 'event_risk',
        title: 'Menu approval due',
        action: 'mark_risk_resolved',
        urgency: 96,
        eventRisk: 100,
        reasonCode: 'menu.approval_due',
      },
    ],
    now: new Date('2026-05-13T12:00:00.000Z'),
  })

  assert.equal(ranked[0].id, 'rail-2')
  assert.ok(ranked[0].score > ranked[1].score)
})

test('chef rail suppresses dismissed and snoozed items', () => {
  const ranked = rankChefRailCandidates({
    candidates: [base],
    states: [
      {
        itemId: base.id,
        tenantId: base.tenantId,
        state: 'snoozed',
        updatedAt: '2026-05-13T00:00:00.000Z',
        snoozedUntil: '2026-05-14T00:00:00.000Z',
      },
    ],
    now: new Date('2026-05-13T12:00:00.000Z'),
  })

  assert.equal(ranked.length, 0)
})

test('chef rail validates direct actions by item family', () => {
  assert.equal(validateChefRailAction('follow_up', 'send_follow_up'), true)
  assert.equal(validateChefRailAction('partner_lead', 'send_follow_up'), false)
})

test('converted lifecycle state is terminal', () => {
  const state = transitionChefRailState({
    current: {
      itemId: 'rail-1',
      tenantId: 'tenant-1',
      state: 'converted',
      updatedAt: '2026-05-13T00:00:00.000Z',
    },
    nextState: 'dismissed',
    now: new Date('2026-05-13T12:00:00.000Z'),
  })

  assert.equal(state.state, 'converted')
})
