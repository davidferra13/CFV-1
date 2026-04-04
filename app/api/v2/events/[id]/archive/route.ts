// API v2: Archive Event
// POST /api/v2/events/:id/archive
// Marks an event as archived without deleting it.

import { withApiAuth, apiSuccess, apiNotFound, apiError } from '@/lib/api/v2'

export const POST = withApiAuth(
  async (_req, ctx, params) => {
    const id = params?.id
    if (!id) return apiNotFound('Event')

    const { data: existing } = await ctx.db
      .from('events')
      .select('id, archived')
      .eq('id', id)
      .eq('tenant_id', ctx.tenantId)
      .is('deleted_at', null)
      .single()

    if (!existing) return apiNotFound('Event')

    if ((existing as any).archived) {
      return apiSuccess({ event: existing, archived: true })
    }

    const now = new Date().toISOString()

    const { data, error } = await ctx.db
      .from('events')
      .update({ archived: true, updated_at: now } as any)
      .eq('id', id)
      .eq('tenant_id', ctx.tenantId)
      .is('deleted_at', null)
      .select()
      .single()

    if (error) {
      console.error('[api/v2/events/archive] Error:', error)
      return apiError('archive_failed', 'Failed to archive event', 500)
    }

    return apiSuccess({ event: data, archived: true })
  },
  { scopes: ['events:write'] }
)
