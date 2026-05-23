import assert from 'node:assert/strict'
import test from 'node:test'

import {
  buildEventReadinessBus,
  type EventReadinessSignalInput,
} from '../../lib/events/event-readiness-bus'

const now = new Date('2026-05-21T12:00:00Z')

function signal(
  input: Partial<EventReadinessSignalInput> & Pick<EventReadinessSignalInput, 'program' | 'state'>
) {
  return {
    id: `${input.program}-${input.state}`,
    program: input.program,
    state: input.state,
    title: input.title ?? `${input.program} ${input.state}`,
    detail: input.detail ?? 'Needs attention.',
    owner: input.owner ?? 'Chef',
    dueAt: input.dueAt ?? '2026-05-22',
    action: input.action ?? {
      label: 'Open surface',
      href: `/events/event-1?tab=${input.program}`,
    },
    sourceProof: input.sourceProof ?? {
      label: `${input.program} source`,
      href: `/events/event-1?tab=${input.program}`,
      updatedAt: '2026-05-21T08:00:00Z',
      confidence: 'verified',
    },
  } satisfies EventReadinessSignalInput
}

test('event readiness bus creates traceable unknown cards for unconnected program feeds', () => {
  const bus = buildEventReadinessBus([signal({ program: 'capacity', state: 'clear' })], {
    eventId: 'event-1',
    eventHref: '/events/event-1',
    now,
  })

  assert.equal(bus.cards.length, 10)
  assert.equal(bus.counts.unknown, 9)
  assert.equal(bus.cards.find((card) => card.program === 'vendor')?.state, 'unknown')
  assert.match(
    bus.cards.find((card) => card.program === 'vendor')?.sourceProof.label ?? '',
    /No source/
  )
})

test('event readiness bus prioritizes blockers and unknowns before ordinary warnings', () => {
  const bus = buildEventReadinessBus(
    [
      signal({ program: 'finance', state: 'warning', dueAt: '2026-05-21' }),
      signal({ program: 'loadout', state: 'blocked', dueAt: '2026-05-23' }),
      signal({ program: 'capacity', state: 'clear', dueAt: '2026-05-21' }),
    ],
    {
      eventId: 'event-1',
      eventHref: '/events/event-1',
      expectedPrograms: ['capacity', 'loadout', 'vendor', 'finance'],
      now,
    }
  )

  assert.deepEqual(
    bus.topCards.map((card) => [card.program, card.state]),
    [
      ['loadout', 'blocked'],
      ['vendor', 'unknown'],
      ['finance', 'warning'],
      ['capacity', 'clear'],
    ]
  )
  assert.equal(bus.overallState, 'blocked')
  assert.equal(bus.topCards[0].sourceProof.confidence, 'verified')
})

test('event readiness bus keeps composable integration links on every card', () => {
  const bus = buildEventReadinessBus(
    [
      signal({
        program: 'communication',
        state: 'warning',
        action: { label: 'Open communication', href: '/communication' },
      }),
    ],
    {
      eventId: 'event-1',
      eventHref: '/events/event-1',
      dashboardHref: '/dashboard',
      railHref: '/dashboard#chef-life-synthesis',
      expectedPrograms: ['communication'],
      now,
    }
  )

  assert.equal(bus.cards[0].integration.event.href, '/events/event-1')
  assert.equal(bus.cards[0].integration.dashboard.href, '/dashboard')
  assert.equal(bus.cards[0].integration.rail.href, '/dashboard#chef-life-synthesis')
  assert.equal(bus.cards[0].action.href, '/communication')
})
