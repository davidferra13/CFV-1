// API v2: Ledger Entries - List (Read-Only)
// GET /api/v2/ledger?event_id=...&type=payment&page=1&per_page=50
//
// Ledger is append-only. Entries are created via payments/webhooks, not direct API writes.

import { withApiAuth, apiSuccess, apiError, parsePagination, paginationMeta } from '@/lib/api/v2'

export const GET = withApiAuth(
  async (req, ctx) => {
    const url = new URL(req.url)
    const pagination = parsePagination(url)
    const eventId = url.searchParams.get('event_id')
    const type = url.searchParams.get('type')
    const dateFrom = url.searchParams.get('date_from')
    const dateTo = url.searchParams.get('date_to')

    let query = ctx.supabase
      .from('ledger_entries')
      .select('*', { count: 'exact' })
      .eq('tenant_id', ctx.tenantId)
      .order('created_at', { ascending: false })

    if (eventId) query = query.eq('event_id', eventId)
    if (type) query = query.eq('entry_type', type as any)
    if (dateFrom) query = query.gte('created_at', dateFrom)
    if (dateTo) query = query.lte('created_at', dateTo)

    const from = (pagination.page - 1) * pagination.per_page
    const to = from + pagination.per_page - 1
    query = query.range(from, to)

    const { data, error, count } = await query
    if (error) return apiError('database_error', 'Failed to fetch ledger entries', 500)

    return apiSuccess(data ?? [], paginationMeta(pagination, count ?? 0))
  },
  { scopes: ['finance:read'] }
)
