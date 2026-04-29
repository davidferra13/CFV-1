import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { afterEach, describe, it } from 'node:test'
import { cleanupAgentClaims } from '../../devtools/agent-claim-cleanup.mjs'

const tempRoots: string[] = []
const fixedNow = new Date('2026-04-29T12:00:00.000Z')

function tempClaimsDir(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'agent-claim-cleanup-'))
  tempRoots.push(dir)
  return dir
}

function writeClaim(dir: string, id: string, claim: Record<string, unknown>): string {
  const file = path.join(dir, `${id}.json`)
  fs.writeFileSync(
    file,
    `${JSON.stringify(
      {
        id,
        status: 'active',
        branch: 'feature/live',
        created_at: '2026-04-29T10:00:00.000Z',
        updated_at: '2026-04-29T10:00:00.000Z',
        ...claim,
      },
      null,
      2
    )}\n`
  )
  return file
}

function readJson(file: string): Record<string, unknown> {
  return JSON.parse(fs.readFileSync(file, 'utf8')) as Record<string, unknown>
}

afterEach(() => {
  for (const dir of tempRoots.splice(0)) {
    fs.rmSync(dir, { recursive: true, force: true })
  }
})

describe('agent claim cleanup', () => {
  it('defaults to dry-run and does not modify stale active claims', () => {
    const dir = tempClaimsDir()
    const claimFile = writeClaim(dir, 'old-active', {
      created_at: '2026-04-28T10:00:00.000Z',
    })

    const result = cleanupAgentClaims({
      claimsDir: dir,
      maxAgeHours: 12,
      now: fixedNow,
      existingBranches: new Set(['feature/live']),
    })

    assert.equal(result.dry_run, true)
    assert.equal(result.scanned, 1)
    assert.equal(result.would_update, 1)
    assert.equal(result.updated, 0)
    assert.equal(result.updates[0]?.next_status, 'stale')
    assert.equal(readJson(claimFile).status, 'active')
  })

  it('marks stale active claims only when write is enabled', () => {
    const dir = tempClaimsDir()
    const claimFile = writeClaim(dir, 'old-active', {
      created_at: '2026-04-28T10:00:00.000Z',
    })

    const result = cleanupAgentClaims({
      claimsDir: dir,
      maxAgeHours: 12,
      write: true,
      now: fixedNow,
      existingBranches: new Set(['feature/live']),
    })

    const claim = readJson(claimFile)
    assert.equal(result.dry_run, false)
    assert.equal(result.updated, 1)
    assert.equal(result.updates[0]?.written, true)
    assert.equal(claim.status, 'stale')
    assert.equal(claim.stale_at, fixedNow.toISOString())
  })

  it('marks open claims orphaned when their branch no longer exists', () => {
    const dir = tempClaimsDir()
    const claimFile = writeClaim(dir, 'missing-branch', {
      branch: 'feature/gone',
      created_at: '2026-04-29T11:00:00.000Z',
    })

    const result = cleanupAgentClaims({
      claimsDir: dir,
      maxAgeHours: 24,
      write: true,
      now: fixedNow,
      existingBranches: new Set(['feature/live']),
    })

    const claim = readJson(claimFile)
    assert.equal(result.summary.orphaned, 1)
    assert.equal(result.updates[0]?.reason, 'branch_missing')
    assert.equal(claim.status, 'orphaned')
    assert.equal(claim.orphaned_at, fixedNow.toISOString())
    assert.equal(fs.existsSync(claimFile), true)
  })

  it('respects max age and ignores finished claims', () => {
    const dir = tempClaimsDir()
    const freshFile = writeClaim(dir, 'fresh-active', {
      created_at: '2026-04-29T11:30:00.000Z',
    })
    const finishedFile = writeClaim(dir, 'finished-old', {
      status: 'finished',
      branch: 'feature/gone',
      created_at: '2026-04-28T10:00:00.000Z',
    })

    const result = cleanupAgentClaims({
      claimsDir: dir,
      maxAgeHours: 2,
      write: true,
      now: fixedNow,
      existingBranches: new Set(['feature/live']),
    })

    assert.equal(result.updated, 0)
    assert.equal(readJson(freshFile).status, 'active')
    assert.equal(readJson(finishedFile).status, 'finished')
  })

  it('returns empty JSON output for a missing claims directory', () => {
    const dir = path.join(tempClaimsDir(), 'missing')

    const result = cleanupAgentClaims({
      claimsDir: dir,
      maxAgeHours: 1,
      now: fixedNow,
      existingBranches: new Set(['feature/live']),
    })

    assert.equal(result.ok, true)
    assert.equal(result.scanned, 0)
    assert.deepEqual(result.updates, [])
  })
})
