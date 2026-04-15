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
  full_transcript: string | null
  extracted_data: Record<string, any>
  action_log: string[]
  recording_url: string | null
  duration_seconds: number | null
  created_at: string
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
}): Promise<{ sid: string } | null> {
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
    const errText = await res.text()
    console.error('[calling] Twilio API error:', errText)
    return null
  }

  return res.json()
}

// ---------------------------------------------------------------------------
// Check daily limit
// ---------------------------------------------------------------------------

async function checkDailyLimit(db: any, chefId: string, limit = 20): Promise<boolean> {
  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)
  const { count } = await db
    .from('supplier_calls')
    .select('*', { count: 'exact', head: true })
    .eq('chef_id', chefId)
    .gte('created_at', todayStart.toISOString())
  return (count ?? 0) < limit
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

  const withinLimit = await checkDailyLimit(db, user.tenantId!)
  if (!withinLimit) {
    return { success: false, error: 'Daily call limit reached (20 calls/day). Resets at midnight.' }
  }

  const hour = new Date().getHours()
  if (hour < 8 || hour >= 19) {
    return {
      success: false,
      error: 'Calls are only placed between 8am and 7pm. Try again during business hours.',
    }
  }

  const { data: callRecord, error: insertError } = await db
    .from('supplier_calls')
    .insert({
      chef_id: user.tenantId!,
      vendor_id: vendorId,
      vendor_name: vendor.name,
      vendor_phone: vendor.phone,
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
      contact_phone: vendor.phone,
      contact_name: vendor.name,
      contact_type: 'vendor',
      vendor_id: vendorId,
      subject: ingredientName.trim(),
      status: 'queued',
      supplier_call_id: callRecord.id,
    })
    .select()
    .single()

  const gatherAction = `${APP_URL}/api/calling/gather?callId=${encodeURIComponent(callRecord.id)}&step=1&role=vendor_availability&aiCallId=${encodeURIComponent(aiCallRecord?.id ?? '')}`
  const statusCallbackUrl = `${APP_URL}/api/calling/status?callId=${encodeURIComponent(callRecord.id)}&aiCallId=${encodeURIComponent(aiCallRecord?.id ?? '')}`
  const recordingCallbackUrl = `${APP_URL}/api/calling/recording`

  const businessName = chef?.business_name || 'a private chef'

  const twiml = buildVendorAvailabilityTwiml(businessName, ingredientName.trim(), gatherAction)

  try {
    const twilioData = await placeTwilioCall({
      to: vendor.phone,
      twiml,
      statusCallbackUrl,
      recordingCallbackUrl,
    })

    if (!twilioData) {
      await db
        .from('supplier_calls')
        .update({ status: 'failed', error_message: 'Twilio API error' })
        .eq('id', callRecord.id)
      if (aiCallRecord)
        await db.from('ai_calls').update({ status: 'failed' }).eq('id', aiCallRecord.id)
      return { success: false, error: 'Failed to place call. Check Twilio configuration.' }
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
  ingredientName: string,
  nationalVendorId?: string
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

  const withinLimit = await checkDailyLimit(db, user.tenantId!)
  if (!withinLimit) {
    return { success: false, error: 'Daily call limit reached (20 calls/day). Resets at midnight.' }
  }

  const hour = new Date().getHours()
  if (hour < 8 || hour >= 19) {
    return {
      success: false,
      error: 'Calls are only placed between 8am and 7pm. Try again during business hours.',
    }
  }

  const insertPayload: Record<string, any> = {
    chef_id: user.tenantId!,
    vendor_id: null,
    vendor_name: vendorName.trim(),
    vendor_phone: vendorPhone.trim(),
    ingredient_name: ingredientName.trim(),
    status: 'queued',
  }
  if (nationalVendorId) insertPayload.notes = `national_vendor_id:${nationalVendorId}`

  const { data: callRecord, error: insertError } = await db
    .from('supplier_calls')
    .insert(insertPayload)
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
      contact_phone: vendorPhone.trim(),
      contact_name: vendorName.trim(),
      contact_type: 'vendor',
      subject: ingredientName.trim(),
      status: 'queued',
      supplier_call_id: callRecord.id,
    })
    .select()
    .single()

  const gatherAction = `${APP_URL}/api/calling/gather?callId=${encodeURIComponent(callRecord.id)}&step=1&role=vendor_availability&aiCallId=${encodeURIComponent(aiCallRecord?.id ?? '')}`
  const statusCallbackUrl = `${APP_URL}/api/calling/status?callId=${encodeURIComponent(callRecord.id)}&aiCallId=${encodeURIComponent(aiCallRecord?.id ?? '')}`
  const recordingCallbackUrl = `${APP_URL}/api/calling/recording`
  const businessName = chef?.business_name || 'a private chef'

  const twiml = buildVendorAvailabilityTwiml(businessName, ingredientName.trim(), gatherAction)

  try {
    const twilioData = await placeTwilioCall({
      to: vendorPhone.trim(),
      twiml,
      statusCallbackUrl,
      recordingCallbackUrl,
    })

    if (!twilioData) {
      await db
        .from('supplier_calls')
        .update({ status: 'failed', error_message: 'Twilio API error' })
        .eq('id', callRecord.id)
      return { success: false, error: 'Failed to place call. Check Twilio configuration.' }
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

  const withinLimit = await checkDailyLimit(db, user.tenantId!)
  if (!withinLimit) return { success: false, error: 'Daily call limit reached.' }

  const hour = new Date().getHours()
  if (hour < 8 || hour >= 19) return { success: false, error: 'Calls only placed 8am-7pm.' }

  const { data: aiCallRecord } = await db
    .from('ai_calls')
    .insert({
      chef_id: user.tenantId!,
      direction: 'outbound',
      role: 'vendor_delivery',
      contact_phone: params.vendorPhone,
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
      to: params.vendorPhone,
      twiml,
      statusCallbackUrl,
      recordingCallbackUrl,
    })

    if (!twilioData) {
      await db.from('ai_calls').update({ status: 'failed' }).eq('id', aiCallRecord.id)
      return { success: false, error: 'Failed to place call.' }
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

  const withinLimit = await checkDailyLimit(db, user.tenantId!)
  if (!withinLimit) return { success: false, error: 'Daily call limit reached.' }

  const hour = new Date().getHours()
  if (hour < 8 || hour >= 19) return { success: false, error: 'Calls only placed 8am-7pm.' }

  const { data: aiCallRecord } = await db
    .from('ai_calls')
    .insert({
      chef_id: user.tenantId!,
      direction: 'outbound',
      role: 'venue_confirmation',
      contact_phone: params.venuePhone,
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
      to: params.venuePhone,
      twiml,
      statusCallbackUrl,
      recordingCallbackUrl,
    })

    if (!twilioData) {
      await db.from('ai_calls').update({ status: 'failed' }).eq('id', aiCallRecord.id)
      return { success: false, error: 'Failed to place call.' }
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
      'id, direction, role, contact_phone, contact_name, subject, status, full_transcript, extracted_data, action_log, recording_url, duration_seconds, created_at'
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
  const user = await requireChef()
  const db: any = createServerClient()

  const { error } = await db
    .from('ai_call_routing_rules')
    .upsert({
      chef_id: user.tenantId!,
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq('chef_id', user.tenantId!)

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
