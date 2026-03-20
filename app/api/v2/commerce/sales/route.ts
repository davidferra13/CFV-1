// API v2: Commerce Sales - List & Create
// GET  /api/v2/commerce/sales?status=...&channel=...&clientId=...&eventId=...&from=...&to=...&limit=50&offset=0
// POST /api/v2/commerce/sales

import { NextRequest } from 'next/server'
import { z } from 'zod'
import { withApiAuth, apiSuccess, apiCreated, apiValidationError, apiError } from '@/lib/api/v2'
import { listSales, createSale } from '@/lib/commerce/sale-actions'

const CreateSaleBody = z.object({
  channel: z.enum(['counter', 'order_ahead', 'invoice', 'online', 'phone']),
  event_id: z.string().uuid().optional(),
  client_id: z.string().uuid().optional(),
  tax_zip_code: z.string().optional(),
  notes: z.string().optional(),
})

export const GET = withApiAuth(
  async (req, _ctx) => {
    const url = new URL(req.url)
    const status = url.searchParams.get('status') ?? undefined
    const channel = url.searchParams.get('channel') ?? undefined
    const clientId = url.searchParams.get('clientId') ?? undefined
    const eventId = url.searchParams.get('eventId') ?? undefined
    const from = url.searchParams.get('from') ?? undefined
    const to = url.searchParams.get('to') ?? undefined
    const limit = url.searchParams.get('limit')
      ? parseInt(url.searchParams.get('limit')!, 10)
      : undefined
    const offset = url.searchParams.get('offset')
      ? parseInt(url.searchParams.get('offset')!, 10)
      : undefined

    try {
      const data = await listSales({ status, channel, clientId, eventId, from, to, limit, offset })
      return apiSuccess(data)
    } catch (err: any) {
      return apiError('list_failed', err.message ?? 'Failed to list sales', 500)
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

    const parsed = CreateSaleBody.safeParse(body)
    if (!parsed.success) return apiValidationError(parsed.error)

    try {
      const sale = await createSale(parsed.data as any)
      return apiCreated(sale)
    } catch (err: any) {
      return apiError('create_failed', err.message ?? 'Failed to create sale', 500)
    }
  },
  { scopes: ['commerce:write'] }
)
