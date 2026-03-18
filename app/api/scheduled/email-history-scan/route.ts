// Scheduled: Email Historical Scan
// GET /api/scheduled/email-history-scan - health check (scheduled cron sends GET)
// POST /api/scheduled/email-history-scan - process a batch for each opted-in chef
//
// Runs every 15 minutes. Finds chefs with historical_scan_enabled=true and
// gmail_connected=true whose scan is not yet completed or paused, then runs
// one batch (100 emails) per chef. Processes up to 5 chefs per invocation.

import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { runHistoricalScanBatch } from '@/lib/gmail/historical-scan'
import { verifyCronAuth } from '@/lib/auth/cron-auth'

const MAX_CHEFS_PER_RUN = 5

async function handleEmailHistoryScan(request: NextRequest): Promise<NextResponse> {
  const authError = verifyCronAuth(request.headers.get('authorization'))
  if (authError) return authError

  const supabase = createServerClient({ admin: true })

  // Find chefs with active historical scans
  // Status must NOT be completed or paused - idle and in_progress are eligible
  const { data: connections, error } = await supabase
    .from('google_connections')
    .select('chef_id, tenant_id, historical_scan_status')
    .eq('historical_scan_enabled', true)
    .eq('gmail_connected', true)
    .not('historical_scan_status', 'in', '["completed","paused"]')
    .limit(MAX_CHEFS_PER_RUN)

  if (error) {
    console.error('[email-history-scan] DB query failed:', error.message)
    return NextResponse.json({ error: 'Failed to query scan connections' }, { status: 500 })
  }

  if (!connections || connections.length === 0) {
    return NextResponse.json({ message: 'No active scans', chefsProcessed: 0 })
  }

  const results = []

  for (const conn of connections as Array<{
    chef_id: string
    tenant_id: string
    historical_scan_status: string
  }>) {
    try {
      const batchResult = await runHistoricalScanBatch(conn.chef_id, conn.tenant_id)
      results.push(batchResult)
    } catch (err) {
      console.error(`[email-history-scan] Batch failed for chef ${conn.chef_id}:`, err)
      results.push({
        chefId: conn.chef_id,
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

  return NextResponse.json({
    chefsProcessed: connections.length,
    totalEmailsProcessed: totalProcessed,
    totalFindingsAdded: totalFindings,
    scansCompleted: completed,
    errors,
    details: results,
  })
}

export { handleEmailHistoryScan as GET, handleEmailHistoryScan as POST }
