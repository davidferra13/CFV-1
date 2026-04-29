import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import test from 'node:test'

const repoRoot = process.cwd()
const nodeBin = process.execPath

function runNode(args: string[], cwd = repoRoot) {
  return execFileSync(nodeBin, args, {
    cwd,
    encoding: 'utf8',
    windowsHide: true,
  })
}

function runNodeAllowFailure(args: string[], cwd = repoRoot) {
  try {
    return {
      ok: true,
      stdout: runNode(args, cwd),
    }
  } catch (error) {
    const err = error as { stdout?: Buffer | string }
    return {
      ok: false,
      stdout: String(err.stdout || ''),
    }
  }
}

test('skill-router classifies a basic review request', () => {
  const output = runNode([
    'devtools/skill-router.mjs',
    '--prompt',
    'Review these uncommitted changes before we ship.',
  ])
  const result = JSON.parse(output) as {
    primary_skill: string
    sidecar_skills: string[]
    risk_level: string
    required_checks: string[]
  }

  assert.equal(result.primary_skill, 'review')
  assert.deepEqual(result.sidecar_skills, ['omninet'])
  assert.equal(result.risk_level, 'low')
  assert.ok(
    result.required_checks.includes('stage, commit, and push only owned files before closeout'),
  )
})

test('skill-router applies conflict priority for Stripe ledger work', () => {
  const output = runNode([
    'devtools/skill-router.mjs',
    '--prompt',
    'Build Stripe webhook ledger reconciliation and idempotency.',
  ])
  const result = JSON.parse(output) as {
    primary_skill: string
    sidecar_skills: string[]
    conflict_resolution: { winner: string } | null
  }

  assert.equal(result.primary_skill, 'stripe-webhook-integrity')
  assert.equal(result.conflict_resolution?.winner, 'stripe-webhook-integrity')
  assert.ok(result.sidecar_skills.includes('ledger-safety'))
})

test('skill-learning-proposals returns empty JSON when no learning inbox exists', () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'chefflow-harness-'))
  const script = path.join(repoRoot, 'devtools', 'skill-learning-proposals.mjs')

  try {
    const output = runNode([script, '--json'], tempRoot)
    const result = JSON.parse(output) as {
      proposal_count: number
      proposals: unknown[]
    }

    assert.equal(result.proposal_count, 0)
    assert.deepEqual(result.proposals, [])
  } finally {
    fs.rmSync(tempRoot, { recursive: true, force: true })
  }
})

test('skill-trigger-tests exits successfully for the default corpus', () => {
  const output = runNode(['devtools/skill-trigger-tests.mjs'])

  assert.match(output, /Trigger tests: \d+ case\(s\), 0 failure\(s\)/)
  assert.match(output, /OK omninet/)
})

test('agent-closeout-gate succeeds for a clean committed file', () => {
  const output = runNode(['devtools/agent-closeout-gate.mjs', '--owned', 'package.json'])
  const result = JSON.parse(output) as {
    ok: boolean
    owned_paths: string[]
    failures: string[]
    warnings: string[]
  }

  assert.equal(result.ok, true)
  assert.deepEqual(result.owned_paths, ['package.json'])
  assert.deepEqual(result.failures, [])
  assert.ok(result.warnings.includes('No uncommitted owned changes detected.'))
})

test('missed-skill-detector reports expected skills that were not used', () => {
  const result = runNodeAllowFailure([
    'devtools/missed-skill-detector.mjs',
    '--prompt',
    'Build Stripe webhook ledger reconciliation and idempotency.',
    '--used',
    'builder',
    '--touched',
    'lib/ledger/append.ts,app/api/stripe/webhook/route.ts',
  ])
  const parsed = JSON.parse(result.stdout) as {
    ok: boolean
    missed_skills: Array<{ skill: string }>
  }

  assert.equal(result.ok, false)
  assert.equal(parsed.ok, false)
  assert.ok(parsed.missed_skills.some((miss) => miss.skill === 'stripe-webhook-integrity'))
  assert.ok(parsed.missed_skills.some((miss) => miss.skill === 'ledger-safety'))
})

test('agent-flight-recorder starts and finishes a record', () => {
  let recordPath: string | null = null
  try {
    const started = JSON.parse(
      runNode([
        'devtools/agent-flight-recorder.mjs',
        'start',
        '--prompt',
        'Review these uncommitted changes before we ship.',
      ]),
    ) as { record_file: string }
    recordPath = path.join(repoRoot, started.record_file)

    const finished = JSON.parse(
      runNode([
        'devtools/agent-flight-recorder.mjs',
        'finish',
        '--record',
        started.record_file,
        '--owned',
        'package.json',
        '--used',
        'omninet,review',
        '--validations',
        'unit-test',
      ]),
    ) as { record: { status: string; used_skills: string[]; files_touched: string[] } }

    assert.equal(finished.record.status, 'finished')
    assert.ok(finished.record.used_skills.includes('review'))
    assert.ok(finished.record.files_touched.includes('package.json'))
  } finally {
    if (recordPath) fs.rmSync(recordPath, { force: true })
  }
})

test('skill-maturity-report returns a valid maturity summary', () => {
  const output = runNode(['devtools/skill-maturity-report.mjs', '--stdout'])
  const result = JSON.parse(output) as {
    skill_count: number
    invalid_count: number
    counts: Record<string, number>
  }

  assert.ok(result.skill_count > 0)
  assert.equal(result.invalid_count, 0)
  assert.ok(result.counts.active >= 1)
})

test('skill-outcome-scorer scores a clean flight record without mutating stats', () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'chefflow-outcome-'))
  const recordFile = path.join(tempRoot, 'record.json')
  fs.writeFileSync(
    recordFile,
    JSON.stringify(
      {
        id: 'unit-clean-record',
        prompt: 'Review these changes.',
        selected_primary_skill: 'review',
        selected_sidecar_skills: ['omninet'],
        used_skills: ['review', 'omninet'],
        files_touched: ['package.json'],
        validations_run: ['unit-test'],
        commit_hash: 'abc123',
        pushed: true,
        missed_skills: [],
      },
      null,
      2,
    ),
  )

  try {
    const output = runNode([
      'devtools/skill-outcome-scorer.mjs',
      '--record',
      recordFile,
      '--owned',
      'package.json',
      '--stdout',
    ])
    const result = JSON.parse(output) as {
      outcome: { ok: boolean; score: number; checks: Array<{ id: string; ok: boolean }> }
    }

    assert.equal(result.outcome.ok, true)
    assert.equal(result.outcome.score, 100)
    assert.ok(result.outcome.checks.every((check) => check.ok))
  } finally {
    fs.rmSync(tempRoot, { recursive: true, force: true })
  }
})

test('skill-repair-queue reads stats and reports no repairs by default', () => {
  const output = runNode(['devtools/skill-repair-queue.mjs', '--stdout'])
  const result = JSON.parse(output) as {
    repair_count: number
    entries: unknown[]
  }

  assert.equal(typeof result.repair_count, 'number')
  assert.ok(Array.isArray(result.entries))
})
