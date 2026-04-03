// Gmail Sync Cron Endpoint
// GET /api/gmail/sync - invoked by scheduled cron Job (self-hosted sends GET)
// POST /api/gmail/sync - invoked manually or by external schedulers
// Both methods run identical logic secured with CRON_SECRET bearer token.

import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@/lib/db/server'
import { syncGmailInbox } from '@/lib/gmail/sync'
import { verifyCronAuth } from '@/lib/auth/cron-auth'
import { runMonitoredCronJob } from '@/lib/cron/monitor'

async function handleGmailSync(request: NextRequest): Promise<NextResponse> {
  const authError = verifyCronAuth(request.headers.get('authorization'))
  if (authError) return authError

  try {
    const result = await runMonitoredCronJob('gmail-sync', async () => {
      const db = createServerClient({ admin: true })
      const { data: connections, error } = await db
        .from('google_connections')
        .select('chef_id, tenant_id, connected_email')
        .eq('gmail_connected', true)

      if (error) {
        console.error('[Gmail Cron] Failed to fetch connections:', error)
        throw new Error('Failed to fetch connections')
      }

      if (!connections || connections.length === 0) {
        return { message: 'No connected accounts', synced: 0, failed: 0, results: [] }
      }

      const results: Array<{
        chefId: string
        email: string | null
        success: boolean
        result?: Record<string, unknown>
        error?: string
      }> = []

      for (const conn of connections) {
        try {
          const syncResult = await syncGmailInbox(conn.chef_id, conn.tenant_id)
          results.push({
            chefId: conn.chef_id,
            email: conn.connected_email,
            success: true,
            result: syncResult as unknown as Record<string, unknown>,
          })
        } catch (err) {
          const error = err as Error
          console.error(`[Gmail Cron] Sync failed for chef ${conn.chef_id}:`, error)
          results.push({
            chefId: conn.chef_id,
            email: conn.connected_email,
            success: false,
            error: 'Sync failed',
          })
        }
      }

      return {
        synced: results.filter((r) => r.success).length,
        failed: results.filter((r) => !r.success).length,
        results,
      }
    })

    return NextResponse.json(result)
  } catch {
    return NextResponse.json({ error: 'Failed to fetch connections' }, { status: 500 })
  }
}

// scheduled cron Jobs send GET - export GET so cron fires correctly
// POST remains for manual or external scheduler calls
export { handleGmailSync as GET, handleGmailSync as POST }
