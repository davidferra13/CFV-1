// SMS Rate Limiter
// Prevents SMS flooding by enforcing per-action per-tenant cooldown windows.
// Uses sms_send_log table (created in 20260302000004_notification_channels.sql).
//
// Default windows (configurable via SMS_RATE_LIMIT_* env vars):
//   critical tier — 15 minutes between SMS for the same action
//   alert tier    — 60 minutes
//   info tier     — never via SMS (but guarded anyway)
//
// The cleaner cron (activity-cleanup) removes rows older than 48 hours.

import { createServerClient } from '@/lib/supabase/server'
import type { NotificationAction } from '@/lib/notifications/types'
import { DEFAULT_TIER_MAP } from '@/lib/notifications/tier-config'

// How long to suppress duplicate SMS for the same (tenant, action)
const RATE_LIMIT_MINUTES: Record<string, number> = {
  critical: parseInt(process.env.SMS_RATE_LIMIT_CRITICAL_MINUTES ?? '15', 10),
  alert: parseInt(process.env.SMS_RATE_LIMIT_ALERT_MINUTES ?? '60', 10),
  info: parseInt(process.env.SMS_RATE_LIMIT_INFO_MINUTES ?? '120', 10),
}

/**
 * Check whether sending an SMS for this action is allowed right now.
 * Returns true if the SMS should be sent (not rate-limited).
 * Returns false if a recent SMS for the same action already went out.
 */
export async function isSmsAllowed(tenantId: string, action: NotificationAction): Promise<boolean> {
  const tier = DEFAULT_TIER_MAP[action] ?? 'alert'
  const windowMinutes = RATE_LIMIT_MINUTES[tier] ?? 60

  const windowStart = new Date(Date.now() - windowMinutes * 60 * 1000).toISOString()

  const supabase = createServerClient({ admin: true })

  const { data, error } = await supabase
    .from('sms_send_log')
    .select('id')
    .eq('tenant_id', tenantId)
    .eq('action', action)
    .gte('sent_at', windowStart)
    .limit(1)
    .single()

  if (error && error.code !== 'PGRST116') {
    // PGRST116 = no rows found (expected case) — anything else is a DB error
    console.error('[isSmsAllowed] DB error:', error)
    // Fail open: allow the send rather than silently dropping
    return true
  }

  return !data // no recent row = allowed
}

/**
 * Record that an SMS was sent for this action.
 * Call this AFTER a successful sendSms() call.
 */
export async function recordSmsSent(tenantId: string, action: NotificationAction): Promise<void> {
  const supabase = createServerClient({ admin: true })

  const { error } = await supabase.from('sms_send_log').insert({ tenant_id: tenantId, action })

  if (error) {
    console.error('[recordSmsSent] Insert failed:', error)
    // Non-fatal — rate limiting will just be less accurate for this window
  }
}
