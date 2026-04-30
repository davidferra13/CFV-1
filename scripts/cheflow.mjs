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
const HANDOFF_ROOT = path.join(ROOT, 'system', 'agent-reports', 'handoffs')
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
    summary: 'Agent closeout readiness and guarded owned-file commit/push when explicitly requested.',
    mode: 'read-only unless --commit or --push is passed',
  },
  task: {
    summary: 'Task entry briefing for Codex agents: status, continuity, claims, owned files, risk, and next action.',
    mode: 'read-only',
  },
  risk: {
    summary: 'Severity-ranked policy, truth, route, AI, money, dependency, migration, and ownership risk report.',
    mode: 'read-only',
  },
  review: {
    summary: 'ChefFlow code-review scan for owned files using auth, tenancy, cache, UI truth, money, and admin rules.',
    mode: 'read-only',
  },
  claim: {
    summary: 'Create, release, and inspect Codex agent file claims.',
    mode: 'writes only system/agent-claims on create/release',
  },
  pr: {
    summary: 'Generate PR-ready owned-diff, validation, risk, and commit summary.',
    mode: 'read-only',
  },
  handoff: {
    summary: 'Create a swarm-safe handoff packet for the next Codex agent.',
    mode: 'read-only unless --write is passed',
  },
  stale: {
    summary: 'Find stale claims, reports, captures, and local branches that may need review.',
    mode: 'read-only',
  },
  scope: {
    summary: 'Classify files before editing as safe, conflict, generated, database-risk, server-action-risk, or unknown.',
    mode: 'read-only',
  },
  'undo-plan': {
    summary: 'Generate a non-destructive rollback plan for owned diffs without executing it.',
    mode: 'read-only',
  },
  'test-map': {
    summary: 'Map changed files to the most relevant targeted validation commands.',
    mode: 'read-only',
  },
  'server-action': {
    summary: 'Dedicated audit for use-server auth, tenancy, validation, cache, and export rules.',
    mode: 'read-only',
  },
  'ui-truth': {
    summary: 'Dedicated audit for no-op UI, fake values, optimistic rollback, and disabled-control truth.',
    mode: 'read-only',
  },
  'route-owner': {
    summary: 'Find likely canonical owner, duplicate risk, and recent commits for a route or domain.',
    mode: 'read-only',
  },
  branch: {
    summary: 'Branch drift and upstream doctor for Codex closeout safety.',
    mode: 'read-only',
  },
  push: {
    summary: 'Diagnose failed push output and suggest exact repair commands.',
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

function claimDirectory() {
  return path.join(ROOT, 'system', 'agent-claims')
}

function claimCommand(args = {}) {
  const subcommand = args._?.[0] || 'status'
  if (subcommand === 'status' || subcommand === 'list') return loadClaims(Number(args['max-age-hours'] || 12))

  if (subcommand === 'conflicts') {
    const owned = parseList(args.owned || args.files || args._?.slice(1).join(' '))
    const claims = loadClaims(Number(args['max-age-hours'] || 12)).active
    const conflicts = []
    for (const claim of claims) {
      for (const ownedPath of owned) {
        const match = (claim.ownedPaths || []).some(
          (claimPath) =>
            ownedPath === claimPath ||
            ownedPath.startsWith(`${claimPath}/`) ||
            claimPath.startsWith(`${ownedPath}/`),
        )
        if (match) conflicts.push({ claim: claim.id, file: claim.file, task: claim.task, ownedPath })
      }
    }
    return { ok: conflicts.length === 0, owned, conflicts }
  }

  if (subcommand === 'create') {
    const owned = parseList(args.owned || args.files || args._?.slice(1).join(' '))
    const task = String(args.task || args.prompt || 'Codex task')
    const id = `${nowStamp()}Z-${slugify(runGit(['branch', '--show-current'], 'branch'))}-${slugify(task)}`
    const file = path.join(claimDirectory(), `${id}.json`)
    const claim = {
      id,
      status: 'active',
      agent: args.agent || 'codex',
      prompt: task,
      branch: runGit(['branch', '--show-current'], '(unknown)'),
      branch_start_commit: runGit(['rev-parse', '--short', 'HEAD'], ''),
      branch_finish: null,
      branch_finish_commit: null,
      owned_paths: owned,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      finished_at: null,
      commit_hash: null,
      pushed: null,
    }
    mkdirSync(claimDirectory(), { recursive: true })
    writeFileSync(file, `${JSON.stringify(claim, null, 2)}\n`)
    return { ok: true, file: rel(file), claim }
  }

  if (subcommand === 'release') {
    const id = args.id || args._?.[1]
    if (!id) return { ok: false, error: 'claim release requires --id <claim-id>.' }
    const claims = loadClaims(Number(args['max-age-hours'] || 87600)).active
    const match = claims.find((claim) => claim.id === id || claim.file.endsWith(`${id}.json`))
    if (!match) return { ok: false, error: `No active claim found for ${id}.` }
    const abs = path.join(ROOT, match.file)
    const claim = readJson(abs, {})
    claim.status = args.status || 'released'
    claim.updated_at = new Date().toISOString()
    claim.finished_at = new Date().toISOString()
    claim.branch_finish = runGit(['branch', '--show-current'], '(unknown)')
    claim.branch_finish_commit = runGit(['rev-parse', '--short', 'HEAD'], '')
    writeFileSync(abs, `${JSON.stringify(claim, null, 2)}\n`)
    return { ok: true, file: match.file, claim }
  }

  return { ok: false, error: `Unknown claim subcommand: ${subcommand}`, available: ['status', 'list', 'conflicts', 'create', 'release'] }
}

function parseList(value) {
  return String(value || '')
    .split(/[,\s]+/)
    .map((item) => item.trim().replace(/\\/g, '/'))
    .filter(Boolean)
}

function parseFileListArgs(args = {}) {
  return [...new Set([...parseList(args.files), ...parseList(args.owned), ...parseList((args._ || []).join(' '))])]
}

function nowStamp() {
  return new Date().toISOString().replace(/\D/g, '').slice(0, 14)
}

function slugify(value, fallback = 'task') {
  const slug = String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
  return slug || fallback
}

function readTextFile(file) {
  const normalized = String(file || '').replace(/\\/g, '/')
  const abs = path.join(ROOT, normalized)
  if (!existsSync(abs) || !TEXT_EXTENSIONS.has(path.extname(abs))) return ''
  try {
    return readFileSync(abs, 'utf8')
  } catch {
    return ''
  }
}

function fileAgeHours(filePath) {
  try {
    return (Date.now() - statSync(filePath).mtimeMs) / 36e5
  } catch {
    return null
  }
}

function listExistingFiles(dirs, options = {}) {
  const maxFiles = options.maxFiles || 300
  const files = []
  for (const dir of dirs) {
    const abs = path.join(ROOT, dir)
    if (!existsSync(abs)) continue
    const queue = [abs]
    while (queue.length && files.length < maxFiles) {
      const current = queue.shift()
      let info
      try {
        info = statSync(current)
      } catch {
        continue
      }
      if (info.isDirectory()) {
        for (const entry of readdirSync(current)) queue.push(path.join(current, entry))
      } else if (info.isFile()) {
        files.push(current)
      }
    }
  }
  return files
}

function diffNameStatus(files = []) {
  const args = ['diff', '--name-status']
  if (files.length) args.push('--', ...files)
  return runGitRaw(args)
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line) => {
      const [status, ...parts] = line.split(/\s+/)
      return { status, path: parts.at(-1)?.replace(/\\/g, '/') || '' }
    })
    .filter((item) => item.path)
}

function changedFilesFromArgs(args = {}) {
  const explicit = parseFileListArgs(args)
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
  const explicitOwned = parseFileListArgs(args)
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

function testMap(args = {}) {
  const files = changedFilesFromArgs(args)
  const groups = {
    cli: files.filter((file) => file === 'scripts/cheflow.mjs' || file.includes('cheflow-cli')),
    serverActions: files.filter((file) => readTextFile(file).startsWith("'use server'") || readTextFile(file).startsWith('"use server"')),
    ui: files.filter((file) => file.startsWith('app/') || file.startsWith('components/')),
    money: files.filter((file) => file.includes('ledger') || file.includes('finance') || file.includes('stripe')),
    migrations: files.filter((file) => file.startsWith('database/migrations/') || file.endsWith('.sql')),
    package: files.filter((file) => file === 'package.json' || file === 'package-lock.json'),
    docs: files.filter((file) => file.endsWith('.md') || file.startsWith('docs/')),
  }
  const commands = new Set(validationSelector(args).commands)
  if (groups.serverActions.length) commands.add('node scripts/cheflow.mjs server-action audit --owned <paths>')
  if (groups.ui.length) commands.add('node scripts/cheflow.mjs ui-truth audit --owned <paths>')
  if (groups.cli.length) commands.add('node scripts/cheflow.mjs review --owned scripts/cheflow.mjs,tests/unit/cheflow-cli.test.ts')
  return {
    ok: true,
    files,
    groups,
    commands: [...commands],
    notes: [
      'Replace <paths> with the owned file list before running placeholder commands.',
      'Build and server commands are intentionally omitted unless the developer explicitly approves them.',
    ],
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

function dependencyReferences() {
  const references = new Map()
  const importPattern = /^\s*(?:import|export)\s+(?:[^'"]+\s+from\s+)?['"]([^'"]+)['"]/
  const dynamicImportPattern = /\bimport\(\s*['"]([^'"]+)['"]\s*\)/
  const requirePattern = /^\s*(?:const|let|var)\s+[^=\n]+=\s*require\(['"]([^'"]+)['"]\)/

  for (const file of listFiles(['app', 'components', 'lib', 'scripts', 'devtools', 'tests'], { maxFiles: 8000 })) {
    let lines = []
    try {
      lines = readFileSync(file, 'utf8').split(/\r?\n/)
    } catch {
      continue
    }
    for (let i = 0; i < lines.length; i += 1) {
      const line = lines[i]
      const match = line.match(importPattern) || line.match(requirePattern) || line.match(dynamicImportPattern)
      const name = packageNameFromSpecifier(match?.[1])
      if (!name) continue
      const list = references.get(name) || []
      list.push({
        file: rel(file),
        line: i + 1,
        specifier: match[1],
        context: line.trim().slice(0, 180),
      })
      references.set(name, list)
    }
  }
  return references
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
  const references = dependencyReferences()
  const referenced = new Set(references.keys())

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

function dependencyTrace() {
  const truth = dependencyTruth()
  const references = dependencyReferences()
  const pkg = readJson(path.join(ROOT, 'package.json'), {})
  const classify = (items) => {
    const files = items.map((item) => item.file)
    if (files.every((file) => file.startsWith('tests/') || file.includes('.test.'))) return 'devDependency'
    if (files.every((file) => file.startsWith('scripts/') || file.startsWith('devtools/'))) return 'devDependency'
    return 'dependency'
  }
  return {
    ...truth,
    traces: truth.missingDeclarations.map((name) => {
      const items = references.get(name) || []
      return {
        name,
        suggestedSection: classify(items),
        declaredVersion: pkg.dependencies?.[name] || pkg.devDependencies?.[name] || null,
        references: items.slice(0, 20),
        referenceCount: items.length,
      }
    }),
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

  const explicitFiles = Boolean(args.files || args.owned)
  const useStaged = args.staged || (!args.all && !commandText && !explicitFiles)
  const files = args.all
    ? listFiles(DEFAULT_SCAN_DIRS).map(rel)
    : useStaged
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
  const warnings = []
  const scopedFiles = new Set([...parseFileListArgs(args), ...owned.ownedDirty.map((entry) => entry.path)])
  const dependencyFilesInScope = [...scopedFiles].some((file) => ['package.json', 'package-lock.json'].includes(file))
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
    const dependencyFinding = {
      id: 'dependency-truth',
      reason: 'Package truth check found missing declarations or lock entries.',
      missingDeclarations: deps.missingDeclarations.slice(0, 20),
      missingLockEntries: deps.missingLockEntries.slice(0, 20),
    }
    if (dependencyFilesInScope) blockers.push(dependencyFinding)
    else warnings.push(dependencyFinding)
  }
  return {
    ok: blockers.length === 0,
    branch: status.branch,
    upstream: status.upstream,
    blockers,
    warnings,
    owned,
    validation,
  }
}

function severityRank(severity) {
  return { blocked: 0, high: 1, medium: 2, low: 3, notice: 4, ok: 5 }[severity] ?? 9
}

function riskReport(args = {}) {
  const owned = ownedLedger(args)
  const policy = policyScan(args)
  const truth = truthScan()
  const route = routeScan()
  const aiGate = aiGateScan()
  const money = moneyScan()
  const deps = dependencyTruth()
  const migrations = migrationPlan(args)
  const findings = []
  const add = (severity, area, id, reason, detail = {}) => findings.push({ severity, area, id, reason, ...detail })

  if (owned.unownedDirty.length) {
    add('medium', 'ownership', 'unowned-dirty-work', 'Dirty files exist outside the owned set.', {
      count: owned.unownedDirty.length,
    })
  }
  for (const finding of policy.restricted.findings || []) {
    add('blocked', 'policy', finding.id, finding.reason, { source: finding.source, term: finding.term })
  }
  for (const finding of policy.guard?.blocked || []) {
    add('blocked', 'guard', finding.id, finding.reason)
  }
  if (truth.checks.emptyCatch.length) add('high', 'truth', 'empty-catch', 'Empty catch blocks can hide failures.', { count: truth.checks.emptyCatch.length })
  if (truth.checks.noOpHandlers.length) add('high', 'truth', 'no-op-handler', 'No-op UI handlers can present fake functionality.', { count: truth.checks.noOpHandlers.length })
  if (truth.checks.fakeMoney.length) add('high', 'truth', 'fake-money', 'Hardcoded displayed money risks hallucinated financial state.', { count: truth.checks.fakeMoney.length })
  if (!route.ok) add('high', 'route', 'route-protection', 'Route or server action protection scan found issues.', { count: route.serverActionFindings.length + route.prospectingPages.filter((page) => !page.hasRequireAdmin).length })
  if (!aiGate.ok) add('blocked', 'ai', 'ai-policy-drift', 'AI scan found provider drift or recipe-generation risk.', { providerDrift: aiGate.providerDrift.length, recipeRisk: aiGate.recipeGenerationRisk.length })
  if (!money.ok) add('high', 'money', 'money-invariant-drift', 'Money scan found hardcoded currency or related invariant risk.', { hardcodedCurrency: money.findings.hardcodedCurrency.length })
  if (!deps.ok) add('medium', 'deps', 'dependency-truth', 'Referenced packages are missing declarations or lock entries.', { missingDeclarations: deps.missingDeclarations, missingLockEntries: deps.missingLockEntries })
  for (const finding of migrations.proposed?.findings || []) {
    add(finding.severity === 'blocked' ? 'blocked' : 'notice', 'migration', finding.id, 'Proposed SQL migration scan finding.')
  }

  findings.sort((a, b) => severityRank(a.severity) - severityRank(b.severity) || a.area.localeCompare(b.area))
  return {
    ok: !findings.some((finding) => finding.severity === 'blocked' || finding.severity === 'high'),
    owned,
    findings,
    summary: {
      blocked: findings.filter((finding) => finding.severity === 'blocked').length,
      high: findings.filter((finding) => finding.severity === 'high').length,
      medium: findings.filter((finding) => finding.severity === 'medium').length,
      low: findings.filter((finding) => finding.severity === 'low').length,
      notice: findings.filter((finding) => finding.severity === 'notice').length,
    },
  }
}

function scanEmDashes(files) {
  const findings = []
  for (const file of files) {
    const text = readTextFile(file)
    if (!text.includes('\u2014')) continue
    const lines = text.split(/\r?\n/)
    for (let i = 0; i < lines.length; i += 1) {
      if (lines[i].includes('\u2014')) {
        findings.push({ file, line: i + 1, text: lines[i].trim().slice(0, 180) })
      }
    }
  }
  return findings
}

function safeValidationCommand(command) {
  if (!command || command.includes('<owned files>')) return false
  if (/\b(next\s+build|npm\s+run\s+build|npm\s+run\s+dev|npm\s+run\s+start|next\s+dev|next\s+start|deploy|prod)\b/i.test(command)) {
    return false
  }
  return guardCommand(command.split(/\s+/)).ok
}

function runValidationSuite(args = {}) {
  const selectorArgs = { ...args, _: (args._ || []).filter((item) => item !== 'run') }
  const selected = validationSelector(selectorArgs)
  const files = selected.files
  const dryRun = Boolean(args['dry-run'])
  const timeoutMs = Number(args.timeout || 120000)
  const emDashFindings = scanEmDashes(files)
  const results = []

  if (emDashFindings.length) {
    results.push({
      command: 'em-dash-scan',
      ok: false,
      skipped: false,
      exitCode: 1,
      findings: emDashFindings,
    })
  } else {
    results.push({ command: 'em-dash-scan', ok: true, skipped: false, exitCode: 0 })
  }

  for (const command of selected.commands) {
    if (!safeValidationCommand(command)) {
      results.push({ command, ok: true, skipped: true, reason: 'Command is unsafe, long-running, or a placeholder.' })
      continue
    }
    if (dryRun) {
      results.push({ command, ok: true, skipped: true, reason: 'Dry run.' })
      continue
    }
    try {
      const output = execFileSync(command, {
        cwd: ROOT,
        encoding: 'utf8',
        shell: true,
        stdio: ['ignore', 'pipe', 'pipe'],
        timeout: timeoutMs,
      })
      results.push({ command, ok: true, skipped: false, exitCode: 0, output: output.slice(-4000) })
    } catch (error) {
      results.push({
        command,
        ok: false,
        skipped: false,
        exitCode: error.status ?? 1,
        output: String(error.stdout || '').slice(-4000),
        error: String(error.stderr || error.message || '').slice(-4000),
      })
    }
  }

  return {
    ok: results.every((result) => result.ok),
    dryRun,
    selected,
    results,
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

function diffEvidence(args = {}) {
  const files = changedFilesFromArgs(args)
  const stats = files.map((file) => {
    const diff = runGitRaw(['diff', '--numstat', '--', file], '').trim()
    const cached = runGitRaw(['diff', '--cached', '--numstat', '--', file], '').trim()
    const row = (cached || diff).split(/\s+/)
    return {
      file,
      added: /^\d+$/.test(row[0]) ? Number(row[0]) : null,
      deleted: /^\d+$/.test(row[1]) ? Number(row[1]) : null,
      staged: Boolean(cached),
      exists: existsSync(path.join(ROOT, file)),
    }
  })
  const evidence = {
    generatedAt: new Date().toISOString(),
    branch: runGit(['branch', '--show-current'], '(unknown)'),
    head: runGit(['log', '-1', '--oneline'], ''),
    files,
    stats,
    validation: validationSelector(args),
    risk: riskReport(args),
    policy: policyScan(args),
  }
  if (args.write) {
    mkdirSync(EVIDENCE_ROOT, { recursive: true })
    const file = path.join(EVIDENCE_ROOT, `${nowStamp()}-cheflow-diff-evidence.json`)
    writeFileSync(file, `${JSON.stringify(evidence, null, 2)}\n`)
    evidence.file = rel(file)
  }
  return evidence
}

function prBrief(args = {}) {
  const files = changedFilesFromArgs(args)
  const diff = diffEvidence(args)
  const validation = validationSelector(args)
  const risk = riskReport(args)
  const commits = runGitRaw(['log', '--oneline', '--max-count=5'])
    .split(/\r?\n/)
    .filter(Boolean)
  return {
    ok: true,
    branch: runGit(['branch', '--show-current'], '(unknown)'),
    head: runGit(['log', '-1', '--oneline'], ''),
    title: args.title || `ChefFlow CLI operator update`,
    summary: [
      `Changed ${files.length} owned file${files.length === 1 ? '' : 's'}.`,
      `Validation commands selected: ${validation.commands.length}.`,
      `Risk findings: ${risk.findings.length}.`,
    ],
    files: diff.stats,
    validation,
    riskSummary: risk.summary,
    topRisks: risk.findings.slice(0, 8),
    recentCommits: commits,
    markdown: [
      `## Summary`,
      `- Changed files: ${files.join(', ') || 'none'}`,
      `- Head: ${runGit(['log', '-1', '--oneline'], '')}`,
      `- Risk findings: ${risk.findings.length}`,
      ``,
      `## Validation`,
      ...validation.commands.map((command) => `- ${command}`),
    ].join('\n'),
  }
}

function handoffPacket(args = {}) {
  const owned = ownedLedger(args)
  const packet = {
    generatedAt: new Date().toISOString(),
    branch: runGit(['branch', '--show-current'], '(unknown)'),
    head: runGit(['log', '-1', '--oneline'], ''),
    owned,
    pr: prBrief(args),
    review: reviewOwnedFiles(args),
    validation: validationSelector(args),
    next: nextAction(args),
    doNotTouch: owned.unownedDirty.map((entry) => entry.path),
    warnings: pushReadiness(args).warnings,
  }
  if (args.write) {
    mkdirSync(HANDOFF_ROOT, { recursive: true })
    const file = path.join(HANDOFF_ROOT, `${nowStamp()}-cheflow-handoff.json`)
    writeFileSync(file, `${JSON.stringify(packet, null, 2)}\n`)
    packet.file = rel(file)
  }
  return packet
}

function staleScan(args = {}) {
  const maxAgeHours = Number(args['max-age-hours'] || 24)
  const claims = loadClaims(maxAgeHours)
  const reportFiles = listExistingFiles(['system/agent-reports', '.playwright-mcp'], { maxFiles: 1200 })
    .map((file) => ({ file: rel(file), ageHours: fileAgeHours(file) }))
    .filter((item) => item.ageHours !== null && item.ageHours > maxAgeHours)
    .sort((a, b) => b.ageHours - a.ageHours)
    .slice(0, 80)
  const branches = runGitRaw(['branch', '--format', '%(refname:short)|%(committerdate:iso8601)|%(upstream:short)'])
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line) => {
      const [branch, date, upstream] = line.split('|')
      const ageHours = Number.isFinite(Date.parse(date)) ? (Date.now() - Date.parse(date)) / 36e5 : null
      return { branch, date, upstream: upstream || null, ageHours }
    })
    .filter((item) => item.ageHours !== null && item.ageHours > maxAgeHours * 7)
    .slice(0, 40)
  return {
    ok: true,
    maxAgeHours,
    staleClaims: claims.active.filter((claim) => claim.stale),
    staleReports: reportFiles,
    staleBranches: branches,
  }
}

function scopeClassifier(args = {}) {
  const files = parseFileListArgs(args)
  const dirty = statusEntries()
  const dirtyPaths = new Set(dirty.map((entry) => entry.path))
  const activeClaims = loadClaims().active
  return {
    ok: true,
    files: files.map((file) => {
      const text = readTextFile(file)
      const claim = activeClaims.find((item) =>
        (item.ownedPaths || []).some((ownedPath) => file === ownedPath || file.startsWith(`${ownedPath}/`)),
      )
      let classification = 'safe'
      const reasons = []
      if (!existsSync(path.join(ROOT, file))) {
        classification = 'unknown'
        reasons.push('File does not exist.')
      }
      if (file === 'types/database.ts') {
        classification = 'generated'
        reasons.push('Generated database types must not be edited manually.')
      }
      if (file.startsWith('database/') || file.endsWith('.sql')) {
        classification = 'database-risk'
        reasons.push('Database work has migration safety rules.')
      }
      if (text.startsWith("'use server'") || text.startsWith('"use server"')) {
        classification = 'server-action-risk'
        reasons.push('Server actions require auth, tenant scope, validation, feedback, and cache busting.')
      }
      if (dirtyPaths.has(file) || claim) {
        classification = 'conflict'
        reasons.push(dirtyPaths.has(file) ? 'File is already dirty.' : 'File overlaps an active claim.')
      }
      return { file, classification, reasons, claim: claim?.id || null }
    }),
  }
}

function undoPlan(args = {}) {
  const files = changedFilesFromArgs(args)
  const nameStatus = diffNameStatus(files)
  return {
    ok: true,
    files,
    changed: nameStatus,
    plan: [
      'Review the owned diff before any rollback.',
      `Save a patch if needed: git diff -- ${files.join(' ') || '<owned files>'} > tmp-owned-rollback.patch`,
      'Apply a manual reverse patch only after confirming the owned files are the only intended target.',
      'Do not use reset or checkout against unrelated dirty work.',
    ],
    reviewCommands: [
      `git diff -- ${files.join(' ') || '<owned files>'}`,
      `git status --short -- ${files.join(' ') || '<owned files>'}`,
    ],
  }
}

function routeOwner(args = {}) {
  const target = String(args.path || args.route || args._?.[0] || '').replace(/\\/g, '/')
  const registry = readJson(path.join(ROOT, 'system', 'canonical-surfaces.json'), { surfaces: [] })
  const surfaces = Array.isArray(registry.surfaces) ? registry.surfaces : []
  const matches = surfaces
    .map((surface) => {
      const haystack = JSON.stringify(surface).toLowerCase()
      const needle = target.toLowerCase()
      return { surface, score: needle && haystack.includes(needle) ? 2 : 0 }
    })
    .filter((item) => item.score > 0)
    .slice(0, 10)
  const pathMatches = target
    ? listFiles(['app', 'components', 'lib'], { maxFiles: 6000 })
        .map(rel)
        .filter((file) => file.includes(target.replace(/^\//, '')) || target.includes(file.replace(/^app/, '').replace(/\/page\.(tsx|ts)$/, '')))
        .slice(0, 20)
    : []
  const recentCommits = target
    ? runGitRaw(['log', '--oneline', '--max-count=10', '--', target])
        .split(/\r?\n/)
        .filter(Boolean)
    : []
  return {
    ok: true,
    target,
    canonicalMatches: matches,
    pathMatches,
    recentCommits,
    duplicateRisk: matches.length > 1 || pathMatches.length > 3 ? 'review-required' : 'low',
  }
}

function branchDoctor() {
  const status = statusSnapshot()
  const upstream = status.upstream
  const counts = upstream
    ? runGit(['rev-list', '--left-right', '--count', `${upstream}...HEAD`], '0\t0').split(/\s+/)
    : ['0', '0']
  const localBranch = status.branch
  const upstreamName = upstream ? upstream.split('/').slice(1).join('/') : null
  const findings = []
  if (localBranch === 'main') findings.push({ severity: 'blocked', id: 'main-branch', reason: 'Current branch is main.' })
  if (!upstream) findings.push({ severity: 'medium', id: 'missing-upstream', reason: 'No upstream is configured.' })
  if (upstreamName && upstreamName !== localBranch) findings.push({ severity: 'medium', id: 'upstream-name-mismatch', reason: `Upstream branch is ${upstreamName}, local branch is ${localBranch}.` })
  if (Number(counts[1] || 0) > 0) findings.push({ severity: 'notice', id: 'ahead', reason: `Local branch is ahead by ${counts[1]} commit(s).` })
  if (Number(counts[0] || 0) > 0) findings.push({ severity: 'medium', id: 'behind', reason: `Local branch is behind by ${counts[0]} commit(s).` })
  if (status.dirty.count) findings.push({ severity: 'notice', id: 'dirty-worktree', reason: `Worktree has ${status.dirty.count} dirty file(s).` })
  return {
    ok: !findings.some((finding) => finding.severity === 'blocked'),
    branch: localBranch,
    upstream,
    ahead: Number(counts[1] || 0),
    behind: Number(counts[0] || 0),
    findings,
  }
}

function pushRepair(args = {}) {
  const errorText = String(args.error || args._?.join(' ') || '')
  const branch = runGit(['branch', '--show-current'], '(unknown)')
  const diagnosis = []
  if (/upstream branch.*does not match|simple/i.test(errorText)) {
    diagnosis.push({ id: 'upstream-name-mismatch', command: `git push -u origin HEAD:refs/heads/${branch}` })
  }
  if (/Authentication failed|could not read Username|terminal prompts disabled|credential/i.test(errorText)) {
    diagnosis.push({ id: 'auth', command: 'gh auth status' })
  }
  if (/timed out|Failed to connect|Could not resolve host|network/i.test(errorText)) {
    diagnosis.push({ id: 'network', command: 'git ls-remote --heads origin' })
  }
  if (/rejected|non-fast-forward|fetch first/i.test(errorText)) {
    diagnosis.push({ id: 'remote-rejection', command: 'git fetch origin' })
  }
  if (!diagnosis.length) {
    diagnosis.push({ id: 'inspect', command: `git push -u origin HEAD:refs/heads/${branch}` })
  }
  return {
    ok: true,
    branch,
    upstream: runGit(['rev-parse', '--abbrev-ref', '--symbolic-full-name', '@{u}'], ''),
    diagnosis,
    branchDoctor: branchDoctor(),
  }
}

function agentScore(args = {}) {
  const owned = ownedLedger(args)
  const validation = validationSelector(args)
  const review = reviewOwnedFiles(args)
  const push = pushReadiness(args)
  const scoreParts = [
    { name: 'owned-scope', points: owned.unownedDirty.length ? 0 : 20 },
    { name: 'validation-selected', points: validation.commands.length ? 20 : 0 },
    { name: 'review-clean', points: review.ok ? 20 : 0 },
    { name: 'push-ready', points: push.ok ? 20 : 0 },
    { name: 'not-main', points: runGit(['branch', '--show-current'], '') === 'main' ? 0 : 20 },
  ]
  return {
    ok: true,
    score: scoreParts.reduce((sum, part) => sum + part.points, 0),
    maxScore: 100,
    scoreParts,
    owned,
    validation,
    reviewFindings: review.findings,
    push,
  }
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

function taskStart(args = {}) {
  const prompt = String(args.prompt || args.task || args._?.slice(1).join(' ') || '').trim()
  const owned = ownedLedger(args)
  const risk = riskReport(args)
  return {
    ok: true,
    prompt: prompt || null,
    branch: runGit(['branch', '--show-current'], '(unknown)'),
    status: statusSnapshot(),
    continuity: {
      ...continuityDecision(),
      suggestedCommand: prompt
        ? `node devtools/context-continuity-scan.mjs --prompt "${prompt.replace(/"/g, '\\"')}" --write`
        : 'node devtools/context-continuity-scan.mjs --prompt "<task>" --write',
    },
    claims: loadClaims(),
    owned,
    risk: {
      ok: risk.ok,
      summary: risk.summary,
      topFindings: risk.findings.slice(0, 10),
    },
    next: nextAction(args),
    hardStops: [
      'Do not work on main.',
      'Do not run destructive database operations.',
      'Do not run drizzle-kit push without explicit approval.',
      'Do not edit types/database.ts.',
      'Do not build, deploy, start, kill, or restart servers without explicit approval.',
      'Commit and push only owned files before finishing code work.',
    ],
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

function migrationProposal(args = {}) {
  const plan = migrationPlan(args)
  const sqlPath = args.sql ? path.resolve(ROOT, String(args.sql)) : null
  const sql = sqlPath && existsSync(sqlPath) ? readFileSync(sqlPath, 'utf8') : ''
  const blocked = plan.proposed?.findings?.some((finding) => finding.severity === 'blocked') || !sql
  return {
    ok: !blocked,
    ...plan,
    proposed: {
      ...(plan.proposed || {
        path: args.sql ? rel(sqlPath) : null,
        exists: false,
        findings: [{ id: 'sql-file-required', severity: 'blocked' }],
      }),
      nextFilename: sql ? `${plan.nextTimestamp}_${slugify(args.name || path.basename(String(args.sql), '.sql'), 'migration')}.sql` : null,
      fullSql: sql,
      approvalRequired: true,
      writeCommandAfterApproval: sql
        ? `Copy approved SQL into database/migrations/${plan.nextTimestamp}_${slugify(args.name || path.basename(String(args.sql), '.sql'), 'migration')}.sql`
        : null,
    },
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

function reviewOwnedFiles(args = {}) {
  const files = changedFilesFromArgs(args)
  const findings = []
  const tsNoCheck = `@ts-${'nocheck'}`
  const tsNoCheckId = `ts-${'nocheck'}`
  const add = (severity, file, line, id, reason, text = '') =>
    findings.push({ severity, file, line, id, reason, text: String(text || '').trim().slice(0, 180) })

  for (const file of files) {
    const text = readTextFile(file)
    if (!text) continue
    const lines = text.split(/\r?\n/)
    const isServer = text.startsWith("'use server'") || text.startsWith('"use server"')
    const isProspecting = file.includes('/prospecting/')

    if (isServer && !/\brequire(?:Chef|Client|Admin|Auth)\s*\(/.test(text)) {
      add('blocked', file, 1, 'server-action-auth', 'Server action file lacks requireChef, requireClient, requireAdmin, or requireAuth.')
    }
    if (isServer && /^\s*export\s+(?:const|class|type)\b/m.test(text)) {
      add('blocked', file, 1, 'server-action-export', 'Use server files may only export async functions.')
    }
    if (isServer && /\.from\(/.test(text) && !/\.eq\(\s*['"`](?:tenant_id|chef_id)['"`]/.test(text)) {
      add('high', file, 1, 'tenant-scope-missing', 'Database access in server action has no obvious tenant_id or chef_id scope.')
    }
    if (isProspecting && !/\brequireAdmin\s*\(/.test(text) && !/adminOnly\s*:\s*true/.test(text)) {
      add('blocked', file, 1, 'prospecting-admin-only', 'Prospecting surface must be admin-only.')
    }
    if (/revalidatePath|revalidateTag/.test(text) === false && /\b(insert|update|delete|upsert)\s*\(/.test(text)) {
      add('medium', file, 1, 'mutation-cache-bust', 'Mutation-like code has no obvious revalidatePath or revalidateTag.')
    }

    lines.forEach((line, index) => {
      if (/\bon[A-Z][A-Za-z0-9_]*=\{\s*(?:\(\)\s*=>\s*)?\{\s*\}\s*\}/.test(line)) {
        add('high', file, index + 1, 'no-op-handler', 'No-op handlers must be hidden, disabled, or implemented.', line)
      }
      if (/['"`]\$[0-9][0-9,.]*(?:\.[0-9]{2})?['"`]/.test(line)) {
        add('high', file, index + 1, 'hardcoded-money', 'Displayed money must come from real data, not hardcoded values.', line)
      }
      if (line.includes(tsNoCheck)) {
        add('blocked', file, index + 1, tsNoCheckId, `Project rules forbid ${tsNoCheck}.`, line)
      }
      if (/\bOpenClaw\b/.test(line) && /app\/|components\/|public\//.test(file)) {
        add('blocked', file, index + 1, 'public-openclaw', 'OpenClaw is forbidden in public surfaces.', line)
      }
      if (line.includes('\u2014')) {
        add('blocked', file, index + 1, 'em-dash', 'Em dashes are banned project-wide.', line)
      }
    })
  }

  findings.sort((a, b) => severityRank(a.severity) - severityRank(b.severity) || a.file.localeCompare(b.file))
  return {
    ok: !findings.some((finding) => finding.severity === 'blocked' || finding.severity === 'high'),
    files,
    findings,
  }
}

function serverActionAudit(args = {}) {
  const files = changedFilesFromArgs(args).filter((file) => {
    const text = readTextFile(file)
    return text.startsWith("'use server'") || text.startsWith('"use server"')
  })
  const findings = []
  const add = (severity, file, id, reason) => findings.push({ severity, file, id, reason })

  for (const file of files) {
    const text = readTextFile(file)
    const firstOperationalLine = text
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith('//') && !line.startsWith('import') && !line.startsWith("'use server'") && !line.startsWith('"use server"'))[0]
    if (!/\brequire(?:Chef|Client|Admin|Auth)\s*\(/.test(text)) {
      add('blocked', file, 'auth-missing', 'Server action file has no obvious requireChef, requireClient, requireAdmin, or requireAuth call.')
    }
    if (firstOperationalLine && !/\brequire(?:Chef|Client|Admin|Auth)\s*\(/.test(firstOperationalLine)) {
      add('medium', file, 'auth-not-first', 'First operational line is not an obvious auth call.')
    }
    if (/\.from\(/.test(text) && !/\.eq\(\s*['"`](?:tenant_id|chef_id)['"`]/.test(text)) {
      add('high', file, 'tenant-scope-missing', 'Database access has no obvious tenant_id or chef_id equality filter.')
    }
    if (/\b(insert|update|delete|upsert)\s*\(/.test(text) && !/revalidate(?:Path|Tag)\s*\(/.test(text)) {
      add('high', file, 'cache-bust-missing', 'Mutation-like action has no obvious revalidatePath or revalidateTag call.')
    }
    if (/^\s*export\s+(?:const|class|type)\b/m.test(text)) {
      add('blocked', file, 'invalid-export', 'Use-server files may only export async functions.')
    }
    if (/\breturn\s*;/.test(text) || /\bPromise<void>\b/.test(text)) {
      add('medium', file, 'void-return-risk', 'Mutation actions should return feedback instead of void.')
    }
  }

  findings.sort((a, b) => severityRank(a.severity) - severityRank(b.severity) || a.file.localeCompare(b.file))
  return {
    ok: !findings.some((finding) => finding.severity === 'blocked' || finding.severity === 'high'),
    files,
    findings,
  }
}

function uiTruthAudit(args = {}) {
  const files = changedFilesFromArgs(args).filter((file) => file.startsWith('app/') || file.startsWith('components/'))
  const findings = []
  const add = (severity, file, line, id, reason, text = '') =>
    findings.push({ severity, file, line, id, reason, text: String(text || '').trim().slice(0, 180) })

  for (const file of files) {
    const text = readTextFile(file)
    const lines = text.split(/\r?\n/)
    lines.forEach((line, index) => {
      if (/\bon[A-Z][A-Za-z0-9_]*=\{\s*(?:\(\)\s*=>\s*)?\{\s*\}\s*\}/.test(line)) {
        add('high', file, index + 1, 'no-op-handler', 'No-op UI handlers present fake functionality.', line)
      }
      if (/['"`]\$[0-9][0-9,.]*(?:\.[0-9]{2})?['"`]/.test(line)) {
        add('high', file, index + 1, 'hardcoded-money', 'Displayed money must come from real data.', line)
      }
      if (/\buseOptimistic\b|optimistic/i.test(line) && !/rollback|catch|revert/i.test(text)) {
        add('medium', file, index + 1, 'optimistic-without-rollback', 'Optimistic UI needs visible rollback handling.', line)
      }
      if (/\bdisabled\b/.test(line) && !/title=|aria-describedby|reason|tooltip|explain/i.test(line)) {
        add('low', file, index + 1, 'disabled-without-reason', 'Disabled controls should expose a reason when user-visible.', line)
      }
      if (/\b(?:Coming soon|TODO|placeholder)\b/i.test(line)) {
        add('medium', file, index + 1, 'placeholder-ui', 'Placeholder UI can mislead users if rendered as real functionality.', line)
      }
    })
  }

  findings.sort((a, b) => severityRank(a.severity) - severityRank(b.severity) || a.file.localeCompare(b.file))
  return {
    ok: !findings.some((finding) => finding.severity === 'blocked' || finding.severity === 'high'),
    files,
    findings,
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
  const owned = parseList(args.owned || args.files)
  const readiness = {
    branch: runGit(['branch', '--show-current'], '(unknown)'),
    dirty: statusEntries(),
    owned,
    push: pushReadiness(args),
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
  if (!args.commit && !args.push) return readiness
  return executeCloseout(args, readiness)
}

function executeCloseout(args, readiness) {
  const branch = readiness.branch
  const owned = readiness.owned
  const result = {
    ...readiness,
    executed: true,
    validation: null,
    staged: [],
    commit: null,
    pushResult: null,
    ok: false,
  }
  if (branch === 'main') {
    result.error = 'Refusing closeout execution on main.'
    return result
  }
  if (!owned.length) {
    result.error = 'closeout --commit or --push requires --owned <paths>.'
    return result
  }

  result.validation = runValidationSuite({ ...args, _: [] })
  if (!result.validation.ok && !args['skip-validation']) {
    result.error = 'Validation failed. Refusing to stage, commit, or push.'
    return result
  }

  const ownedSet = new Set(owned)
  const ownedDirty = statusEntries().filter((entry) =>
    [...ownedSet].some((ownedPath) => entry.path === ownedPath || entry.path.startsWith(`${ownedPath}/`)),
  )
  for (const entry of ownedDirty) {
    execFileSync('git', ['add', '--', entry.path], { cwd: ROOT, stdio: ['ignore', 'ignore', 'pipe'] })
    result.staged.push(entry.path)
  }

  if (args.commit) {
    const staged = runGitRaw(['diff', '--cached', '--name-only']).split(/\r?\n/).filter(Boolean)
    const stagedOutsideOwned = staged.filter(
      (file) => ![...ownedSet].some((ownedPath) => file === ownedPath || file.startsWith(`${ownedPath}/`)),
    )
    if (stagedOutsideOwned.length) {
      result.error = 'Staged files outside the owned set are present. Refusing to commit.'
      result.stagedOutsideOwned = stagedOutsideOwned
      return result
    }
    if (staged.length) {
      const message =
        args.message ||
        `chore(agent): update cheflow cli operator flow ${branch}`
      execFileSync('git', ['commit', '-m', message], { cwd: ROOT, stdio: ['ignore', 'pipe', 'pipe'] })
      result.commit = runGit(['log', '-1', '--oneline'], '')
    } else {
      result.commit = 'No staged owned changes to commit.'
    }
  }

  if (args.push) {
    const upstream = runGit(['rev-parse', '--abbrev-ref', '--symbolic-full-name', '@{u}'], '')
    const pushArgs = upstream ? ['push'] : ['push', '-u', 'origin', branch]
    try {
      const output = execFileSync('git', pushArgs, {
        cwd: ROOT,
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'pipe'],
      })
      result.pushResult = { ok: true, output: output.slice(-4000) }
    } catch (error) {
      result.pushResult = {
        ok: false,
        exitCode: error.status ?? 1,
        output: String(error.stdout || '').slice(-4000),
        error: String(error.stderr || error.message || '').slice(-4000),
      }
      result.error = 'git push failed.'
      return result
    }
  }

  result.ok = true
  return result
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

function explainBlockers(args = {}) {
  const push = pushReadiness(args)
  const deps = dependencyTrace()
  return {
    ok: push.ok,
    command: 'explain blockers',
    blockers: push.blockers.map((blocker) => ({
      ...blocker,
      explanation:
        blocker.id === 'unowned-dirty-work'
          ? 'Another agent likely owns these dirty files. Pass --owned with only this task files, or leave them untouched.'
          : blocker.id === 'dependency-truth'
            ? 'Some imports are not declared in package.json or package-lock truth is inconsistent. Use deps trace for exact import sites.'
            : blocker.reason,
    })),
    dependencyTraces: deps.traces,
    owned: push.owned,
    validation: push.validation,
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
    console.log(`  ${name.padEnd(14)} ${command.summary}`)
  }
  console.log(`
Examples:
  node scripts/cheflow.mjs task start --prompt "Fix quote totals" --owned lib/quotes
  node scripts/cheflow.mjs handoff --owned scripts/cheflow.mjs,tests/unit/cheflow-cli.test.ts
  node scripts/cheflow.mjs pr brief --owned scripts/cheflow.mjs
  node scripts/cheflow.mjs branch doctor
  node scripts/cheflow.mjs push repair --error "upstream branch does not match"
  node scripts/cheflow.mjs risk --owned scripts/cheflow.mjs,tests/unit/cheflow-cli.test.ts
  node scripts/cheflow.mjs validate run --dry-run --owned scripts/cheflow.mjs
  node scripts/cheflow.mjs cockpit
  node scripts/cheflow.mjs next --owned scripts/cheflow.mjs,tests/unit/cheflow-cli.test.ts
  node scripts/cheflow.mjs guard -- git push origin main
  node scripts/cheflow.mjs migrate propose --sql tmp/proposed.sql
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

  if (command === 'migrate' && maybeSubcommand === 'propose') {
    const args = parseArgs(rest)
    const result = migrationProposal(args)
    printJsonOrHuman(result, args, (value) => printSummary('ChefFlow migration proposal', value))
    return result.ok ? 0 : 1
  }

  if (command === 'server-action' && maybeSubcommand === 'audit') {
    const args = parseArgs(rest)
    const result = serverActionAudit(args)
    printJsonOrHuman(result, args, (value) => printSummary('ChefFlow server action audit', value))
    return result.ok ? 0 : 1
  }

  if (command === 'ui-truth' && maybeSubcommand === 'audit') {
    const args = parseArgs(rest)
    const result = uiTruthAudit(args)
    printJsonOrHuman(result, args, (value) => printSummary('ChefFlow UI truth audit', value))
    return result.ok ? 0 : 1
  }

  if (command === 'branch' && maybeSubcommand === 'doctor') {
    const args = parseArgs(rest)
    const result = branchDoctor()
    printJsonOrHuman(result, args, (value) => printSummary('ChefFlow branch doctor', value))
    return result.ok ? 0 : 1
  }

  if (command === 'push' && maybeSubcommand === 'repair') {
    const args = parseArgs(rest)
    const result = pushRepair(args)
    printJsonOrHuman(result, args, (value) => printSummary('ChefFlow push repair', value))
    return 0
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
      const result = args._[0] === 'blockers' ? explainBlockers({ ...args, _: args._.slice(1) }) : explain(args._[0])
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
      const result =
        args._[0] === 'run'
          ? runValidationSuite({ ...args, _: args._.slice(1) })
          : validationSelector(args)
      printJsonOrHuman(result, args, (value) => printSummary('ChefFlow validation selector', value))
      return result.ok ? 0 : 1
    }
    case 'policy': {
      const result = policyScan(args)
      printJsonOrHuman(result, args, (value) => printSummary('ChefFlow policy scan', value))
      return result.ok ? 0 : 1
    }
    case 'deps': {
      const result = args._[0] === 'trace' ? dependencyTrace() : dependencyTruth()
      printJsonOrHuman(result, args, (value) => printSummary('ChefFlow dependency truth', value))
      return result.ok ? 0 : 1
    }
    case 'continuity': {
      const result = continuityDecision()
      printJsonOrHuman(result, args, (value) => printSummary('ChefFlow continuity decision', value))
      return 0
    }
    case 'evidence': {
      const result = args._[0] === 'diff' ? diffEvidence({ ...args, _: args._.slice(1) }) : closeoutEvidence(args)
      printJsonOrHuman(result, args, (value) => printSummary('ChefFlow closeout evidence', value))
      return 0
    }
    case 'task': {
      const result = taskStart({ ...args, _: args._[0] === 'start' ? args._.slice(1) : args._ })
      printJsonOrHuman(result, args, (value) => printSummary('ChefFlow task start', value))
      return 0
    }
    case 'risk': {
      const result = riskReport(args)
      printJsonOrHuman(result, args, (value) => printSummary('ChefFlow risk report', value))
      return result.ok ? 0 : 1
    }
    case 'review': {
      const result = reviewOwnedFiles(args)
      printJsonOrHuman(result, args, (value) => printSummary('ChefFlow review', value))
      return result.ok ? 0 : 1
    }
    case 'claim': {
      const result = claimCommand(args)
      printJsonOrHuman(result, args, (value) => printSummary('ChefFlow claim', value))
      return result.ok === false ? 1 : 0
    }
    case 'pr': {
      const result = prBrief({ ...args, _: args._[0] === 'brief' ? args._.slice(1) : args._ })
      printJsonOrHuman(result, args, (value) => printSummary('ChefFlow PR brief', value))
      return 0
    }
    case 'handoff': {
      const result = handoffPacket(args)
      printJsonOrHuman(result, args, (value) => printSummary('ChefFlow handoff', value))
      return 0
    }
    case 'stale': {
      const result = staleScan(args)
      printJsonOrHuman(result, args, (value) => printSummary('ChefFlow stale scan', value))
      return 0
    }
    case 'scope': {
      const result = scopeClassifier(args)
      printJsonOrHuman(result, args, (value) => printSummary('ChefFlow scope classifier', value))
      return 0
    }
    case 'undo-plan': {
      const result = undoPlan(args)
      printJsonOrHuman(result, args, (value) => printSummary('ChefFlow undo plan', value))
      return 0
    }
    case 'test-map': {
      const result = testMap(args)
      printJsonOrHuman(result, args, (value) => printSummary('ChefFlow test map', value))
      return 0
    }
    case 'server-action': {
      const result = serverActionAudit(args)
      printJsonOrHuman(result, args, (value) => printSummary('ChefFlow server action audit', value))
      return result.ok ? 0 : 1
    }
    case 'ui-truth': {
      const result = uiTruthAudit(args)
      printJsonOrHuman(result, args, (value) => printSummary('ChefFlow UI truth audit', value))
      return result.ok ? 0 : 1
    }
    case 'route-owner': {
      const result = routeOwner(args)
      printJsonOrHuman(result, args, (value) => printSummary('ChefFlow route owner', value))
      return 0
    }
    case 'branch': {
      const result = branchDoctor()
      printJsonOrHuman(result, args, (value) => printSummary('ChefFlow branch doctor', value))
      return result.ok ? 0 : 1
    }
    case 'push': {
      const result = pushRepair(args)
      printJsonOrHuman(result, args, (value) => printSummary('ChefFlow push repair', value))
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
    case 'agent': {
      if (args._[0] === 'score') {
        const result = agentScore({ ...args, _: args._.slice(1) })
        printJsonOrHuman(result, args, (value) => printSummary('ChefFlow agent score', value))
        return 0
      }
      const result = commandCenter(command)
      printJsonOrHuman(result, args, (value) => printSummary(`ChefFlow ${command} center`, value))
      return 0
    }
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
  agentScore,
  branchDoctor,
  claimCommand,
  closeout,
  closeoutEvidence,
  cockpit,
  commandCenter,
  continuityDecision,
  dependencyTrace,
  dependencyTruth,
  diffEvidence,
  doctor,
  explain,
  explainBlockers,
  guardCommand,
  handoffPacket,
  loadClaims,
  main,
  migrationPlan,
  migrationProposal,
  moneyScan,
  nextAction,
  ownedLedger,
  policyScan,
  prBrief,
  pushReadiness,
  pushRepair,
  reviewOwnedFiles,
  routeOwner,
  routeScan,
  riskReport,
  runValidationSuite,
  scanSqlText,
  scopeClassifier,
  serverActionAudit,
  staleScan,
  statusSnapshot,
  taskStart,
  testMap,
  truthScan,
  uiTruthAudit,
  undoPlan,
  validationSelector,
}
