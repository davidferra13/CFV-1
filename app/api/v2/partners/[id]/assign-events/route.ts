// API v2: Bulk assign events to partner
// POST /api/v2/partners/:id/assign-events

import { NextRequest } from 'next/server'
import { z } from 'zod'
import { withApiAuth, apiSuccess, apiNotFound, apiValidationError, apiError } from '@/lib/api/v2'
import { bulkAssignEventsToPartner } from '@/lib/partners/actions'

const AssignBody = z.object({
  locationId: z.string().uuid().nullable(),
  eventIds: z.array(z.string().uuid()).min(1),
})

export const POST = withApiAuth(
  async (req: NextRequest, _ctx, params) => {
    const partnerId = params?.id
    if (!partnerId) return apiNotFound('Partner')

    let body: unknown
    try {
      body = await req.json()
    } catch {
      return apiError('invalid_json', 'Request body must be valid JSON', 400)
    }

    const parsed = AssignBody.safeParse(body)
    if (!parsed.success) return apiValidationError(parsed.error)

    try {
      await bulkAssignEventsToPartner(partnerId, parsed.data.locationId, parsed.data.eventIds)
      return apiSuccess({ assigned: true })
    } catch (err: any) {
      return apiError('assign_failed', err.message ?? 'Failed to assign events', 500)
    }
  },
  { scopes: ['partners:write'] }
)
