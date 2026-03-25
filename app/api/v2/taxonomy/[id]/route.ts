// API v2: Taxonomy - Delete custom entry by ID
// DELETE /api/v2/taxonomy/:id

import { withApiAuth, apiNotFound, apiError, apiNoContent } from '@/lib/api/v2'

export const DELETE = withApiAuth(
  async (_req, ctx, params) => {
    const id = params?.id
    if (!id) return apiNotFound('Taxonomy entry')

    // Verify ownership and existence
    const { data: existing } = await ctx.db
      .from('chef_taxonomy_extensions' as any)
      .select('id, category, value')
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
      console.error('[api/v2/taxonomy] Delete error:', error)
      return apiError('delete_failed', 'Failed to delete taxonomy entry', 500)
    }

    // Non-blocking webhook
    try {
      const { emitWebhook } = await import('@/lib/webhooks/emitter')
      await emitWebhook(ctx.tenantId, 'taxonomy.updated' as any, {
        action: 'remove',
        id,
      })
    } catch {}

    return apiNoContent()
  },
  { scopes: ['settings:write'] }
)
