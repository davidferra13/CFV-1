#!/usr/bin/env node
import { execFileSync } from 'node:child_process'
import {
  parseArgs,
  readStdin,
} from './agent-skill-utils.mjs'

const args = parseArgs()
const prompt = String(args.prompt || args._.join(' ') || readStdin()).trim()

function run(label, commandArgs, options = {}) {
  console.log(`\n[${label}]`)
  try {
    const output = execFileSync('node', commandArgs, {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
      ...options,
    })
    if (output.trim()) console.log(output.trim())
    return { label, ok: true }
  } catch (error) {
    const stdout = error.stdout ? String(error.stdout).trim() : ''
    const stderr = error.stderr ? String(error.stderr).trim() : ''
    if (stdout) console.log(stdout)
    if (stderr) console.error(stderr)
    return { label, ok: false, error: error.message }
  }
}

if (!prompt) {
  console.error('Missing prompt. Pass --prompt "..." or pipe the user request.')
  process.exit(1)
}

const results = []
results.push(run('router', ['devtools/skill-router.mjs', '--prompt', prompt, '--write']))
results.push(run('skill-validator', ['devtools/skill-validator.mjs']))
results.push(run('trigger-tests', ['devtools/skill-trigger-tests.mjs']))
results.push(run('coverage-map', ['devtools/skill-coverage-map.mjs', '--stdout']))
results.push(run('dependency-graph', ['devtools/skill-dependency-graph.mjs', '--stdout']))
results.push(run('maturity-report', ['devtools/skill-maturity-report.mjs', '--stdout']))

if (args.owned && args.owned !== true) {
  results.push(
    run('closeout-gate', [
      'devtools/agent-closeout-gate.mjs',
      '--owned',
      String(args.owned),
      '--skill-validator',
      'node devtools/skill-validator.mjs',
    ]),
  )
} else {
  console.log('\n[closeout-gate]')
  console.log('Skipped because --owned was not supplied.')
}

const failed = results.filter((result) => !result.ok)
console.log(`\nPreflight complete: ${results.length - failed.length}/${results.length} checks passed.`)
process.exit(failed.length ? 1 : 0)
