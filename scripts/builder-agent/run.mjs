#!/usr/bin/env node
import memoryIndex from '../../lib/builder-agent/memory-index.ts'
import journal from '../../lib/builder-agent/execution-journal.ts'
import frustrationSignals from '../../lib/builder-agent/frustration-signals.ts'
import loopGuard from '../../lib/builder-agent/loop-guard.ts'
import releaseHygiene from '../../lib/builder-agent/release-hygiene.ts'

const { buildMemoryIndex, writeMemoryManifest } = memoryIndex
const { appendRunEvent, createTaskRun, finishRun } = journal
const { detectFrustrationSignals } = frustrationSignals
const { evaluateLoopGuard, loopRiskEvent } = loopGuard
const { hygieneRiskEvents, scanReleaseHygiene } = releaseHygiene

function getArg(name, fallback = null) {
  const index = process.argv.indexOf(`--${name}`)
  if (index === -1) return fallback
  return process.argv[index + 1] ?? fallback
}

function hasFlag(name) {
  return process.argv.includes(`--${name}`)
}

const taskText = getArg('task', 'builder-agent run')
const positionalTaskText = process.argv.slice(2).filter((value) => !value.startsWith('--')).join(' ')
const mode = hasFlag('live') ? 'live' : 'dry-run'
const root = process.cwd()
let run = createTaskRun({ taskText: positionalTaskText || taskText, mode, status: 'running' })
const risks = []
const warnings = []
let manifestPath = null

try {
  const journalPath = appendRunEvent(run.runId, 'start', `Builder-agent ${mode} started.`, {
    artifacts: [],
  })

  const frustration = detectFrustrationSignals(taskText)
  if (frustration.conservativeMode) {
    warnings.push(frustration.planGuidance)
    appendRunEvent(run.runId, 'frustration-signals', frustration.planGuidance, {
      warnings: frustration.signals.map((signal) => `${signal.term}: ${signal.reason}`),
    })
  }

  const loopState = evaluateLoopGuard([])
  run = { ...run, loopState }
  const loopRisk = loopRiskEvent(run.runId, loopState)
  if (loopRisk) risks.push(loopRisk)

  const manifest = buildMemoryIndex(root)
  manifestPath = writeMemoryManifest(manifest, root)
  warnings.push(...manifest.warnings)
  if (manifest.conflicts.length > 0) {
    appendRunEvent(run.runId, 'memory-conflicts', 'Memory conflicts resolved by precedence.', {
      artifacts: manifest.conflicts.map(
        (conflict) => `${conflict.id}: kept ${conflict.keptSourcePath}`,
      ),
    })
  }

  const hygieneFindings = scanReleaseHygiene(root)
  risks.push(...hygieneRiskEvents(run.runId, hygieneFindings))
  if (hygieneFindings.length > 0) {
    appendRunEvent(run.runId, 'release-hygiene', 'Release hygiene findings detected.', {
      warnings: hygieneFindings.map((finding) => `${finding.kind}: ${finding.path}`),
    })
  }

  const hardStop = risks.some((risk) => risk.severity === 'high' || risk.severity === 'critical')
  if (hardStop) {
    run = finishRun({ ...run, riskLevel: 'high' }, 'blocked')
    appendRunEvent(run.runId, 'blocked', 'Builder-agent run blocked by risk event.', {
      warnings: risks.map((risk) => risk.details),
    })
  } else {
    run = finishRun(run, 'completed')
    appendRunEvent(run.runId, 'completed', 'Builder-agent run completed.', {
      artifacts: [manifestPath],
    })
  }

  console.log(
    JSON.stringify(
      {
        run,
        manifestPath,
        journalPath,
        risks,
        warnings,
      },
      null,
      2,
    ),
  )
} catch (error) {
  const message = error instanceof Error ? error.message : String(error)
  run = finishRun({ ...run, riskLevel: 'critical' }, 'failed')
  appendRunEvent(run.runId, 'failed', message, { warnings: [message] })
  console.log(
    JSON.stringify(
      {
        run,
        manifestPath,
        journalPath: `memory/builder-agent/journal/${run.runId}.jsonl`,
        risks: [
          {
            runId: run.runId,
            kind: 'missing_context',
            severity: 'critical',
            details: message,
          },
        ],
        warnings: [message],
      },
      null,
      2,
    ),
  )
  process.exitCode = 1
}
