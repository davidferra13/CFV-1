'use server'

import { createServerClient } from '@/lib/supabase/server'
import { requireChef } from '@/lib/auth/get-user'
import { generateACEDraft, draftChefResponse } from './gemini-service'

// ─── ACE Draft for Inquiry ──────────────────────────────────────────────────

export async function draftResponseForInquiry(inquiryId: string) {
  const chef = await requireChef()
  const supabase = createServerClient()

  // Fetch inquiry
  const { data: inquiry, error: iqErr } = await supabase
    .from('inquiries')
    .select('*')
    .eq('id', inquiryId)
    .eq('tenant_id', chef.tenantId!)
    .single()

  if (iqErr || !inquiry) throw new Error('Inquiry not found')

  // Fetch client if linked
  let clientLedger = 'New client - no prior history.'
  if (inquiry.client_id) {
    const { data: client } = await supabase
      .from('clients')
      .select('*')
      .eq('id', inquiry.client_id)
      .eq('tenant_id', chef.tenantId!)
      .single()

    if (client) {
      clientLedger = `Client: ${client.full_name}\nEmail: ${client.email || 'N/A'}\nPhone: ${client.phone || 'N/A'}`
    }
  }

  // Calendar context
  let calendarContext = 'No date specified yet.'
  if (inquiry.confirmed_date) {
    const { data: conflicts } = await supabase
      .from('events')
      .select('id, status')
      .eq('tenant_id', chef.tenantId!)
      .eq('event_date', inquiry.confirmed_date)
      .neq('status', 'cancelled')

    calendarContext = conflicts && conflicts.length > 0
      ? `Date ${inquiry.confirmed_date} has ${conflicts.length} existing event(s) - may be UNAVAILABLE.`
      : `Date ${inquiry.confirmed_date} appears to be OPEN.`
  }

  const draft = await generateACEDraft({
    inquiryData: inquiry,
    manifesto: {},
    catalog: {},
    calendarContext,
    voiceFingerprint: 'Professional, concise, warm.',
    threadSensitivity: 50,
    clientLedger,
  })

  const flags: string[] = []
  if (draft.includes('[STATUS: ESCALATED]')) {
    flags.push('REVIEW_REQUIRED')
  }

  const cleanDraft = draft
    .replace('[STATUS: ESCALATED]', '')
    .replace('[FLAG: CHEF_REVIEW_REQUIRED]', '')
    .trim()

  return { draft: cleanDraft, flags }
}

// ─── Simple Response Draft ──────────────────────────────────────────────────

export async function draftSimpleResponse(
  context: string,
  tone: string,
  latestClientMessage: string,
) {
  await requireChef()
  return draftChefResponse(context, tone, latestClientMessage)
}

// ─── Post-Event Follow Up ───────────────────────────────────────────────────

export async function draftPostEventFollowUp(
  clientName: string,
  eventDate: string,
) {
  await requireChef()
  const dayName = new Date(eventDate).toLocaleDateString(undefined, { weekday: 'long' })
  const firstName = clientName.split(' ')[0]
  return `Hi ${firstName},

Just wanted to say thank you again for having me on ${dayName}. It was a pleasure cooking for you and your guests.

Hope everyone enjoyed the evening as much as I enjoyed preparing it.

Best,
Chef`
}
