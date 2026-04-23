import { apiNotFound, apiSuccess, withApiAuth } from '@/lib/api/v2'
import { rebuildClientProfileVectorForTenant } from '@/lib/clients/client-profile-service'

export const POST = withApiAuth(
  async (_req, ctx, params) => {
    const clientId = params?.id
    if (!clientId) return apiNotFound('Client')

    const vector = await rebuildClientProfileVectorForTenant(clientId, ctx.tenantId, ctx.db)
    if (!vector) return apiNotFound('Client')

    return apiSuccess({
      source: 'rebuild',
      vector,
    })
  },
  { scopes: ['clients:write'] }
)
