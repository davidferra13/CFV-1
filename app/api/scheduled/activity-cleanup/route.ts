// POST /api/scheduled/activity-cleanup
// Deletes aged activity events with optional archive copy.

import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { recordCronHeartbeat } from '@/lib/cron/heartbeat'
import { verifyCronAuth } from '@/lib/auth/cron-auth'

const DEFAULT_RETENTION_DAYS = 90

function getRetentionDays(): number {
  const configured = Number.parseInt(process.env.ACTIVITY_RETENTION_DAYS || '', 10)
  if (!Number.isFinite(configured)) return DEFAULT_RETENTION_DAYS
  return Math.max(30, Math.min(3650, configured))
}

export async function POST(request: NextRequest) {
  const authError = verifyCronAuth(request.headers.get('authorization'))
  if (authError) return authError

  const supabase = createServerClient({ admin: true })
  const retentionDays = getRetentionDays()
  const cutoff = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000).toISOString()
  const archiveBeforeDelete = process.env.ACTIVITY_ARCHIVE_BEFORE_DELETE === 'true'

  if (archiveBeforeDelete) {
    const { data: oldRows, error: fetchError } = await supabase
      .from('activity_events')
      .select('*')
      .lt('created_at', cutoff)
      .limit(5000)

    if (fetchError) {
      return NextResponse.json({ error: 'Archive fetch failed' }, { status: 500 })
    }

    if (oldRows && oldRows.length > 0) {
      const archivePayload = oldRows.map((row) => ({
        ...row,
        archived_at: new Date().toISOString(),
      }))

      const { error: archiveError } = await supabase
        .from('activity_events_archive' as any) // table added in migration, types pending regen
        .insert(archivePayload)

      if (archiveError) {
        return NextResponse.json({ error: 'Archive insert failed' }, { status: 500 })
      }
    }
  }

  const { count, error } = await supabase
    .from('activity_events')
    .delete({ count: 'exact' })
    .lt('created_at', cutoff)

  if (error) {
    return NextResponse.json({ error: 'Cleanup failed' }, { status: 500 })
  }

  // sms_send_log cleanup - owned by push-cleanup cron, not this handler
  const smsCount = 0

  const result = {
    deleted: count || 0,
    smsLogDeleted: smsCount,
    cutoff,
    retentionDays,
    archivedFirst: archiveBeforeDelete,
  }
  await recordCronHeartbeat('activity-cleanup', result)
  return NextResponse.json(result)
}

export async function GET(request: NextRequest) {
  const authError = verifyCronAuth(request.headers.get('authorization'))
  if (authError) return authError

  return NextResponse.json({ status: 'activity-cleanup cron ready' })
}
