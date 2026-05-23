export type VendorActionSourceType = 'supplier_call' | 'ai_call' | 'scheduled_call'

export type VendorCallOutcome =
  | 'reached'
  | 'voicemail'
  | 'no_answer'
  | 'bad_number'
  | 'unavailable_item'
  | 'confirmed_item'
  | 'confirmed_delivery'
  | 'price_received'
  | 'needs_human_follow_up'

export type VendorCallPlan = {
  vendorName: string | null
  vendorId?: string | null
  purpose: string
  ingredientId?: string | null
  ingredientName?: string | null
  eventId?: string | null
  menuId?: string | null
  allowedRetries: number
  retrySpacingMinutes: number
  activeHours: {
    start: string
    end: string
    timezone: string
  }
  escalationThreshold: number
}

export type VendorCallAttempt = {
  id: string
  attemptedAt: string
  outcome: VendorCallOutcome
  evidence: string
  recordingUrl?: string | null
}

export type VendorCallLoopStatus =
  | 'success'
  | 'retry_ready'
  | 'retry_waiting'
  | 'outside_active_hours'
  | 'exhausted'
  | 'escalated'

export type VendorCallLoopDecision = {
  plan: VendorCallPlan
  outcome: VendorCallOutcome
  status: VendorCallLoopStatus
  attemptsUsed: number
  attemptsRemaining: number
  nextAttemptAt: string | null
  reason: string
  evidence: VendorExtractedActionEvidence
}

export type VendorExtractedActionType =
  | 'update_ingredient_price'
  | 'confirm_availability'
  | 'review_substitution'
  | 'confirm_delivery'
  | 'review_minimum_order'
  | 'resolve_account_terms'
  | 'retry_vendor'
  | 'notify_chef'
  | 'request_quote'
  | 'escalate_manual_call'

export type VendorCallActionExtractionInput = {
  callId: string
  sourceType: VendorActionSourceType
  vendorName?: string | null
  vendorId?: string | null
  eventId?: string | null
  menuId?: string | null
  ingredientId?: string | null
  ingredientName?: string | null
  summary?: string | null
  transcript?: string | null
  recordingUrl?: string | null
  transcriptConfidence?: number | null
  extractedData?: Record<string, unknown> | null
  metadata?: Record<string, unknown>
  callPlan?: Partial<VendorCallPlan> | null
  priorAttempts?: VendorCallAttempt[] | null
  attemptedAt?: string | null
}

export type VendorExtractedActionEvidence = {
  callId: string
  sourceType: VendorActionSourceType
  transcriptSegment: string
  recordingUrl: string | null
  vendorName: string | null
  vendorId: string | null
  eventId: string | null
  menuId: string | null
  ingredientId: string | null
  ingredientName: string | null
  callMetadata: Record<string, unknown>
}

export type VendorExtractedAction = {
  idempotencyKey: string
  actionType: VendorExtractedActionType
  title: string
  detail: string
  taskTitle: string
  taskDescription: string
  priority: 'low' | 'medium' | 'high' | 'urgent'
  confidence: number
  requiresApproval: boolean
  conflictDetected: boolean
  suggestedDueDate: string
  evidence: VendorExtractedActionEvidence
  payload: Record<string, unknown>
}

const MONEY_PATTERN =
  /\$?\b(\d{1,4}(?:\.\d{1,2})?)\b\s*(?:dollars?|bucks|usd)?\s*(?:\/|\s+per\s+)?\s*(lb|lbs|pound|pounds|kg|kilo|each|ea|case|dozen|unit|piece|pieces)?/i
const PRICE_CONTEXT_PATTERN = /\b(price|pricing|quote|quoted|cost|costs|rate|market|per)\b/i
const DELIVERY_PATTERN =
  /\b(deliver(?:y|ed)?|drop(?:off)?|arrive|window)\b.{0,80}\b(today|tomorrow|monday|tuesday|wednesday|thursday|friday|saturday|sunday|\d{1,2}(?::\d{2})?\s*(?:am|pm))(?:\s*(?:-|to|and)\s*(\d{1,2}(?::\d{2})?\s*(?:am|pm)))?/i
const MINIMUM_PATTERN =
  /\b(minimum|min\.?|case only|case quantity|min order|minimum order)\b.{0,80}/i
const TERMS_PATTERN =
  /\b(account|terms|credit|invoice|payment|past due|on hold|cod|net\s*\d+)\b.{0,80}/i
const RETRY_PATTERN =
  /\b(no answer|busy|voicemail|call back|callback|retry|try again|not reachable|closed)\b/i
const SUBSTITUTE_PATTERN =
  /\b(substitute|substitution|instead|alternate|alternative|swap|replace)\b.{0,120}/i
const REQUEST_QUOTE_PATTERN =
  /\b(quote|price list|send pricing|email pricing|request pricing|market price)\b/i
const AVAILABLE_PATTERN = /\b(in stock|available|we have|can get|confirmed|yes\b|on hand)\b/i
const UNAVAILABLE_PATTERN =
  /\b(out of stock|not available|unavailable|cannot get|can't get|no\b(?!\s+answer)|sold out|backordered)\b/i
const BAD_NUMBER_PATTERN =
  /\b(bad number|wrong number|disconnected|not in service|invalid phone|invalid number)\b/i
const HUMAN_FOLLOW_UP_PATTERN = /\bescalate|manual call|human follow[- ]?up\b/i

function normalizeText(value: string | null | undefined) {
  return String(value ?? '')
    .replace(/\s+/g, ' ')
    .trim()
}

function clampConfidence(value: number) {
  return Math.min(0.99, Math.max(0.1, Number.isFinite(value) ? value : 0.7))
}

function todayIsoDate() {
  return new Date().toISOString().slice(0, 10)
}

function sentenceFor(text: string, pattern: RegExp) {
  const sentences = text
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean)
  return sentences.find((sentence) => pattern.test(sentence)) ?? text.slice(0, 260)
}

function titleCase(value: string) {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(' ')
}

function numberFrom(value: unknown, fallback: number) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

function stringFrom(value: unknown, fallback: string) {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback
}

function nullableStringFrom(value: unknown, fallback: string | null = null) {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback
}

function normalizeCallPlan(input: VendorCallActionExtractionInput): VendorCallPlan {
  const metadataPlan =
    input.metadata?.callPlan && typeof input.metadata.callPlan === 'object'
      ? (input.metadata.callPlan as Partial<VendorCallPlan>)
      : {}
  const plan = {
    ...metadataPlan,
    ...(input.callPlan ?? {}),
  }
  const activeHours =
    plan.activeHours && typeof plan.activeHours === 'object' ? plan.activeHours : null

  return {
    vendorName: input.vendorName ?? nullableStringFrom(plan.vendorName),
    vendorId: input.vendorId ?? nullableStringFrom(plan.vendorId),
    purpose: stringFrom(
      plan.purpose,
      input.ingredientName ? `Resolve ${input.ingredientName}` : 'Resolve vendor call'
    ),
    ingredientId: input.ingredientId ?? nullableStringFrom(plan.ingredientId),
    ingredientName: input.ingredientName ?? nullableStringFrom(plan.ingredientName),
    eventId: input.eventId ?? nullableStringFrom(plan.eventId),
    menuId: input.menuId ?? nullableStringFrom(plan.menuId),
    allowedRetries: Math.max(0, Math.floor(numberFrom(plan.allowedRetries, 2))),
    retrySpacingMinutes: Math.max(5, Math.floor(numberFrom(plan.retrySpacingMinutes, 60))),
    activeHours: {
      start: stringFrom(activeHours?.start, '08:00'),
      end: stringFrom(activeHours?.end, '18:00'),
      timezone: stringFrom(activeHours?.timezone, 'America/New_York'),
    },
    escalationThreshold: Math.max(1, Math.floor(numberFrom(plan.escalationThreshold, 3))),
  }
}

function minutesSinceMidnight(value: string) {
  const match = value.match(/^(\d{1,2})(?::(\d{2}))?/)
  if (!match) return null
  const hours = Number(match[1])
  const minutes = Number(match[2] ?? 0)
  if (!Number.isFinite(hours) || !Number.isFinite(minutes) || hours > 23 || minutes > 59) {
    return null
  }
  return hours * 60 + minutes
}

function localMinutesFor(date: Date, timezone: string) {
  try {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).formatToParts(date)
    const hour = Number(parts.find((part) => part.type === 'hour')?.value ?? date.getHours())
    const minute = Number(parts.find((part) => part.type === 'minute')?.value ?? date.getMinutes())
    return hour * 60 + minute
  } catch {
    return date.getHours() * 60 + date.getMinutes()
  }
}

function isWithinActiveHours(plan: VendorCallPlan, now: Date) {
  const start = minutesSinceMidnight(plan.activeHours.start)
  const end = minutesSinceMidnight(plan.activeHours.end)
  if (start === null || end === null || start === end) return true

  const current = localMinutesFor(now, plan.activeHours.timezone)
  return start < end ? current >= start && current < end : current >= start || current < end
}

function metadataStatus(input: VendorCallActionExtractionInput) {
  return String(input.metadata?.status ?? input.extractedData?.status ?? '').toLowerCase()
}

export function classifyVendorCallOutcome(
  input: VendorCallActionExtractionInput
): VendorCallOutcome {
  const explicitOutcome = String(
    input.metadata?.outcome ??
      input.extractedData?.outcome ??
      input.extractedData?.callOutcome ??
      ''
  )
    .toLowerCase()
    .replace(/[\s-]+/g, '_')

  if (
    explicitOutcome === 'reached' ||
    explicitOutcome === 'voicemail' ||
    explicitOutcome === 'no_answer' ||
    explicitOutcome === 'bad_number' ||
    explicitOutcome === 'unavailable_item' ||
    explicitOutcome === 'confirmed_item' ||
    explicitOutcome === 'confirmed_delivery' ||
    explicitOutcome === 'price_received' ||
    explicitOutcome === 'needs_human_follow_up'
  ) {
    return explicitOutcome
  }

  const text = normalizeText([input.summary, input.transcript].filter(Boolean).join('. '))
  const status = metadataStatus(input)
  const result = String(input.extractedData?.availability ?? input.extractedData?.result ?? '')
    .toLowerCase()
    .trim()

  if (BAD_NUMBER_PATTERN.test(text) || status.includes('bad_number')) return 'bad_number'
  if (status === 'voicemail' || /\bvoicemail\b/i.test(text)) return 'voicemail'
  if (
    status === 'no_answer' ||
    status === 'busy' ||
    RETRY_PATTERN.test(text) ||
    (!text && (status === 'failed' || status === 'queued'))
  ) {
    return 'no_answer'
  }
  if (HUMAN_FOLLOW_UP_PATTERN.test(text)) return 'needs_human_follow_up'
  if (UNAVAILABLE_PATTERN.test(text) || result === 'no') return 'unavailable_item'
  if (DELIVERY_PATTERN.test(text)) return 'confirmed_delivery'
  if (findPriceSignal(text) || hasStructuredSignal(input, ['price', 'price_quoted'])) {
    return 'price_received'
  }
  if (AVAILABLE_PATTERN.test(text) || result === 'yes') return 'confirmed_item'
  if (status === 'completed' || text) return 'reached'
  return 'no_answer'
}

function loopOutcomeIsSuccess(outcome: VendorCallOutcome) {
  return (
    outcome === 'reached' ||
    outcome === 'unavailable_item' ||
    outcome === 'confirmed_item' ||
    outcome === 'confirmed_delivery' ||
    outcome === 'price_received'
  )
}

function getLastAttemptAt(input: VendorCallActionExtractionInput, now: Date) {
  const attempts = input.priorAttempts ?? []
  const last = attempts
    .map((attempt) => new Date(attempt.attemptedAt).getTime())
    .filter(Number.isFinite)
    .sort((a, b) => b - a)[0]

  if (last) return new Date(last)
  if (input.attemptedAt) {
    const attemptedAt = new Date(input.attemptedAt)
    if (Number.isFinite(attemptedAt.getTime())) return attemptedAt
  }
  return now
}

export function evaluateVendorCallLoop(
  input: VendorCallActionExtractionInput,
  options: { now?: Date } = {}
): VendorCallLoopDecision {
  const now = options.now ?? new Date()
  const plan = normalizeCallPlan(input)
  const outcome = classifyVendorCallOutcome(input)
  const attemptsUsed = Math.max(1, (input.priorAttempts?.length ?? 0) + 1)
  const attemptsRemaining = Math.max(0, plan.allowedRetries + 1 - attemptsUsed)
  const evidence = buildEvidence(
    input,
    sentenceFor(
      normalizeText(input.transcript ?? input.summary ?? outcome.replace(/_/g, ' ')),
      outcome === 'bad_number'
        ? BAD_NUMBER_PATTERN
        : outcome === 'voicemail' || outcome === 'no_answer'
          ? RETRY_PATTERN
          : HUMAN_FOLLOW_UP_PATTERN
    )
  )

  if (loopOutcomeIsSuccess(outcome)) {
    return {
      plan,
      outcome,
      status: 'success',
      attemptsUsed,
      attemptsRemaining,
      nextAttemptAt: null,
      reason: `Vendor call loop closed after ${outcome.replace(/_/g, ' ')}.`,
      evidence,
    }
  }

  if (outcome === 'bad_number' || outcome === 'needs_human_follow_up') {
    return {
      plan,
      outcome,
      status: 'escalated',
      attemptsUsed,
      attemptsRemaining: 0,
      nextAttemptAt: null,
      reason:
        outcome === 'bad_number'
          ? 'Vendor number cannot be retried safely without human correction.'
          : 'Vendor call needs human follow-up before more automation.',
      evidence,
    }
  }

  if (attemptsUsed >= plan.escalationThreshold || attemptsRemaining === 0) {
    return {
      plan,
      outcome,
      status: 'exhausted',
      attemptsUsed,
      attemptsRemaining: 0,
      nextAttemptAt: null,
      reason: 'Vendor call retry threshold exhausted; escalation is required.',
      evidence,
    }
  }

  const lastAttemptAt = getLastAttemptAt(input, now)
  const nextAttempt = new Date(lastAttemptAt.getTime() + plan.retrySpacingMinutes * 60 * 1000)
  const nextAttemptAt = nextAttempt.toISOString()

  if (!isWithinActiveHours(plan, now)) {
    return {
      plan,
      outcome,
      status: 'outside_active_hours',
      attemptsUsed,
      attemptsRemaining,
      nextAttemptAt,
      reason: `Retry held until vendor active hours ${plan.activeHours.start}-${plan.activeHours.end} ${plan.activeHours.timezone}.`,
      evidence,
    }
  }

  if (nextAttempt.getTime() > now.getTime()) {
    return {
      plan,
      outcome,
      status: 'retry_waiting',
      attemptsUsed,
      attemptsRemaining,
      nextAttemptAt,
      reason: `Retry spacing requires waiting until ${nextAttemptAt}.`,
      evidence,
    }
  }

  return {
    plan,
    outcome,
    status: 'retry_ready',
    attemptsUsed,
    attemptsRemaining,
    nextAttemptAt,
    reason: 'Vendor retry is allowed by spacing, active-hours, and retry-cap policy.',
    evidence,
  }
}

function buildEvidence(
  input: VendorCallActionExtractionInput,
  transcriptSegment: string
): VendorExtractedActionEvidence {
  return {
    callId: input.callId,
    sourceType: input.sourceType,
    transcriptSegment,
    recordingUrl: input.recordingUrl ?? null,
    vendorName: input.vendorName ?? null,
    vendorId: input.vendorId ?? null,
    eventId: input.eventId ?? null,
    menuId: input.menuId ?? null,
    ingredientId: input.ingredientId ?? null,
    ingredientName: input.ingredientName ?? null,
    callMetadata: input.metadata ?? {},
  }
}

function hasStructuredSignal(input: VendorCallActionExtractionInput, keys: string[]) {
  const data = input.extractedData ?? {}
  return keys.some((key) => {
    const value = data[key]
    return value !== undefined && value !== null && String(value).trim() !== ''
  })
}

function findPriceSignal(text: string): RegExpMatchArray | null {
  for (const match of text.matchAll(new RegExp(MONEY_PATTERN.source, 'gi'))) {
    const raw = match[0] ?? ''
    const start = match.index ?? 0
    const context = text.slice(
      Math.max(0, start - 48),
      Math.min(text.length, start + raw.length + 48)
    )
    const hasCurrency = /\$|\b(dollars?|bucks|usd)\b/i.test(raw)
    const hasUnit = !!match[2]
    const hasPriceContext = PRICE_CONTEXT_PATTERN.test(context)

    if (hasCurrency || hasUnit || hasPriceContext) {
      return match
    }
  }

  return null
}

function buildAction(
  input: VendorCallActionExtractionInput,
  actionType: VendorExtractedActionType,
  title: string,
  detail: string,
  options: {
    pattern: RegExp
    confidence: number
    conflictDetected: boolean
    priority?: VendorExtractedAction['priority']
    payload?: Record<string, unknown>
  }
): VendorExtractedAction {
  const vendorLabel = input.vendorName || 'Vendor'
  const ingredientLabel = input.ingredientName ? titleCase(input.ingredientName) : null
  const transcriptSegment = sentenceFor(
    normalizeText(input.transcript ?? input.summary ?? detail),
    options.pattern
  )
  const confidence = clampConfidence(options.confidence)
  const requiresApproval = confidence < 0.75 || options.conflictDetected
  const target = ingredientLabel ? `${ingredientLabel} at ${vendorLabel}` : vendorLabel
  const idempotencyKey = [
    'vendor-call-extraction',
    input.sourceType,
    input.callId,
    actionType,
    ingredientLabel?.toLowerCase() ?? 'general',
  ].join(':')

  return {
    idempotencyKey,
    actionType,
    title,
    detail,
    taskTitle: `${title}: ${target}`,
    taskDescription: detail,
    priority: options.priority ?? (requiresApproval ? 'high' : 'medium'),
    confidence,
    requiresApproval,
    conflictDetected: options.conflictDetected,
    suggestedDueDate: todayIsoDate(),
    evidence: buildEvidence(input, transcriptSegment),
    payload: {
      vendorId: input.vendorId ?? null,
      vendorName: input.vendorName ?? null,
      eventId: input.eventId ?? null,
      menuId: input.menuId ?? null,
      ingredientId: input.ingredientId ?? null,
      ingredientName: input.ingredientName ?? null,
      ...options.payload,
    },
  }
}

export function extractVendorCallActions(
  input: VendorCallActionExtractionInput
): VendorExtractedAction[] {
  const text = normalizeText([input.summary, input.transcript].filter(Boolean).join('. '))
  if (!text && !input.extractedData && !input.metadata?.status) return []

  const loopDecision = evaluateVendorCallLoop(input)
  const baseConfidence = clampConfidence(input.transcriptConfidence ?? 0.82)
  const availabilityConflict = AVAILABLE_PATTERN.test(text) && UNAVAILABLE_PATTERN.test(text)
  const actions: VendorExtractedAction[] = []
  const priceMatch = findPriceSignal(text)
  const hasPrice = !!priceMatch || hasStructuredSignal(input, ['price', 'price_quoted'])
  const hasDelivery = DELIVERY_PATTERN.test(text) || hasStructuredSignal(input, ['deliveryWindow'])
  const hasAvailability =
    AVAILABLE_PATTERN.test(text) || hasStructuredSignal(input, ['availability', 'available'])
  const hasUnavailable = UNAVAILABLE_PATTERN.test(text)

  if (hasPrice) {
    actions.push(
      buildAction(
        input,
        'update_ingredient_price',
        'Review vendor price',
        'Record the quoted vendor price with call evidence before changing ingredient or price records.',
        {
          pattern: MONEY_PATTERN,
          confidence: priceMatch ? baseConfidence + 0.06 : baseConfidence - 0.05,
          conflictDetected: availabilityConflict,
          payload: {
            quotedPrice:
              priceMatch?.[1] ??
              input.extractedData?.price ??
              input.extractedData?.price_quoted ??
              null,
            quotedUnit: priceMatch?.[2] ?? null,
          },
        }
      )
    )
  }

  if (hasAvailability && !hasUnavailable) {
    actions.push(
      buildAction(
        input,
        'confirm_availability',
        'Confirm vendor availability',
        'Confirm item availability from the call and decide whether to lock the vendor for purchasing.',
        {
          pattern: AVAILABLE_PATTERN,
          confidence: baseConfidence,
          conflictDetected: false,
        }
      )
    )
  }

  if (SUBSTITUTE_PATTERN.test(text)) {
    actions.push(
      buildAction(
        input,
        'review_substitution',
        'Review vendor substitution',
        'Review the vendor substitution suggestion before changing menu, ingredient, or event plans.',
        {
          pattern: SUBSTITUTE_PATTERN,
          confidence: baseConfidence - 0.03,
          conflictDetected: availabilityConflict,
          priority: 'high',
        }
      )
    )
  }

  if (hasDelivery) {
    actions.push(
      buildAction(
        input,
        'confirm_delivery',
        'Confirm delivery window',
        'Confirm the delivery window against the event or prep schedule before committing to downstream work.',
        {
          pattern: DELIVERY_PATTERN,
          confidence: baseConfidence + 0.03,
          conflictDetected: availabilityConflict,
          payload: { deliverySignal: sentenceFor(text, DELIVERY_PATTERN) },
        }
      )
    )
  }

  if (MINIMUM_PATTERN.test(text)) {
    actions.push(
      buildAction(
        input,
        'review_minimum_order',
        'Review minimum order',
        'Review minimum-order constraints before changing purchasing quantities or event cost assumptions.',
        {
          pattern: MINIMUM_PATTERN,
          confidence: baseConfidence,
          conflictDetected: availabilityConflict,
        }
      )
    )
  }

  if (TERMS_PATTERN.test(text)) {
    actions.push(
      buildAction(
        input,
        'resolve_account_terms',
        'Resolve account or terms issue',
        'Resolve vendor account, invoice, or payment terms before relying on this vendor for the event.',
        {
          pattern: TERMS_PATTERN,
          confidence: baseConfidence,
          conflictDetected: availabilityConflict,
          priority: 'urgent',
        }
      )
    )
  }

  if (
    RETRY_PATTERN.test(text) ||
    loopDecision.status === 'retry_ready' ||
    loopDecision.status === 'retry_waiting' ||
    loopDecision.status === 'outside_active_hours'
  ) {
    actions.push(
      buildAction(
        input,
        'retry_vendor',
        'Retry vendor call',
        'Retry the vendor or choose an alternate channel because the call did not produce a reliable completed outcome.',
        {
          pattern: RETRY_PATTERN,
          confidence: Math.min(baseConfidence, 0.8),
          conflictDetected: availabilityConflict,
          priority: 'high',
          payload: {
            callLoop: loopDecision,
            nextAttemptAt: loopDecision.nextAttemptAt,
            attemptsRemaining: loopDecision.attemptsRemaining,
          },
        }
      )
    )
  }

  if (REQUEST_QUOTE_PATTERN.test(text) && !hasPrice) {
    actions.push(
      buildAction(
        input,
        'request_quote',
        'Request vendor quote',
        'Request a written quote before changing price, menu, or event assumptions.',
        {
          pattern: REQUEST_QUOTE_PATTERN,
          confidence: baseConfidence,
          conflictDetected: availabilityConflict,
        }
      )
    )
  }

  if (hasUnavailable && !SUBSTITUTE_PATTERN.test(text)) {
    actions.push(
      buildAction(
        input,
        'notify_chef',
        'Notify chef of vendor blocker',
        'Notify the chef that the vendor call surfaced an unresolved sourcing blocker.',
        {
          pattern: UNAVAILABLE_PATTERN,
          confidence: baseConfidence,
          conflictDetected: availabilityConflict,
          priority: 'high',
        }
      )
    )
  }

  if (
    HUMAN_FOLLOW_UP_PATTERN.test(text) ||
    loopDecision.status === 'exhausted' ||
    loopDecision.status === 'escalated'
  ) {
    actions.push(
      buildAction(
        input,
        'escalate_manual_call',
        'Escalate to manual call',
        loopDecision.status === 'exhausted'
          ? 'Escalate this vendor issue because automated retries are exhausted.'
          : 'Escalate this vendor issue to a manual call before mutating operational state.',
        {
          pattern: HUMAN_FOLLOW_UP_PATTERN,
          confidence: baseConfidence,
          conflictDetected: availabilityConflict,
          priority: 'urgent',
          payload: { callLoop: loopDecision },
        }
      )
    )
  }

  const deduped = new Map<string, VendorExtractedAction>()
  for (const action of actions) {
    deduped.set(action.idempotencyKey, action)
  }

  return Array.from(deduped.values()).map((action) => {
    if (!availabilityConflict) return action
    return { ...action, requiresApproval: true, conflictDetected: true, priority: 'high' }
  })
}

export function summarizeVendorExtractedAction(action: VendorExtractedAction) {
  const vendor = action.evidence.vendorName ?? 'vendor'
  const ingredient = action.evidence.ingredientName ? ` for ${action.evidence.ingredientName}` : ''
  const approval = action.requiresApproval ? ' Requires chef approval.' : ''
  return `${action.title}${ingredient} at ${vendor}. ${action.detail}${approval}`
}
