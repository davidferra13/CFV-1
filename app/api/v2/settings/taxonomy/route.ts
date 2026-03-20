// API v2: Taxonomy Extensions - List & Create
// GET  /api/v2/settings/taxonomy?category=cuisine
// POST /api/v2/settings/taxonomy

import { NextRequest } from 'next/server'
import { z } from 'zod'
import { withApiAuth, apiSuccess, apiCreated, apiValidationError, apiError } from '@/lib/api/v2'
import { TAXONOMY_CATEGORIES } from '@/lib/taxonomy/types'
import { getSystemDefaults } from '@/lib/taxonomy/system-defaults'

const VALID_CATEGORIES = TAXONOMY_CATEGORIES.map((c) => c.value)

const CreateBody = z.object({
  category: z.string().min(1),
  value: z.string().min(1),
  display_label: z.string().min(1),
})

export const GET = withApiAuth(
  async (req: NextRequest, ctx) => {
    const url = new URL(req.url)
    const category = url.searchParams.get('category')

    if (!category || !VALID_CATEGORIES.includes(category as any)) {
      return apiError(
        'invalid_category',
        `category query param required. Valid values: ${VALID_CATEGORIES.join(', ')}`,
        400
      )
    }

    // Get system defaults
    const systemDefaults = getSystemDefaults(category as any).map((entry) => ({
      id: null,
      value: entry.value,
      display_label: entry.displayLabel,
      sort_order: entry.sortOrder,
      is_system: true,
      category,
    }))

    // Get chef's custom entries
    const { data: customRows, error } = await ctx.supabase
      .from('chef_taxonomy_extensions' as any)
      .select('*')
      .eq('chef_id', ctx.tenantId)
      .eq('category', category)
      .order('sort_order', { ascending: true })

    if (error) {
      console.error('[api/v2/settings/taxonomy] List error:', error)
      return apiError('database_error', 'Failed to fetch taxonomy entries', 500)
    }

    const customEntries = (customRows ?? []).map((row: any) => ({
      id: row.id,
      value: row.value,
      display_label: row.display_label,
      sort_order: row.sort_order,
      is_system: false,
      category,
    }))

    return apiSuccess([...systemDefaults, ...customEntries])
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

    const parsed = CreateBody.safeParse(body)
    if (!parsed.success) return apiValidationError(parsed.error)

    if (!VALID_CATEGORIES.includes(parsed.data.category as any)) {
      return apiError(
        'invalid_category',
        `Invalid category. Valid values: ${VALID_CATEGORIES.join(', ')}`,
        400
      )
    }

    const slug = parsed.data.value
      .toLowerCase()
      .replace(/[\s/]+/g, '_')
      .replace(/[^a-z0-9_]/g, '')
    if (!slug)
      return apiError(
        'invalid_value',
        'Value must contain at least one alphanumeric character',
        400
      )

    const { data, error } = await ctx.supabase
      .from('chef_taxonomy_extensions' as any)
      .insert({
        chef_id: ctx.tenantId,
        category: parsed.data.category,
        value: slug,
        display_label: parsed.data.display_label.trim(),
        sort_order: 999,
      } as any)
      .select()
      .single()

    if (error) {
      if (error.code === '23505') {
        return apiError(
          'duplicate_entry',
          'An entry with this value already exists in this category',
          409
        )
      }
      console.error('[api/v2/settings/taxonomy] Create error:', error)
      return apiError('create_failed', 'Failed to create taxonomy entry', 500)
    }

    return apiCreated(data)
  },
  { scopes: ['settings:write'] }
)
