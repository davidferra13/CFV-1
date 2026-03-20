// API v2: Commerce Settlement by ID
// GET   /api/v2/commerce/settlements/:id
// PATCH /api/v2/commerce/settlements/:id

import { NextRequest } from 'next/server'
import { z } from 'zod'
import { withApiAuth, apiSuccess, apiNotFound, apiValidationError, apiError } from '@/lib/api/v2'
import { getSettlement, updateSettlementStatus } from '@/lib/commerce/settlement-actions'

const UpdateBody = z.object({
  status: z.enum(['pending', 'settled', 'failed']),
  arrivalDate: z.string().optional(),
})

export const GET = withApiAuth(
  async (_req, _ctx, params) => {
    const id = params?.id
    if (!id) return apiNotFound('Settlement')

    try {
      const settlement = await getSettlement(id)
      if (!settlement) return apiNotFound('Settlement')
      return apiSuccess(settlement)
    } catch (err: any) {
      return apiError('fetch_failed', err.message ?? 'Failed to fetch settlement', 500)
    }
  },
  { scopes: ['commerce:read'] }
)

export const PATCH = withApiAuth(
  async (req: NextRequest, _ctx, params) => {
    const id = params?.id
    if (!id) return apiNotFound('Settlement')

    let body: unknown
    try {
      body = await req.json()
    } catch {
      return apiError('invalid_json', 'Request body must be valid JSON', 400)
    }

    const parsed = UpdateBody.safeParse(body)
    if (!parsed.success) return apiValidationError(parsed.error)

    try {
      await updateSettlementStatus(id, parsed.data.status, parsed.data.arrivalDate)
      return apiSuccess({ updated: true })
    } catch (err: any) {
      return apiError('update_failed', err.message ?? 'Failed to update settlement', 500)
    }
  },
  { scopes: ['commerce:write'] }
)
