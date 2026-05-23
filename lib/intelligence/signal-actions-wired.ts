'use server'

/**
 * Intelligence-to-Action Server Actions
 *
 * Wires CIL, Rail, and PIE signals into actionable server-side operations.
 * Builds on top of existing lib/cil/signal-actions.ts, adding:
 *   - getActiveSignals: unified signal feed with mapped actions
 *   - dismissSignal: re-exports from CIL
 *   - executeSignalAction: dispatch to real handlers
 *   - getWeeklyDigest: weekly signal summary
 */

import { requireChef } from '@/lib/auth/get-user'
import { getSignalsForDisplay, dismissSignalAction, actOnSignal } from '@/lib/cil/signal-actions'
import type { ProactiveSignal } from '@/lib/cil/types'
import { mapSignalToAction, getCategoryCounts } from './signal-mapper'
import type { ActionCategory, MappedSignalAction } from './signal-mapper'

// ---- Types ------------------------------------------------------------------

export interface ActiveSignalWithAction {
  signal: ProactiveSignal
  action: MappedSignalAction
}

export interface SignalDigest {
  totalCount: number
  categoryCounts: Record<ActionCategory | 'all', number>
  topSignals: ActiveSignalWithAction[]
  periodLabel: string
}

// ---- Public Actions ---------------------------------------------------------

/**
 * Get all active signals with their mapped actions.
 * Auth-gated, tenant-scoped via requireChef.
 */
export async function getActiveSignals(): Promise<ActiveSignalWithAction[]> {
  await requireChef()

  const signals = await getSignalsForDisplay()

  return signals
    .map((signal) => ({
      signal,
      action: mapSignalToAction(signal),
    }))
    .sort((a, b) => b.signal.urgency - a.signal.urgency)
}

/**
 * Get active signals filtered by category.
 */
export async function getActiveSignalsByCategory(
  category: ActionCategory
): Promise<ActiveSignalWithAction[]> {
  const all = await getActiveSignals()
  return all.filter((item) => item.action.category === category)
}

/**
 * Dismiss a signal. Re-exports CIL dismissal with auth gate.
 */
export async function dismissIntelligenceSignal(signalId: string): Promise<{ success: boolean }> {
  return dismissSignalAction(signalId)
}

/**
 * Execute the suggested action for a signal.
 * Dispatches to the existing CIL action handler which routes
 * to the appropriate real handler (email, notification, etc.).
 */
export async function executeSignalAction(signal: ProactiveSignal): Promise<{ success: boolean }> {
  return actOnSignal(signal)
}

/**
 * Get weekly intelligence digest for dashboard display.
 * Shows signal counts, category breakdown, and top 3 signals.
 */
export async function getWeeklyDigest(): Promise<SignalDigest> {
  await requireChef()

  const signals = await getSignalsForDisplay()

  // Filter to signals from last 7 days
  const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000
  const weeklySignals = signals.filter((s) => s.createdAt > weekAgo)

  const categoryCounts = getCategoryCounts(weeklySignals)

  const topSignals = weeklySignals
    .sort((a, b) => {
      if (b.urgency !== a.urgency) return b.urgency - a.urgency
      return b.confidence - a.confidence
    })
    .slice(0, 3)
    .map((signal) => ({
      signal,
      action: mapSignalToAction(signal),
    }))

  return {
    totalCount: weeklySignals.length,
    categoryCounts,
    topSignals,
    periodLabel: 'This Week',
  }
}

/**
 * Batch dismiss multiple signals at once.
 * For the "dismiss low-priority" bulk action.
 */
export async function batchDismissSignals(signalIds: string[]): Promise<{ dismissed: number }> {
  await requireChef()

  if (!Array.isArray(signalIds) || signalIds.length === 0) {
    return { dismissed: 0 }
  }

  let dismissed = 0
  for (const id of signalIds) {
    try {
      const result = await dismissSignalAction(id)
      if (result.success) dismissed++
    } catch {
      // Non-blocking: skip failed dismissals
    }
  }

  return { dismissed }
}
