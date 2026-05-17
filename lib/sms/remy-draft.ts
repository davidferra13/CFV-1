// Remy SMS Draft Generator
// When an inbound SMS arrives, Remy drafts a response for chef approval.
// NOT a 'use server' file; internal helper called from pipeline.

import { createServerClient } from '@/lib/db/server'

// ---------------------------------------------------------------------------
// Context builder: gather relevant info about the sender/thread
// ---------------------------------------------------------------------------

async function buildDraftContext(params: {
  tenantId: string
  threadId: string
  senderPhone: string
  content: string
  resolvedClientId: string | null
}): Promise<{
  clientName: string | null
  recentEvents: Array<{ occasion: string; date: string; status: string }>
  openInquiries: Array<{ id: string; occasion: string; status: string }>
  chefName: string
  contextSummary: Record<string, unknown>
}> {
  const db: any = createServerClient({ admin: true })

  let clientName: string | null = null
  let recentEvents: Array<{ occasion: string; date: string; status: string }> = []
  let openInquiries: Array<{ id: string; occasion: string; status: string }> = []

  // Chef business name
  const { data: chef } = await db
    .from('chefs')
    .select('business_name, first_name')
    .eq('id', params.tenantId)
    .single()

  const chefName = chef?.business_name || chef?.first_name || 'Your Chef'

  if (params.resolvedClientId) {
    // Client details
    const { data: client } = await db
      .from('clients')
      .select('full_name')
      .eq('id', params.resolvedClientId)
      .eq('tenant_id', params.tenantId)
      .maybeSingle()

    clientName = client?.full_name || null

    // Recent events for this client (last 3)
    const { data: events } = await db
      .from('events')
      .select('occasion, event_date, status')
      .eq('tenant_id', params.tenantId)
      .eq('client_id', params.resolvedClientId)
      .order('event_date', { ascending: false })
      .limit(3)

    recentEvents = (events || []).map((e: any) => ({
      occasion: e.occasion || 'Event',
      date: e.event_date || '',
      status: e.status || '',
    }))

    // Open inquiries
    const { data: inquiries } = await db
      .from('inquiries')
      .select('id, confirmed_occasion, status')
      .eq('tenant_id', params.tenantId)
      .eq('client_id', params.resolvedClientId)
      .in('status', ['new', 'awaiting_client', 'awaiting_chef', 'quoted'])
      .limit(3)

    openInquiries = (inquiries || []).map((i: any) => ({
      id: i.id,
      occasion: i.confirmed_occasion || 'Inquiry',
      status: i.status || '',
    }))
  }

  const contextSummary: Record<string, unknown> = {
    sender_phone: params.senderPhone,
    client_name: clientName,
    is_known_client: !!params.resolvedClientId,
    recent_event_count: recentEvents.length,
    open_inquiry_count: openInquiries.length,
    message_length: params.content.length,
  }

  return { clientName, recentEvents, openInquiries, chefName, contextSummary }
}

// ---------------------------------------------------------------------------
// Draft generator: builds a contextual response without AI
// Uses pattern matching and templates. Fast, deterministic, $0.
// ---------------------------------------------------------------------------

const BOOKING_KEYWORDS = /\b(book|reserve|hire|schedule|dinner|event|party|catering)\b/i
const PRICE_KEYWORDS = /\b(price|cost|rate|how much|quote|budget|pricing)\b/i
const CANCEL_KEYWORDS = /\b(cancel|reschedule|postpone|change date)\b/i
const DIET_KEYWORDS = /\b(allergy|allergic|vegan|vegetarian|gluten|dairy|kosher|halal|celiac)\b/i
const THANKS_KEYWORDS = /\b(thank|thanks|great|perfect|awesome|wonderful|sounds good)\b/i
const AVAILABILITY_KEYWORDS = /\b(available|free|open|when|date)\b/i

type DraftResult = {
  response: string
  confidence: number
  category: string
}

function generateDraft(
  content: string,
  ctx: Awaited<ReturnType<typeof buildDraftContext>>
): DraftResult {
  const greeting = ctx.clientName ? `Hi ${ctx.clientName}` : 'Hi there'
  const signoff = `- ${ctx.chefName}`

  // Cancellation/reschedule (high priority, needs careful handling)
  if (CANCEL_KEYWORDS.test(content)) {
    if (ctx.recentEvents.length > 0) {
      return {
        response: `${greeting}, I got your message. Let me check on that and get back to you shortly. ${signoff}`,
        confidence: 0.6,
        category: 'cancellation',
      }
    }
    return {
      response: `${greeting}, I received your message about making changes. I will look into this and follow up soon. ${signoff}`,
      confidence: 0.5,
      category: 'cancellation',
    }
  }

  // Dietary/allergy concern (important, needs specifics)
  if (DIET_KEYWORDS.test(content)) {
    return {
      response: `${greeting}, thank you for letting me know about your dietary needs. I will make a note of this and we can discuss the details. ${signoff}`,
      confidence: 0.65,
      category: 'dietary',
    }
  }

  // Pricing inquiry
  if (PRICE_KEYWORDS.test(content)) {
    return {
      response: `${greeting}, thanks for reaching out about pricing. I would love to learn more about your event so I can put together a quote. When works for a quick call? ${signoff}`,
      confidence: 0.7,
      category: 'pricing',
    }
  }

  // Booking/event inquiry
  if (BOOKING_KEYWORDS.test(content)) {
    const hasOpenInquiry = ctx.openInquiries.length > 0
    if (hasOpenInquiry) {
      return {
        response: `${greeting}, great to hear from you! I have your inquiry on file and will follow up with details soon. ${signoff}`,
        confidence: 0.75,
        category: 'booking',
      }
    }
    return {
      response: `${greeting}, thanks for your interest! I would love to hear more about what you are looking for. Could you share the date, guest count, and any preferences? ${signoff}`,
      confidence: 0.7,
      category: 'booking',
    }
  }

  // Availability check
  if (AVAILABILITY_KEYWORDS.test(content)) {
    return {
      response: `${greeting}, let me check my calendar and get back to you. Could you share the date you are thinking about? ${signoff}`,
      confidence: 0.65,
      category: 'availability',
    }
  }

  // Thank you / confirmation (simple ack)
  if (THANKS_KEYWORDS.test(content)) {
    return {
      response: `${greeting}, glad to hear it! Let me know if you need anything else. ${signoff}`,
      confidence: 0.8,
      category: 'acknowledgment',
    }
  }

  // General fallback for known clients
  if (ctx.clientName) {
    return {
      response: `${greeting}, thanks for your message. I will review it and get back to you shortly. ${signoff}`,
      confidence: 0.5,
      category: 'general',
    }
  }

  // General fallback for unknown contacts
  return {
    response: `Hi, thanks for reaching out. I received your message and will get back to you as soon as I can. ${signoff}`,
    confidence: 0.4,
    category: 'general',
  }
}

// ---------------------------------------------------------------------------
// Public API: create a Remy draft for an inbound SMS
// ---------------------------------------------------------------------------

export async function createRemySmsDraft(params: {
  tenantId: string
  threadId: string
  senderPhone: string
  content: string
  resolvedClientId: string | null
}): Promise<{ draftId: string; confidence: number } | null> {
  try {
    const db: any = createServerClient({ admin: true })

    // Skip if a pending draft already exists for this thread
    const { data: existing } = await db
      .from('sms_draft_responses')
      .select('id')
      .eq('thread_id', params.threadId)
      .eq('status', 'pending')
      .maybeSingle()

    if (existing?.id) {
      return { draftId: existing.id, confidence: 0 }
    }

    // Build context and generate draft
    const ctx = await buildDraftContext(params)
    const draft = generateDraft(params.content, ctx)

    // Store draft
    const { data: inserted, error } = await db
      .from('sms_draft_responses')
      .insert({
        tenant_id: params.tenantId,
        thread_id: params.threadId,
        sender_phone: params.senderPhone,
        original_message: params.content.slice(0, 2000),
        draft_response: draft.response,
        confidence_score: draft.confidence,
        context_used: {
          ...ctx.contextSummary,
          category: draft.category,
        },
        status: 'pending',
      })
      .select('id')
      .single()

    if (error || !inserted?.id) {
      console.error('[remy-draft] Failed to insert draft:', error?.message)
      return null
    }

    // Link draft to triage metadata
    try {
      await db
        .from('sms_triage_metadata')
        .update({ draft_id: inserted.id })
        .eq('thread_id', params.threadId)
        .eq('tenant_id', params.tenantId)
    } catch {
      // Non-fatal: triage row may not exist yet
    }

    return { draftId: inserted.id, confidence: draft.confidence }
  } catch (err) {
    console.error('[remy-draft] Unexpected error:', err)
    return null
  }
}
