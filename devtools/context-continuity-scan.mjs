#!/usr/bin/env node
import { parseArgs, readStdin } from './agent-skill-utils.mjs'
import { buildContinuityReport } from './context-continuity-lib.mjs'

const args = parseArgs()
const prompt = String(args.prompt || args.p || args._.join(' ') || readStdin()).trim()

if (!prompt) {
  console.error('Missing prompt. Pass --prompt "..." or pipe text on stdin.')
  process.exit(1)
}

const report = buildContinuityReport({
  prompt,
  write: Boolean(args.write),
  limit: args.limit ? Number(args.limit) : 30,
})

if (args.stdout || args.json || !args.write) {
  console.log(JSON.stringify(report, null, 2))
} else {
  console.log(`Wrote context continuity report: ${report.report_path}`)
  console.log(`Decision: ${report.continuity.decision}`)
  console.log(`Reason: ${report.continuity.reason}`)
  if (report.continuity.stop_required) process.exitCode = 2
}
