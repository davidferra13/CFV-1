// API v2: Enroll client in marketing sequence
// POST /api/v2/marketing/sequences/:id/enroll

import { NextRequest } from 'next/server'
import { z } from 'zod'
import { withApiAuth, apiSuccess, apiNotFound, apiValidationError, apiError } from '@/lib/api/v2'
import { enrollInSequence } from '@/lib/marketing/actions'

const EnrollBody = z.object({
  clientId: z.string().uuid(),
  triggerType: z.enum(['birthday', 'dormant_90', 'post_event']),
  firstSendAt: z.string(),
})

export const POST = withApiAuth(
  async (req: NextRequest, ctx, params) => {
    const id = params?.id
    if (!id) return apiNotFound('Sequence')

    let body: unknown
    try {
      body = await req.json()
    } catch {
      return apiError('invalid_json', 'Request body must be valid JSON', 400)
    }

    const parsed = EnrollBody.safeParse(body)
    if (!parsed.success) return apiValidationError(parsed.error)

    // Verify client belongs to this chef before enrolling
    const { data: clientCheck } = await ctx.db
      .from('clients')
      .select('id')
      .eq('id', parsed.data.clientId)
      .eq('chef_id', ctx.tenantId)
      .single()

    if (!clientCheck) return apiNotFound('Client')

    try {
      await enrollInSequence(
        ctx.tenantId,
        parsed.data.clientId,
        parsed.data.triggerType,
        new Date(parsed.data.firstSendAt)
      )
      return apiSuccess({ enrolled: true })
    } catch (err: any) {
      return apiError('enroll_failed', err.message ?? 'Failed to enroll in sequence', 500)
    }
  },
  { scopes: ['marketing:write'] }
)
