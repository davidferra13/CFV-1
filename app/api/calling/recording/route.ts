/**
 * Recording Status Callback
 *
 * Twilio POSTs here when a recording is ready.
 * Stores the recording URL on the supplier_calls record.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/db/admin'
import { validateTwilioWebhook } from '@/lib/calling/twilio-webhook-auth'

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

  const db: any = createAdminClient()
  const mp3Url = `${recordingUrl}.mp3`
  const now = new Date().toISOString()

  const { data: updated } = await db
    .from('supplier_calls')
    .update({ recording_url: mp3Url, updated_at: now })
    .eq('call_sid', callSid)
    .select('id')
    .maybeSingle()

  // Delivery and venue calls have no supplier_calls record - update ai_calls directly.
  if (!updated) {
    await db
      .from('ai_calls')
      .update({ recording_url: mp3Url, updated_at: now })
      .eq('call_sid', callSid)
      .catch((err: unknown) => {
        // Recording URL loss is data loss for delivery/venue calls - log it.
        console.error('[calling/recording] ai_calls recording_url update failed:', err)
      })
  }

  return NextResponse.json({ ok: true })
}
