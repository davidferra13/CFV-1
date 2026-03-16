'use server'

import { createServerClient } from '@/lib/supabase/server'

// ---------------------------------------------------------------------------
// Inquiry Circle Actions
// Auto-creates a Dinner Circle (hub group) when a new inquiry arrives.
// Follows the same pattern as getOrCreateEventHubGroup() in integration-actions.ts.
// ---------------------------------------------------------------------------

/**
 * Create a Dinner Circle for an inquiry.
 * Called as a non-blocking side effect from inquiry creation flows.
 * Returns the group token for the shareable public link.
 */
export async function createInquiryCircle(input: {
  inquiryId: string
  clientName: string
  clientEmail: string | null
  occasion: string | null
}): Promise<{ groupToken: string; groupId: string }> {
  const supabase = createServerClient({ admin: true })

  const { data: inquiry } = await supabase
    .from('inquiries')
    .select('tenant_id')
    .eq('id', input.inquiryId)
    .single()

  if (!inquiry?.tenant_id) {
    throw new Error('Inquiry not found while creating Dinner Circle')
  }

  const tenantId = inquiry.tenant_id

  // Check if a circle already exists for this inquiry
  const { data: existing } = await supabase
    .from('hub_groups')
    .select('id, group_token')
    .eq('inquiry_id', input.inquiryId)
    .eq('is_active', true)
    .single()

  if (existing) return { groupToken: existing.group_token, groupId: existing.id }

  // --- Get or create chef hub profile ---
  const { data: chef } = await supabase
    .from('chefs')
    .select('id, business_name, display_name, auth_user_id')
    .eq('id', tenantId)
    .single()

  const chefName = chef?.business_name ?? chef?.display_name ?? 'Chef'

  let chefProfileId: string | null = null
  if (chef?.auth_user_id) {
    const { data: chefProfile } = await supabase
      .from('hub_guest_profiles')
      .select('id')
      .eq('auth_user_id', chef.auth_user_id)
      .single()

    chefProfileId = chefProfile?.id ?? null
  }

  if (!chefProfileId) {
    const { data: newProfile } = await supabase
      .from('hub_guest_profiles')
      .insert({
        display_name: chefName,
        auth_user_id: chef?.auth_user_id ?? null,
        email: null,
      })
      .select('id')
      .single()

    chefProfileId = newProfile?.id ?? null
  }

  if (!chefProfileId) throw new Error('Failed to create chef profile for inquiry circle')

  // --- Get or create client hub profile ---
  let clientProfileId: string | null = null

  if (input.clientEmail) {
    const normalized = input.clientEmail.toLowerCase().trim()
    const { data: existingClient } = await supabase
      .from('hub_guest_profiles')
      .select('id')
      .eq('email_normalized', normalized)
      .single()

    clientProfileId = existingClient?.id ?? null
  }

  if (!clientProfileId) {
    const { data: newClient } = await supabase
      .from('hub_guest_profiles')
      .insert({
        display_name: input.clientName || 'Guest',
        email: input.clientEmail,
      })
      .select('id')
      .single()

    clientProfileId = newClient?.id ?? null
  }

  // --- Create the group ---
  const groupName = input.occasion
    ? `${input.occasion} with ${input.clientName || 'Guest'}`
    : `Dinner with ${input.clientName || 'Guest'}`

  const { data: group, error } = await supabase
    .from('hub_groups')
    .insert({
      name: groupName,
      inquiry_id: input.inquiryId,
      tenant_id: tenantId,
      created_by_profile_id: chefProfileId,
      emoji: '🍽️',
    })
    .select('id, group_token')
    .single()

  if (error) throw new Error(`Failed to create inquiry circle: ${error.message}`)

  // --- Add members ---

  // Chef as 'chef' role
  await supabase.from('hub_group_members').insert({
    group_id: group.id,
    profile_id: chefProfileId,
    role: 'chef',
    can_post: true,
    can_invite: true,
    can_pin: true,
  })

  // Client as 'member' role (if profile was created)
  if (clientProfileId) {
    await supabase.from('hub_group_members').insert({
      group_id: group.id,
      profile_id: clientProfileId,
      role: 'member',
      can_post: true,
      can_invite: false,
      can_pin: false,
    })
  }

  return { groupToken: group.group_token, groupId: group.id }
}

/**
 * Get the circle token for an inquiry (if one exists).
 */
export async function getInquiryCircleToken(inquiryId: string): Promise<string | null> {
  const supabase = createServerClient({ admin: true })

  const { data } = await supabase
    .from('hub_groups')
    .select('group_token')
    .eq('inquiry_id', inquiryId)
    .eq('is_active', true)
    .single()

  return data?.group_token ?? null
}

/**
 * Link an inquiry's circle to an event when the inquiry converts.
 * Called as a non-blocking side effect from convertInquiryToEvent().
 */
export async function linkInquiryCircleToEvent(input: {
  inquiryId: string
  eventId: string
}): Promise<void> {
  const supabase = createServerClient({ admin: true })

  const [inquiryResult, eventResult] = await Promise.all([
    supabase.from('inquiries').select('tenant_id').eq('id', input.inquiryId).single(),
    supabase.from('events').select('tenant_id').eq('id', input.eventId).single(),
  ])

  const inquiryTenantId = inquiryResult.data?.tenant_id
  const eventTenantId = eventResult.data?.tenant_id

  if (!inquiryTenantId || !eventTenantId || inquiryTenantId !== eventTenantId) {
    throw new Error('Inquiry and event tenant mismatch while linking Dinner Circle')
  }

  await supabase
    .from('hub_groups')
    .update({ event_id: input.eventId })
    .eq('inquiry_id', input.inquiryId)
    .eq('tenant_id', inquiryTenantId)
}
