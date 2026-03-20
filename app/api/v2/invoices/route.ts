// API v2: Invoices - List invoices (computed from events + ledger)
// GET /api/v2/invoices?status=paid&page=1&per_page=50
//
// Invoices in ChefFlow are computed views over events + ledger_entries.
// There is no separate invoices table. This endpoint returns events
// that have been invoiced (have an invoice_number assigned).

import { withApiAuth, apiSuccess, apiError, parsePagination, paginationMeta } from '@/lib/api/v2'

export const GET = withApiAuth(
  async (req, ctx) => {
    const url = new URL(req.url)
    const pagination = parsePagination(url)
    const status = url.searchParams.get('status')

    let query = ctx.supabase
      .from('events')
      .select(
        'id, status, occasion, event_date, guest_count, quoted_price_cents, invoice_number, invoice_issued_at, client:clients(id, full_name, email)',
        { count: 'exact' }
      )
      .eq('tenant_id', ctx.tenantId)
      .is('deleted_at', null)
      .not('invoice_number', 'is', null)
      .order('invoice_issued_at', { ascending: false })

    if (status) query = query.eq('status', status as any)

    const from = (pagination.page - 1) * pagination.per_page
    const to = from + pagination.per_page - 1
    query = query.range(from, to)

    const { data, error, count } = await query
    if (error) return apiError('database_error', 'Failed to fetch invoices', 500)

    return apiSuccess(data ?? [], paginationMeta(pagination, count ?? 0))
  },
  { scopes: ['finance:read'] }
)
