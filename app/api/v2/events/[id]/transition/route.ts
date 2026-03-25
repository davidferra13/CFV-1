// API v2: Event State Transition
// POST /api/v2/events/:id/transition
// Body: { to_status: "proposed" | "accepted" | ... }

import { NextRequest } from 'next/server'
import { z } from 'zod'
import { withApiAuth, apiSuccess, apiNotFound, apiValidationError, apiError } from '@/lib/api/v2'

const VALID_STATUSES = [
  'draft',
  'proposed',
  'accepted',
  'paid',
  'confirmed',
  'in_progress',
  'completed',
  'cancelled',
] as const

const TRANSITION_RULES: Record<string, string[]> = {
  draft: ['proposed', 'paid', 'cancelled'],
  proposed: ['accepted', 'cancelled'],
  accepted: ['paid', 'cancelled'],
  paid: ['confirmed', 'cancelled'],
  confirmed: ['in_progress', 'cancelled'],
  in_progress: ['completed', 'cancelled'],
  completed: [],
  cancelled: [],
}

const TransitionBody = z.object({
  to_status: z.enum(VALID_STATUSES),
  metadata: z.record(z.string(), z.unknown()).optional(),
})

export const POST = withApiAuth(
  async (req: NextRequest, ctx, params) => {
    const id = params?.id
    if (!id) return apiNotFound('Event')

    let body: unknown
    try {
      body = await req.json()
    } catch {
      return apiError('invalid_json', 'Request body must be valid JSON', 400)
    }

    const parsed = TransitionBody.safeParse(body)
    if (!parsed.success) return apiValidationError(parsed.error)

    const { to_status, metadata } = parsed.data

    // Get current event
    const { data: event, error: fetchErr } = await ctx.db
      .from('events')
      .select('id, status, tenant_id')
      .eq('id', id)
      .eq('tenant_id', ctx.tenantId)
      .is('deleted_at', null)
      .single()

    if (fetchErr || !event) return apiNotFound('Event')

    const currentStatus = (event as any).status as string

    // Validate transition
    const allowed = TRANSITION_RULES[currentStatus] ?? []
    if (!allowed.includes(to_status)) {
      return apiError(
        'invalid_transition',
        `Cannot transition from "${currentStatus}" to "${to_status}". Allowed: ${allowed.join(', ') || 'none (terminal state)'}`,
        422
      )
    }

    // Perform transition
    const { data: updated, error: updateErr } = await ctx.db
      .from('events')
      .update({ status: to_status, updated_at: new Date().toISOString() } as any)
      .eq('id', id)
      .eq('tenant_id', ctx.tenantId)
      .select()
      .single()

    if (updateErr) {
      console.error('[api/v2/events/transition] Error:', updateErr)
      return apiError('transition_failed', 'Failed to transition event', 500)
    }

    // Log transition (non-blocking)
    try {
      await ctx.db.from('event_state_transitions').insert({
        tenant_id: ctx.tenantId,
        event_id: id,
        from_status: currentStatus,
        to_status,
        transitioned_by: ctx.keyId,
        metadata: { ...(metadata ?? {}), source: 'api_v2' },
      } as any)
    } catch {}

    return apiSuccess({
      event: updated,
      transition: { from: currentStatus, to: to_status },
    })
  },
  { scopes: ['events:write'] }
)
