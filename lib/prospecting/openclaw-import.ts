'use server'

import { requireAdmin } from '@/lib/auth/admin'
import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { revalidatePath } from 'next/cache'
import { unstable_cache, revalidateTag } from 'next/cache'
import { isSimilarName } from './fuzzy-match'
import type { ProspectCategory } from './constants'

// ── Types ──────────────────────────────────────────────────────────────────

export type OpenClawLead = {
  id: number
  name: string
  phone: string | null
  email: string | null
  website: string | null
  city: string | null
  state: string | null
  postcode: string | null
  street: string | null
  lat: number | null
  lon: number | null
  source: string | null
  source_id: string | null
  source_url: string | null
  business_type: string | null
  categories: string[]
  lead_score: number
  chef_relevance: string | null
  rating: number | null
  review_count: number | null
  owner_name: string | null
  ai_notes: string | null
  diet_vegan: boolean
  diet_vegetarian: boolean
  diet_gluten_free: boolean
  synced_at: string | null
  created_at: string | null
}

export type OpenClawLeadFilters = {
  state?: string
  city?: string
  source?: string
  minScore?: number
  minRating?: number
  search?: string
  page?: number
  limit?: number
}

// ── Business Type -> Prospect Category Mapping ─────────────────────────────

const BUSINESS_TYPE_TO_CATEGORY: Record<string, ProspectCategory> = {
  caterer: 'business_owner',
  personal_chef: 'business_owner',
  event_venue: 'event_coordinator',
  wedding_venue: 'wedding_planner',
  food_truck: 'business_owner',
  restaurant: 'business_owner',
  bakery: 'business_owner',
  meal_prep: 'business_owner',
}

// ── Cached Count ───────────────────────────────────────────────────────────

const getCachedOpenClawLeadCount = unstable_cache(
  async () => {
    const db: any = createServerClient()
    const { data } = await db.from('openclaw_leads').select('id', { count: 'exact', head: true })
    return data?.length ?? 0
  },
  ['openclaw-lead-count'],
  { tags: ['openclaw-lead-count'], revalidate: 3600 }
)

// ── Server Actions ─────────────────────────────────────────────────────────

export async function getOpenClawLeadCount(): Promise<number> {
  await requireAdmin()
  return getCachedOpenClawLeadCount()
}

export async function getOpenClawLeads(
  filters: OpenClawLeadFilters = {}
): Promise<{ leads: OpenClawLead[]; total: number }> {
  await requireAdmin()
  const db: any = createServerClient()

  const page = filters.page ?? 1
  const limit = Math.min(filters.limit ?? 25, 100)
  const offset = (page - 1) * limit

  // Build query with filters
  let query = db.from('openclaw_leads').select('*').order('lead_score', { ascending: false })

  if (filters.state) {
    query = query.eq('state', filters.state)
  }
  if (filters.source) {
    query = query.like('source', `%${filters.source}%`)
  }
  if (filters.minScore && filters.minScore > 0) {
    query = query.gte('lead_score', filters.minScore)
  }
  if (filters.search) {
    query = query.ilike('name', `%${filters.search}%`)
  }

  // Get total count with same filters
  let countQuery = db.from('openclaw_leads').select('id', { count: 'exact', head: true })
  if (filters.state) countQuery = countQuery.eq('state', filters.state)
  if (filters.source) countQuery = countQuery.like('source', `%${filters.source}%`)
  if (filters.minScore && filters.minScore > 0)
    countQuery = countQuery.gte('lead_score', filters.minScore)
  if (filters.search) countQuery = countQuery.ilike('name', `%${filters.search}%`)

  const [{ data: leads, error }, { count }] = await Promise.all([
    query.range(offset, offset + limit - 1),
    countQuery,
  ])

  if (error) {
    throw new Error(`Failed to fetch OpenClaw leads: ${error.message}`)
  }

  return {
    leads: (leads ?? []).map((row: any) => ({
      id: row.id,
      name: row.name,
      phone: row.phone,
      email: row.email,
      website: row.website,
      city: row.city,
      state: row.state,
      postcode: row.postcode,
      street: row.street,
      lat: row.lat,
      lon: row.lon,
      source: row.source,
      source_id: row.source_id,
      source_url: row.source_url,
      business_type: row.business_type,
      categories: row.categories ?? [],
      lead_score: row.lead_score ?? 0,
      chef_relevance: row.chef_relevance,
      rating: row.rating ? Number(row.rating) : null,
      review_count: row.review_count,
      owner_name: row.owner_name,
      ai_notes: row.ai_notes,
      diet_vegan: row.diet_vegan ?? false,
      diet_vegetarian: row.diet_vegetarian ?? false,
      diet_gluten_free: row.diet_gluten_free ?? false,
      synced_at: row.synced_at,
      created_at: row.created_at,
    })),
    total: count ?? leads?.length ?? 0,
  }
}

export async function importOpenClawLead(openclawLeadId: number): Promise<{
  success: boolean
  prospectId?: string
  error?: string
  duplicate?: boolean
  existingProspectId?: string
}> {
  await requireAdmin()
  const user = await requireChef()
  const db: any = createServerClient()

  // Fetch the openclaw lead (global, not tenant-scoped)
  const { data: lead, error: leadError } = await db
    .from('openclaw_leads')
    .select('*')
    .eq('id', openclawLeadId)
    .maybeSingle()

  if (leadError || !lead) {
    return { success: false, error: leadError?.message ?? 'Lead not found' }
  }

  // Fuzzy dedup against existing prospects
  const { data: existingProspects } = await db
    .from('prospects')
    .select('id, name, city, state')
    .eq('chef_id', user.tenantId!)

  if (existingProspects) {
    for (const existing of existingProspects) {
      if (
        isSimilarName(lead.name, existing.name) &&
        (lead.state === existing.state || (!lead.state && !existing.state))
      ) {
        return {
          success: false,
          duplicate: true,
          existingProspectId: existing.id,
          error: `Possible duplicate of "${existing.name}"`,
        }
      }
    }
  }

  // Map openclaw_leads columns to prospects columns
  const category: ProspectCategory = BUSINESS_TYPE_TO_CATEGORY[lead.business_type ?? ''] ?? 'other'

  const descriptionParts: string[] = []
  if (lead.ai_notes) descriptionParts.push(lead.ai_notes)
  if (lead.rating != null) {
    descriptionParts.push(
      `Rating: ${Number(lead.rating).toFixed(1)} stars${lead.review_count ? ` (${lead.review_count} reviews)` : ''}`
    )
  }
  const dietLabels: string[] = []
  if (lead.diet_vegan) dietLabels.push('vegan')
  if (lead.diet_vegetarian) dietLabels.push('vegetarian')
  if (lead.diet_gluten_free) dietLabels.push('gluten-free')
  if (dietLabels.length > 0) {
    descriptionParts.push(`Serves: ${dietLabels.join(', ')}`)
  }

  const address = [lead.street, lead.postcode].filter(Boolean).join(', ') || null
  const notes = lead.source_url ? `Source: ${lead.source_url}` : null

  const { data: inserted, error: insertError } = await db
    .from('prospects')
    .insert({
      chef_id: user.tenantId!,
      name: lead.name,
      prospect_type: 'organization',
      category,
      description: descriptionParts.join('\n') || null,
      address,
      city: lead.city,
      state: lead.state,
      phone: lead.phone,
      email: lead.email,
      website: lead.website,
      contact_person: lead.owner_name,
      latitude: lead.lat,
      longitude: lead.lon,
      source: 'openclaw_import',
      status: 'new',
      pipeline_stage: 'new',
      lead_score: lead.lead_score ?? 0,
      tags: lead.categories ?? [],
      notes,
    })
    .select('id')
    .single()

  if (insertError) {
    return { success: false, error: insertError.message }
  }

  revalidatePath('/prospecting')
  revalidatePath('/prospecting/openclaw')

  return { success: true, prospectId: inserted?.id }
}

export async function bulkImportOpenClawLeads(ids: number[]): Promise<{
  imported: number
  skipped: number
  duplicates: string[]
  errors: string[]
}> {
  await requireAdmin()

  let imported = 0
  let skipped = 0
  const duplicates: string[] = []
  const errors: string[] = []

  for (const id of ids) {
    const result = await importOpenClawLead(id)
    if (result.success) {
      imported++
    } else if (result.duplicate) {
      skipped++
      duplicates.push(result.error ?? `Duplicate lead ID ${id}`)
    } else {
      skipped++
      errors.push(result.error ?? `Failed to import lead ID ${id}`)
    }
  }

  revalidatePath('/prospecting')
  revalidatePath('/prospecting/openclaw')
  revalidateTag('openclaw-lead-count')

  return { imported, skipped, duplicates, errors }
}
