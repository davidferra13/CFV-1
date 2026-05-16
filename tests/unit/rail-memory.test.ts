import test from 'node:test'
import assert from 'node:assert/strict'

import { formatFollowUpAt, formatRailMemoryLine } from '@/lib/operating-loop/rail-memory'

const now = new Date('2026-05-15T17:30:00.000Z')

test('formatFollowUpAt makes follow-up timing scannable', () => {
  assert.equal(formatFollowUpAt('2026-05-14T09:00:00.000Z', now), 'overdue')
  assert.equal(formatFollowUpAt('2026-05-15T20:00:00.000Z', now), 'today')
  assert.equal(formatFollowUpAt('2026-05-16T09:00:00.000Z', now), 'tomorrow')
  assert.equal(formatFollowUpAt('2026-05-18T09:00:00.000Z', now), 'in 3d')
})

test('formatRailMemoryLine combines state waiting owner and next action', () => {
  const line = formatRailMemoryLine(
    {
      loopState: 'waiting',
      context: 'Menu sent',
      nextAction: 'Confirm the tasting menu',
      waitingOn: {
        kind: 'reply',
        label: 'Client approval',
        followUpAt: '2026-05-16T09:00:00.000Z',
      },
    },
    now
  )

  assert.equal(
    line,
    'Waiting / Waiting on Client approval, follow up tomorrow / Confirm the tasting menu'
  )
})
