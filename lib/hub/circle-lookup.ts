'use server'

import { createServerClient } from '@/lib/db/server'

// ---------------------------------------------------------------------------
// Circle Lookup Helpers
// Shared utilities for finding circles and chef hub profiles across the
// lifecycle. Used by all circle-lifecycle-hooks.
// ---------------------------------------------------------------------------

/**
 * Find a Dinner Circle linked to an event or inquiry.
 * Tries event first, then inquiry. Returns null if no circle exists.
 */
export type CircleContext = {
  groupId: string
  groupToken: string
  tenantId: string
}

export async function getCircleForContext(input: {
  eventId?: string | null
  inquiryId?: string | null
}): Promise<CircleContext | null> {
  if (!input.eventId && !input.inquiryId) return null

  const db = createServerClient({ admin: true })

  // Try event-linked circle first
  if (input.eventId) {
    const { data } = await db
      .from('hub_groups')
      .select('id, group_token, tenant_id')
      .eq('event_id', input.eventId)
      .eq('is_active', true)
      .limit(1)
      .maybeSingle()

    if (data?.tenant_id) {
      return { groupId: data.id, groupToken: data.group_token, tenantId: data.tenant_id }
    }
  }

  // Fall back to inquiry-linked circle
  if (input.inquiryId) {
    const { data } = await db
      .from('hub_groups')
      .select('id, group_token, tenant_id')
      .eq('inquiry_id', input.inquiryId)
      .eq('is_active', true)
      .limit(1)
      .maybeSingle()

    if (data?.tenant_id) {
      return { groupId: data.id, groupToken: data.group_token, tenantId: data.tenant_id }
    }
  }

  return null
}

/**
 * Get the chef's hub profile ID for a tenant.
 * Looks up the chef's auth_user_id, then finds (or skips) the hub profile.
 * Returns null if chef has no hub profile (circle posts will be skipped).
 */
export async function getChefHubProfileId(tenantId: string): Promise<string | null> {
  const db = createServerClient({ admin: true })

  const { data: chef } = await db.from('chefs').select('auth_user_id').eq('id', tenantId).single()

  if (!chef?.auth_user_id) return null

  const { data: profile } = await db
    .from('hub_guest_profiles')
    .select('id')
    .eq('auth_user_id', chef.auth_user_id)
    .single()

  return profile?.id ?? null
}

/**
 * Find a circle for an event, including looking up the event's inquiry_id
 * if no direct event circle exists.
 */
export async function getCircleForEvent(eventId: string): Promise<{
  groupId: string
  groupToken: string
  tenantId: string
} | null> {
  const db = createServerClient({ admin: true })

  // Direct event circle
  const direct = await getCircleForContext({ eventId })
  if (direct) return direct

  // Check if event came from an inquiry (inquiry circle may exist)
  const { data: event } = await db.from('events').select('id').eq('id', eventId).single()

  if (!event) return null

  // Look up inquiry that converted to this event
  const { data: inquiry } = await db
    .from('inquiries')
    .select('id')
    .eq('converted_to_event_id', eventId)
    .limit(1)
    .maybeSingle()

  if (inquiry) {
    return getCircleForContext({ inquiryId: inquiry.id })
  }

  return null
}
