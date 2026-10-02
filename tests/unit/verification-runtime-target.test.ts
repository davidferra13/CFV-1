import test from 'node:test'
import assert from 'node:assert/strict'
import { resolveVerificationPort, assertReadOnlyVerificationCommand } from '../../scripts/verification-runtime-target.mjs'
test('verification defaults to production port and validates isolated ports', () => {
  assert.equal(resolveVerificationPort(undefined), 3100)
  assert.equal(resolveVerificationPort('3112'), 3112)
  for (const invalid of ['0', '80', '65536', '3112;stop', 'NaN', '-1']) {
    assert.throws(() => resolveVerificationPort(invalid))
  }
})
test('isolated runtime checks cannot restart or stop any service', () => {
  for (const command of ['start', 'restart', 'stop', 'stop-duplicates']) {
    assert.throws(() => assertReadOnlyVerificationCommand(3112, command))
  }
  assert.doesNotThrow(() => assertReadOnlyVerificationCommand(3112, 'verify'))
  assert.doesNotThrow(() => assertReadOnlyVerificationCommand(3100, 'restart'))
})
