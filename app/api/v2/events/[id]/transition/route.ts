// API v2: Event State Transition
// POST /api/v2/events/:id/transition
// Body: { to_status: "proposed" | "accepted" | ... }

import { NextRequest } from 'next/server'
import { z } from 'zod'
import { withApiAuth, apiSuccess, apiNotFound, apiValidationError, apiError } from '@/lib/api/v2'
import { transitionEvent } from '@/lib/events/transitions'
import { TRANSITION_RULES, type EventStatus } from '@/lib/events/fsm'

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

    const currentStatus = (event as any).status as EventStatus

    // Validate transition
    const allowed = TRANSITION_RULES[currentStatus] ?? []
    if (!allowed.includes(to_status)) {
      return apiError(
        'invalid_transition',
        `Cannot transition from "${currentStatus}" to "${to_status}". Allowed: ${allowed.join(', ') || 'none (terminal state)'}`,
        422
      )
    }

    try {
      await transitionEvent({
        eventId: id,
        toStatus: to_status,
        metadata: {
          ...(metadata ?? {}),
          source: 'api_v2',
          api_key_id: ctx.keyId,
        },
        actorContext: {
          id: null,
          role: 'chef',
          entityId: ctx.tenantId,
          tenantId: ctx.tenantId,
        },
      })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to transition event'
      if (message === 'Event not found') return apiNotFound('Event')
      if (message.startsWith('Invalid transition') || message.startsWith('Cannot proceed:')) {
        return apiError('invalid_transition', message, 422)
      }
      if (
        message.includes('permission required') ||
        message.includes('only be triggered by system')
      ) {
        return apiError('forbidden_transition', message, 403)
      }
      console.error('[api/v2/events/transition] Error:', err)
      return apiError('transition_failed', message, 500)
    }

    const { data: updated, error: refetchErr } = await ctx.db
      .from('events')
      .select('*')
      .eq('id', id)
      .eq('tenant_id', ctx.tenantId)
      .single()

    if (refetchErr || !updated) {
      console.error('[api/v2/events/transition] Refetch error:', refetchErr)
      return apiError('transition_failed', 'Event transitioned but could not be reloaded', 500)
    }

    return apiSuccess({
      event: updated,
      transition: { from: currentStatus, to: to_status },
    })
  },
  { scopes: ['events:write'] }
)
