import type {
  ClientKnowledgeInspectorProjection,
  ClientKnowledgeInspectorRow,
} from './client-knowledge-inspector'
import type { ClientKnowledgeAudience, ClientKnowledgeFieldKey } from './client-knowledge-contract'
import type {
  ClientSafetyConfirmationDecision,
  ClientSafetyConfirmationReasonCode,
} from './client-safety-confirmation-policy'

export type ClientKnowledgeReviewPriority = 'high' | 'medium' | 'low'

export type ClientKnowledgeReviewAudience = Extract<
  ClientKnowledgeAudience,
  'chef' | 'client' | 'admin'
>

export type ClientKnowledgeReviewReasonCode =
  | 'missing_value'
  | 'stale_value'
  | 'unconfirmed_value'
  | 'safety_critical_missing'
  | 'safety_critical_stale'
  | 'safety_critical_unconfirmed'
  | 'safety_decision_requires_chef_review'
  | 'safety_decision_blocks_event'
  | 'admin_owned_missing_value'
  | ClientSafetyConfirmationReasonCode

export type ClientKnowledgeReviewItem = {
  fieldKey: ClientKnowledgeFieldKey
  label: string
  priority: ClientKnowledgeReviewPriority
  audience: ClientKnowledgeReviewAudience
  reasonCodes: ClientKnowledgeReviewReasonCode[]
  nextStep: string
  blocking: boolean
}

export type ClientKnowledgeReviewQueueSummary = {
  totalItems: number
  blockingItems: number
  chefItems: number
  clientItems: number
  highPriorityItems: number
}

export type ClientKnowledgeReviewQueue = {
  items: ClientKnowledgeReviewItem[]
  summary: ClientKnowledgeReviewQueueSummary
}

export type ClientKnowledgeSafetyDecisionMap = Partial<
  Record<ClientKnowledgeFieldKey, ClientSafetyConfirmationDecision>
>

export type ClientKnowledgeReviewQueueInput =
  | ClientKnowledgeInspectorProjection
  | ClientKnowledgeInspectorRow[]
  | {
      projection?: ClientKnowledgeInspectorProjection
      rows?: ClientKnowledgeInspectorRow[]
      safetyDecisions?: ClientKnowledgeSafetyDecisionMap
    }

const PRIVATE_CHEF_FIELD_KEYS = new Set<ClientKnowledgeFieldKey>(['private_chef_notes'])

const CLIENT_PROFILE_SOURCE_KEYS = new Set<ClientKnowledgeInspectorRow['sourceOfTruth']>([
  'client_profile',
])

const MEDIUM_CLIENT_MISSING_FIELDS = new Set<ClientKnowledgeFieldKey>([
  'full_name',
  'preferred_name',
  'email',
  'phone',
  'address',
  'access_instructions',
  'parking_instructions',
])

export function projectClientKnowledgeReviewQueue(
  input: ClientKnowledgeReviewQueueInput,
  safetyDecisions: ClientKnowledgeSafetyDecisionMap = {}
): ClientKnowledgeReviewQueue {
  const normalized = normalizeReviewQueueInput(input, safetyDecisions)
  const items = normalized.rows.flatMap((row) =>
    projectReviewItemsForRow(row, normalized.safetyDecisions[row.key])
  )

  return {
    items,
    summary: summarizeClientKnowledgeReviewQueue(items),
  }
}

export function summarizeClientKnowledgeReviewQueue(
  items: ClientKnowledgeReviewItem[]
): ClientKnowledgeReviewQueueSummary {
  return {
    totalItems: items.length,
    blockingItems: items.filter((item) => item.blocking).length,
    chefItems: items.filter((item) => item.audience === 'chef').length,
    clientItems: items.filter((item) => item.audience === 'client').length,
    highPriorityItems: items.filter((item) => item.priority === 'high').length,
  }
}

function normalizeReviewQueueInput(
  input: ClientKnowledgeReviewQueueInput,
  safetyDecisions: ClientKnowledgeSafetyDecisionMap
): {
  rows: ClientKnowledgeInspectorRow[]
  safetyDecisions: ClientKnowledgeSafetyDecisionMap
} {
  if (Array.isArray(input)) {
    return { rows: input, safetyDecisions }
  }

  if ('rows' in input && Array.isArray(input.rows)) {
    const embeddedSafetyDecisions = 'safetyDecisions' in input ? input.safetyDecisions : undefined

    return {
      rows: input.rows,
      safetyDecisions: {
        ...safetyDecisions,
        ...embeddedSafetyDecisions,
      },
    }
  }

  if ('projection' in input && input.projection) {
    return {
      rows: input.projection.rows,
      safetyDecisions: {
        ...safetyDecisions,
        ...input.safetyDecisions,
      },
    }
  }

  return { rows: input.rows ?? [], safetyDecisions }
}

function projectReviewItemsForRow(
  row: ClientKnowledgeInspectorRow,
  safetyDecision: ClientSafetyConfirmationDecision | undefined
): ClientKnowledgeReviewItem[] {
  const items: ClientKnowledgeReviewItem[] = []
  const decisionRequiresChef = Boolean(safetyDecision?.requiresChefReview)
  const decisionBlocks = Boolean(safetyDecision?.blocksEventProgression)

  if (row.isSafetyCritical && shouldChefReviewSafetyRow(row, safetyDecision)) {
    items.push({
      fieldKey: row.key,
      label: row.label,
      priority: 'high',
      audience: 'chef',
      reasonCodes: getChefSafetyReasonCodes(row, safetyDecision),
      nextStep: pickChefSafetyNextStep(row, decisionBlocks),
      blocking: decisionBlocks,
    })
  } else if (decisionRequiresChef || decisionBlocks) {
    items.push({
      fieldKey: row.key,
      label: row.label,
      priority: decisionBlocks ? 'high' : 'medium',
      audience: 'chef',
      reasonCodes: getSafetyDecisionReasonCodes(safetyDecision),
      nextStep: decisionBlocks
        ? 'Confirm this field before event progression.'
        : 'Review the safety decision before syncing downstream.',
      blocking: decisionBlocks,
    })
  }

  if (shouldPromptClientForMissingRow(row)) {
    items.push({
      fieldKey: row.key,
      label: row.label,
      priority: MEDIUM_CLIENT_MISSING_FIELDS.has(row.key) ? 'medium' : 'low',
      audience: 'client',
      reasonCodes: ['missing_value'],
      nextStep: `Ask the client to complete ${row.label.toLowerCase()}.`,
      blocking: false,
    })
  }

  if (shouldCreateAdminItem(row)) {
    items.push({
      fieldKey: row.key,
      label: row.label,
      priority: 'low',
      audience: 'admin',
      reasonCodes: ['admin_owned_missing_value'],
      nextStep: `Review the upstream ${row.sourceOfTruth} record for ${row.label.toLowerCase()}.`,
      blocking: false,
    })
  }

  return items
}

function shouldChefReviewSafetyRow(
  row: ClientKnowledgeInspectorRow,
  safetyDecision: ClientSafetyConfirmationDecision | undefined
): boolean {
  return (
    row.valueState === 'missing' ||
    row.freshnessStatus === 'stale' ||
    row.freshnessStatus === 'unconfirmed' ||
    Boolean(safetyDecision?.requiresChefReview) ||
    Boolean(safetyDecision?.blocksEventProgression)
  )
}

function shouldPromptClientForMissingRow(row: ClientKnowledgeInspectorRow): boolean {
  return (
    row.valueState === 'missing' &&
    !row.isSafetyCritical &&
    row.canClientSee &&
    CLIENT_PROFILE_SOURCE_KEYS.has(row.sourceOfTruth) &&
    !PRIVATE_CHEF_FIELD_KEYS.has(row.key)
  )
}

function shouldCreateAdminItem(row: ClientKnowledgeInspectorRow): boolean {
  return (
    row.valueState === 'missing' &&
    !row.isSafetyCritical &&
    !row.canClientSee &&
    row.visibleAudiences.includes('admin') &&
    row.sourceOfTruth !== 'chef_private'
  )
}

function getChefSafetyReasonCodes(
  row: ClientKnowledgeInspectorRow,
  safetyDecision: ClientSafetyConfirmationDecision | undefined
): ClientKnowledgeReviewReasonCode[] {
  const reasonCodes: ClientKnowledgeReviewReasonCode[] = []

  if (row.valueState === 'missing') {
    reasonCodes.push('missing_value', 'safety_critical_missing')
  }

  if (row.freshnessStatus === 'stale') {
    reasonCodes.push('stale_value', 'safety_critical_stale')
  }

  if (row.freshnessStatus === 'unconfirmed') {
    reasonCodes.push('unconfirmed_value', 'safety_critical_unconfirmed')
  }

  reasonCodes.push(...getSafetyDecisionReasonCodes(safetyDecision))

  return Array.from(new Set(reasonCodes))
}

function getSafetyDecisionReasonCodes(
  safetyDecision: ClientSafetyConfirmationDecision | undefined
): ClientKnowledgeReviewReasonCode[] {
  if (!safetyDecision) {
    return []
  }

  const reasonCodes: ClientKnowledgeReviewReasonCode[] = [...safetyDecision.reasonCodes]

  if (safetyDecision.requiresChefReview) {
    reasonCodes.push('safety_decision_requires_chef_review')
  }

  if (safetyDecision.blocksEventProgression) {
    reasonCodes.push('safety_decision_blocks_event')
  }

  return Array.from(new Set(reasonCodes))
}

function pickChefSafetyNextStep(row: ClientKnowledgeInspectorRow, blocking: boolean): string {
  if (blocking) {
    return 'Confirm this safety field before event progression.'
  }

  if (row.valueState === 'missing') {
    return 'Collect and confirm this safety-critical client detail.'
  }

  return 'Review and confirm this safety-critical client detail.'
}
