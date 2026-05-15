export type SwipeDirection = 'up' | 'down' | 'left' | 'right' | 'none'
export type SwipeAction = 'save' | 'dismiss' | 'none'

export type SwipeGestureInput = {
  startX: number
  startY: number
  endX: number
  endY: number
  startTime: number
  endTime: number
}

export type SwipeGestureResult = {
  direction: SwipeDirection
  action: SwipeAction
  recognized: boolean
  velocityPxPerMs: number
  tiltDegrees: number
  deltaX: number
  deltaY: number
}

const VELOCITY_THRESHOLD_PX_PER_MS = 0.5
const MIN_DISTANCE_PX = 20
const MAX_TILT_DEGREES = 3

export function recognizeSwipeGesture(input: SwipeGestureInput): SwipeGestureResult {
  const deltaX = input.endX - input.startX
  const deltaY = input.endY - input.startY
  const absDX = Math.abs(deltaX)
  const absDY = Math.abs(deltaY)
  const elapsed = Math.max(input.endTime - input.startTime, 1)

  if (absDY < MIN_DISTANCE_PX || absDX > absDY) {
    return {
      direction: 'none',
      action: 'none',
      recognized: false,
      velocityPxPerMs: 0,
      tiltDegrees: 0,
      deltaX,
      deltaY,
    }
  }

  const velocityPxPerMs = absDY / elapsed
  const direction: SwipeDirection = deltaY < 0 ? 'up' : 'down'

  if (velocityPxPerMs < VELOCITY_THRESHOLD_PX_PER_MS) {
    return {
      direction,
      action: 'none',
      recognized: false,
      velocityPxPerMs,
      tiltDegrees: 0,
      deltaX,
      deltaY,
    }
  }

  const rawTilt = Math.min(absDY / 30, MAX_TILT_DEGREES)
  const tiltDegrees = Math.round(rawTilt * 100) / 100
  const action: SwipeAction = direction === 'up' ? 'save' : 'dismiss'

  return {
    direction,
    action,
    recognized: true,
    velocityPxPerMs,
    tiltDegrees,
    deltaX,
    deltaY,
  }
}

export function getSwipeTiltTransform(deltaY: number, deltaX: number): string {
  if (Math.abs(deltaY) < 5) return 'none'
  const tiltDirection = deltaX > 0 ? 1 : -1
  const tiltAmount = Math.min(Math.abs(deltaY) / 30, MAX_TILT_DEGREES)
  return `rotate(${tiltDirection * tiltAmount}deg)`
}

export function triggerHaptic(durationMs = 10): void {
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    try {
      navigator.vibrate(durationMs)
    } catch {
      // Haptic not supported
    }
  }
}
