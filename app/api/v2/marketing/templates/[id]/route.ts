// API v2: Marketing Campaign Templates - Delete by ID
// DELETE /api/v2/marketing/templates/:id

import { withApiAuth, apiNoContent, apiError, apiNotFound } from '@/lib/api/v2'
import { deleteCampaignTemplate } from '@/lib/marketing/actions'

export const DELETE = withApiAuth(
  async (_req, ctx, params) => {
    const id = params?.id
    if (!id) return apiNotFound('Template')

    try {
      await deleteCampaignTemplate(id)
      return apiNoContent()
    } catch (err: any) {
      return apiError('delete_failed', err.message ?? 'Failed to delete template', 500)
    }
  },
  { scopes: ['marketing:write'] }
)
