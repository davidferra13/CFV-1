// API v2: Marketing Behavioral Segments
// POST /api/v2/marketing/segments

import { NextRequest } from 'next/server'
import { z } from 'zod'
import { withApiAuth, apiCreated, apiValidationError, apiError } from '@/lib/api/v2'
import { buildBehavioralSegment } from '@/lib/marketing/segmentation-actions'

const BuildSegmentBody = z.object({
  name: z.string().min(1),
  rules: z
    .array(
      z.object({
        field: z.string(),
        operator: z.string(),
        value: z.any(),
      })
    )
    .min(1),
})

export const POST = withApiAuth(
  async (req: NextRequest, _ctx) => {
    let body: unknown
    try {
      body = await req.json()
    } catch {
      return apiError('invalid_json', 'Request body must be valid JSON', 400)
    }

    const parsed = BuildSegmentBody.safeParse(body)
    if (!parsed.success) return apiValidationError(parsed.error)

    try {
      const result = await buildBehavioralSegment(parsed.data as any)
      return apiCreated(result)
    } catch (err: any) {
      return apiError('segment_failed', err.message ?? 'Failed to build segment', 500)
    }
  },
  { scopes: ['marketing:write'] }
)
