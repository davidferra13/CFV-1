import test from 'node:test'
import assert from 'node:assert/strict'
import { buildReleaseProfiles, evaluateStepExecution } from '../../scripts/verify-release.mjs'
const step = buildReleaseProfiles().full.find((value) => value.name === 'audit:completeness:json')!
test('JSON audit commands suppress npm banners', () => {
  assert.equal(step.args.join(' '), '--silent run audit:completeness:json')
})
test('stderr diagnostics remain visible without corrupting stdout JSON', () => {
  const report = evaluateStepExecution(step, {
    ok: true,
    exitCode: 0,
    stdout: '{"failCount":0}',
    output: '{"failCount":0}\nDiagnostic warning',
  })
  assert.equal(report.status, 'passed')
  assert.deepEqual(report.machineReadableOutput, { failCount: 0 })
})
test('valid JSON never hides a failing audit process', () => {
  const report = evaluateStepExecution(step, {
    ok: false,
    exitCode: 1,
    stdout: '{"failCount":4}',
    output: '{"failCount":4}',
  })
  assert.equal(report.status, 'failed')
  assert.ok(
    report.blockers.some((value) => value.code === 'step-execution:audit:completeness:json')
  )
})
test('malformed or empty stdout still blocks release', () => {
  for (const stdout of ['not json', '']) {
    const report = evaluateStepExecution(step, {
      ok: true,
      exitCode: 0,
      stdout,
      output: '{"failCount":0}',
    })
    assert.equal(report.status, 'failed')
  }
})

test('database configuration stays isolated from unit and browser processes', async () => {
  const { resolveStepInvocation } = await import('../../scripts/verify-release.mjs')
  const env = { CF_VERIFY_DB_ENV_FILE: 'C:/established/config/.env.local' }
  const db = resolveStepInvocation({ name: 'audit:db:contract:json', args: [] }, env)
  assert.equal(db.command, process.execPath)
  assert.ok(db.args.includes('--env-file=C:/established/config/.env.local'))
  for (const name of ['test:unit', 'test:e2e:smoke:release', 'build']) {
    assert.deepEqual(resolveStepInvocation({ name, args: ['run', name] }, env).args, ['run', name])
  }
})
