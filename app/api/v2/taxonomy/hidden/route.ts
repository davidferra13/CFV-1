// API v2: Taxonomy - Hide a system default
// POST /api/v2/taxonomy/hidden

import { NextRequest } from 'next/server'
import { z } from 'zod'
import { withApiAuth, apiCreated, apiValidationError, apiError } from '@/lib/api/v2'
import { TAXONOMY_CATEGORIES, type TaxonomyCategory } from '@/lib/taxonomy/types'

const VALID_CATEGORIES = TAXONOMY_CATEGORIES.map((c) => c.value)

const HideEntryBody = z.object({
  category: z.string().min(1),
  value: z.string().min(1),
})

export const POST = withApiAuth(
  async (req: NextRequest, ctx) => {
    let body: unknown
    try {
      body = await req.json()
    } catch {
      return apiError('invalid_json', 'Request body must be valid JSON', 400)
    }

    const parsed = HideEntryBody.safeParse(body)
    if (!parsed.success) return apiValidationError(parsed.error)

    if (!VALID_CATEGORIES.includes(parsed.data.category as TaxonomyCategory)) {
      return apiError(
        'invalid_parameter',
        `Invalid category "${parsed.data.category}". Valid categories: ${VALID_CATEGORIES.join(', ')}`,
        400
      )
    }

    const { data, error } = await ctx.supabase
      .from('chef_taxonomy_hidden' as any)
      .insert({
        chef_id: ctx.tenantId,
        category: parsed.data.category,
        value: parsed.data.value,
      } as any)
      .select()
      .single()

    if (error) {
      // Already hidden is idempotent success
      if (error.code === '23505') {
        return apiCreated({
          category: parsed.data.category,
          value: parsed.data.value,
          already_hidden: true,
        })
      }
      console.error('[api/v2/taxonomy/hidden] Hide error:', error)
      return apiError('hide_failed', 'Failed to hide taxonomy entry', 500)
    }

    return apiCreated(data)
  },
  { scopes: ['settings:write'] }
)
