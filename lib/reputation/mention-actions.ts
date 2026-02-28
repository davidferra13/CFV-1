'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

// ─── Types ───────────────────────────────────────────────────────

export type BrandMention = {
  id: string
  tenantId: string
  source: string
  title: string
  excerpt: string | null
  sourceUrl: string | null
  sentiment: string
  isReviewed: boolean
  foundAt: string
}

// ─── Helpers ─────────────────────────────────────────────────────

function mapRow(row: any): BrandMention {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    source: row.source,
    title: row.title,
    excerpt: row.excerpt ?? null,
    sourceUrl: row.source_url ?? null,
    sentiment: row.sentiment,
    isReviewed: row.is_reviewed,
    foundAt: row.found_at,
  }
}

// ─── Actions ─────────────────────────────────────────────────────

export async function getMentions(filters?: {
  is_reviewed?: boolean
  sentiment?: string
}): Promise<BrandMention[]> {
  const chef = await requireChef()
  const tenantId = chef.tenantId!
  const supabase: any = createServerClient()

  let query = supabase
    .from('chef_brand_mentions')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('found_at', { ascending: false })

  if (filters?.is_reviewed !== undefined) {
    query = query.eq('is_reviewed', filters.is_reviewed)
  }
  if (filters?.sentiment) {
    query = query.eq('sentiment', filters.sentiment)
  }

  const { data, error } = await query
  if (error) throw new Error(`Failed to fetch brand mentions: ${error.message}`)

  return (data || []).map(mapRow)
}

export async function markReviewed(id: string): Promise<void> {
  const chef = await requireChef()
  const tenantId = chef.tenantId!
  const supabase: any = createServerClient()

  const { error } = await supabase
    .from('chef_brand_mentions')
    .update({ is_reviewed: true })
    .eq('id', id)
    .eq('tenant_id', tenantId)

  if (error) throw new Error(`Failed to mark mention as reviewed: ${error.message}`)

  revalidatePath('/reputation/mentions')
}

export async function createMention(input: {
  source: string
  title: string
  excerpt?: string
  source_url?: string
  sentiment: string
}): Promise<BrandMention> {
  const chef = await requireChef()
  const tenantId = chef.tenantId!
  const supabase: any = createServerClient()

  const { data, error } = await supabase
    .from('chef_brand_mentions')
    .insert({
      tenant_id: tenantId,
      source: input.source,
      title: input.title,
      excerpt: input.excerpt ?? null,
      source_url: input.source_url ?? null,
      sentiment: input.sentiment,
      is_reviewed: false,
      found_at: new Date().toISOString(),
    })
    .select()
    .single()

  if (error) throw new Error(`Failed to create mention: ${error.message}`)

  revalidatePath('/reputation/mentions')
  return mapRow(data)
}

export async function getUnreviewedCount(): Promise<number> {
  const chef = await requireChef()
  const tenantId = chef.tenantId!
  const supabase: any = createServerClient()

  const { count, error } = await supabase
    .from('chef_brand_mentions')
    .select('id', { count: 'exact', head: true })
    .eq('tenant_id', tenantId)
    .eq('is_reviewed', false)

  if (error) throw new Error(`Failed to count unreviewed mentions: ${error.message}`)

  return count ?? 0
}
