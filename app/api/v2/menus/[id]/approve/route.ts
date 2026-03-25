// API v2: Approve Menu
// POST /api/v2/menus/:id/approve
// Sets the menu's approval status to 'approved' on the parent event.

import { withApiAuth, apiSuccess, apiNotFound, apiError } from '@/lib/api/v2'

export const POST = withApiAuth(
  async (_req, ctx, params) => {
    const id = params?.id
    if (!id) return apiNotFound('Menu')

    // Fetch the menu and verify ownership
    const { data: menu } = await ctx.db
      .from('menus')
      .select('id, event_id')
      .eq('id', id)
      .eq('tenant_id', ctx.tenantId)
      .single()

    if (!menu) return apiNotFound('Menu')

    const eventId = (menu as any).event_id
    if (!eventId) {
      return apiError('no_event', 'Menu is not linked to an event', 422)
    }

    // Verify the event belongs to this tenant
    const { data: event } = await ctx.db
      .from('events')
      .select('id, menu_approval_status')
      .eq('id', eventId)
      .eq('tenant_id', ctx.tenantId)
      .single()

    if (!event) return apiNotFound('Event')

    const now = new Date().toISOString()

    // Set approval status on the event
    const { data: updated, error } = await ctx.db
      .from('events')
      .update({
        menu_approval_status: 'approved',
        menu_approved_at: now,
        menu_last_client_feedback_at: now,
        updated_at: now,
      } as any)
      .eq('id', eventId)
      .eq('tenant_id', ctx.tenantId)
      .select()
      .single()

    if (error) {
      console.error('[api/v2/menus/approve] Error:', error)
      return apiError('approve_failed', 'Failed to approve menu', 500)
    }

    // Create notification (non-blocking)
    try {
      await ctx.db.from('notifications').insert({
        tenant_id: ctx.tenantId,
        recipient_id: ctx.tenantId,
        recipient_role: 'chef',
        event_id: eventId,
        title: 'Menu approved via API',
        body: 'A menu was approved through the API.',
        category: 'booking',
        action: 'view_event',
        action_url: `/events/${eventId}`,
      })
    } catch {}

    return apiSuccess({
      menu_id: id,
      event_id: eventId,
      approval_status: 'approved',
      approved_at: now,
    })
  },
  { scopes: ['menus:write'] }
)
