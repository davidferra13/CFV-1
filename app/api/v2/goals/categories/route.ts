// API v2: Goal Category Settings
// GET   /api/v2/goals/categories
// PATCH /api/v2/goals/categories

import { NextRequest } from 'next/server'
import { z } from 'zod'
import { withApiAuth, apiSuccess, apiValidationError, apiError } from '@/lib/api/v2'
import { getCategorySettings, updateCategorySettings } from '@/lib/goals/actions'

const UpdateBody = z.object({
  enabledCategories: z.array(z.string()),
  nudgeLevels: z.record(z.string(), z.enum(['off', 'gentle', 'normal', 'aggressive'])).optional(),
})

export const GET = withApiAuth(
  async (_req, _ctx) => {
    try {
      const settings = await getCategorySettings()
      return apiSuccess(settings)
    } catch (err: any) {
      return apiError('fetch_failed', err.message ?? 'Failed to fetch category settings', 500)
    }
  },
  { scopes: ['goals:read'] }
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
      await updateCategorySettings(
        parsed.data.enabledCategories as any,
        (parsed.data.nudgeLevels as any) ?? {}
      )
      return apiSuccess({ updated: true })
    } catch (err: any) {
      return apiError('update_failed', err.message ?? 'Failed to update category settings', 500)
    }
  },
  { scopes: ['goals:write'] }
)
