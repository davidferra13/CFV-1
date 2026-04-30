#!/usr/bin/env node

import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { builtinModules } from 'node:module'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const ROOT = path.resolve(__dirname, '..')

const TEXT_EXTENSIONS = new Set([
  '.js',
  '.jsx',
  '.mjs',
  '.cjs',
  '.ts',
  '.tsx',
  '.sql',
  '.md',
  '.json',
])

const DEFAULT_SCAN_DIRS = ['app', 'components', 'lib', 'scripts', 'devtools']
const ROUTE_SCAN_DIRS = ['app', 'lib']
const MONEY_SCAN_DIRS = ['app', 'components', 'lib']
const MAX_FINDINGS = 80
const EVIDENCE_ROOT = path.join(ROOT, 'system', 'agent-reports', 'closeout-evidence')
const RESTRICTED_PLATFORM_TERMS = ['vercel', 'supabase']
const RESTRICTED_PLATFORM_ALLOWLIST = new Set(['AGENTS.md', 'CLAUDE.md', 'scripts/cheflow.mjs'])
const NODE_BUILTINS = new Set([...builtinModules, ...builtinModules.map((name) => `node:${name}`)])

const COMMANDS = {
  status: {
    summary: 'Read-only branch, dirty tree, env, migration, and runtime snapshot.',
    mode: 'read-only',
  },
  doctor: {
    summary: 'Runs the local static health bundle across status, guard, route, truth, ai-gate, and db.',
    mode: 'read-only',
  },
  cockpit: {
    summary: 'Operator dashboard combining status, claims, migration, guard, and scan summaries.',
    mode: 'read-only',
  },
  next: {
    summary: 'Suggests the next safest agent action from branch, dirty files, claims, validation, and push readiness.',
    mode: 'read-only',
  },
  explain: {
    summary: 'Explains a ChefFlow CLI command, safety profile, and related underlying scripts.',
    mode: 'read-only',
  },
  guard: {
    summary: 'Blocks unsafe commands before they run: main pushes, deploys, destructive SQL, drizzle push, and server restarts.',
    mode: 'read-only',
  },
  claims: {
    summary: 'Shows active agent claims, stale claims, dirty files, and likely ownership conflicts.',
    mode: 'read-only',
  },
  owned: {
    summary: 'Classifies dirty files as owned, unowned, or claim-overlapping for swarm-safe closeout.',
    mode: 'read-only',
  },
  'push-check': {
    summary: 'Predicts whether the current branch can push cleanly and separates owned blockers from repo blockers.',
    mode: 'read-only',
  },
  validate: {
    summary: 'Selects the smallest honest validation commands for changed or owned files.',
    mode: 'read-only',
  },
  policy: {
    summary: 'Scans command text, staged diffs, or local files for restricted platform and hard-stop violations.',
    mode: 'read-only',
  },
  deps: {
    summary: 'Checks package and lockfile truth for missing referenced dependencies and package drift.',
    mode: 'read-only',
  },
  continuity: {
    summary: 'Shows canonical surface matches, duplicate risk, and attachment decision from continuity reports.',
    mode: 'read-only',
  },
  evidence: {
    summary: 'Builds a closeout evidence pack. Writes only when --write is passed.',
    mode: 'read-only',
  },
  migrate: {
    summary: 'Migration planner. Lists existing migrations, picks a safe next timestamp, and scans proposed SQL.',
    mode: 'read-only',
  },
  truth: {
    summary: 'Zero hallucination scan for empty catches, no-op handlers, fake money, and optimistic updates without rollback hints.',
    mode: 'read-only',
  },
  money: {
    summary: 'Money and ledger static audit: cents naming, append-only surfaces, hardcoded currency, and known audit commands.',
    mode: 'read-only',
  },
  route: {
    summary: 'Route and action protection scan for admin-only prospecting, auth starts, and tenant scoping hints.',
    mode: 'read-only',
  },
  'ai-gate': {
    summary: 'AI policy verifier for parseWithOllama routing, recipe-generation bans, and fallback-provider drift.',
    mode: 'read-only',
  },
  closeout: {
    summary: 'Agent closeout readiness: owned-file discipline, compliance hints, validation commands, and commit/push guidance.',
    mode: 'read-only',
  },
  db: {
    summary: 'Database command center. Read-only checks plus safe script references.',
    mode: 'read-only',
  },
  ledger: {
    summary: 'Ledger command center. Static invariants plus existing reconciliation scripts.',
    mode: 'read-only',
  },
  event: {
    summary: 'Event command center. FSM and packet/reconciliation script references.',
    mode: 'read-only',
  },
  pricing: {
    summary: 'Pricing pipeline command center. Freshness, coverage, and sync script references.',
    mode: 'read-only',
  },
  ai: {
    summary: 'AI command center. Ollama and central gateway checks.',
    mode: 'read-only',
  },
  persona: {
    summary: 'Persona pipeline command center wrapping inbox, validate, synthesize, saturation, and prompt generation.',
    mode: 'read-only',
  },
  agent: {
    summary: 'Agent swarm command center wrapping claims, routing, preflight, and finish tools.',
    mode: 'read-only',
  },
  qa: {
    summary: 'QA command center listing safe targeted validation commands.',
    mode: 'read-only',
  },
  ops: {
    summary: 'Host and runtime ops view for ports, topology, watchdogs, and safe diagnostics.',
    mode: 'read-only',
  },
  docs: {
    summary: 'Documentation hygiene command center for user manual, app audit, and generated reports.',
    mode: 'read-only',
  },
}

const COMMAND_GROUPS = {
  db: [
    'npm run audit:db:contract:json',
    'npm run audit:db',
    'npm run verify:secrets',
    'npm run db:fk-cache',
  ],
  ledger: [
    'npm run test:unit:financial',
    'node scripts/reconcile-event-financials.mjs',
    'node scripts/event-annual-budget-rollup.mjs',
  ],
  event: [
    'npm run test:unit:fsm',
    'node scripts/create-event-packet.mjs',
    'node scripts/create-event-task-board.mjs',
    'node scripts/reconcile-event-financials.mjs',
  ],
  pricing: [
    'npm run sync:audit',
    'npm run sync:prices',
    'node scripts/validate-price-engine.mjs',
    'node scripts/price-stress-test.mjs',
  ],
  ai: [
    'npm run ollama',
    'npm run qa:remy:delivery',
    'npm run test:remy-quality:hallucination',
  ],
  persona: [
    'npm run personas:inbox',
    'npm run personas:validate',
    'npm run personas:synthesize',
    'npm run personas:saturation',
    'node devtools/persona-codex-prompter.mjs --dry-run',
  ],
  agent: [
    'npm run agent:claim:check',
    'npm run agent:swarm',
    'node devtools/agent-preflight.mjs --prompt "<task>"',
    'node devtools/agent-finish.mjs --record <record> --owned <paths>',
  ],
  qa: [
    'npm run typecheck',
    'npm run test:unit',
    'npm run test:critical',
    'npm run verify:release',
  ],
  ops: [
    'node scripts/audit-runtime-topology.mjs',
    'npm run api:health',
    'npm run mcp:check',
    'node scripts/openclaw-health-check.mjs',
  ],
  docs: [
    'npm run audit:completeness',
    'node scripts/feature-docs-audit.cjs',
    'npm run docs:render:template-pack',
  ],
}

function parseArgs(argv) {
  const args = { _: [] }
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i]
    if (token === '--') {
      args._.push(...argv.slice(i + 1))
      break
    }
    if (!token.startsWith('--')) {
      args._.push(token)
      continue
    }
    const eq = token.indexOf('=')
    if (eq !== -1) {
      args[token.slice(2, eq)] = token.slice(eq + 1)
      continue
    }
    const key = token.slice(2)
    const next = argv[i + 1]
    if (next && !next.startsWith('--')) {
      args[key] = next
      i += 1
    } else {
      args[key] = true
    }
  }
  return args
}

function rel(filePath) {
  return path.relative(ROOT, filePath).replace(/\\/g, '/')
}

function readJson(filePath, fallback = null) {
  try {
    return JSON.parse(readFileSync(filePath, 'utf8'))
  } catch {
    return fallback
  }
}

function runGit(args, fallback = '') {
  try {
    return execFileSync('git', args, { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim()
  } catch {
    return fallback
  }
}

function runGitRaw(args, fallback = '') {
  try {
    return execFileSync('git', args, { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] })
  } catch {
    return fallback
  }
}

function statusEntries() {
  return runGitRaw(['status', '--porcelain=v1'])
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line) => ({
      status: line.slice(0, 2),
      path: line.slice(3).replace(/\\/g, '/'),
      staged: line[0] !== ' ' && line[0] !== '?',
      unstaged: line[1] !== ' ',
      raw: line,
    }))
}

function listFiles(dirs, options = {}) {
  const files = []
  const maxFiles = options.maxFiles || 5000
  const ignore = new Set(['node_modules', '.next', '.git', 'coverage', 'playwright-report'])

  function visit(abs) {
    if (files.length >= maxFiles) return
    let info
    try {
      info = statSync(abs)
    } catch {
      return
    }
    const base = path.basename(abs)
    if (info.isDirectory()) {
      if (ignore.has(base)) return
      for (const entry of readdirSync(abs)) visit(path.join(abs, entry))
      return
    }
    if (!info.isFile()) return
    if (!TEXT_EXTENSIONS.has(path.extname(abs))) return
    files.push(abs)
  }

  for (const dir of dirs) {
    const abs = path.join(ROOT, dir)
    if (existsSync(abs)) visit(abs)
  }
  return files
}

function findText(pattern, dirs, options = {}) {
  const flags = options.flags || 'i'
  const regex = pattern instanceof RegExp ? pattern : new RegExp(pattern, flags)
  const findings = []
  for (const file of listFiles(dirs, options)) {
    let text = ''
    try {
      text = readFileSync(file, 'utf8')
    } catch {
      continue
    }
    const lines = text.split(/\r?\n/)
    for (let i = 0; i < lines.length; i += 1) {
      if (!regex.test(lines[i])) {
        regex.lastIndex = 0
        continue
      }
      findings.push({
        file: rel(file),
        line: i + 1,
        text: lines[i].trim().slice(0, 220),
      })
      regex.lastIndex = 0
      if (findings.length >= (options.maxFindings || MAX_FINDINGS)) return findings
    }
  }
  return findings
}

function countMatches(pattern, dirs) {
  return findText(pattern, dirs, { maxFindings: 10000 }).length
}

function migrationState() {
  const dir = path.join(ROOT, 'database', 'migrations')
  const files = existsSync(dir)
    ? readdirSync(dir)
        .filter((name) => name.endsWith('.sql'))
        .sort()
    : []
  const timestamps = files
    .map((name) => name.match(/^(\d{14})/))
    .filter(Boolean)
    .map((match) => Number(match[1]))
  const highest = timestamps.length ? Math.max(...timestamps) : null
  const now = Number(new Date().toISOString().replace(/\D/g, '').slice(0, 14))
  const nextTimestamp = String(Math.max(now, highest ? highest + 1 : now)).padStart(14, '0')
  return {
    directory: 'database/migrations',
    count: files.length,
    highest,
    nextTimestamp,
    latest: files.slice(-10),
  }
}

function portSnapshot() {
  const ports = [3100, 3200, 3300, 11434]
  const result = Object.fromEntries(ports.map((port) => [String(port), { listening: false, pids: [] }]))
  let output = ''
  const command = process.platform === 'win32' ? ['netstat', ['-ano', '-p', 'tcp']] : ['netstat', ['-anp', 'tcp']]
  try {
    output = execFileSync(command[0], command[1], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    })
  } catch {
    return result
  }
  for (const line of output.split(/\r?\n/)) {
    for (const port of ports) {
      if (!line.includes(`:${port}`) || !/\bLISTEN(?:ING)?\b/i.test(line)) continue
      const pid = line.trim().split(/\s+/).at(-1)
      result[String(port)].listening = true
      if (pid && /^\d+$/.test(pid)) result[String(port)].pids.push(pid)
    }
  }
  return result
}

function statusSnapshot() {
  const entries = statusEntries()
  const pkg = readJson(path.join(ROOT, 'package.json'), {})
  const upstream = runGit(['rev-parse', '--abbrev-ref', '--symbolic-full-name', '@{u}'], '')
  return {
    branch: runGit(['branch', '--show-current'], '(unknown)'),
    upstream: upstream || null,
    head: runGit(['log', '-1', '--oneline'], ''),
    dirty: {
      count: entries.length,
      staged: entries.filter((entry) => entry.staged).length,
      unstaged: entries.filter((entry) => entry.unstaged).length,
      untracked: entries.filter((entry) => entry.status === '??').length,
      sample: entries.slice(0, 20),
    },
    env: {
      envLocal: existsSync(path.join(ROOT, '.env.local')),
      envDev: existsSync(path.join(ROOT, '.env.local.dev')),
      authAgent: existsSync(path.join(ROOT, '.auth', 'agent.json')),
    },
    packageScripts: Object.keys(pkg.scripts || {}).length,
    migrations: migrationState(),
    ports: portSnapshot(),
  }
}

function loadClaims(maxAgeHours = 12) {
  const dir = path.join(ROOT, 'system', 'agent-claims')
  const files = existsSync(dir) ? readdirSync(dir).filter((name) => name.endsWith('.json')) : []
  const claims = files
    .map((name) => {
      const claim = readJson(path.join(dir, name), null)
      if (!claim) return null
      const createdAt = Date.parse(claim.created_at || claim.createdAt || '')
      return {
        file: `system/agent-claims/${name}`,
        id: claim.id || path.basename(name, '.json'),
        status: claim.status || 'unknown',
        branch: claim.branch || claim.git_branch || null,
        task: claim.task || claim.prompt || claim.title || null,
        ownedPaths: claim.owned_paths || claim.ownedPaths || [],
        createdAt: Number.isFinite(createdAt) ? new Date(createdAt).toISOString() : null,
        stale: Number.isFinite(createdAt) ? (Date.now() - createdAt) / 36e5 > maxAgeHours : false,
      }
    })
    .filter(Boolean)
  const dirty = statusEntries()
  const active = claims.filter((claim) => claim.status === 'active')
  return {
    activeCount: active.length,
    staleCount: active.filter((claim) => claim.stale).length,
    active,
    dirtyCount: dirty.length,
    dirtySample: dirty.slice(0, 30),
  }
}

function parseList(value) {
  return String(value || '')
    .split(',')
    .map((item) => item.trim().replace(/\\/g, '/'))
    .filter(Boolean)
}

function changedFilesFromArgs(args = {}) {
  const explicit = parseList(args.files || args.owned)
  if (explicit.length) return explicit
  const stagedOnly = Boolean(args.staged)
  return statusEntries()
    .filter((entry) => (stagedOnly ? entry.staged : true))
    .map((entry) => entry.path)
    .filter(Boolean)
}

function activeOwnedPaths() {
  const claims = loadClaims().active
  return claims.flatMap((claim) => claim.ownedPaths || []).map((item) => String(item).replace(/\\/g, '/'))
}

function ownedLedger(args = {}) {
  const explicitOwned = parseList(args.owned)
  const claimedOwned = activeOwnedPaths()
  const owned = [...new Set([...explicitOwned, ...claimedOwned])]
  const dirty = statusEntries()
  const isOwned = (file) => owned.some((ownedPath) => file === ownedPath || file.startsWith(`${ownedPath}/`))
  const ownedDirty = dirty.filter((entry) => isOwned(entry.path))
  const unownedDirty = dirty.filter((entry) => !isOwned(entry.path))
  const claimPaths = new Set(claimedOwned)
  const overlaps = dirty.filter((entry) =>
    [...claimPaths].some((ownedPath) => entry.path === ownedPath || entry.path.startsWith(`${ownedPath}/`)),
  )
  return {
    owned,
    dirtyCount: dirty.length,
    ownedDirty,
    unownedDirty,
    overlaps,
    ok: unownedDirty.length === 0,
    guidance:
      unownedDirty.length === 0
        ? 'All dirty files are inside the provided or active owned set.'
        : 'Stage and commit only owned files. Leave unrelated dirty work untouched.',
  }
}

function validationSelector(args = {}) {
  const files = changedFilesFromArgs(args)
  const commands = new Set()
  const reasons = []
  const add = (command, reason) => {
    commands.add(command)
    reasons.push({ command, reason })
  }

  if (!files.length) {
    add('node scripts/cheflow.mjs status', 'No changed files were provided or detected.')
  }
  if (files.some((file) => /\.(ts|tsx|js|jsx|mjs)$/.test(file))) {
    add('node --check scripts/cheflow.mjs', 'JavaScript CLI or script files changed.')
    add('node --test --import tsx tests/unit/cheflow-cli.test.ts', 'CLI behavior must stay contract-tested.')
  }
  if (files.some((file) => file.startsWith('app/') || file.startsWith('components/'))) {
    add('node scripts/cheflow.mjs route --json', 'Route or component files changed.')
    add('node scripts/cheflow.mjs truth --json', 'UI-facing changes need hallucination checks.')
  }
  if (files.some((file) => file.startsWith('lib/ledger') || file.includes('finance') || file.includes('stripe'))) {
    add('npm run test:unit:financial', 'Money or ledger code changed.')
    add('node scripts/cheflow.mjs money --json', 'Money invariants need static review.')
  }
  if (files.some((file) => file.startsWith('database/migrations/') || file.endsWith('.sql'))) {
    add('node scripts/cheflow.mjs migrate plan --json', 'Migration files changed.')
  }
  if (files.some((file) => file.startsWith('lib/ai') || file.includes('remy') || file.includes('ollama'))) {
    add('node scripts/cheflow.mjs ai-gate --json', 'AI gateway or assistant files changed.')
  }
  if (files.some((file) => file.endsWith('.md') || file.startsWith('docs/'))) {
    add('node scripts/cheflow.mjs policy --staged --json', 'Docs changed and need policy drift checks.')
  }
  if (files.some((file) => file === 'package.json' || file === 'package-lock.json')) {
    add('node scripts/cheflow.mjs deps --json', 'Package metadata changed.')
  }
  add('Select-String -Path <owned files> -Pattern ([char]0x2014)', 'Changed text must not contain em dashes.')

  return {
    files,
    commands: [...commands],
    reasons,
    ok: true,
  }
}

function packageNameFromSpecifier(specifier) {
  if (
    !specifier ||
    specifier.startsWith('.') ||
    specifier.startsWith('/') ||
    specifier.startsWith('node:') ||
    specifier.startsWith('@/') ||
    NODE_BUILTINS.has(specifier)
  ) {
    return null
  }
  if (specifier.startsWith('@')) return specifier.split('/').slice(0, 2).join('/')
  return specifier.split('/')[0]
}

function dependencyTruth() {
  const pkg = readJson(path.join(ROOT, 'package.json'), {})
  const lock = readJson(path.join(ROOT, 'package-lock.json'), {})
  const declared = new Set([
    ...Object.keys(pkg.dependencies || {}),
    ...Object.keys(pkg.devDependencies || {}),
    ...Object.keys(pkg.optionalDependencies || {}),
  ])
  const lockPackages = lock.packages || {}
  const referenced = new Set()
  const importPattern = /^\s*(?:import|export)\s+(?:[^'"]+\s+from\s+)?['"]([^'"]+)['"]/
  const requirePattern = /^\s*(?:const|let|var)\s+[^=\n]+=\s*require\(['"]([^'"]+)['"]\)/

  for (const file of listFiles(['app', 'components', 'lib', 'scripts', 'devtools', 'tests'], { maxFiles: 8000 })) {
    let lines = []
    try {
      lines = readFileSync(file, 'utf8').split(/\r?\n/)
    } catch {
      continue
    }
    for (const line of lines) {
      const match = line.match(importPattern) || line.match(requirePattern)
      const name = packageNameFromSpecifier(match?.[1])
      if (name) referenced.add(name)
    }
  }

  const missingDeclarations = [...referenced]
    .filter((name) => !declared.has(name))
    .sort()
  const missingLockEntries = [...declared]
    .filter((name) => !lockPackages[`node_modules/${name}`])
    .sort()
  return {
    ok: missingDeclarations.length === 0 && missingLockEntries.length === 0,
    declaredCount: declared.size,
    referencedCount: referenced.size,
    missingDeclarations,
    missingLockEntries,
    packageLockPresent: existsSync(path.join(ROOT, 'package-lock.json')),
  }
}

function scanTextForRestrictedPlatforms(text, source) {
  const lower = String(text || '').toLowerCase()
  return RESTRICTED_PLATFORM_TERMS.filter((term) => lower.includes(term)).map((term) => ({
    id: 'restricted-platform',
    source,
    term,
    reason: 'Restricted external platform reference is not allowed in new ChefFlow work.',
  }))
}

function restrictedPlatformScan(args = {}) {
  const findings = []
  const commandText = args._?.length ? args._.join(' ') : ''
  findings.push(...scanTextForRestrictedPlatforms(commandText, 'command'))

  const useStaged = args.staged || (!args.all && !commandText)
  const files = useStaged
    ? runGitRaw(['diff', '--cached', '--name-only', '--diff-filter=ACMR'])
        .split(/\r?\n/)
        .filter(Boolean)
    : changedFilesFromArgs(args)

  for (const file of files) {
    const normalized = file.replace(/\\/g, '/')
    if (RESTRICTED_PLATFORM_ALLOWLIST.has(normalized)) continue
    const abs = path.join(ROOT, normalized)
    if (!existsSync(abs) || !TEXT_EXTENSIONS.has(path.extname(abs))) continue
    findings.push(...scanTextForRestrictedPlatforms(readFileSync(abs, 'utf8'), normalized))
  }

  return {
    ok: findings.length === 0,
    scannedMode: useStaged ? 'staged' : 'files',
    scannedFiles: files,
    findings,
  }
}

function policyScan(args = {}) {
  const rawCommand = args._ || []
  const guard = rawCommand.length ? guardCommand(rawCommand) : null
  const restricted = restrictedPlatformScan(args)
  return {
    ok: (!guard || guard.ok) && restricted.ok,
    guard,
    restricted,
  }
}

function pushReadiness(args = {}) {
  const status = statusSnapshot()
  const owned = ownedLedger(args)
  const validation = validationSelector(args)
  const deps = dependencyTruth()
  const blockers = []
  if (status.branch === 'main') blockers.push({ id: 'main-branch', reason: 'Current branch is main.' })
  if (!status.upstream) blockers.push({ id: 'missing-upstream', reason: 'Current branch has no upstream.' })
  if (owned.unownedDirty.length) {
    blockers.push({
      id: 'unowned-dirty-work',
      reason: 'Dirty files outside the owned set are present.',
      count: owned.unownedDirty.length,
    })
  }
  if (!deps.ok) {
    blockers.push({
      id: 'dependency-truth',
      reason: 'Package truth check found missing declarations or lock entries.',
      missingDeclarations: deps.missingDeclarations.slice(0, 20),
      missingLockEntries: deps.missingLockEntries.slice(0, 20),
    })
  }
  return {
    ok: blockers.length === 0,
    branch: status.branch,
    upstream: status.upstream,
    blockers,
    owned,
    validation,
  }
}

function continuityDecision() {
  const registry = readJson(path.join(ROOT, 'system', 'canonical-surfaces.json'), { surfaces: [] })
  const latestReport = readJson(
    path.join(ROOT, 'system', 'agent-reports', 'context-continuity-dashboard', 'latest.json'),
    null,
  )
  return {
    ok: true,
    canonicalSurfaceCount: Array.isArray(registry.surfaces) ? registry.surfaces.length : 0,
    currentDecision: latestReport?.scan?.continuity || null,
    topCanonicalMatches: latestReport?.scan?.canonical_surfaces?.slice(0, 5) || [],
    duplicatePairs: latestReport?.duplicates?.pair_count || 0,
    guidance: 'Attach current work to the highest matching canonical surface before adding new surfaces.',
  }
}

function closeoutEvidence(args = {}) {
  const owned = ownedLedger(args)
  const validation = validationSelector(args)
  const push = pushReadiness(args)
  const evidence = {
    generatedAt: new Date().toISOString(),
    branch: runGit(['branch', '--show-current'], '(unknown)'),
    head: runGit(['log', '-1', '--oneline'], ''),
    owned,
    validation,
    push,
    policy: policyScan({ staged: true }),
  }
  if (args.write) {
    mkdirSync(EVIDENCE_ROOT, { recursive: true })
    const stamp = new Date().toISOString().replace(/\D/g, '').slice(0, 14)
    const file = path.join(EVIDENCE_ROOT, `${stamp}-cheflow-closeout-evidence.json`)
    writeFileSync(file, `${JSON.stringify(evidence, null, 2)}\n`)
    evidence.file = rel(file)
  }
  return evidence
}

function nextAction(args = {}) {
  const push = pushReadiness(args)
  const claims = loadClaims()
  let action = 'run-validation'
  let reason = 'Owned work has focused validation commands available.'
  if (push.blockers.some((blocker) => blocker.id === 'main-branch')) {
    action = 'create-feature-branch'
    reason = 'The current branch is main.'
  } else if (push.blockers.some((blocker) => blocker.id === 'unowned-dirty-work')) {
    action = 'narrow-owned-files'
    reason = 'Unowned dirty files are present.'
  } else if (push.blockers.some((blocker) => blocker.id === 'dependency-truth')) {
    action = 'resolve-package-truth'
    reason = 'Dependency truth check has blockers.'
  } else if (!push.upstream) {
    action = 'set-upstream-on-push'
    reason = 'The branch has no upstream yet.'
  } else if (claims.staleCount > 0) {
    action = 'review-stale-claims'
    reason = 'Stale active claims exist.'
  } else if (push.ok) {
    action = 'commit-and-push-owned-work'
    reason = 'No local push blockers were detected.'
  }
  return {
    action,
    reason,
    command:
      action === 'commit-and-push-owned-work'
        ? 'node scripts/cheflow.mjs evidence --write --owned <paths>'
        : push.validation.commands[0] || 'node scripts/cheflow.mjs status',
    push,
  }
}

function scanSqlText(sql) {
  const checks = [
    { id: 'drop-table', severity: 'blocked', pattern: /\bdrop\s+table\b/i },
    { id: 'drop-column', severity: 'blocked', pattern: /\bdrop\s+column\b/i },
    { id: 'delete', severity: 'blocked', pattern: /\bdelete\s+from\b/i },
    { id: 'truncate', severity: 'blocked', pattern: /\btruncate\b/i },
    { id: 'column-type-change', severity: 'blocked', pattern: /\balter\s+table\b[\s\S]*\balter\s+column\b[\s\S]*\btype\b/i },
    { id: 'create-index-concurrently', severity: 'notice', pattern: /\bcreate\s+index\s+concurrently\b/i },
    { id: 'add-column', severity: 'ok', pattern: /\badd\s+column\b/i },
    { id: 'create-table', severity: 'ok', pattern: /\bcreate\s+table\b/i },
  ]
  return checks
    .filter((check) => check.pattern.test(sql))
    .map(({ id, severity }) => ({ id, severity }))
}

function migrationPlan(args) {
  const state = migrationState()
  let proposed = null
  if (args.sql) {
    const sqlPath = path.resolve(ROOT, String(args.sql))
    const sql = existsSync(sqlPath) ? readFileSync(sqlPath, 'utf8') : ''
    proposed = {
      path: rel(sqlPath),
      exists: existsSync(sqlPath),
      findings: sql ? scanSqlText(sql) : [{ id: 'sql-file-not-found', severity: 'blocked' }],
    }
  }
  return {
    ...state,
    safeRules: [
      'List existing migration files before creating a new one.',
      'Use a timestamp strictly higher than the highest existing migration.',
      'Show full SQL before writing a migration file.',
      'Do not run drizzle-kit push without explicit approval.',
      'Do not use DROP, DELETE, TRUNCATE, or column type changes without explicit approval.',
    ],
    proposed,
  }
}

function guardCommand(raw) {
  const command = raw.join(' ').trim()
  const checks = [
    { id: 'push-main', reason: 'Pushing main deploys production.', pattern: /\bgit\s+push\b.*\bmain\b/i },
    { id: 'deploy-or-prod', reason: 'Deploy/build/prod commands require explicit approval.', pattern: /\b(deploy|npm\s+run\s+prod|next\s+build|npm\s+run\s+build)\b/i },
    { id: 'server-restart', reason: 'Starting, killing, or restarting servers requires explicit approval.', pattern: /\b(npm\s+run\s+dev|npm\s+run\s+start|next\s+dev|next\s+start|taskkill|kill\s+-9|restart)\b/i },
    { id: 'drizzle-push', reason: 'drizzle-kit push is forbidden without explicit approval.', pattern: /\b(drizzle-kit\s+push|npm\s+run\s+(db:push|drizzle:push))\b/i },
    { id: 'destructive-sql', reason: 'Destructive SQL is forbidden without explicit approval.', pattern: /\b(drop\s+table|drop\s+column|delete\s+from|truncate|alter\s+table[\s\S]*alter\s+column[\s\S]*type)\b/i },
    { id: 'generated-types', reason: 'types/database.ts is generated and must not be manually edited.', pattern: /\b(types[\\/]database\.ts)\b/i },
    { id: 'restricted-platform', reason: 'Restricted external platform references are blocked.', pattern: /\b(vercel|supabase)\b/i },
  ]
  const blocked = checks
    .filter((check) => check.pattern.test(command))
    .map(({ id, reason }) => ({ id, reason }))
  return {
    command,
    ok: blocked.length === 0,
    blocked,
    policy: 'Read-only guard. It does not execute the command.',
  }
}

function truthScan() {
  const emptyCatch = findText(/\bcatch\s*\([^)]*\)\s*\{\s*\}?/, DEFAULT_SCAN_DIRS)
  const noOpHandlers = findText(/\bon[A-Z][A-Za-z0-9_]*=\{\s*(?:\(\)\s*=>\s*)?\{\s*\}\s*\}/, ['app', 'components'])
  const fakeMoney = findText(/(?:\$0\.00|\$[1-9][0-9]*(?:\.[0-9]{2})?)/, ['app', 'components', 'lib'])
  const optimistic = findText(/optimistic|useOptimistic|rollback/i, ['app', 'components', 'lib'], { maxFindings: 200 })
  const optimisticWithoutRollback = optimistic.filter((finding) => !/rollback/i.test(finding.text))
  return {
    ok: emptyCatch.length === 0 && noOpHandlers.length === 0 && fakeMoney.length === 0,
    checks: {
      emptyCatch,
      noOpHandlers,
      fakeMoney,
      optimisticWithoutRollback: optimisticWithoutRollback.slice(0, MAX_FINDINGS),
    },
  }
}

function moneyScan() {
  const centsReferences = countMatches(/_cents\b|amountCents|amount_cents/, MONEY_SCAN_DIRS)
  const decimalMoneyWrites = findText(/\b(amount|price|fee|total|balance)\b[^;\n]*(?:parseFloat|toFixed|\*\s*100|\/\s*100)/, MONEY_SCAN_DIRS)
  const hardcodedCurrency = findText(/['"`]\$[0-9][0-9,.]*(?:\.[0-9]{2})?['"`]/, MONEY_SCAN_DIRS)
  const ledgerFiles = [
    'lib/ledger/append.ts',
    'lib/ledger/compute.ts',
    'scripts/reconcile-event-financials.mjs',
  ].map((file) => ({ file, exists: existsSync(path.join(ROOT, file)) }))
  return {
    ok: hardcodedCurrency.length === 0,
    centsReferences,
    ledgerFiles,
    findings: {
      decimalMoneyWrites,
      hardcodedCurrency,
    },
    commands: COMMAND_GROUPS.ledger,
  }
}

function routeScan() {
  const prospectingPages = listFiles(['app'])
    .filter((file) => rel(file).includes('/prospecting/'))
    .map((file) => {
      const text = readFileSync(file, 'utf8')
      return {
        file: rel(file),
        hasRequireAdmin: /\brequireAdmin\s*\(/.test(text),
      }
    })
  const serverFiles = listFiles(['app', 'lib']).filter((file) => {
    try {
      return readFileSync(file, 'utf8').startsWith("'use server'") || readFileSync(file, 'utf8').startsWith('"use server"')
    } catch {
      return false
    }
  })
  const serverActionFindings = serverFiles.map((file) => {
    const text = readFileSync(file, 'utf8')
    return {
      file: rel(file),
      hasAuth: /\brequire(?:Chef|Client|Admin|Auth)\s*\(/.test(text),
      hasTenantScope: /\.eq\(\s*['"`](?:tenant_id|chef_id)['"`]/.test(text),
      exportsNonAsync: /^\s*export\s+(?:const|class|type)\b/m.test(text),
    }
  })
  return {
    ok:
      prospectingPages.every((page) => page.hasRequireAdmin) &&
      serverActionFindings.every((item) => item.hasAuth && !item.exportsNonAsync),
    prospectingPages,
    serverActionFindings: serverActionFindings.filter((item) => !item.hasAuth || item.exportsNonAsync || !item.hasTenantScope).slice(0, MAX_FINDINGS),
  }
}

function aiGateScan() {
  const providerDrift = findText(/\b(openai|anthropic|gemini|claude|gpt-|chatgpt)\b/i, ['app', 'components', 'lib', 'scripts'])
    .filter((finding) => !finding.file.includes('openai-docs') && !finding.file.includes('chatgpt-'))
  const gatewayReferences = findText(/\bparseWithOllama\b/, ['app', 'components', 'lib'])
  const recipeGenerationRisk = findText(/\b(generate|suggest|draft|create|auto-fill).{0,80}\brecipe\b/i, ['app', 'components', 'lib'])
  return {
    ok: providerDrift.length === 0 && recipeGenerationRisk.length === 0,
    gatewayReferences: gatewayReferences.length,
    providerDrift: providerDrift.slice(0, MAX_FINDINGS),
    recipeGenerationRisk: recipeGenerationRisk.slice(0, MAX_FINDINGS),
  }
}

function dbCommand(args) {
  return {
    migrations: migrationPlan(args),
    guard: guardCommand(['drizzle-kit', 'push']),
    commands: COMMAND_GROUPS.db,
  }
}

function closeout(args) {
  const owned = String(args.owned || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
  return {
    branch: runGit(['branch', '--show-current'], '(unknown)'),
    dirty: statusEntries(),
    owned,
    checks: [
      'Stage only files owned by this task.',
      'Run targeted validation that matches the touched surface.',
      'Run compliance scans for em dashes, public OpenClaw text, and ts nocheck pragmas.',
      'Commit with: chore(agent): <what was done> <branch-name>.',
      'Push the feature branch. Do not push main.',
    ],
    suggestedCommands: [
      'node scripts/cheflow.mjs guard -- git push origin main',
      'node scripts/cheflow.mjs truth',
      'node scripts/cheflow.mjs route',
      'node scripts/cheflow.mjs ai-gate',
      'npm run typecheck',
    ],
  }
}

function commandCenter(name) {
  return {
    command: name,
    summary: COMMANDS[name].summary,
    mode: COMMANDS[name].mode,
    suggestedCommands: COMMAND_GROUPS[name] || [],
    guardNote: 'This command center prints safe next commands. It does not start servers, deploy, or mutate data.',
  }
}

function doctor() {
  const status = statusSnapshot()
  const scans = {
    guard: guardCommand(['git', 'push', 'origin', 'main']),
    route: routeScan(),
    truth: truthScan(),
    aiGate: aiGateScan(),
    db: dbCommand({}),
    deps: dependencyTruth(),
    policy: policyScan({ staged: true }),
  }
  return {
    ok: scans.route.ok && scans.truth.ok && scans.aiGate.ok && scans.deps.ok && scans.policy.ok,
    status,
    scans,
  }
}

function cockpit() {
  const status = statusSnapshot()
  const claims = loadClaims()
  const migrations = migrationPlan({})
  const guard = guardCommand(['git', 'push', 'origin', 'main'])
  const aiGate = aiGateScan()
  const deps = dependencyTruth()
  return {
    branch: status.branch,
    head: status.head,
    dirty: status.dirty,
    ports: status.ports,
    claims: {
      activeCount: claims.activeCount,
      staleCount: claims.staleCount,
      dirtyCount: claims.dirtyCount,
    },
    migrations: {
      count: migrations.count,
      highest: migrations.highest,
      nextTimestamp: migrations.nextTimestamp,
    },
    guardPolicyLoaded: guard.blocked.length > 0,
    aiGate: {
      ok: aiGate.ok,
      gatewayReferences: aiGate.gatewayReferences,
      providerDriftCount: aiGate.providerDrift.length,
      recipeRiskCount: aiGate.recipeGenerationRisk.length,
    },
    deps: {
      ok: deps.ok,
      missingDeclarations: deps.missingDeclarations.length,
      missingLockEntries: deps.missingLockEntries.length,
    },
  }
}

function explain(name) {
  const command = COMMANDS[name]
  if (!command) {
    return {
      ok: false,
      error: `Unknown command: ${name || '(empty)'}`,
      available: Object.keys(COMMANDS),
    }
  }
  return {
    ok: true,
    command: name,
    ...command,
    suggestedCommands: COMMAND_GROUPS[name] || [],
    safety: [
      'Read-only by default.',
      'Does not deploy, build, start servers, kill processes, or mutate database state.',
      'Use cheflow guard -- <command> before risky shell commands.',
    ],
  }
}

function printHelp() {
  console.log(`ChefFlow CLI

Usage:
  node scripts/cheflow.mjs <command> [options]
  npm run cheflow -- <command> [options]

Commands:`)
  for (const [name, command] of Object.entries(COMMANDS)) {
    console.log(`  ${name.padEnd(12)} ${command.summary}`)
  }
  console.log(`
Examples:
  node scripts/cheflow.mjs cockpit
  node scripts/cheflow.mjs next --owned scripts/cheflow.mjs,tests/unit/cheflow-cli.test.ts
  node scripts/cheflow.mjs guard -- git push origin main
  node scripts/cheflow.mjs migrate plan
  node scripts/cheflow.mjs explain ai-gate
`)
}

function printJsonOrHuman(value, args, printer) {
  if (args.json) {
    console.log(JSON.stringify(value, null, 2))
    return
  }
  printer(value)
}

function printObject(value) {
  console.log(JSON.stringify(value, null, 2))
}

function printSummary(title, value) {
  console.log(title)
  console.log(JSON.stringify(value, null, 2))
}

function main(argv = process.argv.slice(2)) {
  const [command, maybeSubcommand, ...rest] = argv
  if (!command || command === 'help' || command === '--help' || command === '-h') {
    printHelp()
    return 0
  }

  if (command === 'migrate' && maybeSubcommand === 'plan') {
    const args = parseArgs(rest)
    const result = migrationPlan(args)
    printJsonOrHuman(result, args, (value) => printSummary('ChefFlow migration plan', value))
    return result.proposed?.findings?.some((finding) => finding.severity === 'blocked') ? 1 : 0
  }

  const args = parseArgs([maybeSubcommand, ...rest].filter(Boolean))

  switch (command) {
    case 'status': {
      const result = statusSnapshot()
      printJsonOrHuman(result, args, (value) => printSummary('ChefFlow status', value))
      return 0
    }
    case 'doctor': {
      const result = doctor()
      printJsonOrHuman(result, args, (value) => printSummary('ChefFlow doctor', value))
      return result.ok ? 0 : 1
    }
    case 'cockpit': {
      const result = cockpit()
      printJsonOrHuman(result, args, (value) => printSummary('ChefFlow cockpit', value))
      return 0
    }
    case 'next': {
      const result = nextAction(args)
      printJsonOrHuman(result, args, (value) => printSummary('ChefFlow next action', value))
      return 0
    }
    case 'explain': {
      const result = explain(args._[0])
      printJsonOrHuman(result, args, printObject)
      return result.ok ? 0 : 1
    }
    case 'guard': {
      const rawCommand = args._.filter((token) => {
        if (token !== '--json') return true
        args.json = true
        return false
      })
      const result = guardCommand(rawCommand)
      printJsonOrHuman(result, args, (value) => printSummary(value.ok ? 'Command allowed' : 'Command blocked', value))
      return result.ok ? 0 : 1
    }
    case 'claims': {
      const result = loadClaims(Number(args['max-age-hours'] || 12))
      printJsonOrHuman(result, args, (value) => printSummary('ChefFlow claims', value))
      return 0
    }
    case 'owned': {
      const result = ownedLedger(args)
      printJsonOrHuman(result, args, (value) => printSummary('ChefFlow owned file ledger', value))
      return result.ok ? 0 : 1
    }
    case 'push-check': {
      const result = pushReadiness(args)
      printJsonOrHuman(result, args, (value) => printSummary('ChefFlow push readiness', value))
      return result.ok ? 0 : 1
    }
    case 'validate': {
      const result = validationSelector(args)
      printJsonOrHuman(result, args, (value) => printSummary('ChefFlow validation selector', value))
      return 0
    }
    case 'policy': {
      const result = policyScan(args)
      printJsonOrHuman(result, args, (value) => printSummary('ChefFlow policy scan', value))
      return result.ok ? 0 : 1
    }
    case 'deps': {
      const result = dependencyTruth()
      printJsonOrHuman(result, args, (value) => printSummary('ChefFlow dependency truth', value))
      return result.ok ? 0 : 1
    }
    case 'continuity': {
      const result = continuityDecision()
      printJsonOrHuman(result, args, (value) => printSummary('ChefFlow continuity decision', value))
      return 0
    }
    case 'evidence': {
      const result = closeoutEvidence(args)
      printJsonOrHuman(result, args, (value) => printSummary('ChefFlow closeout evidence', value))
      return 0
    }
    case 'truth': {
      const result = truthScan()
      printJsonOrHuman(result, args, (value) => printSummary('ChefFlow truth scan', value))
      return result.ok ? 0 : 1
    }
    case 'money': {
      const result = moneyScan()
      printJsonOrHuman(result, args, (value) => printSummary('ChefFlow money scan', value))
      return result.ok ? 0 : 1
    }
    case 'route': {
      const result = routeScan()
      printJsonOrHuman(result, args, (value) => printSummary('ChefFlow route scan', value))
      return result.ok ? 0 : 1
    }
    case 'ai-gate': {
      const result = aiGateScan()
      printJsonOrHuman(result, args, (value) => printSummary('ChefFlow AI gate', value))
      return result.ok ? 0 : 1
    }
    case 'closeout': {
      const result = closeout(args)
      printJsonOrHuman(result, args, (value) => printSummary('ChefFlow closeout readiness', value))
      return 0
    }
    case 'db': {
      const result = dbCommand(args)
      printJsonOrHuman(result, args, (value) => printSummary('ChefFlow database center', value))
      return 0
    }
    case 'ledger':
    case 'event':
    case 'pricing':
    case 'ai':
    case 'persona':
    case 'agent':
    case 'qa':
    case 'ops':
    case 'docs': {
      const result = commandCenter(command)
      printJsonOrHuman(result, args, (value) => printSummary(`ChefFlow ${command} center`, value))
      return 0
    }
    default:
      console.error(`Unknown command: ${command}`)
      printHelp()
      return 1
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  const code = main()
  if (code && code !== 0) process.exit(code)
}

export {
  aiGateScan,
  closeout,
  closeoutEvidence,
  cockpit,
  commandCenter,
  continuityDecision,
  dependencyTruth,
  doctor,
  explain,
  guardCommand,
  loadClaims,
  main,
  migrationPlan,
  moneyScan,
  nextAction,
  ownedLedger,
  policyScan,
  pushReadiness,
  routeScan,
  scanSqlText,
  statusSnapshot,
  truthScan,
  validationSelector,
}
