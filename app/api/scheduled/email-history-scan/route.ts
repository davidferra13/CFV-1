// Scheduled: Email Historical Scan
// GET /api/scheduled/email-history-scan — health check (Vercel Cron sends GET)
// POST /api/scheduled/email-history-scan — process a batch for each opted-in chef
//
// Runs every 15 minutes. Finds chefs with historical_scan_enabled=true and
// gmail_connected=true whose scan is not yet completed or paused, then runs
// one batch (100 emails) per chef. Processes up to 5 chefs per invocation.

import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { runHistoricalScanBatch } from '@/lib/gmail/historical-scan'
import { verifyCronAuth } from '@/lib/auth/cron-auth'
import { recordCronError, recordCronHeartbeat } from '@/lib/cron/heartbeat'

const MAX_CHEFS_PER_RUN = 5

async function handleEmailHistoryScan(request: NextRequest): Promise<NextResponse> {
  const startedAt = Date.now()
  const authError = verifyCronAuth(request.headers.get('authorization'))
  if (authError) return authError

  const supabase = createServerClient({ admin: true })

  let connections: Array<{
    chef_id: string
    tenant_id: string
    historical_scan_status: string
  }> = []
  let error: { message: string } | null = null

  try {
    const { data, error: mailboxError } = await (supabase as any)
      .from('google_mailboxes')
      .select('chef_id, tenant_id, historical_scan_status')
      .eq('historical_scan_enabled', true)
      .eq('gmail_connected', true)
      .eq('is_active', true)
      .not('historical_scan_status', 'in', '(completed,paused)')

    if (mailboxError) throw mailboxError

    const seenChefIds = new Set<string>()
    connections = (data ?? [])
      .flatMap((row: any) => {
        if (seenChefIds.has(row.chef_id)) return []
        seenChefIds.add(row.chef_id)
        return [
          {
            chef_id: row.chef_id,
            tenant_id: row.tenant_id,
            historical_scan_status: row.historical_scan_status,
          },
        ]
      })
      .slice(0, MAX_CHEFS_PER_RUN)
  } catch {
    const legacyResult = await (supabase as any)
      .from('google_connections')
      .select('chef_id, tenant_id, historical_scan_status')
      .eq('historical_scan_enabled', true)
      .eq('gmail_connected', true)
      .not('historical_scan_status', 'in', '(completed,paused)')
      .limit(MAX_CHEFS_PER_RUN)
    connections = legacyResult.data ?? []
    error = legacyResult.error
  }

  if (error) {
    console.error('[email-history-scan] DB query failed:', error.message)
    await recordCronError('email-history-scan', error.message, Date.now() - startedAt)
    return NextResponse.json({ error: 'Failed to query scan connections' }, { status: 500 })
  }

  if (!connections || connections.length === 0) {
    const result = {
      message: 'No active scans',
      chefsProcessed: 0,
      totalEmailsProcessed: 0,
      totalEmailsSeen: 0,
      estimatedTotalAcrossScans: 0,
      scansWithEstimate: 0,
    }
    await recordCronHeartbeat('email-history-scan', result, Date.now() - startedAt)
    return NextResponse.json(result)
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
  const totalSeen = results.reduce((sum, r) => sum + (('seen' in r ? r.seen : 0) as number), 0)
  const estimates = results
    .map((r) => ('resultSizeEstimate' in r ? r.resultSizeEstimate : null))
    .filter((value): value is number => typeof value === 'number')
  const completed = results.filter((r) => r.status === 'completed').length
  const errors = results.filter((r) => r.status === 'error').length

  const payload = {
    chefsProcessed: connections.length,
    totalEmailsProcessed: totalProcessed,
    totalEmailsSeen: totalSeen,
    totalFindingsAdded: totalFindings,
    estimatedTotalAcrossScans: estimates.reduce((sum, value) => sum + value, 0),
    scansWithEstimate: estimates.length,
    scansCompleted: completed,
    errors,
    details: results,
  }

  await recordCronHeartbeat('email-history-scan', payload, Date.now() - startedAt)
  return NextResponse.json(payload)
}

export { handleEmailHistoryScan as GET, handleEmailHistoryScan as POST }
