// API v2: Taxonomy - Unhide a system default
// DELETE /api/v2/taxonomy/hidden/:category/:value

import { withApiAuth, apiNotFound, apiError, apiNoContent } from '@/lib/api/v2'
import { TAXONOMY_CATEGORIES, type TaxonomyCategory } from '@/lib/taxonomy/types'

const VALID_CATEGORIES = TAXONOMY_CATEGORIES.map((c) => c.value)

export const DELETE = withApiAuth(
  async (_req, ctx, params) => {
    const category = params?.category
    const value = params?.value
    if (!category || !value) return apiNotFound('Hidden taxonomy entry')

    if (!VALID_CATEGORIES.includes(category as TaxonomyCategory)) {
      return apiError(
        'invalid_parameter',
        `Invalid category "${category}". Valid categories: ${VALID_CATEGORIES.join(', ')}`,
        400
      )
    }

    // Check existence first
    const { data: existing } = await ctx.db
      .from('chef_taxonomy_hidden' as any)
      .select('id')
      .eq('chef_id', ctx.tenantId)
      .eq('category', category)
      .eq('value', decodeURIComponent(value))
      .single()

    if (!existing) return apiNotFound('Hidden taxonomy entry')

    const { error } = await ctx.db
      .from('chef_taxonomy_hidden' as any)
      .delete()
      .eq('chef_id', ctx.tenantId)
      .eq('category', category)
      .eq('value', decodeURIComponent(value))

    if (error) {
      console.error('[api/v2/taxonomy/hidden] Unhide error:', error)
      return apiError('unhide_failed', 'Failed to unhide taxonomy entry', 500)
    }

    return apiNoContent()
  },
  { scopes: ['settings:write'] }
)
