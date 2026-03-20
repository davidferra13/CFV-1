// API v2: Notification by ID (thin wrapper around server actions)
// PATCH /api/v2/notifications/:id - Mark notification as read

import { NextRequest } from 'next/server'
import { z } from 'zod'
import { withApiAuth, apiSuccess, apiValidationError, apiError } from '@/lib/api/v2'
import { markAsRead } from '@/lib/notifications/actions'

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

    try {
      await markAsRead(id)
      return apiSuccess({ id, read: true })
    } catch (err) {
      console.error('[api/v2/notifications] PATCH error:', err)
      return apiError('update_failed', 'Failed to mark notification as read', 500)
    }
  },
  { scopes: ['notifications:write'] }
)
