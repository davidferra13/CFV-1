import { createServerClient } from '@/lib/db/server'
import type {
  Commitment,
  CommitmentDomain,
  CommitmentOverride,
  CommitmentRule,
  CommitmentSource,
  CommitmentStatus,
  CommitmentSeason,
  FrictionTier,
  OverrideCategory,
} from './types'
import { DOMAIN_DEFAULT_TIERS } from './types'

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 10)
}

function mapRow(row: Record<string, unknown>): Commitment {
  return {
    id: row.id as string,
    tenantId: row.tenant_id as string,
    domain: row.domain as CommitmentDomain,
    source: row.source as CommitmentSource,
    rule: (typeof row.rule === 'string' ? JSON.parse(row.rule) : row.rule) as CommitmentRule,
    status: row.status as CommitmentStatus,
    frictionLevel: row.friction_level as FrictionTier,
    overrideCount: (row.override_count as number) ?? 0,
    lastOverrideAt: row.last_override_at ? new Date(row.last_override_at as string) : null,
    currentStreak: (row.current_streak as number) ?? 0,
    longestStreak: (row.longest_streak as number) ?? 0,
    futureSelfletter: (row.future_self_letter as string) ?? null,
    seasonalProfile: (row.seasonal_profile as CommitmentSeason) ?? null,
    createdAt: new Date(row.created_at as string),
    updatedAt: new Date(row.updated_at as string),
  }
}

function mapOverrideRow(row: Record<string, unknown>): CommitmentOverride {
  return {
    id: row.id as string,
    commitmentId: row.commitment_id as string,
    tenantId: row.tenant_id as string,
    category: (row.category as OverrideCategory) ?? null,
    reason: row.reason as string,
    frictionTierAtOverride: row.friction_tier_at_override as FrictionTier,
    regretPrediction: (row.regret_prediction as number) ?? null,
    context: (row.context as Record<string, unknown>) ?? null,
    createdAt: new Date(row.created_at as string),
  }
}

export async function getActiveCommitments(
  tenantId: string,
  domain?: CommitmentDomain
): Promise<Commitment[]> {
  const client = createServerClient()
  let query = client
    .from('commitments' as any)
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('status', 'active')

  if (domain) {
    query = query.eq('domain', domain)
  }

  const { data, error } = await query

  if (error) {
    console.error('[commitment/engine] getActiveCommitments failed:', error.message)
    return []
  }

  return (data ?? []).map((row: any) => mapRow(row))
}

export async function createCommitment(
  tenantId: string,
  data: {
    domain: CommitmentDomain
    rule: CommitmentRule
    source?: CommitmentSource
    frictionLevel?: FrictionTier
    futureSelfletter?: string
  }
): Promise<Commitment> {
  const client = createServerClient()
  const id = generateId()
  const now = new Date().toISOString()

  const row = {
    id,
    tenant_id: tenantId,
    domain: data.domain,
    source: data.source ?? 'chef_declared',
    rule: data.rule,
    status: 'active',
    friction_level: data.frictionLevel ?? DOMAIN_DEFAULT_TIERS[data.domain],
    override_count: 0,
    last_override_at: null,
    current_streak: 0,
    longest_streak: 0,
    future_self_letter: data.futureSelfletter ?? null,
    seasonal_profile: null,
    created_at: now,
    updated_at: now,
  }

  const { error } = await client.from('commitments' as any).insert(row)

  if (error) {
    throw new Error(`[commitment/engine] createCommitment failed: ${error.message}`)
  }

  return mapRow(row as any)
}

export async function updateCommitment(
  id: string,
  tenantId: string,
  updates: Partial<{
    status: CommitmentStatus
    frictionLevel: FrictionTier
    futureSelfletter: string | null
    seasonalProfile: CommitmentSeason | null
  }>
): Promise<void> {
  const client = createServerClient()
  const dbUpdates: Record<string, unknown> = { updated_at: new Date().toISOString() }

  if (updates.status !== undefined) dbUpdates.status = updates.status
  if (updates.frictionLevel !== undefined) dbUpdates.friction_level = updates.frictionLevel
  if (updates.futureSelfletter !== undefined)
    dbUpdates.future_self_letter = updates.futureSelfletter
  if (updates.seasonalProfile !== undefined) dbUpdates.seasonal_profile = updates.seasonalProfile

  const { error } = await client
    .from('commitments' as any)
    .update(dbUpdates)
    .eq('id', id)
    .eq('tenant_id', tenantId)

  if (error) {
    throw new Error(`[commitment/engine] updateCommitment failed: ${error.message}`)
  }
}

export async function getOverridesForCommitment(
  commitmentId: string,
  tenantId: string
): Promise<CommitmentOverride[]> {
  const client = createServerClient()

  const { data, error } = await client
    .from('commitment_overrides' as any)
    .select('*')
    .eq('commitment_id', commitmentId)
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('[commitment/engine] getOverridesForCommitment failed:', error.message)
    return []
  }

  return (data ?? []).map((row: any) => mapOverrideRow(row))
}

export async function recordOverride(
  commitmentId: string,
  tenantId: string,
  data: {
    category?: OverrideCategory
    reason: string
    frictionTierAtOverride: FrictionTier
    regretPrediction?: number
    context?: Record<string, unknown>
  }
): Promise<CommitmentOverride> {
  const client = createServerClient()
  const id = generateId()
  const now = new Date().toISOString()

  const overrideRow = {
    id,
    commitment_id: commitmentId,
    tenant_id: tenantId,
    category: data.category ?? null,
    reason: data.reason,
    friction_tier_at_override: data.frictionTierAtOverride,
    regret_prediction: data.regretPrediction ?? null,
    context: data.context ?? null,
    created_at: now,
  }

  const { error: insertError } = await client
    .from('commitment_overrides' as any)
    .insert(overrideRow)

  if (insertError) {
    throw new Error(`[commitment/engine] recordOverride insert failed: ${insertError.message}`)
  }

  // Update the parent commitment: increment override_count, set last_override_at, reset streak
  const { data: current } = await client
    .from('commitments' as any)
    .select('override_count')
    .eq('id', commitmentId)
    .eq('tenant_id', tenantId)
    .single()

  const currentCount = (current?.override_count as number) ?? 0

  const { error: updateError } = await client
    .from('commitments' as any)
    .update({
      override_count: currentCount + 1,
      last_override_at: now,
      current_streak: 0,
      updated_at: now,
    })
    .eq('id', commitmentId)
    .eq('tenant_id', tenantId)

  if (updateError) {
    console.error('[commitment/engine] recordOverride update failed:', updateError.message)
  }

  return mapOverrideRow(overrideRow as any)
}
