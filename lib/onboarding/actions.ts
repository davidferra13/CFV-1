'use server'

// Onboarding Server Actions
// Slug utilities for the wizard's "Public URL" step.
// Profile completion (markOnboardingComplete) lives in lib/chef/profile-actions.ts.

import { requireChef } from '@/lib/auth/get-user'
import { createAdminClient } from '@/lib/db/admin'
import { createServerClient } from '@/lib/db/server'

/**
 * Returns true if the given slug is available (not taken by another chef).
 * Uses admin client to bypass RLS.
 */
export async function checkSlugAvailability(slug: string): Promise<boolean> {
  const user = await requireChef()
  const db: any = createAdminClient()

  const { data } = await db
    .from('chefs')
    .select('id')
    .eq('slug', slug)
    .neq('id', user.entityId)
    .maybeSingle()

  return !data // null = not taken = available
}

/**
 * Creates a placeholder "Guest" client + draft event for the onboarding wizard.
 * The client record is named "Guest" so the chef can rename it later.
 * This avoids the foreign key constraint that prevents event creation without a client.
 */
export async function createOnboardingEvent(input: {
  event_date: string
  serve_time: string
  guest_count: number
  location_address: string
  location_city: string
  location_zip: string
  occasion?: string
}): Promise<{ success: boolean; eventId?: string; error?: string }> {
  try {
    const user = await requireChef()
    const db: any = createServerClient()

    // Create a placeholder "Guest" client if one doesn't already exist for this tenant
    let placeholderClientId: string
    const { data: existing } = await db
      .from('clients')
      .select('id')
      .eq('tenant_id', user.tenantId!)
      .eq('full_name', 'Guest')
      .is('email', null)
      .maybeSingle()

    if (existing?.id) {
      placeholderClientId = existing.id
    } else {
      const { data: newClient, error: clientErr } = await db
        .from('clients')
        .insert({
          tenant_id: user.tenantId!,
          full_name: 'Guest',
          source: 'manual',
          is_active: true,
          notes: 'Placeholder created during onboarding. Rename or replace with a real client.',
        })
        .select('id')
        .single()

      if (clientErr || !newClient?.id) {
        return { success: false, error: 'Failed to create placeholder client' }
      }
      placeholderClientId = newClient.id
    }

    // Create draft event
    const { data: event, error: eventErr } = await db
      .from('events')
      .insert({
        tenant_id: user.tenantId!,
        client_id: placeholderClientId,
        status: 'draft',
        event_date: input.event_date,
        serve_time: input.serve_time,
        guest_count: input.guest_count,
        location_address: input.location_address,
        location_city: input.location_city,
        location_zip: input.location_zip,
        occasion: input.occasion || null,
      })
      .select('id')
      .single()

    if (eventErr || !event?.id) {
      return { success: false, error: 'Failed to create event' }
    }

    return { success: true, eventId: event.id }
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to create event',
    }
  }
}
