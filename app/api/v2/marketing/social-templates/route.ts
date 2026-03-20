// API v2: Marketing Social Templates
// POST /api/v2/marketing/social-templates

import { NextRequest } from 'next/server'
import { z } from 'zod'
import { withApiAuth, apiCreated, apiValidationError, apiError } from '@/lib/api/v2'
import { createSocialTemplate } from '@/lib/marketing/social-template-actions'

const CreateBody = z.object({
  name: z.string().min(1),
  platform: z.string().min(1),
  content: z.string().min(1),
  mediaUrls: z.array(z.string()).optional(),
  hashtags: z.array(z.string()).optional(),
})

export const POST = withApiAuth(
  async (req: NextRequest, _ctx) => {
    let body: unknown
    try {
      body = await req.json()
    } catch {
      return apiError('invalid_json', 'Request body must be valid JSON', 400)
    }

    const parsed = CreateBody.safeParse(body)
    if (!parsed.success) return apiValidationError(parsed.error)

    try {
      const result = await createSocialTemplate(parsed.data as any)
      if (result.error) return apiError('create_failed', result.error, 500)
      return apiCreated(result.data)
    } catch (err: any) {
      return apiError('create_failed', err.message ?? 'Failed to create template', 500)
    }
  },
  { scopes: ['marketing:write'] }
)
