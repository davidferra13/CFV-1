// Deterministic first-response template for inquiries.
// Formula > AI: this generates the first reply WITHOUT any LLM call.
// Used by both Remy's draft action and the Dinner Circle auto-message.

import type { ChefServiceConfig } from '@/lib/chef-services/service-config-actions'
import type { PricingConfig } from '@/lib/pricing/config-types'
import { centsToDisplay } from '@/lib/pricing/constants'

// ─── Input ──────────────────────────────────────────────────────────────────

export interface FirstResponseInput {
  clientName: string
  date: string | null // "March 15th", "next Saturday", etc.
  guestCount: number | null
  dietaryRestrictions: string[] // e.g., ["shellfish allergy", "vegetarian"]
  occasion: string | null // e.g., "birthday", "anniversary", null if unknown
  chefFirstName: string
  serviceConfig: ChefServiceConfig
  /** Chef's per-chef pricing config. If absent, pricing paragraph is omitted. */
  pricingConfig?: PricingConfig | null
}

export interface FirstResponseOutput {
  subject: string
  body: string
}

// ─── Template ───────────────────────────────────────────────────────────────

export function generateFirstResponse(input: FirstResponseInput): FirstResponseOutput {
  const {
    clientName,
    date,
    guestCount,
    dietaryRestrictions,
    occasion,
    chefFirstName,
    serviceConfig,
  } = input

  const firstName = clientName.split(' ')[0]
  const paragraphs: string[] = []

  // --- Paragraph 1: Warm acknowledgment + confirm what we know ---
  const greeting = `Hi ${firstName},`
  const thanks = 'Thanks for reaching out!'

  // Build the event summary line
  let eventSummary = ''
  if (occasion && guestCount && date) {
    eventSummary = `A ${occasion} for ${guestCount} on ${date} sounds great.`
  } else if (guestCount && date) {
    eventSummary = `A ${guestCount}-person dinner on ${date} sounds great.`
  } else if (guestCount) {
    eventSummary = `A dinner for ${guestCount} sounds great.`
  } else if (date) {
    eventSummary = `A dinner on ${date} sounds great.`
  } else {
    eventSummary = 'I would love to cook for you.'
  }

  // Dietary confirmation (confirm, never re-ask)
  let dietaryLine = ''
  if (dietaryRestrictions.length > 0) {
    const formatted = dietaryRestrictions.join(' and ')
    dietaryLine = ` Noted on the ${formatted} - I'll keep that in mind for every dish.`
  }

  paragraphs.push(`${greeting}\n\n${thanks} ${eventSummary}${dietaryLine}`)

  // --- Paragraph 2: What's included ---
  const whatsIncluded = buildWhatsIncluded(serviceConfig)
  paragraphs.push(whatsIncluded)

  // --- Paragraph 3: Pricing (only if chef has configured their rates) ---
  const pricingLine = buildPricingLine(guestCount, serviceConfig, input.pricingConfig)
  if (pricingLine) {
    paragraphs.push(pricingLine)
  }

  // --- Paragraph 4: Next step + optional question ---
  let nextStep = ''
  if (!occasion) {
    nextStep =
      "What's the occasion? That helps me put together a menu that fits the vibe.\n\nOnce I know that, I'll send over 2-3 menu options for you to pick from. We can go from there."
  } else {
    nextStep = "I'll send over 2-3 menu options that fit the vibe. We can go from there."
  }
  paragraphs.push(nextStep)

  // --- Sign-off ---
  paragraphs.push(`Looking forward to it,\nChef ${chefFirstName}`)

  const body = paragraphs.join('\n\n')

  // Subject line
  let subject = 'Re: '
  if (occasion) {
    subject += `Your ${occasion}`
  } else {
    subject += 'Your dinner'
  }
  if (date) {
    subject += ` - ${date}`
  }

  return { subject, body }
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function buildWhatsIncluded(config: ChefServiceConfig): string {
  // Use chef's own words if available
  if (config.custom_whats_included) {
    return config.custom_whats_included
  }

  // Build from toggles
  const included: string[] = []
  if (config.offers_grocery_shopping) included.push('grocery shopping')
  included.push('cooking') // always
  included.push('plating') // always
  if (config.offers_serving) included.push('serving')
  if (config.offers_cleanup) included.push('full cleanup')

  const list = included.join(', ')

  let line = `Here's how I work: I handle everything - ${list}. You don't lift a finger.`
  line +=
    ' I arrive about 2 hours before your preferred dinner time, and your kitchen will be cleaner than I found it when I leave.'

  return line
}

function buildPricingLine(
  guestCount: number | null,
  config: ChefServiceConfig,
  pricingConfig?: PricingConfig | null
): string | null {
  // Use the chef's configured 4-course group rate as the "starting at" reference.
  // If no pricing config exists (chef hasn't set up rates yet), skip the pricing paragraph
  // entirely rather than showing hardcoded numbers that aren't theirs.
  const defaultRate = pricingConfig?.group_rate_4_course

  if (!defaultRate || defaultRate <= 0) return null

  const rateDisplay = centsToDisplay(defaultRate)
  const groceryNote = config.grocery_cost_included
    ? 'which covers the full experience including groceries'
    : 'which covers the full experience (groceries billed separately at receipt cost, no markup)'

  if (guestCount) {
    return `For a ${guestCount}-person dinner, my pricing starts at ${rateDisplay}/person, ${groceryNote}. A 4-course meal is my sweet spot for groups your size, but I can scale up or down depending on what you're going for.`
  }

  return `My pricing starts at ${rateDisplay}/person for a 4-course dinner, ${groceryNote}.`
}
