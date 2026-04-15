/**
 * Twilio Status Callback
 *
 * Twilio posts call lifecycle events here (initiated, ringing, completed, failed, etc).
 * Keeps supplier_calls.status accurate and handles no-answer/busy/failed scenarios
 * that the gather endpoint never sees.
 *
 * Race condition handling: Twilio may fire the 'completed' status callback before
 * the gather step-2 response is processed. We only broadcast terminal results here
 * if the gather route hasn't already done so (i.e. result is still null on a
 * non-answer/busy/failed call). For completed calls that DID go through gather,
 * the gather route already broadcast the result - we just update status/duration.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/db/admin'
import { broadcast } from '@/lib/realtime/broadcast'
import { sendSms } from '@/lib/sms/send'
import { validateTwilioWebhook } from '@/lib/calling/twilio-webhook-auth'

export async function POST(req: NextRequest) {
  const formData = await req.formData()

  const valid = await validateTwilioWebhook(req, formData)
  if (!valid) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })

  const callSid = formData.get('CallSid') as string | null
  const callStatus = formData.get('CallStatus') as string | null
  const callDuration = formData.get('CallDuration') as string | null

  if (!callSid || !callStatus) {
    return NextResponse.json({ ok: false }, { status: 400 })
  }

  const { searchParams } = new URL(req.url)
  const callId = searchParams.get('callId')

  const db: any = createAdminClient()

  const statusMap: Record<string, string> = {
    queued: 'queued',
    initiated: 'queued',
    ringing: 'ringing',
    'in-progress': 'in_progress',
    completed: 'completed',
    failed: 'failed',
    busy: 'busy',
    'no-answer': 'no_answer',
    canceled: 'failed',
  }

  const mappedStatus = statusMap[callStatus] ?? 'failed'
  const isTerminal = ['completed', 'failed', 'busy', 'no_answer'].includes(mappedStatus)
  const isHardFail = ['failed', 'busy', 'no_answer'].includes(mappedStatus)

  const update: Record<string, any> = {
    status: mappedStatus,
    updated_at: new Date().toISOString(),
  }
  if (callDuration) update.duration_seconds = parseInt(callDuration, 10)
  // Always stamp the call_sid so future lookups work
  update.call_sid = callSid

  // Look up by callId (query param) first - avoids race condition where call_sid
  // hasn't been written yet when the first status callback fires.
  // Fall back to call_sid lookup for backwards compatibility.
  // Both writes must be guarded: a DB error here produces a 500, which causes
  // Twilio to retry every 5 minutes for up to 24 hours. Without a guard, a single
  // DB blip creates an infinite retry loop and the call stays stuck in 'ringing'.
  let callRecord: any = null
  if (callId) {
    try {
      const { data } = await db
        .from('supplier_calls')
        .update(update)
        .eq('id', callId)
        .select('id, chef_id, vendor_id, vendor_name, ingredient_name, result')
        .single()
      callRecord = data
    } catch (err) {
      console.error('[calling/status] supplier_calls update (callId) failed:', err)
      return NextResponse.json({ ok: true }) // return 200 so Twilio does not retry
    }
  }
  if (!callRecord) {
    try {
      const { data } = await db
        .from('supplier_calls')
        .update(update)
        .eq('call_sid', callSid)
        .select('id, chef_id, vendor_id, vendor_name, ingredient_name, result')
        .single()
      callRecord = data
    } catch (err) {
      console.error('[calling/status] supplier_calls update (call_sid) failed:', err)
      return NextResponse.json({ ok: true })
    }
  }

  if (!callRecord) {
    // Also check ai_calls table for non-supplier-call roles (delivery, venue, etc.)
    const aiCallId = searchParams.get('aiCallId')
    if (aiCallId) {
      const aiUpdate: Record<string, any> = {
        status: mappedStatus,
        updated_at: new Date().toISOString(),
      }
      if (callDuration) aiUpdate.duration_seconds = parseInt(callDuration, 10)
      aiUpdate.call_sid = callSid

      let aiCallRecord: any = null
      try {
        const { data } = await db
          .from('ai_calls')
          .update(aiUpdate)
          .eq('id', aiCallId)
          .select('id, chef_id, role, contact_name, subject')
          .single()
        aiCallRecord = data
      } catch (err) {
        console.error('[calling/status] ai_calls update (ai-only path) failed:', err)
        return NextResponse.json({ ok: true })
      }

      if (aiCallRecord && isTerminal) {
        try {
          await broadcast(`chef-${aiCallRecord.chef_id}`, 'ai_call_result', {
            aiCallId,
            role: aiCallRecord.role,
            contactName: aiCallRecord.contact_name,
            subject: aiCallRecord.subject,
            status: mappedStatus,
          })
        } catch (err) {
          console.error('[calling/status] ai_calls broadcast error:', err)
        }
      }
    }
    return NextResponse.json({ ok: true })
  }

  // Also update ai_calls if linked
  const aiCallId = searchParams.get('aiCallId')
  if (aiCallId) {
    const aiUpdate: Record<string, any> = {
      status: mappedStatus,
      updated_at: new Date().toISOString(),
    }
    if (callDuration) aiUpdate.duration_seconds = parseInt(callDuration, 10)
    aiUpdate.call_sid = callSid
    await db
      .from('ai_calls')
      .update(aiUpdate)
      .eq('id', aiCallId)
      .catch((err: unknown) => {
        console.error('[calling/status] ai_calls status update failed:', err)
      })
  }

  // Broadcast for hard-fail cases (no-answer, busy, failed) - gather never ran.
  // Also broadcast if completed but gather never captured a result (call ended early).
  const shouldBroadcast = isTerminal && (isHardFail || callRecord.result === null)

  if (shouldBroadcast) {
    try {
      await broadcast(`chef-${callRecord.chef_id}`, 'supplier_call_result', {
        callId: callRecord.id,
        aiCallId,
        vendorId: callRecord.vendor_id,
        vendorName: callRecord.vendor_name,
        ingredientName: callRecord.ingredient_name,
        result: callRecord.result,
        status: mappedStatus,
        priceQuoted: null,
        quantityAvailable: null,
      })
    } catch (err) {
      console.error('[calling/status] broadcast error:', err)
    }

    // SMS alert to chef for hard-fail outcomes (no-answer, busy, failed)
    // They need to know so they can follow up manually.
    if (isHardFail) {
      try {
        const { data: routingRule } = await db
          .from('ai_call_routing_rules')
          .select('chef_sms_number')
          .eq('chef_id', callRecord.chef_id)
          .maybeSingle()
        const { data: chef } = await db
          .from('chefs')
          .select('phone')
          .eq('id', callRecord.chef_id)
          .maybeSingle()
        const chefPhone =
          (routingRule as any)?.chef_sms_number ||
          (chef as any)?.phone ||
          process.env.CHEF_ALERT_SMS_NUMBER
        if (chefPhone) {
          const statusText =
            mappedStatus === 'no_answer'
              ? 'no answer'
              : mappedStatus === 'busy'
                ? 'line busy'
                : 'call failed'
          const vendor = callRecord.vendor_name || 'Vendor'
          const ingredient = callRecord.ingredient_name ? ` re: ${callRecord.ingredient_name}` : ''
          await sendSms(
            chefPhone,
            `ChefFlow: Call to ${vendor}${ingredient} - ${statusText}. May need manual follow-up.`
          )
        }
      } catch (smsErr) {
        console.error('[calling/status] chef SMS alert failed (non-blocking):', smsErr)
      }
    }
  }

  return NextResponse.json({ ok: true })
}
