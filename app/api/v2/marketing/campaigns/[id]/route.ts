// API v2: Marketing Campaigns - Get, Update, Delete by ID
// GET    /api/v2/marketing/campaigns/:id
// PATCH  /api/v2/marketing/campaigns/:id
// DELETE /api/v2/marketing/campaigns/:id

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

const UpdateCampaignBody = z
  .object({
    name: z.string().min(1).optional(),
    occasion: z.string().optional(),
    proposed_date: z.string().optional(),
    proposed_time: z.string().optional(),
    price_per_person_cents: z.number().int().nonnegative().nullable().optional(),
    guest_count_min: z.number().int().positive().nullable().optional(),
    guest_count_max: z.number().int().positive().nullable().optional(),
    seats_available: z.number().int().positive().nullable().optional(),
    concept_description: z.string().nullable().optional(),
    menu_id: z.string().uuid().nullable().optional(),
    subject: z.string().optional(),
    body_html: z.string().optional(),
    target_segment: z.record(z.string(), z.unknown()).optional(),
  })
  .strict()

export const GET = withApiAuth(
  async (_req, ctx, params) => {
    const id = params?.id
    if (!id) return apiNotFound('Campaign')

    const { data: campaign, error } = await (ctx.supabase as any)
      .from('marketing_campaigns')
      .select('*')
      .eq('id', id)
      .eq('chef_id', ctx.tenantId)
      .single()

    if (error || !campaign) return apiNotFound('Campaign')

    // Fetch recipients for this campaign
    const { data: recipients } = await (ctx.supabase as any)
      .from('campaign_recipients')
      .select('*')
      .eq('campaign_id', id)
      .order('created_at', { ascending: false })

    return apiSuccess({ ...campaign, recipients: recipients ?? [] })
  },
  { scopes: ['marketing:read'] }
)

export const PATCH = withApiAuth(
  async (req: NextRequest, ctx, params) => {
    const id = params?.id
    if (!id) return apiNotFound('Campaign')

    let body: unknown
    try {
      body = await req.json()
    } catch {
      return apiError('invalid_json', 'Request body must be valid JSON', 400)
    }

    const parsed = UpdateCampaignBody.safeParse(body)
    if (!parsed.success) return apiValidationError(parsed.error)

    // Verify campaign belongs to tenant
    const { data: existing } = await (ctx.supabase as any)
      .from('marketing_campaigns')
      .select('id, status')
      .eq('id', id)
      .eq('chef_id', ctx.tenantId)
      .single()

    if (!existing) return apiNotFound('Campaign')

    const { data, error } = await (ctx.supabase as any)
      .from('marketing_campaigns')
      .update({ ...parsed.data, updated_at: new Date().toISOString() } as any)
      .eq('id', id)
      .eq('chef_id', ctx.tenantId)
      .select()
      .single()

    if (error) {
      console.error('[api/v2/marketing/campaigns] Update error:', error)
      return apiError('update_failed', 'Failed to update campaign', 500)
    }

    return apiSuccess(data)
  },
  { scopes: ['marketing:write'] }
)

export const DELETE = withApiAuth(
  async (_req, ctx, params) => {
    const id = params?.id
    if (!id) return apiNotFound('Campaign')

    // Only allow deleting draft campaigns
    const { data: existing } = await (ctx.supabase as any)
      .from('marketing_campaigns')
      .select('id, status')
      .eq('id', id)
      .eq('chef_id', ctx.tenantId)
      .single()

    if (!existing) return apiNotFound('Campaign')

    if ((existing as any).status !== 'draft') {
      return apiError(
        'cannot_delete',
        'Only draft campaigns can be deleted. Archive sent campaigns instead.',
        409
      )
    }

    const { error } = await (ctx.supabase as any)
      .from('marketing_campaigns')
      .delete()
      .eq('id', id)
      .eq('chef_id', ctx.tenantId)

    if (error) {
      console.error('[api/v2/marketing/campaigns] Delete error:', error)
      return apiError('delete_failed', 'Failed to delete campaign', 500)
    }

    return apiNoContent()
  },
  { scopes: ['marketing:write'] }
)
