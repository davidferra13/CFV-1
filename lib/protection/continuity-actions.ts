'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function saveContinuityPlan(plan: Record<string, unknown>) {
  const chef = await requireChef()
  const tenantId = chef.tenantId!

  const supabase = createServerClient()

  const { error } = await supabase
    .from('chefs')
    .update({ business_continuity_plan: plan })
    .eq('id', tenantId)

  if (error) throw new Error(error.message)

  revalidatePath('/settings/protection/continuity')
}

export async function getContinuityPlan() {
  const chef = await requireChef()
  const tenantId = chef.tenantId!

  const supabase = createServerClient()

  const { data } = await supabase
    .from('chefs')
    .select('business_continuity_plan')
    .eq('id', tenantId)
    .single()

  return (data?.business_continuity_plan as Record<string, unknown> | null) ?? {}
}
