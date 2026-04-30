import { parseArgs, printResult, toBoolean } from './cli-utils'

const runnerModule = await import('../../lib/v1-builder/runner')
const stateModule = await import('../../lib/v1-builder/runner-state')
const runnerRuntime = runnerModule as typeof runnerModule & { default?: typeof runnerModule }
const stateRuntime = stateModule as typeof stateModule & { default?: typeof stateModule }
const { runOnce } = runnerRuntime.default ?? runnerRuntime
const { readRunnerStatus, writeRunnerStatus } = stateRuntime.default ?? stateRuntime

const args = parseArgs()
const root = typeof args.root === 'string' ? args.root : process.cwd()
const intervalSeconds = typeof args.interval === 'string' ? Number.parseInt(args.interval, 10) : 300
const maxRuns = typeof args.maxRuns === 'string' ? Number.parseInt(args.maxRuns, 10) : null
const executorCommand = typeof args.executor === 'string' ? args.executor : undefined
const executorArgs = typeof args.executorArgs === 'string'
  ? args.executorArgs.split(' ').filter(Boolean)
  : undefined
const timeoutMs = typeof args.timeoutMs === 'string' ? Number.parseInt(args.timeoutMs, 10) : undefined
const runnerId = typeof args.runnerId === 'string' ? args.runnerId : 'v1-builder-local-loop'

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

let runs = 0
let lastResult: unknown = null

while (maxRuns == null || runs < maxRuns) {
  runs += 1
  lastResult = await runOnce({
    root,
    activeLane: typeof args.lane === 'string' ? args.lane : undefined,
    agent: typeof args.agent === 'string' ? args.agent : undefined,
    runnerId,
    executorCommand,
    executorArgs,
    executorTimeoutMs: Number.isFinite(timeoutMs) ? timeoutMs : undefined,
    skipGitCheck: toBoolean(args.skipGitCheck),
    commitRecords: toBoolean(args.commitRecords),
  })

  const status = await readRunnerStatus(root)
  await writeRunnerStatus({
    ...status,
    runnerId,
    pid: process.pid,
    intervalSeconds,
    updatedAt: new Date().toISOString(),
  }, root)

  printResult({ run: runs, result: lastResult })
  if ((lastResult as { status?: string }).status === 'blocked' || (lastResult as { status?: string }).status === 'failed') break
  if (maxRuns != null && runs >= maxRuns) break
  await wait(intervalSeconds * 1000)
}

printResult({ ok: true, runs, lastResult })
