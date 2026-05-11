'use server'

/**
 * Batch Caller - Cross-Ingredient Batching System
 *
 * Groups multiple ingredient queries by vendor, so each vendor receives one call
 * covering all relevant ingredients. Reduces call volume and respects vendor time.
 *
 * Example: if "haddock", "lobster", and "oysters" all have Vendor X in their call
 * queues, Vendor X gets a single call asking about all three items sequentially.
 *
 * GATED: requires the `supplier_calling` feature flag (same gate as single calls).
 */

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { broadcast } from '@/lib/realtime/broadcast'
import { getVendorCallQueue } from '@/lib/vendors/sourcing-actions'
import { normalizePhone, isValidE164 } from '@/lib/calling/phone-utils'
import { generateBatchAvailabilityScript } from '@/lib/calling/batch-voice-scripts'
import { setBatchState } from '@/lib/calling/batch-state'

const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN
const TWILIO_PHONE_NUMBER = process.env.TWILIO_PHONE_NUMBER
const APP_URL = (process.env.NEXTAUTH_URL || 'https://app.cheflowhq.com').replace(/\/+$/, '')

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface BatchCallPlan {
  vendorPhone: string
  vendorName: string
  vendorId: string
  contactName: string | null
  ingredients: string[]
  source: 'saved' | 'national'
}

export type BatchCallResult = {
  vendor: string
  callId: string
  status: string
  error?: string
}

// ---------------------------------------------------------------------------
// Gate check (mirrors twilio-actions.ts)
// ---------------------------------------------------------------------------

async function requireCallingEnabled(chefId: string): Promise<void> {
  const db: any = createServerClient()
  const { data } = await db
    .from('chef_feature_flags')
    .select('enabled')
    .eq('chef_id', chefId)
    .eq('flag_name', 'supplier_calling')
    .maybeSingle()

  if (!data?.enabled) {
    throw new Error('Supplier calling is not enabled for your account.')
  }
}

// ---------------------------------------------------------------------------
// Eligibility check (mirrors twilio-actions.ts)
// ---------------------------------------------------------------------------

async function checkCallingEligibility(
  db: any,
  chefId: string,
  defaultLimit = 20
): Promise<{ allowed: boolean; reason?: string; limit: number }> {
  let routingRule: Record<string, any> | null = null
  try {
    const { data } = await db
      .from('ai_call_routing_rules')
      .select('daily_call_limit, active_hours_start, active_hours_end, active_timezone')
      .eq('chef_id', chefId)
      .maybeSingle()
    routingRule = data
  } catch (err) {
    console.error('[batch-caller/eligibility] routing rules query failed:', err)
    return {
      allowed: false,
      reason: 'Calling unavailable due to a system error. Please try again.',
      limit: defaultLimit,
    }
  }

  const limit: number = routingRule?.daily_call_limit ?? defaultLimit
  const tz: string = routingRule?.active_timezone || 'America/New_York'
  const hoursStart: string = routingRule?.active_hours_start || '08:00'
  const hoursEnd: string = routingRule?.active_hours_end || '20:00'

  const [startH, startM] = hoursStart.split(':').map(Number)
  const [endH, endM] = hoursEnd.split(':').map(Number)
  const nowInTz = new Date(new Date().toLocaleString('en-US', { timeZone: tz }))
  const currentMinutes = nowInTz.getHours() * 60 + nowInTz.getMinutes()
  const startMinutes = startH * 60 + startM
  const endMinutes = endH * 60 + endM

  if (currentMinutes < startMinutes || currentMinutes >= endMinutes) {
    return {
      allowed: false,
      reason: `Calls are only placed between ${hoursStart} and ${hoursEnd} (${tz}). Try again during active hours.`,
      limit,
    }
  }

  const nowTzMidnight = new Date(new Date().toLocaleString('en-US', { timeZone: tz }))
  nowTzMidnight.setHours(0, 0, 0, 0)
  const utcOffset =
    new Date().getTime() - new Date(new Date().toLocaleString('en-US', { timeZone: tz })).getTime()
  const todayStart = new Date(nowTzMidnight.getTime() + utcOffset)

  let count: number | null = null
  try {
    const result = await db
      .from('ai_calls')
      .select('*', { count: 'exact', head: true })
      .eq('chef_id', chefId)
      .eq('direction', 'outbound')
      .gte('created_at', todayStart.toISOString())
    count = result.count
  } catch (err) {
    console.error('[batch-caller/eligibility] daily call count query failed:', err)
    return {
      allowed: false,
      reason: 'Calling unavailable due to a system error. Please try again.',
      limit,
    }
  }

  if ((count ?? 0) >= limit) {
    return {
      allowed: false,
      reason: `Daily call limit reached (${limit} calls/day). Resets at midnight.`,
      limit,
    }
  }

  return { allowed: true, limit }
}

// ---------------------------------------------------------------------------
// Twilio call placement (mirrors twilio-actions.ts placeTwilioCall)
// ---------------------------------------------------------------------------

async function placeTwilioCall(params: {
  to: string
  twiml: string
  statusCallbackUrl: string
  recordingCallbackUrl: string
}): Promise<{ sid: string } | { twErr: number; twMsg: string } | null> {
  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_PHONE_NUMBER) return null

  const body = new URLSearchParams({
    To: params.to,
    From: TWILIO_PHONE_NUMBER,
    Twiml: params.twiml,
    StatusCallback: params.statusCallbackUrl,
    StatusCallbackMethod: 'POST',
    StatusCallbackEvent: 'completed initiated ringing',
    Record: 'true',
    RecordingStatusCallback: params.recordingCallbackUrl,
    RecordingStatusCallbackMethod: 'POST',
  })

  const res = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Calls.json`,
    {
      method: 'POST',
      headers: {
        Authorization:
          'Basic ' + Buffer.from(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`).toString('base64'),
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: body.toString(),
    }
  )

  if (!res.ok) {
    try {
      const errJson = await res.json()
      console.error('[batch-caller] Twilio error:', errJson.code, errJson.message)
      return { twErr: errJson.code ?? 0, twMsg: errJson.message ?? 'Twilio API error' }
    } catch {
      console.error('[batch-caller] Twilio API error: unparseable response')
      return { twErr: 0, twMsg: 'Twilio API error' }
    }
  }

  return res.json()
}

// ---------------------------------------------------------------------------
// createBatchCallPlan
// ---------------------------------------------------------------------------

/**
 * Given multiple ingredient names, queries the vendor call queue for each and
 * groups by vendor phone number. If a vendor sells haddock AND lobster, they
 * appear once with both ingredients in a single plan entry.
 *
 * Plans are sorted: most ingredients first (maximize value per call), then by
 * aggregate vendor relevance score.
 */
export async function createBatchCallPlan(ingredientNames: string[]): Promise<BatchCallPlan[]> {
  if (!ingredientNames.length) return []

  // Deduplicate and trim ingredient names
  const uniqueIngredients = Array.from(
    new Set(ingredientNames.map((n) => n.trim()).filter(Boolean))
  )
  if (!uniqueIngredients.length) return []

  // Fetch vendor queues for all ingredients in parallel
  const vendorQueues = await Promise.all(
    uniqueIngredients.map(async (name) => {
      try {
        const candidates = await getVendorCallQueue(name)
        return { ingredient: name, candidates }
      } catch (err) {
        console.error(`[batch-caller] getVendorCallQueue failed for "${name}":`, err)
        return { ingredient: name, candidates: [] }
      }
    })
  )

  // Group by vendor phone number (normalized digits for dedup)
  const vendorMap = new Map<
    string,
    {
      phone: string
      name: string
      id: string
      contactName: string | null
      source: 'saved' | 'national'
      ingredients: Set<string>
      totalRelevance: number
    }
  >()

  for (const { ingredient, candidates } of vendorQueues) {
    for (const candidate of candidates) {
      const phoneDigits = candidate.phone.replace(/\D/g, '')
      const existing = vendorMap.get(phoneDigits)
      if (existing) {
        existing.ingredients.add(ingredient)
        existing.totalRelevance += candidate.relevance_score
      } else {
        vendorMap.set(phoneDigits, {
          phone: candidate.phone,
          name: candidate.name,
          id: candidate.id,
          contactName: candidate.contact_name,
          source: candidate.source,
          ingredients: new Set([ingredient]),
          totalRelevance: candidate.relevance_score,
        })
      }
    }
  }

  // Convert to BatchCallPlan array
  const plans: BatchCallPlan[] = []
  for (const entry of Array.from(vendorMap.values())) {
    plans.push({
      vendorPhone: entry.phone,
      vendorName: entry.name,
      vendorId: entry.id,
      contactName: entry.contactName,
      ingredients: Array.from(entry.ingredients),
      source: entry.source,
    })
  }

  // Sort: most ingredients first, then by aggregate relevance score descending
  plans.sort((a, b) => {
    if (b.ingredients.length !== a.ingredients.length) {
      return b.ingredients.length - a.ingredients.length
    }
    const aEntry = Array.from(vendorMap.values()).find((v) => v.id === a.vendorId)
    const bEntry = Array.from(vendorMap.values()).find((v) => v.id === b.vendorId)
    return (bEntry?.totalRelevance ?? 0) - (aEntry?.totalRelevance ?? 0)
  })

  return plans
}

// ---------------------------------------------------------------------------
// executeBatchCall
// ---------------------------------------------------------------------------

/**
 * Execute a single batch call plan: call one vendor about all their ingredients.
 * Creates supplier_calls records for each ingredient and an ai_calls record for
 * the overall call. Stores batch state so the gather route can iterate through
 * ingredients.
 */
export async function executeBatchCall(plan: BatchCallPlan): Promise<{
  callId: string
  status: 'initiated' | 'failed'
  error?: string
}> {
  const user = await requireChef()
  await requireCallingEnabled(user.tenantId!)

  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_PHONE_NUMBER) {
    return {
      callId: '',
      status: 'failed',
      error: 'Calling is not configured. Contact the platform admin.',
    }
  }

  const db: any = createServerClient()

  const eligibility = await checkCallingEligibility(db, user.tenantId!)
  if (!eligibility.allowed) {
    return { callId: '', status: 'failed', error: eligibility.reason }
  }

  const vendorPhoneNormalized = normalizePhone(plan.vendorPhone)
  if (!isValidE164(vendorPhoneNormalized)) {
    return { callId: '', status: 'failed', error: 'Vendor phone number is not a valid format.' }
  }

  // Get chef business name for the script
  const { data: chef } = await db
    .from('chefs')
    .select('business_name')
    .eq('id', user.tenantId!)
    .single()

  const businessName = chef?.business_name || 'a private chef'

  // Create supplier_calls records for each ingredient in the batch
  const supplierCallIds: string[] = []
  for (const ingredient of plan.ingredients) {
    try {
      const { data: callRecord } = await db
        .from('supplier_calls')
        .insert({
          chef_id: user.tenantId!,
          vendor_id: plan.source === 'saved' ? plan.vendorId : null,
          vendor_name: plan.vendorName,
          vendor_phone: vendorPhoneNormalized,
          ingredient_name: ingredient.trim(),
          status: 'queued',
        })
        .select('id')
        .single()
      if (callRecord) supplierCallIds.push(callRecord.id)
    } catch (err) {
      console.error(`[batch-caller] supplier_calls insert failed for "${ingredient}":`, err)
    }
  }

  if (supplierCallIds.length === 0) {
    return { callId: '', status: 'failed', error: 'Failed to create call records.' }
  }

  // Create a single ai_calls record for the batch call
  const { data: aiCallRecord, error: aiCallError } = await db
    .from('ai_calls')
    .insert({
      chef_id: user.tenantId!,
      direction: 'outbound',
      role: 'vendor_availability',
      contact_phone: vendorPhoneNormalized,
      contact_name: plan.vendorName,
      contact_type: 'vendor',
      vendor_id: plan.source === 'saved' ? plan.vendorId : null,
      subject: `Batch: ${plan.ingredients.join(', ')}`,
      status: 'queued',
      supplier_call_id: supplierCallIds[0],
    })
    .select()
    .single()

  if (aiCallError || !aiCallRecord) {
    console.error('[batch-caller] ai_calls insert failed:', aiCallError)
  }

  const aiCallIdParam = aiCallRecord?.id ? `&aiCallId=${encodeURIComponent(aiCallRecord.id)}` : ''

  // Build batch-specific gather URL that includes batch mode flag
  const gatherUrl =
    `${APP_URL}/api/calling/gather?callId=${encodeURIComponent(supplierCallIds[0])}` +
    `&step=1&role=vendor_availability&batch=1${aiCallIdParam}`

  const statusCallbackUrl = `${APP_URL}/api/calling/status?callId=${encodeURIComponent(supplierCallIds[0])}${aiCallIdParam}`
  const recordingCallbackUrl = `${APP_URL}/api/calling/recording?callId=${encodeURIComponent(supplierCallIds[0])}${aiCallIdParam}`

  const twiml = generateBatchAvailabilityScript({
    vendorName: plan.vendorName,
    contactName: plan.contactName,
    ingredients: plan.ingredients,
    callbackUrl: statusCallbackUrl,
    gatherUrl: gatherUrl,
  })

  try {
    const twilioData = await placeTwilioCall({
      to: vendorPhoneNormalized,
      twiml,
      statusCallbackUrl,
      recordingCallbackUrl,
    })

    if (!twilioData || 'twErr' in twilioData) {
      const errMsg = twilioData && 'twErr' in twilioData ? twilioData.twMsg : 'Twilio API error'
      // Mark all supplier_calls as failed
      for (const scId of supplierCallIds) {
        await db
          .from('supplier_calls')
          .update({ status: 'failed', error_message: errMsg })
          .eq('id', scId)
          .catch((e: unknown) => console.error('[batch-caller] failed status update error:', e))
      }
      if (aiCallRecord) {
        await db
          .from('ai_calls')
          .update({ status: 'failed' })
          .eq('id', aiCallRecord.id)
          .catch((e: unknown) => console.error('[batch-caller] ai_calls failed update error:', e))
      }
      return {
        callId: supplierCallIds[0],
        status: 'failed',
        error: errMsg,
      }
    }

    // Store batch state so the gather route can iterate through ingredients
    setBatchState(twilioData.sid, {
      callId: supplierCallIds[0],
      vendorPhone: vendorPhoneNormalized,
      ingredients: plan.ingredients,
      currentIndex: 0,
      results: new Map(),
    })

    // Update all supplier_calls with call_sid and ringing status
    try {
      await Promise.all([
        ...supplierCallIds.map((scId) =>
          db
            .from('supplier_calls')
            .update({ call_sid: twilioData.sid, status: 'ringing' })
            .eq('id', scId)
        ),
        aiCallRecord
          ? db
              .from('ai_calls')
              .update({ call_sid: twilioData.sid, status: 'ringing' })
              .eq('id', aiCallRecord.id)
          : Promise.resolve(),
      ])
    } catch (err) {
      console.error('[batch-caller] post-Twilio DB update failed (call is ringing):', err)
    }

    // Broadcast call started
    try {
      await broadcast(`chef-${user.tenantId}`, 'supplier_call_started', {
        callId: supplierCallIds[0],
        aiCallId: aiCallRecord?.id,
        vendorName: plan.vendorName,
        ingredientName: plan.ingredients.join(', '),
        batch: true,
        batchSize: plan.ingredients.length,
      })
    } catch (err) {
      console.error('[batch-caller] broadcast failed:', err)
    }

    return { callId: supplierCallIds[0], status: 'initiated' }
  } catch (err) {
    console.error('[batch-caller] executeBatchCall error:', err)
    for (const scId of supplierCallIds) {
      await db
        .from('supplier_calls')
        .update({ status: 'failed', error_message: 'Network error' })
        .eq('id', scId)
        .catch((e: unknown) => console.error('[batch-caller] cleanup error:', e))
    }
    return { callId: supplierCallIds[0], status: 'failed', error: 'Unexpected error placing call.' }
  }
}

// ---------------------------------------------------------------------------
// executeBatchCallPlan
// ---------------------------------------------------------------------------

/**
 * Execute all batch call plans sequentially (one vendor at a time) respecting the
 * chef's concurrency settings. Twilio free/standard accounts only support one
 * concurrent outbound call, so we run them in series.
 */
export async function executeBatchCallPlan(plans: BatchCallPlan[]): Promise<BatchCallResult[]> {
  if (!plans.length) return []

  const results: BatchCallResult[] = []

  for (const plan of plans) {
    try {
      const result = await executeBatchCall(plan)
      results.push({
        vendor: plan.vendorName,
        callId: result.callId,
        status: result.status,
        error: result.error,
      })

      // If the call failed due to daily limit, stop placing more calls
      if (result.error?.includes('Daily call limit')) {
        // Mark remaining plans as skipped
        const remaining = plans.slice(plans.indexOf(plan) + 1)
        for (const skipped of remaining) {
          results.push({
            vendor: skipped.vendorName,
            callId: '',
            status: 'failed',
            error: 'Skipped: daily call limit reached.',
          })
        }
        break
      }
    } catch (err) {
      console.error(`[batch-caller] executeBatchCallPlan error for ${plan.vendorName}:`, err)
      results.push({
        vendor: plan.vendorName,
        callId: '',
        status: 'failed',
        error: 'Unexpected error.',
      })
    }
  }

  return results
}

// ---------------------------------------------------------------------------
// getBatchResults
// ---------------------------------------------------------------------------

/**
 * Retrieve batch call results grouped by ingredient. Looks up all supplier_calls
 * records for the given callIds and groups results by ingredient name.
 */
export async function getBatchResults(
  callIds: string[]
): Promise<Map<string, Array<{ vendor: string; result: string; price?: string }>>> {
  if (!callIds.length) return new Map()

  const user = await requireChef()
  const db: any = createServerClient()

  const { data: calls } = await db
    .from('supplier_calls')
    .select('id, vendor_name, ingredient_name, result, price_quoted, call_sid')
    .in('id', callIds)
    .eq('chef_id', user.tenantId!)

  if (!calls || !calls.length) return new Map()

  // Also look up sibling supplier_calls that share the same call_sid (batch calls
  // create multiple supplier_calls records per Twilio call)
  const callSids = Array.from(new Set(calls.map((c: any) => c.call_sid).filter(Boolean)))
  let siblingCalls: any[] = []
  if (callSids.length) {
    try {
      const { data } = await db
        .from('supplier_calls')
        .select('id, vendor_name, ingredient_name, result, price_quoted')
        .in('call_sid', callSids)
        .eq('chef_id', user.tenantId!)
      siblingCalls = data || []
    } catch (err) {
      console.error('[batch-caller] sibling calls lookup failed:', err)
    }
  }

  // Merge and deduplicate by id
  const allCalls = new Map<string, any>()
  for (const c of [...calls, ...siblingCalls]) {
    allCalls.set(c.id, c)
  }

  // Group by ingredient
  const grouped = new Map<string, Array<{ vendor: string; result: string; price?: string }>>()
  for (const call of Array.from(allCalls.values())) {
    const ingredient = call.ingredient_name
    if (!grouped.has(ingredient)) {
      grouped.set(ingredient, [])
    }
    grouped.get(ingredient)!.push({
      vendor: call.vendor_name,
      result: call.result ?? 'pending',
      price: call.price_quoted ?? undefined,
    })
  }

  return grouped
}
