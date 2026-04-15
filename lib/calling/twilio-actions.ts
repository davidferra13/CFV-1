'use server'

/**
 * AI Calling System - Twilio Integration
 *
 * Places outbound calls to vendors for availability checks, delivery coordination,
 * and venue/equipment confirmation. All calls use Polly.Matthew-Neural with SSML
 * for the most human-sounding AI voice possible.
 *
 * GATED: requires the `supplier_calling` feature flag to be enabled per chef.
 * Only the platform admin can enable this flag (Admin > Flags).
 *
 * HARD RULE: This system never calls clients. Clients receive email and SMS only.
 * Voice calls are for vendors and business contacts only.
 */

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { broadcast } from '@/lib/realtime/broadcast'
import {
  buildVendorAvailabilityTwiml,
  buildVendorDeliveryTwiml,
  buildVenueConfirmationTwiml,
} from '@/lib/calling/voice-helpers'
import { normalizePhone, isValidE164 } from '@/lib/calling/phone-utils'

const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN
const TWILIO_PHONE_NUMBER = process.env.TWILIO_PHONE_NUMBER
const APP_URL = process.env.NEXTAUTH_URL || 'https://app.cheflowhq.com'

export type CallResult = {
  success: boolean
  callId?: string
  aiCallId?: string
  error?: string
}

export type SupplierCall = {
  id: string
  vendor_name: string
  vendor_phone: string
  ingredient_name: string
  status: string
  result: 'yes' | 'no' | null
  price_quoted: string | null
  quantity_available: string | null
  recording_url: string | null
  speech_transcript: string | null
  created_at: string
}

export type AiCall = {
  id: string
  direction: string
  role: string
  contact_phone: string
  contact_name: string | null
  subject: string | null
  status: string
  result: 'yes' | 'no' | null
  full_transcript: string | null
  extracted_data: Record<string, any>
  action_log: string[]
  recording_url: string | null
  duration_seconds: number | null
  created_at: string
}

// Twilio error code: concurrent outbound call limit per account
const TWILIO_CONCURRENT_LIMIT = 21210

function isTwilioError(
  r: { sid: string } | { twErr: number; twMsg: string } | null
): r is { twErr: number; twMsg: string } {
  return r !== null && 'twErr' in r
}

// ---------------------------------------------------------------------------
// Duplicate call guard
// ---------------------------------------------------------------------------

async function hasPendingCall(
  db: any,
  chefId: string,
  vendorPhone: string,
  ingredientName: string
): Promise<boolean> {
  const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString()
  const { data } = await db
    .from('supplier_calls')
    .select('id')
    .eq('chef_id', chefId)
    .eq('vendor_phone', normalizePhone(vendorPhone))
    .ilike('ingredient_name', ingredientName.trim())
    .in('status', ['queued', 'ringing', 'in_progress'])
    .gte('created_at', fiveMinutesAgo)
    .limit(1)
    .maybeSingle()
  return !!data
}

// Dedup guard for ai_calls-based roles (delivery, venue, ad-hoc).
// supplier_calls has its own hasPendingCall guard.
async function hasPendingAiCall(
  db: any,
  chefId: string,
  contactPhone: string,
  role: string
): Promise<boolean> {
  const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString()
  const { data } = await db
    .from('ai_calls')
    .select('id')
    .eq('chef_id', chefId)
    .eq('contact_phone', normalizePhone(contactPhone))
    .eq('role', role)
    .in('status', ['queued', 'ringing', 'in_progress'])
    .gte('created_at', fiveMinutesAgo)
    .limit(1)
    .maybeSingle()
  return !!data
}

// ---------------------------------------------------------------------------
// Gate check
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
// Shared: place a Twilio call and return the call SID
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
      console.error('[calling] Twilio error:', errJson.code, errJson.message)
      return { twErr: errJson.code ?? 0, twMsg: errJson.message ?? 'Twilio API error' }
    } catch {
      console.error('[calling] Twilio API error: unparseable response')
      return { twErr: 0, twMsg: 'Twilio API error' }
    }
  }

  return res.json()
}

// ---------------------------------------------------------------------------
// Unified eligibility check: active hours + daily limit in one DB query
// ---------------------------------------------------------------------------

async function checkCallingEligibility(
  db: any,
  chefId: string,
  defaultLimit = 20
): Promise<{ allowed: boolean; reason?: string; limit: number }> {
  // One query for all per-chef calling config
  const { data: routingRule } = await db
    .from('ai_call_routing_rules')
    .select('daily_call_limit, active_hours_start, active_hours_end, active_timezone')
    .eq('chef_id', chefId)
    .maybeSingle()

  const limit: number = routingRule?.daily_call_limit ?? defaultLimit
  const tz: string = routingRule?.active_timezone || 'America/New_York'
  const hoursStart: string = routingRule?.active_hours_start || '08:00'
  const hoursEnd: string = routingRule?.active_hours_end || '20:00'

  // Check active hours using configured timezone and stored start/end times
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

  // Count ALL outbound call types (availability, delivery, venue) against the limit.
  // Reset boundary uses configured timezone midnight, not UTC.
  const nowTzMidnight = new Date(new Date().toLocaleString('en-US', { timeZone: tz }))
  nowTzMidnight.setHours(0, 0, 0, 0)
  const utcOffset =
    new Date().getTime() - new Date(new Date().toLocaleString('en-US', { timeZone: tz })).getTime()
  const todayStart = new Date(nowTzMidnight.getTime() + utcOffset)

  const { count } = await db
    .from('ai_calls')
    .select('*', { count: 'exact', head: true })
    .eq('chef_id', chefId)
    .eq('direction', 'outbound')
    .gte('created_at', todayStart.toISOString())

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
// ROLE 1: Vendor Availability Check (existing, upgraded)
// Check if a vendor has an ingredient in stock. Voice now uses neural TTS + SSML.
// ---------------------------------------------------------------------------

export async function initiateSupplierCall(
  vendorId: string,
  ingredientName: string
): Promise<CallResult> {
  const user = await requireChef()
  await requireCallingEnabled(user.tenantId!)

  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_PHONE_NUMBER) {
    return { success: false, error: 'Calling is not configured. Contact the platform admin.' }
  }

  const db: any = createServerClient()

  const [{ data: vendor, error: vendorError }, { data: chef }] = await Promise.all([
    db
      .from('vendors')
      .select('id, name, phone')
      .eq('id', vendorId)
      .eq('chef_id', user.tenantId!)
      .single(),
    db.from('chefs').select('business_name').eq('id', user.tenantId!).single(),
  ])

  if (vendorError || !vendor || !vendor.phone) {
    return { success: false, error: 'Vendor not found or missing phone number.' }
  }

  const vendorPhoneNormalized = normalizePhone(vendor.phone)
  if (!isValidE164(vendorPhoneNormalized)) {
    return { success: false, error: 'Vendor phone number is not a valid format.' }
  }

  const eligibility = await checkCallingEligibility(db, user.tenantId!)
  if (!eligibility.allowed) {
    return { success: false, error: eligibility.reason }
  }

  const alreadyCalling = await hasPendingCall(
    db,
    user.tenantId!,
    vendorPhoneNormalized,
    ingredientName
  )
  if (alreadyCalling) {
    return {
      success: false,
      error: 'A call to this vendor for this ingredient is already in progress.',
    }
  }

  const { data: callRecord, error: insertError } = await db
    .from('supplier_calls')
    .insert({
      chef_id: user.tenantId!,
      vendor_id: vendorId,
      vendor_name: vendor.name,
      vendor_phone: vendorPhoneNormalized,
      ingredient_name: ingredientName.trim(),
      status: 'queued',
    })
    .select()
    .single()

  if (insertError || !callRecord) {
    return { success: false, error: 'Failed to create call record.' }
  }

  // Create ai_calls record for full logging
  const { data: aiCallRecord } = await db
    .from('ai_calls')
    .insert({
      chef_id: user.tenantId!,
      direction: 'outbound',
      role: 'vendor_availability',
      contact_phone: vendorPhoneNormalized,
      contact_name: vendor.name,
      contact_type: 'vendor',
      vendor_id: vendorId,
      subject: ingredientName.trim(),
      status: 'queued',
      supplier_call_id: callRecord.id,
    })
    .select()
    .single()

  // Omit aiCallId param entirely if the ai_calls insert failed (empty string causes
  // gather/status handlers to attempt a lookup on id='' which always returns null).
  const aiCallIdParam = aiCallRecord?.id ? `&aiCallId=${encodeURIComponent(aiCallRecord.id)}` : ''
  const gatherAction = `${APP_URL}/api/calling/gather?callId=${encodeURIComponent(callRecord.id)}&step=1&role=vendor_availability${aiCallIdParam}`
  const statusCallbackUrl = `${APP_URL}/api/calling/status?callId=${encodeURIComponent(callRecord.id)}${aiCallIdParam}`
  const recordingCallbackUrl = `${APP_URL}/api/calling/recording`

  const businessName = chef?.business_name || 'a private chef'

  const twiml = buildVendorAvailabilityTwiml(businessName, ingredientName.trim(), gatherAction)

  try {
    const twilioData = await placeTwilioCall({
      to: vendorPhoneNormalized,
      twiml,
      statusCallbackUrl,
      recordingCallbackUrl,
    })

    if (!twilioData || 'twErr' in twilioData) {
      const twilioErr = twilioData && 'twErr' in twilioData ? twilioData : null
      await db
        .from('supplier_calls')
        .update({ status: 'failed', error_message: twilioErr?.twMsg ?? 'Twilio API error' })
        .eq('id', callRecord.id)
      if (aiCallRecord)
        await db.from('ai_calls').update({ status: 'failed' }).eq('id', aiCallRecord.id)
      return {
        success: false,
        error:
          twilioErr?.twErr === TWILIO_CONCURRENT_LIMIT
            ? 'Another call is already in progress. Try again in a moment.'
            : 'Failed to place call. Check Twilio configuration.',
      }
    }

    await Promise.all([
      db
        .from('supplier_calls')
        .update({ call_sid: twilioData.sid, status: 'ringing' })
        .eq('id', callRecord.id),
      aiCallRecord
        ? db
            .from('ai_calls')
            .update({ call_sid: twilioData.sid, status: 'ringing' })
            .eq('id', aiCallRecord.id)
        : Promise.resolve(),
    ])

    await broadcast(`chef-${user.tenantId}`, 'supplier_call_started', {
      callId: callRecord.id,
      aiCallId: aiCallRecord?.id,
      vendorName: vendor.name,
      ingredientName,
    })

    return { success: true, callId: callRecord.id, aiCallId: aiCallRecord?.id }
  } catch (err) {
    console.error('[calling] initiateSupplierCall error:', err)
    await db
      .from('supplier_calls')
      .update({ status: 'failed', error_message: 'Network error' })
      .eq('id', callRecord.id)
    return { success: false, error: 'Unexpected error placing call.' }
  }
}

// ---------------------------------------------------------------------------
// Ad-hoc vendor availability call (national directory / any number)
// ---------------------------------------------------------------------------

export async function initiateAdHocCall(
  vendorPhone: string,
  vendorName: string,
  ingredientName: string
): Promise<CallResult> {
  const user = await requireChef()
  await requireCallingEnabled(user.tenantId!)

  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_PHONE_NUMBER) {
    return { success: false, error: 'Calling is not configured. Contact the platform admin.' }
  }

  if (!vendorPhone || !vendorName) {
    return { success: false, error: 'Vendor name and phone number are required.' }
  }

  const db: any = createServerClient()

  const { data: chef } = await db
    .from('chefs')
    .select('business_name')
    .eq('id', user.tenantId!)
    .single()

  const eligibility = await checkCallingEligibility(db, user.tenantId!)
  if (!eligibility.allowed) {
    return { success: false, error: eligibility.reason }
  }

  const vendorPhoneNormalized = normalizePhone(vendorPhone.trim())
  if (!isValidE164(vendorPhoneNormalized)) {
    return {
      success: false,
      error: 'Phone number is not a valid format. Use a 10-digit US number or E.164 format.',
    }
  }

  const alreadyCalling = await hasPendingCall(
    db,
    user.tenantId!,
    vendorPhoneNormalized,
    ingredientName
  )
  if (alreadyCalling) {
    return {
      success: false,
      error: 'A call to this vendor for this ingredient is already in progress.',
    }
  }

  const { data: callRecord, error: insertError } = await db
    .from('supplier_calls')
    .insert({
      chef_id: user.tenantId!,
      vendor_id: null,
      vendor_name: vendorName.trim(),
      vendor_phone: vendorPhoneNormalized,
      ingredient_name: ingredientName.trim(),
      status: 'queued',
    })
    .select()
    .single()

  if (insertError || !callRecord) {
    return { success: false, error: 'Failed to create call record.' }
  }

  const { data: aiCallRecord } = await db
    .from('ai_calls')
    .insert({
      chef_id: user.tenantId!,
      direction: 'outbound',
      role: 'vendor_availability',
      contact_phone: vendorPhoneNormalized,
      contact_name: vendorName.trim(),
      contact_type: 'vendor',
      subject: ingredientName.trim(),
      status: 'queued',
      supplier_call_id: callRecord.id,
    })
    .select()
    .single()

  // Omit aiCallId param entirely if the ai_calls insert failed (empty string causes
  // gather/status handlers to attempt a lookup on id='' which always returns null).
  const aiCallIdParamAdhoc = aiCallRecord?.id
    ? `&aiCallId=${encodeURIComponent(aiCallRecord.id)}`
    : ''
  const gatherAction = `${APP_URL}/api/calling/gather?callId=${encodeURIComponent(callRecord.id)}&step=1&role=vendor_availability${aiCallIdParamAdhoc}`
  const statusCallbackUrl = `${APP_URL}/api/calling/status?callId=${encodeURIComponent(callRecord.id)}${aiCallIdParamAdhoc}`
  const recordingCallbackUrl = `${APP_URL}/api/calling/recording`
  const businessName = chef?.business_name || 'a private chef'

  const twiml = buildVendorAvailabilityTwiml(businessName, ingredientName.trim(), gatherAction)

  try {
    const twilioData = await placeTwilioCall({
      to: vendorPhoneNormalized,
      twiml,
      statusCallbackUrl,
      recordingCallbackUrl,
    })

    if (!twilioData || isTwilioError(twilioData)) {
      const twilioErr = isTwilioError(twilioData) ? twilioData : null
      await db
        .from('supplier_calls')
        .update({ status: 'failed', error_message: twilioErr?.twMsg ?? 'Twilio API error' })
        .eq('id', callRecord.id)
      return {
        success: false,
        error:
          twilioErr?.twErr === TWILIO_CONCURRENT_LIMIT
            ? 'Another call is already in progress. Try again in a moment.'
            : 'Failed to place call. Check Twilio configuration.',
      }
    }

    await Promise.all([
      db
        .from('supplier_calls')
        .update({ call_sid: twilioData.sid, status: 'ringing' })
        .eq('id', callRecord.id),
      aiCallRecord
        ? db
            .from('ai_calls')
            .update({ call_sid: twilioData.sid, status: 'ringing' })
            .eq('id', aiCallRecord.id)
        : Promise.resolve(),
    ])

    await broadcast(`chef-${user.tenantId}`, 'supplier_call_started', {
      callId: callRecord.id,
      aiCallId: aiCallRecord?.id,
      vendorName: vendorName.trim(),
      ingredientName,
    })

    return { success: true, callId: callRecord.id, aiCallId: aiCallRecord?.id }
  } catch (err) {
    console.error('[calling] initiateAdHocCall error:', err)
    await db
      .from('supplier_calls')
      .update({ status: 'failed', error_message: 'Network error' })
      .eq('id', callRecord.id)
    return { success: false, error: 'Unexpected error placing call.' }
  }
}

// ---------------------------------------------------------------------------
// ROLE 2: Vendor Delivery Coordination
// Call a vendor to confirm delivery window for a confirmed event.
// ---------------------------------------------------------------------------

export async function initiateDeliveryCoordinationCall(params: {
  vendorPhone: string
  vendorName: string
  vendorId?: string
  itemDescription: string
  deliveryDate: string
  eventId?: string
}): Promise<CallResult> {
  const user = await requireChef()
  await requireCallingEnabled(user.tenantId!)

  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_PHONE_NUMBER) {
    return { success: false, error: 'Calling is not configured.' }
  }

  const db: any = createServerClient()
  const { data: chef } = await db
    .from('chefs')
    .select('business_name')
    .eq('id', user.tenantId!)
    .single()

  const eligibility = await checkCallingEligibility(db, user.tenantId!)
  if (!eligibility.allowed) return { success: false, error: eligibility.reason }

  // Enforce feature toggle — vendor_delivery is disabled unless explicitly enabled
  const { data: deliveryToggle } = await db
    .from('ai_call_routing_rules')
    .select('enable_vendor_delivery')
    .eq('chef_id', user.tenantId!)
    .maybeSingle()
  if (!deliveryToggle?.enable_vendor_delivery) {
    return {
      success: false,
      error: 'Vendor delivery calls are not enabled. Enable them in Calling Settings.',
    }
  }

  const vendorPhoneNormalized = normalizePhone(params.vendorPhone)
  if (!isValidE164(vendorPhoneNormalized)) {
    return { success: false, error: 'Vendor phone number is not a valid format.' }
  }

  if (await hasPendingAiCall(db, user.tenantId!, vendorPhoneNormalized, 'vendor_delivery')) {
    return { success: false, error: 'A delivery call to this vendor is already in progress.' }
  }

  const { data: aiCallRecord } = await db
    .from('ai_calls')
    .insert({
      chef_id: user.tenantId!,
      direction: 'outbound',
      role: 'vendor_delivery',
      contact_phone: vendorPhoneNormalized,
      contact_name: params.vendorName,
      contact_type: 'vendor',
      vendor_id: params.vendorId ?? null,
      event_id: params.eventId ?? null,
      subject: params.itemDescription,
      status: 'queued',
    })
    .select()
    .single()

  if (!aiCallRecord) return { success: false, error: 'Failed to create call record.' }

  const businessName = chef?.business_name || 'a private chef'
  const gatherAction = `${APP_URL}/api/calling/gather?aiCallId=${encodeURIComponent(aiCallRecord.id)}&step=1&role=vendor_delivery`
  const statusCallbackUrl = `${APP_URL}/api/calling/status?aiCallId=${encodeURIComponent(aiCallRecord.id)}`
  const recordingCallbackUrl = `${APP_URL}/api/calling/recording`

  const twiml = buildVendorDeliveryTwiml(
    businessName,
    params.itemDescription,
    params.deliveryDate,
    gatherAction
  )

  try {
    const twilioData = await placeTwilioCall({
      to: vendorPhoneNormalized,
      twiml,
      statusCallbackUrl,
      recordingCallbackUrl,
    })

    if (!twilioData || isTwilioError(twilioData)) {
      const twilioErr = isTwilioError(twilioData) ? twilioData : null
      await db
        .from('ai_calls')
        .update({ status: 'failed', error_message: twilioErr?.twMsg ?? 'Twilio API error' })
        .eq('id', aiCallRecord.id)
      return {
        success: false,
        error:
          twilioErr?.twErr === TWILIO_CONCURRENT_LIMIT
            ? 'Another call is already in progress. Try again in a moment.'
            : 'Failed to place call. Check Twilio configuration.',
      }
    }

    await db
      .from('ai_calls')
      .update({ call_sid: twilioData.sid, status: 'ringing' })
      .eq('id', aiCallRecord.id)

    await broadcast(`chef-${user.tenantId}`, 'ai_call_started', {
      aiCallId: aiCallRecord.id,
      role: 'vendor_delivery',
      contactName: params.vendorName,
      subject: params.itemDescription,
    })

    return { success: true, aiCallId: aiCallRecord.id }
  } catch (err) {
    console.error('[calling] initiateDeliveryCoordinationCall error:', err)
    await db.from('ai_calls').update({ status: 'failed' }).eq('id', aiCallRecord.id)
    return { success: false, error: 'Unexpected error placing call.' }
  }
}

// ---------------------------------------------------------------------------
// ROLE 3: Venue / Location Confirmation
// Call a venue to confirm kitchen access, parking, setup window.
// ---------------------------------------------------------------------------

export async function initiateVenueConfirmationCall(params: {
  venuePhone: string
  venueName: string
  eventDate: string
  eventId?: string
}): Promise<CallResult> {
  const user = await requireChef()
  await requireCallingEnabled(user.tenantId!)

  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_PHONE_NUMBER) {
    return { success: false, error: 'Calling is not configured.' }
  }

  const db: any = createServerClient()
  const { data: chef } = await db
    .from('chefs')
    .select('business_name')
    .eq('id', user.tenantId!)
    .single()

  const eligibility = await checkCallingEligibility(db, user.tenantId!)
  if (!eligibility.allowed) return { success: false, error: eligibility.reason }

  // Enforce feature toggle — venue_confirmation is disabled unless explicitly enabled
  const { data: venueToggle } = await db
    .from('ai_call_routing_rules')
    .select('enable_venue_confirmation')
    .eq('chef_id', user.tenantId!)
    .maybeSingle()
  if (!venueToggle?.enable_venue_confirmation) {
    return {
      success: false,
      error: 'Venue confirmation calls are not enabled. Enable them in Calling Settings.',
    }
  }

  const venuePhoneNormalized = normalizePhone(params.venuePhone)
  if (!isValidE164(venuePhoneNormalized)) {
    return { success: false, error: 'Venue phone number is not a valid format.' }
  }

  if (await hasPendingAiCall(db, user.tenantId!, venuePhoneNormalized, 'venue_confirmation')) {
    return {
      success: false,
      error: 'A venue confirmation call to this number is already in progress.',
    }
  }

  const { data: aiCallRecord } = await db
    .from('ai_calls')
    .insert({
      chef_id: user.tenantId!,
      direction: 'outbound',
      role: 'venue_confirmation',
      contact_phone: venuePhoneNormalized,
      contact_name: params.venueName,
      contact_type: 'venue',
      event_id: params.eventId ?? null,
      subject: `Event at ${params.venueName} on ${params.eventDate}`,
      status: 'queued',
    })
    .select()
    .single()

  if (!aiCallRecord) return { success: false, error: 'Failed to create call record.' }

  const businessName = chef?.business_name || 'a private chef'
  const gatherAction = `${APP_URL}/api/calling/gather?aiCallId=${encodeURIComponent(aiCallRecord.id)}&step=1&role=venue_confirmation`
  const statusCallbackUrl = `${APP_URL}/api/calling/status?aiCallId=${encodeURIComponent(aiCallRecord.id)}`
  const recordingCallbackUrl = `${APP_URL}/api/calling/recording`

  const twiml = buildVenueConfirmationTwiml(
    businessName,
    params.venueName,
    params.eventDate,
    gatherAction
  )

  try {
    const twilioData = await placeTwilioCall({
      to: venuePhoneNormalized,
      twiml,
      statusCallbackUrl,
      recordingCallbackUrl,
    })

    if (!twilioData || isTwilioError(twilioData)) {
      const twilioErr = isTwilioError(twilioData) ? twilioData : null
      await db
        .from('ai_calls')
        .update({ status: 'failed', error_message: twilioErr?.twMsg ?? 'Twilio API error' })
        .eq('id', aiCallRecord.id)
      return {
        success: false,
        error:
          twilioErr?.twErr === TWILIO_CONCURRENT_LIMIT
            ? 'Another call is already in progress. Try again in a moment.'
            : 'Failed to place call. Check Twilio configuration.',
      }
    }

    await db
      .from('ai_calls')
      .update({ call_sid: twilioData.sid, status: 'ringing' })
      .eq('id', aiCallRecord.id)

    await broadcast(`chef-${user.tenantId}`, 'ai_call_started', {
      aiCallId: aiCallRecord.id,
      role: 'venue_confirmation',
      contactName: params.venueName,
      subject: `Event on ${params.eventDate}`,
    })

    return { success: true, aiCallId: aiCallRecord.id }
  } catch (err) {
    console.error('[calling] initiateVenueConfirmationCall error:', err)
    await db.from('ai_calls').update({ status: 'failed' }).eq('id', aiCallRecord.id)
    return { success: false, error: 'Unexpected error placing call.' }
  }
}

// ---------------------------------------------------------------------------
// Poll call status (existing - used by UI for live updates)
// ---------------------------------------------------------------------------

export async function getCallStatus(callId: string): Promise<SupplierCall | null> {
  const user = await requireChef()
  const db: any = createServerClient()

  const { data } = await db
    .from('supplier_calls')
    .select(
      'id, vendor_name, vendor_phone, ingredient_name, status, result, price_quoted, quantity_available, recording_url, speech_transcript, created_at'
    )
    .eq('id', callId)
    .eq('chef_id', user.tenantId!)
    .single()

  return data ?? null
}

// ---------------------------------------------------------------------------
// Poll ai_call status (for delivery/venue/inbound roles)
// ---------------------------------------------------------------------------

export async function getAiCallStatus(aiCallId: string): Promise<AiCall | null> {
  const user = await requireChef()
  const db: any = createServerClient()

  const { data } = await db
    .from('ai_calls')
    .select(
      'id, direction, role, contact_phone, contact_name, subject, status, full_transcript, extracted_data, action_log, recording_url, duration_seconds, created_at'
    )
    .eq('id', aiCallId)
    .eq('chef_id', user.tenantId!)
    .single()

  return data ?? null
}

// ---------------------------------------------------------------------------
// Recent call history
// ---------------------------------------------------------------------------

export async function getRecentCalls(limit = 20): Promise<SupplierCall[]> {
  const user = await requireChef()
  const db: any = createServerClient()

  const { data } = await db
    .from('supplier_calls')
    .select(
      'id, vendor_name, vendor_phone, ingredient_name, status, result, price_quoted, quantity_available, recording_url, speech_transcript, created_at'
    )
    .eq('chef_id', user.tenantId!)
    .order('created_at', { ascending: false })
    .limit(limit)

  return data ?? []
}

export async function getRecentAiCalls(limit = 50): Promise<AiCall[]> {
  const user = await requireChef()
  const db: any = createServerClient()

  const { data } = await db
    .from('ai_calls')
    .select(
      'id, direction, role, contact_phone, contact_name, subject, status, result, full_transcript, extracted_data, action_log, recording_url, duration_seconds, created_at'
    )
    .eq('chef_id', user.tenantId!)
    .order('created_at', { ascending: false })
    .limit(limit)

  return data ?? []
}

// ---------------------------------------------------------------------------
// Get transcript for a specific ai_call
// ---------------------------------------------------------------------------

export async function getCallTranscript(aiCallId: string): Promise<
  Array<{
    speaker: string
    content: string
    step: number
    confidence: number | null
    input_type: string | null
    created_at: string
  }>
> {
  const user = await requireChef()
  const db: any = createServerClient()

  // Verify ownership
  const { data: aiCall } = await db
    .from('ai_calls')
    .select('id')
    .eq('id', aiCallId)
    .eq('chef_id', user.tenantId!)
    .single()

  if (!aiCall) return []

  const { data } = await db
    .from('ai_call_transcripts')
    .select('speaker, content, step, confidence, input_type, created_at')
    .eq('ai_call_id', aiCallId)
    .order('created_at', { ascending: true })

  return data ?? []
}

// ---------------------------------------------------------------------------
// Get or create routing rules for the current chef
// ---------------------------------------------------------------------------

export async function getRoutingRules(): Promise<Record<string, any> | null> {
  const user = await requireChef()
  const db: any = createServerClient()

  const { data } = await db
    .from('ai_call_routing_rules')
    .select('*')
    .eq('chef_id', user.tenantId!)
    .maybeSingle()

  return data
}

export async function upsertRoutingRules(updates: {
  ai_voice?: string
  active_hours_start?: string
  active_hours_end?: string
  active_timezone?: string
  daily_call_limit?: number
  chef_sms_number?: string
  enable_inbound_voicemail?: boolean
  enable_vendor_delivery?: boolean
  enable_venue_confirmation?: boolean
}): Promise<{ success: boolean; error?: string }> {
  // Q5: validate time format before storing - malformed values cause NaN comparisons
  // in checkCallingEligibility which silently disables the active-hours gate
  const timePattern = /^\d{2}:\d{2}$/
  if (updates.active_hours_start !== undefined && !timePattern.test(updates.active_hours_start)) {
    return { success: false, error: 'Start time must be in HH:MM format (e.g. 08:00).' }
  }
  if (updates.active_hours_end !== undefined && !timePattern.test(updates.active_hours_end)) {
    return { success: false, error: 'End time must be in HH:MM format (e.g. 20:00).' }
  }

  // Q6: start must be before end - equal or reversed values permanently block all outbound calls
  if (
    updates.active_hours_start !== undefined &&
    updates.active_hours_end !== undefined &&
    updates.active_hours_start >= updates.active_hours_end
  ) {
    return {
      success: false,
      error: 'Start time must be before end time. Cross-midnight windows are not supported.',
    }
  }

  // Q7: validate SMS number format if provided
  if (updates.chef_sms_number) {
    const normalized = normalizePhone(updates.chef_sms_number)
    if (!isValidE164(normalized)) {
      return {
        success: false,
        error: 'SMS number must be a valid phone number (e.g. +1 555 123 4567).',
      }
    }
    updates = { ...updates, chef_sms_number: normalized }
  }

  const user = await requireChef()
  const db: any = createServerClient()

  // onConflict: 'chef_id' is required — the compat shim defaults to ON CONFLICT (id),
  // but ai_call_routing_rules has a UNIQUE constraint on chef_id, not id.
  // Without this, every save after the first fails with a unique violation on chef_id.
  const { error } = await db.from('ai_call_routing_rules').upsert(
    {
      chef_id: user.tenantId!,
      ...updates,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'chef_id' }
  )

  if (error) return { success: false, error: error.message }
  return { success: true }
}

// ---------------------------------------------------------------------------
// Request access to the supplier calling feature.
// Writes a chef_feature_flags row with flag_name='supplier_calling_requested'
// so admin can see pending requests in the flags panel.
// ---------------------------------------------------------------------------

export async function requestCallingAccess(): Promise<{
  success: boolean
  alreadyRequested: boolean
  error?: string
}> {
  const user = await requireChef()
  const db: any = createServerClient()
  const chefId = user.tenantId!

  // Check if already enabled - no need to request
  const { data: enabledFlag } = await db
    .from('chef_feature_flags')
    .select('enabled')
    .eq('chef_id', chefId)
    .eq('flag_name', 'supplier_calling')
    .maybeSingle()

  if (enabledFlag?.enabled === true) {
    return { success: true, alreadyRequested: false }
  }

  // Check if already requested
  const { data: existing } = await db
    .from('chef_feature_flags')
    .select('enabled')
    .eq('chef_id', chefId)
    .eq('flag_name', 'supplier_calling_requested')
    .maybeSingle()

  if (existing !== null) {
    return { success: true, alreadyRequested: true }
  }

  const { error } = await db.from('chef_feature_flags').insert({
    chef_id: chefId,
    flag_name: 'supplier_calling_requested',
    enabled: true,
  })

  if (error) return { success: false, alreadyRequested: false, error: error.message }
  return { success: true, alreadyRequested: false }
}
