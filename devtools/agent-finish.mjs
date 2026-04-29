#!/usr/bin/env node
import { execFileSync } from 'node:child_process'
import {
  parseArgs,
  splitCsv,
} from './agent-skill-utils.mjs'

function usage() {
  console.log(`Usage:
  node devtools/agent-finish.mjs --record path --owned a,b --used skill,skill --validations check,check [--commit sha]

Runs closeout gate, missed-skill detection, flight record finish, outcome scoring, repair queue, digest, and dashboard generation.`)
}

function runNode(label, args, allowFailure = false) {
  try {
    const output = execFileSync('node', args, { encoding: 'utf8' })
    return { label, ok: true, output: output.trim() }
  } catch (error) {
    if (!allowFailure) throw error
    return {
      label,
      ok: false,
      output: [error.stdout, error.stderr].filter(Boolean).map(String).join('\n').trim(),
    }
  }
}

try {
  const args = parseArgs()
  if (args.help) {
    usage()
    process.exit(0)
  }
  if (!args.record || args.record === true) throw new Error('Missing --record.')
  if (!args.owned || args.owned === true) throw new Error('Missing --owned.')
  const used = splitCsv(args.used)
  const validations = splitCsv(args.validations || args.validation)
  if (!used.length) throw new Error('Missing --used evidence.')
  if (!validations.length) throw new Error('Missing --validations evidence.')
  const owned = String(args.owned)
  const closeoutArgs = [
    'devtools/agent-closeout-gate.mjs',
    '--owned',
    owned,
    '--skill-validator-evidence',
    validations.find((item) => item.includes('skill-validator')) || 'provided-by-agent-finish',
  ]
  if (args.commit && args.commit !== true) {
    closeoutArgs.push('--commit', String(args.commit))
    if (args['require-pushed'] || args.pushed) closeoutArgs.push('--require-pushed')
  }
  const closeout = runNode('closeout-gate', closeoutArgs, true)
  const missed = runNode(
    'missed-skill-detector',
    [
      'devtools/missed-skill-detector.mjs',
      '--record',
      String(args.record),
      '--used',
      used.join(','),
      '--write-learning',
    ],
    true,
  )
  const flight = runNode('flight-recorder', [
    'devtools/agent-flight-recorder.mjs',
    'finish',
    '--record',
    String(args.record),
    '--owned',
    owned,
    '--used',
    used.join(','),
    '--validations',
    validations.join(','),
    ...(args.commit && args.commit !== true ? ['--commit', String(args.commit)] : []),
  ])
  const outcome = runNode(
    'outcome-scorer',
    [
      'devtools/skill-outcome-scorer.mjs',
      '--record',
      String(args.record),
      '--owned',
      owned,
      '--update-stats',
      '--auto-maturity',
      ...(args['require-pushed'] || args.pushed ? ['--require-pushed'] : []),
    ],
    true,
  )
  const repairQueue = runNode('skill-repair-queue', ['devtools/skill-repair-queue.mjs'], true)
  const digest = runNode('agent-session-digest', ['devtools/agent-session-digest.mjs'], true)
  const dashboard = runNode('skill-dashboard', ['devtools/skill-dashboard.mjs'], true)
  const result = {
    ok: closeout.ok && missed.ok && flight.ok && outcome.ok,
    closeout: {
      ok: closeout.ok,
      output: closeout.output ? JSON.parse(closeout.output) : null,
    },
    missed_skill_detector: {
      ok: missed.ok,
      output: missed.output ? JSON.parse(missed.output) : null,
    },
    flight_record: JSON.parse(flight.output),
    outcome: {
      ok: outcome.ok,
      output: outcome.output ? JSON.parse(outcome.output) : null,
    },
    repair_queue: repairQueue.output,
    session_digest: digest.output,
    dashboard: dashboard.output,
  }
  console.log(JSON.stringify(result, null, 2))
  process.exit(result.ok ? 0 : 1)
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error))
  usage()
  process.exit(1)
}
