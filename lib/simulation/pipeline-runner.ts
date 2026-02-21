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
Be conservative: if information is not present, use null. Do not invent details.`,
        user: `Extract inquiry details from this message:

${scenario.inputText}

Return JSON: {
  "clientName": "string or null",
  "clientEmail": "string or null",
  "clientPhone": "string or null",
  "eventDate": "YYYY-MM-DD or null",
  "eventTime": "string or null",
  "guestCount": "number or null",
  "occasion": "string or null",
  "location": "string or null",
  "dietaryRestrictions": ["array of strings"],
  "budgetCents": "number or null",
  "notes": "string or null"
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
        system: `You are a food safety expert. Analyze the proposed menu against each guest's dietary restrictions and allergies.
For every (dish, guest) pair, determine the risk level:
  - safe: no known allergens for this guest
  - may_contain: possible cross-contamination or uncertain ingredient
  - contains: definitively contains an allergen relevant to this guest
  - unknown: insufficient information

Always be conservative — when uncertain, use "may_contain" not "safe".
Flag severe allergies (nuts, shellfish, gluten/celiac) even for "may_contain" scenarios.
Return valid JSON only — no markdown.`,
        user: `Menu dishes:
${menuItems.map((m) => `- ${m.name}${m.description ? ': ' + m.description : ''}`).join('\n')}

Guest dietary profiles:
${guests.map((g) => `- ${g.name}: ${g.restrictions || 'No restrictions noted'}`).join('\n')}

Return JSON: { "rows": [{"dish":"...","guestName":"...","riskLevel":"safe|may_contain|contains|unknown","triggerAllergen":"...or null","notes":"...or null"}], "safetyFlags": ["critical warnings"], "confidence": "high|medium|low" }`,
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

Stage-specific rules:
${stage === 'INBOUND_SIGNAL' ? '- DO NOT include pricing, deposits, or contract terms\n- Focus on discovery: what occasion, how many guests, dietary needs' : ''}
${stage === 'QUALIFIED_INQUIRY' ? '- Ask clarifying questions about dietary needs, occasion details\n- DO NOT include pricing yet' : ''}
${stage === 'PRICING_PRESENTED' ? '- Reference the quote already sent\n- MUST include deposit requirement and payment action' : ''}
${stage === 'BOOKED' ? '- Confirm booking, next steps, and menu confirmation timeline' : ''}
${stage === 'SERVICE_COMPLETE' ? '- Warm, appreciative tone\n- Ask for feedback and referrals' : ''}

Return valid JSON only.`,
        user: `Draft a professional email response for:
Client: ${clientName}
Occasion: ${occasion}
Guest count: ${guestCount}
Stage: ${stage}

Return JSON: {
  "subject": "email subject",
  "body": "full email body",
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
Suggest a professional quote with line items. Base pricing on:
  - Per-person rate: $75–$250 depending on service style and complexity
  - Travel surcharge: $50–$200 if required
  - Grocery estimate: 25–35% of service fee
Return valid JSON only — no markdown.`,
        user: `Draft a quote for:
Guests: ${guestCount}
Occasion: ${occasion}
Service style: ${serviceStyle}
Client budget: ${budget}
Travel required: ${travel}

Return JSON: {
  "lineItems": [{"description": "...", "amountCents": N}],
  "totalCents": N,
  "depositCents": N,
  "validDays": 14,
  "notes": "optional notes for the client"
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
    const response = await ollama.chat({
      model: config.model,
      messages: [
        { role: 'system', content: prompts.system },
        { role: 'user', content: prompts.user },
      ],
      format: 'json',
    })

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
