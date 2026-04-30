#!/usr/bin/env node
import { execFileSync, execSync, spawnSync } from 'node:child_process'
import { existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

import { normalizeIntake } from './normalize-intake.mjs'
import {
  createClaim,
  createBuilderContext,
  ensureBuilderStore,
  loadApprovedQueue,
  loadFreshClaims,
  loadReceipts,
  readActiveLane,
  selectNextTask,
  slugify,
  updateClaim,
  writeReceipt,
  writeRunnerStatus,
} from './core.mjs'

function hasFlag(name) {
  return process.argv.includes(`--${name}`)
}

function positionalArgs() {
  return process.argv.slice(2).filter((value) => !value.startsWith('--'))
}

function getArg(name, fallback = null) {
  const index = process.argv.indexOf(`--${name}`)
  if (index === -1) return fallback
  return process.argv[index + 1] ?? fallback
}

function gitValue(command) {
  try {
    return execSync(command, { encoding: 'utf8' }).trim()
  } catch {
    return null
  }
}

function gitValueIn(path, args) {
  try {
    return execFileSync('git', ['-c', 'core.longpaths=true', '-C', path, ...args], {
      encoding: 'utf8',
    }).trim()
  } catch {
    return null
  }
}

function commandExists(command) {
  try {
    const probe = process.platform === 'win32' ? 'where' : 'command -v'
    execSync(`${probe} ${command}`, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] })
    return true
  } catch {
    return false
  }
}

function tailText(value, maxLength = 4000) {
  const text = String(value ?? '').trim()
  if (text.length <= maxLength) return text
  return text.slice(text.length - maxLength)
}

function buildStatus(fields) {
  return {
    runner: 'v1-builder',
    mode: fields.mode,
    status: fields.status,
    reason: fields.reason ?? null,
    activeLane: fields.activeLane ?? null,
    branch: fields.branch ?? null,
    task: fields.task ?? null,
    intake: fields.intake ?? null,
    claims: fields.claims ?? [],
    errors: fields.errors ?? [],
    nextAction: fields.nextAction ?? null,
    checkedAt: new Date().toISOString(),
  }
}

const positionals = positionalArgs()
const positionalMode = positionals.includes('live') ? 'live' : positionals.includes('dry-run') ? 'dry-run' : null
const mode = getArg('mode', positionalMode ?? (hasFlag('live') ? 'live' : 'dry-run'))
const context = createBuilderContext()
ensureBuilderStore(context)
const shouldNormalizeIntake =
  hasFlag('normalize-intake') || process.env.V1_BUILDER_NORMALIZE_INTAKE === '1'
const maxApprovedQueueWrites = Number.parseInt(
  getArg('max-approved', process.env.V1_BUILDER_MAX_APPROVED ?? '3'),
  10,
)
const maxHardStopWrites = Number.parseInt(
  getArg('max-hard-stops', process.env.V1_BUILDER_MAX_HARD_STOPS ?? '10'),
  10,
)
let intakeSummary = null

const branch = gitValue('git branch --show-current')
const activeLane = readActiveLane(context)

if (branch === 'main') {
  const status = buildStatus({
    mode,
    status: 'blocked',
    reason: 'main_branch',
    activeLane,
    branch,
    nextAction: 'Switch to a feature branch before running the builder.',
  })
  writeRunnerStatus(status, context)
  console.log(JSON.stringify(status, null, 2))
  process.exit(0)
}

const freshClaims = loadFreshClaims(context)
if (freshClaims.length > 0) {
  const status = buildStatus({
    mode,
    status: 'blocked',
    reason: 'fresh_claim_exists',
    activeLane,
    branch,
    claims: freshClaims,
    nextAction: 'Wait for the claim to finish or expire.',
  })
  writeRunnerStatus(status, context)
  console.log(JSON.stringify(status, null, 2))
  process.exit(0)
}

if (shouldNormalizeIntake) {
  intakeSummary = normalizeIntake({
    context,
    write: true,
    profile: 'builder-gate',
    maxApprovedQueueWrites: Number.isFinite(maxApprovedQueueWrites)
      ? maxApprovedQueueWrites
      : 3,
    maxHardStopWrites: Number.isFinite(maxHardStopWrites)
      ? maxHardStopWrites
      : 10,
  })
}

const { records, errors } = loadApprovedQueue(context)
if (errors.length > 0) {
  const status = buildStatus({
    mode,
    status: 'blocked',
    reason: 'malformed_queue',
    activeLane,
    branch,
    intake: intakeSummary,
    errors,
    nextAction: 'Fix the malformed queue record before running the builder.',
  })
  writeRunnerStatus(status, context)
  console.log(JSON.stringify(status, null, 2))
  process.exit(0)
}

const task = selectNextTask(records, activeLane, loadReceipts(context))
if (!task) {
  const status = buildStatus({
    mode,
    status: 'idle',
    reason: 'queue_empty',
    activeLane,
    branch,
    intake: intakeSummary,
    nextAction: shouldNormalizeIntake
      ? 'No approved V1 tasks were produced by the intake normalizer.'
      : 'Run node scripts/v1-builder/normalize-intake.mjs --write, or rerun with --normalize-intake.',
  })
  writeRunnerStatus(status, context)
  console.log(JSON.stringify(status, null, 2))
  process.exit(0)
}

if (mode !== 'live') {
  const status = buildStatus({
    mode,
    status: 'ready',
    activeLane,
    branch,
    task,
    intake: intakeSummary,
    nextAction: 'Dry-run runner found the next task. Run with --mode live to execute in an isolated worktree.',
  })

  writeRunnerStatus(status, context)
  console.log(JSON.stringify(status, null, 2))
  process.exit(0)
}

if (!commandExists('codex')) {
  const status = buildStatus({
    mode,
    status: 'blocked',
    reason: 'codex_cli_not_found',
    activeLane,
    branch,
    task,
    intake: intakeSummary,
    nextAction: 'Install or expose the Codex CLI before live background execution.',
  })
  writeRunnerStatus(status, context)
  console.log(JSON.stringify(status, null, 2))
  process.exit(0)
}

const { claim, path: claimPath } = createClaim(task, context)
const runSlug = `${task.id}-${Date.now()}-${slugify(task.title ?? task.id)}`
const worktreePath = join(context.worktreesDir, runSlug)
mkdirSync(context.worktreesDir, { recursive: true })

const receiptBase = {
  taskId: task.id,
  branch: claim.branch,
  classification: task.classification,
  canonicalOwner: task.canonicalOwner,
  startedAt: claim.claimedAt,
}

try {
  updateClaim(claimPath, { status: 'running', worktreePath })

  execFileSync('git', ['-c', 'core.longpaths=true', 'worktree', 'add', '-b', claim.branch, worktreePath, 'HEAD'], {
    cwd: context.root,
    stdio: 'pipe',
  })

  const prompt = [
    'You are a ChefFlow V1 Builder running inside an isolated git worktree.',
    '',
    'Read AGENTS.md before editing. Build exactly the approved task below and nothing else.',
    '',
    `Task: ${JSON.stringify(task, null, 2)}`,
    '',
    'Required rules:',
    `- Stay on branch ${claim.branch}.`,
    '- Do not push to main, merge to main, deploy, restart servers, kill servers, run destructive database work, or run drizzle-kit push.',
    '- If a migration is required, stop and explain the SQL instead of writing the migration.',
    '- Keep edits scoped to the task canonical owner and directly required files.',
    '- Run focused validation appropriate to the change. Do not run next build unless explicitly needed by the task.',
    '- Commit and push only the files you touched.',
    '- If blocked, commit any partial safe work and explain the blocker.',
    '',
    'Finish with a short summary including touched files, validations, commit hash, and push result.',
  ].join('\n')

  const promptPath = join(context.runtimeDir, `${claim.id}-prompt.txt`)
  writeFileSync(promptPath, prompt, 'utf8')

  const codex = spawnSync(
    'codex',
    [
      '--ask-for-approval',
      'never',
      'exec',
      '--cd',
      worktreePath,
      '--sandbox',
      'danger-full-access',
      '-',
    ],
    {
      cwd: context.root,
      encoding: 'utf8',
      input: prompt,
      maxBuffer: 10 * 1024 * 1024,
      timeout: 60 * 60 * 1000,
      windowsHide: true,
    },
  )

  const head = gitValueIn(worktreePath, ['rev-parse', '--short', 'HEAD'])
  const dirty = gitValueIn(worktreePath, ['status', '--short'])
  const branchName = gitValueIn(worktreePath, ['branch', '--show-current'])
  const remoteContains = head
    ? gitValueIn(worktreePath, ['branch', '-r', '--contains', head])
    : null
  const pushed = Boolean(
    !dirty &&
      head &&
      head !== gitValue('git rev-parse --short HEAD') &&
      branchName &&
      remoteContains?.split(/\r?\n/).some((line) => line.trim() === `origin/${branchName}`),
  )
  const codexStdout = tailText(codex.stdout)
  const codexStderr = tailText(codex.stderr)

  const receiptResult = writeReceipt({
    ...receiptBase,
    status: codex.status === 0 && pushed ? 'pushed' : 'blocked',
    touchedFiles: [],
    validations: [
      {
        command: 'codex exec',
        exitCode: codex.status,
        stdoutTail: codexStdout,
        stderrTail: codexStderr,
      },
    ],
    blockedReason:
      codex.status === 0 && pushed
        ? null
        : `codex_exit=${codex.status}; dirty=${dirty ? 'yes' : 'no'}; pushed=${pushed ? 'yes' : 'no'}; stderr=${tailText(codexStderr, 500)}`,
    commit: head,
    pushed,
    missionControlSummary:
      codex.status === 0 && pushed
        ? `Codex completed and pushed ${task.id}.`
        : `Codex live run for ${task.id} needs review.`,
  }, context)

  updateClaim(claimPath, {
    status: codex.status === 0 && pushed ? 'completed' : 'blocked',
    receiptPath: receiptResult.path,
    codexExitCode: codex.status,
  })

  const status = buildStatus({
    mode,
    status: codex.status === 0 && pushed ? 'completed' : 'blocked',
    reason: codex.status === 0 && pushed ? null : 'live_run_needs_review',
    activeLane,
    branch: claim.branch,
    task,
    intake: intakeSummary,
    nextAction: receiptResult.receipt.missionControlSummary,
  })
  writeRunnerStatus(status, context)
  console.log(JSON.stringify({ ...status, receiptPath: receiptResult.path }, null, 2))
} catch (error) {
  const message = error instanceof Error ? error.message : String(error)
  const receiptResult = writeReceipt({
    ...receiptBase,
    status: 'blocked',
    blockedReason: message,
    missionControlSummary: `Live builder blocked before Codex completed: ${message}`,
  }, context)

  updateClaim(claimPath, {
    status: 'blocked',
    receiptPath: receiptResult.path,
    blockedReason: message,
  })

  const status = buildStatus({
    mode,
    status: 'blocked',
    reason: 'live_execution_error',
    activeLane,
    branch: claim.branch,
    task,
    intake: intakeSummary,
    errors: [{ message }],
    nextAction: 'Review the claim and receipt before retrying.',
  })
  writeRunnerStatus(status, context)
  console.log(JSON.stringify({ ...status, receiptPath: receiptResult.path }, null, 2))
}
