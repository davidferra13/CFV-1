import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  resolveDiscoveryRailMotionContract,
  type DiscoveryRailMotionContract,
} from '@/lib/discovery/control-rail-contracts'

describe('resolveDiscoveryRailMotionContract', () => {
  it('passive mode disables all motion', () => {
    const result = resolveDiscoveryRailMotionContract({ control: 'passive' })
    assert.equal(result.control, 'passive')
    assert.equal(result.preservesMomentum, false)
    assert.equal(result.rolling, false)
    assert.equal(result.autoStopMs, null)
    assert.equal(result.animation, 'none')
    assert.equal(result.rowStopMode, 'none')
  })

  it('flick mode with slow velocity does not preserve momentum', () => {
    const result = resolveDiscoveryRailMotionContract({
      control: 'flick',
      pointerVelocityPxPerMs: 0.3,
    })
    assert.equal(result.control, 'flick')
    assert.equal(result.preservesMomentum, false)
    assert.equal(result.autoStopMs, null)
    assert.equal(result.protectsActivation, false)
  })

  it('flick mode with fast velocity enables momentum and 900ms auto-stop', () => {
    const result = resolveDiscoveryRailMotionContract({
      control: 'flick',
      pointerVelocityPxPerMs: 1.5,
    })
    assert.equal(result.preservesMomentum, true)
    assert.equal(result.autoStopMs, 900)
    assert.equal(result.protectsActivation, true)
    assert.equal(result.animation, 'momentum')
  })

  it('flick mode with reduced motion suppresses animation', () => {
    const result = resolveDiscoveryRailMotionContract({
      control: 'flick',
      pointerVelocityPxPerMs: 2.0,
      reducedMotion: true,
    })
    assert.equal(result.animation, 'none')
  })

  it('dice mode uses staggered row stops at 1400ms', () => {
    const result = resolveDiscoveryRailMotionContract({ control: 'dice' })
    assert.equal(result.control, 'dice')
    assert.equal(result.autoStopMs, 1400)
    assert.equal(result.rowStopMode, 'staggered')
    assert.equal(result.shouldResetScrollStart, true)
    assert.equal(result.animation, 'short_roll')
  })

  it('dice mode with reduced motion uses instant offset', () => {
    const result = resolveDiscoveryRailMotionContract({
      control: 'dice',
      reducedMotion: true,
    })
    assert.equal(result.autoStopMs, 0)
    assert.equal(result.animation, 'instant_offset')
  })

  it('lever mode uses manual top-to-bottom cascade at 4500ms', () => {
    const result = resolveDiscoveryRailMotionContract({ control: 'lever' })
    assert.equal(result.control, 'lever')
    assert.equal(result.autoStopMs, 4500)
    assert.equal(result.rowStopMode, 'manual_top_to_bottom')
    assert.equal(result.protectsActivation, true)
  })

  it('velocity threshold is 0.8 px/ms for fast flick', () => {
    const slow = resolveDiscoveryRailMotionContract({
      control: 'flick',
      pointerVelocityPxPerMs: 0.79,
    })
    const fast = resolveDiscoveryRailMotionContract({
      control: 'flick',
      pointerVelocityPxPerMs: 0.8,
    })
    assert.equal(slow.preservesMomentum, false)
    assert.equal(fast.preservesMomentum, true)
  })
})
