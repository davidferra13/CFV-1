// Scheduled Push Subscription Cleanup Cron Endpoint
// GET /api/scheduled/push-cleanup - invoked by Vercel Cron Job (daily at 4 AM UTC)
// POST /api/scheduled/push-cleanup - invoked manually or by external schedulers
//
// Two jobs in one:
//
// 1. Push subscription hygiene
//    - Deactivates subscriptions with failed_count >= 5 that are still marked active
//      (the send path should have already deactivated them, but this ensures consistency)
//    - Hard-deletes subscriptions that have been inactive for 90+ days
//
// 2. SMS send log cleanup
//    - Deletes sms_send_log rows older than 48 hours
//    - These are rate-limit windows; once expired they serve no purpose
//    - Note: activity-cleanup route currently skips this; this cron owns it

import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { verifyCronAuth } from '@/lib/auth/cron-auth'

const PUSH_INACTIVE_PURGE_DAYS = 90 // hard-delete inactive subscriptions after 90 days
const SMS_LOG_RETENTION_HOURS = 48 // SMS rate-limit log retention window

async function handlePushCleanup(request: NextRequest): Promise<NextResponse> {
  const authError = verifyCronAuth(request.headers.get('authorization'))
  if (authError) return authError

  const supabase = createServerClient({ admin: true })
  const now = new Date()

  // ── 1a. Deactivate subscriptions with too many failures ──────────────────
  // failed_count >= 5 means the send path couldn't reach this endpoint repeatedly.
  // Deactivate them so they stop being attempted in future sends.
  const { data: deactivatedRows, error: deactivateError } = await supabase
    .from('push_subscriptions')
    .update({ is_active: false })
    .gte('failed_count', 5)
    .eq('is_active', true)
    .select('id')

  const deactivated = deactivatedRows?.length ?? 0

  if (deactivateError) {
    console.error('[Push Cleanup Cron] Failed to deactivate failed subscriptions:', deactivateError)
    // Non-fatal - continue to next step
  }

  // ── 1b. Hard-delete old inactive subscriptions ───────────────────────────
  // Subscriptions that have been is_active = false for 90+ days are safe to remove.
  const inactiveCutoff = new Date(
    now.getTime() - PUSH_INACTIVE_PURGE_DAYS * 24 * 60 * 60 * 1000
  ).toISOString()

  const { count: deleted, error: deleteError } = await supabase
    .from('push_subscriptions')
    .delete({ count: 'exact' })
    .eq('is_active', false)
    .lt('updated_at', inactiveCutoff)

  if (deleteError) {
    console.error('[Push Cleanup Cron] Failed to delete old inactive subscriptions:', deleteError)
    // Non-fatal - continue to SMS cleanup
  }

  // ── 2. SMS send log cleanup ──────────────────────────────────────────────
  // Rate-limit windows expire after 48h. Old rows are just noise after that.
  const smsCutoff = new Date(now.getTime() - SMS_LOG_RETENTION_HOURS * 60 * 60 * 1000).toISOString()

  const { count: smsDeleted, error: smsError } = await supabase
    .from('sms_send_log')
    .delete({ count: 'exact' })
    .lt('sent_at', smsCutoff)

  if (smsError) {
    console.error('[Push Cleanup Cron] Failed to clean SMS send log:', smsError)
    // Non-fatal
  }

  const result = {
    pushSubscriptionsDeactivated: deactivated ?? 0,
    pushSubscriptionsDeleted: deleted ?? 0,
    smsLogRowsDeleted: smsDeleted ?? 0,
    inactiveCutoff,
    smsCutoff,
  }

  console.log('[Push Cleanup Cron]', result)

  return NextResponse.json(result)
}

export { handlePushCleanup as GET, handlePushCleanup as POST }
