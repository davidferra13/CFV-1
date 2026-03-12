'use server'

// Cross-Chef Client Portal Actions
// Enables marketplace clients to view data across all their linked chefs.
// Uses admin client to bypass per-tenant RLS since we query across tenants.

import { createServerClient } from '@/lib/supabase/server'
import { requireMarketplaceClient } from '@/lib/auth/get-user'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type CrossChefEvent = {
  id: string
  title: string | null
  status: string
  event_date: string | null
  guest_count: number | null
  location: string | null
  chefName: string
  chefSlug: string | null
  tenantId: string
}

export type CrossChefInquiry = {
  id: string
  confirmed_occasion: string | null
  confirmed_date: string | null
  confirmed_guest_count: number | null
  confirmed_location: string | null
  status: string
  created_at: string
  chefName: string
  chefSlug: string | null
  tenantId: string
}

export type LinkedChef = {
  chefId: string
  displayName: string
  businessName: string | null
  slug: string | null
  profileImageUrl: string | null
  cuisineTypes: string[]
  totalEvents: number
  lastEventDate: string | null
  isFavorite: boolean
}

// ---------------------------------------------------------------------------
// Actions
// ---------------------------------------------------------------------------

/**
 * Get events from all linked chefs for the authenticated marketplace client.
 */
export async function getCrossChefEvents(): Promise<CrossChefEvent[]> {
  const mpUser = await requireMarketplaceClient()

  if (mpUser.linkedTenants.length === 0) return []

  const supabase = createServerClient({ admin: true })
  const tenantIds = mpUser.linkedTenants.map((lt) => lt.tenantId)
  const clientIds = mpUser.linkedTenants.map((lt) => lt.clientId)

  // Query events where the client_id matches across all linked tenants
  const { data: events, error } = await supabase
    .from('events')
    .select(
      `
      id,
      title,
      status,
      event_date,
      guest_count,
      location,
      tenant_id,
      client_id
    `
    )
    .in('tenant_id', tenantIds)
    .in('client_id', clientIds)
    .order('event_date', { ascending: false, nullsFirst: false })

  if (error) {
    console.error('[cross-tenant] Failed to fetch events:', error)
    throw new Error('Could not load events across chefs')
  }

  if (!events || events.length === 0) return []

  // Fetch chef names for the tenants that have events
  const eventTenantIds = [...new Set(events.map((e) => e.tenant_id))]
  const { data: chefs } = await supabase
    .from('chefs')
    .select('id, display_name, slug')
    .in('id', eventTenantIds)

  const chefMap = new Map((chefs ?? []).map((c) => [c.id, { name: c.display_name, slug: c.slug }]))

  return events.map((e) => ({
    id: e.id,
    title: e.title,
    status: e.status,
    event_date: e.event_date,
    guest_count: e.guest_count,
    location: e.location,
    chefName: chefMap.get(e.tenant_id)?.name ?? 'Unknown Chef',
    chefSlug: chefMap.get(e.tenant_id)?.slug ?? null,
    tenantId: e.tenant_id,
  }))
}

/**
 * Get inquiries from all linked chefs for the authenticated marketplace client.
 */
export async function getCrossChefInquiries(): Promise<CrossChefInquiry[]> {
  const mpUser = await requireMarketplaceClient()

  if (mpUser.linkedTenants.length === 0) return []

  const supabase = createServerClient({ admin: true })
  const tenantIds = mpUser.linkedTenants.map((lt) => lt.tenantId)
  const clientIds = mpUser.linkedTenants.map((lt) => lt.clientId)

  const { data: inquiries, error } = await supabase
    .from('inquiries')
    .select(
      `
      id,
      confirmed_occasion,
      confirmed_date,
      confirmed_guest_count,
      confirmed_location,
      status,
      created_at,
      tenant_id,
      client_id
    `
    )
    .in('tenant_id', tenantIds)
    .in('client_id', clientIds)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('[cross-tenant] Failed to fetch inquiries:', error)
    throw new Error('Could not load inquiries across chefs')
  }

  if (!inquiries || inquiries.length === 0) return []

  const inquiryTenantIds = [...new Set(inquiries.map((i) => i.tenant_id))]
  const { data: chefs } = await supabase
    .from('chefs')
    .select('id, display_name, slug')
    .in('id', inquiryTenantIds)

  const chefMap = new Map((chefs ?? []).map((c) => [c.id, { name: c.display_name, slug: c.slug }]))

  return inquiries.map((i) => ({
    id: i.id,
    confirmed_occasion: i.confirmed_occasion,
    confirmed_date: i.confirmed_date,
    confirmed_guest_count: i.confirmed_guest_count,
    confirmed_location: i.confirmed_location,
    status: i.status,
    created_at: i.created_at,
    chefName: chefMap.get(i.tenant_id)?.name ?? 'Unknown Chef',
    chefSlug: chefMap.get(i.tenant_id)?.slug ?? null,
    tenantId: i.tenant_id,
  }))
}

/**
 * Get all chefs this marketplace client is linked to, with event stats.
 */
export async function getLinkedChefs(): Promise<LinkedChef[]> {
  const mpUser = await requireMarketplaceClient()

  if (mpUser.linkedTenants.length === 0) return []

  const supabase = createServerClient({ admin: true })
  const tenantIds = mpUser.linkedTenants.map((lt) => lt.tenantId)
  const clientIds = mpUser.linkedTenants.map((lt) => lt.clientId)

  // Fetch chef info + marketplace profiles
  const { data: chefs, error: chefErr } = await supabase
    .from('chefs')
    .select(
      `
      id,
      display_name,
      business_name,
      slug,
      profile_image_url
    `
    )
    .in('id', tenantIds)

  if (chefErr) {
    console.error('[cross-tenant] Failed to fetch chefs:', chefErr)
    throw new Error('Could not load linked chefs')
  }

  if (!chefs || chefs.length === 0) return []

  // Fetch marketplace profiles for cuisine types
  const { data: profiles } = await supabase
    .from('chef_marketplace_profiles')
    .select('chef_id, cuisine_types')
    .in('chef_id', tenantIds)

  const profileMap = new Map((profiles ?? []).map((p) => [p.chef_id, p.cuisine_types ?? []]))

  // Fetch event counts and last event date per tenant
  const { data: events } = await supabase
    .from('events')
    .select('tenant_id, event_date')
    .in('tenant_id', tenantIds)
    .in('client_id', clientIds)
    .order('event_date', { ascending: false, nullsFirst: false })

  // Build per-tenant event stats
  const eventStats = new Map<string, { count: number; lastDate: string | null }>()
  for (const e of events ?? []) {
    const existing = eventStats.get(e.tenant_id)
    if (existing) {
      existing.count++
    } else {
      eventStats.set(e.tenant_id, { count: 1, lastDate: e.event_date })
    }
  }

  // Build favorite lookup from linked tenants
  const favoriteMap = new Map(mpUser.linkedTenants.map((lt) => [lt.tenantId, lt.isFavorite]))

  return chefs.map((c) => ({
    chefId: c.id,
    displayName: c.display_name,
    businessName: c.business_name,
    slug: c.slug,
    profileImageUrl: c.profile_image_url,
    cuisineTypes: profileMap.get(c.id) ?? [],
    totalEvents: eventStats.get(c.id)?.count ?? 0,
    lastEventDate: eventStats.get(c.id)?.lastDate ?? null,
    isFavorite: favoriteMap.get(c.id) ?? false,
  }))
}
