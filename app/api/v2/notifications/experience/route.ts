// API v2: Notification Experience Settings (quiet hours, digest)
// GET   /api/v2/notifications/experience
// PATCH /api/v2/notifications/experience

import { NextRequest } from 'next/server'
import { z } from 'zod'
import { withApiAuth, apiSuccess, apiValidationError, apiError } from '@/lib/api/v2'
import {
  getNotificationExperienceSettings,
  updateNotificationExperienceSettings,
} from '@/lib/notifications/settings-actions'

const UpdateBody = z
  .object({
    quietHoursEnabled: z.boolean().optional(),
    quietHoursStart: z.string().optional(),
    quietHoursEnd: z.string().optional(),
    digestEnabled: z.boolean().optional(),
    digestFrequency: z.enum(['daily', 'weekly']).optional(),
  })
  .passthrough()

export const GET = withApiAuth(
  async (_req, _ctx) => {
    try {
      const settings = await getNotificationExperienceSettings()
      return apiSuccess(settings)
    } catch (err: any) {
      return apiError('fetch_failed', err.message ?? 'Failed to fetch experience settings', 500)
    }
  },
  { scopes: ['notifications:read'] }
)

export const PATCH = withApiAuth(
  async (req: NextRequest, _ctx) => {
    let body: unknown
    try {
      body = await req.json()
    } catch {
      return apiError('invalid_json', 'Request body must be valid JSON', 400)
    }

    const parsed = UpdateBody.safeParse(body)
    if (!parsed.success) return apiValidationError(parsed.error)

    try {
      const result = await updateNotificationExperienceSettings(parsed.data as any)
      if (result.error) return apiError('update_failed', result.error, 500)
      return apiSuccess({ updated: true })
    } catch (err: any) {
      return apiError('update_failed', err.message ?? 'Failed to update experience settings', 500)
    }
  },
  { scopes: ['notifications:write'] }
)
