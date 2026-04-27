import { determineContextScope, type ContextScope } from './stream/route-prompt-utils'
import { getOperatorResponseTokenBudget } from './stream/route-runtime-utils'

export type RemySurface = 'landing' | 'public' | 'client'

export interface SurfaceInstantContext {
  businessName?: string | null
  chefName?: string | null
  clientName?: string | null
  serviceArea?: string | null
  serviceTypes?: string[]
  dietaryCapabilities?: string[]
  upcomingEventCount?: number
  pendingQuoteCount?: number
  openInquiryCount?: number
  // Client-only enriched fields (from RemyClientContext)
  upcomingEvents?: Array<{
    occasion: string | null
    date: string | null
    status: string
    guestCount: number | null
    venueAddress: string | null
  }>
  pendingQuotes?: Array<{
    totalCents: number
    status: string
    eventOccasion: string | null
  }>
  dietaryRestrictions?: string | null
  allergies?: string | null
}

export interface SurfaceInstantAnswer {
  text: string
}

const HELP_PATTERN = /^(?:help|what\s+can\s+you\s+do|what\s+are\s+(?:you|your)\s+capabilit)/i
const GREETING_PATTERN =
  /^(?:good\s+morning|good\s+afternoon|good\s+evening|morning|afternoon|evening|hey|hi|hello|yo|sup|what'?s?\s+up)(?:\s+remy)?\s*[!.?]?$/i
const THANKS_PATTERN = /^(?:thanks|thank\s+you|thx|cheers|appreciate\s+it)\s*[!.?]*$/i

export function getSurfaceRuntimeOptions(message: string): {
  contextScope: ContextScope
  tokenBudget: number
} {
  const contextScope = determineContextScope(message, 'question')
  const operatorBudget = getOperatorResponseTokenBudget(contextScope, 'question')
  const tokenBudget =
    contextScope === 'minimal' ? 120 : contextScope === 'full' ? 420 : Math.min(operatorBudget, 260)
  return { contextScope, tokenBudget }
}

export function trySurfaceInstantAnswer(
  surface: RemySurface,
  message: string,
  context: SurfaceInstantContext = {}
): SurfaceInstantAnswer | null {
  const trimmed = message.trim()
  if (!trimmed) return null

  if (GREETING_PATTERN.test(trimmed)) {
    return { text: buildGreeting(surface, context) }
  }

  if (HELP_PATTERN.test(trimmed)) {
    return { text: buildHelp(surface, context) }
  }

  if (THANKS_PATTERN.test(trimmed)) {
    return { text: buildThanks(surface) }
  }

  // Client-only data-driven instant answers (no LLM needed)
  if (surface === 'client') {
    const clientAnswer = tryClientInstantAnswer(trimmed, context)
    if (clientAnswer) return clientAnswer
  }

  return null
}

export function createSurfaceLatencyTracker(surface: RemySurface, contextScope: ContextScope) {
  const startedAt = Date.now()
  let firstTokenAt: number | null = null

  return {
    logFastPath(kind: string) {
      console.log(
        `[remy-${surface}] fast-path kind=${kind} scope=${contextScope} total_ms=${Date.now() - startedAt}`
      )
    },
    markFirstToken() {
      if (firstTokenAt !== null) return
      firstTokenAt = Date.now()
      console.log(
        `[remy-${surface}] first-token scope=${contextScope} first_token_ms=${firstTokenAt - startedAt}`
      )
    },
    logDone(extra?: Record<string, unknown>) {
      const totalMs = Date.now() - startedAt
      const firstTokenMs = firstTokenAt === null ? null : firstTokenAt - startedAt
      const suffix = extra ? ` extra=${JSON.stringify(extra)}` : ''
      console.log(
        `[remy-${surface}] done scope=${contextScope} total_ms=${totalMs} first_token_ms=${firstTokenMs}${suffix}`
      )
    },
    logError(err: unknown) {
      const message = err instanceof Error ? err.message : String(err)
      console.error(
        `[remy-${surface}] error scope=${contextScope} total_ms=${Date.now() - startedAt} message=${message}`
      )
    },
  }
}

function buildGreeting(surface: RemySurface, context: SurfaceInstantContext): string {
  if (surface === 'landing') {
    return [
      'Hey.',
      'I can help with what ChefFlow does, how it works, and whether it fits your business.',
      'Ask about bookings, pricing workflow, client management, or daily ops.',
    ].join('\n\n')
  }

  if (surface === 'public') {
    const name = context.businessName ?? context.chefName ?? 'Chef'
    const detailParts: string[] = []
    if (context.serviceArea) {
      detailParts.push(`Service area: ${context.serviceArea}`)
    }
    if (context.serviceTypes && context.serviceTypes.length > 0) {
      detailParts.push(`Services: ${context.serviceTypes.slice(0, 3).join(', ')}`)
    }
    if (context.dietaryCapabilities && context.dietaryCapabilities.length > 0) {
      detailParts.push(
        `Dietary accommodations: ${context.dietaryCapabilities.slice(0, 3).join(', ')}`
      )
    }

    return [
      `Hey. I can help with ${name}'s services, cuisine, dietary accommodations, and booking questions.`,
      detailParts[0] ?? 'Ask about menus, event types, or how to inquire.',
      detailParts[1] ?? 'If you want to plan something, I can point you to the right next step.',
    ].join('\n\n')
  }

  const clientName = context.clientName ? `, ${context.clientName.split(' ')[0]}` : ''
  const statusParts: string[] = []
  if ((context.upcomingEventCount ?? 0) > 0) {
    statusParts.push(
      `You have ${context.upcomingEventCount} upcoming event${context.upcomingEventCount === 1 ? '' : 's'}.`
    )
  }
  if ((context.pendingQuoteCount ?? 0) > 0) {
    statusParts.push(
      `${context.pendingQuoteCount} pending quote${context.pendingQuoteCount === 1 ? '' : 's'} waiting on review.`
    )
  }

  return [
    `Hey${clientName}.`,
    'I can help with your upcoming events, quotes, dietary info, and portal questions.',
    statusParts[0] ??
      'Ask about your next event, quote status, or where to make changes in the portal.',
  ].join('\n\n')
}

function buildHelp(surface: RemySurface, context: SurfaceInstantContext): string {
  if (surface === 'landing') {
    return [
      'I can help with four things:',
      '- What ChefFlow does for chefs day to day',
      '- How bookings, clients, menus, and payments are handled',
      '- Whether it fits your workflow',
      'Ask a direct question and I will keep it short.',
    ].join('\n')
  }

  if (surface === 'public') {
    const name = context.businessName ?? context.chefName ?? 'Chef'
    return [
      `I can help with ${name}'s services, cuisine, dietary accommodations, and inquiry process.`,
      '- Ask about event types, menus, or food style',
      '- Ask how inquiries work or what info to send',
      '- Ask whether Chef handles a dietary need or service area',
    ].join('\n')
  }

  return [
    'I can help with your event details, quote status, dietary info, loyalty points, and where to find things in the portal.',
    '- Ask about your next event',
    '- Ask about pending quotes or payments',
    '- Ask where to request a guest-count change, review menus, or message Chef',
  ].join('\n')
}

function buildThanks(surface: RemySurface): string {
  if (surface === 'landing') {
    return 'Anytime. If you want, ask me about the part of ChefFlow you are most unsure about.'
  }

  if (surface === 'public') {
    return 'Anytime. If you want to plan an event, the inquiry form is the best next step.'
  }

  return 'Anytime. If you need anything about your event or quote, just ask.'
}

// ─── Client Data-Driven Instant Answers ──────────────────────────────────

const CLIENT_EVENT_PATTERN =
  /^(?:when\s+is\s+my\s+(?:next\s+)?event|(?:my\s+)?(?:next|upcoming)\s+event|what\s+events?\s+do\s+i\s+have|(?:do\s+i\s+have\s+)?(?:any\s+)?upcoming\s+events?)\s*\??$/i

const CLIENT_MENU_PATTERN =
  /^(?:what'?s?\s+(?:on\s+)?(?:the|my)\s+menu|menu|dishes|what\s+(?:are|is)\s+(?:we|the?\s+chef)\s+(?:making|cooking|serving))\s*\??$/i

const CLIENT_DIETARY_PATTERN =
  /^(?:(?:my\s+)?(?:dietary|diet|allerg(?:y|ies)|restriction|food\s+(?:allerg|restriction))(?:\s+(?:info|profile|details))?|what\s+(?:are\s+)?my\s+(?:allerg|dietary|restriction))\s*\??$/i

const CLIENT_COST_PATTERN =
  /^(?:how\s+much|(?:my\s+)?(?:total|cost|price|quote|payment|balance)|what\s+(?:do\s+i\s+owe|is\s+(?:the|my)\s+(?:total|quote|cost)))\s*\??$/i

const CLIENT_CHEF_PATTERN =
  /^(?:who\s+is\s+my\s+chef|chef\s+(?:info|name|contact|details)|my\s+chef)\s*\??$/i

function tryClientInstantAnswer(
  message: string,
  context: SurfaceInstantContext
): SurfaceInstantAnswer | null {
  if (CLIENT_EVENT_PATTERN.test(message)) {
    return { text: buildClientEventAnswer(context) }
  }
  if (CLIENT_DIETARY_PATTERN.test(message)) {
    return { text: buildClientDietaryAnswer(context) }
  }
  if (CLIENT_COST_PATTERN.test(message)) {
    return { text: buildClientCostAnswer(context) }
  }
  if (CLIENT_CHEF_PATTERN.test(message)) {
    return { text: buildClientChefAnswer(context) }
  }
  // Menu pattern intentionally NOT instant-answered; menus are complex and
  // better handled by the LLM with full context.
  return null
}

function buildClientEventAnswer(ctx: SurfaceInstantContext): string {
  const events = ctx.upcomingEvents
  if (!events || events.length === 0) {
    return 'No upcoming events on the books right now. If you want to plan something, reach out to your chef!'
  }
  if (events.length === 1) {
    const e = events[0]
    const parts = [`Your next event: **${e.occasion ?? 'Event'}**`]
    if (e.date) parts[0] += ` on **${e.date}**`
    if (e.venueAddress) parts.push(`Location: ${e.venueAddress}`)
    if (e.guestCount) parts.push(`Guest count: ${e.guestCount}`)
    parts.push(`Status: ${e.status}`)
    return parts.join('\n')
  }
  const lines = events.slice(0, 5).map((e) => {
    const label = e.occasion ?? 'Event'
    const date = e.date ? ` - ${e.date}` : ''
    const guests = e.guestCount ? ` (${e.guestCount} guests)` : ''
    return `- **${label}**${date}${guests} [${e.status}]`
  })
  return `You have **${events.length}** upcoming event${events.length === 1 ? '' : 's'}:\n${lines.join('\n')}`
}

function buildClientDietaryAnswer(ctx: SurfaceInstantContext): string {
  const parts: string[] = []
  if (ctx.dietaryRestrictions) {
    parts.push(`**Dietary restrictions:** ${ctx.dietaryRestrictions}`)
  }
  if (ctx.allergies) {
    parts.push(`**Allergies:** ${ctx.allergies}`)
  }
  if (parts.length === 0) {
    return "No dietary restrictions or allergies on file. If you'd like to add any, let your chef know or update your profile in the portal."
  }
  parts.push('\nIf anything has changed, let your chef know so they can update your profile.')
  return parts.join('\n')
}

function buildClientCostAnswer(ctx: SurfaceInstantContext): string {
  const quotes = ctx.pendingQuotes
  if (!quotes || quotes.length === 0) {
    return 'No pending quotes right now. Your chef will send one when your event details are finalized.'
  }
  if (quotes.length === 1) {
    const q = quotes[0]
    const amount = `$${(q.totalCents / 100).toFixed(2)}`
    const event = q.eventOccasion ? ` for **${q.eventOccasion}**` : ''
    return `You have a pending quote${event}: **${amount}** (${q.status}).`
  }
  const lines = quotes.slice(0, 5).map((q) => {
    const amount = `$${(q.totalCents / 100).toFixed(2)}`
    const event = q.eventOccasion ?? 'Event'
    return `- **${event}**: ${amount} (${q.status})`
  })
  return `You have **${quotes.length}** pending quote${quotes.length === 1 ? '' : 's'}:\n${lines.join('\n')}`
}

function buildClientChefAnswer(ctx: SurfaceInstantContext): string {
  const name = ctx.chefName ?? ctx.businessName
  if (!name) {
    return 'Your chef info is available in the portal. Check your event details for contact information.'
  }
  const parts = [`Your chef: **${name}**`]
  if (ctx.businessName && ctx.chefName && ctx.businessName !== ctx.chefName) {
    parts.push(`Business: ${ctx.businessName}`)
  }
  if (ctx.serviceArea) {
    parts.push(`Service area: ${ctx.serviceArea}`)
  }
  return parts.join('\n')
}
