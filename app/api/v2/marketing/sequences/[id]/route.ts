// API v2: Marketing Sequences - Toggle & Delete by ID
// PATCH  /api/v2/marketing/sequences/:id
// DELETE /api/v2/marketing/sequences/:id

import { NextRequest } from 'next/server'
import { withApiAuth, apiSuccess, apiNoContent, apiError, apiNotFound } from '@/lib/api/v2'
import { toggleSequence, deleteSequence } from '@/lib/marketing/actions'

export const PATCH = withApiAuth(
  async (req: NextRequest, ctx, params) => {
    const id = params?.id
    if (!id) return apiNotFound('Sequence')

    let body: { isActive?: boolean }
    try {
      body = await req.json()
    } catch {
      return apiError('invalid_json', 'Request body must be valid JSON', 400)
    }

    if (typeof body.isActive !== 'boolean') {
      return apiError('validation_error', 'isActive (boolean) is required', 400)
    }

    try {
      await toggleSequence(id, body.isActive)
      return apiSuccess({ id, isActive: body.isActive })
    } catch (err: any) {
      return apiError('update_failed', err.message ?? 'Failed to toggle sequence', 500)
    }
  },
  { scopes: ['marketing:write'] }
)

export const DELETE = withApiAuth(
  async (_req, ctx, params) => {
    const id = params?.id
    if (!id) return apiNotFound('Sequence')

    try {
      await deleteSequence(id)
      return apiNoContent()
    } catch (err: any) {
      return apiError('delete_failed', err.message ?? 'Failed to delete sequence', 500)
    }
  },
  { scopes: ['marketing:write'] }
)
