'use server'

// Cross-tenant admin data queries for the Admin Super View.
// Uses service role key to bypass RLS. All functions require admin auth.

import { createAdminClient } from '@/lib/supabase/admin'
import { requireAdmin } from '@/lib/auth/admin'

// ─── Recipes ─────────────────────────────────────────────

export type AdminRecipeRow = {
  id: string
  name: string
  category: string | null
  cuisine_type: string | null
  servings: number | null
  prep_time_minutes: number | null
  cook_time_minutes: number | null
  created_at: string
  tenant_id: string
  chefBusinessName: string | null
}

export async function getAdminRecipes(): Promise<AdminRecipeRow[]> {
  await requireAdmin()
  const supabase = createAdminClient()

  const { data: recipes } = await supabase
    .from('recipes')
    .select(
      'id, name, category, cuisine_type, servings, prep_time_minutes, cook_time_minutes, created_at, tenant_id'
    )
    .order('created_at', { ascending: false })
    .limit(500)

  if (!recipes || recipes.length === 0) return []

  // Get chef names for all unique tenant_ids
  const tenantIds = [...new Set(recipes.map((r) => r.tenant_id))]
  const { data: chefs } = await supabase
    .from('chefs')
    .select('id, business_name')
    .in('id', tenantIds)

  const chefMap = new Map((chefs ?? []).map((c) => [c.id, c.business_name]))

  return recipes.map((r) => ({
    ...r,
    chefBusinessName: chefMap.get(r.tenant_id) ?? null,
  }))
}

// ─── Menus ───────────────────────────────────────────────

export type AdminMenuRow = {
  id: string
  name: string | null
  description: string | null
  created_at: string
  tenant_id: string
  chefBusinessName: string | null
}

export async function getAdminMenus(): Promise<AdminMenuRow[]> {
  await requireAdmin()
  const supabase = createAdminClient()

  const { data: menus } = await supabase
    .from('menus')
    .select('id, name, description, created_at, tenant_id')
    .order('created_at', { ascending: false })
    .limit(500)

  if (!menus || menus.length === 0) return []

  const tenantIds = [...new Set(menus.map((m) => m.tenant_id))]
  const { data: chefs } = await supabase
    .from('chefs')
    .select('id, business_name')
    .in('id', tenantIds)

  const chefMap = new Map((chefs ?? []).map((c) => [c.id, c.business_name]))

  return menus.map((m) => ({
    ...m,
    chefBusinessName: chefMap.get(m.tenant_id) ?? null,
  }))
}

// ─── Quotes ──────────────────────────────────────────────

export type AdminQuoteRow = {
  id: string
  status: string | null
  total_cents: number | null
  created_at: string
  event_id: string | null
  tenant_id: string
  chefBusinessName: string | null
  eventOccasion: string | null
}

export async function getAdminQuotes(): Promise<AdminQuoteRow[]> {
  await requireAdmin()
  const supabase = createAdminClient()

  const { data: quotes } = await supabase
    .from('quotes')
    .select('id, status, total_cents, created_at, event_id, tenant_id')
    .order('created_at', { ascending: false })
    .limit(500)

  if (!quotes || quotes.length === 0) return []

  const tenantIds = [...new Set(quotes.map((q) => q.tenant_id))]
  const eventIds = quotes.map((q) => q.event_id).filter(Boolean) as string[]

  const [chefsResult, eventsResult] = await Promise.all([
    supabase.from('chefs').select('id, business_name').in('id', tenantIds),
    eventIds.length > 0
      ? supabase.from('events').select('id, occasion').in('id', eventIds)
      : { data: [] },
  ])

  const chefMap = new Map((chefsResult.data ?? []).map((c) => [c.id, c.business_name]))
  const eventMap = new Map((eventsResult.data ?? []).map((e) => [e.id, e.occasion]))

  return quotes.map((q) => ({
    ...q,
    chefBusinessName: chefMap.get(q.tenant_id) ?? null,
    eventOccasion: q.event_id ? (eventMap.get(q.event_id) ?? null) : null,
  }))
}

// ─── Inquiries ───────────────────────────────────────────

export type AdminInquiryRow = {
  id: string
  client_name: string | null
  client_email: string | null
  occasion: string | null
  status: string | null
  event_date: string | null
  guest_count: number | null
  created_at: string
  tenant_id: string
  chefBusinessName: string | null
  leadScore: number | null
}

export async function getAdminInquiries(): Promise<AdminInquiryRow[]> {
  await requireAdmin()
  const supabase = createAdminClient()

  const { data: inquiries } = await supabase
    .from('inquiries')
    .select(
      'id, client_name, client_email, occasion, status, event_date, guest_count, created_at, tenant_id, chef_likelihood, unknown_fields'
    )
    .order('created_at', { ascending: false })
    .limit(500)

  if (!inquiries || inquiries.length === 0) return []

  const tenantIds = [...new Set(inquiries.map((i) => i.tenant_id))]
  const { data: chefs } = await supabase
    .from('chefs')
    .select('id, business_name')
    .in('id', tenantIds)

  const chefMap = new Map((chefs ?? []).map((c) => [c.id, c.business_name]))

  return inquiries.map((i) => {
    // Lead score: prefer chef_likelihood, fall back to GOLDMINE score in unknown_fields
    let leadScore: number | null = (i as any).chef_likelihood ?? null
    if (leadScore === null && i.unknown_fields) {
      const uf = typeof i.unknown_fields === 'object' ? (i.unknown_fields as any) : {}
      leadScore = uf.goldmine_score ?? uf.lead_score ?? null
    }
    return {
      id: i.id,
      client_name: i.client_name,
      client_email: i.client_email,
      occasion: i.occasion,
      status: i.status,
      event_date: i.event_date,
      guest_count: i.guest_count,
      created_at: i.created_at,
      tenant_id: i.tenant_id,
      chefBusinessName: chefMap.get(i.tenant_id) ?? null,
      leadScore,
    }
  })
}

// ─── Staff ───────────────────────────────────────────────

export type AdminStaffRow = {
  id: string
  full_name: string | null
  email: string | null
  role: string | null
  status: string | null
  created_at: string
  chef_id: string
  chefBusinessName: string | null
}

export async function getAdminStaff(): Promise<AdminStaffRow[]> {
  await requireAdmin()
  const supabase = createAdminClient()

  const { data: staff } = await supabase
    .from('staff_members')
    .select('id, full_name, email, role, status, created_at, chef_id')
    .order('created_at', { ascending: false })
    .limit(500)

  if (!staff || staff.length === 0) return []

  const chefIds = [...new Set(staff.map((s) => s.chef_id))]
  const { data: chefs } = await supabase.from('chefs').select('id, business_name').in('id', chefIds)

  const chefMap = new Map((chefs ?? []).map((c) => [c.id, c.business_name]))

  return staff.map((s) => ({
    ...s,
    chefBusinessName: chefMap.get(s.chef_id) ?? null,
  }))
}

// ─── Documents ───────────────────────────────────────────

export type AdminDocumentRow = {
  id: string
  title: string | null
  doc_type: string | null
  created_at: string
  tenant_id: string
  chefBusinessName: string | null
}

export async function getAdminDocuments(): Promise<AdminDocumentRow[]> {
  await requireAdmin()
  const supabase = createAdminClient()

  const { data: docs } = await supabase
    .from('chef_documents')
    .select('id, title, doc_type, created_at, tenant_id')
    .order('created_at', { ascending: false })
    .limit(500)

  if (!docs || docs.length === 0) return []

  const tenantIds = [...new Set(docs.map((d) => d.tenant_id))]
  const { data: chefs } = await supabase
    .from('chefs')
    .select('id, business_name')
    .in('id', tenantIds)

  const chefMap = new Map((chefs ?? []).map((c) => [c.id, c.business_name]))

  return docs.map((d) => ({
    ...d,
    chefBusinessName: chefMap.get(d.tenant_id) ?? null,
  }))
}
