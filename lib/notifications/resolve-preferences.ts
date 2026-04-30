// Notification Channel Preference Resolver
// Determines which channels (email, push, sms) should fire for a given
// (tenantId, authUserId, action) combination.
//
// Resolution cascade (first match wins):
//   0. Per-chef tier override in chef_notification_tier_overrides (DB)
//   1. Per-category channel overrides in notification_preferences (DB)
//   2. Default tier channels from DEFAULT_TIER_MAP + TIER_CHANNEL_DEFAULTS (code)
//   3. Special overrides: EMAIL_SUPPRESSED_ACTIONS always disables email
//   4. Signal OS channel policy blocks channels that create noise for this action
//   5. SMS gate: requires chef_preferences.sms_opt_in = true AND sms_notify_phone set

import { createServerClient } from '@/lib/db/server'
import type { NotificationAction, NotificationCategory } from './types'
import {
  DEFAULT_TIER_MAP,
  TIER_CHANNEL_DEFAULTS,
  EMAIL_SUPPRESSED_ACTIONS,
  CLIENT_FACING_ACTIONS,
  type ChannelSet,
} from './tier-config'
import { NOTIFICATION_CONFIG } from './types'
import { applySignalChannelPolicy } from './signal-os'

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
 * to be concrete (never null/undefined) - callers can check directly.
 *
 * SMS will only be true if:
 *   - The tier/preference enables it, AND
 *   - For chef-facing actions: chef_preferences.sms_opt_in = true AND sms_notify_phone set
 *   - For client-facing actions: clients.phone is set (transactional consent implied)
 */
export async function resolveChannels(
  tenantId: string,
  authUserId: string,
  action: NotificationAction
): Promise<ResolvedChannels> {
  const category: NotificationCategory = NOTIFICATION_CONFIG[action].category

  // Base defaults from tier config, with per-chef tier override applied
  let tier = DEFAULT_TIER_MAP[action]

  try {
    const db = createServerClient({ admin: true })

    // 0. Check for per-chef tier override before computing channel defaults
    const { data: tierOverride } = await (db as any)
      .from('chef_notification_tier_overrides')
      .select('tier')
      .eq('chef_id', tenantId)
      .eq('action', action)
      .single()

    if (tierOverride?.tier && ['critical', 'alert', 'info'].includes(tierOverride.tier)) {
      tier = tierOverride.tier as 'critical' | 'alert' | 'info'
    }
  } catch {
    // If override lookup fails, continue with default tier
  }

  // Compute channel defaults from the (possibly overridden) tier
  const tierChannels = { ...TIER_CHANNEL_DEFAULTS[tier] }
  if (EMAIL_SUPPRESSED_ACTIONS.has(action)) {
    tierChannels.email = false
  }
  const defaults = tierChannels

  // Start with tier defaults - will be overridden by DB prefs below
  let resolved: ChannelSet = { ...defaults }

  try {
    const db = createServerClient({ admin: true })

    // 1. Load category-level channel overrides from notification_preferences
    const { data: pref } = await db
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

    // 3. Apply ChefFlow signal policy after preferences. Preferences can demote,
    // but cannot force a noisy channel for actions that should never use it.
    resolved = applySignalChannelPolicy(action, resolved)

    // 4. SMS gate - different paths for chef vs client recipients
    let smsPhone: string | null = null
    if (resolved.sms) {
      if (CLIENT_FACING_ACTIONS.has(action)) {
        // Client recipient: look up client phone by auth_user_id
        // Phone presence is sufficient consent for transactional notifications
        const { data: client } = await (db as any)
          .from('clients')
          .select('phone')
          .eq('auth_user_id', authUserId)
          .maybeSingle()

        if (client?.phone) {
          smsPhone = client.phone
        } else {
          resolved.sms = false
        }
      } else {
        // Chef recipient: requires explicit opt-in in chef_preferences
        const { data: prefs } = await db
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
    }

    return { ...resolved, tier, smsPhone }
  } catch (err) {
    console.error('[resolveChannels] Error loading preferences, falling back to defaults:', err)
    // Graceful fallback: use tier defaults but disable SMS (requires explicit opt-in)
    const signalDefaults = applySignalChannelPolicy(action, defaults)
    return { ...signalDefaults, sms: false, tier, smsPhone: null }
  }
}
