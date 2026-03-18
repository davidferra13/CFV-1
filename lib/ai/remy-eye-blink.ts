// Remy Auto-Blink Engine - Layer 3 of the 3-layer animation system.
// Drives eye state independently of body and mouth layers.
//
// Features:
//   - Random blink interval (3-7 seconds)
//   - 180ms blink sequence: open → half → closed → half → open
//   - Emotion/body state can override eyes (sleeping → closed, error → wide)
//   - Respects prefers-reduced-motion (no blink animation, stays open)
//   - Proper cleanup on unmount

import { useState, useCallback, useRef, useEffect } from 'react'
import type { BodyState } from './remy-body-state'
import type { RemyEmotion } from './remy-visemes'

// ─── Eye States ─────────────────────────────────────────────────────────────

export type EyeState = 'open' | 'half' | 'closed' | 'wide' | 'star'

// ─── Blink Timing ───────────────────────────────────────────────────────────

const BLINK_MIN_MS = 3000
const BLINK_MAX_MS = 7000
const BLINK_HALF_MS = 50
const BLINK_CLOSED_MS = 80
const BLINK_REOPEN_MS = 50

// ─── Body State → Eye Override ──────────────────────────────────────────────
// Some body states force a specific eye state regardless of blink cycle.

function getBodyEyeOverride(bodyState: BodyState): EyeState | null {
  switch (bodyState) {
    case 'sleeping':
      return 'closed'
    case 'error':
      return 'wide'
    case 'celebrating':
      return 'star'
    default:
      return null
  }
}

// ─── Emotion → Eye Override ─────────────────────────────────────────────────
// Emotions can influence eye state when not overridden by body state.

function getEmotionEyeHint(emotion: RemyEmotion): EyeState | null {
  switch (emotion) {
    case 'surprised':
      return 'wide'
    default:
      return null
  }
}

// ─── Hook ───────────────────────────────────────────────────────────────────

interface UseAutoBlinkOptions {
  /** Current body state - some states force eye state */
  bodyState: BodyState
  /** Current emotion - can hint at eye state */
  emotion: RemyEmotion
}

export function useAutoBlink({ bodyState, emotion }: UseAutoBlinkOptions) {
  const [eyeState, setEyeState] = useState<EyeState>('open')
  const blinkTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const sequenceTimersRef = useRef<ReturnType<typeof setTimeout>[]>([])
  const reducedMotionRef = useRef(false)

  // Check prefers-reduced-motion
  useEffect(() => {
    if (typeof window === 'undefined') return
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    reducedMotionRef.current = mq.matches
    const handler = (e: MediaQueryListEvent) => {
      reducedMotionRef.current = e.matches
    }
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  // Clear all timers
  const clearAllTimers = useCallback(() => {
    if (blinkTimerRef.current) {
      clearTimeout(blinkTimerRef.current)
      blinkTimerRef.current = null
    }
    for (const t of sequenceTimersRef.current) {
      clearTimeout(t)
    }
    sequenceTimersRef.current = []
  }, [])

  // Schedule next blink
  const scheduleBlink = useCallback(() => {
    if (reducedMotionRef.current) return

    const delay = BLINK_MIN_MS + Math.random() * (BLINK_MAX_MS - BLINK_MIN_MS)

    blinkTimerRef.current = setTimeout(() => {
      // Don't blink if body state has an eye override
      const override = getBodyEyeOverride(bodyState)
      if (override) {
        scheduleBlink()
        return
      }

      // Blink sequence: open → half → closed → half → open
      setEyeState('half')

      const t1 = setTimeout(() => setEyeState('closed'), BLINK_HALF_MS)
      const t2 = setTimeout(() => setEyeState('half'), BLINK_HALF_MS + BLINK_CLOSED_MS)
      const t3 = setTimeout(
        () => {
          setEyeState('open')
          scheduleBlink()
        },
        BLINK_HALF_MS + BLINK_CLOSED_MS + BLINK_REOPEN_MS
      )

      sequenceTimersRef.current = [t1, t2, t3]
    }, delay)
  }, [bodyState])

  // Start blink cycle
  useEffect(() => {
    scheduleBlink()
    return clearAllTimers
  }, [scheduleBlink, clearAllTimers])

  // Body state override takes precedence
  const bodyOverride = getBodyEyeOverride(bodyState)
  if (bodyOverride) {
    return bodyOverride
  }

  // Emotion hint (lower priority than blink animation)
  const emotionHint = getEmotionEyeHint(emotion)
  if (emotionHint && eyeState === 'open') {
    return emotionHint
  }

  return eyeState
}
