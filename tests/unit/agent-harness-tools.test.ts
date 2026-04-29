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
