// API v2: Remy Approval Policy by Task Type (thin wrapper around server actions)
// PATCH  /api/v2/remy/policies/:taskType - Update a policy by task type
// DELETE /api/v2/remy/policies/:taskType - Delete a policy by task type

import { NextRequest } from 'next/server'
import { z } from 'zod'
import { withApiAuth, apiSuccess, apiNoContent, apiValidationError, apiError } from '@/lib/api/v2'
import {
  upsertRemyApprovalPolicy,
  deleteRemyApprovalPolicy,
} from '@/lib/ai/remy-approval-policy-actions'

const UpdatePolicyBody = z
  .object({
    decision: z.enum(['allow', 'deny', 'ask']).optional(),
    reason: z.string().nullable().optional(),
    enabled: z.boolean().optional(),
  })
  .strict()

export const PATCH = withApiAuth(
  async (req: NextRequest, ctx, params) => {
    const taskType = params?.taskType
    if (!taskType) return apiError('missing_param', 'Task type is required', 400)

    let body: unknown
    try {
      body = await req.json()
    } catch {
      return apiError('invalid_json', 'Request body must be valid JSON', 400)
    }

    const parsed = UpdatePolicyBody.safeParse(body)
    if (!parsed.success) return apiValidationError(parsed.error)

    try {
      const policy = await upsertRemyApprovalPolicy({
        taskType: decodeURIComponent(taskType),
        decision: parsed.data.decision ?? 'ask',
        reason: parsed.data.reason,
        enabled: parsed.data.enabled,
      })
      return apiSuccess(policy)
    } catch (err) {
      console.error('[api/v2/remy/policies] PATCH error:', err)
      return apiError('update_failed', 'Failed to update Remy approval policy', 500)
    }
  },
  { scopes: ['remy:write'] }
)

export const DELETE = withApiAuth(
  async (_req, ctx, params) => {
    const taskType = params?.taskType
    if (!taskType) return apiError('missing_param', 'Task type is required', 400)

    try {
      await deleteRemyApprovalPolicy(decodeURIComponent(taskType))
      return apiNoContent()
    } catch (err) {
      console.error('[api/v2/remy/policies] DELETE error:', err)
      return apiError('delete_failed', 'Failed to delete Remy approval policy', 500)
    }
  },
  { scopes: ['remy:write'] }
)
