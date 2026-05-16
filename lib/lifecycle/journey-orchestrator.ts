// Journey Orchestrator
// Lightweight state coordinator that ties trigger engine, client notifications,
// and response enforcement into a single pipeline step.
// Called after lifecycle checkpoint updates, inquiry mutations, and quote transitions.

'use server'

import { createServerClient } from '@/lib/db/server'
import { revalidatePath } from 'next/cache'
import {
  buildTriggerContext,
  evaluateTriggers,
  loadChefConsent,
  type TriggerResult,
  type ConsentLevel,
} from './trigger-engine'
import { sendLifecycleStatusNotification } from './client-notifications'
import { executeCadenceTrigger } from './cadence-trigger-handler'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface JourneyEvent {
  type: string
  triggerId: string | null
  action: string
  consent: ConsentLevel
  outcome: 'executed' | 'drafted' | 'notified' | 'skipped'
  timestamp: string
}

export interface OrchestratorResult {
  triggered: TriggerResult[]
  executed: JourneyEvent[]
  stageTransition: { from: number; to: number } | null
}

// ---------------------------------------------------------------------------
// Main Orchestration Entry Point
// ---------------------------------------------------------------------------

/**
 * Run the journey orchestrator for a given inquiry/event.
 * 1. Ensure lifecycle templates are seeded for this chef
 * 2. Build trigger context from current DB state
 * 3. Evaluate all trigger rules
 * 4. Execute actions per consent level
 * 5. Log journey timeline
 * 6. Notify client of stage transitions
 */
export async function orchestrateJourney(
  chefId: string,
  inquiryId: string | null,
  eventId: string | null
): Promise<OrchestratorResult> {
  // Auto-seed lifecycle templates on first orchestration (idempotent, fast path if already seeded)
  try {
    const { ensureTemplateSeeded } = await import('./seed')
    await ensureTemplateSeeded(chefId)
  } catch {
    // Non-blocking: orchestrator can proceed without templates
  }

  const ctx = await buildTriggerContext(chefId, inquiryId, eventId)
  const consent = await loadChefConsent(chefId)
  const triggered = evaluateTriggers(ctx, consent)

  const firedTriggers = triggered.filter((t) => t.fired)
  const executed: JourneyEvent[] = []

  // Track previous stage for transition detection
  const previousStage = await getPreviousStage(chefId, inquiryId, eventId)

  for (const trigger of firedTriggers) {
    // Skip if already executed recently (idempotency)
    const alreadyFired = await checkAlreadyFired(chefId, inquiryId, eventId, trigger.triggerId)
    if (alreadyFired) continue

    let outcome: JourneyEvent['outcome'] = 'skipped'

    switch (trigger.consent) {
      case 'auto':
        outcome = 'executed'
        await executeAction(chefId, inquiryId, eventId, trigger)
        break
      case 'draft':
        outcome = 'drafted'
        await createDraft(chefId, inquiryId, eventId, trigger)
        break
      case 'notify':
        outcome = 'notified'
        await notifyChef(chefId, inquiryId, eventId, trigger)
        break
    }

    const event: JourneyEvent = {
      type: trigger.action.type,
      triggerId: trigger.triggerId,
      action: trigger.action.label,
      consent: trigger.consent,
      outcome,
      timestamp: new Date().toISOString(),
    }

    executed.push(event)
    await logJourneyEvent(chefId, inquiryId, eventId, event)
  }

  // Detect stage transition and notify client
  let stageTransition: OrchestratorResult['stageTransition'] = null
  if (previousStage !== null && previousStage !== ctx.lifecycleStage) {
    stageTransition = { from: previousStage, to: ctx.lifecycleStage }
    await sendLifecycleStatusNotification(chefId, inquiryId, eventId, ctx.lifecycleStage)
    await updateStoredStage(chefId, inquiryId, eventId, ctx.lifecycleStage)
  }

  // Revalidate relevant paths
  if (inquiryId) revalidatePath(`/inquiries/${inquiryId}`)
  revalidatePath('/dashboard')

  return { triggered, executed, stageTransition }
}

// ---------------------------------------------------------------------------
// Action Executors
// ---------------------------------------------------------------------------

async function executeAction(
  chefId: string,
  inquiryId: string | null,
  eventId: string | null,
  trigger: TriggerResult
): Promise<void> {
  const db = createServerClient()

  switch (trigger.action.type) {
    case 'update_status': {
      const { clientStage } = trigger.action.payload as { clientStage?: string }
      if (clientStage && inquiryId) {
        await db.from('journey_state').upsert(
          {
            chef_id: chefId,
            inquiry_id: inquiryId,
            event_id: eventId,
            client_stage_label: clientStage,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'chef_id,inquiry_id' }
        )
      }
      break
    }
    case 'confirm_event': {
      if (eventId) {
        await db
          .from('events')
          .update({ status: 'confirmed', updated_at: new Date().toISOString() })
          .eq('id', eventId)
          .eq('tenant_id', chefId)
      }
      break
    }
    case 'start_timer': {
      const { timerHours } = trigger.action.payload as { timerHours: number }
      if (inquiryId) {
        const expiresAt = new Date(Date.now() + timerHours * 60 * 60 * 1000).toISOString()
        await db.from('journey_timers').upsert(
          {
            chef_id: chefId,
            inquiry_id: inquiryId,
            trigger_id: trigger.triggerId,
            expires_at: expiresAt,
            created_at: new Date().toISOString(),
          },
          { onConflict: 'chef_id,inquiry_id,trigger_id' }
        )
      }
      break
    }
    case 'surface_payment_link': {
      // Payment links are surfaced via client portal; mark as ready
      if (eventId) {
        await db.from('journey_state').upsert(
          {
            chef_id: chefId,
            inquiry_id: inquiryId,
            event_id: eventId,
            payment_link_surfaced: true,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'chef_id,inquiry_id' }
        )
      }
      break
    }
    case 'generate_invoice': {
      if (eventId) {
        const { invoiceType } = trigger.action.payload as {
          invoiceType: string
          requiresReview: boolean
        }
        await db.from('journey_drafts').insert({
          chef_id: chefId,
          inquiry_id: inquiryId,
          event_id: eventId,
          trigger_id: trigger.triggerId,
          action_type: 'generate_invoice',
          action_label: trigger.action.label,
          payload: JSON.stringify({ invoiceType }),
          status: 'pending_review',
          created_at: new Date().toISOString(),
        })
      }
      break
    }
    case 'generate_contract': {
      if (eventId) {
        await db.from('journey_drafts').insert({
          chef_id: chefId,
          inquiry_id: inquiryId,
          event_id: eventId,
          trigger_id: trigger.triggerId,
          action_type: 'generate_contract',
          action_label: trigger.action.label,
          payload: JSON.stringify(trigger.action.payload),
          status: 'pending_review',
          created_at: new Date().toISOString(),
        })
      }
      break
    }
    case 'schedule_cadence': {
      if (eventId) {
        try {
          await executeCadenceTrigger(chefId, eventId, [trigger])
        } catch {
          // Cadence module may not be ready yet; degrade gracefully
        }
      }
      break
    }
    case 'send_checklist': {
      if (eventId) {
        const { checklistType } = trigger.action.payload as {
          checklistType: string
          daysOut: number
        }
        await db.from('journey_state').upsert(
          {
            chef_id: chefId,
            inquiry_id: inquiryId,
            event_id: eventId,
            checklist_surfaced: checklistType,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'chef_id,inquiry_id' }
        )
      }
      break
    }
    default:
      break
  }
}

async function createDraft(
  chefId: string,
  inquiryId: string | null,
  eventId: string | null,
  trigger: TriggerResult
): Promise<void> {
  const db = createServerClient()

  await db.from('journey_drafts').insert({
    chef_id: chefId,
    inquiry_id: inquiryId,
    event_id: eventId,
    trigger_id: trigger.triggerId,
    action_type: trigger.action.type,
    action_label: trigger.action.label,
    payload: JSON.stringify(trigger.action.payload),
    status: 'pending_review',
    created_at: new Date().toISOString(),
  })
}

async function notifyChef(
  chefId: string,
  inquiryId: string | null,
  _eventId: string | null,
  trigger: TriggerResult
): Promise<void> {
  try {
    const { getChefAuthUserId, createNotification } = await import('@/lib/notifications/actions')
    const userId = await getChefAuthUserId(chefId)
    if (userId) {
      await createNotification({
        tenantId: chefId,
        recipientId: userId,
        category: 'inquiry',
        action: 'follow_up_due',
        title: trigger.action.label,
        body: `Action needed for your inquiry pipeline.`,
        inquiryId: inquiryId || undefined,
      })
    }
  } catch {
    // Non-blocking
  }
}

// ---------------------------------------------------------------------------
// Idempotency & State Tracking
// ---------------------------------------------------------------------------

async function checkAlreadyFired(
  chefId: string,
  inquiryId: string | null,
  eventId: string | null,
  triggerId: string
): Promise<boolean> {
  const db = createServerClient()

  try {
    const query = db
      .from('journey_events_log')
      .select('id')
      .eq('chef_id', chefId)
      .eq('trigger_id', triggerId)

    if (inquiryId) query.eq('inquiry_id', inquiryId)
    if (eventId) query.eq('event_id', eventId)

    const { data } = await query.limit(1)
    return !!(data && data.length > 0)
  } catch {
    return false
  }
}

async function getPreviousStage(
  chefId: string,
  inquiryId: string | null,
  _eventId: string | null
): Promise<number | null> {
  if (!inquiryId) return null
  const db = createServerClient()

  try {
    const { data } = await db
      .from('journey_state')
      .select('lifecycle_stage')
      .eq('chef_id', chefId)
      .eq('inquiry_id', inquiryId)
      .single()
    return data?.lifecycle_stage ?? null
  } catch {
    return null
  }
}

async function updateStoredStage(
  chefId: string,
  inquiryId: string | null,
  eventId: string | null,
  stage: number
): Promise<void> {
  if (!inquiryId) return
  const db = createServerClient()

  try {
    await db.from('journey_state').upsert(
      {
        chef_id: chefId,
        inquiry_id: inquiryId,
        event_id: eventId,
        lifecycle_stage: stage,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'chef_id,inquiry_id' }
    )
  } catch {
    // Non-blocking
  }
}

async function logJourneyEvent(
  chefId: string,
  inquiryId: string | null,
  eventId: string | null,
  event: JourneyEvent
): Promise<void> {
  const db = createServerClient()

  try {
    await db.from('journey_events_log').insert({
      chef_id: chefId,
      inquiry_id: inquiryId,
      event_id: eventId,
      trigger_id: event.triggerId,
      action_type: event.type,
      action_label: event.action,
      consent_level: event.consent,
      outcome: event.outcome,
      created_at: event.timestamp,
    })
  } catch {
    // Non-blocking
  }
}
