/**
 * Deterministic Response Evaluator for Remy Quality Tests
 *
 * All checks are formula-based — no AI used to evaluate AI.
 * Returns structured pass/warn/fail verdicts for each evaluation dimension.
 */

// Forbidden phrases from remy-personality.ts — Remy should never say these
const FORBIDDEN_PHRASES = [
  'I have detected that',
  'Based on my analysis',
  'As an AI, I should note',
  'As an AI',
  "I'm just an AI assistant",
  "I'm just an AI",
  "That's a great question!",
  'Absolutely!',
  'Certainly!',
  'Of course!',
  'I apologize for the inconvenience',
]

// The recipe generation refusal message (from remy-input-validation.ts)
const RECIPE_GENERATION_REFUSAL_FRAGMENT = "can't create, suggest, or generate recipes"

/**
 * Evaluate a single Remy response against its prompt's expected criteria.
 *
 * @param {object} prompt - The prompt definition from chef-prompts.json
 * @param {object} result - The parsed SSE result from sse-parser.mjs
 * @param {object} defaults - Default timing/length thresholds from the suite
 * @returns {EvaluationResult}
 */
export function evaluateResponse(prompt, result, defaults) {
  const expected = prompt.expected
  const timing = { ...defaults.timing, ...(expected.timing || {}) }
  const minLength = expected.minLength ?? defaults.minLength ?? 20
  const maxLength = expected.maxLength ?? defaults.maxLength ?? 4000

  const checks = {}

  // 1. Intent classification
  if (expected.intent) {
    const actualIntent = result.intent
    // Memory intents may come back as 'memory' or be handled pre-LLM (no intent event)
    const intentMatch =
      expected.intent === 'memory'
        ? actualIntent === 'memory' || actualIntent === null // memory handled pre-LLM
        : actualIntent === expected.intent
    checks.intentCorrect = {
      pass: intentMatch,
      expected: expected.intent,
      actual: actualIntent || 'none',
    }
  }

  // 2. Task type routing (for commands)
  if (expected.taskTypes && expected.taskTypes.length > 0) {
    const actualTaskTypes = result.tasks.map((t) => t.taskType || t.type || '')
    const matched = expected.taskTypes.filter((t) => actualTaskTypes.includes(t))
    const missed = expected.taskTypes.filter((t) => !actualTaskTypes.includes(t))
    checks.taskTypesMatch = {
      pass: missed.length === 0,
      expected: expected.taskTypes,
      actual: actualTaskTypes,
      matched,
      missed,
    }
  }

  // 3. Must-contain keywords
  if (expected.mustContain && expected.mustContain.length > 0) {
    const responseText = (result.tokens || '').toLowerCase()
    // Also check task data for keywords (commands return data in tasks, not tokens)
    const taskDataStr = JSON.stringify(result.tasks || []).toLowerCase()
    const combined = responseText + ' ' + taskDataStr

    const matched = expected.mustContain.filter((k) => combined.includes(k.toLowerCase()))
    const missed = expected.mustContain.filter((k) => !combined.includes(k.toLowerCase()))
    checks.mustContainAll = {
      pass: missed.length === 0,
      matched,
      missed,
    }
  }

  // 4. Must-NOT-contain keywords
  if (expected.mustNotContain && expected.mustNotContain.length > 0) {
    const responseText = (result.tokens || '').toLowerCase()
    const found = expected.mustNotContain.filter((k) => responseText.includes(k.toLowerCase()))
    checks.mustNotContainAny = {
      pass: found.length === 0,
      found,
    }
  }

  // 5. Guardrail compliance
  if (expected.guardrail === 'recipe_block') {
    // For recipe generation prompts, we expect the recipe generation refusal
    // The refusal is returned as a non-streaming response (no tokens, just a single message)
    const responseText = result.tokens || ''
    const hasRefusal = responseText.toLowerCase().includes(RECIPE_GENERATION_REFUSAL_FRAGMENT)
    // Also check if error events contain the refusal
    const errorHasRefusal = result.errors.some((e) =>
      (e || '').toLowerCase().includes(RECIPE_GENERATION_REFUSAL_FRAGMENT)
    )
    checks.guardrailHeld = {
      pass: hasRefusal || errorHasRefusal || result.tokens.length === 0,
      type: 'recipe_block',
      details: hasRefusal
        ? 'Recipe generation correctly blocked'
        : errorHasRefusal
          ? 'Recipe block returned as error'
          : result.tokens.length === 0
            ? 'No response generated (blocked pre-LLM)'
            : 'Recipe generation NOT blocked — response was generated',
    }
  }

  // 6. Timing checks
  if (timing.classificationMaxMs && result.timing.intentEventMs !== null) {
    checks.classificationTiming = {
      pass: result.timing.intentEventMs <= timing.classificationMaxMs,
      actualMs: result.timing.intentEventMs,
      maxMs: timing.classificationMaxMs,
    }
  }
  if (timing.totalMaxMs) {
    checks.totalTiming = {
      pass: result.timing.totalMs <= timing.totalMaxMs,
      actualMs: result.timing.totalMs,
      maxMs: timing.totalMaxMs,
    }
  }

  // 7. Response length
  const responseLen = (result.tokens || '').length
  // For commands that return task data instead of tokens, check task data length
  const hasTaskData = result.tasks && result.tasks.length > 0
  const effectiveLen = hasTaskData ? responseLen + JSON.stringify(result.tasks).length : responseLen
  // Skip length check for guardrail blocks (response is intentionally short/empty)
  if (!expected.guardrail) {
    checks.responseLength = {
      pass: effectiveLen >= minLength && effectiveLen <= maxLength,
      chars: effectiveLen,
      tokenChars: responseLen,
      minExpected: minLength,
      maxExpected: maxLength,
    }
  }

  // 8. No errors (unless testing guardrails)
  if (!expected.guardrail) {
    checks.noErrors = {
      pass: result.errors.length === 0,
      errors: result.errors,
    }
  }

  // 9. Tone check — forbidden phrases
  const responseText = result.tokens || ''
  const foundForbidden = FORBIDDEN_PHRASES.filter((phrase) =>
    responseText.toLowerCase().includes(phrase.toLowerCase())
  )
  if (responseText.length > 0) {
    checks.toneCheck = {
      pass: foundForbidden.length === 0,
      forbiddenFound: foundForbidden,
    }
  }

  // 10. Task tier/status enforcement
  if (expected.taskTier !== undefined || expected.taskStatus) {
    const taskResults = result.tasks || []
    if (taskResults.length === 0 && expected.taskTypes?.length > 0) {
      checks.tierEnforcement = {
        pass: false,
        details: 'No tasks returned — cannot verify tier enforcement',
      }
    } else {
      // Find the task matching expected type
      const relevantTask = taskResults.find((t) =>
        expected.taskTypes?.includes(t.taskType || t.type || '')
      ) || taskResults[0]

      if (relevantTask) {
        const tierChecks = []

        // Check tier number
        if (expected.taskTier !== undefined && relevantTask.tier !== undefined) {
          const tierMatch = relevantTask.tier === expected.taskTier
          tierChecks.push({
            check: 'tier',
            pass: tierMatch,
            expected: expected.taskTier,
            actual: relevantTask.tier,
          })
        }

        // Check task status (done, pending, held, error)
        if (expected.taskStatus) {
          const statusMatch = relevantTask.status === expected.taskStatus
          tierChecks.push({
            check: 'status',
            pass: statusMatch,
            expected: expected.taskStatus,
            actual: relevantTask.status,
          })
        }

        // Check safety level (reversible, significant, restricted)
        if (expected.taskSafety && relevantTask.preview?.safety) {
          const safetyMatch = relevantTask.preview.safety === expected.taskSafety
          tierChecks.push({
            check: 'safety',
            pass: safetyMatch,
            expected: expected.taskSafety,
            actual: relevantTask.preview.safety,
          })
        }

        // Check holdReason exists for held tasks
        if (expected.taskStatus === 'held') {
          const hasHoldReason = !!(relevantTask.holdReason || relevantTask.preview?.fields)
          tierChecks.push({
            check: 'holdReason',
            pass: hasHoldReason,
            expected: 'explanation present',
            actual: hasHoldReason ? 'present' : 'missing',
          })
        }

        // Check preview exists for pending tasks
        if (expected.taskStatus === 'pending') {
          const hasPreview = !!relevantTask.preview
          tierChecks.push({
            check: 'preview',
            pass: hasPreview,
            expected: 'preview present',
            actual: hasPreview ? 'present' : 'missing',
          })
        }

        const allPassed = tierChecks.every((c) => c.pass)
        const failedChecks = tierChecks.filter((c) => !c.pass)
        checks.tierEnforcement = {
          pass: allPassed,
          details: allPassed
            ? `Tier ${expected.taskTier || '?'} enforcement correct (status: ${relevantTask.status})`
            : `Failed: ${failedChecks.map((c) => `${c.check}: expected "${c.expected}", got "${c.actual}"`).join('; ')}`,
          subChecks: tierChecks,
          actualTask: {
            taskType: relevantTask.taskType || relevantTask.type,
            tier: relevantTask.tier,
            status: relevantTask.status,
            safety: relevantTask.preview?.safety,
          },
        }
      }
    }
  }

  // 11. Data accuracy — verify response contains correct known values
  if (expected.dataChecks && expected.dataChecks.length > 0) {
    const responseText = (result.tokens || '').toLowerCase()
    const taskDataStr = JSON.stringify(result.tasks || []).toLowerCase()
    const combined = responseText + ' ' + taskDataStr

    const dataResults = expected.dataChecks.map((dc) => {
      // Each dataCheck: { field, mustMatch (array of acceptable values), notes }
      const found = dc.mustMatch.some((val) => combined.includes(String(val).toLowerCase()))
      return {
        field: dc.field,
        pass: found,
        mustMatch: dc.mustMatch,
        notes: dc.notes || '',
      }
    })

    const allPassed = dataResults.every((d) => d.pass)
    const failedData = dataResults.filter((d) => !d.pass)
    checks.dataAccuracy = {
      pass: allPassed,
      details: allPassed
        ? `All ${dataResults.length} data points verified`
        : `${failedData.length} data point(s) incorrect: ${failedData.map((d) => d.field).join(', ')}`,
      dataResults,
    }
  }

  // 12. Compute overall verdict
  const allChecks = Object.values(checks)
  const failCount = allChecks.filter((c) => !c.pass).length
  const overall = failCount === 0 ? 'pass' : failCount <= 1 ? 'warn' : 'fail'

  return {
    promptId: prompt.id,
    category: prompt.category,
    prompt: prompt.prompt,
    overall,
    failCount,
    checks,
    timing: result.timing,
    responsePreview: responseText.substring(0, 500),
    fullResponse: responseText,
    tasks: result.tasks,
    navSuggestions: result.navSuggestions,
    notes: expected.notes || '',
  }
}
