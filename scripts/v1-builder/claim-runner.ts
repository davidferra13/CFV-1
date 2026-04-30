import { execSync } from 'node:child_process'
import { parseArgs, printResult } from './cli-utils'

const storeModule = await import('../../lib/v1-builder/store')
const typesModule = await import('../../lib/v1-builder/types')
const selectModule = await import('../../lib/v1-builder/select-next')
const claimsModule = await import('../../lib/v1-builder/claims')
const storeRuntime = storeModule as typeof storeModule & { default?: typeof storeModule }
const typesRuntime = typesModule as typeof typesModule & { default?: typeof typesModule }
const selectRuntime = selectModule as typeof selectModule & { default?: typeof selectModule }
const claimsRuntime = claimsModule as typeof claimsModule & { default?: typeof claimsModule }
const { ensureBuilderState, readJsonl, resolveBuilderPath } = storeRuntime.default ?? storeRuntime
const { queueRecordSchema } = typesRuntime.default ?? typesRuntime
const { selectNextTask } = selectRuntime.default ?? selectRuntime
const { getClaimState, writeClaim } = claimsRuntime.default ?? claimsRuntime

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48) || 'task'
}

function currentBranch() {
  try {
    return execSync('git branch --show-current', { encoding: 'utf-8' }).trim()
  } catch {
    return 'unknown'
  }
}

const args = parseArgs()
const root = typeof args.root === 'string' ? args.root : process.cwd()
await ensureBuilderState(root)

const claimState = await getClaimState(root)
if (!claimState.ok || claimState.activeClaim || claimState.staleClaims.length > 0) {
  printResult({
    ok: false,
    error: claimState.errors[0] ?? 'Existing fresh or stale claim blocks selection',
    activeClaim: claimState.activeClaim,
    staleClaims: claimState.staleClaims,
  })
  process.exit(1)
}

let task = null
if (typeof args.task === 'string') {
  const queue = await readJsonl(resolveBuilderPath('approved-queue.jsonl', root), queueRecordSchema)
  if (!queue.ok) {
    printResult({ ok: false, errors: queue.errors })
    process.exit(1)
  }
  task = queue.records.find((record) => record.id === args.task) ?? null
  if (!task) {
    printResult({ ok: false, error: `Task not found: ${args.task}` })
    process.exit(1)
  }
} else {
  const selected = await selectNextTask({ root, activeLane: typeof args.lane === 'string' ? args.lane : undefined })
  if (!selected.ok) {
    printResult(selected)
    process.exit(1)
  }
  task = selected.task
}

const now = new Date()
const expiresAt = new Date(now.getTime() + 2 * 60 * 60 * 1000)
const claim = {
  taskId: task.id,
  claimedAt: now.toISOString(),
  branch: typeof args.branch === 'string' ? args.branch : currentBranch() || `feature/v1-builder-${slugify(task.title)}`,
  agent: typeof args.agent === 'string' ? args.agent : 'codex',
  status: 'claimed' as const,
  expiresAt: expiresAt.toISOString(),
}
const path = await writeClaim(claim, root, now)
printResult({ ok: true, path, claim, task })
