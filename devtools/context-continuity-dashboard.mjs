#!/usr/bin/env node
import path from 'node:path'
import {
  continuityDashboardRoot,
  buildContinuityReport,
  findNearDuplicateClusters,
  buildFeatureFamilyMap,
  renderContinuityDashboard,
} from './context-continuity-lib.mjs'
import {
  ensureDir,
  parseArgs,
  readStdin,
  relative,
  writeJson,
  writeText,
} from './agent-skill-utils.mjs'

const args = parseArgs()
const prompt = String(args.prompt || args._.join(' ') || readStdin() || 'context continuity').trim()
const scan = buildContinuityReport({ prompt, write: Boolean(args.writeScan || args['write-scan']) })
const duplicates = findNearDuplicateClusters({
  threshold: args.threshold ? Number(args.threshold) : 0.42,
  maxFiles: args.max ? Number(args.max) : 350,
})
const featureMap = buildFeatureFamilyMap()
const dashboard = {
  generated_at: new Date().toISOString(),
  scan,
  duplicates,
  feature_map: featureMap,
}

if (args.stdout || args.json) {
  console.log(JSON.stringify(dashboard, null, 2))
} else {
  ensureDir(continuityDashboardRoot)
  const jsonFile = path.join(continuityDashboardRoot, 'latest.json')
  const htmlFile = path.join(continuityDashboardRoot, 'latest.html')
  writeJson(jsonFile, dashboard)
  writeText(htmlFile, renderContinuityDashboard({ scan, duplicates, featureMap }))
  console.log(`Wrote context continuity dashboard JSON: ${relative(jsonFile)}`)
  console.log(`Wrote context continuity dashboard HTML: ${relative(htmlFile)}`)
}
