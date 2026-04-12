// Quality Evaluator
// Grades pipeline outputs against scenario ground truth.
// Formula > AI: uses deterministic checks where possible, Ollama only for subjective quality.
// Returns a score (0–100) and a list of specific failure reasons.
// Score >= 70 = passed. Failures are human-readable for developer review.

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

function evaluateClientParseDeterministic(
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

  // Name check (accept camelCase or snake_case from model)
  const expectedName = gt.expectedName as string | null
  const actualName = (out.fullName ?? out.full_name ?? null) as string | null
  if (expectedName !== null) {
    if (!fuzzyMatch(actualName, expectedName)) {
      score -= 30
      failures.push(`Name: expected "${expectedName}", got "${actualName}"`)
    }
  } else if (actualName !== null && actualName !== '') {
    score -= 30
    failures.push(`Name: expected null, parser invented "${actualName}"`)
  }

  // Email check (accept email or email_address from model)
  const expectedEmail = gt.expectedEmail as string | null
  const actualEmail = (out.email ?? out.email_address ?? null) as string | null
  if (expectedEmail !== null) {
    if (!fuzzyMatch(actualEmail, expectedEmail)) {
      score -= 25
      failures.push(`Email: expected "${expectedEmail}", got "${actualEmail}"`)
    }
  } else if (actualEmail !== null && actualEmail !== '') {
    score -= 25
    failures.push(`Email: expected null, parser invented "${actualEmail}"`)
  }

  // Dietary restrictions check - expected items should appear in output
  const expectedDietary = (gt.expectedDietary as string[]) ?? []
  const actualDietary = [
    ...((out.dietaryRestrictions as string[]) ?? []),
    ...((out.allergies as string[]) ?? []),
  ].map((s) => s.toLowerCase())
  for (const expected of expectedDietary) {
    const found = actualDietary.some(
      (a) => a.includes(expected.toLowerCase()) || expected.toLowerCase().includes(a)
    )
    if (!found) {
      score -= 20
      failures.push(`Dietary restriction "${expected}" not found in output`)
    }
  }

  score = Math.max(0, score)
  return { score, passed: score >= 70, failures }
}

function evaluateAllergenRiskDeterministic(
  scenario: SimScenario,
  rawOutput: unknown
): EvaluationResult {
  const out = rawOutput as Record<string, unknown> | null
  if (!out || typeof out !== 'object') {
    return { score: 0, passed: false, failures: ['Pipeline returned no valid object'] }
  }

  const gt = scenario.groundTruth
  const expectedRisks = (gt.expectedRisks as string[]) ?? []
  let score = 100
  const failures: string[] = []

  // Must have rows array
  const rows = out.rows
  if (!Array.isArray(rows) || rows.length === 0) {
    score -= 40
    failures.push('Missing or empty rows array - no dish x guest analysis produced')
  }

  // Must have safetyFlags array
  const safetyFlags = out.safetyFlags
  if (!Array.isArray(safetyFlags)) {
    score -= 20
    failures.push('Missing safetyFlags field')
  }

  // If risks were expected, safetyFlags must be non-empty
  if (expectedRisks.length > 0 && Array.isArray(safetyFlags) && safetyFlags.length === 0) {
    score -= 30
    failures.push(`Expected ${expectedRisks.length} risk(s) but safetyFlags is empty`)
  }

  // Must have at least one non-safe row when risks are expected
  if (expectedRisks.length > 0 && Array.isArray(rows) && rows.length > 0) {
    const hasNonSafe = (rows as Array<Record<string, unknown>>).some(
      (r) => r.riskLevel !== 'safe' && r.riskLevel !== 'unknown'
    )
    if (!hasNonSafe) {
      score -= 25
      failures.push('All rows marked safe despite expected allergen conflicts')
    }
  }

  // Confidence field should exist
  if (!out.confidence) {
    score -= 10
    failures.push('Missing confidence field')
  }

  score = Math.max(0, score)
  return { score, passed: score >= 70, failures }
}

function evaluateMenuSuggestionsDeterministic(
  scenario: SimScenario,
  rawOutput: unknown
): EvaluationResult {
  const out = rawOutput as Record<string, unknown> | null
  if (!out || typeof out !== 'object') {
    return { score: 0, passed: false, failures: ['Pipeline returned no valid object'] }
  }

  const ctx = scenario.context as Record<string, unknown> | undefined
  const dietary = ((ctx?.dietaryRestrictions as string[]) ?? []).map((d) => d.toLowerCase())
  let score = 100
  const failures: string[] = []

  // Must have menus array with 3+ options
  const menus = out.menus
  if (!Array.isArray(menus) || menus.length === 0) {
    return { score: 0, passed: false, failures: ['Missing or empty menus array'] }
  }
  if (menus.length < 3) {
    score -= 20
    failures.push(`Only ${menus.length} menu option(s), need at least 3`)
  }

  let hasCoursesAll = true
  let violationCount = 0

  // Allergen keywords that indicate a dietary violation
  const GLUTEN_TRIGGERS = [
    'bread',
    'pasta',
    'flour',
    'wheat',
    'gluten',
    'crouton',
    'soy sauce',
    'breaded',
    'battered',
  ]
  const NUT_TRIGGERS = [
    'almond',
    'walnut',
    'pecan',
    'cashew',
    'hazelnut',
    'pistachio',
    'pine nut',
    'peanut',
    'nut',
  ]
  const DAIRY_TRIGGERS = [
    'cheese',
    'cream',
    'butter',
    'milk',
    'yogurt',
    'parmesan',
    'cheddar',
    'brie',
    'ricotta',
    'mozzarella',
  ]
  const VEGAN_TRIGGERS = [
    'chicken',
    'beef',
    'pork',
    'fish',
    'salmon',
    'shrimp',
    'lobster',
    'bacon',
    'lamb',
    'meat',
    'egg',
    'honey',
    'dairy',
    'cheese',
    'cream',
    'butter',
    'milk',
  ]
  const SHELLFISH_TRIGGERS = [
    'shrimp',
    'lobster',
    'crab',
    'scallop',
    'clam',
    'oyster',
    'mussel',
    'shellfish',
  ]

  for (const menu of menus as Array<Record<string, unknown>>) {
    // Each menu should have courses
    const courses = menu.courses
    if (!Array.isArray(courses) || courses.length === 0) {
      hasCoursesAll = false
    }

    // Check dishes for dietary violations
    if (dietary.length > 0 && Array.isArray(courses)) {
      for (const course of courses as Array<Record<string, unknown>>) {
        const dishText =
          `${String(course.dish ?? '')} ${String(course.description ?? '')}`.toLowerCase()

        for (const restriction of dietary) {
          if (restriction.includes('gluten') && GLUTEN_TRIGGERS.some((t) => dishText.includes(t))) {
            violationCount++
            failures.push(`Gluten-free violation: "${course.dish}" contains gluten`)
          }
          if (
            (restriction.includes('nut') || restriction.includes('tree nut')) &&
            NUT_TRIGGERS.some((t) => dishText.includes(t))
          ) {
            violationCount++
            failures.push(`Nut-free violation: "${course.dish}" contains nuts`)
          }
          if (restriction.includes('dairy') && DAIRY_TRIGGERS.some((t) => dishText.includes(t))) {
            violationCount++
            failures.push(`Dairy-free violation: "${course.dish}" contains dairy`)
          }
          if (restriction.includes('vegan') && VEGAN_TRIGGERS.some((t) => dishText.includes(t))) {
            violationCount++
            failures.push(`Vegan violation: "${course.dish}" is not vegan`)
          }
          if (
            restriction.includes('shellfish') &&
            SHELLFISH_TRIGGERS.some((t) => dishText.includes(t))
          ) {
            violationCount++
            failures.push(`Shellfish-free violation: "${course.dish}" contains shellfish`)
          }
        }
      }
    }
  }

  if (!hasCoursesAll) {
    score -= 15
    failures.push('One or more menus missing course structure')
  }

  // Cap total violation penalty at -35
  if (violationCount > 0) {
    score -= Math.min(35, violationCount * 12)
  }

  score = Math.max(0, score)
  return { score, passed: score >= 70, failures }
}

/**
 * Evaluates a pipeline output against scenario ground truth.
 * Uses deterministic checks for all modules (Formula > AI).
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

  // Formula > AI: deterministic evaluation for all modules
  switch (scenario.module) {
    case 'inquiry_parse':
      return evaluateInquiryParseDeterministic(scenario, rawOutput)
    case 'correspondence':
      return evaluateCorrespondenceDeterministic(scenario, rawOutput)
    case 'quote_draft':
      return evaluateQuoteDraftDeterministic(scenario, rawOutput)
    case 'client_parse':
      return evaluateClientParseDeterministic(scenario, rawOutput)
    case 'allergen_risk':
      return evaluateAllergenRiskDeterministic(scenario, rawOutput)
    case 'menu_suggestions':
      return evaluateMenuSuggestionsDeterministic(scenario, rawOutput)
  }
}
