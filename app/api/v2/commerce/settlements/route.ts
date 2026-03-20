// API v2: Commerce Settlements
// GET  /api/v2/commerce/settlements
// POST /api/v2/commerce/settlements

import { NextRequest } from 'next/server'
import { z } from 'zod'
import {
  withApiAuth,
  apiSuccess,
  apiCreated,
  apiValidationError,
  apiError,
  parsePagination,
  paginationMeta,
} from '@/lib/api/v2'
import {
  listSettlements,
  recordSettlement,
  getSettlementSummary,
} from '@/lib/commerce/settlement-actions'

const CreateSettlementBody = z.object({
  paymentIds: z.array(z.string().uuid()).min(1),
  processor: z.string().min(1),
  expectedArrivalDate: z.string().optional(),
  amountCents: z.number().int().positive(),
  feeCents: z.number().int().nonnegative().optional(),
  reference: z.string().optional(),
})

export const GET = withApiAuth(
  async (req: NextRequest, _ctx) => {
    const { searchParams } = new URL(req.url)
    const view = searchParams.get('view')

    if (view === 'summary') {
      try {
        const summary = await getSettlementSummary()
        return apiSuccess(summary)
      } catch (err: any) {
        return apiError('fetch_failed', err.message ?? 'Failed to fetch summary', 500)
      }
    }

    const { limit, offset } = parsePagination(searchParams)
    const status = searchParams.get('status') ?? undefined

    try {
      const result = await listSettlements({ limit, offset, status })
      return apiSuccess({
        settlements: result.settlements,
        ...paginationMeta(result.total, limit, offset),
      })
    } catch (err: any) {
      return apiError('fetch_failed', err.message ?? 'Failed to fetch settlements', 500)
    }
  },
  { scopes: ['commerce:read'] }
)

export const POST = withApiAuth(
  async (req: NextRequest, _ctx) => {
    let body: unknown
    try {
      body = await req.json()
    } catch {
      return apiError('invalid_json', 'Request body must be valid JSON', 400)
    }

    const parsed = CreateSettlementBody.safeParse(body)
    if (!parsed.success) return apiValidationError(parsed.error)

    try {
      const result = await recordSettlement(parsed.data as any)
      return apiCreated(result)
    } catch (err: any) {
      return apiError('settlement_failed', err.message ?? 'Failed to record settlement', 500)
    }
  },
  { scopes: ['commerce:write'] }
)
