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

CRITICAL RULES:
1. If the client's name is NOT clearly stated (as "My name is X", "I'm X", "— X" signature, or "This is X"), return name: null. Do NOT guess from email address, greeting, or context.
2. If a specific number of guests is NOT stated, return guestCount: null. Vague phrases ("a few friends", "some colleagues", "small group") are NOT guest counts.
3. NEVER fabricate data that isn't in the email.
4. Only extract information explicitly written in the message. Never infer or guess.
5. A greeting like "Hi there" or "Hello" is NOT a client name — return null.
6. If no email address is written, return null for clientEmail.
7. If no phone number is written, return null for clientPhone.
8. If no date is explicitly stated, return null for eventDate.
9. budgetCents must be a number in cents (e.g. $500 = 50000) or null if not stated.
10. dietaryRestrictions must be an empty array [] if none are mentioned.

EXAMPLES:
Input: "Hi, I'm Sarah Chen. Planning a birthday dinner for 12 guests on March 15th."
Output: { "clientName": "Sarah Chen", "guestCount": 12, "occasion": "birthday dinner", "eventDate": "2026-03-15", "clientEmail": null, "clientPhone": null, "eventTime": null, "location": null, "dietaryRestrictions": [], "budgetCents": null, "notes": null }

Input: "Looking for a private chef for our anniversary next month."
Output: { "clientName": null, "guestCount": null, "occasion": "anniversary", "eventDate": null, "clientEmail": null, "clientPhone": null, "eventTime": null, "location": null, "dietaryRestrictions": [], "budgetCents": null, "notes": null }

Input: "Hey, what are your rates?"
Output: { "clientName": null, "guestCount": null, "occasion": null, "eventDate": null, "clientEmail": null, "clientPhone": null, "eventTime": null, "location": null, "dietaryRestrictions": [], "budgetCents": null, "notes": null }

Input: "We're a group of friends looking to do something fun. — Rachel"
Output: { "clientName": "Rachel", "guestCount": null, "occasion": null, "eventDate": null, "clientEmail": null, "clientPhone": null, "eventTime": null, "location": null, "dietaryRestrictions": [], "budgetCents": null, "notes": null }`,
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

CRITICAL RULES:
1. Only extract information EXPLICITLY stated in the notes. NEVER invent or infer.
2. If a name is not stated, return fullName: null.
3. If an email is not stated, return email: null.
4. If a phone number is not stated, return phone: null.
5. dietaryRestrictions: all food-related restrictions and preferences (vegan, gluten-free, kosher, halal, etc.)
6. allergies: life-threatening or medical allergies only (nut allergy, shellfish allergy, celiac, etc.)
7. A restriction can appear in BOTH fields if appropriate (e.g., "severe nut allergy" goes in both).
8. If someone "loves vegan cooking" that is a dietary preference - put "vegan" in dietaryRestrictions.
9. Do NOT add fields beyond what is asked for. No preferences, no referralSource, no extra fields.

EXAMPLES:
Input: "Sarah Chen, sarah@gmail.com. Severe nut allergy, loves vegan cooking."
Output: { "fullName": "Sarah Chen", "email": "sarah@gmail.com", "phone": null, "dietaryRestrictions": ["vegan"], "allergies": ["severe nut allergy"] }

Input: "New client from Instagram. Gluten-free, husband has shellfish allergy."
Output: { "fullName": null, "email": null, "phone": null, "dietaryRestrictions": ["gluten-free"], "allergies": ["shellfish allergy"] }`,
        user: `Extract client information from these notes. Return null for any field not explicitly present.

${scenario.inputText}

Return JSON: {
  "fullName": "string or null",
  "email": "string or null",
  "phone": "string or null",
  "dietaryRestrictions": ["array of strings"],
  "allergies": ["array of strings"]
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

      const toneGuide: Record<string, string> = {
        INBOUND_SIGNAL: 'Warm, excited, brief (2-3 sentences). "Thanks for reaching out!"',
        QUALIFIED_INQUIRY:
          'Friendly-professional. Ask clarifying questions. Show genuine interest.',
        PRICING_PRESENTED: 'Confident, clear. No hedging. Present value, not just numbers.',
        BOOKED: 'Celebratory. Confirm all details. Express excitement.',
        SERVICE_COMPLETE: 'Grateful, personal. Reference specific moments. Ask for feedback.',
      }

      return {
        system: `You are a private chef's AI assistant drafting a professional email response.
Current lifecycle stage: ${stage}
Conversation depth: ${depth} (1=first response, 2=back-and-forth, 3=logistics, 4=post-service)

TONE FOR THIS STAGE: ${toneGuide[String(stage)] ?? 'Professional and warm.'}

MANDATORY RULES:
1. Subject line MUST contain the client's first or full name (${clientName}).
2. Email body MUST mention the occasion (${occasion}) and guest count (${guestCount}).
3. Email body MUST NOT contain any placeholder text like "[occasion]" or "[client name]".
4. Write as a specific email to this specific person — not a template.
5. Match the tone to the stage — formal for early stages, warm for post-service.
6. Every email must reference client-specific details.
7. signOff must be a real closing (e.g. "Warm regards, Chef David").

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

CRITICAL: The subject line MUST contain "${clientName}". The body MUST reference their ${occasion} for ${guestCount} guests. Do not use generic templates.

Return JSON: {
  "subject": "subject line containing ${clientName}",
  "body": "full email body mentioning ${occasion} and ${guestCount} guests",
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

// ── Deterministic quote calculator (Formula > AI) ──────────────────────────

function calculateQuoteDeterministic(scenario: SimScenario): PipelineOutput {
  const start = Date.now()
  const ctx = scenario.context as Record<string, unknown> | undefined

  const rates: Record<string, number> = {
    buffet: 85,
    'family-style': 85,
    'family style': 85,
    plated: 125,
    'multi-course tasting': 175,
    tasting: 175,
    cocktail: 125,
  }

  const style = String(ctx?.serviceStyle ?? 'plated').toLowerCase()
  const perPerson = rates[style] || 125
  const guestCount = Number(ctx?.guestCount) || 10
  const travelRequired = Boolean(ctx?.travelRequired)

  const serviceFee = guestCount * perPerson
  const groceryEstimate = Math.round((serviceFee * 0.3) / 50) * 50
  const travelSurcharge = travelRequired ? 150 : 0
  const total = serviceFee + groceryEstimate + travelSurcharge
  const deposit = Math.round((total * 0.5) / 50) * 50

  const lineItems = [
    {
      description: `Private chef service — ${style} (${guestCount} guests × $${perPerson})`,
      amountCents: serviceFee * 100,
    },
    { description: 'Grocery estimate (30%)', amountCents: groceryEstimate * 100 },
  ]
  if (travelSurcharge > 0) {
    lineItems.push({ description: 'Travel surcharge', amountCents: travelSurcharge * 100 })
  }

  return {
    rawOutput: {
      lineItems,
      totalCents: total * 100,
      depositCents: deposit * 100,
      validDays: 14,
      notes: `${style} service for ${guestCount} guests. 50% deposit required to confirm.`,
    },
    durationMs: Date.now() - start,
    error: null,
  }
}

/**
 * Runs a single scenario through the corresponding AI module's prompt logic.
 * Returns raw output and timing. Never throws.
 */
export async function runScenario(scenario: SimScenario): Promise<PipelineOutput> {
  // Formula > AI: quote_draft uses deterministic math, not LLM
  if (scenario.module === 'quote_draft') {
    return calculateQuoteDeterministic(scenario)
  }

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
