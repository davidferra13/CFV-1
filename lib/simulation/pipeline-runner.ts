// Pipeline Runner
// Runs synthetic scenarios through ChefFlow's real AI prompt logic.
// Calls Ollama directly using the same system prompts as the production modules.
// No auth context required — operates on synthetic data only.

import { getOllamaConfig } from '@/lib/ai/providers'
import { makeOllamaClient } from './ollama-client'
import type { SimScenario } from './types'

interface PipelineOutput {
  rawOutput: unknown
  durationMs: number
  error: string | null
}

// ── Module-specific prompts (mirrors production prompts exactly) ──────────────

function getModulePrompts(scenario: SimScenario): { system: string; user: string } | null {
  const ctx = scenario.context as Record<string, unknown> | undefined

  switch (scenario.module) {
    case 'inquiry_parse':
      return {
        system: `You are a private chef's assistant. Extract structured information from an inquiry message.
Return valid JSON only — no markdown, no prose.

STRICT RULES — you will be penalized for violating these:
- Only extract information explicitly written in the message. Never infer or guess.
- A greeting like "Hi there" or "Hello" is NOT a client name — return null.
- "A few of us" or "some friends" is NOT a specific guest count — return null.
- If no email address is written, return null for clientEmail.
- If no phone number is written, return null for clientPhone.
- If no date is explicitly stated, return null for eventDate.
- budgetCents must be a number in cents (e.g. $500 = 50000) or null if not stated.
- dietaryRestrictions must be an empty array [] if none are mentioned.`,
        user: `Extract inquiry details from this message. Return null for any field not explicitly present.

${scenario.inputText}

Return JSON: {
  "clientName": null or "exact name as written",
  "clientEmail": null or "exact email as written",
  "clientPhone": null or "exact phone as written",
  "eventDate": null or "YYYY-MM-DD",
  "eventTime": null or "time as written",
  "guestCount": null or exact number,
  "occasion": null or "occasion type",
  "location": null or "location as written",
  "dietaryRestrictions": [],
  "budgetCents": null or number in cents,
  "notes": null or "any other details"
}`,
      }

    case 'client_parse':
      return {
        system: `You are a private chef's assistant. Extract structured client information from notes.
Return valid JSON only — no markdown, no prose.
Be conservative: use null for missing fields. Do not invent contact details.`,
        user: `Extract client information from these notes:

${scenario.inputText}

Return JSON: {
  "fullName": "string or null",
  "email": "string or null",
  "phone": "string or null",
  "dietaryRestrictions": ["array of strings"],
  "allergies": ["array of strings"],
  "preferences": "string or null",
  "referralSource": "string or null"
}`,
      }

    case 'allergen_risk': {
      let menuItems: Array<{ name: string; description: string }> = []
      let guests: Array<{ name: string; restrictions: string }> = []

      try {
        const parsed = JSON.parse(scenario.inputText)
        menuItems = parsed.menuItems ?? []
        guests = parsed.guests ?? []
      } catch {
        return null
      }

      return {
        system: `You are a food safety expert. Analyze a proposed menu against each guest's dietary restrictions.

Follow these steps in order:
Step 1 — List every guest and their restrictions.
Step 2 — For EVERY (dish × guest) combination, create one row with a riskLevel.
Step 3 — Scan for severe allergens: nuts, shellfish, gluten/celiac, dairy.
Step 4 — If ANY guest has a severe allergen restriction, safetyFlags MUST contain
          at least one warning string. An empty safetyFlags array is only valid
          when NO guest has any restriction at all.

Risk levels:
  - safe: no known allergens for this guest
  - may_contain: possible cross-contamination or uncertain ingredient
  - contains: definitively contains an allergen for this guest
  - unknown: insufficient information to determine

Always err toward "may_contain" not "safe" when uncertain.
Return valid JSON only — no markdown.`,
        user: `Menu dishes:
${menuItems.map((m) => `- ${m.name}${m.description ? ': ' + m.description : ''}`).join('\n')}

Guest dietary profiles:
${guests.map((g) => `- ${g.name}: ${g.restrictions || 'No restrictions noted'}`).join('\n')}

Return JSON with a row for every dish × guest pair:
{ "rows": [{"dish":"...","guestName":"...","riskLevel":"safe|may_contain|contains|unknown","triggerAllergen":"...or null","notes":"...or null"}], "safetyFlags": ["warning strings — must not be empty if any guest has restrictions"], "confidence": "high|medium|low" }`,
      }
    }

    case 'correspondence': {
      const stage = ctx?.stage ?? 'QUALIFIED_INQUIRY'
      const clientName = ctx?.clientName ?? 'the client'
      const occasion = ctx?.occasion ?? 'private dinner'
      const guestCount = ctx?.guestCount ?? 8
      const depth = ctx?.conversationDepth ?? 1

      return {
        system: `You are a private chef's AI assistant drafting a professional email response.
Current lifecycle stage: ${stage}
Conversation depth: ${depth} (1=first response, 2=back-and-forth, 3=logistics, 4=post-service)

REQUIRED in every response:
- subject MUST include the client's name (${clientName})
- body MUST mention the specific occasion (${occasion}) and guest count (${guestCount})
- Write as a specific email to this specific person — not a template
- Do not use placeholder text like "[occasion]" or "[client name]"
- signOff must be a real closing (e.g. "Warm regards, Chef David")

Stage-specific rules:
${stage === 'INBOUND_SIGNAL' ? '- DO NOT include pricing, deposits, or contract terms\n- Focus on discovery: what occasion, how many guests, dietary needs' : ''}
${stage === 'QUALIFIED_INQUIRY' ? '- Ask clarifying questions about dietary needs, occasion details\n- DO NOT include pricing yet' : ''}
${stage === 'PRICING_PRESENTED' ? '- Reference the quote already sent\n- MUST include deposit requirement and payment action' : ''}
${stage === 'BOOKED' ? '- Confirm booking, next steps, and menu confirmation timeline' : ''}
${stage === 'SERVICE_COMPLETE' ? '- Warm, appreciative tone\n- Ask for feedback and referrals' : ''}

Return valid JSON only.`,
        user: `Draft a professional email for:
Client: ${clientName}
Occasion: ${occasion}
Guest count: ${guestCount}
Stage: ${stage}

The subject line must name ${clientName}. The body must reference their ${occasion} for ${guestCount} guests.

Return JSON: {
  "subject": "subject line containing client name",
  "body": "full email body mentioning the occasion and guest count",
  "signOff": "closing salutation"
}`,
      }
    }

    case 'menu_suggestions': {
      const dietary = (ctx?.dietaryRestrictions as string[]) ?? []
      const guestCount = ctx?.guestCount ?? 8
      const occasion = ctx?.occasion ?? 'dinner'
      const month = ctx?.month ?? 'June'

      return {
        system: `You are a creative private chef. Suggest three distinct menu options for an upcoming event.
Each menu should be cohesive, delicious, and appropriate for the occasion and dietary needs.
Return valid JSON only — no markdown.`,
        user: `Suggest 3 menu options for:
Occasion: ${occasion}
Guests: ${guestCount}
Dietary restrictions: ${dietary.length > 0 ? dietary.join(', ') : 'none'}
Month/season: ${month}

Return JSON: { "menus": [{ "name": "menu title", "description": "brief concept", "courses": [{"course": "appetizer|main|dessert", "dish": "...", "description": "..."}] }] }`,
      }
    }

    case 'quote_draft': {
      const guestCount = ctx?.guestCount ?? 10
      const occasion = ctx?.occasion ?? 'private dinner'
      const serviceStyle = ctx?.serviceStyle ?? 'plated'
      const budget = ctx?.clientBudget ?? 'flexible'
      const travel = ctx?.travelRequired ?? false

      return {
        system: `You are a private chef drafting a quote for an event.
Use this exact pricing formula — do not deviate:

  Per-person rates (service fee only):
    buffet or family-style → $85/person
    plated → $125/person
    multi-course tasting → $175/person

  service_fee = guestCount × per_person_rate
  grocery_estimate = service_fee × 0.30  (round to nearest $50)
  travel_surcharge = $150 if travel required, else $0
  total = service_fee + grocery_estimate + travel_surcharge
  deposit = total × 0.50  (round to nearest $50)

Line items must include: service fee, grocery estimate, and travel surcharge (if any).
Return valid JSON only — no markdown.`,
        user: `Draft a quote for:
Guests: ${guestCount}
Occasion: ${occasion}
Service style: ${serviceStyle}
Client budget: ${budget}
Travel required: ${travel}

Calculate using the pricing formula. All amounts in cents (multiply dollars × 100).

Return JSON: {
  "lineItems": [{"description": "...", "amountCents": N}],
  "totalCents": N,
  "depositCents": N,
  "validDays": 14,
  "notes": "brief notes for the client"
}`,
      }
    }
  }
}

/**
 * Runs a single scenario through the corresponding AI module's prompt logic.
 * Returns raw output and timing. Never throws.
 */
export async function runScenario(scenario: SimScenario): Promise<PipelineOutput> {
  const config = getOllamaConfig()
  const ollama = makeOllamaClient()
  const start = Date.now()

  const prompts = getModulePrompts(scenario)
  if (!prompts) {
    return {
      rawOutput: null,
      durationMs: 0,
      error: 'Could not build module prompts — invalid scenario context',
    }
  }

  try {
    // stream: false is passed via `as any` — Ollama returns ChatResponse, not an iterator
    const response = (await ollama.chat({
      model: config.model,
      messages: [
        { role: 'system', content: prompts.system },
        { role: 'user', content: prompts.user },
      ],
      format: 'json',
      think: false,
    } as any)) as unknown as { message: { content: string } }

    const rawText = response.message.content
    const jsonMatch = rawText.match(/```(?:json)?\s*([\s\S]*?)```/)
    const jsonStr = jsonMatch ? jsonMatch[1].trim() : rawText.trim()

    let parsed: unknown = null
    try {
      parsed = JSON.parse(jsonStr)
    } catch {
      parsed = { _rawText: rawText }
    }

    return {
      rawOutput: parsed,
      durationMs: Date.now() - start,
      error: null,
    }
  } catch (err) {
    return {
      rawOutput: null,
      durationMs: Date.now() - start,
      error: err instanceof Error ? err.message : 'Ollama call failed',
    }
  }
}
