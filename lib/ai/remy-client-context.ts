// Remy - Client Layer Context Loader
// Loads ONLY this client's data - scoped by tenant + client ID.
// PRIVACY: Client data = PII and must stay on the client-safe runtime path.

import { createServerClient } from '@/lib/db/server'
import { getClientWorkGraphSnapshot } from '@/lib/client-work-graph/actions'
import { sanitizeForPrompt, fenceForPrompt } from '@/lib/ai/remy-input-validation'
import type { ClientWorkGraph } from '@/lib/client-work-graph/types'
import {
  buildClientContinuitySummary,
  getClientContinuityChangeDigest,
  type ClientContinuitySummary,
} from '@/lib/client-continuity'
import { type RemyClientContextCategory } from '@/lib/ai/remy-client-context-policy'
import { auditRemyClientBoundary } from '@/lib/ai/remy-client-boundary-audit'

const REMY_CLIENT_CONTEXT_CATEGORIES = [
  'profile',
  'dietary',
  'event',
  'quote',
  'loyalty',
  'work_graph',
] as const satisfies readonly RemyClientContextCategory[]

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
    pendingGuestCountChange: {
      previousCount: number
      newCount: number
    } | null
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
  contextSourceLabels: string[]
  actionableItemCount: number
  continuitySummary: ClientContinuitySummary
  workGraph: ClientWorkGraph
  workItems: Array<{
    title: string
    detail: string
    href: string
    ctaLabel: string
  }>
}

/**
 * Load client-scoped context for the authenticated client.
 * Uses the shared work-graph snapshot so Remy and the client UI see the same next actions.
 */
export async function loadRemyClientContext(
  clientId: string,
  tenantId: string
): Promise<RemyClientContext> {
  const db: any = createServerClient()

  const [snapshot, { data: client }, { data: chef }, { data: earnedRows }, { data: config }] =
    await Promise.all([
      getClientWorkGraphSnapshot({ pastLimit: 5 }),
      db
        .from('clients')
        .select(
          'auth_user_id, full_name, dietary_restrictions, allergies, loyalty_tier, loyalty_points'
        )
        .eq('id', clientId)
        .eq('tenant_id', tenantId)
        .single(),
      db.from('chefs').select('display_name, business_name').eq('id', tenantId).single(),
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

  const openInquiryCount = (snapshot.inquiries ?? []).filter((inquiry: any) =>
    ['new', 'awaiting_client', 'awaiting_chef'].includes(String(inquiry.status))
  ).length
  const pendingQuotes = (snapshot.quotes ?? []).filter((quote: any) => quote.status === 'sent')
  const boundaryAudit = auditRemyClientBoundary({
    requestedCategories: REMY_CLIENT_CONTEXT_CATEGORIES,
  })
  if (!boundaryAudit.pass) {
    throw new Error(`Blocked Remy client context categories: ${boundaryAudit.violationCount}`)
  }

  const lifetimePoints = (earnedRows || []).reduce(
    (sum: number, row: { points?: number | null }) => sum + (row.points || 0),
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
  const changeDigest = await getClientContinuityChangeDigest({
    tenantId,
    clientId,
    authUserId: client?.auth_user_id ?? '',
  })
  const continuitySummary = buildClientContinuitySummary(snapshot.workGraph, {
    snapshot,
    changeDigest,
  })

  return {
    clientName: client?.full_name ?? null,
    chefName: chef?.display_name ?? chef?.business_name ?? null,
    businessName: chef?.business_name ?? null,
    upcomingEvents: (snapshot.eventsResult.upcoming ?? []).map((event: any) => ({
      id: event.id,
      occasion: event.occasion,
      date: event.event_date,
      status: event.status,
      guestCount: event.guest_count,
      venueAddress: event.location_address,
      pendingGuestCountChange: event.pendingGuestCountChange
        ? {
            previousCount: Number(event.pendingGuestCountChange.previousCount),
            newCount: Number(event.pendingGuestCountChange.newCount),
          }
        : null,
    })),
    pastEvents: (snapshot.eventsResult.past ?? []).map((event: any) => ({
      id: event.id,
      occasion: event.occasion,
      date: event.event_date,
      status: event.status,
    })),
    pendingQuotes: pendingQuotes.map((quote: any) => ({
      id: quote.id,
      totalCents: quote.total_quoted_cents,
      status: quote.status,
      eventOccasion: quote.quote_name ?? (quote.inquiry as any)?.confirmed_occasion ?? null,
    })),
    dietaryRestrictions: client?.dietary_restrictions?.join(', ') ?? null,
    allergies: client?.allergies?.join(', ') ?? null,
    openInquiries: openInquiryCount,
    loyaltyTier: tier,
    loyaltyPointsBalance: client?.loyalty_points ?? 0,
    loyaltyLifetimePoints: lifetimePoints,
    nextTierName,
    pointsToNextTier,
    contextSourceLabels: boundaryAudit.sourceLabels,
    actionableItemCount: snapshot.workGraph.summary.totalItems,
    continuitySummary,
    workGraph: snapshot.workGraph,
    workItems: snapshot.workGraph.items.slice(0, 5).map((item) => ({
      title: item.title,
      detail: item.detail,
      href: item.href,
      ctaLabel: item.ctaLabel,
    })),
  }
}

/**
 * Format client context into a system prompt section.
 */
export function formatClientContext(ctx: RemyClientContext): string {
  const parts: string[] = []

  parts.push(`\nYOUR CLIENT:
- Name: ${fenceForPrompt('client_name', sanitizeForPrompt(ctx.clientName ?? 'Client'))}
- Chef: ${fenceForPrompt('chef_name', sanitizeForPrompt(ctx.chefName ?? 'Your chef'))}${ctx.businessName ? ` (${fenceForPrompt('business_name', sanitizeForPrompt(ctx.businessName))})` : ''}`)

  if (ctx.contextSourceLabels.length > 0) {
    parts.push(
      `- Context sources: ${ctx.contextSourceLabels.map((label) => fenceForPrompt('context_source', sanitizeForPrompt(label))).join(', ')}`
    )
  }

  if (ctx.dietaryRestrictions) {
    parts.push(
      `- Dietary restrictions: ${fenceForPrompt('dietary_restrictions', sanitizeForPrompt(ctx.dietaryRestrictions))}`
    )
  }
  if (ctx.allergies) {
    parts.push(
      `- Allergies: **${fenceForPrompt('allergies', sanitizeForPrompt(ctx.allergies.toUpperCase()))}**`
    )
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
    for (const event of ctx.upcomingEvents) {
      parts.push(
        `- ${fenceForPrompt('occasion', sanitizeForPrompt(event.occasion ?? 'Event'))} on ${event.date ?? '(date TBD)'} - ${event.guestCount ?? '?'} guests - Status: ${event.status}${event.venueAddress ? ` - Venue: ${fenceForPrompt('venue_address', sanitizeForPrompt(event.venueAddress))}` : ''}`
      )
      if (event.pendingGuestCountChange) {
        parts.push(
          `  Pending guest-count request: ${event.pendingGuestCountChange.previousCount} to ${event.pendingGuestCountChange.newCount} guests`
        )
      }
    }
  } else {
    parts.push(`\nNo upcoming events currently scheduled.`)
  }

  if (ctx.pastEvents.length > 0) {
    parts.push(`\nPAST EVENTS:`)
    for (const event of ctx.pastEvents) {
      parts.push(
        `- ${fenceForPrompt('occasion', sanitizeForPrompt(event.occasion ?? 'Event'))} on ${event.date ?? '(no date)'}`
      )
    }
  }

  if (ctx.pendingQuotes.length > 0) {
    parts.push(`\nPENDING QUOTES:`)
    for (const quote of ctx.pendingQuotes) {
      parts.push(
        `- ${fenceForPrompt('event_occasion', sanitizeForPrompt(quote.eventOccasion ?? 'Quote'))}: $${(quote.totalCents / 100).toFixed(2)} (${quote.status})`
      )
    }
  }

  if (ctx.openInquiries > 0) {
    parts.push(`\nOpen inquiries: ${ctx.openInquiries}`)
  }

  if (ctx.workItems.length > 0) {
    parts.push(`\nCURRENT CLIENT WORK ITEMS (${ctx.actionableItemCount} total):`)
    for (const item of ctx.workItems) {
      parts.push(`- ${item.title} -> ${item.href} (${item.ctaLabel})`)
    }
  }

  parts.push(`\nCURRENT RETURN STATE:`)
  parts.push(`- Status: ${ctx.continuitySummary.caughtUp ? 'caught up' : 'action needed'}`)
  parts.push(
    `- Headline: ${fenceForPrompt('return_headline', sanitizeForPrompt(ctx.continuitySummary.headline))}`
  )
  parts.push(
    `- Detail: ${fenceForPrompt('return_detail', sanitizeForPrompt(ctx.continuitySummary.detail))}`
  )
  if (ctx.continuitySummary.primaryNextStep) {
    parts.push(
      `- Primary next step: ${fenceForPrompt('next_step', sanitizeForPrompt(ctx.continuitySummary.primaryNextStep.label))} -> ${ctx.continuitySummary.primaryNextStep.href} (${ctx.continuitySummary.primaryNextStep.ctaLabel})`
    )
  }
  if (ctx.continuitySummary.counts.length > 0) {
    parts.push(
      `- Current counts: ${ctx.continuitySummary.counts.map((count) => `${count.label}: ${count.count}`).join(', ')}`
    )
  }
  parts.push(
    `- Changes since away: ${fenceForPrompt('change_digest', sanitizeForPrompt(ctx.continuitySummary.changeDigest.label))}`
  )
  if (ctx.continuitySummary.changeDigest.items.length > 0) {
    for (const item of ctx.continuitySummary.changeDigest.items.slice(0, 5)) {
      parts.push(
        `  - ${fenceForPrompt('change_title', sanitizeForPrompt(item.label))} -> ${item.href} (${item.readAt ? 'read' : 'unread'})`
      )
    }
  }

  parts.push(`\nCLIENT PORTAL PAGES:
/my-events - Your events
/my-quotes - Your quotes
/my-spending - Payment history
/my-chat - Message Chef directly
/my-profile - Update your profile
/my-hub - Circles, guests, and planning updates
/book-now - Book a new event`)

  parts.push(`\nGROUNDING RULE (CRITICAL):
You may ONLY reference events, quotes, work items, return state, and details that appear in the sections above.
If a section is empty, that means there are none - do not invent any.
When suggesting navigation, prefer the listed work-item routes above.
NEVER fabricate event dates, amounts, or details.`)

  return parts.join('\n')
}
