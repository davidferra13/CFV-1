// API v2: Safety Incident Follow-ups
// POST  /api/v2/safety/incidents/:id/follow-ups  (add step)
// PATCH /api/v2/safety/incidents/:id/follow-ups  (toggle step)

import { NextRequest } from 'next/server'
import { z } from 'zod'
import { withApiAuth, apiSuccess, apiNotFound, apiValidationError, apiError } from '@/lib/api/v2'
import { addFollowUpStep, toggleFollowUpStep } from '@/lib/safety/incident-actions'

const AddStepBody = z.object({ step: z.string().min(1) })
const ToggleStepBody = z.object({ stepId: z.string().min(1) })

export const POST = withApiAuth(
  async (req: NextRequest, _ctx, params) => {
    const id = params?.id
    if (!id) return apiNotFound('Incident')

    let body: unknown
    try {
      body = await req.json()
    } catch {
      return apiError('invalid_json', 'Request body must be valid JSON', 400)
    }

    const parsed = AddStepBody.safeParse(body)
    if (!parsed.success) return apiValidationError(parsed.error)

    try {
      await addFollowUpStep(id, parsed.data.step)
      return apiSuccess({ added: true })
    } catch (err: any) {
      return apiError('add_failed', err.message ?? 'Failed to add follow-up step', 500)
    }
  },
  { scopes: ['safety:write'] }
)

export const PATCH = withApiAuth(
  async (req: NextRequest, _ctx, params) => {
    const id = params?.id
    if (!id) return apiNotFound('Incident')

    let body: unknown
    try {
      body = await req.json()
    } catch {
      return apiError('invalid_json', 'Request body must be valid JSON', 400)
    }

    const parsed = ToggleStepBody.safeParse(body)
    if (!parsed.success) return apiValidationError(parsed.error)

    try {
      await toggleFollowUpStep(id, parsed.data.stepId)
      return apiSuccess({ toggled: true })
    } catch (err: any) {
      return apiError('toggle_failed', err.message ?? 'Failed to toggle follow-up step', 500)
    }
  },
  { scopes: ['safety:write'] }
)
