// Scheduled Waitlist Sweep Cron Endpoint
// GET /api/scheduled/waitlist-sweep - invoked by scheduled cron Job (daily at 8 AM UTC)
// POST /api/scheduled/waitlist-sweep - invoked manually or by external schedulers
//
// Sweeps active waitlist entries and notifies clients when their requested date
// has no confirmed event blocking it (i.e., the chef may be available).
//
// Deduplication: only notifies if contacted_at is null or > 7 days ago.
// Sets status to 'contacted' and records contacted_at when notified.

import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { verifyCronAuth } from '@/lib/auth/cron-auth'

// Re-notify threshold: don't notify the same waitlist entry more than once per 7 days
const RENOTIFY_INTERVAL_DAYS = 7

async function handleWaitlistSweep(request: NextRequest): Promise<NextResponse> {
  const authError = verifyCronAuth(request.headers.get('authorization'))
  if (authError) return authError

  const supabase = createServerClient({ admin: true })
  const now = new Date()
  const renotifyThreshold = new Date(
    now.getTime() - RENOTIFY_INTERVAL_DAYS * 24 * 60 * 60 * 1000
  ).toISOString()

  // ── Fetch active waiting entries that are eligible for notification ───────
  // Eligible = status is 'waiting', date is in the future, and either:
  //   (a) never been contacted, OR
  //   (b) last contacted more than RENOTIFY_INTERVAL_DAYS ago
  const { data: entries, error: fetchError } = await supabase
    .from('waitlist_entries')
    .select(
      `
      id,
      chef_id,
      client_id,
      requested_date,
      requested_date_end,
      occasion,
      contacted_at,
      client:clients(id, full_name, email)
    `
    )
    .eq('status', 'waiting')
    .gt('requested_date', now.toISOString().split('T')[0]) // only future dates
    .or(`contacted_at.is.null,contacted_at.lt.${renotifyThreshold}`)
    .limit(200)

  if (fetchError) {
    console.error('[Waitlist Sweep Cron] Failed to fetch waitlist entries:', fetchError)
    return NextResponse.json({ error: 'Failed to fetch waitlist entries' }, { status: 500 })
  }

  if (!entries || entries.length === 0) {
    return NextResponse.json({ notified: 0, skipped: 0, errors: 0 })
  }

  // ── For each entry, check whether the requested date is blocked ──────────
  // A date is "blocked" when there is an is_event_auto = true availability block
  // (meaning a confirmed/paid event occupies that date).
  // If there is NO such block, the date is potentially open → notify the client.

  let notified = 0
  let skipped = 0
  let errors = 0

  const { createNotification } = await import('@/lib/notifications/actions')

  for (const entry of entries) {
    try {
      const clientInfo = entry.client as { id: string; full_name: string; email: string } | null
      if (!clientInfo) {
        skipped++
        continue
      }

      // Check for ANY availability block on the requested date - auto (confirmed event)
      // or manual (personal day, holiday, etc.). Either way, the date is not open.
      const { data: block } = await supabase
        .from('chef_availability_blocks')
        .select('id')
        .eq('chef_id', entry.chef_id)
        .eq('block_date', entry.requested_date)
        .maybeSingle()

      if (block) {
        // Date is blocked - skip
        skipped++
        continue
      }

      // Date appears open - look up chef's auth_user_id to find the client's recipient id
      const { data: clientRole } = await supabase
        .from('user_roles')
        .select('auth_user_id')
        .eq('entity_id', entry.client_id!)
        .eq('role', 'client')
        .maybeSingle()

      if (!clientRole?.auth_user_id) {
        skipped++
        continue
      }

      const dateStr = entry.requested_date
      const occasionLabel = entry.occasion ? ` for your ${entry.occasion}` : ''

      // Create in-app notification for the client
      await createNotification({
        tenantId: entry.chef_id,
        recipientId: clientRole.auth_user_id,
        category: 'system',
        action: 'system_alert',
        title: 'A date you wanted may be available',
        body: `${dateStr}${occasionLabel} appears to be open. Reach out to lock it in!`,
        actionUrl: `/my-events`,
      })

      // Mark entry as contacted to prevent immediate re-notification
      await supabase
        .from('waitlist_entries')
        .update({
          status: 'contacted',
          contacted_at: now.toISOString(),
        })
        .eq('id', entry.id)

      notified++
    } catch (err) {
      const error = err as Error
      console.error(`[Waitlist Sweep Cron] Failed for entry ${entry.id}:`, error.message)
      errors++
    }
  }

  return NextResponse.json({
    processed: entries.length,
    notified,
    skipped,
    errors,
  })
}

export { handleWaitlistSweep as GET, handleWaitlistSweep as POST }
