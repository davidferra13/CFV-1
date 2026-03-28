// Quality Evaluator
// Grades pipeline outputs against scenario ground truth.
// Formula > AI: uses deterministic checks where possible, Ollama only for subjective quality.
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

// ── Deterministic evaluators (Formula > AI) ──────────────────────────────────

function fuzzyMatch(
  actual: string | null | undefined,
  expected: string | null | undefined
): boolean {
  if (!actual && !expected) return true
  if (!actual || !expected) return false
  const a = actual.toLowerCase().trim()
  const e = expected.toLowerCase().trim()
  return a === e || a.includes(e) || e.includes(a)
}

function evaluateInquiryParseDeterministic(
  scenario: SimScenario,
  rawOutput: unknown
): EvaluationResult {
  const out = rawOutput as Record<string, unknown> | null
  if (!out || typeof out !== 'object') {
    return { score: 0, passed: false, failures: ['Pipeline returned no valid object'] }
  }

  const gt = scenario.groundTruth
  let score = 100
  const failures: string[] = []

  // Check client name
  const expectedName = gt.expectedName as string | null
  const actualName = (out.clientName ?? out.client_name ?? null) as string | null
  if (expectedName !== null) {
    if (!fuzzyMatch(actualName, expectedName)) {
      score -= 25
      failures.push(`Client name: expected "${expectedName}", got "${actualName}"`)
    }
  } else if (actualName !== null && actualName !== '') {
    // Parser should have returned null but invented a name
    score -= 30
    failures.push(`Client name: expected null, but parser invented "${actualName}"`)
  }

  // Check guest count
  const expectedGuests = gt.expectedGuestCount as number | null
  const actualGuests = (out.guestCount ?? out.confirmed_guest_count ?? null) as number | null
  if (expectedGuests !== null) {
    if (actualGuests === null || actualGuests === undefined) {
      score -= 20
      failures.push(`Guest count: expected ${expectedGuests}, got null`)
    } else if (actualGuests !== expectedGuests) {
      score -= 20
      failures.push(`Guest count: expected ${expectedGuests}, got ${actualGuests}`)
    }
  } else if (actualGuests !== null && actualGuests !== undefined) {
    score -= 20
    failures.push(`Guest count: expected null, but parser returned ${actualGuests}`)
  }

  // Check occasion
  const expectedOccasion = gt.expectedOccasion as string | null
  const actualOccasion = (out.occasion ?? out.confirmed_occasion ?? null) as string | null
  if (expectedOccasion !== null) {
    if (!fuzzyMatch(actualOccasion, expectedOccasion)) {
      score -= 15
      failures.push(`Occasion: expected "${expectedOccasion}", got "${actualOccasion}"`)
    }
  }

  // Check dietaryRestrictions is array (not missing) - handle both camelCase and snake_case
  const dietary = out.dietaryRestrictions ?? out.confirmed_dietary_restrictions
  if (!Array.isArray(dietary)) {
    score -= 10
    failures.push('dietaryRestrictions field is missing or not an array')
  }

  score = Math.max(0, score)
  return { score, passed: score >= 70, failures }
}

function evaluateCorrespondenceDeterministic(
  scenario: SimScenario,
  rawOutput: unknown
): EvaluationResult {
  const out = rawOutput as Record<string, unknown> | null
  if (!out || typeof out !== 'object') {
    return { score: 0, passed: false, failures: ['Pipeline returned no valid object'] }
  }

  const ctx = scenario.context as Record<string, unknown> | undefined
  let score = 100
  const failures: string[] = []

  const subject = String(out.subject ?? '')
  const body = String(out.body ?? '')
  const signOff = String(out.signOff ?? '')
  const clientName = String(ctx?.clientName ?? '')
  const occasion = String(ctx?.occasion ?? '')
  const guestCount = Number(ctx?.guestCount ?? 0)
  const forbidden = (ctx?.forbiddenInResponse as string[]) ?? []

  // Must have subject
  if (!subject || subject === 'undefined' || subject === 'null') {
    score -= 15
    failures.push('Missing subject line')
  }

  // Client name must appear in subject (case-insensitive)
  if (clientName && !subject.toLowerCase().includes(clientName.toLowerCase())) {
    // Also check first name
    const firstName = clientName.split(' ')[0]
    if (!subject.toLowerCase().includes(firstName.toLowerCase())) {
      score -= 20
      failures.push(`Client name "${clientName}" not found in subject: "${subject}"`)
    }
  }

  // Must have body
  if (!body || body.length < 20) {
    score -= 20
    failures.push('Body is empty or too short')
  }

  // Occasion must appear in body
  if (occasion && body.length > 0 && !body.toLowerCase().includes(occasion.toLowerCase())) {
    score -= 15
    failures.push(`Occasion "${occasion}" not mentioned in body`)
  }

  // Guest count must appear in body
  if (guestCount > 0 && body.length > 0 && !body.includes(String(guestCount))) {
    score -= 10
    failures.push(`Guest count ${guestCount} not mentioned in body`)
  }

  // Must have sign-off
  if (!signOff || signOff === 'undefined' || signOff === 'null') {
    score -= 10
    failures.push('Missing sign-off')
  }

  // Check forbidden content
  const fullText = `${subject} ${body} ${signOff}`.toLowerCase()
  for (const f of forbidden) {
    if (fullText.includes(f.toLowerCase())) {
      score -= 25
      failures.push(`Forbidden content "${f}" found in email`)
    }
  }

  score = Math.max(0, score)
  return { score, passed: score >= 70, failures }
}

function evaluateQuoteDraftDeterministic(
  scenario: SimScenario,
  rawOutput: unknown
): EvaluationResult {
  const out = rawOutput as Record<string, unknown> | null
  if (!out || typeof out !== 'object') {
    return { score: 0, passed: false, failures: ['Pipeline returned no valid object'] }
  }

  const gt = scenario.groundTruth
  let score = 100
  const failures: string[] = []

  const lineItems = out.lineItems as Array<Record<string, unknown>> | undefined
  const totalCents = out.totalCents as number | undefined
  const depositCents = out.depositCents as number | undefined
  const validDays = out.validDays as number | undefined
  const notes = out.notes as string | undefined

  // Check line items
  if (!Array.isArray(lineItems) || lineItems.length === 0) {
    score -= 20
    failures.push('Missing or empty lineItems')
  } else {
    const hasService = lineItems.some((li) =>
      String(li.description ?? '')
        .toLowerCase()
        .includes('service')
    )
    const hasGrocery = lineItems.some((li) =>
      String(li.description ?? '')
        .toLowerCase()
        .includes('grocery')
    )
    if (!hasService) {
      score -= 10
      failures.push('No service fee line item')
    }
    if (!hasGrocery) {
      score -= 10
      failures.push('No grocery estimate line item')
    }
  }

  // Check total in expected range
  const [minCents, maxCents] = (gt.expectedPriceRangeCents as [number, number]) ?? [0, 1_000_000]
  if (totalCents === undefined || totalCents === null) {
    score -= 30
    failures.push('Missing totalCents')
  } else if (totalCents < minCents || totalCents > maxCents) {
    // Check if within 50% tolerance (soft fail)
    const midpoint = (minCents + maxCents) / 2
    const diff = Math.abs(totalCents - midpoint) / midpoint
    if (diff > 0.5) {
      score -= 30
      failures.push(
        `Total $${(totalCents / 100).toFixed(0)} outside expected range $${(minCents / 100).toFixed(0)}–$${(maxCents / 100).toFixed(0)}`
      )
    } else {
      score -= 10
      failures.push(
        `Total $${(totalCents / 100).toFixed(0)} slightly outside range $${(minCents / 100).toFixed(0)}–$${(maxCents / 100).toFixed(0)}`
      )
    }
  }

  // Check deposit
  if (depositCents === undefined || depositCents === null) {
    score -= 15
    failures.push('Missing depositCents')
  }

  // Check validity period
  if (validDays === undefined || validDays === null) {
    score -= 10
    failures.push('Missing validDays')
  }

  // Check notes
  if (!notes || notes.length < 5) {
    score -= 10
    failures.push('Missing or empty notes')
  }

  score = Math.max(0, score)
  return { score, passed: score >= 70, failures }
}

// ── Ollama-based evaluators (for subjective quality only) ────────────────────

function buildEvaluatorPrompt(
  scenario: SimScenario,
  rawOutput: unknown
): { system: string; user: string } {
  const outputStr = JSON.stringify(rawOutput, null, 2)
  const gt = scenario.groundTruth
  const ctx = scenario.context as Record<string, unknown> | undefined

  switch (scenario.module) {
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

    // inquiry_parse, correspondence, quote_draft handled by deterministic evaluators
    default:
      return {
        system: 'Return valid JSON only.',
        user: `Score this output: ${outputStr}\nReturn JSON: { "score": 50, "failures": ["no evaluator for this module"] }`,
      }
  }
}

/**
 * Evaluates a pipeline output against scenario ground truth.
 * Uses deterministic checks for inquiry_parse, correspondence, quote_draft (Formula > AI).
 * Uses Ollama for subjective quality evaluation on client_parse, allergen_risk, menu_suggestions.
 * Returns score (0–100), passed (>=70), and specific failure reasons.
 * Never throws - returns score=0 with error on failure.
 */
export async function evaluateOutput(
  scenario: SimScenario,
  rawOutput: unknown
): Promise<EvaluationResult> {
  if (rawOutput === null || rawOutput === undefined) {
    return { score: 0, passed: false, failures: ['Pipeline returned no output'] }
  }

  // Formula > AI: deterministic evaluation for structured output modules
  switch (scenario.module) {
    case 'inquiry_parse':
      return evaluateInquiryParseDeterministic(scenario, rawOutput)
    case 'correspondence':
      return evaluateCorrespondenceDeterministic(scenario, rawOutput)
    case 'quote_draft':
      return evaluateQuoteDraftDeterministic(scenario, rawOutput)
  }

  // Ollama-based evaluation for subjective quality modules
  const config = getOllamaConfig()
  const ollama = makeOllamaClient()
  const prompt = buildEvaluatorPrompt(scenario, rawOutput)

  try {
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
