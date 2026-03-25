// API v2: Archive Event
// POST /api/v2/events/:id/archive
// Soft-archives an event by setting deleted_at timestamp.

import { withApiAuth, apiSuccess, apiNotFound, apiError } from '@/lib/api/v2'

export const POST = withApiAuth(
  async (_req, ctx, params) => {
    const id = params?.id
    if (!id) return apiNotFound('Event')

    // Verify event exists and belongs to tenant
    const { data: existing } = await ctx.db
      .from('events')
      .select('id, status')
      .eq('id', id)
      .eq('tenant_id', ctx.tenantId)
      .is('deleted_at', null)
      .single()

    if (!existing) return apiNotFound('Event')

    const now = new Date().toISOString()

    const { data, error } = await ctx.db
      .from('events')
      .update({ deleted_at: now, updated_at: now } as any)
      .eq('id', id)
      .eq('tenant_id', ctx.tenantId)
      .select()
      .single()

    if (error) {
      console.error('[api/v2/events/archive] Error:', error)
      return apiError('archive_failed', 'Failed to archive event', 500)
    }

    // Log transition (non-blocking)
    try {
      await ctx.db.from('event_state_transitions').insert({
        tenant_id: ctx.tenantId,
        event_id: id,
        from_status: (existing as any).status,
        to_status: 'archived',
        transitioned_by: ctx.keyId,
        metadata: { action: 'event_archived', source: 'api_v2' },
      } as any)
    } catch {}

    return apiSuccess({ event: data, archived: true })
  },
  { scopes: ['events:write'] }
)
