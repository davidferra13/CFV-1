import type { NextRequest } from 'next/server'
import { apiCreated, apiError, apiValidationError, withApiAuth } from '@/lib/api/v2'
import { ingestEvidenceBatch } from '@/lib/work-ledger/repository'
import { WorkEvidenceBatchSchema } from '@/lib/work-ledger/validators'

export const POST = withApiAuth(
  async (request: NextRequest, context) => {
    let body: unknown
    try {
      body = await request.json()
    } catch {
      return apiError('invalid_json', 'Request body must be valid JSON', 400)
    }

    const parsed = WorkEvidenceBatchSchema.safeParse(body)
    if (!parsed.success) return apiValidationError(parsed.error)

    const results = await ingestEvidenceBatch(
      context.db as any,
      context.tenantId,
      parsed.data.evidence
    )
    const conflicts = results.filter((result) => result.disposition === 'conflict')
    if (conflicts.length > 0) {
      return apiError(
        'evidence_identity_conflict',
        `${conflicts.length} source record(s) already exist with a different hash`,
        409
      )
    }
    return apiCreated({
      evidence: results,
      created: results.filter((result) => result.disposition === 'created').length,
      existing: results.filter((result) => result.disposition === 'existing').length,
    })
  },
  { scopes: ['work-ledger:write'] }
)
