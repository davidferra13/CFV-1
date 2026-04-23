// Scheduled: Email Historical Scan
// GET /api/scheduled/email-history-scan - health check (scheduled cron sends GET)
// POST /api/scheduled/email-history-scan - process a batch for each opted-in chef
//
// Runs every 15 minutes. Finds chefs with historical_scan_enabled=true and
// gmail_connected=true whose scan is not yet completed or paused, then runs
// one batch (100 emails) per chef. Processes up to 5 chefs per invocation.

import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@/lib/db/server'
import { runHistoricalScanBatch } from '@/lib/gmail/historical-scan'
import { verifyCronAuth } from '@/lib/auth/cron-auth'
import { runMonitoredCronJob } from '@/lib/cron/monitor'

const MAX_CHEFS_PER_RUN = 5

async function handleEmailHistoryScan(request: NextRequest): Promise<NextResponse> {
  const authError = verifyCronAuth(request.headers.get('authorization'))
  if (authError) return authError

  try {
    const result = await runMonitoredCronJob('email-history-scan', async () => {
      const db = createServerClient({ admin: true })
      const { data: mailboxes, error: mailboxError } = await db
        .from('google_mailboxes')
        .select('id, chef_id, tenant_id, historical_scan_status, normalized_email')
        .eq('historical_scan_enabled', true)
        .eq('gmail_connected', true)
        .eq('is_active', true)
        .not('historical_scan_status', 'in', '["completed","paused"]')
        .limit(MAX_CHEFS_PER_RUN)

      if (mailboxError) {
        console.error('[email-history-scan] Mailbox query failed:', mailboxError.message)
        throw new Error('Failed to query scan mailboxes')
      }

      const mailboxChefIds = new Set((mailboxes || []).map((mailbox: any) => mailbox.chef_id))
      const remainingSlots = Math.max(0, MAX_CHEFS_PER_RUN - (mailboxes?.length || 0))
      const { data: connections, error } =
        remainingSlots > 0
          ? await db
              .from('google_connections')
              .select('chef_id, tenant_id, historical_scan_status, connected_email')
              .eq('historical_scan_enabled', true)
              .eq('gmail_connected', true)
              .not('historical_scan_status', 'in', '["completed","paused"]')
              .limit(remainingSlots)
          : { data: [], error: null }

      const legacyFallbacks = (connections || []).filter(
        (conn: any) => !mailboxChefIds.has(conn.chef_id)
      )

      if (error) {
        console.error('[email-history-scan] DB query failed:', error.message)
        throw new Error('Failed to query scan connections')
      }

      if ((mailboxes?.length || 0) === 0 && legacyFallbacks.length === 0) {
        return { message: 'No active scans', chefsProcessed: 0, errors: 0, details: [] }
      }

      const results = []

      for (const mailbox of (mailboxes || []) as Array<{
        id: string
        chef_id: string
        tenant_id: string
        historical_scan_status: string
        normalized_email: string | null
      }>) {
        try {
          const batchResult = await runHistoricalScanBatch(mailbox.chef_id, mailbox.tenant_id, {
            mailboxId: mailbox.id,
          })
          results.push({
            ...batchResult,
            mailboxId: mailbox.id,
            email: mailbox.normalized_email,
          })
        } catch (err) {
          console.error(
            `[email-history-scan] Batch failed for chef ${mailbox.chef_id} mailbox ${mailbox.id}:`,
            err
          )
          results.push({
            chefId: mailbox.chef_id,
            mailboxId: mailbox.id,
            email: mailbox.normalized_email,
            error: 'Batch processing failed',
            status: 'error',
          })
        }
      }

      for (const conn of legacyFallbacks as Array<{
        chef_id: string
        tenant_id: string
        historical_scan_status: string
        connected_email: string | null
      }>) {
        try {
          const batchResult = await runHistoricalScanBatch(conn.chef_id, conn.tenant_id)
          results.push({
            ...batchResult,
            mailboxId: null,
            email: conn.connected_email,
          })
        } catch (err) {
          console.error(`[email-history-scan] Batch failed for chef ${conn.chef_id}:`, err)
          results.push({
            chefId: conn.chef_id,
            mailboxId: null,
            email: conn.connected_email,
            error: 'Batch processing failed',
            status: 'error',
          })
        }
      }

      const totalProcessed = results.reduce(
        (sum, r) => sum + (('processed' in r ? r.processed : 0) as number),
        0
      )
      const totalFindings = results.reduce(
        (sum, r) => sum + (('findingsAdded' in r ? r.findingsAdded : 0) as number),
        0
      )
      const completed = results.filter((r) => r.status === 'completed').length
      const errors = results.filter((r) => r.status === 'error').length

      return {
        chefsProcessed: (mailboxes?.length || 0) + legacyFallbacks.length,
        totalEmailsProcessed: totalProcessed,
        totalFindingsAdded: totalFindings,
        scansCompleted: completed,
        errors,
        details: results,
      }
    })

    return NextResponse.json(result)
  } catch {
    return NextResponse.json({ error: 'Failed to query scan connections' }, { status: 500 })
  }
}

export { handleEmailHistoryScan as GET, handleEmailHistoryScan as POST }
