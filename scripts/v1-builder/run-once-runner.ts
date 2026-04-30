import { parseArgs, printResult, toBoolean } from './cli-utils'

const runnerModule = await import('../../lib/v1-builder/runner')
const runnerRuntime = runnerModule as typeof runnerModule & { default?: typeof runnerModule }
const { runOnce } = runnerRuntime.default ?? runnerRuntime

const args = parseArgs()
const root = typeof args.root === 'string' ? args.root : process.cwd()
const executorCommand = typeof args.executor === 'string' ? args.executor : undefined
const executorArgs = typeof args.executorArgs === 'string'
  ? args.executorArgs.split(' ').filter(Boolean)
  : undefined
const timeoutMs = typeof args.timeoutMs === 'string' ? Number.parseInt(args.timeoutMs, 10) : undefined

const result = await runOnce({
  root,
  activeLane: typeof args.lane === 'string' ? args.lane : undefined,
  agent: typeof args.agent === 'string' ? args.agent : undefined,
  runnerId: typeof args.runnerId === 'string' ? args.runnerId : undefined,
  executorCommand,
  executorArgs,
  executorTimeoutMs: Number.isFinite(timeoutMs) ? timeoutMs : undefined,
  skipGitCheck: toBoolean(args.skipGitCheck),
  commitRecords: toBoolean(args.commitRecords),
})

printResult(result)
process.exit(result.ok ? 0 : 1)
