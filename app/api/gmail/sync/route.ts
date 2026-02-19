// Gmail Sync Cron Endpoint
// GET /api/gmail/sync — invoked by Vercel Cron Job (Vercel sends GET)
// POST /api/gmail/sync — invoked manually or by external schedulers
// Both methods run identical logic secured with CRON_SECRET bearer token.

import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { syncGmailInbox } from '@/lib/gmail/sync'

async function handleGmailSync(request: NextRequest): Promise<NextResponse> {
  // Validate cron secret
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET

  if (!cronSecret) {
    return NextResponse.json(
      { error: 'CRON_SECRET not configured' },
      { status: 500 }
    )
  }

  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    )
  }

  const supabase = createServerClient({ admin: true })

  // Find all chefs with Gmail connected
  const { data: connections, error } = await supabase
    .from('google_connections')
    .select('chef_id, tenant_id, connected_email')
    .eq('gmail_connected', true)

  if (error) {
    console.error('[Gmail Cron] Failed to fetch connections:', error)
    return NextResponse.json(
      { error: 'Failed to fetch connections' },
      { status: 500 }
    )
  }

  if (!connections || connections.length === 0) {
    return NextResponse.json({ message: 'No connected accounts', synced: 0 })
  }

  // Sync each chef independently — one failure does not block others
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
        error: error.message,
      })
    }
  }

  return NextResponse.json({
    synced: results.filter((r) => r.success).length,
    failed: results.filter((r) => !r.success).length,
    results,
  })
}

// Vercel Cron Jobs send GET — export GET so cron fires correctly
// POST remains for manual or external scheduler calls
export { handleGmailSync as GET, handleGmailSync as POST }
