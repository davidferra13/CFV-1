// API v2: Marketing Segment by ID
// DELETE /api/v2/marketing/segments/:id

import { withApiAuth, apiNoContent, apiNotFound, apiError } from '@/lib/api/v2'
import { deleteBehavioralSegment } from '@/lib/marketing/segmentation-actions'

export const DELETE = withApiAuth(
  async (_req, _ctx, params) => {
    const id = params?.id
    if (!id) return apiNotFound('Segment')

    try {
      await deleteBehavioralSegment(id)
      return apiNoContent()
    } catch (err: any) {
      return apiError('delete_failed', err.message ?? 'Failed to delete segment', 500)
    }
  },
  { scopes: ['marketing:write'] }
)
