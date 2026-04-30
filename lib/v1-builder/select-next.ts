import { queueRecordSchema, type ClaimRecord, type QueueRecord } from './types'
import { getClaimState } from './claims'
import { readReceipts } from './receipts'
import { readJsonl, resolveBuilderPath } from './store'

export type SelectionResult =
  | { ok: true; task: QueueRecord; skipped: string[]; activeClaim: null; staleClaims: [] }
  | { ok: false; task: null; skipped: string[]; activeClaim: ClaimRecord | null; staleClaims: ClaimRecord[]; errors: string[] }

export function isBuildableTask(task: QueueRecord, activeLane = 'pricing-reliability') {
  if (task.status !== 'queued') return false
  if (task.classification === 'approved_v1_blocker') return true
  return task.classification === 'approved_v1_support' && task.activeLane === activeLane
}

export async function selectNextTask(options: { root?: string; activeLane?: string; now?: Date } = {}): Promise<SelectionResult> {
  const root = options.root ?? process.cwd()
  const activeLane = options.activeLane ?? 'pricing-reliability'
  const now = options.now ?? new Date()
  const claimState = await getClaimState(root, now)
  const skipped: string[] = []

  if (!claimState.ok) {
    return {
      ok: false,
      task: null,
      skipped,
      activeClaim: claimState.activeClaim,
      staleClaims: claimState.staleClaims,
      errors: claimState.errors,
    }
  }

  if (claimState.activeClaim) {
    return {
      ok: false,
      task: null,
      skipped: [`fresh claim blocks selection: ${claimState.activeClaim.taskId}`],
      activeClaim: claimState.activeClaim,
      staleClaims: [],
      errors: [],
    }
  }

  if (claimState.staleClaims.length > 0) {
    return {
      ok: false,
      task: null,
      skipped: claimState.staleClaims.map((claim) => `stale claim requires Founder Authority review: ${claim.taskId}`),
      activeClaim: null,
      staleClaims: claimState.staleClaims,
      errors: [],
    }
  }

  const queue = await readJsonl(resolveBuilderPath('approved-queue.jsonl', root), queueRecordSchema)
  if (!queue.ok) {
    return { ok: false, task: null, skipped, activeClaim: null, staleClaims: [], errors: queue.errors }
  }
  const receipts = await readReceipts(root)
  if (!receipts.ok) {
    return { ok: false, task: null, skipped, activeClaim: null, staleClaims: [], errors: receipts.errors }
  }
  const completedTaskIds = new Set(receipts.records.map((receipt) => receipt.taskId))

  const ordered = [...queue.records].sort((a, b) => {
    if (a.classification !== b.classification) {
      if (a.classification === 'approved_v1_blocker') return -1
      if (b.classification === 'approved_v1_blocker') return 1
    }
    return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  })

  for (const task of ordered) {
    if (completedTaskIds.has(task.id)) {
      skipped.push(`${task.id}: receipt already recorded`)
      continue
    }
    if (isBuildableTask(task, activeLane)) {
      return { ok: true, task, skipped, activeClaim: null, staleClaims: [] }
    }
    skipped.push(`${task.id}: ${task.classification} with status ${task.status} is not buildable`)
  }

  return { ok: false, task: null, skipped, activeClaim: null, staleClaims: [], errors: ['No approved V1 tasks are eligible'] }
}
