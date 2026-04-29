// Remy Proactive Nudges - React hook that periodically evaluates nudge rules
// against the activity tracker and fires the NUDGE body state + speech bubble.
// All nudge messages are pre-defined strings - no LLM calls.

import { useState, useEffect, useCallback, useRef } from 'react'
import { getSessionActivity } from '@/lib/ai/remy-activity-tracker'
import { evaluateNudges, recordNudgeFired, extendNudgeCooldown } from '@/lib/ai/remy-nudge-rules'
import type { BodyEvent } from '@/lib/ai/remy-body-state'
import type { BodyState } from '@/lib/ai/remy-body-state'

const EVAL_INTERVAL_MS = 30_000 // Check every 30 seconds
const NUDGE_DISPLAY_MS = 5_000 // Auto-dismiss after 5 seconds

export interface UseRemyNudgesConfig {
  /** Current body animation state */
  bodyState: BodyState
  /** Dispatch a body event (e.g. NUDGE) */
  dispatchBody: (event: BodyEvent) => void
  /** Whether the mascot chat panel is open */
  isMascotChatOpen: boolean
  /** Whether the full drawer is open */
  isDrawerOpen: boolean
  /** Whether the mascot is currently streaming */
  isMascotLoading: boolean
  /** Whether the drawer is currently streaming */
  isLoading: boolean
  /** Whether the survey has been completed (skip survey-nudge if so) */
  surveyCompleted?: boolean
  /** Whether proactive suggestions are allowed by AI privacy settings */
  allowSuggestions?: boolean
}

export interface UseRemyNudgesResult {
  /** Current nudge message to display, or null */
  nudgeMessage: string | null
  /** Dismiss the current nudge */
  dismissNudge: () => void
}

export function useRemyNudges(config: UseRemyNudgesConfig): UseRemyNudgesResult {
  const {
    bodyState,
    dispatchBody,
    isMascotChatOpen,
    isDrawerOpen,
    isMascotLoading,
    isLoading,
    surveyCompleted = false,
    allowSuggestions = true,
  } = config

  const [nudgeMessage, setNudgeMessage] = useState<string | null>(null)
  const dismissTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const dismissNudge = useCallback(() => {
    setNudgeMessage(null)
    extendNudgeCooldown()
    if (dismissTimerRef.current) {
      clearTimeout(dismissTimerRef.current)
      dismissTimerRef.current = null
    }
  }, [])

  useEffect(() => {
    if (!allowSuggestions) {
      setNudgeMessage(null)
      if (dismissTimerRef.current) {
        clearTimeout(dismissTimerRef.current)
        dismissTimerRef.current = null
      }
      return
    }

    const interval = setInterval(() => {
      // Safety guards - don't nudge in these situations
      if (isMascotChatOpen || isDrawerOpen) return
      if (isMascotLoading || isLoading) return
      if (bodyState !== 'idle' && bodyState !== 'sleeping') return
      if (nudgeMessage) return // already showing a nudge

      const activity = getSessionActivity()
      const rule = evaluateNudges(activity)

      if (!rule) return

      // Skip survey nudge if survey is already completed
      if (rule.id === 'survey-nudge' && surveyCompleted) return

      const message = rule.message(activity)
      recordNudgeFired(rule.id)
      setNudgeMessage(message)
      dispatchBody({ type: 'NUDGE' })

      // Auto-dismiss after 5 seconds
      dismissTimerRef.current = setTimeout(() => {
        setNudgeMessage(null)
        dismissTimerRef.current = null
      }, NUDGE_DISPLAY_MS)
    }, EVAL_INTERVAL_MS)

    return () => {
      clearInterval(interval)
      if (dismissTimerRef.current) {
        clearTimeout(dismissTimerRef.current)
      }
    }
  }, [
    bodyState,
    dispatchBody,
    isMascotChatOpen,
    isDrawerOpen,
    isMascotLoading,
    isLoading,
    nudgeMessage,
    surveyCompleted,
    allowSuggestions,
  ])

  return { nudgeMessage, dismissNudge }
}
