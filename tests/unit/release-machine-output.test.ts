import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { spawn } from 'node:child_process'
import {
  buildReleaseProfileContext,
  buildReleaseProfiles,
  runReleaseVerification,
} from '../../scripts/verify-release.mjs'

test('machine-readable release commands suppress only the npm preamble', () => {
  for (const steps of Object.values(
    buildReleaseProfiles(buildReleaseProfileContext())
  ) as any[][]) {
    for (const step of steps) {
      if (step.machineReadable) assert.deepEqual(step.args, ['--silent', 'run', step.scriptName])
      else assert.equal(step.args[0], 'run')
      assert.ok(step.command.endsWith(step.args.join(' ')))
    }
  }
})

async function reportForAudit(stdout: string, stderr: string, exitCode = 0) {
  const tempDir = mkdtempSync(join(tmpdir(), 'release-stream-proof-'))
  try {
    const env = {
      ...process.env,
      CF_VERIFY_RUN_ID: 'unit-stream-proof',
      CF_RELEASE_ATTESTATION_PATH: join(tempDir, 'attestation.json'),
    }
    const context = buildReleaseProfileContext({
      ...env,
      NEXT_BUILD_DIST_DIR: join(tempDir, '.next-full'),
      WEB_BETA_NEXT_BUILD_DIST_DIR: join(tempDir, '.next-beta'),
    })
    return (
      await runReleaseVerification({
        context,
        env,
        profile: 'full',
        runner: async (step: any) => {
          const selected = step.name === 'audit:completeness:json'
          const out = selected ? stdout : step.machineReadable ? '{}' : ''
          const err = selected ? stderr : ''
          const code = selected ? exitCode : 0
          return {
            attempts: 1,
            command: step.command,
            completedAt: '2026-10-07T00:00:01.000Z',
            durationMs: 100,
            errorMessage: null,
            exitCode: code,
            ok: code === 0,
            stdout: out,
            stderr: err,
            output: out + err,
            outputSummary: { charCount: out.length + err.length, lineCount: 2, tail: out + err },
            startedAt: '2026-10-07T00:00:00.000Z',
          }
        },
      })
    ).report
  } finally {
    rmSync(tempDir, { recursive: true, force: true })
  }
}

test('valid audit JSON is parsed from stdout while stderr remains in its receipt', async () => {
  const report = await reportForAudit('{"failCount":0}', 'environment diagnostic\n')
  assert.equal(report.status, 'passed')
  const audit = report.steps.find((step: any) => step.name === 'audit:completeness:json')
  assert.equal(audit.machineReadableOutput.failCount, 0)
  assert.match(audit.outputSummary.tail, /environment diagnostic/)
})

test('diagnostic JSON cannot rescue malformed audit stdout', async () => {
  const report = await reportForAudit('malformed stdout', '{"failCount":0}')
  assert.equal(report.status, 'failed')
  assert.ok(report.blockers.some((finding: any) => /invalid_json/.test(finding.code)))
  assert.equal(report.steps.length, 3)
})

test('valid stdout cannot turn a nonzero audit exit into a pass', async () => {
  const report = await reportForAudit('{"failCount":1}', 'audit failed\n', 1)
  assert.equal(report.status, 'failed')
  assert.ok(report.blockers.some((finding: any) => /step-execution/.test(finding.code)))
  assert.equal(report.steps.length, 3)
})

test('the native release executor retains separate complete output streams', async () => {
  const source = readFileSync(join(process.cwd(), 'scripts/verify-release.mjs'), 'utf8')
  const start = source.indexOf('function executeStepAttempt(step) {')
  const end = source.indexOf('\nasync function runStep(', start)
  assert.ok(start >= 0 && end > start)
  const runner = new Function(
    'spawn',
    'npmCommand',
    'summarizeOutput',
    source.slice(start, end) + '\nreturn executeStepAttempt'
  )(
    spawn,
    () => process.execPath,
    (output: string) => ({ tail: output })
  )
  const result = await runner({
    args: [
      '-e',
      'process.stdout.write(JSON.stringify({ok:true})); process.stderr.write("native diagnostic");',
    ],
    env: {},
  })
  assert.equal(result.ok, true)
  assert.equal(result.stdout, '{"ok":true}')
  assert.equal(result.stderr, 'native diagnostic')
  assert.match(result.output, /native diagnostic/)
})
