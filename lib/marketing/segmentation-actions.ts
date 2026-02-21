// Behavioral Segmentation Server Actions
// Chef-only: Build, preview, and evaluate behavioral client segments
// Uses existing client_segments table (migration 20260308000001)

'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

// ============================================
// SCHEMAS
// ============================================

const BehavioralFiltersSchema = z.object({
  minEvents: z.number().int().nonnegative().optional(),
  maxEvents: z.number().int().nonnegative().optional(),
  minSpendCents: z.number().int().nonnegative().optional(),
  lastEventBefore: z.string().optional(),
  lastEventAfter: z.string().optional(),
  tags: z.array(z.string()).optional(),
})

const BuildBehavioralSegmentSchema = z.object({
  name: z.string().min(1, 'Segment name is required'),
  filters: BehavioralFiltersSchema,
})

export type BehavioralFilters = z.infer<typeof BehavioralFiltersSchema>
export type BuildBehavioralSegmentInput = z.infer<typeof BuildBehavioralSegmentSchema>

// ============================================
// RETURN TYPES
// ============================================

export type SegmentPreview = {
  count: number
  clientIds: string[]
}

export type EvaluatedSegment = {
  segmentId: string
  segmentName: string
  matchingCount: number
  matchingClients: { id: string; fullName: string; email: string | null }[]
}

// ============================================
// HELPERS
// ============================================

/**
 * Apply behavioral filters against the chef's client base.
 * Returns matching client IDs and their basic info.
 */
async function applyBehavioralFilters(
  supabase: any,
  tenantId: string,
  filters: BehavioralFilters
): Promise<{ id: string; fullName: string; email: string | null }[]> {
  // Fetch all clients for this chef
  const { data: clients } = await supabase
    .from('clients')
    .select('id, full_name, email')
    .eq('tenant_id', tenantId)

  if (!clients || clients.length === 0) return []

  const clientIds = clients.map((c: any) => c.id)

  // Fetch event counts and spend per client
  const { data: events } = await supabase
    .from('events')
    .select('id, client_id, event_date, quoted_price_cents')
    .eq('tenant_id', tenantId)
    .in('client_id', clientIds)

  const eventRows = events ?? []

  // Build per-client aggregates
  const clientAgg: Record<string, {
    eventCount: number
    totalSpendCents: number
    lastEventDate: string | null
    tags: string[]
  }> = {}

  for (const c of clients) {
    clientAgg[c.id] = { eventCount: 0, totalSpendCents: 0, lastEventDate: null, tags: [] }
  }

  for (const e of eventRows) {
    if (!clientAgg[e.client_id]) continue
    const agg = clientAgg[e.client_id]
    agg.eventCount++
    agg.totalSpendCents += e.quoted_price_cents ?? 0
    if (!agg.lastEventDate || e.event_date > agg.lastEventDate) {
      agg.lastEventDate = e.event_date
    }
  }

  // If tag filtering is requested, fetch client tags
  if (filters.tags && filters.tags.length > 0) {
    const { data: tagRows } = await (supabase as any)
      .from('client_tags')
      .select('client_id, tag')
      .eq('chef_id', tenantId)
      .in('client_id', clientIds)

    for (const t of (tagRows ?? [])) {
      if (clientAgg[t.client_id]) {
        clientAgg[t.client_id].tags.push(t.tag)
      }
    }
  }

  // Apply filters
  const matching = clients.filter((c: any) => {
    const agg = clientAgg[c.id]
    if (!agg) return false

    if (filters.minEvents !== undefined && agg.eventCount < filters.minEvents) return false
    if (filters.maxEvents !== undefined && agg.eventCount > filters.maxEvents) return false
    if (filters.minSpendCents !== undefined && agg.totalSpendCents < filters.minSpendCents) return false
    if (filters.lastEventBefore !== undefined && (!agg.lastEventDate || agg.lastEventDate >= filters.lastEventBefore)) return false
    if (filters.lastEventAfter !== undefined && (!agg.lastEventDate || agg.lastEventDate <= filters.lastEventAfter)) return false
    if (filters.tags && filters.tags.length > 0) {
      const hasAll = filters.tags.every((t) => agg.tags.includes(t))
      if (!hasAll) return false
    }

    return true
  })

  return matching.map((c: any) => ({
    id: c.id,
    fullName: c.full_name,
    email: c.email ?? null,
  }))
}

// ============================================
// ACTIONS
// ============================================

/**
 * Create a behavioral segment with filter criteria stored as JSONB.
 * The segment is saved to client_segments with filters as structured JSONB.
 */
export async function buildBehavioralSegment(input: BuildBehavioralSegmentInput) {
  const user = await requireChef()
  const validated = BuildBehavioralSegmentSchema.parse(input)
  const supabase = createServerClient()

  // Convert behavioral filters into the stored JSONB format
  const filterEntries: { field: string; op: string; value: string | number }[] = []

  if (validated.filters.minEvents !== undefined) {
    filterEntries.push({ field: 'event_count', op: 'gte', value: validated.filters.minEvents })
  }
  if (validated.filters.maxEvents !== undefined) {
    filterEntries.push({ field: 'event_count', op: 'lte', value: validated.filters.maxEvents })
  }
  if (validated.filters.minSpendCents !== undefined) {
    filterEntries.push({ field: 'total_spend_cents', op: 'gte', value: validated.filters.minSpendCents })
  }
  if (validated.filters.lastEventBefore !== undefined) {
    filterEntries.push({ field: 'last_event_date', op: 'lt', value: validated.filters.lastEventBefore })
  }
  if (validated.filters.lastEventAfter !== undefined) {
    filterEntries.push({ field: 'last_event_date', op: 'gt', value: validated.filters.lastEventAfter })
  }
  if (validated.filters.tags && validated.filters.tags.length > 0) {
    filterEntries.push({ field: 'tags', op: 'contains_all', value: validated.filters.tags.join(',') })
  }

  const { data, error } = await (supabase as any)
    .from('client_segments')
    .insert({
      tenant_id: user.tenantId!,
      name: validated.name,
      filters: filterEntries,
    })
    .select()
    .single()

  if (error) {
    console.error('[buildBehavioralSegment] Error:', error)
    throw new Error('Failed to create behavioral segment')
  }

  revalidatePath('/clients/segments')
  return {
    success: true,
    segment: {
      id: data.id,
      name: data.name,
      filters: data.filters,
      createdAt: data.created_at,
    },
  }
}

/**
 * Preview a segment by applying filters against current clients.
 * Returns the count and list of matching client IDs without saving.
 */
export async function getSegmentPreview(filters: BehavioralFilters): Promise<SegmentPreview> {
  const user = await requireChef()
  const validated = BehavioralFiltersSchema.parse(filters)
  const supabase = createServerClient()

  const matching = await applyBehavioralFilters(supabase, user.tenantId!, validated)

  return {
    count: matching.length,
    clientIds: matching.map((c) => c.id),
  }
}

/**
 * Re-evaluate a saved segment's filters against current clients.
 * Returns the segment name and all currently matching clients.
 */
export async function evaluateSegmentFilters(segmentId: string): Promise<EvaluatedSegment> {
  const user = await requireChef()
  const supabase = createServerClient()

  // Fetch the segment
  const { data: segment, error } = await (supabase as any)
    .from('client_segments')
    .select('*')
    .eq('id', segmentId)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (error || !segment) {
    console.error('[evaluateSegmentFilters] Error:', error)
    throw new Error('Segment not found')
  }

  // Parse the stored filter entries back into BehavioralFilters
  const storedFilters: { field: string; op: string; value: string | number }[] = segment.filters ?? []
  const behavioralFilters: BehavioralFilters = {}

  for (const f of storedFilters) {
    switch (f.field) {
      case 'event_count':
        if (f.op === 'gte') behavioralFilters.minEvents = Number(f.value)
        if (f.op === 'lte') behavioralFilters.maxEvents = Number(f.value)
        break
      case 'total_spend_cents':
        if (f.op === 'gte') behavioralFilters.minSpendCents = Number(f.value)
        break
      case 'last_event_date':
        if (f.op === 'lt') behavioralFilters.lastEventBefore = String(f.value)
        if (f.op === 'gt') behavioralFilters.lastEventAfter = String(f.value)
        break
      case 'tags':
        if (f.op === 'contains_all') behavioralFilters.tags = String(f.value).split(',')
        break
    }
  }

  const matching = await applyBehavioralFilters(supabase, user.tenantId!, behavioralFilters)

  return {
    segmentId: segment.id,
    segmentName: segment.name,
    matchingCount: matching.length,
    matchingClients: matching,
  }
}
