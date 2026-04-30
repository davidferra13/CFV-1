/**
 * Recording Status Callback
 *
 * Twilio POSTs here when a recording is ready.
 * Stores the recording URL on the supplier_calls record.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/db/admin'
import { validateTwilioWebhook } from '@/lib/calling/twilio-webhook-auth'
import { recordVoiceOpsForAiCallWithDb } from '@/lib/calling/voice-ops-recorder'

export async function POST(req: NextRequest) {
  const formData = await req.formData()

  const valid = await validateTwilioWebhook(req, formData)
  if (!valid) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })

  const callSid = formData.get('CallSid') as string | null
  const recordingUrl = formData.get('RecordingUrl') as string | null
  const recordingStatus = formData.get('RecordingStatus') as string | null

  if (!callSid || !recordingUrl || recordingStatus !== 'completed') {
    return NextResponse.json({ ok: true })
  }

  const { searchParams } = new URL(req.url)
  const callId = searchParams.get('callId')
  const aiCallId = searchParams.get('aiCallId')

  const db: any = createAdminClient()
  const mp3Url = `${recordingUrl}.mp3`
  const now = new Date().toISOString()

  // Q41: Guard supplier_calls update - unguarded DB error produces 500,
  // causing Twilio to retry recording callback every 5 min for 24 hours.
  // Q42: Try callId query param first (same race condition as status/route.ts
  // where call_sid may not be written yet when recording callback fires).
  let updated: any = null
  if (callId) {
    try {
      const { data } = await db
        .from('supplier_calls')
        .update({ recording_url: mp3Url, updated_at: now })
        .eq('id', callId)
        .select('id')
        .maybeSingle()
      updated = data
    } catch (err) {
      console.error('[calling/recording] supplier_calls update (callId) failed:', err)
    }
  }
  if (!updated) {
    try {
      const { data } = await db
        .from('supplier_calls')
        .update({ recording_url: mp3Url, updated_at: now })
        .eq('call_sid', callSid)
        .select('id')
        .maybeSingle()
      updated = data
    } catch (err) {
      console.error('[calling/recording] supplier_calls update (call_sid) failed:', err)
    }
  }

  // Delivery and venue calls have no supplier_calls record - update ai_calls directly.
  // Also update ai_calls if linked via aiCallId param.
  if (!updated || aiCallId) {
    const aiFilter = aiCallId ? { key: 'id', value: aiCallId } : { key: 'call_sid', value: callSid }
    try {
      const { data: aiCall } = await db
        .from('ai_calls')
        .update({ recording_url: mp3Url, updated_at: now })
        .eq(aiFilter.key, aiFilter.value)
        .select('id, chef_id')
        .maybeSingle()

      if (aiCall?.id && aiCall?.chef_id) {
        await recordRecordingVoiceOps(db, aiCall.chef_id, aiCall.id)
      }
    } catch (err) {
      console.error('[calling/recording] ai_calls recording_url update failed:', err)
    }
  }

  return NextResponse.json({ ok: true })
}

async function recordRecordingVoiceOps(db: any, chefId: string, aiCallId: string): Promise<void> {
  try {
    const result = await recordVoiceOpsForAiCallWithDb({
      db,
      chefId,
      aiCallId,
      source: 'twilio_recording_callback',
    })
    if (!result.success) {
      console.error('[calling/recording] voice ops recording failed:', result.error)
    }
  } catch (err) {
    console.error('[calling/recording] voice ops recording threw:', err)
  }
}
