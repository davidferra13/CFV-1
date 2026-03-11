// Gmail Sync Cron Endpoint
// GET /api/gmail/sync — invoked by Vercel Cron Job (Vercel sends GET)
// POST /api/gmail/sync — invoked manually or by external schedulers
// Both methods run identical logic secured with CRON_SECRET bearer token.

import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { syncGmailInbox } from '@/lib/gmail/sync'
import { verifyCronAuth } from '@/lib/auth/cron-auth'
import { recordCronError, recordCronHeartbeat } from '@/lib/cron/heartbeat'

async function handleGmailSync(request: NextRequest): Promise<NextResponse> {
  const startedAt = Date.now()
  const authError = verifyCronAuth(request.headers.get('authorization'))
  if (authError) return authError

  const supabase = createServerClient({ admin: true })

  let connections: Array<{ chef_id: string; tenant_id: string; connected_email: string | null }> =
    []
  let error: { message: string } | null = null

  try {
    const { data, error: mailboxError } = await (supabase as any)
      .from('google_mailboxes')
      .select('chef_id, tenant_id, email')
      .eq('gmail_connected', true)
      .eq('is_active', true)

    if (mailboxError) throw mailboxError

    const seenChefIds = new Set<string>()
    connections = (data ?? []).flatMap((row: any) => {
      if (seenChefIds.has(row.chef_id)) return []
      seenChefIds.add(row.chef_id)
      return [
        {
          chef_id: row.chef_id,
          tenant_id: row.tenant_id,
          connected_email: row.email ?? null,
        },
      ]
    })
  } catch (mailboxError: any) {
    const legacyResult = await (supabase as any)
      .from('google_connections')
      .select('chef_id, tenant_id, connected_email')
      .eq('gmail_connected', true)
    connections = legacyResult.data ?? []
    error = legacyResult.error
  }

  if (error) {
    console.error('[Gmail Cron] Failed to fetch connections:', error)
    await recordCronError('gmail-sync', error.message, Date.now() - startedAt)
    return NextResponse.json({ error: 'Failed to fetch connections' }, { status: 500 })
  }

  if (!connections || connections.length === 0) {
    const result = { message: 'No connected accounts', synced: 0 }
    await recordCronHeartbeat('gmail-sync', result, Date.now() - startedAt)
    return NextResponse.json(result)
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
        error: 'Sync failed',
      })
    }
  }

  const payload = {
    synced: results.filter((r) => r.success).length,
    failed: results.filter((r) => !r.success).length,
    results,
  }

  await recordCronHeartbeat('gmail-sync', payload, Date.now() - startedAt)
  return NextResponse.json(payload)
}

// Vercel Cron Jobs send GET — export GET so cron fires correctly
// POST remains for manual or external scheduler calls
export { handleGmailSync as GET, handleGmailSync as POST }
