// POST /api/scheduled/activity-cleanup
// Deletes aged activity events with optional archive copy.

import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@/lib/db/server'
import { verifyCronAuth } from '@/lib/auth/cron-auth'
import { runMonitoredCronJob } from '@/lib/cron/monitor'

const DEFAULT_RETENTION_DAYS = 90

function getRetentionDays(): number {
  const configured = Number.parseInt(process.env.ACTIVITY_RETENTION_DAYS || '', 10)
  if (!Number.isFinite(configured)) return DEFAULT_RETENTION_DAYS
  return Math.max(30, Math.min(3650, configured))
}

export async function POST(request: NextRequest) {
  const authError = verifyCronAuth(request.headers.get('authorization'))
  if (authError) return authError

  try {
    const result = await runMonitoredCronJob('activity-cleanup', async () => {
      const db = createServerClient({ admin: true })
      const retentionDays = getRetentionDays()
      const cutoff = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000).toISOString()
      const archiveBeforeDelete = process.env.ACTIVITY_ARCHIVE_BEFORE_DELETE === 'true'

      if (archiveBeforeDelete) {
        const { data: oldRows, error: fetchError } = await db
          .from('activity_events')
          .select('*')
          .lt('created_at', cutoff)
          .limit(5000)

        if (fetchError) {
          throw new Error('Archive fetch failed')
        }

        if (oldRows && oldRows.length > 0) {
          const archivePayload = oldRows.map((row: any) => ({
            ...row,
            archived_at: new Date().toISOString(),
          }))

          const { error: archiveError } = await db
            .from('activity_events_archive' as any)
            .insert(archivePayload)

          if (archiveError) {
            throw new Error('Archive insert failed')
          }
        }
      }

      const { count, error } = await db
        .from('activity_events')
        .delete({ count: 'exact' })
        .lt('created_at', cutoff)

      if (error) {
        throw new Error('Cleanup failed')
      }

      return {
        deleted: count || 0,
        smsLogDeleted: 0,
        cutoff,
        retentionDays,
        archivedFirst: archiveBeforeDelete,
      }
    })

    return NextResponse.json(result)
  } catch (error) {
    console.error('[activity-cleanup] Cron failed:', error)
    return NextResponse.json({ error: 'Cleanup failed' }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  const authError = verifyCronAuth(request.headers.get('authorization'))
  if (authError) return authError

  return NextResponse.json({ status: 'activity-cleanup cron ready' })
}
