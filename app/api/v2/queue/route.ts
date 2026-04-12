// API v2: Priority Queue
// GET /api/v2/queue
//
// Returns the chef's current priority work queue (pending inquiries,
// overdue follow-ups, upcoming events, etc.)

import { withApiAuth, apiSuccess, apiError } from '@/lib/api/v2'

export const GET = withApiAuth(
  async (req, ctx) => {
    const url = new URL(req.url)
    const rawLimit = Number(url.searchParams.get('limit') ?? '50')
    const limit =
      Number.isFinite(rawLimit) && rawLimit > 0 ? Math.min(Math.floor(rawLimit), 100) : 50

    const now = new Date().toISOString()
    const _q7 = new Date()
    const _q7d = new Date(_q7.getFullYear(), _q7.getMonth(), _q7.getDate() + 7)
    const in7days = `${_q7d.getFullYear()}-${String(_q7d.getMonth() + 1).padStart(2, '0')}-${String(_q7d.getDate()).padStart(2, '0')}`

    // Pending inquiries (new, no response)
    const { data: pendingInquiries } = await ctx.db
      .from('inquiries')
      .select('id, client_name, client_email, event_date, guest_count, occasion, created_at')
      .eq('tenant_id', ctx.tenantId)
      .eq('status', 'new')
      .order('created_at', { ascending: true })
      .limit(limit)

    // Upcoming events (next 7 days)
    const { data: upcomingEvents } = await ctx.db
      .from('events')
      .select(
        'id, occasion, event_date, serve_time, guest_count, status, location_city, client:clients(id, full_name)'
      )
      .eq('tenant_id', ctx.tenantId)
      .is('deleted_at', null)
      .gte('event_date', now.split('T')[0])
      .lte('event_date', in7days)
      .order('event_date', { ascending: true })
      .limit(limit)

    // Draft quotes (need to be sent)
    const { data: draftQuotes } = await ctx.db
      .from('quotes')
      .select('id, quote_name, total_quoted_cents, created_at, client:clients(id, full_name)')
      .eq('tenant_id', ctx.tenantId)
      .eq('status', 'draft')
      .order('created_at', { ascending: true })
      .limit(limit)

    // Events needing confirmation (paid but not confirmed)
    const { data: needsConfirmation } = await ctx.db
      .from('events')
      .select('id, occasion, event_date, guest_count, client:clients(id, full_name)')
      .eq('tenant_id', ctx.tenantId)
      .eq('status', 'paid')
      .is('deleted_at', null)
      .order('event_date', { ascending: true })
      .limit(limit)

    return apiSuccess({
      pending_inquiries: pendingInquiries ?? [],
      upcoming_events: upcomingEvents ?? [],
      draft_quotes: draftQuotes ?? [],
      needs_confirmation: needsConfirmation ?? [],
    })
  },
  { scopes: ['queue:read'] }
)
