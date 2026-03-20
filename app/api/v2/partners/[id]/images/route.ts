// API v2: Partner Images
// POST   /api/v2/partners/:id/images  (add)
// PATCH  /api/v2/partners/:id/images  (reorder)
// DELETE via query param

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
import { addPartnerImage, removePartnerImage, reorderPartnerImages } from '@/lib/partners/actions'

const AddImageBody = z.object({
  url: z.string().url(),
  alt: z.string().optional(),
  caption: z.string().optional(),
})

const ReorderBody = z.object({
  imageIds: z.array(z.string().uuid()),
})

export const POST = withApiAuth(
  async (req: NextRequest, _ctx, params) => {
    const partnerId = params?.id
    if (!partnerId) return apiNotFound('Partner')

    let body: unknown
    try {
      body = await req.json()
    } catch {
      return apiError('invalid_json', 'Request body must be valid JSON', 400)
    }

    const parsed = AddImageBody.safeParse(body)
    if (!parsed.success) return apiValidationError(parsed.error)

    try {
      await addPartnerImage({ partnerId, ...parsed.data } as any)
      return apiSuccess({ added: true })
    } catch (err: any) {
      return apiError('add_failed', err.message ?? 'Failed to add image', 500)
    }
  },
  { scopes: ['partners:write'] }
)

export const PATCH = withApiAuth(
  async (req: NextRequest, _ctx, params) => {
    const partnerId = params?.id
    if (!partnerId) return apiNotFound('Partner')

    let body: unknown
    try {
      body = await req.json()
    } catch {
      return apiError('invalid_json', 'Request body must be valid JSON', 400)
    }

    const parsed = ReorderBody.safeParse(body)
    if (!parsed.success) return apiValidationError(parsed.error)

    try {
      await reorderPartnerImages(partnerId, parsed.data.imageIds)
      return apiSuccess({ reordered: true })
    } catch (err: any) {
      return apiError('reorder_failed', err.message ?? 'Failed to reorder images', 500)
    }
  },
  { scopes: ['partners:write'] }
)

export const DELETE = withApiAuth(
  async (req: NextRequest, _ctx, params) => {
    const partnerId = params?.id
    if (!partnerId) return apiNotFound('Partner')

    const { searchParams } = new URL(req.url)
    const imageId = searchParams.get('imageId')
    if (!imageId) return apiError('missing_image_id', 'imageId query parameter is required', 400)

    try {
      await removePartnerImage(imageId)
      return apiNoContent()
    } catch (err: any) {
      return apiError('remove_failed', err.message ?? 'Failed to remove image', 500)
    }
  },
  { scopes: ['partners:write'] }
)
