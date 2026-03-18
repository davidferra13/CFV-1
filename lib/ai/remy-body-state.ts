// Remy Body State Machine - useReducer-based animation state controller.
// Drives Layer 1 (body pose/movement) of the 3-layer animation system.
//
// Architecture:
//   11 body states, priority-ordered, with typed event transitions.
//   Pure reducer - no side effects. Timer logic lives in the useBodyState hook.
//   When a sprite sheet is available for a state, the sprite animator plays it.
//   When no sheet exists, the system falls back to CSS transforms (breathing, wiggle).

import { useReducer, useCallback, useRef, useEffect } from 'react'

// ─── Body States ────────────────────────────────────────────────────────────

export type BodyState =
  | 'idle'
  | 'entrance'
  | 'wave'
  | 'thinking'
  | 'speaking'
  | 'whisking'
  | 'celebrating'
  | 'sleeping'
  | 'error'
  | 'nudge'
  | 'exit'

// ─── Body Events ────────────────────────────────────────────────────────────

export type BodyEvent =
  | { type: 'DRAWER_OPENED' }
  | { type: 'DRAWER_CLOSED' }
  | { type: 'RESPONSE_STARTED' }
  | { type: 'FIRST_TOKEN' }
  | { type: 'RESPONSE_ENDED' }
  | { type: 'SUCCESS' }
  | { type: 'ERROR' }
  | { type: 'NUDGE' }
  | { type: 'IDLE_TIMEOUT' }
  | { type: 'INTERACT' }
  | { type: 'ANIM_COMPLETE' }
  | { type: 'WHISKING' }

// ─── Priority (higher = overrides lower) ────────────────────────────────────

const STATE_PRIORITY: Record<BodyState, number> = {
  sleeping: 0,
  idle: 1,
  entrance: 2,
  exit: 2,
  nudge: 3,
  wave: 4,
  whisking: 5,
  thinking: 6,
  speaking: 7,
  celebrating: 8,
  error: 9,
}

// ─── Per-State Configuration ────────────────────────────────────────────────

export interface BodyStateConfig {
  /** Which sprite sheet to use (null = no sprite, use CSS animation) */
  spriteSheet: string | null
  /** Frames per second for sprite animation */
  fps: number
  /** Whether the animation loops */
  loop: boolean
  /** CSS animation class to apply when no sprite sheet (fallback) */
  cssAnimation: string | null
  /** Duration of the CSS animation in ms (for firing onAnimComplete on non-looping CSS fallbacks) */
  cssDurationMs: number
  /** Human-readable label for aria-live announcements */
  announcement: string
}

export const BODY_STATE_CONFIG: Record<BodyState, BodyStateConfig> = {
  idle: {
    spriteSheet: null,
    fps: 4,
    loop: true,
    cssAnimation: 'remy-breathe',
    cssDurationMs: 4000,
    announcement: '',
  },
  entrance: {
    spriteSheet: 'remy-body-walk',
    fps: 12,
    loop: false,
    cssAnimation: 'animate-mascot-peek',
    cssDurationMs: 500,
    announcement: 'Remy has arrived',
  },
  wave: {
    spriteSheet: 'remy-body-wave',
    fps: 12,
    loop: false,
    cssAnimation: 'animate-mascot-wiggle',
    cssDurationMs: 500,
    announcement: 'Remy says hello',
  },
  thinking: {
    spriteSheet: 'remy-body-think',
    fps: 6,
    loop: true,
    cssAnimation: 'animate-mascot-bob',
    cssDurationMs: 0,
    announcement: 'Remy is thinking',
  },
  speaking: {
    spriteSheet: null,
    fps: 0,
    loop: false,
    cssAnimation: null,
    cssDurationMs: 0,
    announcement: 'Remy is speaking',
  },
  whisking: {
    spriteSheet: 'remy-body-whisk',
    fps: 10,
    loop: true,
    cssAnimation: 'animate-mascot-bob',
    cssDurationMs: 0,
    announcement: 'Remy is cooking',
  },
  celebrating: {
    spriteSheet: 'remy-body-celebrate',
    fps: 16,
    loop: false,
    cssAnimation: 'animate-mascot-hop',
    cssDurationMs: 450,
    announcement: 'Remy is celebrating',
  },
  sleeping: {
    spriteSheet: 'remy-body-sleep',
    fps: 2,
    loop: true,
    cssAnimation: null,
    cssDurationMs: 0,
    announcement: 'Remy is resting',
  },
  error: {
    spriteSheet: 'remy-body-error',
    fps: 4,
    loop: false,
    cssAnimation: 'animate-mascot-wiggle',
    cssDurationMs: 500,
    announcement: 'Remy encountered a problem',
  },
  nudge: {
    spriteSheet: null,
    fps: 8,
    loop: false,
    cssAnimation: 'animate-mascot-wiggle',
    cssDurationMs: 500,
    announcement: '',
  },
  exit: {
    spriteSheet: 'remy-body-walk',
    fps: 12,
    loop: false,
    cssAnimation: 'animate-mascot-peek',
    cssDurationMs: 500,
    announcement: '',
  },
}

// ─── Reducer ────────────────────────────────────────────────────────────────

export function bodyReducer(state: BodyState, event: BodyEvent): BodyState {
  // Error overrides everything
  if (event.type === 'ERROR') return 'error'
  // Celebration overrides everything except error
  if (event.type === 'SUCCESS') return 'celebrating'

  switch (state) {
    case 'idle':
      if (event.type === 'DRAWER_OPENED') return 'wave'
      if (event.type === 'RESPONSE_STARTED') return 'thinking'
      if (event.type === 'FIRST_TOKEN') return 'speaking'
      if (event.type === 'NUDGE') return 'nudge'
      if (event.type === 'IDLE_TIMEOUT') return 'sleeping'
      if (event.type === 'WHISKING') return 'whisking'
      if (event.type === 'DRAWER_CLOSED') return 'exit'
      return state

    case 'sleeping':
      if (event.type === 'INTERACT') return 'idle'
      if (event.type === 'DRAWER_OPENED') return 'wave'
      if (event.type === 'RESPONSE_STARTED') return 'thinking'
      if (event.type === 'FIRST_TOKEN') return 'speaking'
      return state

    case 'wave':
      if (event.type === 'ANIM_COMPLETE') return 'idle'
      if (event.type === 'RESPONSE_STARTED') return 'thinking'
      return state

    case 'thinking':
      if (event.type === 'FIRST_TOKEN') return 'speaking'
      if (event.type === 'RESPONSE_ENDED') return 'idle'
      return state

    case 'speaking':
      if (event.type === 'RESPONSE_ENDED') return 'idle'
      return state

    case 'whisking':
      if (event.type === 'ANIM_COMPLETE') return 'idle'
      if (event.type === 'RESPONSE_STARTED') return 'thinking'
      if (event.type === 'FIRST_TOKEN') return 'speaking'
      return state

    case 'celebrating':
      if (event.type === 'ANIM_COMPLETE') return 'idle'
      return state

    case 'error':
      if (event.type === 'ANIM_COMPLETE') return 'idle'
      if (event.type === 'INTERACT') return 'idle'
      return state

    case 'nudge':
      if (event.type === 'ANIM_COMPLETE') return 'idle'
      if (event.type === 'DRAWER_OPENED') return 'wave'
      return state

    case 'entrance':
      if (event.type === 'ANIM_COMPLETE') return 'idle'
      return state

    case 'exit':
      if (event.type === 'ANIM_COMPLETE') return 'idle'
      if (event.type === 'DRAWER_OPENED') return 'wave'
      return state

    default:
      return state
  }
}

// ─── Hook ───────────────────────────────────────────────────────────────────

const IDLE_TIMEOUT_MS = 60_000
const IDLE_CHECK_INTERVAL_MS = 5_000

export function useBodyState() {
  const [bodyState, dispatch] = useReducer(bodyReducer, 'idle')
  const lastInteraction = useRef(Date.now())
  const idleCheckRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Track user interaction for sleep timer
  const markInteraction = useCallback(() => {
    lastInteraction.current = Date.now()
    dispatch({ type: 'INTERACT' })
  }, [])

  // Idle timeout → sleeping
  useEffect(() => {
    const events = ['mousemove', 'scroll', 'click', 'keydown', 'touchstart'] as const
    const handler = () => {
      lastInteraction.current = Date.now()
    }

    events.forEach((e) => window.addEventListener(e, handler, { passive: true }))

    idleCheckRef.current = setInterval(() => {
      if (Date.now() - lastInteraction.current > IDLE_TIMEOUT_MS) {
        dispatch({ type: 'IDLE_TIMEOUT' })
      }
    }, IDLE_CHECK_INTERVAL_MS)

    return () => {
      events.forEach((e) => window.removeEventListener(e, handler))
      if (idleCheckRef.current) clearInterval(idleCheckRef.current)
    }
  }, [])

  // Dispatch with interaction tracking for wake-from-sleep events
  const dispatchBody = useCallback((event: BodyEvent) => {
    if (event.type === 'INTERACT' || event.type === 'DRAWER_OPENED') {
      lastInteraction.current = Date.now()
    }
    dispatch(event)
  }, [])

  return {
    bodyState,
    dispatchBody,
    markInteraction,
  }
}

// ─── Utilities ──────────────────────────────────────────────────────────────

/** Check if a higher-priority state would block a transition */
export function canTransitionTo(current: BodyState, target: BodyState): boolean {
  return STATE_PRIORITY[target] >= STATE_PRIORITY[current]
}

/** Get the config for the current body state */
export function getBodyConfig(state: BodyState): BodyStateConfig {
  return BODY_STATE_CONFIG[state]
}
