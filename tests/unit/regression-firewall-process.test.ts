import assert from 'node:assert/strict'
import { test } from 'node:test'
import { mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { setTimeout as delay } from 'node:timers/promises'
import { runStep, parseArgs } from '../../scripts/regression-firewall.mjs'

test('explicit step budget also bounds the persona gate', () => {
  assert.equal(parseArgs(['--step-timeout-ms', '60000']).personaTimeoutMs, 60000)
})
test('default persona budget remains six minutes', () => {
  assert.equal(parseArgs([]).personaTimeoutMs, 360000)
})
test('normal step retains stdout and successful exit', async () => {
  const result = await runStep(
    'fixture success',
    process.execPath,
    ['-e', 'console.log("fixture-ok")'],
    { timeoutMs: 10000 }
  )
  assert.equal(result.ok, true)
  assert.equal(result.code, 0)
  assert.equal(result.timedOut, false)
  assert.match(result.stdout, /fixture-ok/)
})
test('nonzero exit and stderr remain failures', async () => {
  const result = await runStep(
    'fixture failure',
    process.execPath,
    ['-e', 'console.error("fixture-error"); process.exitCode = 7'],
    { timeoutMs: 10000 }
  )
  assert.equal(result.ok, false)
  assert.equal(result.code, 7)
  assert.match(result.stderr, /fixture-error/)
})
test('spawn error resolves as failure', async () => {
  const result = await runStep(
    'fixture missing executable',
    'chefflow-missing-test-executable',
    [],
    { timeoutMs: 10000 }
  )
  assert.equal(result.ok, false)
  assert.match(result.stderr, /ENOENT/)
})
test('timeout stops its child tree without waiting on inherited pipes', async () => {
  const directory = mkdtempSync(join(tmpdir(), 'chefflow-step-test-'))
  const heartbeat = join(directory, 'heartbeat.txt')
  // A heartbeat proves the child stopped even when a container retains its zombie PID.
  // The finite lifetime also bounds the fixture if the runner regresses.
  const descendant = [
    'const fs = require("node:fs")',
    'const file = ' + JSON.stringify(heartbeat),
    'fs.writeFileSync(file, "started")',
    'const timer = setInterval(() => fs.appendFileSync(file, "."), 40)',
    'setTimeout(() => clearInterval(timer), 30000)',
  ].join(';')
  const parent = [
    'const { spawn } = require("node:child_process")',
    'const child = spawn(process.execPath, ["-e", ' +
      JSON.stringify(descendant) +
      '], { stdio: "inherit", detached: process.platform === "win32" })',
    'console.log("descendant-pid=" + child.pid)',
    'setTimeout(() => {}, 30000)',
  ].join(';')
  let pid
  try {
    const result = await runStep('fixture timeout tree', process.execPath, ['-e', parent], {
      timeoutMs: 1000,
    })
    pid = Number(result.stdout.match(/descendant-pid=(\d+)/)?.[1])
    assert.ok(Number.isInteger(pid) && pid > 0, 'descendant must start before timeout')
    assert.equal(result.ok, false)
    assert.equal(result.timedOut, true)
    assert.ok(
      result.durationMs < 20000,
      'runner waited for descendant pipes: ' + result.durationMs + 'ms'
    )
    assert.doesNotMatch(result.stderr, /Process-tree cleanup failed/)
    const stoppedHeartbeat = readFileSync(heartbeat, 'utf8')
    await delay(250)
    assert.equal(readFileSync(heartbeat, 'utf8'), stoppedHeartbeat, 'descendant still running')
    if (process.platform === 'win32') assert.throws(() => process.kill(pid, 0), { code: 'ESRCH' })
  } finally {
    if (pid) {
      try {
        process.kill(pid)
      } catch {}
    }
    rmSync(directory, { recursive: true, force: true })
  }
})
