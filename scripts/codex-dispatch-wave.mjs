#!/usr/bin/env node

/**
 * Codex Wave Dispatcher
 *
 * Dispatches spec-based build tasks to Codex CLI in parallel batches.
 * Each task runs `codex exec` with the spec content as the prompt.
 *
 * Usage:
 *   node scripts/codex-dispatch-wave.mjs [--wave 1] [--dry-run] [--concurrency 3]
 *   node scripts/codex-dispatch-wave.mjs --spec codex-client-ux-bug-sweep.md
 */

import { execFile, spawn } from 'node:child_process'
import { readFile, mkdir, writeFile } from 'node:fs/promises'
import { join, basename } from 'node:path'
import { promisify } from 'node:util'

const execFileAsync = promisify(execFile)
const ROOT = process.cwd()
const SPECS_DIR = join(ROOT, 'docs', 'specs')
const LOG_DIR = join(ROOT, 'logs', 'codex-dispatch')

// ─── Wave definitions ──────────────────────────────────────────────

const WAVES = {
  1: {
    name: 'Bug Fixes & Quick Wins',
    specs: [
      'codex-client-ux-bug-sweep.md',
      'codex-fix-chat-empty-state.md',
      'codex-fix-dev-note-circles.md',
      'codex-fix-quote-phantom-terms.md',
      'codex-fix-auto-join-consent.md',
      'codex-fix-rebooking-prefill.md',
      'arthur-klein-fix-3-costing-transparency-ui.md',
      'arthur-klein-fix-1-configurable-plate-cost.md',
      'arthur-klein-fix-2-cost-csv-exports.md',
    ],
  },
  2: {
    name: 'Dinner Circles & Client Experience (P0)',
    specs: [
      'codex-circle-approval-flow.md',
      'codex-circle-reminder-cascade.md',
    ],
  },
  '2b': {
    name: 'Dinner Circles & Client Experience (P1)',
    specs: [
      'codex-circle-event-broadcast.md',
      'codex-consumer-upcoming-events.md',
      'codex-post-dinner-circle-onramp.md',
      'codex-handoff-context-enrichment.md',
      'codex-collaborator-circle-bridge.md',
    ],
  },
  3: {
    name: 'Costing & Pricing',
    specs: [
      'ingredient-sourcing-intelligence.md',
      'cost-propagation-wiring.md',
    ],
  },
  4: {
    name: 'Operational Features',
    specs: [
      'codex-prep-sheet-generator.md',
      'codex-service-day-closeout.md',
      'codex-menu-performance-dashboard.md',
      'codex-saturation-tracking-core.md',
    ],
  },
  5: {
    name: 'Loyalty, Growth & Public',
    specs: [
      'loyalty-phase1-visibility-and-perks.md',
      'loyalty-client-experience.md',
      'featured-chef-public-proof-and-booking.md',
      'consumer-first-discovery-and-dinner-planning-expansion.md',
      'directory-post-claim-enhancement-flow.md',
      'dinner-circle-multi-host-collaboration.md',
    ],
  },
  6: {
    name: 'Infrastructure',
    specs: [
      'codex-hub-table-schema-sync.md',
      'codex-intl-phase2-format-wiring.md',
      'byoai-phase2-ollama-adapter.md',
      'byoai-phase2-privacy-narrative.md',
    ],
  },
  V: {
    name: 'Verification (Playwright)',
    specs: [
      'receipt-intelligence-and-recipe-scaling.md',
      'service-simulation.md',
      'p1-performance-optimization.md',
      'restaurant-ops-surface-and-reliability-pass.md',
      'settings-branding-account-security.md',
      'chef-opportunity-network.md',
      'staff-ops-unified-workflow.md',
      'p0-chef-pricing-readiness-gate.md',
      'p0-chef-golden-path-reliability.md',
      'soft-close-leverage-and-reactivation.md',
      'p1-allergy-and-dietary-trust-alignment.md',
      'chef-pricing-override-infrastructure.md',
      'notes-dishes-menus-client-event-pipeline.md',
      'p0-chef-cpa-ready-tax-export-and-reconciliation.md',
    ],
  },
}

// ─── Build the prompt for a spec ──────────────────────────────────

function buildPrompt(specName, specContent, isVerification) {
  const branchName = `codex/${specName.replace('.md', '').replace(/[^a-z0-9-]/g, '-')}`

  if (isVerification) {
    return [
      `You are a ChefFlow builder agent. Your task is to VERIFY an already-built feature using Playwright tests.`,
      ``,
      `CRITICAL RULES:`,
      `- Create branch: ${branchName}`,
      `- Read AGENTS.md first (project rules, hard stops, patterns)`,
      `- This feature is ALREADY BUILT. Do NOT rebuild it.`,
      `- Write Playwright tests that verify the feature works end-to-end`,
      `- Use the agent account (.auth/agent.json) for authentication`,
      `- Sign in via POST http://localhost:3100/api/e2e/auth`,
      `- Run tests, fix any failures you find in existing code`,
      `- Commit and push your branch when done`,
      ``,
      `SPEC TO VERIFY:`,
      `---`,
      specContent,
    ].join('\n')
  }

  return [
    `You are a ChefFlow builder agent. Build the feature described in the spec below.`,
    ``,
    `CRITICAL RULES:`,
    `- Create branch: ${branchName}`,
    `- Read AGENTS.md first (project rules, hard stops, patterns)`,
    `- NEVER work on main. NEVER merge to main.`,
    `- NEVER run destructive DB operations without approval`,
    `- NEVER use em dashes anywhere`,
    `- Treat all unfamiliar code as another agent's WIP - do not delete it`,
    `- Commit and push your branch when done`,
    `- If something fails 3 times, stop and commit partial progress`,
    ``,
    `BUILD SPEC:`,
    `---`,
    specContent,
  ].join('\n')
}

// ─── Dispatch a single task ───────────────────────────────────────

async function dispatchTask(specName, dryRun) {
  const specPath = join(SPECS_DIR, specName)
  const isVerification = WAVES.V.specs.includes(specName)

  let specContent
  try {
    specContent = await readFile(specPath, 'utf8')
  } catch (err) {
    console.error(`  SKIP ${specName} - file not found`)
    return { spec: specName, status: 'skipped', reason: 'file not found' }
  }

  const prompt = buildPrompt(specName, specContent, isVerification)
  const logFile = join(LOG_DIR, `${specName.replace('.md', '')}.log`)

  if (dryRun) {
    console.log(`  DRY-RUN ${specName} (${specContent.split('\n').length} lines)`)
    return { spec: specName, status: 'dry-run' }
  }

  console.log(`  DISPATCH ${specName}`)

  // Write prompt to temp file to avoid shell escaping issues
  const promptFile = join(LOG_DIR, `${specName.replace('.md', '')}.prompt.txt`)
  await writeFile(promptFile, prompt, 'utf8')

  return new Promise((resolve) => {
    const child = spawn('codex', [
      'exec',
      '--sandbox', 'workspace-write',
      '-m', 'gpt-5.4-mini',
      '-',
    ], {
      cwd: ROOT,
      stdio: ['pipe', 'pipe', 'pipe'],
      shell: true,
    })

    let stdout = ''
    let stderr = ''

    child.stdin.write(prompt)
    child.stdin.end()

    child.stdout.on('data', (d) => { stdout += d.toString() })
    child.stderr.on('data', (d) => { stderr += d.toString() })

    child.on('close', async (code) => {
      const output = `EXIT: ${code}\n\nSTDOUT:\n${stdout}\n\nSTDERR:\n${stderr}`
      await writeFile(logFile, output, 'utf8').catch(() => {})

      const status = code === 0 ? 'success' : 'failed'
      console.log(`  ${status.toUpperCase()} ${specName} (exit ${code})`)
      resolve({ spec: specName, status, exitCode: code })
    })

    // 10-minute timeout per task
    setTimeout(() => {
      child.kill('SIGTERM')
      console.log(`  TIMEOUT ${specName}`)
      resolve({ spec: specName, status: 'timeout' })
    }, 600_000)
  })
}

// ─── Dispatch a wave with concurrency control ─────────────────────

async function dispatchWave(waveId, concurrency, dryRun) {
  const wave = WAVES[waveId]
  if (!wave) {
    console.error(`Unknown wave: ${waveId}. Available: ${Object.keys(WAVES).join(', ')}`)
    process.exit(1)
  }

  console.log(`\n=== WAVE ${waveId}: ${wave.name} (${wave.specs.length} tasks, concurrency ${concurrency}) ===\n`)

  const results = []
  const queue = [...wave.specs]

  // Process in batches of `concurrency`
  while (queue.length > 0) {
    const batch = queue.splice(0, concurrency)
    const batchResults = await Promise.all(
      batch.map(spec => dispatchTask(spec, dryRun))
    )
    results.push(...batchResults)
  }

  return results
}

// ─── Main ─────────────────────────────────────────────────────────

async function main() {
  const args = process.argv.slice(2)
  const dryRun = args.includes('--dry-run')
  const waveIdx = args.indexOf('--wave')
  const concIdx = args.indexOf('--concurrency')
  const specIdx = args.indexOf('--spec')

  const concurrency = concIdx !== -1 ? parseInt(args[concIdx + 1], 10) : 3

  await mkdir(LOG_DIR, { recursive: true })

  // Single spec mode
  if (specIdx !== -1) {
    const specName = args[specIdx + 1]
    console.log(`\n=== SINGLE SPEC: ${specName} ===\n`)
    const result = await dispatchTask(specName, dryRun)
    console.log('\nResult:', JSON.stringify(result, null, 2))
    return
  }

  // Wave mode
  const waveId = waveIdx !== -1 ? args[waveIdx + 1] : '1'
  const results = await dispatchWave(waveId, concurrency, dryRun)

  // Summary
  console.log('\n=== SUMMARY ===')
  const grouped = { success: [], failed: [], skipped: [], timeout: [], 'dry-run': [] }
  for (const r of results) {
    ;(grouped[r.status] || []).push(r.spec)
  }
  for (const [status, specs] of Object.entries(grouped)) {
    if (specs.length) console.log(`  ${status}: ${specs.length} (${specs.join(', ')})`)
  }

  // Write results
  const reportPath = join(LOG_DIR, `wave-${waveId}-results.json`)
  await writeFile(reportPath, JSON.stringify({ wave: waveId, timestamp: new Date().toISOString(), results }, null, 2))
  console.log(`\nResults written to ${reportPath}`)
}

main().catch(err => {
  console.error('Fatal:', err)
  process.exit(1)
})
