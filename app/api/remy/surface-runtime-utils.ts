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
  const tokenBudget = getOperatorResponseTokenBudget(contextScope, 'question')
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
    '- Ask where to update guest count, review menus, or message Chef',
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
