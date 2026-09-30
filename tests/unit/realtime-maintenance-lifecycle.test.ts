import test from 'node:test'
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'

test('presence cleanup does not keep an otherwise idle process alive', () => {
  const result = spawnSync(
    process.execPath,
    ['--import', 'tsx', '-e', "require('./lib/realtime/sse-server.ts')"],
    { cwd: process.cwd(), encoding: 'utf8', timeout: 5000 }
  )
  assert.equal(result.error, undefined, result.error?.message)
  assert.equal(result.status, 0, result.stderr)
})
