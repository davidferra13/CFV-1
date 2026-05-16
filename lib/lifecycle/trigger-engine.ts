// Inquiry-to-Booking Trigger Engine
// Deterministic rules that fire actions when lifecycle checkpoints are satisfied.
// NO LLM dependency. Pure state machine logic.

import { createServerClient } from '@/lib/db/server'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ConsentLevel = 'auto' | 'draft' | 'notify'

export type TriggerActionType =
  | 'update_status'
  | 'send_email'
  | 'create_draft'
  | 'start_timer'
  | 'generate_invoice'
  | 'generate_contract'
  | 'surface_payment_link'
  | 'confirm_event'
  | 'send_checklist'
  | 'escalate_response'
  | 'schedule_cadence'
  | 'notify_referrer'
  | 'prompt_referrer_thank_you'

export interface TriggerAction {
  type: TriggerActionType
  label: string
  payload: Record<string, unknown>
}

export interface TriggerRule {
  id: string
  label: string
  /** Condition function: returns true if the trigger should fire */
  condition: (ctx: TriggerContext) => boolean
  /** What action to produce when condition is met */
  action: TriggerAction
  /** Default consent level (chef can override) */
  defaultConsent: ConsentLevel
}

export interface TriggerContext {
  inquiryId: string | null
  eventId: string | null
  chefId: string
  inquiry: Record<string, any> | null
  event: Record<string, any> | null
  criticalPathComplete: boolean
  criticalPathCount: number
  lifecycleStage: number
  quoteStatus: string | null
  contractStatus: string | null
  depositReceived: boolean
  daysTilEvent: number | null
  firstResponseSent: boolean
  hasDateAndCount: boolean
  hasDietary: boolean
  /** Referral tracking */
  hasReferral: boolean
  referralId: string | null
  eventCompleted: boolean
}

export interface TriggerResult {
  triggerId: string
  action: TriggerAction
  consent: ConsentLevel
  fired: boolean
}

// ---------------------------------------------------------------------------
// Trigger Rules (deterministic, ordered by pipeline stage)
// ---------------------------------------------------------------------------

export const TRIGGER_RULES: TriggerRule[] = [
  {
    id: 'fast_track_inquiry',
    label: 'Fast-track inquiry with complete details',
    condition: (ctx) =>
      ctx.inquiry !== null && ctx.hasDateAndCount && ctx.hasDietary && ctx.lifecycleStage <= 2,
    action: {
      type: 'update_status',
      label: 'Flag as fast-track (ready to quote)',
      payload: { flag: 'fast_track', surfaceSampleMenus: true },
    },
    defaultConsent: 'auto',
  },
  {
    id: 'first_response_portal_update',
    label: 'Chef sends first response',
    condition: (ctx) => ctx.firstResponseSent && ctx.lifecycleStage <= 2,
    action: {
      type: 'update_status',
      label: 'Update client portal to Discovery stage',
      payload: { clientStage: 'discovery', portalLabel: 'Your chef is reviewing your request' },
    },
    defaultConsent: 'auto',
  },
  {
    id: 'critical_path_complete_invoice',
    label: 'All critical path items satisfied',
    condition: (ctx) => ctx.criticalPathComplete && !ctx.depositReceived,
    action: {
      type: 'generate_invoice',
      label: 'Auto-generate deposit invoice draft',
      payload: { invoiceType: 'deposit', requiresReview: true },
    },
    defaultConsent: 'draft',
  },
  {
    id: 'quote_sent_timer',
    label: 'Quote sent to client',
    condition: (ctx) => ctx.quoteStatus === 'sent',
    action: {
      type: 'start_timer',
      label: 'Start 48h acceptance timer',
      payload: { timerHours: 48, followUpOnExpiry: true },
    },
    defaultConsent: 'auto',
  },
  {
    id: 'quote_accepted_contract',
    label: 'Quote accepted by client',
    condition: (ctx) => ctx.quoteStatus === 'accepted' && ctx.contractStatus !== 'sent',
    action: {
      type: 'generate_contract',
      label: 'Auto-generate contract from template',
      payload: { templateSource: 'default', notifyChef: true },
    },
    defaultConsent: 'draft',
  },
  {
    id: 'contract_signed_payment',
    label: 'Contract signed by client',
    condition: (ctx) => ctx.contractStatus === 'signed' && !ctx.depositReceived,
    action: {
      type: 'surface_payment_link',
      label: 'Surface deposit payment link to client',
      payload: { paymentType: 'deposit' },
    },
    defaultConsent: 'auto',
  },
  {
    id: 'deposit_received_confirm',
    label: 'Deposit received',
    condition: (ctx) => ctx.depositReceived && ctx.event?.status !== 'confirmed',
    action: {
      type: 'confirm_event',
      label: 'Confirm event and notify circle',
      payload: { notifyCircle: true, sendConfirmationEmail: true },
    },
    defaultConsent: 'auto',
  },
  {
    id: 'deposit_received_cadence',
    label: 'Schedule pre-event confidence cadence',
    condition: (ctx) =>
      ctx.depositReceived && ctx.eventId !== null && ctx.event?.status === 'confirmed',
    action: {
      type: 'schedule_cadence',
      label: 'Schedule confidence cadence emails for event',
      payload: { scheduleType: 'confidence_cadence' },
    },
    defaultConsent: 'auto',
  },
  {
    id: 'pre_event_checklist',
    label: '7 days before event',
    condition: (ctx) => ctx.daysTilEvent !== null && ctx.daysTilEvent <= 7 && ctx.daysTilEvent > 0,
    action: {
      type: 'send_checklist',
      label: 'Send pre-event checklist to client portal',
      payload: { checklistType: 'pre_event', daysOut: 7 },
    },
    defaultConsent: 'auto',
  },
]

// ---------------------------------------------------------------------------
// Trigger Evaluation
// ---------------------------------------------------------------------------

/**
 * Evaluate all triggers against current context.
 * Returns a list of actions that should fire (respecting consent levels).
 */
export function evaluateTriggers(
  ctx: TriggerContext,
  chefConsent?: Map<string, ConsentLevel>
): TriggerResult[] {
  const results: TriggerResult[] = []

  for (const rule of TRIGGER_RULES) {
    const shouldFire = rule.condition(ctx)
    const consent = chefConsent?.get(rule.id) ?? rule.defaultConsent

    results.push({
      triggerId: rule.id,
      action: rule.action,
      consent,
      fired: shouldFire,
    })
  }

  return results
}

// ---------------------------------------------------------------------------
// Context Builder (loads all necessary state from DB)
// ---------------------------------------------------------------------------

export async function buildTriggerContext(
  chefId: string,
  inquiryId: string | null,
  eventId: string | null
): Promise<TriggerContext> {
  const db = createServerClient()

  let inquiry: Record<string, any> | null = null
  let event: Record<string, any> | null = null
  let quoteStatus: string | null = null
  let contractStatus: string | null = null
  let depositReceived = false
  let criticalPathCount = 0
  let criticalPathComplete = false
  let firstResponseSent = false

  // Load inquiry
  if (inquiryId) {
    const { data } = await db
      .from('inquiries')
      .select('*')
      .eq('id', inquiryId)
      .eq('tenant_id', chefId)
      .single()
    inquiry = data
    firstResponseSent = !!inquiry?.first_response_at
  }

  // Resolve event
  const resolvedEventId = eventId || inquiry?.converted_to_event_id || null
  if (resolvedEventId) {
    const { data } = await db
      .from('events')
      .select('*')
      .eq('id', resolvedEventId)
      .eq('tenant_id', chefId)
      .single()
    event = data
  }

  // Check quote status
  if (inquiryId) {
    const { data: quotes } = await db
      .from('quotes')
      .select('status')
      .eq('inquiry_id', inquiryId)
      .eq('tenant_id', chefId)
      .order('created_at', { ascending: false })
      .limit(1)
    if (quotes && quotes.length > 0) {
      quoteStatus = quotes[0].status
    }
  }

  // Check contract status
  if (resolvedEventId) {
    const { data: contracts } = await db
      .from('contracts')
      .select('status')
      .eq('event_id', resolvedEventId)
      .eq('tenant_id', chefId)
      .order('created_at', { ascending: false })
      .limit(1)
    if (contracts && contracts.length > 0) {
      contractStatus = contracts[0].status
    }
  }

  // Check deposit
  if (resolvedEventId) {
    const { data: ledger } = await db
      .from('ledger_entries')
      .select('id')
      .eq('event_id', resolvedEventId)
      .eq('tenant_id', chefId)
      .in('category', ['deposit', 'payment'])
      .limit(1)
    depositReceived = !!(ledger && ledger.length > 0)
  }

  // Critical path count (simplified check)
  const hasDate = !!(inquiry?.confirmed_date || event?.serve_time)
  const hasCount = !!(inquiry?.confirmed_guest_count && inquiry.confirmed_guest_count > 0)
  const hasName = !!inquiry?.contact_name
  const hasContact = !!(inquiry?.contact_email || inquiry?.contact_phone)
  const hasLocation = !!inquiry?.confirmed_location
  const dietary = inquiry?.confirmed_dietary_restrictions
  const hasDietary = Array.isArray(dietary) ? dietary.length > 0 : !!dietary

  const checks = [hasDate, hasCount, hasName, hasContact, hasLocation, hasDietary]
  criticalPathCount = checks.filter(Boolean).length
  criticalPathComplete = criticalPathCount >= 6

  // Days til event
  let daysTilEvent: number | null = null
  const eventDate = event?.event_date || event?.serve_time || inquiry?.confirmed_date
  if (eventDate) {
    const diff = new Date(eventDate).getTime() - Date.now()
    daysTilEvent = Math.ceil(diff / (1000 * 60 * 60 * 24))
  }

  // Lifecycle stage assessment
  let lifecycleStage = 1
  if (firstResponseSent) lifecycleStage = 2
  if (quoteStatus === 'sent' || quoteStatus === 'accepted') lifecycleStage = 3
  if (contractStatus === 'signed') lifecycleStage = 4
  if (depositReceived) lifecycleStage = 5

  return {
    inquiryId,
    eventId: resolvedEventId,
    chefId,
    inquiry,
    event,
    criticalPathComplete,
    criticalPathCount,
    lifecycleStage,
    quoteStatus,
    contractStatus,
    depositReceived,
    daysTilEvent,
    firstResponseSent,
    hasDateAndCount: hasDate && hasCount,
    hasDietary,
    hasReferral: !!(inquiry as any)?.referral_code,
    referralId: (inquiry as any)?.referral_id ?? null,
    eventCompleted: (event as any)?.status === 'completed',
  }
}

// ---------------------------------------------------------------------------
// Load chef consent preferences
// ---------------------------------------------------------------------------

export async function loadChefConsent(chefId: string): Promise<Map<string, ConsentLevel>> {
  const db = createServerClient()
  const consentMap = new Map<string, ConsentLevel>()

  try {
    const { data } = await db
      .from('chef_trigger_consent')
      .select('trigger_id, consent_level')
      .eq('chef_id', chefId)

    if (data) {
      for (const row of data) {
        consentMap.set(row.trigger_id, row.consent_level as ConsentLevel)
      }
    }
  } catch {
    // Table may not exist yet; use defaults
  }

  return consentMap
}
