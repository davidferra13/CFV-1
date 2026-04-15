// API v2: Notification by ID
// PATCH /api/v2/notifications/:id - Mark notification as read

import { NextRequest } from 'next/server'
import { z } from 'zod'
import { withApiAuth, apiSuccess, apiNotFound, apiValidationError, apiError } from '@/lib/api/v2'

const UpdateNotificationBody = z
  .object({
    read: z.literal(true),
  })
  .strict()

export const PATCH = withApiAuth(
  async (req: NextRequest, ctx, params) => {
    const id = params?.id
    if (!id) return apiError('missing_param', 'Notification ID is required', 400)

    let body: unknown
    try {
      body = await req.json()
    } catch {
      return apiError('invalid_json', 'Request body must be valid JSON', 400)
    }

    const parsed = UpdateNotificationBody.safeParse(body)
    if (!parsed.success) return apiValidationError(parsed.error)

    // Verify the notification belongs to this tenant before updating.
    // Do NOT delegate to markAsRead() (session-based) from an API key context.
    const { data: notification } = await ctx.db
      .from('notifications')
      .select('id')
      .eq('id', id)
      .eq('recipient_id', ctx.tenantId)
      .single()

    if (!notification) return apiNotFound('Notification')

    const { error } = await ctx.db
      .from('notifications')
      .update({ read_at: new Date().toISOString() } as any)
      .eq('id', id)
      .eq('recipient_id', ctx.tenantId)
      .is('read_at', null)

    if (error) {
      console.error('[api/v2/notifications] PATCH error:', error)
      return apiError('update_failed', 'Failed to mark notification as read', 500)
    }

    return apiSuccess({ id, read: true })
  },
  { scopes: ['notifications:write'] }
)
