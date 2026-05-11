'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'

/**
 * Call Cost Tracker
 *
 * Tracks Twilio costs per call and aggregates per session and monthly.
 * Makes cost visible to the chef so they're never surprised by a bill.
 */

// Twilio pricing (approximate, USD cents)
const TWILIO_RATES = {
  outbound_per_minute: 2.2, // $0.022/min
  inbound_per_minute: 1.5, // $0.015/min
  recording_per_minute: 0.5, // $0.005/min
  transcription_per_minute: 5, // $0.05/min (speech-to-text)
  base_call_fee: 0, // no per-call fee for standard
}

/**
 * Estimate cost in cents for a sourcing session before it starts.
 * Assumes each call is outbound with optional recording.
 */
export async function estimateSessionCost(
  candidateCount: number,
  avgCallDurationSeconds?: number
): Promise<number> {
  const avgSeconds = avgCallDurationSeconds || 30
  const avgMinutes = avgSeconds / 60

  const costPerCall =
    TWILIO_RATES.base_call_fee +
    TWILIO_RATES.outbound_per_minute * avgMinutes +
    TWILIO_RATES.recording_per_minute * avgMinutes

  return Math.ceil(costPerCall * candidateCount)
}

/**
 * Record the cost of a completed call.
 * Inserts into call_cost_log and updates the sourcing session if provided.
 */
export async function recordCallCost(params: {
  sessionId?: string
  aiCallId?: string
  callSid?: string
  direction: 'outbound' | 'inbound'
  durationSeconds: number
}): Promise<void> {
  try {
    const chef = await requireChef()
    const db: any = createServerClient()

    const minutes = params.durationSeconds / 60
    const ratePerMinute =
      params.direction === 'outbound'
        ? TWILIO_RATES.outbound_per_minute
        : TWILIO_RATES.inbound_per_minute

    const callCostCents = Math.ceil(
      TWILIO_RATES.base_call_fee +
        ratePerMinute * minutes +
        TWILIO_RATES.recording_per_minute * minutes
    )

    await db.query(
      `INSERT INTO call_cost_log (chef_id, session_id, ai_call_id, call_sid, direction, duration_seconds, cost_cents, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())`,
      [
        chef.id,
        params.sessionId || null,
        params.aiCallId || null,
        params.callSid || null,
        params.direction,
        params.durationSeconds,
        callCostCents,
      ]
    )

    // Update session total if session provided
    if (params.sessionId) {
      await db.query(
        `UPDATE sourcing_sessions
         SET actual_cost_cents = COALESCE(actual_cost_cents, 0) + $1
         WHERE id = $2 AND chef_id = $3`,
        [callCostCents, params.sessionId, chef.id]
      )
    }
  } catch (err) {
    console.error('[cost-tracker] recordCallCost error:', err)
  }
}

/**
 * Get aggregated cost for a sourcing session.
 */
export async function getSessionCost(sessionId: string): Promise<{
  totalCents: number
  callCount: number
  avgCostPerCall: number
}> {
  try {
    const chef = await requireChef()
    const db: any = createServerClient()

    const [result] = await db.query(
      `SELECT COALESCE(SUM(cost_cents), 0) as total, COUNT(*) as count
       FROM call_cost_log
       WHERE session_id = $1 AND chef_id = $2`,
      [sessionId, chef.id]
    )

    const totalCents = parseInt(result?.total || '0', 10)
    const callCount = parseInt(result?.count || '0', 10)

    return {
      totalCents,
      callCount,
      avgCostPerCall: callCount > 0 ? Math.round(totalCents / callCount) : 0,
    }
  } catch (err) {
    console.error('[cost-tracker] getSessionCost error:', err)
    return { totalCents: 0, callCount: 0, avgCostPerCall: 0 }
  }
}

/**
 * Get monthly cost breakdown. Defaults to current month.
 */
export async function getMonthlyCost(month?: string): Promise<{
  totalCents: number
  callCount: number
  totalMinutes: number
  dailyBreakdown: Array<{ date: string; cents: number; calls: number }>
}> {
  try {
    const chef = await requireChef()
    const db: any = createServerClient()

    // Parse month or default to current
    let startDate: string
    let endDate: string

    if (month) {
      // Expect "YYYY-MM" format
      startDate = `${month}-01`
      const [year, mon] = month.split('-').map(Number)
      const lastDay = new Date(year, mon, 0).getDate()
      endDate = `${month}-${lastDay}`
    } else {
      const now = new Date()
      const year = now.getFullYear()
      const mon = String(now.getMonth() + 1).padStart(2, '0')
      startDate = `${year}-${mon}-01`
      const lastDay = new Date(year, now.getMonth() + 1, 0).getDate()
      endDate = `${year}-${mon}-${lastDay}`
    }

    // Totals
    const [totals] = await db.query(
      `SELECT COALESCE(SUM(cost_cents), 0) as total_cents,
              COUNT(*) as call_count,
              COALESCE(SUM(duration_seconds), 0) as total_seconds
       FROM call_cost_log
       WHERE chef_id = $1 AND created_at >= $2 AND created_at < $3::date + interval '1 day'`,
      [chef.id, startDate, endDate]
    )

    // Daily breakdown
    const dailyRows = await db.query(
      `SELECT DATE(created_at) as date,
              COALESCE(SUM(cost_cents), 0) as cents,
              COUNT(*) as calls
       FROM call_cost_log
       WHERE chef_id = $1 AND created_at >= $2 AND created_at < $3::date + interval '1 day'
       GROUP BY DATE(created_at)
       ORDER BY date`,
      [chef.id, startDate, endDate]
    )

    const totalSeconds = parseInt(totals?.total_seconds || '0', 10)

    return {
      totalCents: parseInt(totals?.total_cents || '0', 10),
      callCount: parseInt(totals?.call_count || '0', 10),
      totalMinutes: Math.round(totalSeconds / 60),
      dailyBreakdown: (dailyRows || []).map((row: any) => ({
        date: row.date,
        cents: parseInt(row.cents, 10),
        calls: parseInt(row.calls, 10),
      })),
    }
  } catch (err) {
    console.error('[cost-tracker] getMonthlyCost error:', err)
    return { totalCents: 0, callCount: 0, totalMinutes: 0, dailyBreakdown: [] }
  }
}

/**
 * Get today's cost so far.
 */
export async function getDailyCost(): Promise<{
  totalCents: number
  callCount: number
}> {
  try {
    const chef = await requireChef()
    const db: any = createServerClient()

    const todayStart = new Date()
    todayStart.setHours(0, 0, 0, 0)

    const [result] = await db.query(
      `SELECT COALESCE(SUM(cost_cents), 0) as total, COUNT(*) as count
       FROM call_cost_log
       WHERE chef_id = $1 AND created_at > $2`,
      [chef.id, todayStart.toISOString()]
    )

    return {
      totalCents: parseInt(result?.total || '0', 10),
      callCount: parseInt(result?.count || '0', 10),
    }
  } catch (err) {
    console.error('[cost-tracker] getDailyCost error:', err)
    return { totalCents: 0, callCount: 0 }
  }
}

/**
 * Check if monthly cost exceeds the alert threshold from routing rules.
 */
export async function checkCostAlert(): Promise<{
  exceeded: boolean
  currentCents: number
  thresholdCents: number
}> {
  try {
    const chef = await requireChef()
    const db: any = createServerClient()

    // Get threshold from routing rules (default $10 = 1000 cents)
    const [ruleResult] = await db.query(
      `SELECT monthly_cost_alert_cents FROM ai_call_routing_rules
       WHERE chef_id = $1 AND active = true LIMIT 1`,
      [chef.id]
    )
    const thresholdCents = ruleResult?.monthly_cost_alert_cents || 1000

    // Get current month total
    const monthly = await getMonthlyCost()

    return {
      exceeded: monthly.totalCents >= thresholdCents,
      currentCents: monthly.totalCents,
      thresholdCents,
    }
  } catch (err) {
    console.error('[cost-tracker] checkCostAlert error:', err)
    return { exceeded: false, currentCents: 0, thresholdCents: 1000 }
  }
}
