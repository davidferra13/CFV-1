import { verifyOnboardingToken } from '@/lib/clients/onboarding-tokens'
import { createServerClient } from '@/lib/supabase/server'

export async function getOnboardingData(token: string) {
  const tokenData = verifyOnboardingToken(token)
  if (!tokenData) return null

  const supabase: any = createServerClient({ admin: true })

  const { data: client } = await supabase
    .from('clients')
    .select(
      `
      id, full_name, email,
      dietary_restrictions, allergies, dislikes,
      spice_tolerance, favorite_cuisines, favorite_dishes,
      kitchen_size, kitchen_constraints,
      equipment_available, parking_instructions, access_instructions,
      house_rules, preferred_contact_method, personal_milestones,
      onboarding_completed_at
    `
    )
    .eq('id', tokenData.clientId)
    .eq('tenant_id', tokenData.tenantId)
    .single()

  if (!client) return null

  const { data: chef } = await supabase
    .from('chefs')
    .select('business_name')
    .eq('id', tokenData.tenantId)
    .single()

  return {
    client,
    chefName: chef?.business_name ?? 'Your Chef',
    alreadyCompleted: !!client.onboarding_completed_at,
  }
}
