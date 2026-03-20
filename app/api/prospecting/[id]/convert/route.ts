// POST /api/prospecting/[id]/convert
// Convert a prospect to a ChefFlow inquiry. Used by n8n reply handler
// when a cold outreach reply scores high enough for conversion.
// This is the API wrapper around the existing convertProspectToInquiry() server action.
//
// Accepts: { reply_text?: string, notes?: string }
// Returns: { success: true, inquiryId: string }

import { NextRequest, NextResponse } from 'next/server'
import { validateProspectingAuth } from '@/lib/prospecting/api-auth'
import { createServerClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const auth = await validateProspectingAuth(request)
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: { reply_text?: string; notes?: string } = {}
  try {
    body = await request.json()
  } catch {
    // Body is optional
  }

  const supabase = createServerClient({ admin: true })

  // Fetch prospect
  const { data: prospect, error: fetchError } = await supabase
    .from('prospects' as any)
    .select('*')
    .eq('id', params.id)
    .eq('chef_id', auth.tenantId)
    .single()

  if (fetchError || !prospect) {
    return NextResponse.json({ error: 'Prospect not found' }, { status: 404 })
  }

  const p = prospect as any

  // Don't convert if already converted
  if (p.converted_to_inquiry_id) {
    return NextResponse.json(
      {
        error: 'Already converted',
        inquiryId: p.converted_to_inquiry_id,
      },
      { status: 409 }
    )
  }

  // Create inquiry
  const sourceMessage = [
    `Converted from cold outreach prospect: ${p.name}`,
    p.category ? `Category: ${p.category}` : '',
    p.description ?? '',
    body.reply_text ? `Reply: ${body.reply_text}` : '',
    p.approach_strategy ? `Approach: ${p.approach_strategy}` : '',
    body.notes ?? '',
  ]
    .filter(Boolean)
    .join('\n')

  const { data: inquiry, error: inquiryError } = await supabase
    .from('inquiries')
    .insert({
      tenant_id: auth.tenantId,
      status: 'new',
      channel: 'outbound_prospecting',
      first_contact_at: new Date().toISOString(),
      source_message: sourceMessage,
      chef_likelihood: p.lead_score >= 70 ? 'hot' : p.lead_score >= 40 ? 'warm' : 'cold',
    })
    .select('id')
    .single()

  if (inquiryError || !inquiry) {
    console.error('[prospecting/convert] Inquiry creation failed:', inquiryError)
    return NextResponse.json({ error: 'Failed to create inquiry' }, { status: 500 })
  }

  // Update prospect with conversion link
  await supabase
    .from('prospects' as any)
    .update({
      status: 'converted',
      pipeline_stage: 'converted',
      converted_to_inquiry_id: inquiry.id,
      converted_at: new Date().toISOString(),
    })
    .eq('id', params.id)
    .eq('chef_id', auth.tenantId)

  // Add conversion note
  try {
    await supabase.from('prospect_notes' as any).insert({
      prospect_id: params.id,
      chef_id: auth.tenantId,
      note_type: 'general',
      content: `Auto-converted to inquiry from cold outreach reply. Inquiry: ${inquiry.id}`,
    })
  } catch {
    // non-blocking
  }

  // Record stage history
  try {
    await supabase.from('prospect_stage_history' as any).insert({
      prospect_id: params.id,
      chef_id: auth.tenantId,
      from_stage: p.pipeline_stage ?? 'responded',
      to_stage: 'converted',
      notes: 'Auto-converted from cold outreach reply',
    })
  } catch {
    // non-blocking
  }

  // Log outreach event
  try {
    await supabase.from('prospect_outreach_log' as any).insert({
      prospect_id: params.id,
      chef_id: auth.tenantId,
      outreach_type: 'note',
      notes: `Converted to inquiry ${inquiry.id}`,
    })
  } catch {
    // non-blocking
  }

  return NextResponse.json({ success: true, inquiryId: inquiry.id })
}
