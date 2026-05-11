'use server'

/**
 * Vendor Rate Limiter - Anti-Spam Engine for AI Calling
 *
 * Vendors are real people. This system exists to prevent harassment.
 * When in doubt, don't call.
 *
 * Enforces per-vendor call limits, cooldowns, and blocklists so that
 * vendors never receive excessive or unwanted calls from the AI system.
 * All checks fail-safe: if the rate limiter cannot determine eligibility,
 * the call is BLOCKED (not allowed).
 */

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface VendorCallEligibility {
  eligible: boolean
  reason?: string
  cooldownUntil?: string
  callsToday: number
  callsThisWeek: number
  consecutiveNoAnswers: number
  isBlocked: boolean
}

export interface RateLimitConfig {
  maxCallsPerVendorPerDay: number
  maxCallsPerVendorPerWeek: number
  vendorCooldownHours: number
  callVelocityMax: number
  callVelocitySpacingSeconds: number
}

// ---------------------------------------------------------------------------
// Defaults
// ---------------------------------------------------------------------------

const DEFAULT_CONFIG: RateLimitConfig = {
  maxCallsPerVendorPerDay: 1,
  maxCallsPerVendorPerWeek: 2,
  vendorCooldownHours: 48,
  callVelocityMax: 5,
  callVelocitySpacingSeconds: 120,
}

// ---------------------------------------------------------------------------
// getRateLimitConfig
// ---------------------------------------------------------------------------

export async function getRateLimitConfig(): Promise<RateLimitConfig> {
  const chef = await requireChef()
  const db: any = createServerClient()

  try {
    const { data } = await db
      .from('ai_call_routing_rules')
      .select('config')
      .eq('chef_id', chef.entityId)
      .eq('rule_type', 'rate_limit')
      .maybeSingle()

    if (!data?.config) return { ...DEFAULT_CONFIG }

    const c = data.config
    return {
      maxCallsPerVendorPerDay: c.maxCallsPerVendorPerDay ?? DEFAULT_CONFIG.maxCallsPerVendorPerDay,
      maxCallsPerVendorPerWeek:
        c.maxCallsPerVendorPerWeek ?? DEFAULT_CONFIG.maxCallsPerVendorPerWeek,
      vendorCooldownHours: c.vendorCooldownHours ?? DEFAULT_CONFIG.vendorCooldownHours,
      callVelocityMax: c.callVelocityMax ?? DEFAULT_CONFIG.callVelocityMax,
      callVelocitySpacingSeconds:
        c.callVelocitySpacingSeconds ?? DEFAULT_CONFIG.callVelocitySpacingSeconds,
    }
  } catch (err) {
    console.error('[rate-limiter] Failed to load config, using defaults:', err)
    return { ...DEFAULT_CONFIG }
  }
}

// ---------------------------------------------------------------------------
// checkVendorEligibility
// ---------------------------------------------------------------------------

export async function checkVendorEligibility(vendorPhone: string): Promise<VendorCallEligibility> {
  const chef = await requireChef()
  const db: any = createServerClient()

  // Fail-safe: if anything goes wrong, block the call
  try {
    const config = await getRateLimitConfig()

    const { data } = await db
      .from('vendor_call_limits')
      .select('*')
      .eq('chef_id', chef.entityId)
      .eq('vendor_phone', vendorPhone)
      .maybeSingle()

    // No record means never called, eligible
    if (!data) {
      return {
        eligible: true,
        callsToday: 0,
        callsThisWeek: 0,
        consecutiveNoAnswers: 0,
        isBlocked: false,
      }
    }

    // Check blocked
    if (data.is_blocked) {
      return {
        eligible: false,
        reason: `Vendor is blocked: ${data.blocked_reason || 'no reason provided'}`,
        callsToday: data.calls_today ?? 0,
        callsThisWeek: data.calls_this_week ?? 0,
        consecutiveNoAnswers: data.consecutive_no_answers ?? 0,
        isBlocked: true,
      }
    }

    // Check cooldown
    if (data.cooldown_until) {
      const cooldownEnd = new Date(data.cooldown_until)
      if (cooldownEnd > new Date()) {
        return {
          eligible: false,
          reason: `Vendor is in cooldown until ${cooldownEnd.toISOString()}`,
          cooldownUntil: cooldownEnd.toISOString(),
          callsToday: data.calls_today ?? 0,
          callsThisWeek: data.calls_this_week ?? 0,
          consecutiveNoAnswers: data.consecutive_no_answers ?? 0,
          isBlocked: false,
        }
      }
    }

    // Check daily limit
    if ((data.calls_today ?? 0) >= config.maxCallsPerVendorPerDay) {
      return {
        eligible: false,
        reason: `Daily call limit reached (${config.maxCallsPerVendorPerDay}/day)`,
        callsToday: data.calls_today ?? 0,
        callsThisWeek: data.calls_this_week ?? 0,
        consecutiveNoAnswers: data.consecutive_no_answers ?? 0,
        isBlocked: false,
      }
    }

    // Check weekly limit
    if ((data.calls_this_week ?? 0) >= config.maxCallsPerVendorPerWeek) {
      return {
        eligible: false,
        reason: `Weekly call limit reached (${config.maxCallsPerVendorPerWeek}/week)`,
        callsToday: data.calls_today ?? 0,
        callsThisWeek: data.calls_this_week ?? 0,
        consecutiveNoAnswers: data.consecutive_no_answers ?? 0,
        isBlocked: false,
      }
    }

    // Check consecutive no-answers (5+ triggers auto-cooldown)
    if ((data.consecutive_no_answers ?? 0) >= 5) {
      return {
        eligible: false,
        reason: `Too many consecutive no-answers (${data.consecutive_no_answers}). Vendor may not want calls.`,
        callsToday: data.calls_today ?? 0,
        callsThisWeek: data.calls_this_week ?? 0,
        consecutiveNoAnswers: data.consecutive_no_answers ?? 0,
        isBlocked: false,
      }
    }

    // All checks passed
    return {
      eligible: true,
      callsToday: data.calls_today ?? 0,
      callsThisWeek: data.calls_this_week ?? 0,
      consecutiveNoAnswers: data.consecutive_no_answers ?? 0,
      isBlocked: false,
    }
  } catch (err) {
    console.error('[rate-limiter] checkVendorEligibility failed, blocking call (fail-safe):', err)
    return {
      eligible: false,
      reason: 'Rate limiter error, call blocked for safety',
      callsToday: 0,
      callsThisWeek: 0,
      consecutiveNoAnswers: 0,
      isBlocked: false,
    }
  }
}

// ---------------------------------------------------------------------------
// recordCallAttempt
// ---------------------------------------------------------------------------

export async function recordCallAttempt(vendorPhone: string, vendorName: string): Promise<void> {
  const chef = await requireChef()
  const db: any = createServerClient()

  try {
    const now = new Date().toISOString()

    // Check if record exists
    const { data: existing } = await db
      .from('vendor_call_limits')
      .select('id, calls_today, calls_this_week')
      .eq('chef_id', chef.entityId)
      .eq('vendor_phone', vendorPhone)
      .maybeSingle()

    if (!existing) {
      // Insert new record
      await db.from('vendor_call_limits').insert({
        chef_id: chef.entityId,
        vendor_phone: vendorPhone,
        vendor_name: vendorName,
        calls_today: 1,
        calls_this_week: 1,
        last_called_at: now,
        consecutive_no_answers: 0,
        is_blocked: false,
      })
    } else {
      // Update existing: increment counters
      await db
        .from('vendor_call_limits')
        .update({
          vendor_name: vendorName,
          calls_today: (existing.calls_today ?? 0) + 1,
          calls_this_week: (existing.calls_this_week ?? 0) + 1,
          last_called_at: now,
        })
        .eq('id', existing.id)
    }
  } catch (err) {
    console.error('[rate-limiter] recordCallAttempt failed:', err)
  }
}

// ---------------------------------------------------------------------------
// recordCallOutcome
// ---------------------------------------------------------------------------

export async function recordCallOutcome(
  vendorPhone: string,
  outcome: 'answered' | 'no_answer' | 'busy' | 'failed'
): Promise<void> {
  const chef = await requireChef()
  const db: any = createServerClient()

  try {
    const { data: existing } = await db
      .from('vendor_call_limits')
      .select('id, consecutive_no_answers')
      .eq('chef_id', chef.entityId)
      .eq('vendor_phone', vendorPhone)
      .maybeSingle()

    if (!existing) {
      console.warn('[rate-limiter] recordCallOutcome: no record found for', vendorPhone)
      return
    }

    if (outcome === 'answered') {
      // Reset consecutive no-answers on successful contact
      await db
        .from('vendor_call_limits')
        .update({ consecutive_no_answers: 0 })
        .eq('id', existing.id)
    } else {
      // no_answer, busy, or failed: increment consecutive no-answers
      const newCount = (existing.consecutive_no_answers ?? 0) + 1
      const config = await getRateLimitConfig()

      const updates: Record<string, any> = {
        consecutive_no_answers: newCount,
      }

      // Set cooldown if too many consecutive failures
      if (newCount >= 5) {
        const cooldownEnd = new Date(Date.now() + config.vendorCooldownHours * 60 * 60 * 1000)
        updates.cooldown_until = cooldownEnd.toISOString()
      } else if (outcome === 'no_answer' || outcome === 'busy') {
        // Even a single no-answer/busy gets at least 48 hours cooldown
        const minCooldown = new Date(Date.now() + 48 * 60 * 60 * 1000)
        const configCooldown = new Date(Date.now() + config.vendorCooldownHours * 60 * 60 * 1000)
        const cooldownEnd = minCooldown > configCooldown ? minCooldown : configCooldown
        updates.cooldown_until = cooldownEnd.toISOString()
      }

      await db.from('vendor_call_limits').update(updates).eq('id', existing.id)
    }
  } catch (err) {
    console.error('[rate-limiter] recordCallOutcome failed:', err)
  }
}

// ---------------------------------------------------------------------------
// blockVendor
// ---------------------------------------------------------------------------

export async function blockVendor(vendorPhone: string, reason: string): Promise<void> {
  const chef = await requireChef()
  const db: any = createServerClient()

  try {
    const now = new Date().toISOString()

    const { data: existing } = await db
      .from('vendor_call_limits')
      .select('id')
      .eq('chef_id', chef.entityId)
      .eq('vendor_phone', vendorPhone)
      .maybeSingle()

    if (existing) {
      await db
        .from('vendor_call_limits')
        .update({
          is_blocked: true,
          blocked_reason: reason,
          blocked_at: now,
        })
        .eq('id', existing.id)
    } else {
      await db.from('vendor_call_limits').insert({
        chef_id: chef.entityId,
        vendor_phone: vendorPhone,
        vendor_name: null,
        calls_today: 0,
        calls_this_week: 0,
        last_called_at: null,
        consecutive_no_answers: 0,
        is_blocked: true,
        blocked_reason: reason,
        blocked_at: now,
      })
    }
  } catch (err) {
    console.error('[rate-limiter] blockVendor failed:', err)
  }
}

// ---------------------------------------------------------------------------
// unblockVendor
// ---------------------------------------------------------------------------

export async function unblockVendor(vendorPhone: string): Promise<void> {
  const chef = await requireChef()
  const db: any = createServerClient()

  try {
    await db
      .from('vendor_call_limits')
      .update({
        is_blocked: false,
        blocked_reason: null,
        blocked_at: null,
        cooldown_until: null,
        consecutive_no_answers: 0,
      })
      .eq('chef_id', chef.entityId)
      .eq('vendor_phone', vendorPhone)
  } catch (err) {
    console.error('[rate-limiter] unblockVendor failed:', err)
  }
}

// ---------------------------------------------------------------------------
// getBlockedVendors
// ---------------------------------------------------------------------------

export async function getBlockedVendors(): Promise<
  Array<{
    vendor_phone: string
    vendor_name: string | null
    blocked_reason: string | null
    blocked_at: string | null
  }>
> {
  const chef = await requireChef()
  const db: any = createServerClient()

  try {
    const { data } = await db
      .from('vendor_call_limits')
      .select('vendor_phone, vendor_name, blocked_reason, blocked_at')
      .eq('chef_id', chef.entityId)
      .eq('is_blocked', true)
      .order('blocked_at', { ascending: false })

    return data ?? []
  } catch (err) {
    console.error('[rate-limiter] getBlockedVendors failed:', err)
    return []
  }
}

// ---------------------------------------------------------------------------
// resetDailyCounters (called by cron at midnight)
// ---------------------------------------------------------------------------

export async function resetDailyCounters(): Promise<void> {
  const chef = await requireChef()
  const db: any = createServerClient()

  try {
    await db.from('vendor_call_limits').update({ calls_today: 0 }).eq('chef_id', chef.entityId)
  } catch (err) {
    console.error('[rate-limiter] resetDailyCounters failed:', err)
  }
}

// ---------------------------------------------------------------------------
// resetWeeklyCounters (called by cron on Monday midnight)
// ---------------------------------------------------------------------------

export async function resetWeeklyCounters(): Promise<void> {
  const chef = await requireChef()
  const db: any = createServerClient()

  try {
    await db.from('vendor_call_limits').update({ calls_this_week: 0 }).eq('chef_id', chef.entityId)
  } catch (err) {
    console.error('[rate-limiter] resetWeeklyCounters failed:', err)
  }
}

// ---------------------------------------------------------------------------
// checkBatchEligibility
// ---------------------------------------------------------------------------

export async function checkBatchEligibility(
  phones: string[]
): Promise<Record<string, VendorCallEligibility>> {
  const chef = await requireChef()
  const db: any = createServerClient()
  const results: Record<string, VendorCallEligibility> = {}

  try {
    const config = await getRateLimitConfig()

    const { data } = await db
      .from('vendor_call_limits')
      .select('*')
      .eq('chef_id', chef.entityId)
      .in('vendor_phone', phones)

    const recordMap = new Map<string, any>()
    if (data) {
      for (const row of data) {
        recordMap.set(row.vendor_phone, row)
      }
    }

    for (const phone of phones) {
      const record = recordMap.get(phone)

      if (!record) {
        results[phone] = {
          eligible: true,
          callsToday: 0,
          callsThisWeek: 0,
          consecutiveNoAnswers: 0,
          isBlocked: false,
        }
        continue
      }

      if (record.is_blocked) {
        results[phone] = {
          eligible: false,
          reason: `Vendor is blocked: ${record.blocked_reason || 'no reason provided'}`,
          callsToday: record.calls_today ?? 0,
          callsThisWeek: record.calls_this_week ?? 0,
          consecutiveNoAnswers: record.consecutive_no_answers ?? 0,
          isBlocked: true,
        }
        continue
      }

      if (record.cooldown_until) {
        const cooldownEnd = new Date(record.cooldown_until)
        if (cooldownEnd > new Date()) {
          results[phone] = {
            eligible: false,
            reason: `Vendor is in cooldown until ${cooldownEnd.toISOString()}`,
            cooldownUntil: cooldownEnd.toISOString(),
            callsToday: record.calls_today ?? 0,
            callsThisWeek: record.calls_this_week ?? 0,
            consecutiveNoAnswers: record.consecutive_no_answers ?? 0,
            isBlocked: false,
          }
          continue
        }
      }

      if ((record.calls_today ?? 0) >= config.maxCallsPerVendorPerDay) {
        results[phone] = {
          eligible: false,
          reason: `Daily call limit reached (${config.maxCallsPerVendorPerDay}/day)`,
          callsToday: record.calls_today ?? 0,
          callsThisWeek: record.calls_this_week ?? 0,
          consecutiveNoAnswers: record.consecutive_no_answers ?? 0,
          isBlocked: false,
        }
        continue
      }

      if ((record.calls_this_week ?? 0) >= config.maxCallsPerVendorPerWeek) {
        results[phone] = {
          eligible: false,
          reason: `Weekly call limit reached (${config.maxCallsPerVendorPerWeek}/week)`,
          callsToday: record.calls_today ?? 0,
          callsThisWeek: record.calls_this_week ?? 0,
          consecutiveNoAnswers: record.consecutive_no_answers ?? 0,
          isBlocked: false,
        }
        continue
      }

      if ((record.consecutive_no_answers ?? 0) >= 5) {
        results[phone] = {
          eligible: false,
          reason: `Too many consecutive no-answers (${record.consecutive_no_answers}). Vendor may not want calls.`,
          callsToday: record.calls_today ?? 0,
          callsThisWeek: record.calls_this_week ?? 0,
          consecutiveNoAnswers: record.consecutive_no_answers ?? 0,
          isBlocked: false,
        }
        continue
      }

      results[phone] = {
        eligible: true,
        callsToday: record.calls_today ?? 0,
        callsThisWeek: record.calls_this_week ?? 0,
        consecutiveNoAnswers: record.consecutive_no_answers ?? 0,
        isBlocked: false,
      }
    }
  } catch (err) {
    console.error('[rate-limiter] checkBatchEligibility failed, blocking all (fail-safe):', err)
    // Fail-safe: block all phones on error
    for (const phone of phones) {
      if (!results[phone]) {
        results[phone] = {
          eligible: false,
          reason: 'Rate limiter error, call blocked for safety',
          callsToday: 0,
          callsThisWeek: 0,
          consecutiveNoAnswers: 0,
          isBlocked: false,
        }
      }
    }
  }

  return results
}
