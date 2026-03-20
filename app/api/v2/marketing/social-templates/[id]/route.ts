// API v2: Marketing Social Template by ID
// PATCH  /api/v2/marketing/social-templates/:id
// DELETE /api/v2/marketing/social-templates/:id

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
import { updateSocialTemplate, deleteSocialTemplate } from '@/lib/marketing/social-template-actions'

const UpdateBody = z.object({
  name: z.string().min(1).optional(),
  platform: z.string().optional(),
  content: z.string().optional(),
  mediaUrls: z.array(z.string()).optional(),
  hashtags: z.array(z.string()).optional(),
})

export const PATCH = withApiAuth(
  async (req: NextRequest, _ctx, params) => {
    const id = params?.id
    if (!id) return apiNotFound('Social template')

    let body: unknown
    try {
      body = await req.json()
    } catch {
      return apiError('invalid_json', 'Request body must be valid JSON', 400)
    }

    const parsed = UpdateBody.safeParse(body)
    if (!parsed.success) return apiValidationError(parsed.error)

    try {
      const result = await updateSocialTemplate(id, parsed.data as any)
      if (result.error) return apiError('update_failed', result.error, 500)
      return apiSuccess(result.data)
    } catch (err: any) {
      return apiError('update_failed', err.message ?? 'Failed to update template', 500)
    }
  },
  { scopes: ['marketing:write'] }
)

export const DELETE = withApiAuth(
  async (_req, _ctx, params) => {
    const id = params?.id
    if (!id) return apiNotFound('Social template')

    try {
      const result = await deleteSocialTemplate(id)
      if (result.error) return apiError('delete_failed', result.error, 500)
      return apiNoContent()
    } catch (err: any) {
      return apiError('delete_failed', err.message ?? 'Failed to delete template', 500)
    }
  },
  { scopes: ['marketing:write'] }
)
