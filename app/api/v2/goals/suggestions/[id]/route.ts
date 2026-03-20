// API v2: Update goal suggestion status
// PATCH /api/v2/goals/suggestions/:id

import { NextRequest } from 'next/server'
import { z } from 'zod'
import { withApiAuth, apiSuccess, apiNotFound, apiValidationError, apiError } from '@/lib/api/v2'
import { updateSuggestionStatus } from '@/lib/goals/actions'

const UpdateBody = z.object({
  status: z.enum(['contacted', 'booked', 'declined', 'dismissed']),
  bookedEventId: z.string().uuid().optional(),
})

export const PATCH = withApiAuth(
  async (req: NextRequest, _ctx, params) => {
    const id = params?.id
    if (!id) return apiNotFound('Suggestion')

    let body: unknown
    try {
      body = await req.json()
    } catch {
      return apiError('invalid_json', 'Request body must be valid JSON', 400)
    }

    const parsed = UpdateBody.safeParse(body)
    if (!parsed.success) return apiValidationError(parsed.error)

    try {
      await updateSuggestionStatus(id, parsed.data.status, parsed.data.bookedEventId)
      return apiSuccess({ updated: true })
    } catch (err: any) {
      return apiError('update_failed', err.message ?? 'Failed to update suggestion status', 500)
    }
  },
  { scopes: ['goals:write'] }
)
