// API v2: Marketing Campaigns - Send Now
// POST /api/v2/marketing/campaigns/:id/send

import { withApiAuth, apiSuccess, apiError, apiNotFound } from '@/lib/api/v2'
import { sendCampaignNow } from '@/lib/marketing/actions'

export const POST = withApiAuth(
  async (_req, ctx, params) => {
    const id = params?.id
    if (!id) return apiNotFound('Campaign')

    try {
      const result = await sendCampaignNow(id)
      return apiSuccess(result)
    } catch (err: any) {
      return apiError('send_failed', err.message ?? 'Failed to send campaign', 500)
    }
  },
  { scopes: ['marketing:write'] }
)
