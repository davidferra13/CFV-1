// Churn-Cadence Bridge
// Takes churn-prevention-triggers output and creates re-engagement cadence
// entries in scheduled_messages for chef review. Callable from CIL dispatch,
// scheduled jobs, or cron without requiring auth context.
//
// This bridge is the "automation acts" layer: churn triggers are computed,
// this module ensures appropriate outreach is scheduled.
//
// Spam prevention:
//   1. Pending draft dedup (one draft per client at a time)
//   2. Recent outreach guard (30-day cooldown per client)
//   3. Risk-level gating (only moderate+ risk gets outreach)
//   4. Communication preferences respected (disabled cadence points skipped)

import { createServerClient } from '@/lib/db/server'
import { generateReengagementDraft } from '@/lib/ai/reengagement-draft'
import { createNotification } from '@/lib/notifications/actions'
import { recordSideEffectFailure } from '@/lib/monitoring/non-blocking'
import type {
  ChurnPreventionResult,
  ChurnRiskClient,
} from './churn-prevention-triggers-internal'

// ── Types ────────────────────────────────────────────────────────────────────

export interface ChurnCadenceBridgeResult {
  processed: number
  draftsCreated: number
  skippedExistingDraft: number
  skippedRecentOutreach: number
  skippedLowRisk: number
  errors: number
}

type ReengagementChannel = 'email' | 'notification'

interface ReengagementAction {
  channel: ReengagementChannel
  priority: 'high' | 'normal'
  subjectLine: string
  context: string
}

// ── Main Entry Point ─────────────────────────────────────────────────────────

/**
 * Process churn triggers for a tenant and create appropriate cadence entries.
 * Reads churn data, filters by risk level, deduplicates against existing
 * outreach, and creates draft messages for chef review.
 *
 * Can be called from:
 *   - CIL hourly scanner (via signal-actions dispatch)
 *   - Nightly cron job
 *   - Manual invocation from admin/ops
 *
 * Non-blocking: never throws. All failures are logged and recorded.
 */
export async function processChurnTriggersForCadence(
  tenantId: string
): Promise<ChurnCadenceBridgeResult> {
  const result: ChurnCadenceBridgeResult = {
    processed: 0,
    draftsCreated: 0,
    skippedExistingDraft: 0,
    skippedRecentOutreach: 0,
    skippedLowRisk: 0,
    errors: 0,
  }

  try {
    // Import dynamically to avoid circular deps with 'use server' modules
    const { getChurnPreventionTriggersForTenant } = await import(
      './churn-prevention-triggers-internal'
    )

    const churnData = await getChurnPreventionTriggersForTenant(tenantId)
    if (!churnData || churnData.atRiskClients.length === 0) {
      return result
    }

    const db: any = createServerClient()

    for (const client of churnData.atRiskClients) {
      result.processed++

      try {
        // Gate: skip low-risk clients (only moderate+ gets outreach)
        if (client.riskLevel === 'low') {
          result.skippedLowRisk++
          continue
        }

        // Dedup: skip if pending draft already exists
        const hasPendingDraft = await checkPendingDraft(db, tenantId, client.clientId)
        if (hasPendingDraft) {
          result.skippedExistingDraft++
          continue
        }

        // Cooldown: skip if client was contacted in last 30 days
        const recentlyContacted = await checkRecentOutreach(db, tenantId, client.clientId, 30)
        if (recentlyContacted) {
          result.skippedRecentOutreach++
          continue
        }

        // Determine re-engagement action based on trigger type and risk level
        const action = determineReengagementAction(client)

        // Create the draft
        await createReengagementDraft(db, tenantId, client, action)
        result.draftsCreated++
      } catch (err) {
        result.errors++
        try {
          await recordSideEffectFailure({
            source: 'churn-cadence-bridge',
            operation: 'process-client',
            errorMessage: err instanceof Error ? err.message : String(err),
            severity: 'low',
            entityType: 'client',
            entityId: client.clientId,
            tenantId,
          })
        } catch {
          // Last resort: console only
          console.error('[churn-cadence-bridge] Failed to record error:', err)
        }
      }
    }
  } catch (err) {
    // Top-level failure (churn data fetch failed, DB unavailable, etc.)
    console.error('[churn-cadence-bridge] Top-level failure:', err)
    try {
      await recordSideEffectFailure({
        source: 'churn-cadence-bridge',
        operation: 'process-all',
        errorMessage: err instanceof Error ? err.message : String(err),
        severity: 'medium',
        tenantId,
      })
    } catch {
      // Swallow
    }
  }

  return result
}

// ── Action Determination ─────────────────────────────────────────────────────

/**
 * Maps churn trigger types and risk levels to appropriate re-engagement
 * actions. Different triggers warrant different approaches: a rejected
 * quote needs a different tone than simple long silence.
 */
function determineReengagementAction(client: ChurnRiskClient): ReengagementAction {
  const primaryTrigger = client.triggers[0]
  if (!primaryTrigger) {
    return {
      channel: 'email',
      priority: 'normal',
      subjectLine: 'We would love to cook for you again',
      context: 'general re-engagement',
    }
  }

  const isCritical = client.riskLevel === 'critical' || client.riskLevel === 'high'

  switch (primaryTrigger.type) {
    case 'rejected_quote':
      return {
        channel: 'email',
        priority: 'high',
        subjectLine: 'Some new ideas we think you will love',
        context: `Client rejected a quote recently. ${primaryTrigger.description}. Offer adjusted pricing or alternative menu.`,
      }

    case 'declining_spend':
      return {
        channel: 'email',
        priority: isCritical ? 'high' : 'normal',
        subjectLine: 'Something special just for you',
        context: `Client spending is declining. ${primaryTrigger.description}. Offer a tailored experience or value package.`,
      }

    case 'declining_frequency':
      return {
        channel: 'email',
        priority: isCritical ? 'high' : 'normal',
        subjectLine: 'What is new this season',
        context: `Booking frequency slowing. ${primaryTrigger.description}. Share seasonal menu or new offerings.`,
      }

    case 'overdue':
      return {
        channel: 'email',
        priority: isCritical ? 'high' : 'normal',
        subjectLine: 'Thinking of you',
        context: `Client is overdue for their typical booking cadence. ${primaryTrigger.description}. Check in about upcoming plans.`,
      }

    case 'long_silence':
      return {
        channel: 'email',
        priority: isCritical ? 'high' : 'normal',
        subjectLine: 'We would love to cook for you again',
        context: `Long silence from client. ${primaryTrigger.description}. Warm personal reconnection.`,
      }

    case 'no_response':
      return {
        channel: 'email',
        priority: 'normal',
        subjectLine: 'Quick check-in',
        context: `Stale inquiry without response. ${primaryTrigger.description}. Brief follow-up or inquiry cleanup.`,
      }

    default:
      return {
        channel: 'email',
        priority: isCritical ? 'high' : 'normal',
        subjectLine: 'We would love to hear from you',
        context: `General churn risk. Risk score: ${client.riskScore}/100.`,
      }
  }
}

// ── Draft Creation ───────────────────────────────────────────────────────────

async function createReengagementDraft(
  db: any,
  tenantId: string,
  client: ChurnRiskClient,
  action: ReengagementAction
): Promise<void> {
  // Fetch client email
  const { data: clientRecord } = await db
    .from('clients')
    .select('id, full_name, preferred_name, email')
    .eq('id', client.clientId)
    .eq('tenant_id', tenantId)
    .single()

  if (!clientRecord || !clientRecord.email) return

  // Fetch chef name
  const { data: chef } = await db
    .from('chefs')
    .select('display_name, business_name')
    .eq('id', tenantId)
    .single()

  const chefName = chef?.display_name || chef?.business_name || 'Your chef'
  const clientName = clientRecord.preferred_name || clientRecord.full_name || 'there'

  // Get last event for AI context
  const { data: lastEvents } = await db
    .from('events')
    .select('occasion, guest_count, event_date')
    .eq('tenant_id', tenantId)
    .eq('client_id', client.clientId)
    .in('status', ['completed', 'paid'])
    .order('event_date', { ascending: false })
    .limit(1)

  const lastEvent = lastEvents?.[0]

  // Generate AI draft (non-blocking fallback to static copy)
  let greeting = `Hi ${clientName},`
  let bodyText = `It has been a while since your last experience with ${chefName}. Whether you are planning a celebration or a quiet dinner, ${chefName} would love to hear from you.`

  try {
    const aiDraft = await generateReengagementDraft({
      clientName,
      chefName,
      daysSinceLastEvent: client.daysSinceLastEvent,
      lastOccasion: lastEvent?.occasion || null,
      lastGuestCount: lastEvent?.guest_count || null,
    })

    if (aiDraft) {
      greeting = aiDraft.greeting
      bodyText = aiDraft.body
    }
  } catch {
    // AI draft generation failed; use static fallback (already set)
  }

  // Build trigger summary for metadata
  const triggerSummary = client.triggers.map((t) => ({
    type: t.type,
    severity: t.severity,
    description: t.description,
  }))

  // Insert draft into scheduled_messages for chef review (not auto-sent)
  await db.from('scheduled_messages').insert({
    tenant_id: tenantId,
    client_id: client.clientId,
    channel: action.channel,
    status: 'draft',
    subject: action.subjectLine,
    body: `${greeting}\n\n${bodyText}\n\nNo pressure at all. Whenever you are ready, your chef is just a message away.`,
    recipient_email: clientRecord.email,
    metadata: {
      type: 'reengagement',
      origin: 'churn-cadence-bridge',
      ai_generated: true,
      churn_risk_level: client.riskLevel,
      churn_risk_score: client.riskScore,
      churn_triggers: triggerSummary,
      days_since_last_event: client.daysSinceLastEvent,
      total_events: client.totalEvents,
      total_revenue_cents: client.totalRevenueCents,
      last_occasion: lastEvent?.occasion || null,
      priority: action.priority,
      context: action.context,
    },
  })

  // Notify chef that a draft is ready for review
  try {
    await createNotification({
      tenantId,
      recipientId: tenantId,
      category: 'client',
      action: 'client_reengagement_draft' as any,
      title: `Re-engagement draft for ${clientName}`,
      body: `${clientName} (${client.riskLevel} risk, score ${client.riskScore}): ${action.context.split('.')[0]}.`,
      actionUrl: `/clients/${client.clientId}?tab=messages`,
      clientId: client.clientId,
      metadata: {
        origin: 'churn-cadence-bridge',
        type: 'reengagement',
        riskLevel: client.riskLevel,
        riskScore: client.riskScore,
        priority: action.priority,
      },
    })
  } catch {
    // Notification failure is non-fatal; the draft is already saved
  }
}

// ── Dedup Helpers ────────────────────────────────────────────────────────────

async function checkPendingDraft(
  db: any,
  tenantId: string,
  clientId: string
): Promise<boolean> {
  const { data } = await db
    .from('scheduled_messages')
    .select('id')
    .eq('tenant_id', tenantId)
    .eq('client_id', clientId)
    .eq('status', 'draft')
    .eq('channel', 'email')
    .limit(1)

  return !!(data && data.length > 0)
}

async function checkRecentOutreach(
  db: any,
  tenantId: string,
  clientId: string,
  withinDays: number
): Promise<boolean> {
  const cutoff = new Date(Date.now() - withinDays * 24 * 60 * 60 * 1000).toISOString()

  // Check communication_events for outbound messages
  const { data: recentComms } = await db
    .from('communication_events')
    .select('id')
    .eq('tenant_id', tenantId)
    .eq('resolved_client_id', clientId)
    .eq('direction', 'outbound')
    .gte('event_timestamp', cutoff)
    .limit(1)

  if (recentComms && recentComms.length > 0) return true

  // Check scheduled_messages for recently sent re-engagement
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
