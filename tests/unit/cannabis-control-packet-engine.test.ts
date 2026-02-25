import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  assignGuestsToSeats,
  evaluateReconciliation,
  generateSeatBlueprint,
  normalizeCourseCount,
} from '../../lib/cannabis/control-packet-engine.js'

describe('generateSeatBlueprint', () => {
  it('creates linear seat IDs by default', () => {
    const seats = generateSeatBlueprint('linear', 3)
    assert.deepEqual(
      seats.map((seat) => seat.seatId),
      ['S1', 'S2', 'S3']
    )
  })

  it('creates 2x5 grid IDs', () => {
    const seats = generateSeatBlueprint('grid_2x5', 10)
    assert.equal(seats.length, 10)
    assert.equal(seats[0].seatId, 'R1C1')
    assert.equal(seats[5].seatId, 'R2C1')
  })

  it('uses custom seat IDs with fallback seats when needed', () => {
    const seats = generateSeatBlueprint('custom', 4, ['Window', 'Kitchen'])
    assert.deepEqual(
      seats.map((seat) => seat.seatId),
      ['Window', 'Kitchen', 'S3', 'S4']
    )
  })
})

describe('assignGuestsToSeats', () => {
  it('assigns guests in order and creates per-course tracking cells', () => {
    const seats = generateSeatBlueprint('linear', 2)
    const snapshot = assignGuestsToSeats(
      [
        {
          guestId: 'a',
          fullName: 'Alex',
          participationStatus: 'participate',
          rsvpStatus: 'attending',
          createdAt: '2026-01-01T00:00:00.000Z',
        },
        {
          guestId: 'b',
          fullName: 'Bri',
          participationStatus: 'undecided',
          rsvpStatus: 'attending',
          createdAt: '2026-01-01T00:01:00.000Z',
        },
      ],
      seats,
      4
    )

    assert.equal(snapshot[0].guestName, 'Alex')
    assert.equal(snapshot[1].guestName, 'Bri')
    assert.equal(snapshot[0].courseTracking.length, 4)
    assert.equal(snapshot[0].courseTracking[0].doseApplied, false)
  })
})

describe('evaluateReconciliation', () => {
  it('flags missing guest rows and planned/served mismatches', () => {
    const summary = evaluateReconciliation(
      ['Alex', 'Bri'],
      [
        {
          guestName: 'Alex',
          totalMgPlanned: 10,
          totalMgServed: 8,
          breakdownPerCourseMg: [4, 4],
        },
      ],
      2
    )

    assert.deepEqual(summary.missingEntries, ['bri'])
    assert.deepEqual(summary.plannedVsServedMismatch, ['Alex'])
  })

  it('flags per-course count mismatch and sum mismatch', () => {
    const summary = evaluateReconciliation(
      ['Alex'],
      [
        {
          guestName: 'Alex',
          totalMgPlanned: 8,
          totalMgServed: 8,
          breakdownPerCourseMg: [5],
        },
      ],
      2
    )

    assert.deepEqual(summary.courseMismatch, ['Alex'])
    assert.deepEqual(summary.invalidPerCourseSum, ['Alex'])
  })
})

describe('normalizeCourseCount', () => {
  it('normalizes invalid values to 1', () => {
    assert.equal(normalizeCourseCount(0), 1)
    assert.equal(normalizeCourseCount(-4), 1)
    assert.equal(normalizeCourseCount(null), 1)
  })

  it('keeps positive values', () => {
    assert.equal(normalizeCourseCount(6), 6)
  })
})
