// API v2: Goal Service Type by ID
// PATCH  /api/v2/goals/service-types/:id
// DELETE /api/v2/goals/service-types/:id

import { NextRequest } from 'next/server'
import { z } from 'zod'
import {
  withApiAuth,
  apiSuccess,
  apiNoContent,
  apiNotFound,
  apiValidationError,
  apiError,
} from '@/lib/api/v2'
import { updateServiceType, deleteServiceType } from '@/lib/goals/service-mix-actions'

const UpdateBody = z
  .object({
    name: z.string().optional(),
    description: z.string().optional(),
    color: z.string().optional(),
    targetPercent: z.number().min(0).max(100).optional(),
  })
  .passthrough()

export const PATCH = withApiAuth(
  async (req: NextRequest, _ctx, params) => {
    const id = params?.id
    if (!id) return apiNotFound('Service type')

    let body: unknown
    try {
      body = await req.json()
    } catch {
      return apiError('invalid_json', 'Request body must be valid JSON', 400)
    }

    const parsed = UpdateBody.safeParse(body)
    if (!parsed.success) return apiValidationError(parsed.error)

    try {
      await updateServiceType(id, parsed.data as any)
      return apiSuccess({ updated: true })
    } catch (err: any) {
      return apiError('update_failed', err.message ?? 'Failed to update service type', 500)
    }
  },
  { scopes: ['goals:write'] }
)

export const DELETE = withApiAuth(
  async (_req, _ctx, params) => {
    const id = params?.id
    if (!id) return apiNotFound('Service type')

    try {
      await deleteServiceType(id)
      return apiNoContent()
    } catch (err: any) {
      return apiError('delete_failed', err.message ?? 'Failed to delete service type', 500)
    }
  },
  { scopes: ['goals:write'] }
)
