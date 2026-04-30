import { parseArgs, printResult } from './cli-utils'

const storeModule = await import('../../lib/v1-builder/store')
const selectModule = await import('../../lib/v1-builder/select-next')
const storeRuntime = storeModule as typeof storeModule & { default?: typeof storeModule }
const selectRuntime = selectModule as typeof selectModule & { default?: typeof selectModule }
const { ensureBuilderState } = storeRuntime.default ?? storeRuntime
const { selectNextTask } = selectRuntime.default ?? selectRuntime

const args = parseArgs()
const root = typeof args.root === 'string' ? args.root : process.cwd()
await ensureBuilderState(root)
const result = await selectNextTask({
  root,
  activeLane: typeof args.lane === 'string' ? args.lane : undefined,
})

printResult(result)
process.exitCode = result.ok ? 0 : 1
