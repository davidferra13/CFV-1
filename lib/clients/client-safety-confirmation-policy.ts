import type { ClientKnowledgeActor, ClientKnowledgeFieldKey } from './client-knowledge-contract'
import type { ClientFactFreshnessStatus } from './client-data-freshness'

export type ClientSafetyFieldKey =
  | 'allergies'
  | 'dietary_restrictions'
  | 'dietary_protocols'
  | 'kitchen_constraints'
  | 'access_instructions'

export type ClientSafetyActor = Extract<ClientKnowledgeActor, 'client' | 'chef' | 'system'>

export type ClientSafetyConfirmationReasonCode =
  | 'non_safety_field'
  | 'no_meaningful_change'
  | 'safety_field_changed'
  | 'allergy_removed_by_client'
  | 'chef_safety_update'
  | 'system_safety_update'
  | 'stale_safety_fact_near_event'
  | 'unconfirmed_safety_fact_near_event'

export type ClientSafetyConfirmationNextStep =
  | 'none'
  | 'write_profile_fact'
  | 'queue_chef_safety_review'
  | 'confirm_before_event_progression'

export type ClientSafetyConfirmationPolicyInput = {
  fieldKey: ClientKnowledgeFieldKey | string
  oldValue: unknown
  newValue: unknown
  actor: ClientSafetyActor
  freshnessStatus?: ClientFactFreshnessStatus
  daysUntilEvent?: number | null
}

export type ClientSafetyConfirmationDecision = {
  allowWrite: boolean
  requiresChefReview: boolean
  blocksEventProgression: boolean
  shouldNotifyChef: boolean
  reasonCodes: ClientSafetyConfirmationReasonCode[]
  nextStep: ClientSafetyConfirmationNextStep
}

const SAFETY_FIELD_KEYS = new Set<string>([
  'allergies',
  'dietary_restrictions',
  'dietary_protocols',
  'kitchen_constraints',
  'access_instructions',
])

const EVENT_PROGRESSION_REVIEW_WINDOW_DAYS = 14

export function isClientSafetyField(
  fieldKey: ClientKnowledgeFieldKey | string
): fieldKey is ClientSafetyFieldKey {
  return SAFETY_FIELD_KEYS.has(fieldKey)
}

export function decideClientSafetyConfirmation(
  input: ClientSafetyConfirmationPolicyInput
): ClientSafetyConfirmationDecision {
  const reasonCodes: ClientSafetyConfirmationReasonCode[] = []

  if (!isClientSafetyField(input.fieldKey)) {
    return {
      allowWrite: true,
      requiresChefReview: false,
      blocksEventProgression: false,
      shouldNotifyChef: false,
      reasonCodes: ['non_safety_field'],
      nextStep: 'write_profile_fact',
    }
  }

  const meaningfulChange = hasMeaningfulSafetyChange(input.oldValue, input.newValue)
  const nearEvent = isNearEvent(input.daysUntilEvent)
  const freshnessBlockReason = getFreshnessBlockReason(input.freshnessStatus, nearEvent)

  if (!meaningfulChange && !freshnessBlockReason) {
    return {
      allowWrite: true,
      requiresChefReview: false,
      blocksEventProgression: false,
      shouldNotifyChef: false,
      reasonCodes: ['no_meaningful_change'],
      nextStep: 'none',
    }
  }

  if (meaningfulChange) {
    reasonCodes.push('safety_field_changed')
  }

  const allergyRemovedByClient =
    input.fieldKey === 'allergies' &&
    input.actor === 'client' &&
    hasRemovedSafetyValue(input.oldValue, input.newValue)

  if (allergyRemovedByClient) {
    reasonCodes.push('allergy_removed_by_client')
  }

  if (input.actor === 'chef' && meaningfulChange) {
    reasonCodes.push('chef_safety_update')
  }

  if (input.actor === 'system' && meaningfulChange) {
    reasonCodes.push('system_safety_update')
  }

  if (freshnessBlockReason) {
    reasonCodes.push(freshnessBlockReason)
  }

  const requiresChefReview =
    allergyRemovedByClient ||
    (meaningfulChange && (input.actor === 'chef' || input.actor === 'system'))
  const blocksEventProgression = Boolean(freshnessBlockReason)
  const shouldNotifyChef = meaningfulChange || blocksEventProgression

  return {
    allowWrite: true,
    requiresChefReview,
    blocksEventProgression,
    shouldNotifyChef,
    reasonCodes,
    nextStep: pickNextStep(requiresChefReview, blocksEventProgression),
  }
}

export function hasMeaningfulSafetyChange(oldValue: unknown, newValue: unknown): boolean {
  return normalizeSafetyValue(oldValue) !== normalizeSafetyValue(newValue)
}

export function hasRemovedSafetyValue(oldValue: unknown, newValue: unknown): boolean {
  const oldTokens = toSafetyTokens(oldValue)
  const newTokens = toSafetyTokens(newValue)

  if (oldTokens.length === 0) {
    return false
  }

  return oldTokens.some((token) => !newTokens.includes(token))
}

function getFreshnessBlockReason(
  freshnessStatus: ClientFactFreshnessStatus | undefined,
  nearEvent: boolean
): Extract<
  ClientSafetyConfirmationReasonCode,
  'stale_safety_fact_near_event' | 'unconfirmed_safety_fact_near_event'
> | null {
  if (!nearEvent) {
    return null
  }

  if (freshnessStatus === 'stale') {
    return 'stale_safety_fact_near_event'
  }

  if (freshnessStatus === 'unconfirmed') {
    return 'unconfirmed_safety_fact_near_event'
  }

  return null
}

function isNearEvent(daysUntilEvent: number | null | undefined): boolean {
  return (
    typeof daysUntilEvent === 'number' &&
    daysUntilEvent >= 0 &&
    daysUntilEvent <= EVENT_PROGRESSION_REVIEW_WINDOW_DAYS
  )
}

function pickNextStep(
  requiresChefReview: boolean,
  blocksEventProgression: boolean
): ClientSafetyConfirmationNextStep {
  if (blocksEventProgression) {
    return 'confirm_before_event_progression'
  }

  if (requiresChefReview) {
    return 'queue_chef_safety_review'
  }

  return 'write_profile_fact'
}

function normalizeSafetyValue(value: unknown): string {
  return toSafetyTokens(value).join('|')
}

function toSafetyTokens(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.flatMap(toSafetyTokens).filter(Boolean)
  }

  if (value === null || value === undefined) {
    return []
  }

  if (typeof value === 'object') {
    return Object.entries(value)
      .filter(
        ([, entryValue]) => entryValue !== null && entryValue !== undefined && entryValue !== false
      )
      .map(([key, entryValue]) => `${normalizeToken(key)}:${normalizeSafetyValue(entryValue)}`)
      .sort()
  }

  const text = String(value).trim()
  if (!text) {
    return []
  }

  return text
    .split(/[,;\n]+/)
    .map(normalizeToken)
    .filter(Boolean)
    .sort()
}

function normalizeToken(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, ' ')
}
