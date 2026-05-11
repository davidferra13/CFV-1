'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'

/**
 * Anti-Spam Call Validator
 *
 * Validates call timing, velocity, and business hours before any call is placed.
 * This is the gatekeeper - if this says no, no call happens.
 */

// Default business hours by vendor type
const VENDOR_TYPE_HOURS: Record<string, { start: number; end: number }> = {
  grocery: { start: 8, end: 21 }, // 8am-9pm
  fish_market: { start: 6, end: 14 }, // 6am-2pm
  farm: { start: 7, end: 17 }, // 7am-5pm
  butcher: { start: 7, end: 18 }, // 7am-6pm
  specialty: { start: 9, end: 18 }, // 9am-6pm
  restaurant_supply: { start: 8, end: 17 }, // 8am-5pm
  default: { start: 8, end: 20 }, // 8am-8pm
}

interface SpamCheckResult {
  allowed: boolean
  reason?: string
  suggestedCallTime?: string
}

interface VelocityCheck {
  allowed: boolean
  reason?: string
  callsInLastMinute: number
  callsInLastHour: number
  waitSeconds?: number
}

/**
 * Check if current time is within business hours for a vendor type.
 */
export async function isWithinBusinessHours(
  vendorType?: string,
  timezone?: string
): SpamCheckResult {
  try {
    const tz = timezone || 'America/New_York'
    const now = new Date()
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: tz,
      hour: 'numeric',
      hour12: false,
    })
    const currentHour = parseInt(formatter.format(now), 10)

    const hours = VENDOR_TYPE_HOURS[vendorType || 'default'] || VENDOR_TYPE_HOURS.default

    if (currentHour >= hours.start && currentHour < hours.end) {
      return { allowed: true }
    }

    const suggestedTime =
      currentHour < hours.start ? `${hours.start}:00 AM` : `${hours.start}:00 AM tomorrow`

    return {
      allowed: false,
      reason: `Outside business hours for ${vendorType || 'this vendor type'} (${hours.start}:00-${hours.end}:00)`,
      suggestedCallTime: `Try after ${suggestedTime}`,
    }
  } catch (err) {
    console.error('[anti-spam] isWithinBusinessHours error:', err)
    // Fail open during business hours check errors (conservative: 8am-8pm)
    return { allowed: true }
  }
}

/**
 * Check call velocity (rate limiting per chef).
 * Blocks if > 5 calls in last minute or > 30 in last hour.
 */
export async function checkCallVelocity(): Promise<VelocityCheck> {
  try {
    const chef = await requireChef()
    const db: any = createServerClient()

    const oneMinuteAgo = new Date(Date.now() - 60_000).toISOString()
    const oneHourAgo = new Date(Date.now() - 3_600_000).toISOString()

    const [minuteResult] = await db.query(
      `SELECT COUNT(*) as count FROM ai_calls
       WHERE chef_id = $1 AND direction = 'outbound' AND created_at > $2`,
      [chef.id, oneMinuteAgo]
    )
    const callsInLastMinute = parseInt(minuteResult?.count || '0', 10)

    const [hourResult] = await db.query(
      `SELECT COUNT(*) as count FROM ai_calls
       WHERE chef_id = $1 AND direction = 'outbound' AND created_at > $2`,
      [chef.id, oneHourAgo]
    )
    const callsInLastHour = parseInt(hourResult?.count || '0', 10)

    const velocityMax = 5
    const hourlyMax = 30

    if (callsInLastMinute >= velocityMax) {
      const waitSeconds = 60
      return {
        allowed: false,
        reason: `Rate limit: ${callsInLastMinute} calls in last minute (max ${velocityMax})`,
        callsInLastMinute,
        callsInLastHour,
        waitSeconds,
      }
    }

    if (callsInLastHour >= hourlyMax) {
      return {
        allowed: false,
        reason: `Hourly limit: ${callsInLastHour} calls in last hour (max ${hourlyMax})`,
        callsInLastMinute,
        callsInLastHour,
        waitSeconds: 600,
      }
    }

    return { allowed: true, callsInLastMinute, callsInLastHour }
  } catch (err) {
    console.error('[anti-spam] checkCallVelocity error:', err)
    return {
      allowed: false,
      reason: 'Velocity check failed',
      callsInLastMinute: 0,
      callsInLastHour: 0,
    }
  }
}

/**
 * Check if chef has exceeded their daily call budget.
 */
export async function checkDailyBudget(): Promise<{
  allowed: boolean
  callsToday: number
  dailyLimit: number
  remaining: number
}> {
  try {
    const chef = await requireChef()
    const db: any = createServerClient()

    const todayStart = new Date()
    todayStart.setHours(0, 0, 0, 0)

    const [countResult] = await db.query(
      `SELECT COUNT(*) as count FROM ai_calls
       WHERE chef_id = $1 AND direction = 'outbound' AND created_at > $2`,
      [chef.id, todayStart.toISOString()]
    )
    const callsToday = parseInt(countResult?.count || '0', 10)

    // Check for custom daily limit in routing rules
    const [ruleResult] = await db.query(
      `SELECT daily_call_limit FROM ai_call_routing_rules
       WHERE chef_id = $1 AND active = true LIMIT 1`,
      [chef.id]
    )
    const dailyLimit = ruleResult?.daily_call_limit || 20

    const remaining = Math.max(0, dailyLimit - callsToday)

    return {
      allowed: callsToday < dailyLimit,
      callsToday,
      dailyLimit,
      remaining,
    }
  } catch (err) {
    console.error('[anti-spam] checkDailyBudget error:', err)
    return { allowed: false, callsToday: 0, dailyLimit: 20, remaining: 0 }
  }
}

/**
 * Master validation: checks business hours, velocity, and daily budget.
 * Returns first failure reason. Call this before every outbound call.
 */
export async function validateCallRequest(
  vendorPhone: string,
  vendorType?: string
): Promise<SpamCheckResult> {
  try {
    await requireChef()

    if (!vendorPhone || vendorPhone.trim().length === 0) {
      return { allowed: false, reason: 'No phone number provided' }
    }

    // 1. Business hours check
    const hoursCheck = isWithinBusinessHours(vendorType)
    if (!hoursCheck.allowed) {
      return hoursCheck
    }

    // 2. Velocity check
    const velocityCheck = await checkCallVelocity()
    if (!velocityCheck.allowed) {
      return {
        allowed: false,
        reason: velocityCheck.reason,
      }
    }

    // 3. Daily budget check
    const budgetCheck = await checkDailyBudget()
    if (!budgetCheck.allowed) {
      return {
        allowed: false,
        reason: `Daily call limit reached (${budgetCheck.callsToday}/${budgetCheck.dailyLimit}). Resets at midnight.`,
      }
    }

    return { allowed: true }
  } catch (err) {
    console.error('[anti-spam] validateCallRequest error:', err)
    return { allowed: false, reason: 'Validation failed unexpectedly' }
  }
}

/**
 * Returns human-readable call window for a vendor type.
 */
export async function getCallWindowForVendorType(
  vendorType: string,
  timezone?: string
): { opensAt: string; closesAt: string; isOpen: boolean } {
  try {
    const hours = VENDOR_TYPE_HOURS[vendorType] || VENDOR_TYPE_HOURS.default
    const tz = timezone || 'America/New_York'

    const now = new Date()
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: tz,
      hour: 'numeric',
      hour12: false,
    })
    const currentHour = parseInt(formatter.format(now), 10)
    const isOpen = currentHour >= hours.start && currentHour < hours.end

    const formatHour = (h: number) => {
      const period = h >= 12 ? 'PM' : 'AM'
      const display = h > 12 ? h - 12 : h === 0 ? 12 : h
      return `${display}:00 ${period}`
    }

    return {
      opensAt: formatHour(hours.start),
      closesAt: formatHour(hours.end),
      isOpen,
    }
  } catch (err) {
    console.error('[anti-spam] getCallWindowForVendorType error:', err)
    return { opensAt: '8:00 AM', closesAt: '8:00 PM', isOpen: true }
  }
}
