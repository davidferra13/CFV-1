// API v2: Commerce Cash Drawer
// GET  /api/v2/commerce/register/:id/cash-drawer  (summary + movements)
// POST /api/v2/commerce/register/:id/cash-drawer  (adjustments, paid-in, paid-out, no-sale)

import { NextRequest } from 'next/server'
import { z } from 'zod'
import { withApiAuth, apiSuccess, apiNotFound, apiValidationError, apiError } from '@/lib/api/v2'
import {
  getCashDrawerSummary,
  listCashDrawerMovements,
  recordCashAdjustment,
  recordCashPaidIn,
  recordCashPaidOut,
  recordCashNoSaleOpen,
} from '@/lib/commerce/cash-drawer-actions'

const CashDrawerActionBody = z.discriminatedUnion('action', [
  z.object({
    action: z.literal('adjustment'),
    amountCents: z.number().int(),
    notes: z.string().optional(),
  }),
  z.object({
    action: z.literal('paid_in'),
    amountCents: z.number().int().positive(),
    notes: z.string().optional(),
  }),
  z.object({
    action: z.literal('paid_out'),
    amountCents: z.number().int().positive(),
    notes: z.string().optional(),
  }),
  z.object({
    action: z.literal('no_sale_open'),
    notes: z.string().min(1, 'Notes required for no-sale drawer open'),
  }),
])

export const GET = withApiAuth(
  async (req: NextRequest, _ctx, params) => {
    const sessionId = params?.id
    if (!sessionId) return apiNotFound('Register session')

    const { searchParams } = new URL(req.url)
    const view = searchParams.get('view') ?? 'summary'

    try {
      if (view === 'movements') {
        const page = Number(searchParams.get('page') ?? 1)
        const perPage = Number(searchParams.get('per_page') ?? 50)
        const limit = Math.min(perPage, 200)
        const offset = (Math.max(page, 1) - 1) * limit
        const result = await listCashDrawerMovements({
          registerSessionId: sessionId,
          limit,
          offset,
        })
        return apiSuccess(result)
      }
      const summary = await getCashDrawerSummary(sessionId)
      return apiSuccess(summary)
    } catch (err: any) {
      return apiError('fetch_failed', err.message ?? 'Failed to fetch cash drawer data', 500)
    }
  },
  { scopes: ['commerce:read'] }
)

export const POST = withApiAuth(
  async (req: NextRequest, _ctx, params) => {
    const sessionId = params?.id
    if (!sessionId) return apiNotFound('Register session')

    let body: unknown
    try {
      body = await req.json()
    } catch {
      return apiError('invalid_json', 'Request body must be valid JSON', 400)
    }

    const parsed = CashDrawerActionBody.safeParse(body)
    if (!parsed.success) return apiValidationError(parsed.error)

    const data = parsed.data
    try {
      let result
      switch (data.action) {
        case 'adjustment':
          result = await recordCashAdjustment({
            registerSessionId: sessionId,
            amountCents: data.amountCents,
            notes: data.notes,
          })
          break
        case 'paid_in':
          result = await recordCashPaidIn({
            registerSessionId: sessionId,
            amountCents: data.amountCents,
            notes: data.notes,
          })
          break
        case 'paid_out':
          result = await recordCashPaidOut({
            registerSessionId: sessionId,
            amountCents: data.amountCents,
            notes: data.notes,
          })
          break
        case 'no_sale_open':
          result = await recordCashNoSaleOpen({ registerSessionId: sessionId, notes: data.notes })
          break
      }
      return apiSuccess(result)
    } catch (err: any) {
      return apiError('cash_drawer_failed', err.message ?? 'Cash drawer operation failed', 500)
    }
  },
  { scopes: ['commerce:write'] }
)
