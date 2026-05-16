const REQUIRED_CHECKS = [
  {
    id: 'copyPasteBlock',
    label: 'Copy-paste prompt block',
    weight: 8,
    patterns: [/COPY-PASTE PROMPT/i],
    guidance: 'Add a fenced text block that starts with COPY-PASTE PROMPT.',
  },
  {
    id: 'rawRequest',
    label: 'Raw request preserved',
    weight: 8,
    patterns: [/Raw (idea|request|user idea)/i, /Raw Request \/ Research Source/i],
    guidance: 'Preserve the user raw idea or request explicitly.',
  },
  {
    id: 'objective',
    label: 'Objective or task stated',
    weight: 7,
    patterns: [/Objective/i, /Your task:/i, /Build Goal/i],
    guidance: 'State the objective or task in one clear section.',
  },
  {
    id: 'canonicalContext',
    label: 'Canonical context listed',
    weight: 9,
    patterns: [/AGENTS\.md/i, /\.claude\/skills\/omninet\/SKILL\.md/i, /docs\/\.codex-workspace-brief\.md/i],
    minimumMatches: 2,
    guidance: 'List AGENTS.md plus Omninet or the Codex workspace brief as required context.',
  },
  {
    id: 'queueState',
    label: 'Queue state and overlap check',
    weight: 9,
    patterns: [/build-queue/i, /in-flight/i, /blocked/i, /active/i, /domain-plan/i],
    minimumMatches: 2,
    guidance: 'Require active, in-flight, blocked, and duplicate queue checks.',
  },
  {
    id: 'dirtyWorkspace',
    label: 'Dirty workspace protection',
    weight: 8,
    patterns: [/git status --short/i, /dirty work(space)?/i, /unrelated dirty work/i, /Do not overwrite/i],
    guidance: 'Require git status and preservation of unrelated dirty work.',
  },
  {
    id: 'fileOwnership',
    label: 'File ownership boundaries',
    weight: 8,
    patterns: [/file ownership/i, /ownership boundaries/i, /non-overlapping/i, /Files You May MODIFY/i],
    guidance: 'Define file ownership boundaries, especially for multi-agent work.',
  },
  {
    id: 'securityTenant',
    label: 'Server-side security and tenant rules',
    weight: 10,
    patterns: [/server-side/i, /auth/i, /tenant/i, /route-policy/i, /requireAdmin/i],
    minimumMatches: 3,
    guidance: 'Include server-side auth, tenant scoping, route policy, and admin guard requirements.',
  },
  {
    id: 'verification',
    label: 'Verification commands or steps',
    weight: 8,
    patterns: [/Verification/i, /tests?/i, /typecheck/i, /browser console/i, /runtime/i],
    minimumMatches: 2,
    guidance: 'Name focused tests, type checks, runtime checks, or UI proof expectations.',
  },
  {
    id: 'proofGate',
    label: 'Proof pack and finish-check gate',
    weight: 10,
    patterns: [/proof[- ]pack/i, /finish-check/i, /Runtime proof/i],
    minimumMatches: 2,
    guidance: 'Require proof pack, runtime proof, and build-queue finish-check for fired work.',
  },
  {
    id: 'implementationGuard',
    label: 'Implementation authorization guard',
    weight: 8,
    patterns: [/Do not implement/i, /Do not start implementation/i, /unless explicitly authorized/i, /only after queue fire/i],
    guidance: 'Block implementation unless the prompt has explicit firing or hotfix authorization.',
  },
  {
    id: 'noInventedFiles',
    label: 'No invented files or stale docs',
    weight: 4,
    patterns: [/Do not invent files/i, /stale docs/i, /inspect current (code|files)/i],
    guidance: 'Tell the agent not to invent files and to inspect current code before trusting docs.',
  },
  {
    id: 'finalReport',
    label: 'Final report shape',
    weight: 3,
    patterns: [/Final report/i, /final answer format/i, /Report Format/i],
    guidance: 'Define the expected final report shape.',
  },
]

const MODE_CHECKS = {
  questions: [
    {
      id: 'specQuestions',
      label: 'Spec questions requested',
      patterns: [/spec questions/i, /Missing decisions/i, /not build-ready/i],
      guidance: 'For intake prompts, ask for missing decisions or spec questions.',
    },
  ],
  queue: [
    {
      id: 'queueSections',
      label: 'Queue item sections requested',
      patterns: [/Acceptance Criteria/i, /Role \/ Privacy Matrix/i, /Implementation Readiness/i, /Proof Required Before Done/i],
      minimumMatches: 3,
      guidance: 'For queue drafts, request the required build-queue item sections.',
    },
  ],
  fire: [
    {
      id: 'fireRunContract',
      label: 'Fire/run contract requested',
      patterns: [/run ID/i, /context[- ]pack/i, /wave plan/i, /in-flight/i],
      minimumMatches: 3,
      guidance: 'For fired builds, require run ID, in-flight items, context pack, and wave plan.',
    },
  ],
}

function countPatternMatches(text, patterns) {
  return patterns.reduce((count, pattern) => count + (pattern.test(text) ? 1 : 0), 0)
}

function evaluateCheck(text, check) {
  const matches = countPatternMatches(text, check.patterns)
  const needed = check.minimumMatches ?? 1
  return {
    id: check.id,
    label: check.label,
    passed: matches >= needed,
    matches,
    needed,
    weight: check.weight ?? 0,
    guidance: check.guidance,
  }
}

export function detectPromptMode(prompt) {
  const text = String(prompt ?? '')
  if (/fire-ready|Build Orchestrator|queue fire|in-flight|run ID/i.test(text)) {
    return 'fire'
  }
  if (/Queue Item|build-queue-ready|Implementation Readiness|Raw Request \/ Research Source/i.test(text)) {
    return 'queue'
  }
  return 'questions'
}

export function lintPrompt(prompt, options = {}) {
  const text = String(prompt ?? '')
  const mode = options.mode ?? detectPromptMode(text)
  const requiredResults = REQUIRED_CHECKS.map((check) => evaluateCheck(text, check))
  const modeResults = (MODE_CHECKS[mode] ?? []).map((check) => evaluateCheck(text, check))
  const allResults = [...requiredResults, ...modeResults]
  const totalWeight = requiredResults.reduce((sum, result) => sum + result.weight, 0)
  const earnedWeight = requiredResults
    .filter((result) => result.passed)
    .reduce((sum, result) => sum + result.weight, 0)
  const score = totalWeight === 0 ? 0 : Math.round((earnedWeight / totalWeight) * 100)
  const missing = allResults.filter((result) => !result.passed)
  const threshold = options.threshold ?? 85

  return {
    mode,
    score,
    threshold,
    passed: score >= threshold && missing.length === 0,
    checks: requiredResults,
    modeChecks: modeResults,
    missing,
  }
}

function uniqueMissingLabels(result) {
  return result.missing.map((check) => `- ${check.label}: ${check.guidance}`).join('\n')
}

function modeInstruction(mode) {
  if (mode === 'fire') {
    return {
      role: 'You are the ChefFlow Build Orchestrator. Execute only after queue fire or explicit direct-hotfix authorization.',
      task:
        'Build the requested scope using ChefFlow firing rules. If queue items are not in-flight, stop and fire them with build-queue.mjs before coding.',
      output:
        '- Run ID.\n- Queue item IDs.\n- Changed files grouped by domain.\n- Role/access/security summary.\n- Verification output.\n- Runtime proof.\n- Proof-pack status.\n- Remaining risks or blockers.',
      modeSpecific:
        '- Confirm run ID and in-flight item IDs.\n- Create or read the run context-pack.\n- Define a wave plan and non-overlapping file ownership.\n- Run build-queue.mjs finish-check before moving any item to done.',
    }
  }

  if (mode === 'queue') {
    return {
      role: 'You are the ChefFlow Queue Item Writer. Do not implement code.',
      task:
        'Create a build-queue-ready item draft from this idea using current repo context. Preserve the raw request and shape it into the ChefFlow queue contract.',
      output:
        '- Raw Request / Research Source\n- Goal\n- Build Goal\n- Product Domain / Module\n- Queue Reconciliation\n- Scope\n- Out Of Scope\n- Acceptance Criteria\n- Role / Privacy Matrix\n- Implementation Prep\n- Implementation Readiness score\n- Risks\n- Verification Steps\n- Proof Required Before Done\n- Open questions, only if blocking.',
      modeSpecific:
        '- Do not create the queue file unless explicitly asked.\n- Do not start implementation.\n- If the idea is not queue-ready, ask only the missing spec questions.',
    }
  }

  return {
    role: 'You are the ChefFlow Prompt Builder. Do not implement code.',
    task:
      'Turn this raw idea into a repo-grounded spec intake. Read the required context, inspect only relevant files, then ask the minimum product/spec questions needed before this can become a queue item or build prompt.',
    output:
      '- Preserved raw request.\n- What the idea seems to be asking for.\n- Existing systems/files/routes likely involved, with paths.\n- Queue overlap or duplicate risk.\n- Missing decisions.\n- Concise spec questions grouped by outcome, user flow, scope boundary, roles/privacy, acceptance criteria, and verification.\n- Recommendation: not ready, queue-ready after answers, or fire-ready after authorization.',
    modeSpecific:
      '- Do not queue the item yet.\n- Do not implement code.\n- Ask questions when acceptance criteria, roles, route ownership, data owner, or verification are unclear.',
  }
}

export function buildRepairTemplate(result, options = {}) {
  const mode = options.mode ?? result.mode ?? 'questions'
  const instruction = modeInstruction(mode)
  const originalPrompt = String(options.originalPrompt ?? '').trim()
  const rawIdea = originalPrompt.length > 0 ? originalPrompt : '[paste the raw user idea or weak prompt here]'
  const missing = result.missing?.length > 0 ? uniqueMissingLabels(result) : '- No missing checks from the linter.'

  return `COPY-PASTE PROMPT

${instruction.role}

Raw idea:
${rawIdea}

Objective:
${instruction.task}

Canonical context to read first:
- AGENTS.md
- .claude/skills/omninet/SKILL.md, if present
- docs/.codex-workspace-brief.md
- .agents/skills/build-queue/references/QUEUE-FORMAT.md
- .agents/build-queue/context-freshness.md
- .agents/build-queue/run-lifecycle.md
- .agents/build-queue/role-domain-matrix.md
- .agents/build-queue/domain-orchestration.md
- .agents/build-queue/build-observability.md
- Relevant queue items, domain docs, route files, server actions, API routes, tests, and current implementation files discovered during inspection.

Before output or coding:
- Run git status --short.
- Preserve unrelated dirty work. Do not overwrite user or agent changes.
- Check build-queue active, in-flight, blocked, and relevant done items for overlap.
- Run or inspect build-queue status, domain-plan, and workspace output when available.
- Inspect current files before trusting stale docs. Do not invent files.
- Define file ownership boundaries before any multi-agent work.

Implementation authorization:
- Do not start implementation unless this prompt is explicitly fire-ready, direct-hotfix authorized, or the queue has been fired.
- For conversational feature ideas, produce spec questions or a queue draft instead of editing app code.

Security and tenancy requirements:
- Enforce permissions server-side.
- Server actions must call requireChef(), requireClient(), requireAuth(), requireAdmin(), requireStaff(), or requirePartner() before data access.
- API routes must pass middleware auth or self-authenticate with the approved auth helper, cron auth, or webhook signature verification.
- Tenant data queries must scope by tenant_id or chef_id as appropriate.
- New protected page routes must be registered in lib/auth/route-policy.ts.
- Admin pages and admin server actions must call requireAdmin().

Mode-specific instructions:
${instruction.modeSpecific}

Missing safeguards from the weak prompt:
${missing}

Verification and proof:
- Name focused tests, type checks, and smoke/runtime checks before implementation begins.
- For UI work, hard refresh affected routes and check browser console, network, server logs, and runtime errors.
- Capture visible proof when user-facing surfaces changed.
- For fired queue work, create or update the proof pack and run build-queue.mjs finish-check.
- Do not move queue items to done unless acceptance criteria, runtime proof, proof pack, and finish-check all support completion.

Output:
${instruction.output}
`
}

export function formatPromptLintReport(result) {
  const lines = [
    `Prompt lint: ${result.passed ? 'PASS' : 'FAIL'} (${result.score}/${result.threshold})`,
    `Mode: ${result.mode}`,
    '',
    'Checks:',
  ]

  for (const check of [...result.checks, ...result.modeChecks]) {
    const status = check.passed ? 'PASS' : 'FAIL'
    lines.push(`- ${status} ${check.label}`)
  }

  if (result.missing.length > 0) {
    lines.push('', 'Missing or weak:')
    for (const check of result.missing) {
      lines.push(`- ${check.label}: ${check.guidance}`)
    }
  }

  return `${lines.join('\n')}\n`
}
