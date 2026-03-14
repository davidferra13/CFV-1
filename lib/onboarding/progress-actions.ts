'use server'

// Onboarding Progress Actions
// Computes per-phase completion status without any schema changes.
// All queries hit existing tables — nothing new required.

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'

export type OnboardingProgress = {
  profile: boolean
  clients: { done: boolean; count: number }
  loyalty: { done: boolean }
  recipes: { done: boolean; count: number }
  staff: { done: boolean; count: number }
  completedPhases: number
  totalPhases: number
}

export async function getOnboardingProgress(): Promise<OnboardingProgress> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  const [chefRow, clients, loyaltyConfig, recipes, staff] = await Promise.all([
    supabase
      .from('chefs')
      .select('business_name, display_name, profile_image_url')
      .eq('id', user.entityId)
      .single(),
    supabase
      .from('clients')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', user.tenantId!),
    supabase
      .from('loyalty_config')
      .select('is_active')
      .eq('tenant_id', user.tenantId!)
      .maybeSingle(),
    supabase
      .from('recipes')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', user.tenantId!)
      .eq('archived', false),
    supabase
      .from('staff_members')
      .select('id', { count: 'exact', head: true })
      .eq('chef_id', user.tenantId!),
  ])

  const profileDone = !!(chefRow.data?.business_name && chefRow.data?.display_name)
  const clientsDone = (clients.count ?? 0) > 0
  const loyaltyDone = loyaltyConfig.data !== null
  const recipesDone = (recipes.count ?? 0) > 0
  const staffDone = (staff.count ?? 0) > 0

  const completedPhases = [profileDone, clientsDone, loyaltyDone, recipesDone, staffDone].filter(
    Boolean
  ).length

  return {
    profile: profileDone,
    clients: { done: clientsDone, count: clients.count ?? 0 },
    loyalty: { done: loyaltyDone },
    recipes: { done: recipesDone, count: recipes.count ?? 0 },
    staff: { done: staffDone, count: staff.count ?? 0 },
    completedPhases,
    totalPhases: 5,
  }
}
