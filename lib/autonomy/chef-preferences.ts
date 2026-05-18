'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { buildDefaultAutonomyPreferences } from '@/lib/autonomy/approval-router'
import { getPromotionSuggestions } from '@/lib/autonomy/learning'
import type {
  AutonomyActionPolicy,
  AutonomyDomain,
  AutonomyMode,
  AutonomyPreferences,
  AutonomyRiskLevel,
  PromotionSuggestion,
} from '@/lib/autonomy/types'

export async function getAutonomyPreferences(): Promise<AutonomyPreferences> {
  const user = await requireChef()
  const db: any = createServerClient()
  const defaults = buildDefaultAutonomyPreferences(user.tenantId!)

  const { data, error } = await db
    .from('autonomy_preferences')
    .select('*')
    .eq('tenant_id', user.tenantId!)
    .maybeSingle()

  if (error) {
    throw new Error(`Failed to fetch autonomy preferences: ${error.message}`)
  }

  if (!data) {
    const { error: insertError } = await db.from('autonomy_preferences').insert({
      tenant_id: user.tenantId!,
      default_mode: defaults.defaultMode,
      min_auto_confidence: defaults.minAutoConfidence,
      domain_modes: defaults.domainModes,
      action_policies: defaults.actionPolicies,
      blocked_action_types: defaults.blockedActionTypes,
      allow_high_risk_auto: defaults.allowHighRiskAuto,
      learning_promotion_threshold: defaults.learningPromotionThreshold,
    })

    if (insertError) {
      throw new Error(`Failed to create autonomy preferences: ${insertError.message}`)
    }

    return defaults
  }

  return mapPreferenceRow(data, defaults)
}

export async function getChefAutonomyPreferences(_chefId?: string): Promise<AutonomyPreferences> {
  return getAutonomyPreferences()
}

export async function updateAutonomyPreferences(
  patch: Partial<Omit<AutonomyPreferences, 'tenantId'>>
): Promise<AutonomyPreferences> {
  const user = await requireChef()
  const db: any = createServerClient()
  const current = await getAutonomyPreferences()
  const next: AutonomyPreferences = {
    ...current,
    ...patch,
    tenantId: user.tenantId!,
    minAutoConfidence: clampConfidence(patch.minAutoConfidence ?? current.minAutoConfidence),
    domainModes: patch.domainModes ?? current.domainModes,
    actionPolicies: patch.actionPolicies ?? current.actionPolicies,
    blockedActionTypes: patch.blockedActionTypes ?? current.blockedActionTypes,
  }

  const { error } = await db
    .from('autonomy_preferences')
    .update({
      default_mode: next.defaultMode,
      min_auto_confidence: next.minAutoConfidence,
      domain_modes: next.domainModes,
      action_policies: next.actionPolicies,
      blocked_action_types: next.blockedActionTypes,
      allow_high_risk_auto: next.allowHighRiskAuto,
      learning_promotion_threshold: next.learningPromotionThreshold,
      updated_at: new Date().toISOString(),
    })
    .eq('tenant_id', user.tenantId!)

  if (error) {
    throw new Error(`Failed to update autonomy preferences: ${error.message}`)
  }

  return next
}

export async function updateChefAutonomyPreferences(
  _chefId: string | undefined,
  patch: Partial<Omit<AutonomyPreferences, 'tenantId'>>
): Promise<AutonomyPreferences> {
  return updateAutonomyPreferences(patch)
}

export async function setActionAutonomyMode(input: {
  actionType: string
  mode: AutonomyMode
  minConfidence?: number
  maxRiskLevel?: Exclude<AutonomyRiskLevel, 'restricted'>
}): Promise<AutonomyPreferences> {
  const current = await getAutonomyPreferences()
  const policy: AutonomyActionPolicy = {
    actionType: input.actionType,
    mode: input.mode,
    minConfidence:
      typeof input.minConfidence === 'number' ? clampConfidence(input.minConfidence) : undefined,
    maxRiskLevel: input.maxRiskLevel,
  }

  const actionPolicies = [
    ...current.actionPolicies.filter((item) => item.actionType !== input.actionType),
    policy,
  ]

  return updateAutonomyPreferences({ actionPolicies })
}

export async function setDomainAutonomyMode(input: {
  domain: AutonomyDomain
  mode: AutonomyMode
}): Promise<AutonomyPreferences> {
  const current = await getAutonomyPreferences()
  return updateAutonomyPreferences({
    domainModes: {
      ...current.domainModes,
      [input.domain]: input.mode,
    },
  })
}

export async function getAutonomyLearningSuggestions(): Promise<PromotionSuggestion[]> {
  const user = await requireChef()
  const preferences = await getAutonomyPreferences()

  return getPromotionSuggestions({
    tenantId: user.tenantId!,
    threshold: preferences.learningPromotionThreshold,
  })
}

function mapPreferenceRow(row: any, defaults: AutonomyPreferences): AutonomyPreferences {
  return {
    tenantId: row.tenant_id,
    defaultMode: row.default_mode ?? defaults.defaultMode,
    minAutoConfidence: clampConfidence(row.min_auto_confidence ?? defaults.minAutoConfidence),
    domainModes: row.domain_modes ?? defaults.domainModes,
    actionPolicies: row.action_policies ?? defaults.actionPolicies,
    blockedActionTypes: row.blocked_action_types ?? defaults.blockedActionTypes,
    allowHighRiskAuto: Boolean(row.allow_high_risk_auto ?? defaults.allowHighRiskAuto),
    learningPromotionThreshold:
      Number(row.learning_promotion_threshold ?? defaults.learningPromotionThreshold) || 10,
  }
}

function clampConfidence(value: number): number {
  if (!Number.isFinite(value)) return 0.85
  return Math.min(1, Math.max(0, value))
}
