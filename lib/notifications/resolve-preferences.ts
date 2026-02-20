// Notification Channel Preference Resolver
// Determines which channels (email, push, sms) should fire for a given
// (tenantId, authUserId, action) combination.
//
// Resolution cascade (first match wins):
//   1. Per-category channel overrides in notification_preferences (DB)
//   2. Default tier channels from DEFAULT_TIER_MAP + TIER_CHANNEL_DEFAULTS (code)
//   3. Special overrides: EMAIL_SUPPRESSED_ACTIONS always disables email
//   4. SMS gate: requires chef_preferences.sms_opt_in = true AND sms_notify_phone set

import { createServerClient } from '@/lib/supabase/server'
import type { NotificationAction, NotificationCategory } from './types'
import {
  DEFAULT_TIER_MAP,
  TIER_CHANNEL_DEFAULTS,
  EMAIL_SUPPRESSED_ACTIONS,
  getDefaultChannels,
  type ChannelSet,
} from './tier-config'
import { NOTIFICATION_CONFIG } from './types'

export type ResolvedChannels = ChannelSet & {
  /** The tier that was resolved (for logging/debugging) */
  tier: 'critical' | 'alert' | 'info'
  /** Phone number to use for SMS, if sms = true */
  smsPhone: string | null
}

/**
 * Resolve which delivery channels should fire for a notification.
 *
 * Returns a `ResolvedChannels` object. All boolean fields are guaranteed
 * to be concrete (never null/undefined) — callers can check directly.
 *
 * SMS will only be true if:
 *   - The tier/preference enables it, AND
 *   - chef_preferences.sms_opt_in = true, AND
 *   - chef_preferences.sms_notify_phone is set
 */
export async function resolveChannels(
  tenantId: string,
  authUserId: string,
  action: NotificationAction,
): Promise<ResolvedChannels> {
  const category: NotificationCategory = NOTIFICATION_CONFIG[action].category

  // Base defaults from tier config
  const defaults = getDefaultChannels(action)
  const tier = DEFAULT_TIER_MAP[action]

  // Start with tier defaults — will be overridden by DB prefs below
  let resolved: ChannelSet = { ...defaults }

  try {
    const supabase = createServerClient({ admin: true })

    // 1. Load category-level channel overrides from notification_preferences
    const { data: pref } = await supabase
      .from('notification_preferences')
      .select('email_enabled, push_enabled, sms_enabled')
      .eq('auth_user_id', authUserId)
      .eq('category', category)
      .single()

    if (pref) {
      // Only apply non-null overrides; null = "inherit tier default"
      if (pref.email_enabled !== null && pref.email_enabled !== undefined) {
        resolved.email = pref.email_enabled
      }
      if (pref.push_enabled !== null && pref.push_enabled !== undefined) {
        resolved.push = pref.push_enabled
      }
      if (pref.sms_enabled !== null && pref.sms_enabled !== undefined) {
        resolved.sms = pref.sms_enabled
      }
    }

    // 2. Re-apply email suppression (cannot be overridden for intent signals)
    if (EMAIL_SUPPRESSED_ACTIONS.has(action)) {
      resolved.email = false
    }

    // 3. SMS gate — requires explicit opt-in and phone number
    let smsPhone: string | null = null
    if (resolved.sms) {
      const { data: prefs } = await supabase
        .from('chef_preferences')
        .select('sms_opt_in, sms_notify_phone')
        .eq('tenant_id', tenantId)
        .single()

      if (prefs?.sms_opt_in && prefs.sms_notify_phone) {
        smsPhone = prefs.sms_notify_phone
      } else {
        resolved.sms = false
      }
    }

    return { ...resolved, tier, smsPhone }
  } catch (err) {
    console.error('[resolveChannels] Error loading preferences, falling back to defaults:', err)
    // Graceful fallback: use tier defaults but disable SMS (requires explicit opt-in)
    return { ...defaults, sms: false, tier, smsPhone: null }
  }
}
