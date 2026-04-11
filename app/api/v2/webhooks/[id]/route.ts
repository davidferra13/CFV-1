// API v2: Webhook Subscriptions - Update & Delete by ID
// PATCH  /api/v2/webhooks/:id
// DELETE /api/v2/webhooks/:id

import { NextRequest } from 'next/server'
import { z } from 'zod'
import {
  withApiAuth,
  apiSuccess,
  apiNotFound,
  apiValidationError,
  apiError,
  apiNoContent,
} from '@/lib/api/v2'
import { validateWebhookUrl } from '@/lib/security/url-validation'
import { CHEF_FEATURE_FLAGS } from '@/lib/features/chef-feature-flags'

const UpdateWebhookBody = z
  .object({
    url: z.string().url().optional(),
    events: z.array(z.string().min(1)).min(1).optional(),
    description: z.string().optional(),
    is_active: z.boolean().optional(),
  })
  .strict()

export const PATCH = withApiAuth(
  async (req: NextRequest, ctx, params) => {
    const id = params?.id
    if (!id) return apiNotFound('Webhook subscription')

    let body: unknown
    try {
      body = await req.json()
    } catch {
      return apiError('invalid_json', 'Request body must be valid JSON', 400)
    }

    const parsed = UpdateWebhookBody.safeParse(body)
    if (!parsed.success) return apiValidationError(parsed.error)

    // Verify ownership
    const { data: existing } = await ctx.db
      .from('webhook_endpoints' as any)
      .select('id')
      .eq('id', id)
      .eq('tenant_id', ctx.tenantId)
      .single()

    if (!existing) return apiNotFound('Webhook subscription')

    // Build update payload
    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    }

    if (parsed.data.url !== undefined) {
      try {
        updateData.url = validateWebhookUrl(parsed.data.url).toString()
      } catch (err) {
        return apiError('invalid_url', String(err), 400)
      }
    }
    if (parsed.data.events !== undefined) {
      updateData.events = parsed.data.events
    }
    if (parsed.data.description !== undefined) {
      updateData.description = parsed.data.description
    }
    if (parsed.data.is_active !== undefined) {
      updateData.is_active = parsed.data.is_active
      // Reset failure count when re-enabling
      if (parsed.data.is_active) {
        updateData.failure_count = 0
      }
    }

    const { data, error } = await ctx.db
      .from('webhook_endpoints' as any)
      .update(updateData as any)
      .eq('id', id)
      .eq('tenant_id', ctx.tenantId)
      .select()
      .single()

    if (error) {
      console.error('[api/v2/webhooks] Update error:', error)
      return apiError('update_failed', 'Failed to update webhook subscription', 500)
    }

    return apiSuccess(data)
  },
  { scopes: ['webhooks:manage'], featureFlag: CHEF_FEATURE_FLAGS.developerTools }
)

export const DELETE = withApiAuth(
  async (_req, ctx, params) => {
    const id = params?.id
    if (!id) return apiNotFound('Webhook subscription')

    // Verify ownership before deleting
    const { data: existing } = await ctx.db
      .from('webhook_endpoints' as any)
      .select('id')
      .eq('id', id)
      .eq('tenant_id', ctx.tenantId)
      .single()

    if (!existing) return apiNotFound('Webhook subscription')

    const { error } = await ctx.db
      .from('webhook_endpoints' as any)
      .delete()
      .eq('id', id)
      .eq('tenant_id', ctx.tenantId)

    if (error) {
      console.error('[api/v2/webhooks] Delete error:', error)
      return apiError('delete_failed', 'Failed to delete webhook subscription', 500)
    }

    return apiNoContent()
  },
  { scopes: ['webhooks:manage'], featureFlag: CHEF_FEATURE_FLAGS.developerTools }
)
