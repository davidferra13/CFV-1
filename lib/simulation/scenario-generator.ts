// Scenario Generator
// Uses Ollama to generate diverse, realistic chef/catering scenarios for each module.
// The generator acts as the "simulation" in sim-to-real: synthetic but realistic data.
// Not a server action - called from simulation-actions.ts on the server.

import { getOllamaConfig } from '@/lib/ai/providers'
import { makeOllamaClient } from './ollama-client'
import type { SimModule, SimScenario } from './types'

function makeId(): string {
  return Math.random().toString(36).slice(2, 10)
}

function buildGeneratorPrompt(module: SimModule): { system: string; user: string } {
  switch (module) {
    case 'inquiry_parse':
      return {
        system: `You are generating realistic private chef inquiry emails for testing an AI parser.
Each scenario should feel like a real email from a potential client.
Return a JSON array of inquiry email strings - no other text.
Vary: event occasions (birthday, anniversary, corporate, date night, holiday), guest counts (4–80),
dietary restrictions (vegan, gluten-free, nut allergy, kosher, halal, shellfish allergy, none),
budgets ($300–$5000), event dates (near future), and writing styles (formal, casual, brief, detailed).

CRITICAL RULES for generating emails - the parser has strict null extraction rules:
- When expectedName is a non-null value, the email MUST contain the name in an EXPLICIT format:
  "My name is [Name]", "I'm [Name]", "This is [Name]", or a signature line like "- [Name]" or "Best, [Name]".
  A greeting like "Hi there" or "Hello" does NOT count as providing a name.
- When expectedGuestCount is a non-null number, the email MUST contain a SPECIFIC number:
  "12 guests", "party of 20", "dinner for 8". Vague phrases like "a few of us" or "some friends" do NOT count.
- If you want to test null handling (parser correctly returns null), set the expected value to null
  AND make the email genuinely ambiguous - omit the name entirely, or use only vague language for guest count.
- At least 1 of the 5 scenarios should test null handling for name (no name in email, expectedName: null).
- At least 1 of the 5 scenarios should test null handling for guest count (no specific number, expectedGuestCount: null).`,
        user: `Generate 5 realistic private chef inquiry emails. Each email should contain:
- Client name in an explicit format ("My name is X", "I'm X", or as a signature) - or omit entirely if testing null
- Event date (specific, within 6 months from now)
- Guest count as a specific number - or omit/use vague language if testing null
- At least one dietary restriction or allergy (or explicitly none)
- Budget or budget range (sometimes implied, sometimes explicit)
- Event occasion/type

Return JSON: [{"email": "...", "expectedName": "..." or null, "expectedGuestCount": N or null, "expectedOccasion": "..."}]`,
      }

    case 'client_parse':
      return {
        system: `You are generating realistic client profile notes for a private chef's CRM.
These are the kinds of notes a chef might paste when adding a new client.
Return a JSON array - no other text.
Vary: formal/casual writing, complete/partial info, different dietary profiles.`,
        user: `Generate 5 realistic private chef client notes. Each should describe a new client with:
- Full name
- Email address
- Phone number (sometimes missing)
- 1–3 dietary preferences or restrictions
- Optional: preferred occasion type, neighborhood, how they were referred

Return JSON: [{"note": "...", "expectedName": "...", "expectedEmail": "...", "expectedDietary": ["..."]}]`,
      }

    case 'allergen_risk':
      return {
        system: `You are generating allergen risk test scenarios for a private chef's food safety system.
Create scenarios with menus and guest lists that include real allergen combinations.
Include tricky edge cases: cross-contamination risks, hidden allergens, overlapping restrictions.
Return JSON - no other text.`,
        user: `Generate 5 allergen risk scenarios. Each should have:
- A menu of 3–5 dishes (with realistic descriptions)
- A guest list of 3–8 guests with different dietary restrictions/allergies
- At least one genuine allergen conflict or cross-contamination risk

Return JSON: [{
  "menuItems": [{"name": "...", "description": "..."}],
  "guests": [{"name": "...", "restrictions": "..."}],
  "expectedRisks": ["..."]
}]`,
      }

    case 'correspondence':
      return {
        system: `You are generating test contexts for a private chef's AI email correspondence tool.
Create realistic inquiry contexts at different lifecycle stages.
Return JSON - no other text.`,
        user: `Generate 5 inquiry contexts for email drafting. Each should be at a specific lifecycle stage.
Stages to cover: INBOUND_SIGNAL, QUALIFIED_INQUIRY, PRICING_PRESENTED, BOOKED, SERVICE_COMPLETE.

Return JSON: [{
  "stage": "INBOUND_SIGNAL|QUALIFIED_INQUIRY|PRICING_PRESENTED|BOOKED|SERVICE_COMPLETE",
  "clientName": "...",
  "occasion": "...",
  "guestCount": N,
  "conversationDepth": 1,
  "forbiddenInResponse": ["pricing", "deposit"] or []
}]`,
      }

    case 'menu_suggestions':
      return {
        system: `You are generating event contexts for a private chef's menu suggestion AI.
Create realistic event scenarios with varied dietary combos and guest counts.
Return JSON - no other text.`,
        user: `Generate 5 event contexts for menu suggestion testing. Each should vary in:
- Occasion (birthday, anniversary, holiday dinner, corporate lunch, date night)
- Guest count (4–60)
- Dietary restrictions (vegan, gluten-free, nut-free, halal, mix of several, none)
- Season/month (affects ingredient availability)

Return JSON: [{
  "occasion": "...",
  "guestCount": N,
  "dietaryRestrictions": ["..."],
  "month": "January|February|...|December",
  "expectedMenuStyle": "italian|french|american|asian-fusion|mediterranean"
}]`,
      }

    case 'quote_draft':
      return {
        system: `You are generating inquiry contexts for a private chef's quote drafting AI.
Create realistic scenarios that test pricing logic.
Return JSON - no other text.`,
        user: `Generate 5 quote drafting scenarios. Each should have:
- Guest count (4–80)
- Event type and occasion
- Service style (plated, family-style, buffet, cocktail)
- Client budget (sometimes explicit, sometimes vague)
- Chef travel required? (yes/no, distance)

Return JSON: [{
  "guestCount": N,
  "occasion": "...",
  "serviceStyle": "plated|family-style|buffet|cocktail",
  "clientBudget": "$..." or "flexible" or "tight",
  "travelRequired": true|false,
  "expectedPriceRangeCents": [minCents, maxCents]
}]`,
      }
  }
}

function parseGeneratedScenarios(
  module: SimModule,
  raw: string,
  contextPayload: unknown[]
): SimScenario[] {
  return contextPayload.map((item: unknown, i: number) => {
    const ctx = item as Record<string, unknown>
    let inputText = ''
    let groundTruth: Record<string, unknown> = {}

    switch (module) {
      case 'inquiry_parse':
        inputText = String(ctx.email ?? raw)
        groundTruth = {
          expectedName: ctx.expectedName,
          expectedGuestCount: ctx.expectedGuestCount,
          expectedOccasion: ctx.expectedOccasion,
        }
        break

      case 'client_parse':
        inputText = String(ctx.note ?? raw)
        groundTruth = {
          expectedName: ctx.expectedName,
          expectedEmail: ctx.expectedEmail,
          expectedDietary: ctx.expectedDietary,
        }
        break

      case 'allergen_risk':
        inputText = JSON.stringify({
          menuItems: ctx.menuItems,
          guests: ctx.guests,
        })
        groundTruth = { expectedRisks: ctx.expectedRisks ?? [] }
        break

      case 'correspondence':
        inputText = JSON.stringify(ctx)
        groundTruth = {
          stage: ctx.stage,
          forbiddenInResponse: ctx.forbiddenInResponse ?? [],
        }
        break

      case 'menu_suggestions':
        inputText = JSON.stringify(ctx)
        groundTruth = {
          dietaryRestrictions: ctx.dietaryRestrictions ?? [],
          expectedMenuStyle: ctx.expectedMenuStyle,
        }
        break

      case 'quote_draft': {
        // Recompute expectedPriceRangeCents deterministically using the same
        // formula the pipeline uses - the LLM's guessed range is unreliable.
        const guestCount = Number(ctx.guestCount) || 10
        const serviceStyle = String(ctx.serviceStyle ?? 'plated').toLowerCase()
        const travelRequired = Boolean(ctx.travelRequired)

        // Per-person rates (must match pipeline-runner.ts quote_draft prompt)
        let perPersonRate = 125 // plated default
        if (serviceStyle === 'buffet' || serviceStyle === 'family-style') {
          perPersonRate = 85
        } else if (serviceStyle === 'plated') {
          perPersonRate = 125
        } else if (serviceStyle.includes('tasting') || serviceStyle === 'multi-course tasting') {
          perPersonRate = 175
        }

        const serviceFee = guestCount * perPersonRate
        // grocery = service_fee * 0.30, rounded to nearest $50
        const groceryEstimate = Math.round((serviceFee * 0.3) / 50) * 50
        const travelSurcharge = travelRequired ? 150 : 0
        const total = serviceFee + groceryEstimate + travelSurcharge

        // ±20% tolerance range, in cents
        const minCents = Math.round(total * 0.8 * 100)
        const maxCents = Math.round(total * 1.2 * 100)

        inputText = JSON.stringify(ctx)
        groundTruth = {
          expectedPriceRangeCents: [minCents, maxCents],
          guestCount,
        }
        break
      }
    }

    return {
      id: `${module}-${makeId()}-${i}`,
      module,
      inputText,
      groundTruth,
      context: ctx,
    }
  })
}

/**
 * Uses Ollama to generate n realistic test scenarios for a given module.
 * Returns an empty array (not throws) if Ollama is unavailable.
 */
export async function generateScenarios(module: SimModule, count: number): Promise<SimScenario[]> {
  const config = getOllamaConfig()
  const ollama = makeOllamaClient()
  const prompt = buildGeneratorPrompt(module)

  try {
    // stream: false is passed via `as any` - Ollama returns ChatResponse, not an iterator
    const response = (await ollama.chat({
      model: config.model,
      messages: [
        { role: 'system', content: prompt.system },
        { role: 'user', content: prompt.user },
      ],
      format: 'json',
      think: false,
    } as any)) as unknown as { message: { content: string } }

    const rawText = response.message.content
    const jsonMatch = rawText.match(/```(?:json)?\s*([\s\S]*?)```/)
    const jsonStr = jsonMatch ? jsonMatch[1].trim() : rawText.trim()
    const parsed = JSON.parse(jsonStr)
    const items: unknown[] = Array.isArray(parsed) ? parsed : [parsed]

    const scenarios = parseGeneratedScenarios(module, jsonStr, items.slice(0, count))
    return scenarios
  } catch (err) {
    console.error(`[sim:generator] Failed to generate scenarios for ${module}:`, err)
    return []
  }
}
