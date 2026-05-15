import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { recognizeSwipeGesture, type SwipeGestureInput } from '@/lib/discovery/swipe-gesture'

function makeInput(overrides: Partial<SwipeGestureInput>): SwipeGestureInput {
  return {
    startX: 100,
    startY: 200,
    endX: 100,
    endY: 200,
    startTime: 0,
    endTime: 100,
    ...overrides,
  }
}

describe('recognizeSwipeGesture', () => {
  it('detects upward swipe as save when velocity exceeds threshold', () => {
    const result = recognizeSwipeGesture(
      makeInput({ startY: 200, endY: 130, startTime: 0, endTime: 100 })
    )
    assert.equal(result.direction, 'up')
    assert.equal(result.action, 'save')
    assert.equal(result.recognized, true)
  })

  it('detects downward swipe as dismiss when velocity exceeds threshold', () => {
    const result = recognizeSwipeGesture(
      makeInput({ startY: 100, endY: 170, startTime: 0, endTime: 100 })
    )
    assert.equal(result.direction, 'down')
    assert.equal(result.action, 'dismiss')
    assert.equal(result.recognized, true)
  })

  it('rejects slow swipes below velocity threshold (0.5 px/ms)', () => {
    const result = recognizeSwipeGesture(
      makeInput({ startY: 200, endY: 170, startTime: 0, endTime: 1000 })
    )
    assert.equal(result.recognized, false)
  })

  it('rejects horizontal swipes (not vertical)', () => {
    const result = recognizeSwipeGesture(
      makeInput({ startX: 100, endX: 200, startY: 200, endY: 205, startTime: 0, endTime: 50 })
    )
    assert.equal(result.recognized, false)
  })

  it('calculates tilt angle capped at 3 degrees', () => {
    const result = recognizeSwipeGesture(
      makeInput({ startY: 200, endY: 100, startTime: 0, endTime: 50 })
    )
    assert.ok(result.tiltDegrees <= 3)
    assert.ok(result.tiltDegrees > 0)
  })

  it('reports velocity in px/ms', () => {
    const result = recognizeSwipeGesture(
      makeInput({ startY: 200, endY: 100, startTime: 0, endTime: 100 })
    )
    assert.equal(result.velocityPxPerMs, 1)
  })

  it('returns no action for zero-distance swipe', () => {
    const result = recognizeSwipeGesture(makeInput({ startY: 200, endY: 200 }))
    assert.equal(result.recognized, false)
    assert.equal(result.action, 'none')
  })
})
