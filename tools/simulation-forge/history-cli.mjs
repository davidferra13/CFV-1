#!/usr/bin/env node
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { execFileSync } from 'node:child_process'
import { compileHistory, importGmailThreads, replayHistory, historyScenario, historyAdapter, branchHistory } from './history.mjs'
import { runScenario } from './core.mjs'

const args = process.argv.slice(2)
const command = args.shift()
const opt = name => { const index = args.indexOf(name); return index < 0 ? null : args[index + 1] }
const inputPath = opt('--input'), outputPath = opt('--output')
if (!inputPath || !outputPath || !['import', 'replay', 'branch'].includes(command)) throw Error('Usage: history-cli.mjs import|replay|branch --input <private JSON> --output <private JSON>')
const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
const output = resolve(outputPath)
if (output === root || output.startsWith(root + '/') || output.startsWith(root + '\\')) throw Error('Historical client output must be outside the Git worktree')
if (resolve(inputPath) === output) throw Error('Input and output must be separate files')
const source = JSON.parse(readFileSync(inputPath, 'utf8').replace(/^\uFEFF/, ''))
let result
if (command === 'import') {
  result = source.cases.map(c => c.threads ? importGmailThreads(c.threads, c.options) : compileHistory(c))
} else if (command === 'branch') {
  result = branchHistory(source.case, source.sourceId, source.replacements)
} else {
  const cases = Array.isArray(source) ? source : [source]
  const commit = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim()
  result = { generatedAt: new Date().toISOString(), commit, cases: [] }
  for (const c of cases) {
    const record = await replayHistory(c)
    const forge = await runScenario(historyScenario(c), historyAdapter(), { commit })
    if (forge.violations.length) throw Error('History Forge invariant failed: ' + c.id)
    result.cases.push({ ...record, forgeRunId: forge.runId, forgeScores: forge.scores,
      clockNote: 'Historical event clocks use source timestamps. Forge trajectory wrapper clocks are engine bookkeeping.' })
  }
}
mkdirSync(dirname(output), { recursive: true })
writeFileSync(output, JSON.stringify(result, null, 2) + '\n', { flag: 'wx', mode: 0o600 })
console.log(JSON.stringify({ command, saved: output, cases: Array.isArray(result) ? result.length : result.cases?.length ?? 1,
  scope: 'offline_record_replay', productBehaviorVerified: false, modelTrainingPerformed: false }))
