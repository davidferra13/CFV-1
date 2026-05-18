'use server'

import { requireChef } from '@/lib/auth/get-user'
import { getProactiveSignals, dismissSignal } from '@/lib/cil/api'
import type { ProactiveSignal, SignalDomain } from '@/lib/cil/types'
import { sendPaymentReminder } from '@/lib/invoices/reminder-actions'
import { sendFollowUpDueEmailDelivery } from '@/lib/inquiries/follow-up-delivery'
import { processDueCadenceItems } from '@/lib/communication/cadence-scheduler'
import { processChurnTriggersForCadence } from '@/lib/intelligence/churn-cadence-bridge'
import { createServerClient } from '@/lib/db/server'
import { generateReengagementDraft } from '@/lib/ai/reengagement-draft'
import { createNotification } from '@/lib/notifications/actions'
import { recordSideEffectFailure } from '@/lib/monitoring/non-blocking'
import { buildDedupKey, shouldDispatch, markDispatched } from '@/lib/cil/signal-dedup'
import { autoDispatchDraft } from '@/lib/cil/auto-dispatch'

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

  // Dedup gate: skip if this exact signal was dispatched recently
  const entityId = entityIds[0] || signal.id
  const dedupKey = buildDedupKey(tenantId, source, entityId)
  if (!shouldDispatch(dedupKey, { tenantId, signalType: source })) {
    return
  }
  markDispatched(dedupKey, { tenantId, signalType: source })

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

    // ── Calendar: overload -> flag chef to consider rescheduling ──────────
    case 'calendar.overload': {
      await createNotification({
        tenantId,
        recipientId: tenantId,
        category: 'event',
        action: 'event_status_change' as any,
        title: signal.title,
        body:
          signal.suggestedAction || 'Consider rescheduling or batching prep for this heavy week.',
        actionUrl: (actionPayload?.path as string) || '/calendar',
        metadata: { origin: 'cil', signalSource: source },
      })
      break
    }

    // ── Calendar: dead spots -> suggest outreach to dormant clients ───────
    case 'calendar.deadSpots': {
      await createNotification({
        tenantId,
        recipientId: tenantId,
        category: 'client',
        action: 'client_reengagement_draft' as any,
        title: signal.title,
        body: signal.suggestedAction || 'Reach out to dormant clients to fill empty dates.',
        actionUrl: (actionPayload?.path as string) || '/pipeline',
        metadata: { origin: 'cil', signalSource: source },
      })
      break
    }

    // ── Calendar: booking pace -> informational insight ───────────────────
    case 'calendar.bookingPace': {
      await createNotification({
        tenantId,
        recipientId: tenantId,
        category: 'ops',
        action: 'system_alert' as any,
        title: signal.title,
        body: signal.detail,
        actionUrl: (actionPayload?.path as string) || '/analytics/pipeline',
        metadata: { origin: 'cil', signalSource: source, informational: true },
      })
      break
    }

    // ── Inventory: price spikes -> alert chef about cost increase ─────────
    case 'inventory.priceSpikes': {
      await createNotification({
        tenantId,
        recipientId: tenantId,
        category: 'ops',
        action: 'system_alert' as any,
        title: signal.title,
        body: signal.suggestedAction || 'Ingredient costs spiked. Check vendors or adjust pricing.',
        actionUrl: (actionPayload?.path as string) || '/culinary/ingredients',
        metadata: { origin: 'cil', signalSource: source },
      })
      break
    }

    // ── Inventory: waste patterns -> suggest portion/order adjustments ────
    case 'inventory.wastePatterns': {
      await createNotification({
        tenantId,
        recipientId: tenantId,
        category: 'ops',
        action: 'system_alert' as any,
        title: signal.title,
        body: signal.suggestedAction || 'Reduce order quantities or improve storage to cut waste.',
        actionUrl: (actionPayload?.path as string) || '/culinary/ingredients',
        metadata: { origin: 'cil', signalSource: source },
      })
      break
    }

    // ── Reputation: testimonial opportunity -> prompt chef to request ─────
    case 'reputation.testimonialOpportunity': {
      const reviewEventId = entityIds[0]
      await createNotification({
        tenantId,
        recipientId: tenantId,
        category: 'review',
        action: 'review_received' as any,
        title: signal.title,
        body: signal.suggestedAction || 'Ask this happy client for a publishable testimonial.',
        actionUrl: reviewEventId ? `/events/${reviewEventId}` : '/clients',
        eventId: reviewEventId || undefined,
        metadata: { origin: 'cil', signalSource: source },
      })
      break
    }

    // ── Reputation: rating trend -> surface direction (improving/declining)
    case 'reputation.ratingTrend': {
      await createNotification({
        tenantId,
        recipientId: tenantId,
        category: 'review',
        action: 'review_received' as any,
        title: signal.title,
        body: signal.detail,
        actionUrl: (actionPayload?.path as string) || '/clients/insights',
        metadata: { origin: 'cil', signalSource: source, informational: true },
      })
      break
    }

    // ── Reputation: unreviewed events -> remind chef to follow up ─────────
    case 'reputation.unreviewedEvents': {
      await createNotification({
        tenantId,
        recipientId: tenantId,
        category: 'review',
        action: 'review_received' as any,
        title: signal.title,
        body: signal.suggestedAction || 'Send review requests to recent clients.',
        actionUrl: (actionPayload?.path as string) || '/clients',
        metadata: { origin: 'cil', signalSource: source, eventIds: entityIds },
      })
      break
    }

    // ── Pipeline: unsigned contracts -> notify chef to follow up ────────
    case 'pipeline.unsignedContracts': {
      const contractEventId = entityIds[0]
      await createNotification({
        tenantId,
        recipientId: tenantId,
        category: 'event',
        action: 'event_status_change' as any,
        title: signal.title,
        body: signal.suggestedAction || 'Follow up on unsigned contracts before they expire.',
        actionUrl: contractEventId ? `/events/${contractEventId}` : '/pipeline',
        eventId: contractEventId || undefined,
        metadata: { origin: 'cil', signalSource: source },
      })
      break
    }

    // ── Clients: VIP activity -> notify chef of high-value client action ──
    case 'clients.vipActivity': {
      const vipClientId = entityIds[0]
      await createNotification({
        tenantId,
        recipientId: tenantId,
        category: 'client',
        action: 'client_reengagement_draft' as any,
        title: signal.title,
        body: signal.suggestedAction || 'A VIP client is active. Consider personalized outreach.',
        actionUrl: vipClientId ? `/clients/${vipClientId}` : '/clients',
        clientId: vipClientId || undefined,
        metadata: { origin: 'cil', signalSource: source },
      })
      break
    }

    // ── Clients: rebooking prediction -> notify chef of upcoming window ──
    case 'clients.rebookingPrediction': {
      const predClientId = entityIds[0]
      await createNotification({
        tenantId,
        recipientId: tenantId,
        category: 'client',
        action: 'client_reengagement_draft' as any,
        title: signal.title,
        body: signal.suggestedAction || 'Reach out with availability or a seasonal menu.',
        actionUrl: predClientId ? `/clients/${predClientId}` : '/clients',
        clientId: predClientId || undefined,
        metadata: { origin: 'cil', signalSource: source, informational: true },
      })
      break
    }

    // ── Clients: spending decline -> notify chef of revenue drop ────────
    case 'clients.spendingDecline': {
      const declineClientId = entityIds[0]
      await createNotification({
        tenantId,
        recipientId: tenantId,
        category: 'client',
        action: 'client_reengagement_draft' as any,
        title: signal.title,
        body:
          signal.suggestedAction || 'A client is spending significantly less. Consider outreach.',
        actionUrl: declineClientId ? `/clients/${declineClientId}` : '/clients',
        clientId: declineClientId || undefined,
        metadata: { origin: 'cil', signalSource: source },
      })
      break
    }

    // ── Clients: rebooking overdue -> prompt chef to re-engage ───────────
    case 'clients.rebookingOverdue': {
      const rebookClientId = entityIds[0]
      if (rebookClientId) {
        await scheduleChurnReengagement(tenantId, rebookClientId, signal)
      }
      break
    }

    // ── Churn prevention triggers -> differentiated re-engagement ────────
    // These 6 sources come from the churn-prevention-triggers intelligence
    // module, wired through the CIL clients analyzer. Each trigger type
    // produces a tailored re-engagement draft with context-aware messaging.
    case 'clients.churnOverdue':
    case 'clients.churnDecliningFrequency':
    case 'clients.churnDecliningSpend':
    case 'clients.churnRejectedQuote':
    case 'clients.churnNoResponse':
    case 'clients.churnLongSilence':
    case 'clients.churnGeneric': {
      const churnClientId = entityIds[0]
      if (churnClientId) {
        await scheduleChurnReengagement(tenantId, churnClientId, signal)
      }
      // Also run the batch cadence bridge to catch any at-risk clients
      // not yet surfaced by individual signals. Non-blocking.
      try {
        await processChurnTriggersForCadence(tenantId)
      } catch {
        // Bridge failure must never break signal dispatch
      }
      break
    }

    // ── Finance: revenue trends -> informational insight on revenue direction
    case 'finance.revenueTrends': {
      await createNotification({
        tenantId,
        recipientId: tenantId,
        category: 'ops',
        action: 'system_alert' as any,
        title: signal.title,
        body: signal.detail,
        actionUrl: (actionPayload?.path as string) || '/analytics',
        metadata: { origin: 'cil', signalSource: source, informational: true },
      })
      break
    }

    // ── Finance: expense spikes -> alert chef about cost anomaly ─────────
    case 'finance.expenseSpikes': {
      await createNotification({
        tenantId,
        recipientId: tenantId,
        category: 'ops',
        action: 'system_alert' as any,
        title: signal.title,
        body: signal.suggestedAction || 'Expenses spiked. Review recent purchases.',
        actionUrl: (actionPayload?.path as string) || '/analytics/finance',
        metadata: { origin: 'cil', signalSource: source },
      })
      break
    }

    // ── Commitment: gate override frequency -> notify about pattern ──────
    case 'commitment.gateFrequency': {
      if (signal.urgency >= 3) {
        await createNotification({
          tenantId,
          recipientId: tenantId,
          category: 'ops',
          action: 'system_alert' as any,
          title: signal.title,
          body: signal.suggestedAction || 'A readiness gate is being overridden frequently.',
          actionUrl: (actionPayload?.path as string) || '/calendar',
          metadata: { origin: 'cil', signalSource: source },
        })
      }
      break
    }

    // ── Commitment: time pressure overrides -> urgent prep warning ────────
    case 'commitment.timePressure': {
      await createNotification({
        tenantId,
        recipientId: tenantId,
        category: 'event',
        action: 'event_status_change' as any,
        title: signal.title,
        body:
          signal.suggestedAction ||
          'Multiple overrides under time pressure. Consider earlier prep deadlines.',
        actionUrl: (actionPayload?.path as string) || '/calendar',
        metadata: { origin: 'cil', signalSource: source },
      })
      break
    }

    // ── Commitment: client-correlated overrides -> informational ──────────
    case 'commitment.clientCorrelation': {
      const correlatedClientId = entityIds[0]
      if (signal.urgency >= 3) {
        await createNotification({
          tenantId,
          recipientId: tenantId,
          category: 'client',
          action: 'client_reengagement_draft' as any,
          title: signal.title,
          body: signal.suggestedAction || "Review this client's event patterns.",
          actionUrl: correlatedClientId ? `/clients/${correlatedClientId}` : '/clients',
          clientId: correlatedClientId || undefined,
          metadata: { origin: 'cil', signalSource: source, informational: true },
        })
      }
      break
    }

    // ── Commitment: confidence erosion -> alert about low-confidence overrides
    case 'commitment.confidenceErosion': {
      if (signal.urgency >= 3) {
        await createNotification({
          tenantId,
          recipientId: tenantId,
          category: 'ops',
          action: 'system_alert' as any,
          title: signal.title,
          body:
            signal.suggestedAction ||
            'Override confidence is low. Address blockers instead of bypassing.',
          actionUrl: (actionPayload?.path as string) || '/calendar',
          metadata: { origin: 'cil', signalSource: source },
        })
      }
      break
    }

    // ── Commitment: menu unlocks -> pattern awareness ─────────────────────
    case 'commitment.menuUnlocks': {
      if (signal.urgency >= 3) {
        await createNotification({
          tenantId,
          recipientId: tenantId,
          category: 'ops',
          action: 'system_alert' as any,
          title: signal.title,
          body: signal.suggestedAction || 'Menus are being unlocked frequently after finalization.',
          actionUrl: (actionPayload?.path as string) || '/menus',
          metadata: { origin: 'cil', signalSource: source },
        })
      }
      break
    }

    default:
      // Signal types without a wired dispatcher are silently dismissed
      break
  }

  // Non-blocking: generate actionable draft if signal type supports it.
  // Chef reviews and approves before anything sends.
  try {
    await autoDispatchDraft(signal, tenantId)
  } catch {
    // Draft generation failure must never break signal dispatch
  }

  // Non-blocking: bridge signal to outbound communication channels.
  // Creates a notification with a valid action type so channel-router
  // can deliver via email, push, and/or SMS. Has its own 24h dedup
  // layer on top of the 1h signal dedup above.
  try {
    const { bridgeSignalToComm } = await import('@/lib/cil/signal-comm-bridge')
    await bridgeSignalToComm(signal, tenantId)
  } catch (err) {
    console.error('[CIL] signal-comm-bridge failed (non-blocking):', err)
  }

  // Non-blocking: generate social post drafts from qualifying signals.
  // Chef reviews before publishing.
  try {
    const { processSocialSignals, persistSocialDrafts } = await import('@/lib/cil/social-bridge')
    const socialDrafts = await processSocialSignals([signal], tenantId)
    if (socialDrafts.length > 0) {
      await persistSocialDrafts(socialDrafts, tenantId, tenantId)
    }
  } catch {
    // Social draft generation failure must never break signal dispatch
  }
}

// ─── Churn Re-Engagement Bridge ───────────────────────────────────────────────

/**
 * When a churn signal fires (dormant, at-risk, or churn-prevention-trigger),
 * create a personalized re-engagement draft in scheduled_messages for chef
 * review. Uses the AI draft generator for personalized copy. Non-blocking:
 * failures are logged but never break the signal pipeline.
 *
 * Spam prevention (3 layers):
 *   1. Pending draft dedup: skips if an unsent reengagement draft exists
 *   2. 30-day outreach guard: skips if client was contacted in last 30 days
 *      (checks both communication_events and sent scheduled_messages)
 *   3. Signal-level dedup via buildDedupKey/shouldDispatch upstream
 */
async function scheduleChurnReengagement(
  tenantId: string,
  clientId: string,
  signal: ProactiveSignal
): Promise<void> {
  try {
    const db = createServerClient()

    // Layer 1: skip if a pending reengagement draft already exists for this client
    const { data: existing } = await db
      .from('scheduled_messages')
      .select('id')
      .eq('tenant_id', tenantId)
      .eq('client_id', clientId)
      .eq('status', 'draft')
      .eq('channel', 'email')
      .limit(1)

    if (existing && existing.length > 0) return

    // Layer 2: 30-day recent outreach guard (prevents spam)
    const recentlySent = await wasRecentlyContacted(db, tenantId, clientId, 30)
    if (recentlySent) return

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

    // Differentiated subject lines based on churn trigger type
    const subject = getChurnSubjectLine(signal.source, chefName)

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
        churn_trigger_type: (signal.actionPayload?.churnTriggerType as string) || null,
        churn_risk_level: (signal.actionPayload?.churnRiskLevel as string) || null,
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

/**
 * Check if a client was contacted within the last N days.
 * Checks two sources:
 *   1. communication_events: outbound messages (email, SMS) to this client
 *   2. scheduled_messages: sent re-engagement drafts for this client
 * Returns true if any outreach was found, preventing spam.
 */
async function wasRecentlyContacted(
  db: ReturnType<typeof createServerClient>,
  tenantId: string,
  clientId: string,
  withinDays: number
): Promise<boolean> {
  const cutoff = new Date(Date.now() - withinDays * 24 * 60 * 60 * 1000).toISOString()

  // Check communication_events for outbound messages to this client
  const { data: recentComms } = await db
    .from('communication_events')
    .select('id')
    .eq('tenant_id', tenantId)
    .eq('resolved_client_id', clientId)
    .eq('direction', 'outbound')
    .gte('event_timestamp', cutoff)
    .limit(1)

  if (recentComms && recentComms.length > 0) return true

  // Check scheduled_messages for recently sent re-engagement to this client
  const { data: recentSent } = await db
    .from('scheduled_messages')
    .select('id')
    .eq('tenant_id', tenantId)
    .eq('client_id', clientId)
    .eq('status', 'sent')
    .gte('sent_at', cutoff)
    .limit(1)

  return !!(recentSent && recentSent.length > 0)
}

/**
 * Returns a differentiated email subject line based on which churn trigger
 * type fired. Different triggers warrant different tones: a rejected quote
 * needs a different approach than simple long silence.
 */
function getChurnSubjectLine(signalSource: string, chefName: string): string {
  switch (signalSource) {
    case 'clients.churnRejectedQuote':
      return `${chefName} has some new ideas for you`
    case 'clients.churnDecliningSpend':
      return `Something special from ${chefName}`
    case 'clients.churnDecliningFrequency':
      return `What is new with ${chefName}`
    case 'clients.churnOverdue':
      return `${chefName} is thinking of you`
    case 'clients.churnLongSilence':
      return `${chefName} would love to cook for you again`
    case 'clients.churnNoResponse':
      return `Quick check-in from ${chefName}`
    case 'clients.atRisk':
      return `${chefName} is thinking of you`
    default:
      return `${chefName} would love to cook for you again`
  }
}

// ─── Pre-Deposit Inquiry Escalation ─────────────────────────────────────────

/**
 * Process open (pre-deposit) inquiries for response escalation.
 * Wires computeEscalation thresholds to scheduled_messages:
 *   - remy_draft (24h+): creates holding-message draft for chef review
 *   - auto_send (72h+): sends holding message if chef has auto-response on
 *
 * Spam prevention: skips if draft exists, or chef communicated in last 24h.
 * Called by cron ticker.
 */
export async function processPreDepositEscalation(): Promise<{
  drafted: number
  sent: number
  skipped: number
}> {
  const db = createServerClient()
  let drafted = 0
  let sent = 0
  let skipped = 0

  const { computeEscalation } = await import('@/lib/inquiries/response-escalation')

  const { data: openInquiries } = await db
    .from('inquiries')
    .select('id, tenant_id, client_id, created_at, last_outbound_at')
    .eq('status', 'new')
    .limit(200)

  if (!openInquiries || openInquiries.length === 0) {
    return { drafted: 0, sent: 0, skipped: 0 }
  }

  for (const inquiry of openInquiries) {
    try {
      const state = computeEscalation(inquiry.last_outbound_at, inquiry.created_at, false)

      if (!state.shouldDraftHoldingMessage) {
        skipped++
        continue
      }

      const { data: existingDraft } = await db
        .from('scheduled_messages')
        .select('id')
        .eq('tenant_id', inquiry.tenant_id)
        .eq('context_type', 'inquiry')
        .eq('context_id', inquiry.id)
        .in('status', ['draft', 'scheduled'])
        .limit(1)

      if (existingDraft && existingDraft.length > 0) {
        skipped++
        continue
      }

      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
      const { data: recentComm } = await db
        .from('communication_events')
        .select('id')
        .eq('tenant_id', inquiry.tenant_id)
        .eq('direction', 'outbound')
        .gte('event_timestamp', oneDayAgo)
        .limit(1)

      if (recentComm && recentComm.length > 0) {
        skipped++
        continue
      }

      if (!inquiry.client_id) {
        skipped++
        continue
      }

      const { data: client } = await db
        .from('clients')
        .select('full_name, email')
        .eq('id', inquiry.client_id)
        .single()

      if (!client?.email) {
        skipped++
        continue
      }

      const { data: chef } = await db
        .from('chefs')
        .select('display_name, business_name')
        .eq('id', inquiry.tenant_id)
        .single()

      const chefName = chef?.display_name || chef?.business_name || 'Your chef'
      const clientFirst = (client.full_name || '').split(' ')[0] || 'there'

      const { data: arConfig } = await db
        .from('auto_response_config')
        .select('enabled')
        .eq('chef_id', inquiry.tenant_id)
        .eq('enabled', true)
        .maybeSingle()

      const autoSendEnabled = !!arConfig && state.shouldAutoSend

      const holdingBody = `Hi ${clientFirst},\n\nJust wanted to let you know ${chefName} received your inquiry and is reviewing the details. You will hear back soon with next steps.\n\nThank you for your patience!`

      if (autoSendEnabled) {
        await db.from('scheduled_messages').insert({
          tenant_id: inquiry.tenant_id,
          client_id: inquiry.client_id,
          channel: 'email',
          status: 'scheduled',
          subject: `Update from ${chefName}`,
          body: holdingBody,
          recipient_email: client.email,
          scheduled_for: new Date().toISOString(),
          context_type: 'inquiry',
          context_id: inquiry.id,
          metadata: { type: 'escalation_holding', level: state.level, auto: true },
        })
        sent++
      } else {
        await db.from('scheduled_messages').insert({
          tenant_id: inquiry.tenant_id,
          client_id: inquiry.client_id,
          channel: 'email',
          status: 'draft',
          subject: `Update from ${chefName}`,
          body: holdingBody,
          recipient_email: client.email,
          context_type: 'inquiry',
          context_id: inquiry.id,
          metadata: { type: 'escalation_holding', level: state.level, auto: false },
        })
        drafted++
      }
    } catch (err) {
      console.error('[CIL] Pre-deposit escalation error for inquiry', inquiry.id, err)
      skipped++
    }
  }

  return { drafted, sent, skipped }
}
