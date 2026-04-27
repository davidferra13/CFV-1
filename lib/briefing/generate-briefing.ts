'use server'

import { z } from 'zod'
import { parseWithOllama } from '@/lib/ai/parse-ollama'
import { OllamaOfflineError } from '@/lib/ai/ollama-errors'
import { aggregateBriefingContext } from './aggregate-context'
import type { BriefingContext, BriefingDocument, BriefingFallback } from './types'

// ---------------------------------------------------------------------------
// Zod schema for AI output
// ---------------------------------------------------------------------------

const BriefingSectionsSchema = z.object({
  clientRecap: z.string(),
  eventVitals: z.string(),
  dietaryRiskSummary: z.string(),
  menuIntelligence: z.string(),
  clientHistory: z.string(),
  logistics: z.string(),
  financialContext: z.string(),
  prepStatus: z.string(),
  talkingPoints: z.array(z.string()),
  redFlags: z.array(
    z.object({
      label: z.string(),
      details: z.string(),
      severity: z.enum(['critical', 'warning']),
    })
  ),
})

// ---------------------------------------------------------------------------
// System prompt
// ---------------------------------------------------------------------------

const BRIEFING_SYSTEM_PROMPT = `You are a briefing generator for a private chef's event management system.

Given structured context about an upcoming event, generate a comprehensive pre-event briefing document.

Return JSON with this exact structure:
{
  "clientRecap": "2-3 sentence summary of who the client is, what matters to them, key preferences from their memory",
  "eventVitals": "Date, time, location, guest count, occasion, service style in a scannable format",
  "dietaryRiskSummary": "All allergies, restrictions, and conflicts with the current menu. If no risks, say so clearly",
  "menuIntelligence": "What's being served, any repeat dishes from past events, complexity notes, course flow",
  "clientHistory": "Past event count, last event date and outcome, recurring patterns, what went well or poorly",
  "logistics": "Travel time, access instructions, site notes, parking, weather if available",
  "financialContext": "Quoted price, payment status, outstanding balance. Flag if unpaid close to event",
  "prepStatus": "What's ready vs not ready. Flag anything critical that's incomplete",
  "talkingPoints": ["Natural conversation starters based on client context - kids, traditions, last event memories"],
  "redFlags": [{"label": "short description", "details": "why this matters and what to do", "severity": "critical|warning"}]
}

Rules:
- ONLY use facts from the provided context. Never fabricate information.
- If a section has no relevant data, write "No data available" (not empty string).
- Red flags should only be things that genuinely need attention: allergy conflicts, unpaid balances near event, missing prep items, guest count changes.
- Talking points should feel natural, not forced. Based on real client data only.
- Keep each section concise. This is a quick-read document, not an essay.
- Financial amounts are in cents. Convert to dollars for display (divide by 100).
- Dietary risks are the highest priority section. If there's an allergy that conflicts with the menu, that's always a critical red flag.`

// ---------------------------------------------------------------------------
// Serialize context for AI consumption
// ---------------------------------------------------------------------------

function serializeContext(ctx: BriefingContext): string {
  const parts: string[] = []

  // Event
  parts.push('=== EVENT ===')
  parts.push(`Occasion: ${ctx.event.occasion || 'Not specified'}`)
  parts.push(`Date: ${ctx.event.eventDate}`)
  parts.push(`Serve time: ${ctx.event.serveTime || 'TBD'}`)
  parts.push(`Arrival time: ${ctx.event.arrivalTime || 'TBD'}`)
  parts.push(
    `Guest count: ${ctx.event.guestCount ?? 'TBD'}${ctx.event.guestCountConfirmed ? ` (${ctx.event.guestCountConfirmed} confirmed)` : ''}`
  )
  parts.push(`Service style: ${ctx.event.serviceStyle || 'TBD'}`)
  parts.push(`Status: ${ctx.event.status}`)
  if (ctx.event.specialRequests) parts.push(`Special requests: ${ctx.event.specialRequests}`)
  if (ctx.event.notes) parts.push(`Notes: ${ctx.event.notes}`)
  if (ctx.event.dietaryNotes) parts.push(`Dietary notes: ${ctx.event.dietaryNotes}`)
  if (ctx.event.allergies.length) parts.push(`Allergies: ${ctx.event.allergies.join(', ')}`)
  if (ctx.event.dietaryRestrictions.length)
    parts.push(`Dietary restrictions: ${ctx.event.dietaryRestrictions.join(', ')}`)

  // Location
  parts.push('\n=== LOCATION ===')
  parts.push(`Address: ${ctx.event.locationAddress || 'Not set'}`)
  if (ctx.event.locationCity) parts.push(`City: ${ctx.event.locationCity}`)
  if (ctx.event.locationNotes) parts.push(`Location notes: ${ctx.event.locationNotes}`)
  if (ctx.event.accessInstructions) parts.push(`Access: ${ctx.event.accessInstructions}`)
  if (ctx.event.siteNotes) parts.push(`Site notes: ${ctx.event.siteNotes}`)
  if (ctx.event.alcoholBeingServed != null)
    parts.push(`Alcohol: ${ctx.event.alcoholBeingServed ? 'yes' : 'no'}`)

  // Client
  if (ctx.client) {
    parts.push('\n=== CLIENT ===')
    parts.push(`Name: ${ctx.client.name}`)
    if (ctx.client.email) parts.push(`Email: ${ctx.client.email}`)
    if (ctx.client.phone) parts.push(`Phone: ${ctx.client.phone}`)
  }

  // Client memories
  if (ctx.clientMemories.length > 0) {
    parts.push('\n=== CLIENT MEMORY ===')
    for (const mem of ctx.clientMemories) {
      const val = Array.isArray(mem.value) ? (mem.value as string[]).join(', ') : String(mem.value)
      parts.push(
        `${mem.key}: ${val}${mem.pinned ? ' [PINNED]' : ''} (confidence: ${mem.confidence}%)`
      )
    }
  }

  // Past events
  if (ctx.pastEvents.length > 0) {
    parts.push('\n=== PAST EVENTS WITH CLIENT ===')
    for (const pe of ctx.pastEvents) {
      let line = `${pe.eventDate} - ${pe.occasion || 'Event'} (${pe.guestCount ?? '?'} guests)`
      if (pe.chefOutcomeRating) line += ` - Rating: ${pe.chefOutcomeRating}/5`
      if (pe.chefOutcomeNotes) line += ` - Notes: ${pe.chefOutcomeNotes}`
      parts.push(line)
    }
  }

  // Menus
  if (ctx.menus.length > 0) {
    parts.push('\n=== MENUS ===')
    for (const menu of ctx.menus) {
      parts.push(`Menu: ${menu.name} (${menu.serviceStyle || 'style TBD'})`)
      for (const dish of menu.dishes) {
        let line = `  - ${dish.name || dish.courseName}`
        if (dish.dietaryTags.length) line += ` [${dish.dietaryTags.join(', ')}]`
        if (dish.allergenFlags.length) line += ` ALLERGENS: ${dish.allergenFlags.join(', ')}`
        parts.push(line)
      }
    }
  }

  // Financial
  parts.push('\n=== FINANCIAL ===')
  parts.push(
    `Quoted: ${ctx.financial.quotedPriceCents != null ? `$${(ctx.financial.quotedPriceCents / 100).toFixed(2)}` : 'Not set'}`
  )
  parts.push(`Paid: $${(ctx.financial.totalPaidCents / 100).toFixed(2)}`)
  parts.push(`Outstanding: $${(ctx.financial.outstandingBalanceCents / 100).toFixed(2)}`)
  parts.push(`Payment status: ${ctx.financial.paymentStatus || 'unknown'}`)

  // Prep status
  parts.push('\n=== PREP STATUS ===')
  const prepItems = [
    { label: 'Grocery list', ready: ctx.prepStatus.groceryListReady },
    { label: 'Prep list', ready: ctx.prepStatus.prepListReady },
    { label: 'Equipment list', ready: ctx.prepStatus.equipmentListReady },
    { label: 'Packing list', ready: ctx.prepStatus.packingListReady },
    { label: 'Timeline', ready: ctx.prepStatus.timelineReady },
    { label: 'Travel route', ready: ctx.prepStatus.travelRouteReady },
  ]
  for (const item of prepItems) {
    parts.push(`${item.ready ? '[DONE]' : '[NOT DONE]'} ${item.label}`)
  }

  // Travel
  if (ctx.travelInfo) {
    parts.push('\n=== TRAVEL ===')
    parts.push(`Distance: ${ctx.travelInfo.distanceMiles.toFixed(1)} miles`)
    parts.push(`Drive time: ${ctx.travelInfo.durationMinutes} minutes`)
  }

  // Weather
  if (ctx.weather) {
    parts.push('\n=== WEATHER ===')
    parts.push(
      `${ctx.weather.summary}, ${ctx.weather.temperatureF}F, ${ctx.weather.precipChance}% rain`
    )
  }

  // Recent messages
  if (ctx.recentMessages.length > 0) {
    parts.push('\n=== RECENT MESSAGES ===')
    for (const msg of ctx.recentMessages.slice(0, 5)) {
      parts.push(`[${msg.senderName || 'unknown'}]: ${msg.content.slice(0, 200)}`)
    }
  }

  return parts.join('\n')
}

// ---------------------------------------------------------------------------
// Generate briefing (AI path)
// ---------------------------------------------------------------------------

export async function generateEventBriefing(
  eventId: string
): Promise<BriefingDocument | BriefingFallback> {
  const context = await aggregateBriefingContext(eventId)
  const serialized = serializeContext(context)

  try {
    const sections = await parseWithOllama(
      BRIEFING_SYSTEM_PROMPT,
      serialized,
      BriefingSectionsSchema,
      { modelTier: 'standard', maxTokens: 2048, timeoutMs: 30000 }
    )

    // Build full document for print/copy
    const fullDoc = buildFullDocument(sections, context)

    return {
      eventId,
      generatedAt: new Date().toISOString(),
      sections,
      fullDocument: fullDoc,
      staleAfter: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString(), // 4 hours
    }
  } catch (err) {
    if (err instanceof OllamaOfflineError) {
      // Return raw context as fallback
      return {
        type: 'fallback',
        context,
        generatedAt: new Date().toISOString(),
      }
    }
    throw err
  }
}

// ---------------------------------------------------------------------------
// Build printable full document
// ---------------------------------------------------------------------------

function buildFullDocument(
  sections: z.infer<typeof BriefingSectionsSchema>,
  context: BriefingContext
): string {
  const lines: string[] = []
  const divider = '----------------------------------------'

  lines.push(`PRE-EVENT BRIEFING: ${context.event.occasion || 'Event'}`)
  lines.push(`Client: ${context.client?.name || 'Unknown'}`)
  lines.push(`Date: ${context.event.eventDate}`)
  lines.push(divider)

  if (sections.redFlags.length > 0) {
    lines.push('')
    lines.push('!! RED FLAGS !!')
    for (const flag of sections.redFlags) {
      const marker = flag.severity === 'critical' ? '[CRITICAL]' : '[WARNING]'
      lines.push(`${marker} ${flag.label}: ${flag.details}`)
    }
    lines.push(divider)
  }

  const sectionPairs: [string, string][] = [
    ['CLIENT RECAP', sections.clientRecap],
    ['EVENT VITALS', sections.eventVitals],
    ['DIETARY RISK SUMMARY', sections.dietaryRiskSummary],
    ['MENU INTELLIGENCE', sections.menuIntelligence],
    ['CLIENT HISTORY', sections.clientHistory],
    ['LOGISTICS', sections.logistics],
    ['FINANCIAL CONTEXT', sections.financialContext],
    ['PREP STATUS', sections.prepStatus],
  ]

  for (const [title, content] of sectionPairs) {
    lines.push('')
    lines.push(title)
    lines.push(content)
  }

  if (sections.talkingPoints.length > 0) {
    lines.push('')
    lines.push('TALKING POINTS')
    for (const tp of sections.talkingPoints) {
      lines.push(`- ${tp}`)
    }
  }

  lines.push('')
  lines.push(divider)
  lines.push(`Generated: ${new Date().toLocaleString()}`)

  return lines.join('\n')
}
