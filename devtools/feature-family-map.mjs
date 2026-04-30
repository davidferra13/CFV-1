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
import { buildFeatureFamilyMap } from './context-continuity-lib.mjs'

const args = parseArgs()
const report = buildFeatureFamilyMap()

if (args.stdout || args.json) {
  console.log(JSON.stringify(report, null, 2))
} else {
  const file = path.join(reportsRoot, 'feature-family-map', `${nowStamp()}-feature-family-map.json`)
  ensureDir(path.dirname(file))
  writeJson(file, report)
  console.log(`Wrote feature family map: ${relative(file)}`)
  console.log(`Nodes: ${report.node_count}`)
  console.log(`Edges: ${report.edge_count}`)
}
