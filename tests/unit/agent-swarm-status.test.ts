import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import test from 'node:test'

const repoRoot = process.cwd()
const nodeBin = process.execPath

function runNodeAllowFailure(args: string[]) {
  try {
    return {
      ok: true,
      stdout: execFileSync(nodeBin, args, { cwd: repoRoot, encoding: 'utf8', windowsHide: true }),
    }
  } catch (error) {
    const err = error as { stdout?: Buffer | string }
    return {
      ok: false,
      stdout: String(err.stdout || ''),
    }
  }
}

test('agent-swarm-status reports active stale and overlapping claims', () => {
  const claimsDir = fs.mkdtempSync(path.join(os.tmpdir(), 'chefflow-swarm-status-'))

  try {
    const oldDate = new Date(Date.now() - 48 * 36e5).toISOString()
    fs.writeFileSync(
      path.join(claimsDir, 'one.json'),
      JSON.stringify({
        id: 'one',
        status: 'active',
        branch: null,
        agent: 'unit',
        created_at: oldDate,
        owned_paths: ['devtools/agent-start.mjs'],
      })
    )
    fs.writeFileSync(
      path.join(claimsDir, 'two.json'),
      JSON.stringify({
        id: 'two',
        status: 'active',
        branch: null,
        agent: 'unit',
        created_at: new Date().toISOString(),
        owned_paths: ['devtools/agent-start.mjs'],
      })
    )

    const result = runNodeAllowFailure([
      'devtools/agent-swarm-status.mjs',
      '--claims-dir',
      claimsDir,
      '--max-age-hours',
      '1',
      '--json',
    ])
    const parsed = JSON.parse(result.stdout) as {
      active_claim_count: number
      stale_claim_count: number
      overlapping_claims: Array<{ path: string }>
    }

    assert.equal(result.ok, false)
    assert.equal(parsed.active_claim_count, 2)
    assert.equal(parsed.stale_claim_count, 1)
    assert.deepEqual(parsed.overlapping_claims[0]?.path, 'devtools/agent-start.mjs')
  } finally {
    fs.rmSync(claimsDir, { recursive: true, force: true })
  }
})

test('agent-swarm-status reports directory and child path overlaps', () => {
  const claimsDir = fs.mkdtempSync(path.join(os.tmpdir(), 'chefflow-swarm-nested-status-'))

  try {
    fs.writeFileSync(
      path.join(claimsDir, 'parent.json'),
      JSON.stringify({
        id: 'parent',
        status: 'active',
        branch: null,
        agent: 'unit',
        created_at: new Date().toISOString(),
        owned_paths: ['app/(public)'],
      })
    )
    fs.writeFileSync(
      path.join(claimsDir, 'child.json'),
      JSON.stringify({
        id: 'child',
        status: 'active',
        branch: null,
        agent: 'unit',
        created_at: new Date().toISOString(),
        owned_paths: ['app/(public)/page.tsx'],
      })
    )

    const result = runNodeAllowFailure([
      'devtools/agent-swarm-status.mjs',
      '--claims-dir',
      claimsDir,
      '--json',
    ])
    const parsed = JSON.parse(result.stdout) as {
      overlapping_claims: Array<{ path: string; left_path: string; right_path: string }>
    }

    assert.equal(result.ok, false)
    const overlap = parsed.overlapping_claims[0]
    assert.ok(overlap?.path.includes('app/(public)'))
    assert.ok(overlap?.path.includes('app/(public)/page.tsx'))
    assert.deepEqual(
      new Set([overlap?.left_path, overlap?.right_path]),
      new Set(['app/(public)', 'app/(public)/page.tsx'])
    )
  } finally {
    fs.rmSync(claimsDir, { recursive: true, force: true })
  }
})
