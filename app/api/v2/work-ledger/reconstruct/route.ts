import type { NextRequest } from 'next/server'
import { apiError, apiSuccess, apiValidationError, withApiAuth } from '@/lib/api/v2'
import { reconstructWorkSessions } from '@/lib/work-ledger/repository'
import { ReconstructSchema } from '@/lib/work-ledger/validators'

export const POST = withApiAuth(
  async (request: NextRequest, context) => {
    let body: unknown
    try {
      body = await request.json()
    } catch {
      return apiError('invalid_json', 'Request body must be valid JSON', 400)
    }

    const parsed = ReconstructSchema.safeParse(body)
    if (!parsed.success) return apiValidationError(parsed.error)

    const result = await reconstructWorkSessions(
      context.db as any,
      context.tenantId,
      parsed.data.start_at,
      parsed.data.end_at
    )
    return apiSuccess({
      created: result.created.length,
      sessions: result.created,
      skipped_evidence: result.skippedEvidenceCount,
    })
  },
  { scopes: ['work-ledger:write'] }
)
