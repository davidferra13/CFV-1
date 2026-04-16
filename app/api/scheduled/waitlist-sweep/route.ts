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
import { createServerClient } from '@/lib/db/server'
import { verifyCronAuth } from '@/lib/auth/cron-auth'
import { runMonitoredCronJob } from '@/lib/cron/monitor'
import { recordSideEffectFailure } from '@/lib/monitoring/non-blocking'

// Re-notify threshold: don't notify the same waitlist entry more than once per 7 days
const RENOTIFY_INTERVAL_DAYS = 7

async function handleWaitlistSweep(request: NextRequest): Promise<NextResponse> {
  const authError = verifyCronAuth(request.headers.get('authorization'))
  if (authError) return authError

  try {
    const result = await runMonitoredCronJob('waitlist-sweep', async () => {
      const db = createServerClient({ admin: true })
      const now = new Date()
      const renotifyThreshold = new Date(
        now.getTime() - RENOTIFY_INTERVAL_DAYS * 24 * 60 * 60 * 1000
      ).toISOString()

      // ── Fetch active waiting entries that are eligible for notification ───────
      // Eligible = status is 'waiting', date is in the future, and either:
      //   (a) never been contacted, OR
      //   (b) last contacted more than RENOTIFY_INTERVAL_DAYS ago
      const { data: entries, error: fetchError } = await db
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
        .gt(
          'requested_date',
          [
            now.getFullYear(),
            String(now.getMonth() + 1).padStart(2, '0'),
            String(now.getDate()).padStart(2, '0'),
          ].join('-')
        ) // only future dates
        .or(`contacted_at.is.null,contacted_at.lt.${renotifyThreshold}`)
        .limit(200)

      if (fetchError) {
        console.error('[Waitlist Sweep Cron] Failed to fetch waitlist entries:', fetchError)
        throw new Error('Failed to fetch waitlist entries')
      }

      if (!entries || entries.length === 0) {
        return { notified: 0, skipped: 0, errors: 0 }
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
          const { data: block } = await db
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
          const { data: clientRole } = await db
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

          // Notify the chef that this waitlist client was contacted (non-blocking)
          try {
            const { data: chefRole } = await db
              .from('user_roles')
              .select('auth_user_id')
              .eq('entity_id', entry.chef_id)
              .eq('role', 'chef')
              .maybeSingle()

            if (chefRole?.auth_user_id) {
              await createNotification({
                tenantId: entry.chef_id,
                recipientId: chefRole.auth_user_id,
                category: 'client',
                action: 'follow_up_due',
                title: 'Waitlist client notified',
                body: `${clientInfo.full_name} was notified that ${dateStr}${entry.occasion ? ` (${entry.occasion})` : ''} may be available. Consider reaching out.`,
                actionUrl: `/schedule/waitlist`,
                clientId: entry.client_id ?? undefined,
              })
            }
          } catch (chefNotifyErr) {
            console.error(
              `[Waitlist Sweep] Chef notification failed for entry ${entry.id} (non-blocking):`,
              chefNotifyErr
            )
          }

          // Mark entry as contacted to prevent immediate re-notification
          await db
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
          await recordSideEffectFailure({
            source: 'cron:waitlist-sweep',
            operation: 'notify_waitlist_entry',
            severity: 'medium',
            entityType: 'waitlist_entry',
            entityId: entry.id,
            tenantId: entry.chef_id,
            errorMessage: error.message,
          })
          errors++
        }
      }

      return {
        processed: entries.length,
        notified,
        skipped,
        errors,
      }
    })

    return NextResponse.json(result)
  } catch (error) {
    console.error('[waitlist-sweep] Cron failed:', error)
    return NextResponse.json({ error: 'Waitlist sweep failed' }, { status: 500 })
  }
}

export { handleWaitlistSweep as GET, handleWaitlistSweep as POST }
