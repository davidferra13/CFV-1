#!/usr/bin/env node
import path from 'node:path'
import {
  nowStamp,
  parseArgs,
  readStdin,
  reportsRoot,
  slugify,
  writeJson,
} from './agent-skill-utils.mjs'

const validDeltas = new Set(['none', 'patch', 'new-skill', 'heal'])

const args = parseArgs()
const goal = args.goal || args._.join(' ')
const primary = args.primary || args.skill || null
const sidecars = String(args.sidecars || '')
  .split(',')
  .map((item) => item.trim())
  .filter(Boolean)
const skillDelta = args.delta || 'none'
const notes = (args.notes || readStdin()).trim()

if (!goal) {
  console.error('Missing --goal')
  process.exit(1)
}
if (!primary) {
  console.error('Missing --primary')
  process.exit(1)
}
if (!validDeltas.has(skillDelta)) {
  console.error(`Invalid --delta. Use one of: ${[...validDeltas].join(', ')}`)
  process.exit(1)
}

const report = {
  created_at: new Date().toISOString(),
  goal,
  primary_skill: primary,
  sidecar_skills: sidecars,
  skill_delta: skillDelta,
  durable_behavior_seen: args['durable-behavior'] || null,
  skill_gap_seen: args['skill-gap'] || null,
  validation: {
    skill_validator: args['skill-validator'] || null,
    trigger_tests: args['trigger-tests'] || null,
    compliance: args.compliance || null,
    other: args.validation || null,
  },
  commit: args.commit || null,
  pushed: Boolean(args.pushed),
  notes,
}

const file = path.join(
  reportsRoot,
  'skill-closeouts',
  `${nowStamp()}-${slugify(primary)}-${slugify(goal)}.json`,
)
writeJson(file, report)
console.log(`Wrote skill closeout report: ${file.replace(/\\/g, '/')}`)

