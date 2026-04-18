// Proactive Alerts Cron Endpoint
// GET/POST /api/scheduled/proactive-alerts
// Runs alert rules for all active tenants. Should be called hourly by the cron scheduler.
// Uses the admin client - no user session required.

import { NextResponse, type NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/db/admin'
import { runAlertRulesAdmin } from '@/lib/ai/remy-proactive-alerts'
import { isAiEnabledForTenant } from '@/lib/ai/privacy-internal'
import { verifyCronAuth } from '@/lib/auth/cron-auth'
import { recordCronHeartbeat, recordCronError } from '@/lib/cron/heartbeat'

async function handleProactiveAlerts(request: NextRequest): Promise<NextResponse> {
  const authError = verifyCronAuth(request.headers.get('authorization'))
  if (authError) return authError

  const startedAt = Date.now()
  let tenantsProcessed = 0
  let totalInserted = 0
  const errors: string[] = []

  try {
    const db: any = createAdminClient()

    // Get all chefs who have had any event activity in the last 90 days
    const cutoff = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString()
    const { data: activeTenants, error } = await db
      .from('events')
      .select('tenant_id')
      .gte('created_at', cutoff)
      .not('status', 'in', '("cancelled")')
      .limit(500)

    if (error) throw new Error(`Failed to fetch active tenants: ${error.message}`)

    // Deduplicate tenant IDs
    const tenantIds = [...new Set<string>((activeTenants ?? []).map((r: any) => r.tenant_id))]

    for (const tenantId of tenantIds) {
      try {
        // Skip tenants who have disabled Remy
        const aiEnabled = await isAiEnabledForTenant(tenantId)
        if (!aiEnabled) continue

        const inserted = await runAlertRulesAdmin(tenantId)
        totalInserted += inserted
        tenantsProcessed++
      } catch (err) {
        errors.push(`tenant ${tenantId}: ${err instanceof Error ? err.message : String(err)}`)
      }
    }

    await recordCronHeartbeat(
      'proactive-alerts',
      { tenantsProcessed, totalInserted, errors: errors.length },
      Date.now() - startedAt
    )

    return NextResponse.json({ tenantsProcessed, totalInserted, errors: errors.slice(0, 10) })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    await recordCronError('proactive-alerts', message, Date.now() - startedAt)
    console.error('[proactive-alerts] Cron failed:', error)
    return NextResponse.json({ error: 'Proactive alerts cron failed' }, { status: 500 })
  }
}

export { handleProactiveAlerts as GET, handleProactiveAlerts as POST }
