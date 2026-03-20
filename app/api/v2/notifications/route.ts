// API v2: Notifications - Send a notification
// POST /api/v2/notifications
//
// Creates a notification in the notifications table, which is displayed
// in the chef's notification center (bell icon + /notifications page).

import { NextRequest } from 'next/server'
import { z } from 'zod'
import { withApiAuth, apiCreated, apiValidationError, apiError } from '@/lib/api/v2'

const SendNotificationBody = z.object({
  // Recipient targeting (at least one required)
  client_id: z.string().uuid().optional(),
  recipient_id: z.string().uuid().optional(),
  recipient_role: z.enum(['chef', 'client']).default('chef'),

  // Content
  title: z.string().min(1).max(200),
  body: z.string().min(1).max(2000),
  category: z
    .enum(['booking', 'payment', 'system', 'reminder', 'ops', 'inquiry', 'marketing'])
    .default('system'),

  // Optional action link
  action: z.string().max(100).optional(),
  action_url: z.string().max(500).optional(),

  // Optional linked entities
  event_id: z.string().uuid().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
})

export const POST = withApiAuth(
  async (req: NextRequest, ctx) => {
    let rawBody: unknown
    try {
      rawBody = await req.json()
    } catch {
      return apiError('invalid_json', 'Request body must be valid JSON', 400)
    }

    const parsed = SendNotificationBody.safeParse(rawBody)
    if (!parsed.success) return apiValidationError(parsed.error)

    const input = parsed.data

    // Default recipient to the tenant (chef) if not specified
    const recipientId = input.recipient_id || ctx.tenantId

    const insertPayload: Record<string, unknown> = {
      tenant_id: ctx.tenantId,
      recipient_id: recipientId,
      recipient_role: input.recipient_role,
      title: input.title,
      body: input.body,
      category: input.category,
    }

    if (input.client_id) insertPayload.client_id = input.client_id
    if (input.event_id) insertPayload.event_id = input.event_id
    if (input.action) insertPayload.action = input.action
    if (input.action_url) insertPayload.action_url = input.action_url
    if (input.metadata) insertPayload.metadata = input.metadata

    const { data, error } = await (ctx.supabase as any)
      .from('notifications')
      .insert(insertPayload)
      .select()
      .single()

    if (error) {
      console.error('[api/v2/notifications] Send error:', error)
      return apiError('create_failed', 'Failed to send notification', 500)
    }

    return apiCreated(data)
  },
  { scopes: ['notifications:write'] }
)
