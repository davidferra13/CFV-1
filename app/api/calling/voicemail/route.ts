/**
 * Voicemail Transcription Callback
 *
 * Twilio posts here when a voicemail recording is transcribed.
 * Stores the transcription in ai_calls, creates a chef_quick_notes entry,
 * and broadcasts to the chef's dashboard.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/db/admin'
import { broadcast } from '@/lib/realtime/broadcast'
import { validateTwilioWebhook } from '@/lib/calling/twilio-webhook-auth'

export async function POST(req: NextRequest) {
  const formData = await req.formData()

  const valid = await validateTwilioWebhook(req, formData)
  if (!valid) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })

  const transcriptionText = (formData.get('TranscriptionText') as string | null)?.trim() || null
  const recordingUrl = (formData.get('RecordingUrl') as string | null) || null
  const transcriptionStatus = (formData.get('TranscriptionStatus') as string | null) || null

  const { searchParams } = new URL(req.url)
  const aiCallId = searchParams.get('aiCallId')

  if (!aiCallId) return NextResponse.json({ ok: true })

  const db: any = createAdminClient()

  const updates: Record<string, any> = {
    voicemail_left: true,
    status: 'voicemail',
    updated_at: new Date().toISOString(),
  }
  if (transcriptionText) updates.full_transcript = transcriptionText
  if (recordingUrl) updates.recording_url = recordingUrl + '.mp3'

  // Guard the update: an unhandled DB error here produces a 500, which causes
  // Twilio to retry the voicemail callback indefinitely, permanently losing the transcript.
  let aiCall: any = null
  try {
    const { data } = await db
      .from('ai_calls')
      .update(updates)
      .eq('id', aiCallId)
      .select('chef_id, contact_phone, contact_name')
      .single()
    aiCall = data
  } catch (err) {
    console.error('[voicemail] ai_calls update failed - voicemail transcript not persisted:', err)
    return NextResponse.json({ ok: true }) // 200 so Twilio does not retry
  }

  if (!aiCall) return NextResponse.json({ ok: true })

  // Create a chef_quick_notes entry so this shows up in the chef's task list
  if (transcriptionText) {
    try {
      const callerLabel = aiCall.contact_name || aiCall.contact_phone || 'Unknown caller'
      await db.from('chef_quick_notes').insert({
        chef_id: aiCall.chef_id,
        text: `Voicemail from ${callerLabel}: "${transcriptionText}"`,
        status: 'raw',
        source: 'inbound_voice_voicemail',
      })
    } catch (err) {
      console.error('[voicemail] chef_quick_notes insert error:', err)
    }
  }

  // Broadcast to dashboard
  try {
    await broadcast(`chef-${aiCall.chef_id}`, 'voicemail_received', {
      aiCallId,
      callerPhone: aiCall.contact_phone,
      callerName: aiCall.contact_name,
      transcription: transcriptionText,
      recordingUrl: updates.recording_url || null,
    })
  } catch (err) {
    console.error('[voicemail] voicemail_received broadcast failed:', err)
  }

  return NextResponse.json({ ok: true })
}
