const PATH_PATTERN =
  /((?:(?:\.agents|\.claude|app|components|lib|scripts|tests|docs|types|hooks|styles|public)\/[A-Za-z0-9_./()@$\-+]+|middleware\.ts|package\.json|tsconfig[\w.-]*\.json|next\.config\.[\w.-]+))/gm

function normalizePath(value) {
  return String(value || '')
    .trim()
    .replace(/\\/g, '/')
    .replace(/^[('"`]+|[)'",:`]+$/g, '')
    .replace(/\.$/, '')
}

function unique(values) {
  return [...new Set(values.filter(Boolean))]
}

export function extractFileReferences(text) {
  const matches = []
  const source = String(text || '')
  for (const match of source.matchAll(PATH_PATTERN)) {
    matches.push(normalizePath(match[1]))
  }
  return unique(matches).sort()
}

export function parseGitStatusPaths(gitStatus) {
  return String(gitStatus || '')
    .split(/\r?\n/)
    .map((line) => normalizePath(line.slice(3)))
    .filter(Boolean)
    .sort()
}

export function inferSecuritySurface(input) {
  const text = String(input || '')
  return {
    needsSecurity:
      /(server action|'use server'|app\/api|route\.ts|database|db query|supabase|drizzle|tenant|admin|protected route|PII|auth)/i.test(
        text,
      ),
    serverAction: /(server action|'use server'|actions?\.(ts|tsx))/i.test(text),
    apiRoute: /(app\/api|route\.ts|API route)/i.test(text),
    database: /(database|db query|supabase|drizzle|tenant_id|chef_id)/i.test(text),
    admin: /(admin|requireAdmin|\/admin)/i.test(text),
    protectedRoute: /(protected route|route-policy|app\/\(chef\)|app\/\(client\)|app\/\(admin\)|middleware\.ts)/i.test(text),
  }
}

export function buildSecurityAppendix(input) {
  const surface = inferSecuritySurface(input)
  if (!surface.needsSecurity) {
    return {
      surface,
      appendix: 'No protected route, API, server action, admin, tenant-data, or database surface was detected.',
    }
  }

  return {
    surface,
    appendix: `## Security Appendix

- Server actions must call requireChef(), requireClient(), requireAuth(), requireAdmin(), requireStaff(), or requirePartner() before any data access.
- API routes must pass through middleware auth or self-authenticate with verifyCronAuth, withApiAuth, webhook signature verification, or an equivalent approved helper.
- Database queries returning tenant data must scope by tenant_id or chef_id as appropriate.
- Dynamic route params must not be the sole tenant-data filter.
- New protected page routes must be registered in lib/auth/route-policy.ts.
- Admin pages and admin server actions must call requireAdmin().
- UI hiding is not a security boundary; server-side protection must exist independently.
`,
  }
}

export function recommendVerification(input = {}) {
  const text = String(input.text || '')
  const files = unique([...(input.files || []), ...extractFileReferences(text)]).sort()
  const fileText = files.join('\n')
  const commands = []
  const manual = []

  if (files.some((file) => /tests\/.*\.test\.(ts|tsx|js)$/.test(file))) {
    const testFiles = files.filter((file) => /tests\/.*\.test\.(ts|tsx|js)$/.test(file))
    commands.push(`node --test --import tsx ${testFiles.map((file) => `"${file}"`).join(' ')}`)
  }

  if (/(app\/|components\/|hooks\/|styles\/|\.tsx$)/i.test(fileText)) {
    commands.push('npm run typecheck')
    manual.push('Hard refresh affected routes and check browser console, network, server logs, and runtime errors.')
    manual.push('Capture visible proof for changed UI surfaces.')
  }

  if (/(lib\/auth|middleware\.ts|route-policy|permissions|requireAdmin)/i.test(fileText + text)) {
    commands.push(
      'node --test --import tsx tests/unit/middleware.routing.test.ts tests/unit/server-action-auth-inventory.test.ts tests/unit/auth.tenant-isolation.test.ts',
    )
  }

  if (/(app\/api|route\.ts|server action|actions\.ts|database|tenant_id|chef_id|drizzle|supabase)/i.test(fileText + text)) {
    commands.push('npm run typecheck')
    manual.push('Inspect auth guards and tenant scoping on every touched server action, API route, and DB query.')
  }

  if (/scripts\/.*\.(mjs|js)$/i.test(fileText)) {
    for (const file of files.filter((candidate) => /scripts\/.*\.(mjs|js)$/i.test(candidate))) {
      commands.push(`node --check "${file}"`)
    }
  }

  if (/package\.json/i.test(fileText)) {
    commands.push('npm run format:check')
  }

  if (commands.length === 0) {
    commands.push('npm run typecheck')
    manual.push('Choose focused unit, smoke, or runtime checks after inspecting the actual touched files.')
  }

  return {
    files,
    commands: unique(commands),
    manual: unique(manual),
  }
}

export function formatVerificationRecommendation(recommendation) {
  return `# Prompt Verification Recommendation

## Files Detected

${recommendation.files.length > 0 ? recommendation.files.map((file) => `- ${file}`).join('\n') : '- No concrete files detected. Inspect current code before choosing final verification.'}

## Commands

${recommendation.commands.map((command) => `- \`${command}\``).join('\n')}

## Runtime Or Manual Checks

${recommendation.manual.length > 0 ? recommendation.manual.map((item) => `- ${item}`).join('\n') : '- No extra runtime checks inferred from the supplied files.'}
`
}

export function buildCollisionPreflight(input = {}) {
  const promptFiles = extractFileReferences(input.prompt || '')
  const queueFiles = (input.queueItems || []).flatMap((item) => extractFileReferences(item.content || ''))
  const dirtyFiles = parseGitStatusPaths(input.gitStatus || '')
  const promptSet = new Set(promptFiles)
  const queueCollisions = unique(queueFiles.filter((file) => promptSet.has(file))).sort()
  const dirtyCollisions = unique(dirtyFiles.filter((file) => promptSet.has(file))).sort()

  return {
    promptFiles,
    queueFiles: unique(queueFiles).sort(),
    dirtyFiles,
    queueCollisions,
    dirtyCollisions,
    risk: queueCollisions.length > 0 || dirtyCollisions.length > 0 ? 'high' : promptFiles.length > 0 ? 'medium' : 'unknown',
  }
}

export function formatCollisionPreflight(preflight) {
  return `# Prompt Collision Preflight

Risk: ${preflight.risk}

## Files Named By Prompt

${preflight.promptFiles.length > 0 ? preflight.promptFiles.map((file) => `- ${file}`).join('\n') : '- No concrete files named by the prompt. Require inspection before parallel work.'}

## Queue File Overlap

${preflight.queueCollisions.length > 0 ? preflight.queueCollisions.map((file) => `- ${file}`).join('\n') : '- No prompt-to-queue file overlap detected from supplied queue items.'}

## Dirty Workspace Overlap

${preflight.dirtyCollisions.length > 0 ? preflight.dirtyCollisions.map((file) => `- ${file}`).join('\n') : '- No prompt-to-dirty-workspace overlap detected.'}

## Agent Instruction

- Do not let parallel agents edit files listed in Queue File Overlap or Dirty Workspace Overlap.
- If no concrete files are named, require the lead orchestrator to inspect likely files and define ownership before delegation.
- Preserve unrelated dirty work.
`
}

export function buildPromptManifest(input = {}) {
  const runId = input.runId || 'RUN-ID-MISSING'
  const generatedAt = input.generatedAt || new Date().toISOString()
  const queueIds = Array.isArray(input.queueIds) ? input.queueIds : []
  const lintScore = input.lintScore ?? 'not recorded'

  return `# Prompt Run Manifest

Run ID: ${runId}
Generated: ${generatedAt}

## Chain

- Raw idea: ${input.rawIdeaPath || input.rawIdea || 'not recorded'}
- Generated prompt: ${input.promptPath || 'not recorded'}
- Prompt lint score: ${lintScore}
- Context pack: ${input.contextPackPath || 'not recorded'}
- Queue IDs: ${queueIds.length > 0 ? queueIds.join(', ') : 'not recorded'}
- Final report: ${input.finalReportPath || 'not recorded'}
- Prompt debrief: ${input.debriefPath || 'not recorded'}

## Required Closeout

- Archive the exact generated prompt.
- Keep this manifest updated when context pack, final report, or debrief paths change.
- Do not mark a fired item done unless proof pack, runtime proof, verification output, and finish-check support the acceptance criteria.
`
}
