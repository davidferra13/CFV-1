#!/usr/bin/env node
// The release gate replays claimed chef flows. Receipts alone never promote a capability.
import { execFileSync, spawnSync } from 'node:child_process'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import * as capabilities from '../lib/capabilities/index.ts'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const api = capabilities.default ?? capabilities
const { CHEFFLOW_CAPABILITY_REGISTRY, evaluateCapabilityProofFile } = api
const PRODUCTION_URL = 'https://app.cheflowhq.com'

function git(args, root) {
  return execFileSync('git', args, {
    cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'],
  }).trim()
}

async function readLiveIdentity(baseUrl) {
  const response = await fetch(baseUrl + '/api/build-version', {
    cache: 'no-store', signal: AbortSignal.timeout(12_000),
  })
  if (!response.ok) throw new Error('live revision endpoint HTTP ' + response.status)
  const identity = await response.json()
  if (!identity || typeof identity.revision !== 'string' || typeof identity.buildId !== 'string')
    throw new Error('live revision endpoint lacks commit and build identity')
  return identity
}

function countResults(suite, counts) {
  for (const spec of suite.specs ?? []) {
    for (const test of spec.tests ?? []) {
      counts[test.projectName] ??= { passed: 0, failed: 0 }
      const results = test.results ?? []
      if (test.status === 'expected' && results.some((result) => result.status === 'passed'))
        counts[test.projectName].passed++
      else counts[test.projectName].failed++
    }
  }
  for (const nested of suite.suites ?? []) countResults(nested, counts)
}

function replayFlow(receipt, root) {
  const cli = resolve(root, 'node_modules/@playwright/test/cli.js')
  const result = spawnSync(process.execPath, [
    cli, 'test', receipt.liveRun.specPath,
    '--config=playwright.capability-proof.config.ts', '--reporter=json',
  ], {
    cwd: root, encoding: 'utf8', timeout: 180_000, maxBuffer: 8 * 1024 * 1024,
    env: { ...process.env, PLAYWRIGHT_BASE_URL: receipt.liveRun.baseUrl,
      PLAYWRIGHT_RUN_ID: receipt.liveRun.runId },
  })
  if (result.error) throw result.error
  if (result.status !== 0) throw new Error('chef flow replay failed: ' + String(result.stderr || result.stdout).slice(-400))
  const report = JSON.parse(result.stdout)
  const counts = {}
  for (const suite of report.suites ?? []) countResults(suite, counts)
  if (!counts.phone?.passed || !counts.desktop?.passed ||
      Object.values(counts).some((count) => count.failed))
    throw new Error('chef flow replay did not pass both phone and desktop paths')
  return counts
}

export async function verifyCapabilityClaims({
  root = ROOT,
  registry = CHEFFLOW_CAPABILITY_REGISTRY,
  readIdentity = readLiveIdentity,
  replay = replayFlow,
  snapshot = () => ({ revision: git(['rev-parse', 'HEAD'], root),
    dirty: Boolean(git(['status', '--porcelain'], root)) }),
} = {}) {
  const blockers = []
  const states = {}
  const current = snapshot()
  for (const capability of registry) {
    const initial = evaluateCapabilityProofFile(capability, root)
    let state = initial.state
    const claimed = capability.buildStatus === 'VERIFIED' &&
      capability.testStatus === 'VERIFIED' &&
      !capability.externalInteractionRemaining.trim()
    if (state === 'INVALID' || state === 'STALE') {
      blockers.push({ id: capability.id, state, reasons: initial.reasons })
    } else if (state === 'MISSING' && claimed) {
      blockers.push({ id: capability.id, state, reasons: ['declared VERIFIED without a receipt'] })
    } else if (initial.receipt?.stackElimination.completedInsideChefFlow &&
               initial.receipt.stackElimination.externalAppSwitches.length === 0) {
      const receipt = initial.receipt
      const run = receipt.liveRun
      try {
        if (current.dirty) throw new Error('checkout is dirty; release identity is ambiguous')
        if (run.revision !== current.revision) throw new Error('receipt revision differs from release')
        if (run.baseUrl !== PRODUCTION_URL) throw new Error('receipt target is not canonical production')
        const live = await readIdentity(run.baseUrl)
        if (live.revision !== run.revision || live.buildId !== run.buildId)
          throw new Error('deployed revision/build differs from receipt')
        await replay(receipt, root)
        const confirmed = evaluateCapabilityProofFile(capability, root, run.runId)
        state = confirmed.state
        if (state !== 'VERIFIED')
          throw new Error('replayed claim remains ' + state + ': ' + confirmed.reasons.join('; '))
      } catch (error) {
        blockers.push({ id: capability.id, state: 'UNPROVEN',
          reasons: [error instanceof Error ? error.message : String(error)] })
      }
    }
    if (claimed && state !== 'VERIFIED' && !blockers.some((item) => item.id === capability.id))
      blockers.push({ id: capability.id, state, reasons: ['declared VERIFIED without passing live replay'] })
    states[state] = (states[state] ?? 0) + 1
  }
  return { ok: blockers.length === 0, states, blockers }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  verifyCapabilityClaims().then((result) => {
    console.log(JSON.stringify(result))
    if (!result.ok) process.exitCode = 1
  }).catch((error) => {
    console.error(JSON.stringify({ ok: false, error: String(error) }))
    process.exitCode = 1
  })
}
