import { printResult } from './cli-utils'

const storeModule = await import('../../lib/v1-builder/store')
const summaryModule = await import('../../lib/v1-builder/cockpit-summary')
const storeRuntime = storeModule as typeof storeModule & { default?: typeof storeModule }
const summaryRuntime = summaryModule as typeof summaryModule & { default?: typeof summaryModule }
const { ensureBuilderState } = storeRuntime.default ?? storeRuntime
const { buildCockpitSummary } = summaryRuntime.default ?? summaryRuntime

const rootArgIndex = process.argv.indexOf('--root')
const root = rootArgIndex >= 0 && process.argv[rootArgIndex + 1] ? process.argv[rootArgIndex + 1] : process.cwd()
await ensureBuilderState(root)
const summary = await buildCockpitSummary(root)
printResult(summary)
process.exitCode = summary.ok ? 0 : 1
