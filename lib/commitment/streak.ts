import { createServerClient } from '@/lib/db/server'
import type {
  Commitment,
  CommitmentDomain,
  CommitmentSeason,
  CommitmentSource,
  CommitmentStatus,
  CommitmentRule,
  FrictionTier,
} from './types'

const MILESTONE_VALUES = [30, 60, 90, 180, 365]

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

export async function updateAllStreaks(tenantId: string): Promise<number> {
  const client = createServerClient()

  const { data: rows } = await client
    .from('commitments' as any)
    .select('id, current_streak, longest_streak')
    .eq('tenant_id', tenantId)
    .eq('status', 'active')

  if (!rows || rows.length === 0) return 0

  const now = new Date().toISOString()
  let updated = 0

  for (const row of rows) {
    const newStreak = ((row.current_streak as number) ?? 0) + 1
    const currentLongest = (row.longest_streak as number) ?? 0
    const newLongest = Math.max(newStreak, currentLongest)

    const { error } = await client
      .from('commitments' as any)
      .update({
        current_streak: newStreak,
        longest_streak: newLongest,
        updated_at: now,
      })
      .eq('id', row.id)
      .eq('tenant_id', tenantId)

    if (!error) updated++
  }

  return updated
}

export async function resetStreak(commitmentId: string, tenantId: string): Promise<void> {
  const client = createServerClient()

  const { error } = await client
    .from('commitments' as any)
    .update({
      current_streak: 0,
      updated_at: new Date().toISOString(),
    })
    .eq('id', commitmentId)
    .eq('tenant_id', tenantId)

  if (error) {
    console.error('[commitment/streak] resetStreak failed:', error.message)
  }
}

export async function getStreakMilestones(tenantId: string): Promise<Commitment[]> {
  const client = createServerClient()

  const { data: rows } = await client
    .from('commitments' as any)
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('status', 'active')

  if (!rows || rows.length === 0) return []

  return rows
    .filter((row: any) => MILESTONE_VALUES.includes(row.current_streak as number))
    .map((row: any) => mapRow(row))
}
