// API v2: Safety Incident Resolution Status
// PATCH /api/v2/safety/incidents/:id/resolution

import { NextRequest } from 'next/server'
import { z } from 'zod'
import { withApiAuth, apiSuccess, apiNotFound, apiValidationError, apiError } from '@/lib/api/v2'
import { updateResolutionStatus } from '@/lib/safety/incident-actions'

const UpdateBody = z.object({
  status: z.enum(['open', 'in_progress', 'resolved']),
})

export const PATCH = withApiAuth(
  async (req: NextRequest, _ctx, params) => {
    const id = params?.id
    if (!id) return apiNotFound('Incident')

    let body: unknown
    try {
      body = await req.json()
    } catch {
      return apiError('invalid_json', 'Request body must be valid JSON', 400)
    }

    const parsed = UpdateBody.safeParse(body)
    if (!parsed.success) return apiValidationError(parsed.error)

    try {
      await updateResolutionStatus(id, parsed.data.status)
      return apiSuccess({ updated: true })
    } catch (err: any) {
      return apiError('update_failed', err.message ?? 'Failed to update resolution status', 500)
    }
  },
  { scopes: ['safety:write'] }
)
