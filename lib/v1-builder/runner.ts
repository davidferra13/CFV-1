import { spawn } from 'node:child_process'
import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, join, relative } from 'node:path'
import { appendEscalation } from './escalations'
import { writeClaim } from './claims'
import { writeReceipt } from './receipts'
import { readRunnerStatus, writeRunnerStatus } from './runner-state'
import { ensureBuilderState, resolveBuilderPath, toFileStamp } from './store'
import { selectNextTask } from './select-next'
import type { ClaimRecord, QueueRecord, ReceiptRecord, RunnerStatus, ValidationRecord } from './types'

export type ExecutorResult = {
  ok: boolean
  command: string
  exitCode: number | null
  stdout: string
  stderr: string
}

export type RunOnceOptions = {
  root?: string
  activeLane?: string
  agent?: string
  runnerId?: string
  now?: Date
  executorCommand?: string
  executorArgs?: string[]
  executorTimeoutMs?: number
  skipGitCheck?: boolean
  commitRecords?: boolean
}

export type RunOnceResult = {
  ok: boolean
  status: RunnerStatus['status']
  task: QueueRecord | null
  claimPath: string | null
  packetPath: string | null
  receiptPath: string | null
  executor: ExecutorResult | null
  error: string | null
}

function stampId(prefix: string, now: Date) {
  return `${prefix}-${toFileStamp(now)}`
}

function git(args: string[], root: string) {
  return new Promise<{ ok: boolean; stdout: string; stderr: string; code: number | null }>((resolve) => {
    const child = spawn('git', args, { cwd: root, windowsHide: true })
    let stdout = ''
    let stderr = ''
    child.stdout.on('data', (chunk) => { stdout += chunk.toString() })
    child.stderr.on('data', (chunk) => { stderr += chunk.toString() })
    child.on('error', (error) => resolve({ ok: false, stdout, stderr: error.message, code: null }))
    child.on('close', (code) => resolve({ ok: code === 0, stdout, stderr, code }))
  })
}

async function gitText(args: string[], root: string) {
  const result = await git(args, root)
  return result.ok ? result.stdout.trim() : ''
}

async function isGitRepo(root: string) {
  return (await gitText(['rev-parse', '--is-inside-work-tree'], root)) === 'true'
}

async function assertCleanWorktree(root: string) {
  const status = await gitText(['status', '--porcelain'], root)
  if (status) {
    throw new Error(`Autonomous runner refuses to start on a dirty worktree: ${status.split(/\r?\n/).slice(0, 5).join('; ')}`)
  }
}

async function commitAndPushRecords(root: string, taskId: string) {
  await git(['add', 'system/v1-builder'], root)
  const status = await gitText(['status', '--porcelain', '--', 'system/v1-builder'], root)
  if (!status) return { committed: false, pushed: false }

  const commit = await git(['commit', '--no-verify', '-m', `chore(v1-builder): record autonomous run ${taskId}`], root)
  if (!commit.ok) return { committed: false, pushed: false, error: commit.stderr || commit.stdout }

  const push = await git(['push', '--no-verify'], root)
  return { committed: true, pushed: push.ok, error: push.ok ? null : push.stderr || push.stdout }
}

function buildPacket(task: QueueRecord, claim: ClaimRecord) {
  return [
    '# V1 Builder Autonomous Work Packet',
    '',
    `Task ID: ${task.id}`,
    `Title: ${task.title}`,
    `Classification: ${task.classification}`,
    `Active lane: ${task.activeLane || 'none'}`,
    `Claim branch: ${claim.branch}`,
    '',
    '## Reason',
    task.reason,
    '',
    '## Required Behavior',
    '- Read AGENTS.md and obey ChefFlow hard stops.',
    '- Build only this approved V1 task.',
    '- Do not create V2 work or unrelated dashboard work.',
    '- Validate the change with the narrowest meaningful tests.',
    '- Commit and push completed code changes on the current feature branch.',
    '- If blocked by Founder Authority, credentials, destructive DB work, production deploy, or unclear V1 scope, write an escalation and stop.',
    '',
    '## Queue Record',
    '```json',
    JSON.stringify(task, null, 2),
    '```',
    '',
  ].join('\n')
}

function defaultExecutor(root: string, prompt: string) {
  return {
    command: 'codex',
    args: [
      'exec',
      '--cd',
      root,
      '--sandbox',
      'danger-full-access',
      '--ask-for-approval',
      'never',
      prompt,
    ],
  }
}

async function runExecutor(options: {
  root: string
  prompt: string
  command?: string
  args?: string[]
  timeoutMs: number
}): Promise<ExecutorResult> {
  const configured = options.command
    ? { command: options.command, args: options.args ?? [] }
    : defaultExecutor(options.root, options.prompt)
  const commandLabel = [configured.command, ...configured.args].join(' ')

  return new Promise((resolve) => {
    const child = spawn(configured.command, configured.args, { cwd: options.root, windowsHide: true })
    let stdout = ''
    let stderr = ''
    const timer = setTimeout(() => {
      child.kill()
      stderr += `\nExecutor timed out after ${options.timeoutMs}ms`
    }, options.timeoutMs)

    child.stdout.on('data', (chunk) => { stdout += chunk.toString() })
    child.stderr.on('data', (chunk) => { stderr += chunk.toString() })
    child.on('error', (error) => {
      clearTimeout(timer)
      resolve({ ok: false, command: commandLabel, exitCode: null, stdout, stderr: error.message })
    })
    child.on('close', (code) => {
      clearTimeout(timer)
      resolve({ ok: code === 0, command: commandLabel, exitCode: code, stdout, stderr })
    })
  })
}

async function writeBuildPacket(root: string, task: QueueRecord, claim: ClaimRecord, now: Date) {
  const path = resolveBuilderPath(join('build-packets', `${toFileStamp(now)}-${task.id}.md`), root)
  await mkdir(dirname(path), { recursive: true })
  await writeFile(path, buildPacket(task, claim), 'utf-8')
  return path
}

function validationFromExecutor(executor: ExecutorResult): ValidationRecord {
  return {
    command: executor.command,
    ok: executor.ok,
    summary: executor.ok
      ? `Executor completed with exit code ${executor.exitCode}`
      : `Executor failed${executor.exitCode == null ? '' : ` with exit code ${executor.exitCode}`}`,
  }
}

async function appendRunnerEscalation(root: string, task: QueueRecord, question: string, recommendedDefault: string) {
  return appendEscalation({
    id: stampId('esc-runner', new Date()),
    createdAt: new Date().toISOString(),
    taskId: task.id,
    question,
    whyCodexCannotDecide: 'The autonomous runner hit a condition that cannot be safely resolved without Founder Authority or a working executor.',
    recommendedDefault,
    blocks: 'build',
    status: 'open',
    answer: null,
  }, root)
}

async function finishClaim(root: string, claim: ClaimRecord, status: ClaimRecord['status'], now: Date) {
  return writeClaim({
    ...claim,
    status,
    claimedAt: now.toISOString(),
    expiresAt: now.toISOString(),
  }, root, now)
}

function receiptStatus(executor: ExecutorResult, dirtyAfter: string) {
  if (!executor.ok) return 'failed' as const
  if (dirtyAfter) return 'partial' as const
  return 'validated' as const
}

export async function runOnce(options: RunOnceOptions = {}): Promise<RunOnceResult> {
  const root = options.root ?? process.cwd()
  const now = options.now ?? new Date()
  const runnerId = options.runnerId ?? 'v1-builder-local'
  const executorTimeoutMs = options.executorTimeoutMs ?? 60 * 60 * 1000
  await ensureBuilderState(root)

  const previousState = await readRunnerStatus(root, now)
  const baseState: RunnerStatus = {
    ...previousState,
    status: 'running',
    updatedAt: now.toISOString(),
    runnerId,
    pid: process.pid,
    intervalSeconds: null,
    lastStartedAt: now.toISOString(),
    lastFinishedAt: null,
    lastError: null,
    executorCommand: options.executorCommand ?? 'codex exec',
  }
  await writeRunnerStatus(baseState, root)

  try {
    if (!options.skipGitCheck) await assertCleanWorktree(root)

    const selected = await selectNextTask({ root, activeLane: options.activeLane, now })
    if (!selected.ok) {
      const waiting: RunnerStatus = {
        ...baseState,
        status: selected.staleClaims.length > 0 ? 'blocked' : 'waiting',
        updatedAt: new Date().toISOString(),
        currentTaskId: null,
        lastFinishedAt: new Date().toISOString(),
        lastError: selected.errors[0] ?? selected.skipped[0] ?? null,
      }
      await writeRunnerStatus(waiting, root)
      return { ok: selected.staleClaims.length === 0, status: waiting.status, task: null, claimPath: null, packetPath: null, receiptPath: null, executor: null, error: waiting.lastError }
    }

    const task = selected.task
    const claim: ClaimRecord = {
      taskId: task.id,
      claimedAt: now.toISOString(),
      branch: await gitText(['branch', '--show-current'], root) || `feature/v1-builder-${task.id}`,
      agent: options.agent ?? 'codex-autonomous-runner',
      status: 'claimed',
      expiresAt: new Date(now.getTime() + executorTimeoutMs + 15 * 60 * 1000).toISOString(),
    }
    const claimPath = await writeClaim(claim, root, now)
    const packetPath = await writeBuildPacket(root, task, claim, now)
    await writeRunnerStatus({
      ...baseState,
      updatedAt: new Date().toISOString(),
      currentTaskId: task.id,
      lastTaskId: task.id,
      lastPacketPath: relative(root, packetPath).replace(/\\/g, '/'),
    }, root)

    const gitRepo = await isGitRepo(root)
    const beforeHead = gitRepo ? await gitText(['rev-parse', 'HEAD'], root) : ''
    const prompt = `${buildPacket(task, claim)}\n\nBuild packet path: ${relative(root, packetPath).replace(/\\/g, '/')}\n`
    const executor = await runExecutor({
      root,
      prompt,
      command: options.executorCommand,
      args: options.executorArgs,
      timeoutMs: executorTimeoutMs,
    })
    const afterHead = gitRepo ? await gitText(['rev-parse', 'HEAD'], root) : ''
    const dirtyAfter = gitRepo ? await gitText(['status', '--porcelain'], root) : ''
    const finishedAt = new Date()
    let status = receiptStatus(executor, dirtyAfter)
    if (status === 'validated' && gitRepo && beforeHead === afterHead) {
      status = 'partial'
    }
    if (!executor.ok) {
      await appendRunnerEscalation(root, task, 'Autonomous executor failed before completing this V1 task.', 'Leave the task blocked and inspect the executor log.')
    } else if (dirtyAfter) {
      await appendRunnerEscalation(root, task, 'Autonomous executor returned success but left uncommitted changes.', 'Do not continue the queue until the dirty worktree is reviewed.')
    } else if (status === 'partial') {
      await appendRunnerEscalation(root, task, 'Autonomous executor returned success without creating a commit.', 'Treat the task as incomplete until a committed change proves the build happened.')
    }
    const aheadCount = gitRepo ? await gitText(['rev-list', '--count', '@{u}..HEAD'], root) : ''

    await finishClaim(root, claim, status === 'validated' ? 'validated' : 'blocked', finishedAt)
    const receipt: ReceiptRecord = {
      taskId: task.id,
      branch: claim.branch,
      status,
      startedAt: now.toISOString(),
      finishedAt: finishedAt.toISOString(),
      touchedFiles: [],
      validations: [validationFromExecutor(executor)],
      commit: beforeHead && afterHead && beforeHead !== afterHead ? afterHead : null,
      pushed: status === 'validated' && beforeHead !== afterHead && aheadCount === '0',
      blockedReason: status === 'validated' ? null : (executor.stderr || dirtyAfter || 'Autonomous runner did not produce a committed clean build').slice(0, 500),
      missionControlSummary: status === 'validated'
        ? `Autonomous runner completed ${task.id}`
        : `Autonomous runner stopped on ${task.id}`,
    }
    const receiptPath = await writeReceipt(receipt, root, finishedAt)

    await writeRunnerStatus({
      ...baseState,
      status: status === 'validated' ? 'idle' : 'blocked',
      updatedAt: new Date().toISOString(),
      currentTaskId: null,
      lastTaskId: task.id,
      lastFinishedAt: finishedAt.toISOString(),
      lastReceiptPath: relative(root, receiptPath).replace(/\\/g, '/'),
      lastPacketPath: relative(root, packetPath).replace(/\\/g, '/'),
      lastError: status === 'validated' ? null : receipt.blockedReason,
    }, root)

    if (options.commitRecords) {
      await commitAndPushRecords(root, task.id)
    }

    return { ok: status === 'validated', status: status === 'validated' ? 'idle' : 'blocked', task, claimPath, packetPath, receiptPath, executor, error: receipt.blockedReason }
  } catch (err) {
    const failed: RunnerStatus = {
      ...baseState,
      status: 'failed',
      updatedAt: new Date().toISOString(),
      currentTaskId: null,
      lastFinishedAt: new Date().toISOString(),
      lastError: (err as Error).message,
    }
    await writeRunnerStatus(failed, root)
    return { ok: false, status: 'failed', task: null, claimPath: null, packetPath: null, receiptPath: null, executor: null, error: failed.lastError }
  }
}
