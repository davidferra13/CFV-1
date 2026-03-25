// API v2: Inventory - Stock summary & Record transaction
// GET  /api/v2/inventory?type=receive&ingredient_name=flour&page=1&per_page=50
// POST /api/v2/inventory (record a transaction)

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

const RecordTransactionBody = z.object({
  ingredient_name: z.string().min(1),
  ingredient_id: z.string().uuid().optional(),
  transaction_type: z.enum([
    'receive',
    'event_deduction',
    'waste',
    'staff_meal',
    'transfer_out',
    'transfer_in',
    'audit_adjustment',
    'return_from_event',
    'return_to_vendor',
    'manual_adjustment',
    'opening_balance',
  ]),
  quantity: z.number(),
  unit: z.string().min(1),
  cost_cents: z.number().int().optional(),
  location_id: z.string().uuid().optional(),
  event_id: z.string().uuid().optional(),
  notes: z.string().optional(),
})

export const GET = withApiAuth(
  async (req, ctx) => {
    const url = new URL(req.url)
    const pagination = parsePagination(url)
    const txType = url.searchParams.get('type')
    const ingredientName = url.searchParams.get('ingredient_name')
    const eventId = url.searchParams.get('event_id')
    const view = url.searchParams.get('view') // 'transactions' to skip summary view

    const from = (pagination.page - 1) * pagination.per_page
    const to = from + pagination.per_page - 1

    // If view=transactions or filters are set, return raw transactions
    if (view === 'transactions' || txType || eventId) {
      let txQuery = (ctx.db as any)
        .from('inventory_transactions')
        .select('*', { count: 'exact' })
        .eq('chef_id', ctx.tenantId)
        .order('created_at', { ascending: false })

      if (txType) txQuery = txQuery.eq('transaction_type', txType)
      if (ingredientName) txQuery = txQuery.ilike('ingredient_name', `%${ingredientName}%`)
      if (eventId) txQuery = txQuery.eq('event_id', eventId)

      txQuery = txQuery.range(from, to)

      const { data: txData, error: txError, count: txCount } = await txQuery
      if (txError) return apiError('database_error', 'Failed to fetch inventory transactions', 500)
      return apiSuccess(txData ?? [], paginationMeta(pagination, txCount ?? 0))
    }

    // Default: return stock summary (aggregated current quantities)
    let summaryQuery = (ctx.db as any)
      .from('inventory_stock_summary')
      .select('*', { count: 'exact' })
      .eq('chef_id', ctx.tenantId)
      .order('ingredient_name', { ascending: true })

    if (ingredientName) summaryQuery = summaryQuery.ilike('ingredient_name', `%${ingredientName}%`)

    summaryQuery = summaryQuery.range(from, to)

    const { data, error, count } = await summaryQuery

    if (error) {
      // If the view doesn't exist, fall back to raw transaction query
      let fallbackQuery = (ctx.db as any)
        .from('inventory_transactions')
        .select('*', { count: 'exact' })
        .eq('chef_id', ctx.tenantId)
        .order('created_at', { ascending: false })

      if (ingredientName)
        fallbackQuery = fallbackQuery.ilike('ingredient_name', `%${ingredientName}%`)

      fallbackQuery = fallbackQuery.range(from, to)

      const txResult = await fallbackQuery

      if (txResult.error) {
        return apiError('database_error', 'Failed to fetch inventory', 500)
      }

      return apiSuccess(txResult.data ?? [], paginationMeta(pagination, txResult.count ?? 0))
    }

    return apiSuccess(data ?? [], paginationMeta(pagination, count ?? 0))
  },
  { scopes: ['inventory:read'] }
)

export const POST = withApiAuth(
  async (req: NextRequest, ctx) => {
    let body: unknown
    try {
      body = await req.json()
    } catch {
      return apiError('invalid_json', 'Request body must be valid JSON', 400)
    }

    const parsed = RecordTransactionBody.safeParse(body)
    if (!parsed.success) return apiValidationError(parsed.error)

    const { data, error } = await (ctx.db as any)
      .from('inventory_transactions')
      .insert({
        ...parsed.data,
        chef_id: ctx.tenantId,
      })
      .select()
      .single()

    if (error) {
      console.error('[api/v2/inventory] Create error:', error)
      return apiError('create_failed', 'Failed to record inventory transaction', 500)
    }

    return apiCreated(data)
  },
  { scopes: ['inventory:write'] }
)
