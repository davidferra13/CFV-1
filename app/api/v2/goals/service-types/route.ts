// API v2: Goal Service Types
// POST /api/v2/goals/service-types

import { NextRequest } from 'next/server'
import { z } from 'zod'
import { withApiAuth, apiSuccess, apiCreated, apiValidationError, apiError } from '@/lib/api/v2'
import { createServiceType } from '@/lib/goals/service-mix-actions'

const CreateBody = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  color: z.string().optional(),
  targetPercent: z.number().min(0).max(100).optional(),
})

export const POST = withApiAuth(
  async (req: NextRequest, _ctx) => {
    let body: unknown
    try {
      body = await req.json()
    } catch {
      return apiError('invalid_json', 'Request body must be valid JSON', 400)
    }

    const parsed = CreateBody.safeParse(body)
    if (!parsed.success) return apiValidationError(parsed.error)

    try {
      const result = await createServiceType(parsed.data as any)
      return apiCreated(result)
    } catch (err: any) {
      return apiError('create_failed', err.message ?? 'Failed to create service type', 500)
    }
  },
  { scopes: ['goals:write'] }
)
