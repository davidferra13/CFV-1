import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { discoverTests, engineFor, runFile, stopOwnedTree } from '../../scripts/run-unit-files-bounded.mjs'

// Scratch removal is housekeeping, not the behavior under test. Windows keeps a
// just-terminated child's working directory locked briefly; the OS temp
// directory is reclaimed either way, so a locked scratch folder is not a failure.
function removeScratch(root) {
  try {
    rmSync(root, { recursive: true, force: true, maxRetries: 10, retryDelay: 250 })
  } catch (error) {
    if (error.code !== 'EPERM' && error.code !== 'EBUSY') throw error
  }
}

test('bounded runner selects every matching file, deduplicates and rejects escaped paths', () => {
  const root = mkdtempSync(join(tmpdir(), 'unit-selection-'))
  try {
    mkdirSync(join(root, 'tests/unit/nested'), { recursive: true })
    for (const file of ['first.test.ts', 'nested/second.test.mjs', 'helper.ts']) {
      writeFileSync(join(root, 'tests/unit', file), '')
    }
    assert.deepEqual(discoverTests(root, ['tests/unit/**/*.test.*', 'tests/unit/first.test.ts']),
      ['tests/unit/first.test.ts', 'tests/unit/nested/second.test.mjs'])
    assert.throws(() => discoverTests(root, ['tests/unit/../../outside.test.ts']))
    assert.throws(() => discoverTests(root, ['tests/unit/missing.test.ts']))
  } finally { removeScratch(root) }
})

// The runner's contract is: file deadline, then at most 5s for tree cleanup.
// Bound the tests by that contract rather than by an idle machine's speed.
const DEADLINE_MS = 500
const CONTRACT_MS = DEADLINE_MS + 5000 + 2500

test('an unconfirmed cleanup remains a failure with the owned PID available for recovery', { timeout: 20000 }, async () => {
  const root = mkdtempSync(join(tmpdir(), 'unit-cleanup-'))
  try {
    mkdirSync(join(root, 'tests/unit'), { recursive: true })
    const file = 'tests/unit/stuck.test.mjs'
    writeFileSync(join(root, file), "setInterval(()=>{},1000);await new Promise(()=>{});")
    const result = await runFile(root, file, {
      timeoutMs: 500, logDirectory: root,
      stopTree: async child => { await stopOwnedTree(child); return false },
    })
    assert.equal(result.status, 'timeout')
    assert.equal(result.cleanupConfirmed, false)
    assert.ok(Number.isInteger(result.ownedPid))
    assert.ok(result.durationMs < CONTRACT_MS, 'took ' + result.durationMs + 'ms')
  } finally { removeScratch(root) }
})

test('bounded runner keeps Node and Vitest test environments separate', () => {
  assert.equal(engineFor("import {test} from 'node:test'"), 'node')
  assert.equal(engineFor("import {vi} from 'vitest'"), 'vitest')
  assert.equal(engineFor("const {test} = require('vitest')"), 'vitest')
})

test('bounded runner records assertion failures and terminates a stuck file', { timeout: 30000 }, async () => {
  const root = mkdtempSync(join(tmpdir(), 'unit-deadline-'))
  try {
    mkdirSync(join(root, 'tests/unit'), { recursive: true })
    const pass = 'tests/unit/pass.test.mjs'
    const fail = 'tests/unit/fail.test.mjs'
    const stuck = 'tests/unit/stuck.test.mjs'
    writeFileSync(join(root, pass), "import test from 'node:test';test('pass',()=>{});")
    writeFileSync(join(root, fail), "import test from 'node:test';test('fail',()=>{throw new Error('meaningful assertion')});")
    writeFileSync(join(root, stuck), "setInterval(()=>{},1000);await new Promise(()=>{});")
    // Only the stuck file gets the short deadline; a healthy file must not be
    // classified by how quickly a busy host can start a process.
    const options = { timeoutMs: 20000, logDirectory: root }
    const passed = await runFile(root, pass, options)
    assert.equal(passed.status, 'passed')
    const failed = await runFile(root, fail, options)
    assert.equal(failed.status, 'failed')
    assert.match(readFileSync(failed.logPath, 'utf8'), /meaningful assertion/)
    const deadline = await runFile(root, stuck, { timeoutMs: DEADLINE_MS, logDirectory: root })
    assert.equal(deadline.status, 'timeout')
    assert.equal(deadline.cleanupConfirmed, true)
    assert.ok(deadline.durationMs < CONTRACT_MS, 'took ' + deadline.durationMs + 'ms')
  } finally { removeScratch(root) }
})
