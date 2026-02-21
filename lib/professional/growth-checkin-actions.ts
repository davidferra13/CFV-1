'use server'

import { createServerClient } from '@/lib/supabase/server'
import { requireChef } from '@/lib/auth/get-user'
import { revalidatePath } from 'next/cache'

export async function submitCheckin(input: {
  satisfaction_score: number
  learned_this_quarter?: string
  draining_this_quarter?: string
  goal_next_quarter?: string
  track_request?: string
}) {
  const chef = await requireChef()
  const tenantId = chef.tenantId!
  const supabase = await createServerClient()

  const today = new Date().toISOString().split('T')[0]

  const { error } = await (supabase as any).from('chef_growth_checkins').upsert(
    {
      tenant_id: tenantId,
      checkin_date: today,
      satisfaction_score: input.satisfaction_score,
      learned_this_quarter: input.learned_this_quarter ?? null,
      draining_this_quarter: input.draining_this_quarter ?? null,
      goal_next_quarter: input.goal_next_quarter ?? null,
      track_request: input.track_request ?? null,
    },
    { onConflict: 'tenant_id,checkin_date' }
  )

  if (error) throw new Error(error.message)
  revalidatePath('/settings/professional')
}

export async function getCheckinHistory(): Promise<
  Array<{
    id: string
    checkin_date: string
    satisfaction_score: number
    learned_this_quarter: string | null
    draining_this_quarter: string | null
    goal_next_quarter: string | null
    track_request: string | null
    created_at: string
  }>
> {
  const chef = await requireChef()
  const tenantId = chef.tenantId!
  const supabase = await createServerClient()

  const { data, error } = await (supabase as any)
    .from('chef_growth_checkins')
    .select(
      'id, checkin_date, satisfaction_score, learned_this_quarter, draining_this_quarter, goal_next_quarter, track_request, created_at'
    )
    .eq('tenant_id', tenantId)
    .order('checkin_date', { ascending: false })

  if (error) throw new Error(error.message)
  return data ?? []
}

export async function isDue(): Promise<boolean> {
  const chef = await requireChef()
  const tenantId = chef.tenantId!
  const supabase = await createServerClient()

  const since = new Date()
  since.setDate(since.getDate() - 90)

  const { data } = await (supabase as any)
    .from('chef_growth_checkins')
    .select('id')
    .eq('tenant_id', tenantId)
    .gte('checkin_date', since.toISOString().split('T')[0])
    .limit(1)
    .maybeSingle()

  return !data
}

export async function getLatestSatisfactionScore(): Promise<number | null> {
  const chef = await requireChef()
  const tenantId = chef.tenantId!
  const supabase = await createServerClient()

  const { data } = await (supabase as any)
    .from('chef_growth_checkins')
    .select('satisfaction_score')
    .eq('tenant_id', tenantId)
    .order('checkin_date', { ascending: false })
    .limit(1)
    .maybeSingle()

  return data?.satisfaction_score ?? null
}
