'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { dismissNudge, getProactiveNudges, type RemyNudge } from '@/lib/ai/reminder-actions'
import type { BodyEvent } from '@/lib/ai/remy-body-state'

const DISMISSED_KEY = 'cf:remy:drawer-dismissed-nudges'
const REFRESH_MS = 3 * 60_000

function loadDismissedIds(): string[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = window.sessionStorage.getItem(DISMISSED_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed)
      ? parsed.filter((value): value is string => typeof value === 'string')
      : []
  } catch {
    return []
  }
}

function saveDismissedIds(ids: string[]): void {
  if (typeof window === 'undefined') return
  try {
    window.sessionStorage.setItem(DISMISSED_KEY, JSON.stringify(ids))
  } catch {
    // Ignore storage failures.
  }
}

function buildSummary(nudges: RemyNudge[]): string {
  if (nudges.length === 0) return ''

  const highCount = nudges.filter((nudge) => nudge.priority === 'high').length
  if (nudges.length === 1) {
    return highCount > 0
      ? 'Heads up, chef. One urgent item needs attention.'
      : 'Heads up, chef. One useful follow-up is on deck.'
  }

  if (highCount > 0) {
    const followUpCount = nudges.length - highCount
    if (followUpCount === 0) {
      return `Heads up, chef. ${highCount} urgent item${highCount === 1 ? '' : 's'} need attention.`
    }
    return `Heads up, chef. ${highCount} urgent item${highCount === 1 ? '' : 's'} and ${followUpCount} follow-up${followUpCount === 1 ? '' : 's'} are on deck.`
  }

  return `${nudges.length} proactive follow-up${nudges.length === 1 ? '' : 's'} are ready if you want to knock them out.`
}

export interface UseRemyProactiveAlertsConfig {
  enabled: boolean
  dispatchBody?: (event: BodyEvent) => void
}

export interface UseRemyProactiveAlertsResult {
  loading: boolean
  nudges: RemyNudge[]
  summary: string
  dismissAlert: (nudgeId: string) => Promise<void>
  refreshAlerts: () => Promise<void>
}

export function useRemyProactiveAlerts(
  config: UseRemyProactiveAlertsConfig
): UseRemyProactiveAlertsResult {
  const { enabled, dispatchBody } = config
  const [nudges, setNudges] = useState<RemyNudge[]>([])
  const [loading, setLoading] = useState(false)
  const lastFetchAtRef = useRef(0)
  const inFlightRef = useRef(false)

  const refreshAlerts = useCallback(async () => {
    if (!enabled || inFlightRef.current) return
    const now = Date.now()
    if (lastFetchAtRef.current && now - lastFetchAtRef.current < REFRESH_MS) return

    inFlightRef.current = true
    setLoading(true)
    try {
      const dismissedIds = new Set(loadDismissedIds())
      const next = (await getProactiveNudges()).filter((nudge) => !dismissedIds.has(nudge.id))
      setNudges(next)
      lastFetchAtRef.current = now

      if (next.length > 0) {
        dispatchBody?.({ type: 'NUDGE' })
      }
    } catch (error) {
      console.error('[remy] Failed to load proactive alerts:', error)
    } finally {
      inFlightRef.current = false
      setLoading(false)
    }
  }, [dispatchBody, enabled])

  const dismissAlert = useCallback(async (nudgeId: string) => {
    setNudges((current) => current.filter((nudge) => nudge.id !== nudgeId))
    const dismissedIds = new Set(loadDismissedIds())
    dismissedIds.add(nudgeId)
    saveDismissedIds([...dismissedIds])

    try {
      await dismissNudge(nudgeId)
    } catch (error) {
      console.error('[remy] Failed to dismiss proactive alert:', error)
    }
  }, [])

  useEffect(() => {
    if (!enabled) return
    void refreshAlerts()
  }, [enabled, refreshAlerts])

  useEffect(() => {
    if (enabled) return
    setLoading(false)
  }, [enabled])

  const summary = useMemo(() => buildSummary(nudges), [nudges])

  return {
    loading,
    nudges,
    summary,
    dismissAlert,
    refreshAlerts,
  }
}
