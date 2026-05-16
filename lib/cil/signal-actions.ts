'use server'

import { requireChef } from '@/lib/auth/get-user'
import { getProactiveSignals, dismissSignal } from '@/lib/cil/api'
import type { ProactiveSignal, SignalDomain } from '@/lib/cil/types'
import { sendPaymentReminder } from '@/lib/invoices/reminder-actions'
import { sendFollowUpDueEmailDelivery } from '@/lib/inquiries/follow-up-delivery'
import { processDueCadenceItems } from '@/lib/communication/cadence-scheduler'
import { createServerClient } from '@/lib/db/server'
import { generateReengagementDraft } from '@/lib/ai/reengagement-draft'
import { createNotification } from '@/lib/notifications/actions'
import { recordSideEffectFailure } from '@/lib/monitoring/non-blocking'

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

    // ── Clients: dormant -> churn re-engagement draft + cadence processing ─
    case 'clients.dormant': {
      const dormantClientId = entityIds[0]
      if (dormantClientId) {
        await scheduleChurnReengagement(tenantId, dormantClientId, signal)
      }
      await processDueCadenceItems()
      break
    }

    // ── Clients: at-risk -> churn-triggered re-engagement outreach ────────
    case 'clients.atRisk': {
      const atRiskClientId = entityIds[0]
      if (atRiskClientId) {
        await scheduleChurnReengagement(tenantId, atRiskClientId, signal)
      }
      await processDueCadenceItems()
      break
    }

    default:
      // Signal types without a wired dispatcher are silently dismissed
      break
  }
}

// ─── Churn Re-Engagement Bridge ───────────────────────────────────────────────

/**
 * When a churn signal fires (dormant or at-risk), create a personalized
 * re-engagement draft in scheduled_messages for chef review. Uses the AI
 * draft generator for personalized copy. Non-blocking: failures are logged
 * but never break the signal pipeline.
 *
 * Dedup: skips if an unsent reengagement draft already exists for this client.
 */
async function scheduleChurnReengagement(
  tenantId: string,
  clientId: string,
  signal: ProactiveSignal
): Promise<void> {
  try {
    const db = createServerClient()

    // Dedup: skip if a pending reengagement draft already exists for this client
    const { data: existing } = await db
      .from('scheduled_messages')
      .select('id')
      .eq('tenant_id', tenantId)
      .eq('client_id', clientId)
      .eq('status', 'draft')
      .eq('channel', 'email')
      .limit(1)

    if (existing && existing.length > 0) return

    // Fetch client info
    const { data: client } = await db
      .from('clients')
      .select('id, full_name, preferred_name, email')
      .eq('id', clientId)
      .eq('tenant_id', tenantId)
      .single()

    if (!client || !client.email) return

    // Fetch chef name
    const { data: chef } = await db
      .from('chefs')
      .select('display_name, business_name')
      .eq('id', tenantId)
      .single()

    const chefName = chef?.display_name || chef?.business_name || 'Your chef'
    const clientName = client.preferred_name || client.full_name || 'there'

    // Get last event info for context
    const { data: lastEvents } = await db
      .from('events')
      .select('occasion, guest_count, event_date')
      .eq('tenant_id', tenantId)
      .eq('client_id', clientId)
      .in('status', ['completed', 'paid'])
      .order('event_date', { ascending: false })
      .limit(1)

    const lastEvent = lastEvents?.[0]
    const daysSince = lastEvent?.event_date
      ? Math.floor((Date.now() - new Date(lastEvent.event_date).getTime()) / (1000 * 60 * 60 * 24))
      : 90

    // Generate AI-personalized draft (non-blocking fallback to static copy)
    const aiDraft = await generateReengagementDraft({
      clientName,
      chefName,
      daysSinceLastEvent: daysSince,
      lastOccasion: lastEvent?.occasion || null,
      lastGuestCount: lastEvent?.guest_count || null,
    })

    const greeting = aiDraft?.greeting || `Hi ${clientName},`
    const bodyText =
      aiDraft?.body ||
      `It has been a while since your last experience with ${chefName}. Whether you are planning a celebration or a quiet dinner, ${chefName} would love to hear from you.`
    const subject =
      signal.source === 'clients.atRisk'
        ? `${chefName} is thinking of you`
        : `${chefName} would love to cook for you again`

    // Insert re-engagement draft for chef review (not auto-sent)
    await db.from('scheduled_messages').insert({
      tenant_id: tenantId,
      client_id: clientId,
      channel: 'email',
      status: 'draft',
      subject,
      body: `${greeting}\n\n${bodyText}\n\nNo pressure at all. Whenever you are ready, your chef is just a message away.`,
      recipient_email: client.email,
      metadata: {
        type: 'reengagement',
        ai_generated: true,
        churn_signal: signal.source,
        days_since_last_event: daysSince,
        last_occasion: lastEvent?.occasion || null,
        signal_detail: signal.detail,
      },
    })

    // Notify chef that a draft is ready
    await createNotification({
      tenantId,
      recipientId: tenantId,
      category: 'client',
      action: 'client_reengagement_draft' as any,
      title: `Re-engagement draft for ${clientName}`,
      body:
        signal.suggestedAction ||
        `${clientName} may be at risk of churning. Review the draft in your message center.`,
      actionUrl: `/clients/${clientId}?tab=messages`,
      clientId,
      metadata: { origin: 'cil', type: 'reengagement', churnSignal: signal.source },
    })
  } catch (err) {
    // Non-blocking: log but never break the signal pipeline
    recordSideEffectFailure({
      source: 'cil',
      operation: 'churn-reengagement-schedule',
      errorMessage: err instanceof Error ? err.message : String(err),
      severity: 'low',
    })
  }
}
