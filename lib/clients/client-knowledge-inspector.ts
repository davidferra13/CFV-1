import {
  getClientKnowledgeContracts,
  type ClientKnowledgeAudience,
  type ClientKnowledgeFieldKey,
  type ClientKnowledgeSource,
  type ClientKnowledgeSyncTarget,
} from './client-knowledge-contract'
import type {
  ClientDataFreshnessReport,
  ClientFactFreshnessResult,
  ClientFactFreshnessStatus,
} from './client-data-freshness'

export type ClientKnowledgeFactValues = Partial<Record<ClientKnowledgeFieldKey, unknown>>

export type ClientKnowledgeValueState = 'present' | 'missing'

export type ClientKnowledgeInspectorRow = {
  key: ClientKnowledgeFieldKey
  label: string
  sourceOfTruth: ClientKnowledgeSource
  visibleAudiences: ClientKnowledgeAudience[]
  syncTargets: ClientKnowledgeSyncTarget[]
  valueState: ClientKnowledgeValueState
  freshnessStatus: ClientFactFreshnessStatus | null
  isPii: boolean
  isSafetyCritical: boolean
  canClientSee: boolean
  canRemyClientSee: boolean
  needsReview: boolean
}

export type ClientKnowledgeInspectorSummary = {
  totalFacts: number
  missingFacts: number
  safetyCriticalNeedsReview: number
  clientVisibleFacts: number
  remyClientVisibleFacts: number
}

export type ClientKnowledgeInspectorProjection = {
  rows: ClientKnowledgeInspectorRow[]
  summary: ClientKnowledgeInspectorSummary
}

export type ClientKnowledgeInspectorInput = {
  values: ClientKnowledgeFactValues
  freshnessReport?: ClientDataFreshnessReport | null
}

export function inspectClientKnowledge(
  input: ClientKnowledgeInspectorInput
): ClientKnowledgeInspectorProjection {
  const rows = getClientKnowledgeContracts().map((contract) => {
    const valueState: ClientKnowledgeValueState = hasInspectableValue(input.values[contract.key])
      ? 'present'
      : 'missing'
    const freshness = getFreshnessForField(contract.key, input.freshnessReport)
    const canClientSee = canAudienceSeeContractField(contract.visibleTo, 'client', contract.key)
    const canRemyClientSee = canAudienceSeeContractField(
      contract.visibleTo,
      'remy_client',
      contract.key
    )
    const needsReview = shouldReviewField(valueState, contract.safetyCritical, freshness)

    return {
      key: contract.key,
      label: contract.label,
      sourceOfTruth: contract.sourceOfTruth,
      visibleAudiences: [...contract.visibleTo],
      syncTargets: [...contract.syncTargets],
      valueState,
      freshnessStatus: freshness?.status ?? null,
      isPii: contract.containsPii,
      isSafetyCritical: contract.safetyCritical,
      canClientSee,
      canRemyClientSee,
      needsReview,
    }
  })

  return {
    rows,
    summary: summarizeClientKnowledgeRows(rows),
  }
}

export function summarizeClientKnowledgeRows(
  rows: ClientKnowledgeInspectorRow[]
): ClientKnowledgeInspectorSummary {
  return {
    totalFacts: rows.length,
    missingFacts: rows.filter((row) => row.valueState === 'missing').length,
    safetyCriticalNeedsReview: rows.filter((row) => row.isSafetyCritical && row.needsReview).length,
    clientVisibleFacts: rows.filter((row) => row.canClientSee).length,
    remyClientVisibleFacts: rows.filter((row) => row.canRemyClientSee).length,
  }
}

function canAudienceSeeContractField(
  visibleTo: ClientKnowledgeAudience[],
  audience: ClientKnowledgeAudience,
  key: ClientKnowledgeFieldKey
): boolean {
  if (key === 'private_chef_notes' && (audience === 'client' || audience === 'remy_client')) {
    return false
  }

  return visibleTo.includes(audience)
}

function shouldReviewField(
  valueState: ClientKnowledgeValueState,
  isSafetyCritical: boolean,
  freshness: ClientFactFreshnessResult | undefined
): boolean {
  if (valueState === 'missing') {
    return true
  }

  if (freshness && freshness.status !== 'current') {
    return true
  }

  return isSafetyCritical && !freshness
}

function getFreshnessForField(
  key: ClientKnowledgeFieldKey,
  report: ClientDataFreshnessReport | null | undefined
): ClientFactFreshnessResult | undefined {
  const byField = report?.byField as
    | Partial<Record<ClientKnowledgeFieldKey, ClientFactFreshnessResult>>
    | undefined

  return byField?.[key]
}

function hasInspectableValue(value: unknown): boolean {
  if (value === null || value === undefined) {
    return false
  }

  if (typeof value === 'string') {
    return value.trim().length > 0
  }

  if (Array.isArray(value)) {
    return value.length > 0
  }

  if (value instanceof Map || value instanceof Set) {
    return value.size > 0
  }

  if (typeof value === 'object') {
    return Object.keys(value).length > 0
  }

  return true
}
