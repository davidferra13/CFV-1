// API v2: Notification SMS Settings
// GET   /api/v2/notifications/sms-settings
// PATCH /api/v2/notifications/sms-settings

import { NextRequest } from 'next/server'
import { z } from 'zod'
import { withApiAuth, apiSuccess, apiValidationError, apiError } from '@/lib/api/v2'
import { getSmsSettingsForTenant, updateSmsSettingsForTenant } from '@/lib/notifications/store'

const UpdateSmsBody = z.object({
  smsOptIn: z.boolean(),
  phoneNumber: z.string().optional(),
})

export const GET = withApiAuth(
  async (_req, ctx) => {
    try {
      const settings = await getSmsSettingsForTenant(ctx.tenantId)
      return apiSuccess(settings)
    } catch (err: any) {
      return apiError('fetch_failed', err.message ?? 'Failed to fetch SMS settings', 500)
    }
  },
  { scopes: ['notifications:read'] }
)

export const PATCH = withApiAuth(
  async (req: NextRequest, ctx) => {
    let body: unknown
    try {
      body = await req.json()
    } catch {
      return apiError('invalid_json', 'Request body must be valid JSON', 400)
    }

    const parsed = UpdateSmsBody.safeParse(body)
    if (!parsed.success) return apiValidationError(parsed.error)

    try {
      const result = await updateSmsSettingsForTenant(ctx.tenantId, {
        sms_opt_in: parsed.data.smsOptIn,
        sms_notify_phone: parsed.data.phoneNumber ?? null,
      })
      if (result.error) return apiError('update_failed', result.error, 500)
      return apiSuccess({ updated: true })
    } catch (err: any) {
      return apiError('update_failed', err.message ?? 'Failed to update SMS settings', 500)
    }
  },
  { scopes: ['notifications:write'] }
)
