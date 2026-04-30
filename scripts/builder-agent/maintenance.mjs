#!/usr/bin/env node
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

import memoryIndex from '../../lib/builder-agent/memory-index.ts'
import journal from '../../lib/builder-agent/execution-journal.ts'
import releaseHygiene from '../../lib/builder-agent/release-hygiene.ts'

const { buildMemoryIndex, writeMemoryManifest } = memoryIndex
const { appendRunEvent, createTaskRun, finishRun } = journal
const { hygieneRiskEvents, scanReleaseHygiene } = releaseHygiene

const root = process.cwd()
let run = createTaskRun({
  taskText: 'builder-agent maintenance',
  mode: 'maintenance',
  status: 'running',
})

try {
  const journalPath = appendRunEvent(run.runId, 'start', 'Builder-agent maintenance started.')
  const manifest = buildMemoryIndex(root)
  const manifestPath = writeMemoryManifest(manifest, root)
  const staleSpecs = findStaleReadySpecs(root)
  const hygieneFindings = scanReleaseHygiene(root)
  const risks = hygieneRiskEvents(run.runId, hygieneFindings)
  const blocked = risks.some((risk) => risk.severity === 'high' || risk.severity === 'critical')

  appendRunEvent(run.runId, 'maintenance', 'Maintenance checks completed.', {
    artifacts: [manifestPath],
    warnings: [
      ...manifest.warnings,
      ...staleSpecs.map((spec) => `Ready spec may need review: ${spec}`),
      ...hygieneFindings.map((finding) => `${finding.kind}: ${finding.path}`),
    ],
  })

  run = finishRun({ ...run, riskLevel: blocked ? 'high' : 'low' }, blocked ? 'blocked' : 'completed')

  console.log(
    JSON.stringify(
      {
        run,
        manifestPath,
        journalPath,
        staleSpecs,
        hygieneFindings,
        risks,
      },
      null,
      2,
    ),
  )
} catch (error) {
  const message = error instanceof Error ? error.message : String(error)
  run = finishRun({ ...run, riskLevel: 'critical' }, 'failed')
  appendRunEvent(run.runId, 'failed', message, { warnings: [message] })
  console.log(JSON.stringify({ run, error: message }, null, 2))
  process.exitCode = 1
}

function findStaleReadySpecs(root) {
  const specsDir = join(root, 'docs', 'specs')
  if (!existsSync(specsDir)) return []

  return readdirSync(specsDir)
    .filter((file) => file.endsWith('.md'))
    .filter((file) => {
      const text = readFileSync(join(specsDir, file), 'utf8')
      return /\*\*Status:\*\*\s*ready/i.test(text)
    })
    .slice(0, 20)
}
