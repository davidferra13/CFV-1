'use server'

import { createServerClient } from '@/lib/db/server'
import { requireChef } from '@/lib/auth/get-user'

export async function computeAndStoreMomentum() {
  const chef = await requireChef()
  const tenantId = chef.tenantId!
  const db: any = createServerClient()

  const now = new Date()
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
  const _a90 = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 90)
  const ago90 = `${_a90.getFullYear()}-${String(_a90.getMonth() + 1).padStart(2, '0')}-${String(_a90.getDate()).padStart(2, '0')}`
  const _a365 = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate())
  const ago365str = `${_a365.getFullYear()}-${String(_a365.getMonth() + 1).padStart(2, '0')}-${String(_a365.getDate()).padStart(2, '0')}`

  // new_clients_90d
  const { count: newClients90d } = await db
    .from('clients')
    .select('id', { count: 'exact', head: true })
    .eq('tenant_id', tenantId)
    .gte('created_at', ago90)

  // education_entries_12m
  const { count: educationEntries12m } = await db
    .from('chef_education_log')
    .select('id', { count: 'exact', head: true })
    .eq('tenant_id', tenantId)
    .gte('entry_date', ago365str)

  // creative_projects_90d
  const { count: creativeProjects90d } = await db
    .from('chef_creative_projects')
    .select('id', { count: 'exact', head: true })
    .eq('tenant_id', tenantId)
    .gte('entry_date', ago90)

  // avg_satisfaction_90d
  const { data: checkins } = await db
    .from('chef_growth_checkins')
    .select('satisfaction_score')
    .eq('tenant_id', tenantId)
    .gte('checkin_date', ago90)

  const scores: number[] = (checkins ?? [])
    .map((c: { satisfaction_score: number }) => c.satisfaction_score)
    .filter((s: number) => s != null)

  const avgSatisfaction90d =
    scores.length > 0
      ? parseFloat((scores.reduce((a: number, b: number) => a + b, 0) / scores.length).toFixed(1))
      : null

  // momentum_direction
  const edu = educationEntries12m ?? 0
  const creative = creativeProjects90d ?? 0

  let momentumDirection: 'growing' | 'maintaining' | 'stagnating'
  if (edu >= 4 && creative >= 2) {
    momentumDirection = 'growing'
  } else if (edu === 0 && creative === 0) {
    momentumDirection = 'stagnating'
  } else {
    momentumDirection = 'maintaining'
  }

  const { error } = await db.from('chef_momentum_snapshots').upsert(
    {
      tenant_id: tenantId,
      snapshot_date: today,
      new_clients_90d: newClients90d ?? 0,
      education_entries_12m: edu,
      creative_projects_90d: creative,
      avg_satisfaction_90d: avgSatisfaction90d,
      momentum_direction: momentumDirection,
      computed_at: new Date().toISOString(),
    },
    { onConflict: 'tenant_id,snapshot_date' }
  )

  if (error) throw new Error(error.message)
}

export async function getMomentumHistory(): Promise<
  Array<{
    id: string
    snapshot_date: string
    new_clients_90d: number
    education_entries_12m: number
    creative_projects_90d: number
    avg_satisfaction_90d: number | null
    momentum_direction: string | null
  }>
> {
  const chef = await requireChef()
  const tenantId = chef.tenantId!
  const db: any = createServerClient()

  const { data, error } = await db
    .from('chef_momentum_snapshots')
    .select(
      'id, snapshot_date, new_clients_90d, education_entries_12m, creative_projects_90d, avg_satisfaction_90d, momentum_direction'
    )
    .eq('tenant_id', tenantId)
    .order('snapshot_date', { ascending: false })
    .limit(4)

  if (error) throw new Error(error.message)
  return data ?? []
}

export async function getCurrentMomentum(): Promise<{
  new_clients_90d: number
  education_entries_12m: number
  creative_projects_90d: number
  avg_satisfaction_90d: number | null
  momentum_direction: string
} | null> {
  const chef = await requireChef()
  const tenantId = chef.tenantId!
  const db: any = createServerClient()

  const { data } = await db
    .from('chef_momentum_snapshots')
    .select(
      'new_clients_90d, education_entries_12m, creative_projects_90d, avg_satisfaction_90d, momentum_direction'
    )
    .eq('tenant_id', tenantId)
    .order('snapshot_date', { ascending: false })
    .limit(1)
    .maybeSingle()

  return data ?? null
}
