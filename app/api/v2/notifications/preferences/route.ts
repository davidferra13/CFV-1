// API v2: Notification Preferences
// GET  /api/v2/notifications/preferences
// PATCH /api/v2/notifications/preferences

import { NextRequest } from 'next/server'
import { z } from 'zod'
import { withApiAuth, apiSuccess, apiValidationError, apiError } from '@/lib/api/v2'
import {
  getNotificationPreferences,
  upsertCategoryPreference,
} from '@/lib/notifications/settings-actions'

const UpdatePrefBody = z.object({
  category: z.string().min(1),
  channels: z.object({
    email_enabled: z.boolean().nullish(),
    push_enabled: z.boolean().nullish(),
    sms_enabled: z.boolean().nullish(),
  }),
})

export const GET = withApiAuth(
  async (_req, _ctx) => {
    try {
      const prefs = await getNotificationPreferences()
      return apiSuccess({ preferences: prefs })
    } catch (err: any) {
      return apiError('fetch_failed', err.message ?? 'Failed to fetch preferences', 500)
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

    const parsed = UpdatePrefBody.safeParse(body)
    if (!parsed.success) return apiValidationError(parsed.error)

    try {
      const result = await upsertCategoryPreference(
        parsed.data.category as any,
        parsed.data.channels
      )
      if (result.error) return apiError('update_failed', result.error, 500)
      return apiSuccess({ updated: true })
    } catch (err: any) {
      return apiError('update_failed', err.message ?? 'Failed to update preferences', 500)
    }
  },
  { scopes: ['notifications:write'] }
)
