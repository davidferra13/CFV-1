// API v2: Taxonomy - List & Create
// GET  /api/v2/taxonomy?category=cuisine
// POST /api/v2/taxonomy

import { NextRequest } from 'next/server'
import { z } from 'zod'
import { withApiAuth, apiSuccess, apiCreated, apiValidationError, apiError } from '@/lib/api/v2'
import { getSystemDefaults } from '@/lib/taxonomy/system-defaults'
import {
  TAXONOMY_CATEGORIES,
  type TaxonomyCategory,
  type TaxonomyEntry,
} from '@/lib/taxonomy/types'

const VALID_CATEGORIES = TAXONOMY_CATEGORIES.map((c) => c.value)

const CreateEntryBody = z.object({
  category: z.string().min(1),
  value: z.string().min(1),
  display_label: z.string().min(1),
  metadata: z.record(z.string(), z.unknown()).optional(),
})

export const GET = withApiAuth(
  async (req, ctx) => {
    const url = new URL(req.url)
    const category = url.searchParams.get('category')

    if (!category) {
      return apiError('missing_parameter', 'Query parameter "category" is required', 400)
    }

    if (!VALID_CATEGORIES.includes(category as TaxonomyCategory)) {
      return apiError(
        'invalid_parameter',
        `Invalid category "${category}". Valid categories: ${VALID_CATEGORIES.join(', ')}`,
        400
      )
    }

    const cat = category as TaxonomyCategory

    // Get system defaults
    const systemDefaults = getSystemDefaults(cat)

    // Get chef's hidden entries
    const { data: hiddenRows } = await ctx.supabase
      .from('chef_taxonomy_hidden' as any)
      .select('value')
      .eq('chef_id', ctx.tenantId)
      .eq('category', cat)

    const hiddenSet = new Set((hiddenRows ?? []).map((r: any) => r.value))

    // Get chef's custom entries
    const { data: customRows, error } = await ctx.supabase
      .from('chef_taxonomy_extensions' as any)
      .select('*')
      .eq('chef_id', ctx.tenantId)
      .eq('category', cat)
      .order('sort_order', { ascending: true })

    if (error) {
      console.error('[api/v2/taxonomy] Fetch error:', error)
      return apiError('database_error', 'Failed to fetch taxonomy entries', 500)
    }

    // Merge: system defaults (with hidden flag) + custom entries
    const merged: TaxonomyEntry[] = []

    for (const entry of systemDefaults) {
      merged.push({
        ...entry,
        isHidden: hiddenSet.has(entry.value),
      })
    }

    for (const row of (customRows ?? []) as any[]) {
      merged.push({
        id: row.id,
        value: row.value,
        displayLabel: row.display_label,
        isSystem: false,
        isHidden: false,
        sortOrder: row.sort_order,
        metadata: row.metadata ?? {},
      })
    }

    // Sort: non-hidden first, then by sortOrder, then alphabetically
    merged.sort((a, b) => {
      if (a.isHidden !== b.isHidden) return a.isHidden ? 1 : -1
      if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder
      return a.displayLabel.localeCompare(b.displayLabel)
    })

    return apiSuccess(merged)
  },
  { scopes: ['settings:read'] }
)

export const POST = withApiAuth(
  async (req: NextRequest, ctx) => {
    let body: unknown
    try {
      body = await req.json()
    } catch {
      return apiError('invalid_json', 'Request body must be valid JSON', 400)
    }

    const parsed = CreateEntryBody.safeParse(body)
    if (!parsed.success) return apiValidationError(parsed.error)

    if (!VALID_CATEGORIES.includes(parsed.data.category as TaxonomyCategory)) {
      return apiError(
        'invalid_parameter',
        `Invalid category "${parsed.data.category}". Valid categories: ${VALID_CATEGORIES.join(', ')}`,
        400
      )
    }

    // Slugify value
    const slug = parsed.data.value
      .toLowerCase()
      .replace(/[\s/]+/g, '_')
      .replace(/[^a-z0-9_]/g, '')

    if (!slug) {
      return apiError(
        'invalid_value',
        'Value must contain at least one alphanumeric character',
        400
      )
    }

    const { data, error } = await ctx.supabase
      .from('chef_taxonomy_extensions' as any)
      .insert({
        chef_id: ctx.tenantId,
        category: parsed.data.category,
        value: slug,
        display_label: parsed.data.display_label.trim(),
        sort_order: 999,
        metadata: parsed.data.metadata ?? {},
      } as any)
      .select()
      .single()

    if (error) {
      if (error.code === '23505') {
        return apiError('duplicate_entry', 'A taxonomy entry with this value already exists', 409)
      }
      console.error('[api/v2/taxonomy] Create error:', error)
      return apiError('create_failed', 'Failed to create taxonomy entry', 500)
    }

    // Non-blocking webhook
    try {
      const { emitWebhook } = await import('@/lib/webhooks/emitter')
      await emitWebhook(ctx.tenantId, 'taxonomy.updated' as any, {
        category: parsed.data.category,
        action: 'add',
        value: slug,
      })
    } catch {}

    return apiCreated(data)
  },
  { scopes: ['settings:write'] }
)
