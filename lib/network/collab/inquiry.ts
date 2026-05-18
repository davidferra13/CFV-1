'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'

export async function getHandoffDataFromInquiry(inquiryId: string): Promise<{
  title: string
  occasion: string | null
  eventDate: string | null
  guestCount: number | null
  locationText: string | null
  budgetCents: number | null
  clientContext: Record<string, unknown> | null
} | null> {
  const chef = await requireChef()
  const db = createServerClient()

  const { data: inquiry } = await db
    .from('inquiries')
    .select(
      'id, confirmed_occasion, confirmed_date, confirmed_guest_count, confirmed_budget_cents, source_message, client_id, clients(full_name, dietary_restrictions)'
    )
    .eq('id', inquiryId)
    .eq('tenant_id', chef.tenantId!)
    .single()

  if (!inquiry) return null

  const clientContext: Record<string, unknown> | null = inquiry.clients
    ? { clientName: inquiry.clients.full_name, dietary: inquiry.clients.dietary_restrictions }
    : null

  let guestPreferences: Array<{
    name: string
    allergies: string[] | null
    dietary: string[] | null
  }> = []

  try {
    const { data: event } = await (db as any)
      .from('events')
      .select('id')
      .eq('inquiry_id', inquiryId)
      .eq('tenant_id', chef.tenantId!)
      .limit(1)
      .maybeSingle()

    let circleQuery: { data: { id: string } | null } | null = null
    if (event?.id) {
      circleQuery = await (db as any)
        .from('hub_groups')
        .select('id')
        .eq('event_id', event.id)
        .eq('is_active', true)
        .limit(1)
        .maybeSingle()
    }

    if (!circleQuery?.data) {
      circleQuery = await (db as any)
        .from('hub_groups')
        .select('id')
        .eq('inquiry_id', inquiryId)
        .eq('is_active', true)
        .limit(1)
        .maybeSingle()
    }

    if (circleQuery?.data) {
      const { data: members } = await (db as any)
        .from('hub_group_members')
        .select('profile:hub_guest_profiles(display_name, known_allergies, known_dietary)')
        .eq('group_id', circleQuery.data.id)

      guestPreferences = ((members ?? []) as any[])
        .filter((member) => member.profile)
        .map((member) => ({
          name: member.profile.display_name,
          allergies: member.profile.known_allergies,
          dietary: member.profile.known_dietary,
        }))
        .filter(
          (preference) =>
            (preference.allergies && preference.allergies.length > 0) ||
            (preference.dietary && preference.dietary.length > 0)
        )
    }
  } catch {
    // Non-blocking: if circle lookup fails, handoff still works without preferences.
  }

  return {
    title: inquiry.confirmed_occasion || 'Lead Handoff',
    occasion: inquiry.confirmed_occasion || null,
    eventDate: inquiry.confirmed_date || null,
    guestCount: inquiry.confirmed_guest_count || null,
    locationText: null,
    budgetCents: inquiry.confirmed_budget_cents || null,
    clientContext: clientContext
      ? {
          ...clientContext,
          guestPreferences: guestPreferences.length > 0 ? guestPreferences : undefined,
        }
      : guestPreferences.length > 0
        ? { guestPreferences }
        : null,
  }
}

export async function getHandoffForInquiry(inquiryId: string): Promise<{
  handoffId: string
  title: string
  status: string
  createdAt: string
  recipientCount: number
  conversions: number
} | null> {
  const chef = await requireChef()
  const db = createServerClient()

  const { data: handoff } = await db
    .from('chef_handoffs')
    .select('id, title, status, created_at')
    .eq('from_chef_id', chef.tenantId!)
    .eq('source_entity_type', 'inquiry')
    .eq('source_entity_id', inquiryId)
    .limit(1)
    .single()

  if (!handoff) return null

  const { count: recipientCount } = await db
    .from('chef_collab_handoff_recipients')
    .select('id', { count: 'exact', head: true })
    .eq('handoff_id', handoff.id)

  const { count: conversions } = await db
    .from('chef_collab_handoff_recipients')
    .select('id', { count: 'exact', head: true })
    .eq('handoff_id', handoff.id)
    .eq('status', 'converted')

  return {
    handoffId: handoff.id,
    title: handoff.title || 'Handoff',
    status: handoff.status,
    createdAt: handoff.created_at,
    recipientCount: recipientCount || 0,
    conversions: conversions || 0,
  }
}
