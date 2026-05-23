import assert from 'node:assert/strict'
import test from 'node:test'

import {
  buildChefLifeDashboardSynthesis,
  type ChefLifeSynthesisSignal,
} from '../../lib/dashboard/chef-life-synthesis'

const now = new Date('2026-05-21T12:00:00Z')

function signal(input: Partial<ChefLifeSynthesisSignal> & Pick<ChefLifeSynthesisSignal, 'domain'>) {
  return {
    domain: input.domain,
    title: input.title ?? `${input.domain} signal`,
    detail: input.detail ?? 'Needs attention.',
    urgency: input.urgency ?? 'watch',
    href: input.href ?? '/dashboard',
    sourceLabel: input.sourceLabel ?? 'Source',
    sourceHref: input.sourceHref ?? '/dashboard',
    sourceUpdatedAt: input.sourceUpdatedAt ?? '2026-05-21T08:00:00Z',
    dueAt: input.dueAt ?? null,
    includeReason: input.includeReason ?? 'Changed today.',
    exclusionReason: input.exclusionReason ?? 'No meaningful change today or this week.',
  } satisfies ChefLifeSynthesisSignal
}

test('chef life dashboard synthesis includes only today and this-week changes', () => {
  const rail = buildChefLifeDashboardSynthesis(
    [
      signal({ domain: 'capacity', urgency: 'high', dueAt: '2026-05-22' }),
      signal({
        domain: 'vendor_risk',
        urgency: 'watch',
        dueAt: '2026-06-15',
        sourceUpdatedAt: '2026-05-01T08:00:00Z',
      }),
      signal({
        domain: 'strategy_misalignment',
        urgency: 'watch',
        sourceUpdatedAt: '2026-05-01T08:00:00Z',
        dueAt: null,
      }),
    ],
    { now }
  )

  assert.deepEqual(
    rail.items.map((item) => item.domain),
    ['capacity']
  )
  assert.equal(rail.excluded.length, 2)
  assert.match(rail.summary, /1 Chef Life signal/)
})

test('chef life dashboard synthesis deduplicates domains and keeps the strongest source link', () => {
  const rail = buildChefLifeDashboardSynthesis(
    [
      signal({
        domain: 'financial_pressure',
        title: 'One invoice is due',
        urgency: 'watch',
        href: '/finance',
        sourceHref: '/finance',
      }),
      signal({
        domain: 'financial_pressure',
        title: 'Overdue balance blocks the week',
        urgency: 'critical',
        href: '/events/event-1/financial',
        sourceHref: '/events/event-1/financial',
      }),
      signal({ domain: 'household_unknowns', urgency: 'high', dueAt: '2026-05-24' }),
    ],
    { now }
  )

  assert.equal(rail.items.length, 2)
  assert.equal(rail.items[0].domain, 'financial_pressure')
  assert.equal(rail.items[0].title, 'Overdue balance blocks the week')
  assert.equal(rail.items[0].sourceHref, '/events/event-1/financial')
})

test('chef life dashboard synthesis gives every included item calm control semantics', () => {
  const rail = buildChefLifeDashboardSynthesis(
    [signal({ domain: 'compliance', urgency: 'critical', dueAt: '2026-05-21' })],
    { now }
  )

  assert.equal(rail.items[0].controls.snoozeUntil, 'tomorrow')
  assert.equal(rail.items[0].controls.ignoreUntil, 'source_changes')
  assert.equal(rail.items[0].controls.duplicatePolicy, 'one_item_per_domain')
  assert.ok(rail.items[0].includeReason)
  assert.ok(rail.items[0].sourceLabel)
})
