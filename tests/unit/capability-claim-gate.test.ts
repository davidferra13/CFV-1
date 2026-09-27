import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { execFileSync } from 'node:child_process'
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import test from 'node:test'
import { CHEFFLOW_CAPABILITY_REGISTRY } from '../../lib/capabilities/index'
import { verifyCapabilityClaims } from '../../scripts/verify-capability-claims.mjs'

const base = CHEFFLOW_CAPABILITY_REGISTRY[0]
function withFixture(run: (root: string, revision: string) => Promise<void>) {
  const root = mkdtempSync(join(tmpdir(), 'chef-proof-gate-'))
  return (async () => {
    try {
      execFileSync('git', ['init', '-q'], { cwd: root })
      execFileSync('git', ['-c', 'user.name=Test', '-c', 'user.email=test@example.invalid',
        'commit', '--allow-empty', '-qm', 'fixture'], { cwd: root })
      const revision = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim()
      await run(root, revision)
    } finally {
      rmSync(root, { recursive: true, force: true })
    }
  })()
}
function file(root: string, relative: string, content: string) {
  const path = join(root, relative)
  mkdirSync(dirname(path), { recursive: true })
  writeFileSync(path, content)
  return { path: relative, sha256: createHash('sha256').update(readFileSync(path)).digest('hex') }
}
function receipt(root: string, revision: string, complete = true) {
  const specPath = `tests/capability-proofs/${base.id}.spec.ts`
  const observedAt = new Date().toISOString()
  const value = {
    schemaVersion: 2, capabilityId: base.id, verifiedAt: observedAt,
    verifierVersion: 'chef-flow-browser/1',
    implementationEvidence: [file(root, 'lib/chef-task.ts', 'export const task = true')],
    testEvidence: [file(root, specPath, 'test chef task on phone and desktop')],
    runtimeEvidence: [file(root, 'reports/chef-task.json', '{"phone":"passed","desktop":"passed"}')],
    stackElimination: {
      scenario: 'Prepare the next dinner using ChefFlow',
      completedInsideChefFlow: complete,
      externalAppSwitches: complete ? [] : ['Outside grocery app'],
    },
    liveRun: {
      revision, buildId: 'build-12345678', baseUrl: 'https://app.cheflowhq.com',
      observedAt, runId: 'proof-run-123', specPath,
      phone: { actions: ['open Today', 'open dinner'], result: 'ready',
        tapsBefore: 5, tapsAfter: 2 },
      desktop: { actions: ['open Today', 'open dinner'], result: 'ready' },
    },
  }
  file(root, `.agents/capability-proofs/${base.id}.json`, JSON.stringify(value))
  return value
}
const dependencies = (revision: string) => ({
  registry: [base],
  snapshot: () => ({ revision, dirty: false }),
  readIdentity: async () => ({ revision, buildId: 'build-12345678' }),
  replay: async () => ({ phone: { passed: 1 }, desktop: { passed: 1 } }),
})
test('gate leaves missing and explicitly incomplete capabilities open', async () => {
  await withFixture(async (root, revision) => {
    assert.equal((await verifyCapabilityClaims({ root, ...dependencies(revision) })).ok, true)
    receipt(root, revision, false)
    const result = await verifyCapabilityClaims({ root, ...dependencies(revision) })
    assert.equal(result.ok, true)
    assert.equal(result.states.INCOMPLETE, 1)
  })
})
test('gate rejects missing declared completion, malformed receipts, and stale hashes', async () => {
  await withFixture(async (root, revision) => {
    const declared = { ...base, buildStatus: 'VERIFIED' as const,
      testStatus: 'VERIFIED' as const, externalInteractionRemaining: '' }
    assert.equal((await verifyCapabilityClaims({
      root, ...dependencies(revision), registry: [declared],
    })).blockers[0].state, 'MISSING')
    receipt(root, revision)
    const location = join(root, '.agents/capability-proofs', `${base.id}.json`)
    writeFileSync(location, '{"complete":true}')
    assert.equal((await verifyCapabilityClaims({
      root, ...dependencies(revision),
    })).blockers[0].state, 'INVALID')
    receipt(root, revision)
    writeFileSync(join(root, 'lib/chef-task.ts'), 'changed after observation')
    assert.equal((await verifyCapabilityClaims({
      root, ...dependencies(revision),
    })).blockers[0].state, 'STALE')
  })
})
test('gate rejects forged completion and accepts a current independently replayed claim', async () => {
  await withFixture(async (root, revision) => {
    const value = receipt(root, revision)
    const failed = await verifyCapabilityClaims({
      root, ...dependencies(revision), replay: async () => { throw new Error('no task completed') },
    })
    assert.equal(failed.ok, false)
    assert.equal(failed.blockers[0].state, 'UNPROVEN')
    const good = await verifyCapabilityClaims({ root, ...dependencies(revision) })
    assert.equal(good.ok, true)
    assert.equal(good.states.VERIFIED, 1)
    assert.equal(value.liveRun.revision, revision)
  })
})

test('established release runner stops before build on a false capability completion', async () => {
  await withFixture(async (root) => {
    const { runReleaseVerification, buildReleaseProfileContext } =
      await import('../../scripts/verify-release.mjs')
    const context = buildReleaseProfileContext({
      CF_VERIFY_RUN_ID: 'capability-gate-fixture',
      NEXT_BUILD_DIST_DIR: join(root, 'build'),
      WEB_BETA_NEXT_BUILD_DIST_DIR: join(root, 'web-build'),
    })
    const result = await runReleaseVerification({
      profile: 'full', context, cwd: root,
      env: {
        CF_RELEASE_ATTESTATION_PATH: join(root, 'attestation.json'),
        CF_RELEASE_ATTESTATION_LATEST_PATH: join(root, 'latest.json'),
      },
      runner: async (step: { name: string; command: string; classification: string;
        gateSeverity: string; machineReadable: boolean; warningPolicyIds: string[] }) => ({
        ok: step.name !== 'audit:capabilities:gate',
        output: '', command: step.command, attempts: 1, completedAt: new Date().toISOString(),
        startedAt: new Date().toISOString(), durationMs: 1, exitCode: 1,
        outputSummary: { tail: '', charCount: 0, lineCount: 0 },
      }),
    })
    assert.equal(result.report.status, 'failed')
    assert.deepEqual(result.report.steps.map((step: { name: string }) => step.name),
      ['verify:secrets', 'audit:capabilities:gate'])
    assert.equal(result.report.steps.some((step: { name: string }) => step.name === 'build'), false)
  })
})
