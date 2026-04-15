/**
 * Inbound Call Handler
 *
 * Twilio posts here when someone calls the chef's dedicated AI number.
 * Identifies the caller, creates an ai_calls record, and returns TwiML
 * for the appropriate inbound role.
 *
 * Caller identification:
 *   - Known vendor phone -> inbound_vendor_callback
 *   - Unknown caller -> inbound_unknown (free-form message capture)
 *   - Outside active hours -> inbound_voicemail
 *
 * HARD RULE: This system never handles client calls. If a client calls,
 * they get the unknown caller flow, which captures their message and
 * notifies the chef. The chef calls back personally.
 *
 * Twilio webhook auth: validates X-Twilio-Signature header.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/db/admin'
import { broadcast } from '@/lib/realtime/broadcast'
import { validateTwilioWebhook } from '@/lib/calling/twilio-webhook-auth'
import { normalizePhone } from '@/lib/calling/phone-utils'
import {
  buildVoicemailTwiml,
  buildVendorCallbackTwiml,
  buildUnknownCallerTwiml,
  twimlResponse,
} from '@/lib/calling/voice-helpers'

const APP_URL = process.env.NEXTAUTH_URL || 'https://app.cheflowhq.com'

// Active hours check using per-chef DB config.
// Falls back to 8am-8pm ET when no routing rule exists.
function isWithinConfiguredHours(routingRule: any): boolean {
  const tz: string = routingRule?.active_timezone || 'America/New_York'
  const hoursStart: string = routingRule?.active_hours_start || '08:00'
  const hoursEnd: string = routingRule?.active_hours_end || '20:00'
  const [startH, startM] = hoursStart.split(':').map(Number)
  const [endH, endM] = hoursEnd.split(':').map(Number)
  const nowInTz = new Date(new Date().toLocaleString('en-US', { timeZone: tz }))
  const currentMinutes = nowInTz.getHours() * 60 + nowInTz.getMinutes()
  return currentMinutes >= startH * 60 + startM && currentMinutes < endH * 60 + endM
}

export async function POST(req: NextRequest) {
  const formData = await req.formData()

  const valid = await validateTwilioWebhook(req, formData)
  if (!valid) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }
  const callerPhoneRaw = (formData.get('From') as string | null)?.trim() || ''
  const callerPhone = normalizePhone(callerPhoneRaw)
  const callSid = (formData.get('CallSid') as string | null) || ''
  const toNumber = (formData.get('To') as string | null) || ''

  if (!callerPhone) {
    return twimlResponse(`<?xml version="1.0" encoding="UTF-8"?><Response><Hangup/></Response>`)
  }

  const db: any = createAdminClient()

  // Resolve which chef owns this inbound number
  const { data: routingRule } = await db
    .from('ai_call_routing_rules')
    .select('chef_id, ai_voice, enable_inbound_voicemail')
    .eq('inbound_phone_number', toNumber)
    .maybeSingle()

  // Fall back to the only chef only if this is a single-tenant instance.
  // In multi-tenant setup, routing to an arbitrary chef is dangerous - return hangup instead.
  let chefId: string | null = routingRule?.chef_id ?? null
  if (!chefId) {
    const { count } = await db.from('chefs').select('*', { count: 'exact', head: true })
    if ((count ?? 0) === 1) {
      const { data: firstChef } = await db.from('chefs').select('id').limit(1).single()
      chefId = firstChef?.id ?? null
    }
    // If multiple chefs: inbound number not configured — drop the call.
    // The caller will hear a disconnect rather than being routed to the wrong chef.
  }

  if (!chefId) {
    return twimlResponse(`<?xml version="1.0" encoding="UTF-8"?><Response><Hangup/></Response>`)
  }

  const voice = routingRule?.ai_voice || 'Polly.Matthew-Neural'

  // Load chef business name
  const { data: chef } = await db.from('chefs').select('business_name').eq('id', chefId).single()
  const businessName = chef?.business_name || 'this private chef service'

  // Outside active hours or voicemail disabled -> after-hours handling
  const voicemailEnabled = routingRule?.enable_inbound_voicemail !== false
  if (!isWithinConfiguredHours(routingRule)) {
    // Chef disabled voicemail: hang up rather than leaving an unwanted transcript
    if (!voicemailEnabled) {
      return twimlResponse(`<?xml version="1.0" encoding="UTF-8"?><Response><Hangup/></Response>`)
    }

    const { data: aiCallRecord } = await db
      .from('ai_calls')
      .insert({
        chef_id: chefId,
        direction: 'inbound',
        role: 'inbound_voicemail',
        contact_phone: callerPhone,
        contact_type: 'unknown',
        status: 'in_progress',
        call_sid: callSid,
        voicemail_left: false,
        triggered_by: 'inbound',
      })
      .select()
      .single()

    // Use conditional param: omit aiCallId entirely if the insert failed.
    // An empty aiCallId param causes the voicemail route to silently drop the transcript.
    const voicemailCallbackUrl = aiCallRecord?.id
      ? `${APP_URL}/api/calling/voicemail?aiCallId=${encodeURIComponent(aiCallRecord.id)}`
      : `${APP_URL}/api/calling/voicemail`
    const voicemailDoneUrl = aiCallRecord?.id
      ? `${APP_URL}/api/calling/voicemail/done?aiCallId=${encodeURIComponent(aiCallRecord.id)}`
      : `${APP_URL}/api/calling/voicemail/done`

    return twimlResponse(
      buildVoicemailTwiml(businessName, voicemailCallbackUrl, voicemailDoneUrl, voice)
    )
  }

  // Check if caller is a known vendor
  const { data: matchedVendor } = await db
    .from('vendors')
    .select('id, name')
    .eq('chef_id', chefId)
    .eq('phone', callerPhone)
    .maybeSingle()

  // Check if there's a recent outbound call to this number (unanswered vendor callback)
  const recentCutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
  const { data: recentCall } = await db
    .from('ai_calls')
    .select('id, subject')
    .eq('chef_id', chefId)
    .eq('contact_phone', callerPhone)
    .eq('direction', 'outbound')
    .in('status', ['no_answer', 'busy', 'completed'])
    .gte('created_at', recentCutoff)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  const isKnownVendor = !!matchedVendor || !!recentCall

  const role = isKnownVendor ? 'inbound_vendor_callback' : 'inbound_unknown'

  const { data: aiCallRecord } = await db
    .from('ai_calls')
    .insert({
      chef_id: chefId,
      direction: 'inbound',
      role,
      contact_phone: callerPhone,
      contact_name: matchedVendor?.name || null,
      contact_type: isKnownVendor ? 'vendor' : 'unknown',
      vendor_id: matchedVendor?.id || null,
      status: 'in_progress',
      call_sid: callSid,
      triggered_by: 'inbound',
    })
    .select()
    .single()

  // Notify chef that someone is calling right now (SSE + non-blocking)
  try {
    await broadcast(`chef-${chefId}`, 'inbound_call_live', {
      aiCallId: aiCallRecord?.id,
      callerPhone,
      callerName: matchedVendor?.name || 'Unknown caller',
      role,
      callSid,
    })
  } catch {}

  const gatherAction = aiCallRecord?.id
    ? `${APP_URL}/api/calling/gather?aiCallId=${encodeURIComponent(aiCallRecord.id)}&step=1&role=${role}`
    : `${APP_URL}/api/calling/gather?step=1&role=${role}`

  if (isKnownVendor) {
    return twimlResponse(buildVendorCallbackTwiml(businessName, gatherAction, voice))
  }

  return twimlResponse(buildUnknownCallerTwiml(businessName, gatherAction, voice))
}
