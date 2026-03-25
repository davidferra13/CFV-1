// API v2: Taxonomy Extensions - Delete by ID
// DELETE /api/v2/settings/taxonomy/:id

import { withApiAuth, apiNoContent, apiNotFound, apiError } from '@/lib/api/v2'

export const DELETE = withApiAuth(
  async (_req, ctx, params) => {
    const id = params?.id
    if (!id) return apiNotFound('Taxonomy entry')

    // Verify it belongs to this tenant before deleting
    const { data: existing } = await ctx.db
      .from('chef_taxonomy_extensions' as any)
      .select('id')
      .eq('id', id)
      .eq('chef_id', ctx.tenantId)
      .single()

    if (!existing) return apiNotFound('Taxonomy entry')

    const { error } = await ctx.db
      .from('chef_taxonomy_extensions' as any)
      .delete()
      .eq('id', id)
      .eq('chef_id', ctx.tenantId)

    if (error) {
      console.error('[api/v2/settings/taxonomy] Delete error:', error)
      return apiError('delete_failed', 'Failed to delete taxonomy entry', 500)
    }

    return apiNoContent()
  },
  { scopes: ['settings:write'] }
)
