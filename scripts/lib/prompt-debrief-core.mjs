function has(text, pattern) {
  return pattern.test(text)
}

function listSignals(entries) {
  return entries.map((entry) => `- ${entry.present ? 'PRESENT' : 'MISSING'} ${entry.label}`).join('\n')
}

function scoreOutcome(signals) {
  const weights = {
    changedFiles: 15,
    verification: 20,
    runtimeProof: 20,
    proofPack: 20,
    security: 15,
    blockers: 10,
  }
  return signals.reduce((score, signal) => score + (signal.present ? weights[signal.id] ?? 0 : 0), 0)
}

export function analyzePromptDebrief(options = {}) {
  const report = String(options.report || '')
  const prompt = String(options.prompt || '')
  const combined = `${prompt}\n${report}`

  const signals = [
    {
      id: 'changedFiles',
      label: 'changed files or file paths',
      present: has(report, /(Changed files|Files changed|app\/|components\/|lib\/|scripts\/|tests\/)/i),
    },
    {
      id: 'verification',
      label: 'verification output',
      present: has(report, /(Verification|test|typecheck|lint|PASS|FAIL|smoke)/i),
    },
    {
      id: 'runtimeProof',
      label: 'runtime or browser proof',
      present: has(report, /(runtime proof|browser console|network|server logs|screenshot|hard refresh)/i),
    },
    {
      id: 'proofPack',
      label: 'proof pack or finish-check status',
      present: has(report, /(proof[- ]pack|finish-check|acceptance evidence)/i),
    },
    {
      id: 'security',
      label: 'security, auth, tenant, or role summary',
      present: has(report, /(auth|tenant|route-policy|requireAdmin|permissions|role)/i),
    },
    {
      id: 'blockers',
      label: 'blockers, risks, or partial work notes',
      present: has(report, /(blocker|risk|remaining|partial|not verified|could not|skipped)/i),
    },
  ]

  const promptMisses = [
    {
      condition: !has(prompt, /acceptance criteria/i),
      text: 'Add explicit acceptance criteria before execution.',
    },
    {
      condition: !has(prompt, /proof[- ]pack|finish-check/i),
      text: 'Require proof pack and finish-check for fired queue work.',
    },
    {
      condition: !has(prompt, /git status --short|dirty workspace/i),
      text: 'Require dirty workspace inspection and preservation of unrelated work.',
    },
    {
      condition: !has(prompt, /file ownership|non-overlapping/i),
      text: 'Define file ownership and non-overlapping agent lanes before parallel work.',
    },
    {
      condition: !has(prompt, /auth|tenant|route-policy|requireAdmin/i),
      text: 'Include server-side auth, tenant scoping, route policy, and admin guard rules.',
    },
    {
      condition: has(report, /assum|unclear|guessed|not verified|could not|skipped/i),
      text: 'Tighten the next prompt around assumptions, unclear decisions, skipped checks, or unverified claims found in the final report.',
    },
  ]
    .filter((item) => item.condition)
    .map((item) => item.text)

  return {
    signals,
    promptMisses,
    outcomeScore: scoreOutcome(signals),
    passedSignals: signals.filter((signal) => signal.present).length,
    totalSignals: signals.length,
  }
}

export function formatPromptDebrief(analysis, options = {}) {
  const title = options.title || 'Prompt Debrief'
  const misses =
    analysis.promptMisses.length > 0
      ? analysis.promptMisses.map((miss) => `- ${miss}`).join('\n')
      : '- No obvious prompt misses were detected from the supplied prompt/report pair.'

  return `# ${title}

## Outcome Signals

${listSignals(analysis.signals)}

Signal coverage: ${analysis.passedSignals}/${analysis.totalSignals}

Outcome score: ${analysis.outcomeScore}/100

## Prompt Misses

${misses}

## Future Prompt Additions

- Ask the build agent to state assumptions before editing.
- Ask for explicit changed-file grouping by domain.
- Ask for verification commands with exact pass/fail output.
- Ask for runtime proof, proof-pack path, and finish-check result.
- Ask for follow-up queue items when work remains partial or blocked.

## Follow-Up Queue Or Verification Notes

- If any outcome signal is missing, keep the related queue item in-flight or blocked until evidence exists.
- If report language includes skipped, not verified, could not, unclear, or assumed, require a follow-up verification or spec decision.
`
}
