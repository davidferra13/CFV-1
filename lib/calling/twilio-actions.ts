'use server'

/**
 * Supplier Calling - Twilio Integration
 *
 * Places outbound calls to vendor suppliers on a chef's behalf.
 * The call asks a single yes/no question: "Do you have [ingredient] in stock?"
 * Vendor presses 1 for yes, 2 for no. Result is logged and broadcast via SSE.
 *
 * GATED: requires the `supplier_calling` feature flag to be enabled per chef.
 * Only the platform admin can enable this flag (Admin > Flags).
 */

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { broadcast } from '@/lib/realtime/broadcast'

const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN
const TWILIO_PHONE_NUMBER = process.env.TWILIO_PHONE_NUMBER
const APP_URL = process.env.NEXTAUTH_URL || 'https://app.cheflowhq.com'

export type CallResult = {
  success: boolean
  callId?: string
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
// Initiate a call
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

  // Load vendor and chef business name in parallel
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

  // Check daily call limit (20 calls/day per chef)
  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)

  const { count } = await db
    .from('supplier_calls')
    .select('*', { count: 'exact', head: true })
    .eq('chef_id', user.tenantId!)
    .gte('created_at', todayStart.toISOString())

  if ((count ?? 0) >= 20) {
    return { success: false, error: 'Daily call limit reached (20 calls/day). Resets at midnight.' }
  }

  // Check business hours (8am - 7pm local - using ET as default)
  const hour = new Date().getHours()
  if (hour < 8 || hour >= 19) {
    return {
      success: false,
      error: 'Calls are only placed between 8am and 7pm. Try again during business hours.',
    }
  }

  // Create the call record
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

  // Place the call via Twilio
  const gatherAction = `${APP_URL}/api/calling/gather?callId=${encodeURIComponent(callRecord.id)}&step=1`
  const statusCallbackUrl = `${APP_URL}/api/calling/status`

  const businessName = chef?.business_name || 'a private chef client'

  // FCC-compliant inline TwiML.
  // - Discloses AI nature at the start (FCC 2024 requirement for AI-generated calls).
  // - States the chef's business name so vendor recognizes the relationship.
  // - Accepts spoken yes/no and keypresses (1=yes, 2=no).
  // - If yes: second gather captures price and quantity.
  // - Uses Polly.Ruth-Generative for the most natural-sounding voice available via Twilio.
  const inlineTwiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Pause length="2"/>
  <Gather input="speech dtmf" timeout="10" speechTimeout="5" numDigits="1" action="${gatherAction}" method="POST" hints="yes, yeah, we do, absolutely, no, nope, out of stock, not right now">
    <Say voice="Polly.Ruth-Generative">Hi there! This is an AI assistant calling on behalf of ${businessName}. I just have a quick question - do you currently have ${ingredientName} in stock? You can say yes or no, or press 1 for yes and 2 for no.</Say>
  </Gather>
  <Say voice="Polly.Ruth-Generative">No worries, thanks so much for your time. Have a great day!</Say>
  <Hangup/>
</Response>`

  const twilioBody = new URLSearchParams({
    To: vendor.phone,
    From: TWILIO_PHONE_NUMBER,
    Twiml: inlineTwiml,
    StatusCallback: statusCallbackUrl,
    StatusCallbackMethod: 'POST',
    StatusCallbackEvent: 'completed initiated ringing',
  })

  try {
    const twilioRes = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Calls.json`,
      {
        method: 'POST',
        headers: {
          Authorization:
            'Basic ' + Buffer.from(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`).toString('base64'),
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: twilioBody.toString(),
      }
    )

    if (!twilioRes.ok) {
      const errText = await twilioRes.text()
      console.error('[calling] Twilio error:', errText)
      await db
        .from('supplier_calls')
        .update({ status: 'failed', error_message: errText })
        .eq('id', callRecord.id)
      return { success: false, error: 'Failed to place call. Check Twilio configuration.' }
    }

    const twilioData = await twilioRes.json()

    // Store the Twilio call SID
    await db
      .from('supplier_calls')
      .update({ call_sid: twilioData.sid, status: 'ringing' })
      .eq('id', callRecord.id)

    // Broadcast to chef's SSE channel that a call is in progress
    await broadcast(`chef-${user.tenantId}`, 'supplier_call_started', {
      callId: callRecord.id,
      vendorName: vendor.name,
      ingredientName,
    })

    return { success: true, callId: callRecord.id }
  } catch (err) {
    console.error('[calling] initiateSupplierCall error:', err)
    await db
      .from('supplier_calls')
      .update({ status: 'failed', error_message: 'Network error placing call' })
      .eq('id', callRecord.id)
    return { success: false, error: 'Unexpected error placing call.' }
  }
}

// ---------------------------------------------------------------------------
// Poll call status (called by the UI to show live result)
// ---------------------------------------------------------------------------

export async function getCallStatus(callId: string): Promise<SupplierCall | null> {
  const user = await requireChef()
  const db: any = createServerClient()

  const { data } = await db
    .from('supplier_calls')
    .select(
      'id, vendor_name, vendor_phone, ingredient_name, status, result, price_quoted, quantity_available, created_at'
    )
    .eq('id', callId)
    .eq('chef_id', user.tenantId!)
    .single()

  return data ?? null
}

// ---------------------------------------------------------------------------
// Recent call history for a chef
// ---------------------------------------------------------------------------

export async function getRecentCalls(limit = 20): Promise<SupplierCall[]> {
  const user = await requireChef()
  const db: any = createServerClient()

  const { data } = await db
    .from('supplier_calls')
    .select(
      'id, vendor_name, vendor_phone, ingredient_name, status, result, price_quoted, quantity_available, created_at'
    )
    .eq('chef_id', user.tenantId!)
    .order('created_at', { ascending: false })
    .limit(limit)

  return data ?? []
}
