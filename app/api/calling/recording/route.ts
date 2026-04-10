/**
 * Recording Status Callback
 *
 * Twilio POSTs here when a recording is ready.
 * Stores the recording URL on the supplier_calls record.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/db/admin'

export async function POST(req: NextRequest) {
  const formData = await req.formData()
  const callSid = formData.get('CallSid') as string | null
  const recordingUrl = formData.get('RecordingUrl') as string | null
  const recordingStatus = formData.get('RecordingStatus') as string | null

  if (!callSid || !recordingUrl || recordingStatus !== 'completed') {
    return NextResponse.json({ ok: true })
  }

  const db: any = createAdminClient()
  await db
    .from('supplier_calls')
    .update({
      recording_url: `${recordingUrl}.mp3`,
      updated_at: new Date().toISOString(),
    })
    .eq('call_sid', callSid)

  return NextResponse.json({ ok: true })
}
