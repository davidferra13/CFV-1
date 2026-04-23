import { NextRequest } from 'next/server'
import {
  apiError,
  apiNotFound,
  apiSuccess,
  apiValidationError,
  withApiAuth,
} from '@/lib/api/v2'
import {
  recommendMealForClientForTenant,
} from '@/lib/clients/client-profile-service'
import { RecommendationRequestSchema } from '@/lib/clients/client-profile-service-schema'

export const POST = withApiAuth(
  async (req: NextRequest, ctx, params) => {
    const clientId = params?.id
    if (!clientId) return apiNotFound('Client')

    let body: unknown
    try {
      body = await req.json()
    } catch {
      return apiError('invalid_json', 'Request body must be valid JSON', 400)
    }

    const parsed = RecommendationRequestSchema.safeParse(body)
    if (!parsed.success) return apiValidationError(parsed.error)

    const recommendation = await recommendMealForClientForTenant(
      clientId,
      ctx.tenantId,
      parsed.data,
      ctx.db
    )

    if (!recommendation) return apiNotFound('Client')
    return apiSuccess(recommendation)
  },
  { scopes: ['clients:write'] }
)
