#!/usr/bin/env node
import path from 'node:path'
import {
  ensureDir,
  nowStamp,
  parseArgs,
  relative,
  reportsRoot,
  writeJson,
} from './agent-skill-utils.mjs'
import { findNearDuplicateClusters } from './context-continuity-lib.mjs'

const args = parseArgs()
const report = findNearDuplicateClusters({
  threshold: args.threshold ? Number(args.threshold) : 0.42,
  maxFiles: args.max ? Number(args.max) : 500,
})

if (args.stdout || args.json) {
  console.log(JSON.stringify(report, null, 2))
} else {
  const file = path.join(
    reportsRoot,
    'context-near-duplicates',
    `${nowStamp()}-context-near-duplicates.json`
  )
  ensureDir(path.dirname(file))
  writeJson(file, report)
  console.log(`Wrote near-duplicate report: ${relative(file)}`)
  console.log(`Pairs: ${report.pair_count}`)
}
