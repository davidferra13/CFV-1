'use server'

// Reactive Event Layer — Non-Blocking AI Hooks
// PRIVACY: All hooks deal with client PII → enqueue to local Ollama only.
//
// These are NON-BLOCKING side effects. They MUST:
// 1. Never throw — always try/catch
// 2. Never block the main operation
// 3. Log warnings on failure, never errors that propagate
//
// Each hook enqueues a task into the AI task queue. The worker
// processes it asynchronously via Ollama.

import { enqueueTask } from '@/lib/ai/queue/actions'
import { AI_PRIORITY } from '@/lib/ai/queue/types'

// ============================================
// EVENT TRANSITION HOOKS
// ============================================

/**
 * Called when an event transitions to 'confirmed'.
 * Enqueues: staff briefing generation + prep timeline.
 */
export async function onEventConfirmed(
  tenantId: string,
  eventId: string,
  clientId: string | null
): Promise<void> {
  try {
    await enqueueTask({
      tenantId,
      taskType: 'reactive.event_confirmed',
      payload: { eventId, clientId },
      priority: AI_PRIORITY.REACTIVE,
      relatedEventId: eventId,
      relatedClientId: clientId ?? undefined,
    })
  } catch (err) {
    console.warn('[reactive] onEventConfirmed enqueue failed (non-blocking)', err)
  }
}

/**
 * Called when an event transitions to 'completed'.
 * Enqueues: thank-you draft + review request + after-action review.
 */
export async function onEventCompleted(
  tenantId: string,
  eventId: string,
  clientId: string | null
): Promise<void> {
  try {
    await enqueueTask({
      tenantId,
      taskType: 'reactive.event_completed',
      payload: { eventId, clientId },
      priority: AI_PRIORITY.REACTIVE,
      relatedEventId: eventId,
      relatedClientId: clientId ?? undefined,
    })
  } catch (err) {
    console.warn('[reactive] onEventCompleted enqueue failed (non-blocking)', err)
  }
}

/**
 * Called when an event transitions to 'cancelled'.
 * Enqueues: empathetic cancellation response draft.
 */
export async function onEventCancelled(
  tenantId: string,
  eventId: string,
  clientId: string | null
): Promise<void> {
  try {
    await enqueueTask({
      tenantId,
      taskType: 'reactive.event_cancelled',
      payload: { eventId, clientId },
      priority: AI_PRIORITY.REACTIVE,
      relatedEventId: eventId,
      relatedClientId: clientId ?? undefined,
    })
  } catch (err) {
    console.warn('[reactive] onEventCancelled enqueue failed (non-blocking)', err)
  }
}

// ============================================
// INQUIRY HOOKS
// ============================================

/**
 * Called when a new inquiry is created (chef or public form).
 * Enqueues: auto-score lead, notify chef.
 */
export async function onInquiryCreated(
  tenantId: string,
  inquiryId: string,
  clientId: string | null,
  metadata?: {
    channel?: string
    clientName?: string
    occasion?: string
    budgetCents?: number
    budgetMode?: 'exact' | 'range' | 'not_sure' | 'unset'
    budgetRange?: string
    guestCount?: number
  }
): Promise<void> {
  try {
    await enqueueTask({
      tenantId,
      taskType: 'reactive.inquiry_created',
      payload: {
        inquiryId,
        clientId,
        channel: metadata?.channel,
        clientName: metadata?.clientName,
        occasion: metadata?.occasion,
        budgetCents: metadata?.budgetCents,
        budgetMode: metadata?.budgetMode,
        budgetRange: metadata?.budgetRange,
        guestCount: metadata?.guestCount,
      },
      priority: AI_PRIORITY.REACTIVE,
      relatedInquiryId: inquiryId,
      relatedClientId: clientId ?? undefined,
    })
  } catch (err) {
    console.warn('[reactive] onInquiryCreated enqueue failed (non-blocking)', err)
  }
}

// ============================================
// MENU / GUEST HOOKS
// ============================================

/**
 * Called when a menu is approved by the client.
 * Enqueues: allergen risk matrix check.
 */
export async function onMenuApproved(
  tenantId: string,
  eventId: string,
  clientId: string | null
): Promise<void> {
  try {
    await enqueueTask({
      tenantId,
      taskType: 'reactive.menu_approved',
      payload: { eventId, clientId },
      priority: AI_PRIORITY.REACTIVE,
      relatedEventId: eventId,
      relatedClientId: clientId ?? undefined,
    })
  } catch (err) {
    console.warn('[reactive] onMenuApproved enqueue failed (non-blocking)', err)
  }
}

/**
 * Called when a guest list is updated.
 * Enqueues: re-run allergen check with new guest dietary info.
 */
export async function onGuestListUpdated(tenantId: string, eventId: string): Promise<void> {
  try {
    await enqueueTask({
      tenantId,
      taskType: 'reactive.guest_list_updated',
      payload: { eventId },
      priority: AI_PRIORITY.REACTIVE,
      relatedEventId: eventId,
    })
  } catch (err) {
    console.warn('[reactive] onGuestListUpdated enqueue failed (non-blocking)', err)
  }
}

// ============================================
// PAYMENT HOOKS
// ============================================

/**
 * Called when a payment is received (Stripe webhook).
 * Enqueues: update summary, draft confirmation.
 */
export async function onPaymentReceived(
  tenantId: string,
  eventId: string,
  clientId: string | null,
  amountCents: number
): Promise<void> {
  try {
    await enqueueTask({
      tenantId,
      taskType: 'reactive.payment_received',
      payload: { eventId, clientId, amountCents },
      priority: AI_PRIORITY.REACTIVE,
      relatedEventId: eventId,
      relatedClientId: clientId ?? undefined,
    })
  } catch (err) {
    console.warn('[reactive] onPaymentReceived enqueue failed (non-blocking)', err)
  }
}

/**
 * Called when a payment is overdue (>7 days since event accepted).
 * Enqueues: friendly payment reminder draft.
 * Triggered by the scheduled payment_overdue_scanner.
 */
export async function onPaymentOverdue(
  tenantId: string,
  eventId: string,
  clientId: string | null,
  clientName: string
): Promise<void> {
  try {
    await enqueueTask({
      tenantId,
      taskType: 'reactive.payment_overdue',
      payload: { eventId, clientId, clientName },
      priority: AI_PRIORITY.SCHEDULED,
      relatedEventId: eventId,
      relatedClientId: clientId ?? undefined,
    })
  } catch (err) {
    console.warn('[reactive] onPaymentOverdue enqueue failed (non-blocking)', err)
  }
}

// ============================================
// SAFETY HOOKS
// ============================================

/**
 * Called when a temperature log is out of safe range.
 * Enqueues: immediate alert to chef.
 */
export async function onTempOutOfRange(
  tenantId: string,
  eventId: string,
  temperature: number,
  safeMin: number,
  safeMax: number
): Promise<void> {
  try {
    await enqueueTask({
      tenantId,
      taskType: 'reactive.temp_out_of_range',
      payload: { eventId, temperature, safeMin, safeMax },
      priority: AI_PRIORITY.REACTIVE,
      relatedEventId: eventId,
    })
  } catch (err) {
    console.warn('[reactive] onTempOutOfRange enqueue failed (non-blocking)', err)
  }
}

/**
 * Called when a staff member doesn't show up.
 * Enqueues: alert + backup suggestion.
 */
export async function onStaffNoShow(
  tenantId: string,
  eventId: string,
  staffName: string
): Promise<void> {
  try {
    await enqueueTask({
      tenantId,
      taskType: 'reactive.staff_no_show',
      payload: { eventId, staffName },
      priority: AI_PRIORITY.REACTIVE,
      relatedEventId: eventId,
    })
  } catch (err) {
    console.warn('[reactive] onStaffNoShow enqueue failed (non-blocking)', err)
  }
}
