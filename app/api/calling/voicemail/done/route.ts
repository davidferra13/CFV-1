/**
 * Voicemail Done Handler
 *
 * Twilio redirects here after the <Record> action completes (caller hangs up
 * or maxLength is reached). This is NOT the transcription callback - that is
 * handled by /api/calling/voicemail.
 *
 * All we need to do is return a clean Hangup so Twilio doesn't get a 404.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/db/admin'
import { validateTwilioWebhook } from '@/lib/calling/twilio-webhook-auth'

export async function POST(req: NextRequest) {
  const formData = await req.formData()
  const valid = await validateTwilioWebhook(req, formData)
  if (!valid) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })

  const { searchParams } = new URL(req.url)
  const aiCallId = searchParams.get('aiCallId')

  // Mark the call completed if not already done.
  // Include 'voicemail' status: transcription callback may have set it before we get here.
  if (aiCallId) {
    try {
      const db: any = createAdminClient()
      await db
        .from('ai_calls')
        .update({ status: 'completed', updated_at: new Date().toISOString() })
        .eq('id', aiCallId)
        .in('status', ['in_progress', 'queued', 'ringing', 'voicemail'])
    } catch {
      // Non-critical - status callback will also handle this
    }
  }

  return new NextResponse(`<?xml version="1.0" encoding="UTF-8"?><Response><Hangup/></Response>`, {
    status: 200,
    headers: { 'Content-Type': 'text/xml' },
  })
}
