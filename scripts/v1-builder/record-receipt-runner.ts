import { execSync } from 'node:child_process'
import { parseArgs, requireArg, printResult, toBoolean } from './cli-utils'

const storeModule = await import('../../lib/v1-builder/store')
const receiptsModule = await import('../../lib/v1-builder/receipts')
const storeRuntime = storeModule as typeof storeModule & { default?: typeof storeModule }
const receiptsRuntime = receiptsModule as typeof receiptsModule & { default?: typeof receiptsModule }
const { ensureBuilderState } = storeRuntime.default ?? storeRuntime
const { writeReceipt } = receiptsRuntime.default ?? receiptsRuntime

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

const taskId = requireArg(args, 'task')
const now = new Date()
const receiptStatuses = ['validated', 'blocked', 'failed', 'push_failed', 'partial'] as const
const status = receiptStatuses.find((item) => item === args.status) ?? 'validated'
const receipt = {
  taskId,
  branch: typeof args.branch === 'string' ? args.branch : currentBranch(),
  status,
  startedAt: typeof args.startedAt === 'string' ? args.startedAt : now.toISOString(),
  finishedAt: typeof args.finishedAt === 'string' ? args.finishedAt : now.toISOString(),
  touchedFiles: typeof args.touchedFiles === 'string' ? args.touchedFiles.split(',').map((item) => item.trim()).filter(Boolean) : [],
  validations: typeof args.validation === 'string'
    ? [{ command: args.validation, ok: true, summary: args.validation }]
    : [],
  commit: typeof args.commit === 'string' ? args.commit : null,
  pushed: toBoolean(args.pushed),
  blockedReason: typeof args.blockedReason === 'string' ? args.blockedReason : null,
  missionControlSummary: typeof args.summary === 'string' ? args.summary : `Receipt recorded for ${taskId}`,
}

const path = await writeReceipt(receipt, root, now)
printResult({ ok: true, path, receipt })
