// API v2: Reorder service types
// POST /api/v2/goals/service-types/reorder

import { NextRequest } from 'next/server'
import { z } from 'zod'
import { withApiAuth, apiSuccess, apiValidationError, apiError } from '@/lib/api/v2'
import { reorderServiceTypes } from '@/lib/goals/service-mix-actions'

const ReorderBody = z.object({
  orderedIds: z.array(z.string().uuid()),
})

export const POST = withApiAuth(
  async (req: NextRequest, _ctx) => {
    let body: unknown
    try {
      body = await req.json()
    } catch {
      return apiError('invalid_json', 'Request body must be valid JSON', 400)
    }

    const parsed = ReorderBody.safeParse(body)
    if (!parsed.success) return apiValidationError(parsed.error)

    try {
      await reorderServiceTypes(parsed.data.orderedIds)
      return apiSuccess({ reordered: true })
    } catch (err: any) {
      return apiError('reorder_failed', err.message ?? 'Failed to reorder service types', 500)
    }
  },
  { scopes: ['goals:write'] }
)
