// Remy - Client Layer Context Loader
// Loads ONLY this client's data - scoped by tenant + client ID.
// PRIVACY: Client data = PII → must use Ollama. No cloud models.

import { createServerClient } from '@/lib/db/server'

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
  loyaltyTier: 'bronze' | 'silver' | 'gold' | 'platinum'
  loyaltyPointsBalance: number
  loyaltyLifetimePoints: number
  nextTierName: 'silver' | 'gold' | 'platinum' | null
  pointsToNextTier: number
}

/**
 * Load client-scoped context for the authenticated client.
 * Uses the client's session - physically cannot access other clients' data.
 */
export async function loadRemyClientContext(
  clientId: string,
  tenantId: string
): Promise<RemyClientContext> {
  const db: any = createServerClient()

  // Load client profile
  const { data: client } = await db
    .from('clients')
    .select('full_name, dietary_restrictions, allergies, loyalty_tier, loyalty_points')
    .eq('id', clientId)
    .eq('tenant_id', tenantId)
    .single()

  // Load chef info
  const { data: chef } = await db
    .from('chefs')
    .select('display_name, business_name')
    .eq('id', tenantId)
    .single()

  // Load upcoming events (not completed/cancelled)
  const { data: upcoming } = await db
    .from('events')
    .select('id, occasion, event_date, status, guest_count, location_address')
    .eq('client_id', clientId)
    .eq('tenant_id', tenantId)
    .not('status', 'in', '("completed","cancelled")')
    .order('event_date', { ascending: true })
    .limit(10)

  // Load past events
  const { data: past } = await db
    .from('events')
    .select('id, occasion, event_date, status')
    .eq('client_id', clientId)
    .eq('tenant_id', tenantId)
    .in('status', ['completed'])
    .order('event_date', { ascending: false })
    .limit(5)

  // Load pending quotes for this client's events
  const { data: quotes } = await db
    .from('quotes')
    .select('id, total_quoted_cents, status, event_id')
    .eq('tenant_id', tenantId)
    .in('status', ['draft', 'sent'])
    .limit(10)

  // Filter quotes to this client's events
  const clientEventIds = new Set([
    ...(upcoming ?? []).map((e: any) => e.id),
    ...(past ?? []).map((e: any) => e.id),
  ])
  const clientQuotes = (quotes ?? []).filter((q: any) => {
    return q.event_id && clientEventIds.has(q.event_id)
  })

  // Count open inquiries
  const { count: inquiryCount } = await db
    .from('inquiries')
    .select('id', { count: 'exact', head: true })
    .eq('client_id', clientId)
    .eq('tenant_id', tenantId)
    .in('status', ['new', 'awaiting_client', 'awaiting_chef'])

  const [{ data: earnedRows }, { data: config }] = await Promise.all([
    db
      .from('loyalty_transactions')
      .select('points')
      .eq('tenant_id', tenantId)
      .eq('client_id', clientId)
      .in('type', ['earned', 'bonus']),
    db
      .from('loyalty_config')
      .select('tier_silver_min, tier_gold_min, tier_platinum_min')
      .eq('tenant_id', tenantId)
      .single(),
  ])

  const lifetimePoints = (earnedRows || []).reduce(
    (sum: any, row: any) => sum + (row.points || 0),
    0
  )
  const tier = ((client?.loyalty_tier as 'bronze' | 'silver' | 'gold' | 'platinum') || 'bronze') as
    | 'bronze'
    | 'silver'
    | 'gold'
    | 'platinum'

  const nextTierName =
    tier === 'bronze' ? 'silver' : tier === 'silver' ? 'gold' : tier === 'gold' ? 'platinum' : null
  const nextTierThreshold =
    nextTierName === 'silver'
      ? (config?.tier_silver_min ?? 100)
      : nextTierName === 'gold'
        ? (config?.tier_gold_min ?? 250)
        : nextTierName === 'platinum'
          ? (config?.tier_platinum_min ?? 500)
          : null
  const pointsToNextTier =
    nextTierThreshold !== null ? Math.max(0, nextTierThreshold - lifetimePoints) : 0

  return {
    clientName: client?.full_name ?? null,
    chefName: chef?.display_name ?? chef?.business_name ?? null,
    businessName: chef?.business_name ?? null,
    upcomingEvents: (upcoming ?? []).map((e: any) => ({
      id: e.id,
      occasion: e.occasion,
      date: e.event_date,
      status: e.status,
      guestCount: e.guest_count,
      venueAddress: e.location_address,
    })),
    pastEvents: (past ?? []).map((e: any) => ({
      id: e.id,
      occasion: e.occasion,
      date: e.event_date,
      status: e.status,
    })),
    pendingQuotes: clientQuotes.map((q: any) => ({
      id: q.id,
      totalCents: q.total_quoted_cents,
      status: q.status,
      eventOccasion: null, // Would need a join to get this
    })),
    dietaryRestrictions: client?.dietary_restrictions?.join(', ') ?? null,
    allergies: client?.allergies?.join(', ') ?? null,
    openInquiries: inquiryCount ?? 0,
    loyaltyTier: tier,
    loyaltyPointsBalance: client?.loyalty_points ?? 0,
    loyaltyLifetimePoints: lifetimePoints,
    nextTierName,
    pointsToNextTier,
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
  parts.push(
    `- Loyalty: ${ctx.loyaltyTier} tier, ${ctx.loyaltyPointsBalance.toLocaleString()} points balance`
  )
  if (ctx.nextTierName) {
    parts.push(
      `- Progress: ${ctx.pointsToNextTier.toLocaleString()} points to ${ctx.nextTierName} tier`
    )
  }

  if (ctx.upcomingEvents.length > 0) {
    parts.push(`\nYOUR UPCOMING EVENTS:`)
    for (const e of ctx.upcomingEvents) {
      parts.push(
        `- ${e.occasion ?? 'Event'} on ${e.date ?? '(date TBD)'} - ${e.guestCount ?? '?'} guests - Status: ${e.status}${e.venueAddress ? ` - Venue: ${e.venueAddress}` : ''}`
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
If a section is empty, that means there are none - do not invent any.
NEVER fabricate event dates, amounts, or details.`)

  return parts.join('\n')
}
