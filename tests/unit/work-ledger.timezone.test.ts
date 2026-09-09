import assert from 'node:assert/strict'
import { it } from 'node:test'
import { previousLocalDayRange } from '@/lib/work-ledger/timezone'

it('reconstructs the previous New York local day across UTC boundaries', () => {
  const range = previousLocalDayRange('America/New_York', new Date('2026-09-09T02:00:00.000Z'))

  assert.deepEqual(range, {
    localDate: '2026-09-07',
    startAt: '2026-09-07T04:00:00.000Z',
    endAt: '2026-09-08T04:00:00.000Z',
  })
})
