// API v2: Notification Experience Settings (quiet hours, digest)
// GET   /api/v2/notifications/experience
// PATCH /api/v2/notifications/experience

import { NextRequest } from 'next/server'
import { z } from 'zod'
import { withApiAuth, apiSuccess, apiValidationError, apiError } from '@/lib/api/v2'
import {
  getExperienceSettingsForTenant,
  updateExperienceSettingsForTenant,
} from '@/lib/notifications/store'

const UpdateBody = z
  .object({
    quietHoursEnabled: z.boolean().optional(),
    quietHoursStart: z.string().optional(),
    quietHoursEnd: z.string().optional(),
    digestEnabled: z.boolean().optional(),
    digestIntervalMinutes: z.number().min(5).max(120).optional(),
  })
  .passthrough()

export const GET = withApiAuth(
  async (_req, ctx) => {
    try {
      const settings = await getExperienceSettingsForTenant(ctx.tenantId)
      return apiSuccess(settings)
    } catch (err: any) {
      return apiError('fetch_failed', err.message ?? 'Failed to fetch experience settings', 500)
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

    const parsed = UpdateBody.safeParse(body)
    if (!parsed.success) return apiValidationError(parsed.error)

    try {
      const result = await updateExperienceSettingsForTenant(ctx.tenantId, {
        quiet_hours_enabled: parsed.data.quietHoursEnabled ?? false,
        quiet_hours_start: parsed.data.quietHoursStart ?? null,
        quiet_hours_end: parsed.data.quietHoursEnd ?? null,
        digest_enabled: parsed.data.digestEnabled ?? false,
        digest_interval_minutes: parsed.data.digestIntervalMinutes ?? 15,
      })
      if (result.error) return apiError('update_failed', result.error, 500)
      return apiSuccess({ updated: true })
    } catch (err: any) {
      return apiError('update_failed', err.message ?? 'Failed to update experience settings', 500)
    }
  },
  { scopes: ['notifications:write'] }
)
