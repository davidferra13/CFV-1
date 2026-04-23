/**
 * OpenClaw Goal Governor Agent
 *
 * Deterministic evaluator for runtime slice readiness.
 * Recomputes KPI-gate status for one slice or the full registry and prints JSON.
 */

import { closeDb, getDb, getRuntimeSlice, refreshAllSliceGates, refreshSliceGate } from '../lib/db.mjs'

function parseArgs(argv) {
  const parsed = {
    sliceKey: null,
    strict: false,
  }

  for (const arg of argv) {
    if (arg === '--strict') {
      parsed.strict = true
      continue
    }

    if (arg.startsWith('--slice=')) {
      parsed.sliceKey = arg.slice('--slice='.length).trim() || null
    }
  }

  return parsed
}

function summarizeGateResult(result) {
  return {
    sliceKey: result.sliceKey,
    status: result.status,
    blockerCount: result.blockerCount,
    blockers: result.blockers,
    kpiCount: result.kpiCount,
    evaluatedAt: result.evaluatedAt,
  }
}

function printJson(value) {
  process.stdout.write(`${JSON.stringify(value, null, 2)}\n`)
}

async function main() {
  const { sliceKey, strict } = parseArgs(process.argv.slice(2))
  const db = getDb()

  try {
    if (sliceKey) {
      const slice = getRuntimeSlice(db, sliceKey)
      if (!slice) {
        printJson({ error: `Slice not found: ${sliceKey}` })
        process.exitCode = 1
        return
      }

      const gate = refreshSliceGate(db, sliceKey)
      printJson({
        slice: getRuntimeSlice(db, sliceKey),
        gate: summarizeGateResult(gate),
      })

      if (strict && gate.status !== 'ready') {
        process.exitCode = 1
      }
      return
    }

    const gates = refreshAllSliceGates(db).map(summarizeGateResult)
    printJson({
      total: gates.length,
      ready: gates.filter((gate) => gate.status === 'ready').length,
      blocked: gates.filter((gate) => gate.status === 'blocked').length,
      gates,
    })

    if (strict && gates.some((gate) => gate.status !== 'ready')) {
      process.exitCode = 1
    }
  } finally {
    closeDb()
  }
}

main().catch((err) => {
  console.error('[goal-governor-agent]', err)
  process.exitCode = 1
})
