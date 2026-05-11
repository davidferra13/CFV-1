'use server'

/**
 * Vendor Call Memory System
 *
 * Tracks per-vendor call outcomes and uses accumulated metrics to rank
 * vendors intelligently. Vendors who answer, give good prices, and respond
 * helpfully float to the top. Vendors with 5+ consecutive no-answers sink
 * to the bottom.
 *
 * Integrates with the existing sourcing queue (lib/vendors/sourcing-actions)
 * and overlays memory-based scoring on top of the type/relevance ranking.
 */

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { normalizePhone } from '@/lib/calling/phone-utils'
import { getVendorCallQueue } from '@/lib/vendors/sourcing-actions'
import {
  scoreVendor,
  computeBestCallWindow,
  shouldDeprioritize,
} from '@/lib/calling/vendor-routing'
import type { VendorCallMetric, SmartVendorCandidate } from '@/types/vendor-memory'

// ---------------------------------------------------------------------------
// Record a call outcome for a vendor
// ---------------------------------------------------------------------------

export async function recordCallOutcome(params: {
  vendorPhone: string
  vendorName: string
  outcome: 'answered' | 'voicemail' | 'no_answer' | 'failed'
  callTime?: string // HH:MM format
  pricePoint?: { ingredient: string; price: number; unit: string }
  responseQuality?: number // 0-10
}): Promise<void> {
  const user = await requireChef()
  const db: any = createServerClient()
  const chefId = user.tenantId!
  const phone = normalizePhone(params.vendorPhone)
  const now = new Date().toISOString()

  try {
    // Fetch existing metrics (or null for first call)
    const { data: existing } = await db
      .from('vendor_call_metrics')
      .select('*')
      .eq('chef_id', chefId)
      .eq('vendor_phone', phone)
      .maybeSingle()

    const metric: VendorCallMetric | null = existing

    // Compute updated counters
    const totalCalls = (metric?.total_calls ?? 0) + 1
    const answeredCalls = (metric?.answered_calls ?? 0) + (params.outcome === 'answered' ? 1 : 0)
    const voicemailCalls = (metric?.voicemail_calls ?? 0) + (params.outcome === 'voicemail' ? 1 : 0)
    const failedCalls = (metric?.failed_calls ?? 0) + (params.outcome === 'failed' ? 1 : 0)

    // Consecutive no-answers: reset on answer, increment on no_answer/voicemail/failed
    let consecutiveNoAnswers = metric?.consecutive_no_answers ?? 0
    if (params.outcome === 'answered') {
      consecutiveNoAnswers = 0
    } else {
      consecutiveNoAnswers += 1
    }

    // Rolling average for response quality (only update when a score is given)
    let avgQuality = metric?.avg_response_quality ?? 0
    if (params.responseQuality !== undefined && params.outcome === 'answered') {
      const prevAnswered = metric?.answered_calls ?? 0
      if (prevAnswered === 0) {
        avgQuality = params.responseQuality
      } else {
        // Incremental average: newAvg = oldAvg + (newVal - oldAvg) / newCount
        avgQuality = avgQuality + (params.responseQuality - avgQuality) / answeredCalls
      }
    }

    // Price competitiveness: updated externally or kept as-is
    const avgPrice = metric?.avg_price_competitiveness ?? 0

    // Answer time tracking
    const lastAnswerTime =
      params.outcome === 'answered' && params.callTime
        ? params.callTime
        : (metric?.last_answer_time ?? null)

    // Append price point if provided
    let pricePoints: Array<{ ingredient: string; price: number; unit: string; date: string }> =
      metric?.price_points ?? []
    if (params.pricePoint && params.outcome === 'answered') {
      pricePoints = [
        ...pricePoints,
        {
          ingredient: params.pricePoint.ingredient,
          price: params.pricePoint.price,
          unit: params.pricePoint.unit,
          date: now.split('T')[0],
        },
      ]
      // Keep only last 50 price points to avoid unbounded growth
      if (pricePoints.length > 50) {
        pricePoints = pricePoints.slice(pricePoints.length - 50)
      }
    }

    // Recompute best call window from all known answer times
    // We store the last_answer_time as raw HH:MM; for window computation we need
    // the full history. We approximate by collecting times from price_points dates
    // and the current call time. This is a heuristic; the window improves over time.
    let bestCallWindow = metric?.best_call_window ?? null
    if (params.callTime && params.outcome === 'answered') {
      // Gather all known answer times: existing last_answer_time + current
      const knownTimes: string[] = []
      if (metric?.last_answer_time) knownTimes.push(metric.last_answer_time)
      if (params.callTime) knownTimes.push(params.callTime)
      // If we have enough data points over time, recompute
      // For now, use a simple approach: store the window from what we have
      // plus pad with the existing best_call_window center if available
      if (knownTimes.length >= 3) {
        bestCallWindow = computeBestCallWindow(knownTimes) ?? bestCallWindow
      }
    }

    const lastCallAt = now
    const lastAnsweredAt = params.outcome === 'answered' ? now : (metric?.last_answered_at ?? null)

    const upsertPayload = {
      chef_id: chefId,
      vendor_phone: phone,
      vendor_name: params.vendorName,
      total_calls: totalCalls,
      answered_calls: answeredCalls,
      voicemail_calls: voicemailCalls,
      failed_calls: failedCalls,
      avg_response_quality: Math.round(avgQuality * 100) / 100,
      avg_price_competitiveness: avgPrice,
      last_answer_time: lastAnswerTime,
      best_call_window: bestCallWindow,
      consecutive_no_answers: consecutiveNoAnswers,
      last_call_at: lastCallAt,
      last_answered_at: lastAnsweredAt,
      price_points: JSON.stringify(pricePoints),
      updated_at: now,
    }

    const { error } = await db
      .from('vendor_call_metrics')
      .upsert(upsertPayload, { onConflict: 'chef_id,vendor_phone' })

    if (error) {
      console.error('[vendor-memory] recordCallOutcome upsert failed:', error)
    }
  } catch (err) {
    console.error('[vendor-memory] recordCallOutcome error:', err)
  }
}

// ---------------------------------------------------------------------------
// Get ranked vendors for an ingredient, factoring in call history
// ---------------------------------------------------------------------------

export async function getSmartVendorQueue(ingredientName: string): Promise<SmartVendorCandidate[]> {
  // 1. Get the base queue from existing sourcing logic
  const baseQueue = await getVendorCallQueue(ingredientName)
  if (baseQueue.length === 0) return []

  const user = await requireChef()
  const db: any = createServerClient()

  // 2. Fetch all vendor metrics for this chef in one query
  let metricsMap: Map<string, VendorCallMetric> = new Map()
  try {
    const { data } = await db.from('vendor_call_metrics').select('*').eq('chef_id', user.tenantId!)

    if (data) {
      for (const row of data) {
        metricsMap.set(row.vendor_phone, row as VendorCallMetric)
      }
    }
  } catch (err) {
    console.error(
      '[vendor-memory] getSmartVendorQueue metrics fetch failed; using base ranking:',
      err
    )
  }

  // 3. Current hour for call window matching
  const currentHour = new Date().getHours()

  // 4. Enhance each candidate with memory-based scoring
  const enhanced: SmartVendorCandidate[] = baseQueue.map((vendor) => {
    const normalizedPhone = normalizePhone(vendor.phone)
    const metrics = metricsMap.get(normalizedPhone) ?? null

    const memoryScore = scoreVendor(metrics, currentHour)
    const answerRate =
      metrics && metrics.total_calls > 0
        ? Math.round((metrics.answered_calls / metrics.total_calls) * 100) / 100
        : null
    const deprioritized = metrics ? shouldDeprioritize(metrics) : false

    return {
      ...vendor,
      memory_score: memoryScore,
      answer_rate: answerRate,
      best_call_window: metrics?.best_call_window ?? null,
      consecutive_no_answers: metrics?.consecutive_no_answers ?? 0,
      is_deprioritized: deprioritized,
    }
  })

  // 5. Sort: non-deprioritized first, then by combined score (relevance + memory)
  enhanced.sort((a, b) => {
    // Deprioritized vendors always go to the bottom
    if (a.is_deprioritized && !b.is_deprioritized) return 1
    if (!a.is_deprioritized && b.is_deprioritized) return -1

    // Combined score: original relevance_score (0-18 range) + memory_score (0-100 range)
    // Normalize relevance to roughly same scale by multiplying by 5
    const aTotal = a.relevance_score * 5 + a.memory_score
    const bTotal = b.relevance_score * 5 + b.memory_score

    if (bTotal !== aTotal) return bTotal - aTotal
    return a.name.localeCompare(b.name)
  })

  return enhanced
}

// ---------------------------------------------------------------------------
// Get metrics for a specific vendor
// ---------------------------------------------------------------------------

export async function getVendorMetrics(vendorPhone: string): Promise<VendorCallMetric | null> {
  const user = await requireChef()
  const db: any = createServerClient()
  const phone = normalizePhone(vendorPhone)

  try {
    const { data } = await db
      .from('vendor_call_metrics')
      .select('*')
      .eq('chef_id', user.tenantId!)
      .eq('vendor_phone', phone)
      .maybeSingle()

    return (data as VendorCallMetric) ?? null
  } catch (err) {
    console.error('[vendor-memory] getVendorMetrics error:', err)
    return null
  }
}

// ---------------------------------------------------------------------------
// Get all vendor metrics for the chef (dashboard display)
// ---------------------------------------------------------------------------

export async function getAllVendorMetrics(): Promise<VendorCallMetric[]> {
  const user = await requireChef()
  const db: any = createServerClient()

  try {
    const { data } = await db
      .from('vendor_call_metrics')
      .select('*')
      .eq('chef_id', user.tenantId!)
      .order('updated_at', { ascending: false })

    return (data as VendorCallMetric[]) ?? []
  } catch (err) {
    console.error('[vendor-memory] getAllVendorMetrics error:', err)
    return []
  }
}

// ---------------------------------------------------------------------------
// Get phone numbers of vendors with 5+ consecutive no-answers
// ---------------------------------------------------------------------------

export async function getDeprioritizedVendors(): Promise<string[]> {
  const user = await requireChef()
  const db: any = createServerClient()

  try {
    const { data } = await db
      .from('vendor_call_metrics')
      .select('vendor_phone')
      .eq('chef_id', user.tenantId!)
      .gte('consecutive_no_answers', 5)

    if (!data) return []
    return data.map((row: { vendor_phone: string }) => row.vendor_phone)
  } catch (err) {
    console.error('[vendor-memory] getDeprioritizedVendors error:', err)
    return []
  }
}
