import { parseArgs, requireArg, printResult } from './cli-utils'

const storeModule = await import('../../lib/v1-builder/store')
const escalationsModule = await import('../../lib/v1-builder/escalations')
const storeRuntime = storeModule as typeof storeModule & { default?: typeof storeModule }
const escalationsRuntime = escalationsModule as typeof escalationsModule & { default?: typeof escalationsModule }
const { ensureBuilderState } = storeRuntime.default ?? storeRuntime
const { appendEscalation } = escalationsRuntime.default ?? escalationsRuntime

const args = parseArgs()
const root = typeof args.root === 'string' ? args.root : process.cwd()
await ensureBuilderState(root)

const now = new Date()
const id = `esc-${now.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z')}`
const escalationBlocks = ['build', 'validation', 'shipping', 'scope', 'none'] as const
const blocks = escalationBlocks.find((item) => item === args.blocks) ?? 'build'
const escalation = {
  id,
  createdAt: now.toISOString(),
  taskId: typeof args.task === 'string' ? args.task : null,
  question: requireArg(args, 'question'),
  whyCodexCannotDecide: typeof args.why === 'string' ? args.why : 'Requires Founder Authority.',
  recommendedDefault: requireArg(args, 'recommended-default'),
  blocks,
  status: 'open' as const,
  answer: null,
}

const path = await appendEscalation(escalation, root)
printResult({ ok: true, path, escalation })
