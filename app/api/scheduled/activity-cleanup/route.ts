// Scheduled Activity Cleanup
// POST /api/scheduled/activity-cleanup — deletes activity events older than 90 days.
// Run weekly to prevent unbounded table growth.
// Secured with CRON_SECRET bearer token.

import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET

  if (!cronSecret) {
    return NextResponse.json({ error: 'CRON_SECRET not configured' }, { status: 500 })
  }

  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createServerClient({ admin: true })
  const cutoff = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString()

  const { count, error } = await supabase
    .from('activity_events' as any)
    .delete({ count: 'exact' })
    .lt('created_at', cutoff)

  if (error) {
    console.error('[Activity Cleanup] Error:', error)
    return NextResponse.json({ error: 'Cleanup failed' }, { status: 500 })
  }

  return NextResponse.json({ deleted: count || 0, cutoff })
}
