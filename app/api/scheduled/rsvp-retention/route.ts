import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'

async function purgeTable(params: {
  table: string
  timestampColumn: string
  cutoffIso: string
  extraFilter?: (query: any) => any
}) {
  const supabase = createServerClient({ admin: true })
  let query = (supabase as any)
    .from(params.table)
    .delete({ count: 'exact' })
    .lt(params.timestampColumn, params.cutoffIso)

  if (params.extraFilter) {
    query = params.extraFilter(query)
  }

  const { count, error } = await query
  if (error) {
    console.error(`[rsvp-retention] purge failed for ${params.table}:`, error)
    return { table: params.table, deleted: 0, error: error.message }
  }

  return { table: params.table, deleted: count || 0, error: null as string | null }
}

async function handleRSVPRetention(request: NextRequest): Promise<NextResponse> {
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET

  if (!cronSecret) {
    return NextResponse.json({ error: 'CRON_SECRET not configured' }, { status: 500 })
  }
  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const now = Date.now()
  const cutoff180d = new Date(now - 180 * 24 * 60 * 60 * 1000).toISOString()
  const cutoff365d = new Date(now - 365 * 24 * 60 * 60 * 1000).toISOString()

  const results = await Promise.all([
    purgeTable({
      table: 'rsvp_reminder_log',
      timestampColumn: 'created_at',
      cutoffIso: cutoff180d,
    }),
    purgeTable({
      table: 'event_join_requests',
      timestampColumn: 'created_at',
      cutoffIso: cutoff180d,
      extraFilter: (query) => query.neq('status', 'pending'),
    }),
    purgeTable({
      table: 'event_guest_rsvp_audit',
      timestampColumn: 'created_at',
      cutoffIso: cutoff365d,
    }),
    purgeTable({
      table: 'event_share_invite_events',
      timestampColumn: 'created_at',
      cutoffIso: cutoff365d,
    }),
    purgeTable({
      table: 'guest_communication_logs',
      timestampColumn: 'created_at',
      cutoffIso: cutoff365d,
    }),
  ])

  const failed = results.filter((result) => !!result.error)
  return NextResponse.json({
    success: failed.length === 0,
    cutoffs: { cutoff180d, cutoff365d },
    results,
  })
}

export { handleRSVPRetention as GET, handleRSVPRetention as POST }
