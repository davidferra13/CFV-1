// API v2: Marketing Campaign Templates - Update, Delete by ID
// PATCH  /api/v2/marketing/templates/:id
// DELETE /api/v2/marketing/templates/:id

import { NextRequest } from 'next/server'
import { z } from 'zod'
import {
  withApiAuth,
  apiSuccess,
  apiNoContent,
  apiNotFound,
  apiValidationError,
  apiError,
} from '@/lib/api/v2'
import { deleteCampaignTemplate } from '@/lib/marketing/actions'
import { saveEmailTemplate } from '@/lib/marketing/email-template-actions'

const UpdateTemplateBody = z.object({
  name: z.string().min(1),
  subject: z.string().min(1),
  bodyHtml: z.string().min(1),
  category: z.string().optional(),
})

export const PATCH = withApiAuth(
  async (req: NextRequest, _ctx, params) => {
    const id = params?.id
    if (!id) return apiNotFound('Template')

    let body: unknown
    try {
      body = await req.json()
    } catch {
      return apiError('invalid_json', 'Request body must be valid JSON', 400)
    }

    const parsed = UpdateTemplateBody.safeParse(body)
    if (!parsed.success) return apiValidationError(parsed.error)

    try {
      const result = await saveEmailTemplate(parsed.data as any)
      return apiSuccess(result.template)
    } catch (err: any) {
      return apiError('update_failed', err.message ?? 'Failed to update template', 500)
    }
  },
  { scopes: ['marketing:write'] }
)

export const DELETE = withApiAuth(
  async (_req, ctx, params) => {
    const id = params?.id
    if (!id) return apiNotFound('Template')

    try {
      await deleteCampaignTemplate(id)
      return apiNoContent()
    } catch (err: any) {
      return apiError('delete_failed', err.message ?? 'Failed to delete template', 500)
    }
  },
  { scopes: ['marketing:write'] }
)
