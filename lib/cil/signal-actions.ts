'use server'

import { requireChef } from '@/lib/auth/get-user'
import { getProactiveSignals, dismissSignal } from '@/lib/cil/api'
import type { ProactiveSignal, SignalDomain } from '@/lib/cil/types'

/**
 * Get all active proactive signals for the current chef's tenant.
 */
export async function getSignalsForDisplay(): Promise<ProactiveSignal[]> {
  const user = await requireChef()
  // requireChef() throws if tenantId is null, safe to assert
  return getProactiveSignals(user.tenantId as string)
}

/**
 * Get signals filtered to a specific domain.
 */
export async function getSignalsByDomain(domain: string): Promise<ProactiveSignal[]> {
  const user = await requireChef()
  const all = await getProactiveSignals(user.tenantId as string)
  return all.filter((s) => s.domain === (domain as SignalDomain))
}

/**
 * Dismiss a signal by ID. Marks it as dismissed so it no longer appears.
 */
export async function dismissSignalAction(signalId: string): Promise<{ success: boolean }> {
  const user = await requireChef()

  if (!signalId || typeof signalId !== 'string') {
    return { success: false }
  }

  await dismissSignal(user.tenantId as string, signalId)
  return { success: true }
}

/**
 * Act on a signal. Logs the action and marks the signal as acted-upon (dismissed).
 */
export async function actOnSignal(signal: ProactiveSignal): Promise<{ success: boolean }> {
  const user = await requireChef()

  if (!signal || !signal.id) {
    return { success: false }
  }

  // Log the action for analytics
  console.log(
    `[CIL] Signal acted upon: ${signal.id} (${signal.domain}/${signal.actionType}) by tenant ${user.tenantId}`
  )

  // Mark as dismissed after acting
  await dismissSignal(user.tenantId as string, signal.id)
  return { success: true }
}
