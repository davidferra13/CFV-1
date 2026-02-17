// Gmail Sync Cron Endpoint
// POST /api/gmail/sync — syncs all connected chefs' Gmail inboxes.
// Secured with CRON_SECRET bearer token (for Vercel Cron or external scheduler).

import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { syncGmailInbox } from '@/lib/gmail/sync'

export async function POST(request: NextRequest) {
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
