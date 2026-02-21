'use server'

import { createServerClient } from '@/lib/supabase/server'
import { requireChef } from '@/lib/auth/get-user'

export async function computeAndStoreMomentum() {
  const chef = await requireChef()
  const tenantId = chef.tenantId!
  const supabase = await createServerClient()

  const today = new Date().toISOString().split('T')[0]

  const now = new Date()
  const ago90 = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  const ago365 = new Date()
  ago365.setFullYear(ago365.getFullYear() - 1)
  const ago365str = ago365.toISOString().split('T')[0]

  // new_clients_90d
  const { count: newClients90d } = await (supabase as any)
    .from('clients')
    .select('id', { count: 'exact', head: true })
    .eq('tenant_id', tenantId)
    .gte('created_at', ago90)

  // education_entries_12m
  const { count: educationEntries12m } = await (supabase as any)
    .from('chef_education_log')
    .select('id', { count: 'exact', head: true })
    .eq('tenant_id', tenantId)
    .gte('entry_date', ago365str)

  // creative_projects_90d
  const { count: creativeProjects90d } = await (supabase as any)
    .from('chef_creative_projects')
    .select('id', { count: 'exact', head: true })
    .eq('tenant_id', tenantId)
    .gte('entry_date', ago90)

  // avg_satisfaction_90d
  const { data: checkins } = await (supabase as any)
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

  const { error } = await (supabase as any).from('chef_momentum_snapshots').upsert(
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
  const supabase = await createServerClient()

  const { data, error } = await (supabase as any)
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
  const supabase = await createServerClient()

  const { data } = await (supabase as any)
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
