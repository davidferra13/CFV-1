'use server'

import { requireChef } from '@/lib/auth/get-user'
import { getProactiveSignals, dismissSignal } from '@/lib/cil/api'
import type { ProactiveSignal, SignalDomain } from '@/lib/cil/types'
import { sendPaymentReminder } from '@/lib/invoices/reminder-actions'
import { sendFollowUpDueEmailDelivery } from '@/lib/inquiries/follow-up-delivery'
import { processDueCadenceItems } from '@/lib/communication/cadence-scheduler'

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
 * Act on a signal. Dispatches to the appropriate real handler based on
 * signal source, then marks the signal as acted-upon (dismissed).
 */
export async function actOnSignal(signal: ProactiveSignal): Promise<{ success: boolean }> {
  const user = await requireChef()
  const tenantId = user.tenantId as string

  if (!signal || !signal.id) {
    return { success: false }
  }

  // Dispatch to real handlers based on signal source
  try {
    await dispatchSignalAction(signal, tenantId)
  } catch (err) {
    // Signal dispatch failures must not break the scanner or UI.
    // Log and continue to dismiss so the signal does not re-fire endlessly.
    console.error(`[CIL] Dispatch failed for ${signal.source}:`, err)
  }

  // Mark as dismissed after acting
  await dismissSignal(tenantId, signal.id)
  return { success: true }
}

/**
 * Route a signal to the correct communication dispatcher.
 * Each case extracts IDs from entityIds/actionPayload and calls the real handler.
 */
async function dispatchSignalAction(signal: ProactiveSignal, tenantId: string): Promise<void> {
  const { source, entityIds, actionPayload } = signal

  switch (source) {
    // ── Finance: overdue invoices -> payment reminder ──────────────────────
    case 'finance.overdueInvoices': {
      const eventId = entityIds[0]
      if (!eventId) break
      await sendPaymentReminder(eventId, tenantId)
      break
    }

    // ── Pipeline: expiring proposals -> follow-up email to chef ────────────
    case 'pipeline.expiringProposals': {
      const quoteId = (actionPayload?.quoteId as string) || entityIds[0]
      if (!quoteId) break
      // Notify chef about the expiring proposal so they can follow up
      await sendFollowUpDueEmailDelivery({
        tenantId,
        inquiryId: quoteId,
        clientName: signal.detail.split('"')[1] || 'Client',
        occasion: null,
        followUpNote: signal.suggestedAction,
        daysOverdue: 0,
      })
      break
    }

    // ── Pipeline: stale leads -> follow-up cadence email to chef ───────────
    case 'pipeline.staleLeads': {
      const inquiryId = (actionPayload?.inquiryId as string) || entityIds[0]
      if (!inquiryId) break
      await sendFollowUpDueEmailDelivery({
        tenantId,
        inquiryId,
        clientName: 'Lead',
        occasion: null,
        followUpNote: signal.suggestedAction,
        daysOverdue: 1,
      })
      break
    }

    // ── Clients: dormant -> trigger cadence processing for re-engagement ──
    case 'clients.dormant': {
      // Process any due cadence items which includes re-engagement touches
      await processDueCadenceItems()
      break
    }

    // ── Clients: at-risk -> trigger cadence processing for retention ──────
    case 'clients.atRisk': {
      await processDueCadenceItems()
      break
    }

    default:
      // Signal types without a wired dispatcher are silently dismissed
      break
  }
}
