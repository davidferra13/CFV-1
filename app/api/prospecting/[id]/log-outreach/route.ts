// POST /api/prospecting/[id]/log-outreach
// Log an outreach event (email sent, reply received, meeting scheduled, etc.)
// and optionally update prospect pipeline stage and delivery tracking fields.
//
// Accepts: {
//   outreach_type: 'email' | 'call' | 'follow_up_email' | 'response_received' | 'meeting_scheduled' | 'note',
//   sequence_number?: number,
//   subject?: string,
//   body?: string,
//   outcome?: string,
//   notes?: string,
//   pipeline_stage?: string,
//   instantly_lead_id?: string,
//   email_sent_at?: string,
//   email_opened_at?: string,
//   reply_received_at?: string,
//   reply_sentiment?: string,
//   reply_text?: string,
// }

import { NextRequest, NextResponse } from 'next/server'
import { validateProspectingAuth } from '@/lib/prospecting/api-auth'
import { createServerClient } from '@/lib/supabase/server'

const VALID_OUTREACH_TYPES = [
  'email',
  'call',
  'follow_up_email',
  'response_received',
  'meeting_scheduled',
  'note',
]
const VALID_PIPELINE_STAGES = [
  'new',
  'researched',
  'contacted',
  'responded',
  'meeting_set',
  'converted',
  'lost',
]
const VALID_SENTIMENTS = ['interested', 'not_interested', 'unknown']

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const auth = await validateProspectingAuth(request)
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const outreachType = body.outreach_type as string
  if (!outreachType || !VALID_OUTREACH_TYPES.includes(outreachType)) {
    return NextResponse.json({ error: 'Valid outreach_type required' }, { status: 400 })
  }

  const supabase = createServerClient({ admin: true })

  // 1. Create outreach log entry
  const logEntry: Record<string, unknown> = {
    prospect_id: params.id,
    chef_id: auth.tenantId,
    outreach_type: outreachType,
    sequence_number: body.sequence_number ?? null,
    subject: body.subject ?? null,
    body: body.body ?? null,
    outcome: body.outcome ?? null,
    notes: body.notes ?? null,
  }

  const { error: logError } = await supabase.from('prospect_outreach_log' as any).insert(logEntry)

  if (logError) {
    console.error('[prospecting/log-outreach] Log insert error:', logError)
    return NextResponse.json({ error: 'Failed to log outreach' }, { status: 500 })
  }

  // 2. Update prospect fields if provided
  const prospectUpdates: Record<string, unknown> = {}

  if (body.pipeline_stage && VALID_PIPELINE_STAGES.includes(body.pipeline_stage as string)) {
    prospectUpdates.pipeline_stage = body.pipeline_stage

    // Auto-sync status field
    const stageToStatus: Record<string, string> = {
      contacted: 'called',
      responded: 'follow_up',
      meeting_set: 'follow_up',
      converted: 'converted',
      lost: 'not_interested',
    }
    const newStatus = stageToStatus[body.pipeline_stage as string]
    if (newStatus) prospectUpdates.status = newStatus
  }

  if (body.instantly_lead_id) prospectUpdates.instantly_lead_id = body.instantly_lead_id
  if (body.email_sent_at) prospectUpdates.email_sent_at = body.email_sent_at
  if (body.email_opened_at) prospectUpdates.email_opened_at = body.email_opened_at
  if (body.reply_received_at) prospectUpdates.reply_received_at = body.reply_received_at
  if (body.reply_text) prospectUpdates.reply_text = body.reply_text
  if (body.reply_sentiment && VALID_SENTIMENTS.includes(body.reply_sentiment as string)) {
    prospectUpdates.reply_sentiment = body.reply_sentiment
  }

  if (Object.keys(prospectUpdates).length > 0) {
    const { error: updateError } = await supabase
      .from('prospects' as any)
      .update(prospectUpdates)
      .eq('id', params.id)
      .eq('chef_id', auth.tenantId)

    if (updateError) {
      console.error('[prospecting/log-outreach] Prospect update error:', updateError)
      // Non-blocking: log was already created
    }
  }

  // 3. Record stage history if pipeline_stage changed
  if (body.pipeline_stage) {
    await supabase
      .from('prospect_stage_history' as any)
      .insert({
        prospect_id: params.id,
        chef_id: auth.tenantId,
        from_stage: null, // We don't fetch current stage for API performance
        to_stage: body.pipeline_stage,
        notes: body.notes ?? `Outreach event: ${outreachType}`,
      })
      .catch((err: Error) => {
        console.error('[prospecting/log-outreach] Stage history error (non-blocking):', err)
      })
  }

  return NextResponse.json({ success: true })
}
