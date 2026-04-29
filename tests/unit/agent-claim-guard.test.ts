import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import test from 'node:test'

const repoRoot = process.cwd()
const nodeBin = process.execPath

function runNode(args: string[]) {
  return execFileSync(nodeBin, args, {
    cwd: repoRoot,
    encoding: 'utf8',
    windowsHide: true,
  })
}

function runNodeAllowFailure(args: string[]) {
  try {
    return {
      ok: true,
      stdout: runNode(args),
    }
  } catch (error) {
    const err = error as { stdout?: Buffer | string; stderr?: Buffer | string }
    return {
      ok: false,
      stdout: String(err.stdout || ''),
      stderr: String(err.stderr || ''),
    }
  }
}

function makeTempDir(prefix: string) {
  return fs.mkdtempSync(path.join(os.tmpdir(), prefix))
}

test('agent-claim creates an active branch-scoped file ownership manifest', () => {
  const claimsDir = makeTempDir('chefflow-agent-claims-')

  try {
    const output = runNode([
      'devtools/agent-claim.mjs',
      'start',
      '--prompt',
      'Build the swarm branch guard.',
      '--owned',
      'devtools/agent-claim.mjs,devtools/agent-claim-utils.mjs',
      '--claims-dir',
      claimsDir,
    ])
    const result = JSON.parse(output) as {
      claim_file: string
      claim: {
        status: string
        branch: string
        branch_start_commit: string
        owned_paths: string[]
      }
    }

    assert.equal(result.claim.status, 'active')
    assert.ok(result.claim.branch)
    assert.ok(result.claim.branch_start_commit)
    assert.deepEqual(result.claim.owned_paths, [
      'devtools/agent-claim.mjs',
      'devtools/agent-claim-utils.mjs',
    ])
    assert.equal(fs.existsSync(path.resolve(repoRoot, result.claim_file)), true)
  } finally {
    fs.rmSync(claimsDir, { recursive: true, force: true })
  }
})

test('agent-claim check blocks overlapping active claims but ignores the current claim', () => {
  const claimsDir = makeTempDir('chefflow-agent-claim-conflict-')

  try {
    const started = JSON.parse(
      runNode([
        'devtools/agent-claim.mjs',
        'start',
        '--prompt',
        'Own the closeout gate.',
        '--owned',
        'devtools/agent-closeout-gate.mjs',
        '--claims-dir',
        claimsDir,
      ])
    ) as { claim_file: string }

    const ownCheck = JSON.parse(
      runNode([
        'devtools/agent-claim.mjs',
        'check',
        '--claim',
        started.claim_file,
        '--owned',
        'devtools/agent-closeout-gate.mjs',
        '--claims-dir',
        claimsDir,
      ])
    ) as { ok: boolean; conflicts: unknown[] }
    assert.equal(ownCheck.ok, true)
    assert.deepEqual(ownCheck.conflicts, [])

    const conflict = runNodeAllowFailure([
      'devtools/agent-claim.mjs',
      'check',
      '--owned',
      'devtools/agent-closeout-gate.mjs',
      '--claims-dir',
      claimsDir,
    ])
    const parsed = JSON.parse(conflict.stdout) as {
      ok: boolean
      conflicts: Array<{ overlap: string[] }>
    }

    assert.equal(conflict.ok, false)
    assert.equal(parsed.ok, false)
    assert.deepEqual(parsed.conflicts[0]?.overlap, ['devtools/agent-closeout-gate.mjs'])
  } finally {
    fs.rmSync(claimsDir, { recursive: true, force: true })
  }
})

test('agent-closeout-gate fails when a flight record started on a different branch', () => {
  const tempDir = makeTempDir('chefflow-agent-branch-guard-')
  const recordFile = path.join(tempDir, 'record.json')

  try {
    fs.writeFileSync(
      recordFile,
      JSON.stringify(
        {
          id: 'unit-branch-mismatch',
          branch: 'not-the-current-branch',
          claim_file: null,
        },
        null,
        2
      )
    )

    const result = runNodeAllowFailure([
      'devtools/agent-closeout-gate.mjs',
      '--owned',
      'package.json',
      '--record',
      recordFile,
      '--claims-dir',
      tempDir,
    ])
    const parsed = JSON.parse(result.stdout) as { ok: boolean; failures: string[] }

    assert.equal(result.ok, false)
    assert.equal(parsed.ok, false)
    assert.ok(parsed.failures.some((failure) => failure.includes('Branch changed during task')))
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true })
  }
})

test('agent-commit-claim-warning warns when staged files have no active claim', () => {
  const claimsDir = makeTempDir('chefflow-agent-claim-warning-')

  try {
    const output = runNode([
      'devtools/agent-commit-claim-warning.mjs',
      '--staged',
      'devtools/agent-start.mjs',
      '--claims-dir',
      claimsDir,
      '--branch',
      'feature/test-branch',
      '--json',
    ])
    const result = JSON.parse(output) as {
      ok: boolean
      warnings: string[]
      covering_claims: unknown[]
    }

    assert.equal(result.ok, true)
    assert.equal(result.covering_claims.length, 0)
    assert.ok(result.warnings.some((warning) => warning.includes('No active agent claim')))
  } finally {
    fs.rmSync(claimsDir, { recursive: true, force: true })
  }
})

test('agent-commit-claim-warning recognizes current branch claim coverage', () => {
  const claimsDir = makeTempDir('chefflow-agent-claim-warning-covered-')

  try {
    fs.writeFileSync(
      path.join(claimsDir, 'claim.json'),
      JSON.stringify(
        {
          id: 'unit-covered-claim',
          status: 'active',
          branch: 'feature/test-branch',
          agent: 'unit',
          owned_paths: ['devtools/agent-start.mjs'],
        },
        null,
        2
      )
    )

    const output = runNode([
      'devtools/agent-commit-claim-warning.mjs',
      '--staged',
      'devtools/agent-start.mjs',
      '--claims-dir',
      claimsDir,
      '--branch',
      'feature/test-branch',
      '--json',
    ])
    const result = JSON.parse(output) as {
      ok: boolean
      warnings: string[]
      covering_claims: Array<{ owned_paths: string[] }>
    }

    assert.equal(result.ok, true)
    assert.deepEqual(result.warnings, [])
    assert.deepEqual(result.covering_claims[0]?.owned_paths, ['devtools/agent-start.mjs'])
  } finally {
    fs.rmSync(claimsDir, { recursive: true, force: true })
  }
})
