'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { revalidatePath } from 'next/cache'

export async function saveContinuityPlan(plan: Record<string, unknown>) {
  const chef = await requireChef()
  const tenantId = chef.tenantId!

  const db: any = createServerClient()

  const { error } = await db
    .from('chefs')
    .update({ business_continuity_plan: plan })
    .eq('id', tenantId)

  if (error) throw new Error(error.message)

  revalidatePath('/settings/protection/continuity')
}

export async function getContinuityPlan() {
  const chef = await requireChef()
  const tenantId = chef.tenantId!

  const db: any = createServerClient()

  const { data } = await db
    .from('chefs')
    .select('business_continuity_plan')
    .eq('id', tenantId)
    .single()

  return (data?.business_continuity_plan as Record<string, unknown> | null) ?? {}
}
