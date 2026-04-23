import { apiNotFound, apiSuccess, withApiAuth } from '@/lib/api/v2'
import { getClientProfileVectorForTenant } from '@/lib/clients/client-profile-service'

export const GET = withApiAuth(
  async (req, ctx, params) => {
    const clientId = params?.id
    if (!clientId) return apiNotFound('Client')

    const url = new URL(req.url)
    const refresh = ['1', 'true', 'yes'].includes(
      (url.searchParams.get('refresh') ?? '').toLowerCase()
    )

    const vector = await getClientProfileVectorForTenant(clientId, ctx.tenantId, {
      refresh,
      dbClient: ctx.db,
    })

    if (!vector) return apiNotFound('Client')

    return apiSuccess({
      source: refresh ? 'rebuild' : 'current_or_rebuild',
      vector,
    })
  },
  { scopes: ['clients:read'] }
)
