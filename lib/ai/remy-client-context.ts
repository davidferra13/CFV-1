// Remy — Client Layer Context Loader
// Loads ONLY this client's data — scoped by tenant + client ID.
// PRIVACY: Client data = PII → must use Ollama. No cloud models.

import { createServerClient } from '@/lib/supabase/server'

export interface RemyClientContext {
  clientName: string | null
  chefName: string | null
  businessName: string | null
  upcomingEvents: Array<{
    id: string
    occasion: string | null
    date: string | null
    status: string
    guestCount: number | null
    venueAddress: string | null
  }>
  pastEvents: Array<{
    id: string
    occasion: string | null
    date: string | null
    status: string
  }>
  pendingQuotes: Array<{
    id: string
    totalCents: number
    status: string
    eventOccasion: string | null
  }>
  dietaryRestrictions: string | null
  allergies: string | null
  openInquiries: number
}

/**
 * Load client-scoped context for the authenticated client.
 * Uses the client's session — physically cannot access other clients' data.
 */
export async function loadRemyClientContext(
  clientId: string,
  tenantId: string
): Promise<RemyClientContext> {
  const supabase = createServerClient()

  // Load client profile
  const { data: client } = await supabase
    .from('clients')
    .select('full_name, dietary_restrictions, allergies')
    .eq('id', clientId)
    .eq('tenant_id', tenantId)
    .single()

  // Load chef info
  const { data: chef } = await supabase
    .from('chefs')
    .select('display_name, business_name')
    .eq('id', tenantId)
    .single()

  // Load upcoming events (not completed/cancelled)
  const { data: upcoming } = await supabase
    .from('events')
    .select('id, occasion, event_date, status, guest_count, location_address')
    .eq('client_id', clientId)
    .eq('tenant_id', tenantId)
    .not('status', 'in', '("completed","cancelled")')
    .order('event_date', { ascending: true })
    .limit(10)

  // Load past events
  const { data: past } = await supabase
    .from('events')
    .select('id, occasion, event_date, status')
    .eq('client_id', clientId)
    .eq('tenant_id', tenantId)
    .in('status', ['completed'])
    .order('event_date', { ascending: false })
    .limit(5)

  // Load pending quotes for this client's events
  const { data: quotes } = await supabase
    .from('quotes')
    .select('id, total_quoted_cents, status, event_id')
    .eq('tenant_id', tenantId)
    .in('status', ['draft', 'sent'])
    .limit(10)

  // Filter quotes to this client's events
  const clientEventIds = new Set([
    ...(upcoming ?? []).map((e) => e.id),
    ...(past ?? []).map((e) => e.id),
  ])
  const clientQuotes = (quotes ?? []).filter((q) => {
    return q.event_id && clientEventIds.has(q.event_id)
  })

  // Count open inquiries
  const { count: inquiryCount } = await supabase
    .from('inquiries')
    .select('id', { count: 'exact', head: true })
    .eq('client_id', clientId)
    .eq('tenant_id', tenantId)
    .in('status', ['new', 'awaiting_client', 'awaiting_chef'])

  return {
    clientName: client?.full_name ?? null,
    chefName: chef?.display_name ?? chef?.business_name ?? null,
    businessName: chef?.business_name ?? null,
    upcomingEvents: (upcoming ?? []).map((e) => ({
      id: e.id,
      occasion: e.occasion,
      date: e.event_date,
      status: e.status,
      guestCount: e.guest_count,
      venueAddress: e.location_address,
    })),
    pastEvents: (past ?? []).map((e) => ({
      id: e.id,
      occasion: e.occasion,
      date: e.event_date,
      status: e.status,
    })),
    pendingQuotes: clientQuotes.map((q) => ({
      id: q.id,
      totalCents: q.total_quoted_cents,
      status: q.status,
      eventOccasion: null, // Would need a join to get this
    })),
    dietaryRestrictions: client?.dietary_restrictions?.join(', ') ?? null,
    allergies: client?.allergies?.join(', ') ?? null,
    openInquiries: inquiryCount ?? 0,
  }
}

/**
 * Format client context into a system prompt section.
 */
export function formatClientContext(ctx: RemyClientContext): string {
  const parts: string[] = []

  parts.push(`\nYOUR CLIENT:
- Name: ${ctx.clientName ?? 'Client'}
- Chef: ${ctx.chefName ?? 'Your chef'}${ctx.businessName ? ` (${ctx.businessName})` : ''}`)

  if (ctx.dietaryRestrictions) {
    parts.push(`- Dietary restrictions: ${ctx.dietaryRestrictions}`)
  }
  if (ctx.allergies) {
    parts.push(`- Allergies: **${ctx.allergies.toUpperCase()}**`)
  }

  if (ctx.upcomingEvents.length > 0) {
    parts.push(`\nYOUR UPCOMING EVENTS:`)
    for (const e of ctx.upcomingEvents) {
      parts.push(
        `- ${e.occasion ?? 'Event'} on ${e.date ?? '(date TBD)'} — ${e.guestCount ?? '?'} guests — Status: ${e.status}${e.venueAddress ? ` — Venue: ${e.venueAddress}` : ''}`
      )
    }
  } else {
    parts.push(`\nNo upcoming events currently scheduled.`)
  }

  if (ctx.pastEvents.length > 0) {
    parts.push(`\nPAST EVENTS:`)
    for (const e of ctx.pastEvents) {
      parts.push(`- ${e.occasion ?? 'Event'} on ${e.date ?? '(no date)'}`)
    }
  }

  if (ctx.pendingQuotes.length > 0) {
    parts.push(`\nPENDING QUOTES:`)
    for (const q of ctx.pendingQuotes) {
      parts.push(
        `- ${q.eventOccasion ?? 'Quote'}: $${(q.totalCents / 100).toFixed(2)} (${q.status})`
      )
    }
  }

  if (ctx.openInquiries > 0) {
    parts.push(`\nOpen inquiries: ${ctx.openInquiries}`)
  }

  parts.push(`\nCLIENT PORTAL PAGES:
/my-events - Your events
/my-quotes - Your quotes
/my-spending - Payment history
/my-chat - Message Chef directly
/my-profile - Update your profile
/book-now - Book a new event`)

  parts.push(`\nGROUNDING RULE (CRITICAL):
You may ONLY reference events, quotes, and details that appear in the sections above.
If a section is empty, that means there are none — do not invent any.
NEVER fabricate event dates, amounts, or details.`)

  return parts.join('\n')
}
