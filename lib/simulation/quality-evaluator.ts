// Quality Evaluator
// Uses Ollama to grade pipeline outputs against scenario ground truth.
// Returns a score (0–100) and a list of specific failure reasons.
// Score >= 70 = passed. Failures are human-readable for developer review.

import { getOllamaConfig } from '@/lib/ai/providers'
import { makeOllamaClient } from './ollama-client'
import type { SimScenario } from './types'

interface EvaluationResult {
  score: number
  passed: boolean
  failures: string[]
}

// ── Module-specific rubrics ───────────────────────────────────────────────────

function buildEvaluatorPrompt(
  scenario: SimScenario,
  rawOutput: unknown
): { system: string; user: string } {
  const outputStr = JSON.stringify(rawOutput, null, 2)
  const gt = scenario.groundTruth
  const ctx = scenario.context as Record<string, unknown> | undefined

  switch (scenario.module) {
    case 'inquiry_parse':
      return {
        system: `You are an AI quality evaluator. Score how well an inquiry parser extracted information from an email.
Return valid JSON only.`,
        user: `Original inquiry email:
${scenario.inputText}

Expected ground truth:
- Client name: ${gt.expectedName}
- Guest count: ${gt.expectedGuestCount}
- Occasion: ${gt.expectedOccasion}

Parser output:
${outputStr}

Score this extraction on a scale of 0–100. Deduct points for:
- Missing client name (-25)
- Wrong guest count or missing (-20)
- Missing event date (-15)
- Missing dietary restrictions when mentioned (-20)
- Missing budget when mentioned (-15)
- Inventing data not in the original message (-30)

Return JSON: { "score": N, "failures": ["list of specific issues found"] }`,
      }

    case 'client_parse':
      return {
        system: `You are an AI quality evaluator. Score how well a client note parser extracted contact information.
Return valid JSON only.`,
        user: `Original client note:
${scenario.inputText}

Expected ground truth:
- Name: ${gt.expectedName}
- Email: ${gt.expectedEmail}
- Dietary: ${JSON.stringify(gt.expectedDietary)}

Parser output:
${outputStr}

Score this extraction on a scale of 0–100. Deduct points for:
- Missing or wrong name (-30)
- Missing or wrong email (-25)
- Missing dietary restrictions that were mentioned (-20)
- Inventing contact details not in original (-30)
- Wrong phone format when phone was present (-15)

Return JSON: { "score": N, "failures": ["list of specific issues found"] }`,
      }

    case 'allergen_risk': {
      const expectedRisks = (gt.expectedRisks as string[]) ?? []
      return {
        system: `You are a food safety expert evaluating an AI allergen risk analysis.
Return valid JSON only.`,
        user: `Expected risks to be detected: ${expectedRisks.join(', ') || 'at least 1 risk combination'}

Allergen risk output:
${outputStr}

Score this analysis on a scale of 0–100. Deduct points for:
- Missing any genuine allergen conflict (cross-reference expected risks) (-25 each)
- Using "safe" when the ingredient clearly triggers a restriction (-30)
- No safetyFlags despite severe allergens (nut, shellfish, celiac) present (-25)
- Missing (dish, guest) pairs that should have been analyzed (-20)
- Low confidence when sufficient ingredient info was provided (-10)

Return JSON: { "score": N, "failures": ["list of specific issues found"] }`,
      }
    }

    case 'correspondence': {
      const stage = ctx?.stage ?? 'QUALIFIED_INQUIRY'
      const forbidden = (ctx?.forbiddenInResponse as string[]) ?? []
      return {
        system: `You are evaluating an AI-drafted client email for a private chef. Check lifecycle compliance.
Return valid JSON only.`,
        user: `Lifecycle stage: ${stage}
Forbidden content for this stage: ${forbidden.length > 0 ? forbidden.join(', ') : 'none specified'}

Draft output:
${outputStr}

Score this draft on a scale of 0–100. Deduct points for:
${forbidden.map((f) => `- Including "${f}" in this stage (-25)`).join('\n')}
- Missing subject line (-15)
- Tone mismatch (too formal for depth 3+, too casual for depth 1) (-10)
- Empty or generic body without client-specific details (-20)
- Missing sign-off or closing (-10)
- Unprofessional language (-15)

Return JSON: { "score": N, "failures": ["list of specific issues found"] }`,
      }
    }

    case 'menu_suggestions': {
      const dietary = (ctx?.dietaryRestrictions as string[]) ?? []
      return {
        system: `You are evaluating AI-generated menu suggestions for a private chef. Check dietary compliance and quality.
Return valid JSON only.`,
        user: `Required dietary restrictions to accommodate: ${dietary.join(', ') || 'none'}

Menu suggestions output:
${outputStr}

Score this on a scale of 0–100. Deduct points for:
- Any menu containing dishes that violate stated dietary restrictions (-35 per violation)
- Fewer than 3 distinct menu options (-20)
- Menus without full course structure (-15)
- Generic/uncreative dish names with no description (-15)
- Menus that are too similar to each other (-10)

Return JSON: { "score": N, "failures": ["list of specific issues found"] }`,
      }
    }

    case 'quote_draft': {
      const [minCents, maxCents] = (gt.expectedPriceRangeCents as [number, number]) ?? [
        0, 1_000_000,
      ]
      const guestCount = (gt.guestCount as number) ?? 10
      return {
        system: `You are evaluating an AI-generated quote for a private chef event. Check pricing reasonableness.
Return valid JSON only.`,
        user: `Expected price range: $${Math.round(minCents / 100)}–$${Math.round(maxCents / 100)}
Guest count: ${guestCount}

Quote output:
${outputStr}

Score this on a scale of 0–100. Deduct points for:
- Total price outside expected range by >50% (-30)
- Missing line items (no service fee or grocery estimate) (-20)
- Missing deposit amount (-15)
- Per-person rate below $50 or above $500 (likely error) (-25)
- Missing validity period (-10)
- No notes or terms included (-10)

Return JSON: { "score": N, "failures": ["list of specific issues found"] }`,
      }
    }
  }
}

/**
 * Uses Ollama to evaluate a pipeline output against scenario ground truth.
 * Returns score (0–100), passed (>=70), and specific failure reasons.
 * Never throws — returns score=0 with error on failure.
 */
export async function evaluateOutput(
  scenario: SimScenario,
  rawOutput: unknown
): Promise<EvaluationResult> {
  if (rawOutput === null || rawOutput === undefined) {
    return { score: 0, passed: false, failures: ['Pipeline returned no output'] }
  }

  const config = getOllamaConfig()
  const ollama = makeOllamaClient()
  const prompt = buildEvaluatorPrompt(scenario, rawOutput)

  try {
    const response = await ollama.chat({
      model: config.model,
      messages: [
        { role: 'system', content: prompt.system },
        { role: 'user', content: prompt.user },
      ],
      format: 'json',
      think: false,
    } as any)

    const rawText = response.message.content
    const jsonMatch = rawText.match(/```(?:json)?\s*([\s\S]*?)```/)
    const jsonStr = jsonMatch ? jsonMatch[1].trim() : rawText.trim()
    const parsed = JSON.parse(jsonStr)

    const score = Math.max(0, Math.min(100, Number(parsed.score) || 0))
    const failures = Array.isArray(parsed.failures)
      ? (parsed.failures as string[]).filter(Boolean)
      : []

    return { score, passed: score >= 70, failures }
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Evaluator call failed'
    return { score: 0, passed: false, failures: [`Evaluator error: ${msg}`] }
  }
}
