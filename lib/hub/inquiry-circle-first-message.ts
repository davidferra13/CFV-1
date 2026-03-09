'use server'

import { createServerClient } from '@/lib/supabase/server'
import { getServiceConfigForTenant } from '@/lib/chef-services/service-config-actions'
import { generateFirstResponse } from '@/lib/templates/inquiry-first-response'

// ---------------------------------------------------------------------------
// Inquiry Circle First Message
// Posts the chef's first response in the Dinner Circle using the deterministic
// template. Formula > AI: no LLM call needed.
// ---------------------------------------------------------------------------

/**
 * Post the first response message in a Dinner Circle on behalf of the chef.
 * Called as a non-blocking side effect after circle creation.
 */
export async function postFirstCircleMessage(params: {
  groupId: string
  inquiryId: string
  tenantId: string
}): Promise<void> {
  const supabase = createServerClient({ admin: true })

  // Load inquiry data
  const { data: inquiry } = await supabase
    .from('inquiries')
    .select('*, clients(full_name)')
    .eq('id', params.inquiryId)
    .eq('tenant_id', params.tenantId)
    .single()

  if (!inquiry) return

  // Load chef info + service config in parallel
  const [chefData, serviceConfig] = await Promise.all([
    supabase
      .from('chefs')
      .select('display_name, business_name, auth_user_id')
      .eq('id', params.tenantId)
      .single(),
    getServiceConfigForTenant(params.tenantId),
  ])

  const chef = chefData.data
  const chefName = chef?.display_name || chef?.business_name || 'Chef'
  const chefFirstName = chefName.split(' ')[0]

  // Generate the first response using the deterministic template
  const response = generateFirstResponse({
    clientName: inquiry.clients?.full_name || inquiry.client_name || 'there',
    date: inquiry.confirmed_date || inquiry.preferred_date || null,
    guestCount: inquiry.confirmed_guest_count || inquiry.guest_count || null,
    dietaryRestrictions: inquiry.confirmed_dietary_restrictions || [],
    occasion: inquiry.confirmed_occasion || inquiry.occasion || null,
    chefFirstName,
    serviceConfig,
  })

  // Find the chef's hub profile (should already exist from circle creation)
  let chefProfileId: string | null = null
  if (chef?.auth_user_id) {
    const { data: profile } = await supabase
      .from('hub_guest_profiles')
      .select('id')
      .eq('auth_user_id', chef.auth_user_id)
      .single()

    chefProfileId = profile?.id ?? null
  }

  if (!chefProfileId) {
    // Fallback: find any chef-role member of this group
    const { data: member } = await supabase
      .from('hub_group_members')
      .select('profile_id')
      .eq('group_id', params.groupId)
      .eq('role', 'chef')
      .single()

    chefProfileId = member?.profile_id ?? null
  }

  if (!chefProfileId) return

  // Post the first response as a message in the circle
  await supabase.from('hub_messages').insert({
    group_id: params.groupId,
    author_profile_id: chefProfileId,
    message_type: 'text',
    body: response.body,
  })
}
