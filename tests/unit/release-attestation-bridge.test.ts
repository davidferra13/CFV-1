import test from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import {
  buildReleaseProfileContext,
  runReleaseVerification,
} from '../../scripts/verify-release.mjs'

function createSuccessfulStepResult(step: { command: string }, output = '') {
  const lines = output.length === 0 ? 0 : output.split(/\r?\n/).length
  return {
    attempts: 1,
    command: step.command,
    completedAt: '2026-04-22T00:00:01.000Z',
    durationMs: 100,
    errorMessage: null,
    exitCode: 0,
    ok: true,
    output,
    outputSummary: {
      charCount: output.length,
      lineCount: lines,
      tail: output,
    },
    startedAt: '2026-04-22T00:00:00.000Z',
  }
}

async function withTempDir(fn: (tempDir: string) => Promise<void> | void) {
  const tempDir = mkdtempSync(join(tmpdir(), 'release-attestation-bridge-'))
  try {
    await fn(tempDir)
  } finally {
    rmSync(tempDir, { recursive: true, force: true })
  }
}

test('runReleaseVerification writes an attestation report with tracked advisories', async () => {
  await withTempDir(async (tempDir) => {
    const env = {
      ...process.env,
      CF_VERIFY_RUN_ID: 'unit-release-pass',
      CF_RELEASE_ATTESTATION_PATH: join(tempDir, 'attestation.json'),
    }
    const context = buildReleaseProfileContext({
      ...env,
      NEXT_BUILD_DIST_DIR: join(tempDir, '.next-pass'),
      WEB_BETA_NEXT_BUILD_DIST_DIR: join(tempDir, '.next-web-beta-pass'),
    })

    const { attestationPaths, report } = await runReleaseVerification({
      context,
      env,
      profile: 'full',
      runner: async (step) => {
        if (step.name === 'audit:completeness:json') {
          return createSuccessfulStepResult(
            step,
            JSON.stringify({
              generatedAt: '2026-04-22T00:00:00.000Z',
              passCount: 1,
              requestedChecks: [],
              requestedGroups: [],
              results: [],
              selectedCheckCount: 1,
              totalFindings: 0,
              warnCount: 0,
              failCount: 0,
            })
          )
        }

        if (step.name === 'audit:db:contract:json') {
          return createSuccessfulStepResult(
            step,
            JSON.stringify({
              contractVersion: 'db-boot-contract.v1',
              failCount: 0,
              findings: [],
              generatedAt: '2026-04-22T00:00:00.000Z',
              live: null,
              migrationDirectory: {
                destructiveStatements: [],
                duplicates: [],
                invalidFiles: [],
                migrationFiles: [],
                versions: [],
              },
              plannerChecks: [],
              rollbackValidations: [],
              runtimeInvariants: [],
              sourceAudit: [],
              summary: {
                liveMissingCount: 0,
                plannerFailureCount: 0,
                rollbackFailureCount: 0,
                runtimeInvariantFailureCount: 0,
                sourceFailureCount: 0,
              },
              warnCount: 0,
            })
          )
        }

        if (step.name === 'build') {
          return createSuccessfulStepResult(
            step,
            ['Compilation complete.', 'DYNAMIC_SERVER_USAGE'].join('\n')
          )
        }

        return createSuccessfulStepResult(step)
      },
    })

    assert.equal(report.status, 'passed')
    assert.equal(report.summary.blockerCount, 0)
    assert.equal(report.summary.advisoryCount, 1)
    assert.equal(report.blockers.length, 0)
    assert.deepEqual(
      report.advisories.map((finding: { policyId: string | null }) => finding.policyId).sort(),
      ['dynamic_server_usage']
    )
    assert.equal(report.steps[1]?.name, 'audit:completeness:json')
    assert.equal(report.steps[1]?.machineReadableOutput?.failCount, 0)
    assert.ok(existsSync(attestationPaths.primaryPath))

    const persisted = JSON.parse(readFileSync(attestationPaths.primaryPath, 'utf8'))
    assert.equal(persisted.status, 'passed')
    assert.equal(persisted.summary.advisoryCount, 1)
    assert.equal(persisted.summary.blockerCount, 0)
  })
})

test('runReleaseVerification records blocking machine-readable contract drift on failure', async () => {
  await withTempDir(async (tempDir) => {
    const env = {
      ...process.env,
      CF_VERIFY_RUN_ID: 'unit-release-fail',
      CF_RELEASE_ATTESTATION_PATH: join(tempDir, 'attestation.json'),
    }
    const context = buildReleaseProfileContext({
      ...env,
      NEXT_BUILD_DIST_DIR: join(tempDir, '.next-fail'),
      WEB_BETA_NEXT_BUILD_DIST_DIR: join(tempDir, '.next-web-beta-fail'),
    })

    const { attestationPaths, report } = await runReleaseVerification({
      context,
      env,
      profile: 'full',
      runner: async (step) => {
        if (step.name === 'audit:completeness:json') {
          return createSuccessfulStepResult(step, 'not json at all')
        }

        return createSuccessfulStepResult(step)
      },
    })

    assert.equal(report.status, 'failed')
    assert.equal(report.steps.length, 2)
    assert.equal(report.steps[1]?.status, 'failed')
    assert.match(report.blockers[0]?.code ?? '', /invalid_json/)
    assert.ok(existsSync(attestationPaths.primaryPath))

    const persisted = JSON.parse(readFileSync(attestationPaths.primaryPath, 'utf8'))
    assert.equal(persisted.status, 'failed')
    assert.equal(persisted.summary.blockerCount > 0, true)
  })
})
