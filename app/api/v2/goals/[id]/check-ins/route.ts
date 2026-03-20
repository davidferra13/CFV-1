// API v2: Goal Check-Ins - List & Create
// GET  /api/v2/goals/:id/check-ins
// POST /api/v2/goals/:id/check-ins

import { NextRequest } from 'next/server'
import { withApiAuth, apiSuccess, apiCreated, apiError, apiNotFound } from '@/lib/api/v2'
import { getGoalCheckIns, logGoalCheckIn } from '@/lib/goals/check-in-actions'

export const GET = withApiAuth(
  async (_req, _ctx, params) => {
    const id = params?.id
    if (!id) return apiNotFound('Goal')

    try {
      const checkIns = await getGoalCheckIns(id)
      return apiSuccess(checkIns)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch check-ins'
      if (message === 'Goal not found') return apiNotFound('Goal')
      console.error('[api/v2/goals/check-ins] GET error:', err)
      return apiError('fetch_failed', message, 500)
    }
  },
  { scopes: ['goals:read'] }
)

export const POST = withApiAuth(
  async (req: NextRequest, _ctx, params) => {
    const id = params?.id
    if (!id) return apiNotFound('Goal')

    let body: unknown
    try {
      body = await req.json()
    } catch {
      return apiError('invalid_json', 'Request body must be valid JSON', 400)
    }

    try {
      const result = await logGoalCheckIn({
        goalId: id,
        ...(body as { loggedValue: number; notes?: string | null }),
      })
      return apiCreated(result)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to log check-in'
      if (message === 'Goal not found') return apiNotFound('Goal')
      console.error('[api/v2/goals/check-ins] POST error:', err)
      return apiError('create_failed', message, 500)
    }
  },
  { scopes: ['goals:write'] }
)
