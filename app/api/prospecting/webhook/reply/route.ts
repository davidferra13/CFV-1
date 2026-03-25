// POST /api/prospecting/webhook/reply
// Instantly.ai reply webhook receiver.
// When a prospect replies to a cold email, Instantly fires this webhook.
// We match the reply to a prospect, classify sentiment, update pipeline,
// and optionally auto-convert hot leads to inquiries.
//
// Instantly webhook payload format:
// {
//   "event_type": "reply_received",
//   "email": "prospect@example.com",
//   "reply_text": "...",
//   "campaign_id": "...",
//   "lead_id": "...",
//   "timestamp": "...",
//   "is_interested": true/false/null
// }
//
// Authentication: X-Prospecting-Key header (shared secret)

import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/db/server'
import { checkRateLimit } from '@/lib/rateLimit'

export async function POST(request: Request) {
  // Rate limit: 30 requests per minute per IP
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
  try {
    await checkRateLimit(`prospecting-webhook:${ip}`, 30, 60_000)
  } catch {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }

  // Auth: check pipeline key
  const pipelineKey = request.headers.get('x-prospecting-key')
  const expectedKey = process.env.PROSPECTING_API_KEY
  const tenantId = process.env.PROSPECTING_TENANT_ID

  if (!pipelineKey || !expectedKey || !tenantId || pipelineKey !== expectedKey) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let payload: Record<string, unknown>
  try {
    payload = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const email = (payload.email as string)?.trim().toLowerCase()
  if (!email) {
    return NextResponse.json({ error: 'email required' }, { status: 400 })
  }

  const replyText = (payload.reply_text as string) ?? ''
  const isInterested = payload.is_interested as boolean | null
  const instantlyCampaignId = payload.campaign_id as string | null
  const instantlyLeadId = payload.lead_id as string | null

  const db = createServerClient({ admin: true })

  // 1. Find prospect by email
  const { data: prospects } = await db
    .from('prospects' as any)
    .select('*')
    .eq('chef_id', tenantId)
    .or(`email.ilike.${email},contact_direct_email.ilike.${email}`)
    .limit(1)

  const prospect = (prospects as any[])?.[0]

  if (!prospect) {
    console.warn(`[webhook/reply] No prospect found for email: ${email}`)
    return NextResponse.json({ matched: false, action: 'no_prospect_found' })
  }

  // 2. Classify sentiment
  let sentiment: 'interested' | 'not_interested' | 'unknown' = 'unknown'
  if (isInterested === true) sentiment = 'interested'
  else if (isInterested === false) sentiment = 'not_interested'

  // 3. Determine pipeline stage update
  let newPipelineStage: string
  let newStatus: string

  if (sentiment === 'not_interested') {
    newPipelineStage = 'lost'
    newStatus = 'not_interested'
  } else {
    newPipelineStage = 'responded'
    newStatus = 'follow_up'
  }

  // 4. Update prospect
  const updates: Record<string, unknown> = {
    reply_received_at: new Date().toISOString(),
    reply_sentiment: sentiment,
    reply_text: replyText.slice(0, 5000), // Cap at 5k chars
    pipeline_stage: newPipelineStage,
    status: newStatus,
  }

  if (instantlyLeadId) updates.instantly_lead_id = instantlyLeadId

  await db
    .from('prospects' as any)
    .update(updates)
    .eq('id', prospect.id)
    .eq('chef_id', tenantId)

  // 5. Log outreach event
  try {
    await db.from('prospect_outreach_log' as any).insert({
      prospect_id: prospect.id,
      chef_id: tenantId,
      outreach_type: 'response_received',
      body: replyText.slice(0, 5000),
      outcome: sentiment,
      notes: instantlyCampaignId ? `Campaign: ${instantlyCampaignId}` : null,
    })
  } catch (err) {
    console.error('[webhook/reply] Outreach log error (non-blocking):', err)
  }

  // 6. Record stage history
  try {
    await db.from('prospect_stage_history' as any).insert({
      prospect_id: prospect.id,
      chef_id: tenantId,
      from_stage: prospect.pipeline_stage,
      to_stage: newPipelineStage,
      notes: `Reply received (${sentiment}): ${replyText.slice(0, 200)}`,
    })
  } catch {
    // non-blocking
  }

  // 7. Update campaign reply count if we can match it
  if (instantlyCampaignId) {
    const { data: campaign } = await db
      .from('outreach_campaigns' as any)
      .select('id, reply_count')
      .eq('instantly_campaign_id', instantlyCampaignId)
      .eq('chef_id', tenantId)
      .single()

    if (campaign) {
      try {
        await db
          .from('outreach_campaigns' as any)
          .update({ reply_count: ((campaign as any).reply_count ?? 0) + 1 })
          .eq('id', (campaign as any).id)
      } catch {
        // non-blocking
      }
    }
  }

  // 8. Auto-convert if interested AND lead score >= 60
  let autoConverted = false
  let inquiryId: string | null = null

  if (
    sentiment === 'interested' &&
    (prospect.lead_score ?? 0) >= 60 &&
    !prospect.converted_to_inquiry_id
  ) {
    const sourceMessage = [
      `Auto-converted from cold outreach reply: ${prospect.name}`,
      prospect.category ? `Category: ${prospect.category}` : '',
      `Reply: ${replyText.slice(0, 500)}`,
    ]
      .filter(Boolean)
      .join('\n')

    const { data: inquiry, error: inquiryError } = await db
      .from('inquiries')
      .insert({
        tenant_id: tenantId,
        status: 'new',
        channel: 'outbound_prospecting',
        first_contact_at: new Date().toISOString(),
        source_message: sourceMessage,
        chef_likelihood: prospect.lead_score >= 70 ? 'hot' : 'warm',
      })
      .select('id')
      .single()

    if (!inquiryError && inquiry) {
      autoConverted = true
      inquiryId = inquiry.id

      await db
        .from('prospects' as any)
        .update({
          status: 'converted',
          pipeline_stage: 'converted',
          converted_to_inquiry_id: inquiry.id,
          converted_at: new Date().toISOString(),
        })
        .eq('id', prospect.id)
        .eq('chef_id', tenantId)

      try {
        await db.from('prospect_notes' as any).insert({
          prospect_id: prospect.id,
          chef_id: tenantId,
          note_type: 'general',
          content: `Auto-converted to inquiry from interested reply. Score: ${prospect.lead_score}. Inquiry: ${inquiry.id}`,
        })
      } catch {
        // non-blocking
      }
    }
  }

  return NextResponse.json({
    matched: true,
    prospectId: prospect.id,
    prospectName: prospect.name,
    sentiment,
    pipelineStage: autoConverted ? 'converted' : newPipelineStage,
    autoConverted,
    inquiryId,
  })
}
