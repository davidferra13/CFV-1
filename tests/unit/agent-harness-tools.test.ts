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

test('agent-replay-corpus promotes and lists a flight record in a temp corpus', () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'chefflow-replay-corpus-'))
  const recordFile = path.join(tempRoot, 'record.json')
  const corpusDir = path.join(tempRoot, 'corpus')
  fs.writeFileSync(
    recordFile,
    JSON.stringify(
      {
        id: 'unit-review-record',
        prompt: 'Review these uncommitted changes before we ship.',
        status: 'finished',
        selected_primary_skill: 'review',
        selected_sidecar_skills: ['omninet'],
        missed_skills: [],
      },
      null,
      2,
    ),
  )

  try {
    const promoted = JSON.parse(
      runNode([
        'devtools/agent-replay-corpus.mjs',
        'promote',
        '--record',
        recordFile,
        '--name',
        'unit review replay',
        '--output-dir',
        corpusDir,
      ]),
    ) as { ok: boolean; case: { expected: { primary_skill: string } } }

    assert.equal(promoted.ok, true)
    assert.equal(promoted.case.expected.primary_skill, 'review')

    const listed = JSON.parse(
      runNode(['devtools/agent-replay-corpus.mjs', 'list', '--output-dir', corpusDir]),
    ) as { ok: boolean; case_count: number; cases: Array<{ id: string }> }

    assert.equal(listed.ok, true)
    assert.equal(listed.case_count, 1)
    assert.equal(listed.cases[0]?.id, 'unit-review-replay')
  } finally {
    fs.rmSync(tempRoot, { recursive: true, force: true })
  }
})

test('agent-replay-runner replays a temp corpus without writing reports', () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'chefflow-replay-run-'))
  const corpusFile = path.join(tempRoot, 'corpus.json')
  fs.writeFileSync(
    corpusFile,
    JSON.stringify(
      [
        {
          id: 'review-request',
          prompt: 'Review these uncommitted changes before we ship.',
          expected_primary_skill: 'review',
          expected_sidecar_skills: ['omninet'],
        },
        {
          id: 'stripe-ledger',
          prompt: 'Build Stripe webhook ledger reconciliation and idempotency.',
          expected_primary_skill: 'stripe-webhook-integrity',
          expected_sidecar_skills: ['ledger-safety', 'omninet'],
        },
      ],
      null,
      2,
    ),
  )

  try {
    const output = runNode([
      'devtools/agent-replay-runner.mjs',
      '--corpus',
      corpusFile,
      '--stdout',
    ])
    const result = JSON.parse(output) as {
      ok: boolean
      case_count: number
      suspicious_count: number
      cases: Array<{ status: string; actual: { primary_skill: string } }>
    }

    assert.equal(result.ok, true)
    assert.equal(result.case_count, 2)
    assert.equal(result.suspicious_count, 0)
    assert.ok(result.cases.every((item) => item.status !== 'suspicious'))
    assert.ok(result.cases.some((item) => item.actual.primary_skill === 'review'))
  } finally {
    fs.rmSync(tempRoot, { recursive: true, force: true })
  }
})

test('agent-replay-runner reports suspicious routing drift as JSON failure', () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'chefflow-replay-fail-'))
  const corpusFile = path.join(tempRoot, 'corpus.json')
  fs.writeFileSync(
    corpusFile,
    JSON.stringify(
      [
        {
          id: 'intentional-mismatch',
          prompt: 'Review these uncommitted changes before we ship.',
          expected_primary_skill: 'builder',
          expected_sidecar_skills: ['omninet'],
        },
      ],
      null,
      2,
    ),
  )

  try {
    const result = runNodeAllowFailure([
      'devtools/agent-replay-runner.mjs',
      '--corpus',
      corpusFile,
      '--stdout',
    ])
    const parsed = JSON.parse(result.stdout) as {
      ok: boolean
      suspicious_count: number
      cases: Array<{ id: string; status: string; diffs: Array<{ kind: string }> }>
    }

    assert.equal(result.ok, false)
    assert.equal(parsed.ok, false)
    assert.equal(parsed.suspicious_count, 1)
    assert.equal(parsed.cases[0]?.id, 'intentional-mismatch')
    assert.equal(parsed.cases[0]?.status, 'suspicious')
    assert.ok(parsed.cases[0]?.diffs.some((diff) => diff.kind === 'primary_changed'))
  } finally {
    fs.rmSync(tempRoot, { recursive: true, force: true })
  }
})

test('codex-build-bridge creates a dry-run packet from a temp ready task', () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'chefflow-bridge-'))
  const readyDir = path.join(tempRoot, 'ready-tasks')
  const buildQueueDir = path.join(tempRoot, 'build-queue')
  fs.mkdirSync(readyDir, { recursive: true })
  fs.mkdirSync(buildQueueDir, { recursive: true })
  const taskFile = path.join(readyDir, '001-high-client-export.md')
  fs.writeFileSync(
    taskFile,
    `---
status: ready
priority: 'high'
score: 72
source_plan: 'system/persona-build-plans/client/task-1.md'
source_persona: 'client'
---

# Build Task: Client export

## What to Build

Connect the client export action to the existing dashboard.

## Files to Modify

- \`components/dashboard/referral-widget.tsx\`

## Acceptance Criteria

1. The export action is visible only when data exists.
`,
  )

  try {
    const output = runNode([
      'devtools/codex-build-bridge.mjs',
      'packet',
      '--file',
      taskFile,
      '--ready-dir',
      readyDir,
      '--build-queue-dir',
      buildQueueDir,
    ])
    const result = JSON.parse(output) as {
      ok: boolean
      dry_run: boolean
      claimed: boolean
      packet: {
        task: { title: string; source_plan: string }
        classification: { status: string; affected_files: string[] }
        codex_prompt: string
      }
    }

    assert.equal(result.ok, true)
    assert.equal(result.dry_run, true)
    assert.equal(result.claimed, false)
    assert.equal(result.packet.task.title, 'Build Task: Client export')
    assert.equal(result.packet.task.source_plan, 'system/persona-build-plans/client/task-1.md')
    assert.equal(result.packet.classification.status, 'buildable')
    assert.ok(
      result.packet.classification.affected_files.includes(
        'components/dashboard/referral-widget.tsx',
      ),
    )
    assert.match(result.packet.codex_prompt, /Act as a ChefFlow Codex builder/)
  } finally {
    fs.rmSync(tempRoot, { recursive: true, force: true })
  }
})

test('codex-build-bridge blocks destructive database tasks', () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'chefflow-bridge-unsafe-'))
  const readyDir = path.join(tempRoot, 'ready-tasks')
  const buildQueueDir = path.join(tempRoot, 'build-queue')
  fs.mkdirSync(buildQueueDir, { recursive: true })
  const taskFile = path.join(buildQueueDir, '001-high-destructive-db.md')
  fs.writeFileSync(
    taskFile,
    `# Build Task: Dangerous cleanup

Run drizzle-kit push, DROP TABLE old_events, and DELETE FROM ledger_entries.

## Files to Modify

- \`database/migrations/999.sql\`
`,
  )

  try {
    const result = runNodeAllowFailure([
      'devtools/codex-build-bridge.mjs',
      'packet',
      '--file',
      taskFile,
      '--ready-dir',
      readyDir,
      '--build-queue-dir',
      buildQueueDir,
    ])
    const parsed = JSON.parse(result.stdout) as {
      ok: boolean
      packet: { classification: { status: string; hard_stops: string[] } }
    }

    assert.equal(result.ok, false)
    assert.equal(parsed.ok, false)
    assert.equal(parsed.packet.classification.status, 'blocked')
    assert.ok(parsed.packet.classification.hard_stops.includes('destructive_database'))
    assert.ok(parsed.packet.classification.hard_stops.includes('drizzle_push'))
  } finally {
    fs.rmSync(tempRoot, { recursive: true, force: true })
  }
})

test('codex-build-bridge refuses packet files outside configured queues', () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'chefflow-bridge-outside-'))
  const readyDir = path.join(tempRoot, 'ready-tasks')
  const buildQueueDir = path.join(tempRoot, 'build-queue')
  fs.mkdirSync(readyDir, { recursive: true })
  fs.mkdirSync(buildQueueDir, { recursive: true })
  const outsideFile = path.join(tempRoot, 'outside.md')
  fs.writeFileSync(outsideFile, '# Outside task\n')

  try {
    const result = runNodeAllowFailure([
      'devtools/codex-build-bridge.mjs',
      'packet',
      '--file',
      outsideFile,
      '--ready-dir',
      readyDir,
      '--build-queue-dir',
      buildQueueDir,
    ])
    const parsed = JSON.parse(result.stdout) as { ok: boolean; error: string }

    assert.equal(result.ok, false)
    assert.equal(parsed.ok, false)
    assert.match(parsed.error, /outside ready\/build queues/)
  } finally {
    fs.rmSync(tempRoot, { recursive: true, force: true })
  }
})

test('codex-build-bridge claim dry-run uses ready tasks without endpoint mutation', () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'chefflow-bridge-claim-'))
  const readyDir = path.join(tempRoot, 'ready-tasks')
  const buildQueueDir = path.join(tempRoot, 'build-queue')
  fs.mkdirSync(readyDir, { recursive: true })
  fs.mkdirSync(buildQueueDir, { recursive: true })
  fs.writeFileSync(
    path.join(readyDir, '001-medium-ready.md'),
    `---
priority: 'medium'
score: 60
source_plan: 'system/persona-build-plans/ready/task-1.md'
---

# Build Task: Ready task

- \`components/ui/handoff-actions.tsx\`
`,
  )
  fs.writeFileSync(
    path.join(buildQueueDir, '001-high-staged.md'),
    `# Build Task: Staged only

- \`components/navigation/public-header.tsx\`
`,
  )

  try {
    const output = runNode([
      'devtools/codex-build-bridge.mjs',
      'claim',
      '--dry-run',
      '--ready-dir',
      readyDir,
      '--build-queue-dir',
      buildQueueDir,
    ])
    const result = JSON.parse(output) as {
      dry_run: boolean
      claimed: boolean
      packet: { task: { file: string; source_plan: string } }
    }

    assert.equal(result.dry_run, true)
    assert.equal(result.claimed, false)
    assert.equal(result.packet.task.file.endsWith('001-medium-ready.md'), true)
    assert.equal(result.packet.task.source_plan, 'system/persona-build-plans/ready/task-1.md')
    assert.deepEqual(
      fs.readdirSync(readyDir).filter((file) => file.startsWith('_claimed_')),
      [],
    )
  } finally {
    fs.rmSync(tempRoot, { recursive: true, force: true })
  }
})
