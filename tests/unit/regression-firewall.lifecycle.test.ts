import test from 'node:test'
import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

type StepResult = {
  ok: boolean
  code: number | null
  timedOut: boolean
  stdout: string
  stderr: string
}
type RunStep = (
  name: string,
  command: string,
  args: string[],
  options: { timeoutMs: number }
) => Promise<StepResult>

// Exercise the actual private step runner with native child processes, without
// starting the unrelated release phases that the CLI runs at module load.
const source = readFileSync(
  new URL('../../scripts/regression-firewall.mjs', import.meta.url),
  'utf8'
)
const start = source.indexOf('async function runStep(')
const end = source.indexOf('\nasync function readWiringSummary()', start)
if (start < 0 || end < 0) throw new Error('Cannot load the regression step runner')
const runStep = new Function(
  'spawn',
  'ROOT',
  'isWin',
  'process',
  source.slice(start, end) + '\nreturn runStep'
)(
  spawn,
  fileURLToPath(new URL('../../', import.meta.url)),
  process.platform === 'win32',
  process
) as RunStep

test('successful regression child preserves its output and exit status', async () => {
  const result = await runStep(
    'successful fixture',
    process.execPath,
    ['-e', 'console.log("fixture-output")'],
    { timeoutMs: 5000 }
  )
  assert.equal(result.ok, true)
  assert.equal(result.code, 0)
  assert.equal(result.timedOut, false)
  assert.match(result.stdout, /fixture-output/)
})

test('failed regression child remains a failed gate with its error output', async () => {
  const result = await runStep(
    'failed fixture',
    process.execPath,
    ['-e', 'console.error("fixture-error"); process.exit(7)'],
    { timeoutMs: 5000 }
  )
  assert.equal(result.ok, false)
  assert.equal(result.code, 7)
  assert.equal(result.timedOut, false)
  assert.match(result.stderr, /fixture-error/)
})

test('a timed-out regression worker halts verification and identifies its reconciliation target', async () => {
  const fixture = 'setTimeout(() => {}, 4000)'
  const started = Date.now()
  await assert.rejects(
    runStep('timeout fixture', process.execPath, ['-e', fixture], { timeoutMs: 500 }),
    (error: unknown) => {
      const receipt = error as Error & { code?: string; ownedPid?: number; timedOut?: boolean }
      assert.equal(receipt.code, 'REGRESSION_STEP_CLEANUP_UNCONFIRMED')
      assert.equal(receipt.timedOut, true)
      assert.ok(typeof receipt.ownedPid === 'number' && receipt.ownedPid > 0)
      assert.match(receipt.message, /reconcil/i)
      return true
    }
  )
  assert.ok(Date.now() - started < 3000, 'a timeout must stop the verification sequence promptly')
})

test('a timed-out shell shim cannot hold the verification promise open through descendant pipes', async (t) => {
  const directory = mkdtempSync(join(tmpdir(), 'regression-firewall-fixture-'))
  t.after(() => rmSync(directory, { recursive: true, force: true }))
  const command = process.platform === 'win32' ? join(directory, 'fixture.cmd') : process.execPath
  const args =
    process.platform === 'win32'
      ? []
      : [
          '-e',
          'require("node:child_process").spawn(process.execPath, ["-e", "setTimeout(() => {}, 4000)"], { stdio: "inherit" }); process.exit(0)',
        ]
  if (process.platform === 'win32') {
    writeFileSync(
      command,
      '@"' +
        process.execPath +
        '" -e "console.log(\'fixture-holds-pipes\'); setTimeout(() => {}, 4000)"\r\n'
    )
  }
  const started = Date.now()
  await assert.rejects(
    runStep('shell-pipe fixture', command, args, { timeoutMs: 500 }),
    (error: unknown) => {
      const receipt = error as Error & { code?: string; ownedPid?: number; timedOut?: boolean }
      assert.equal(receipt.code, 'REGRESSION_STEP_CLEANUP_UNCONFIRMED')
      assert.equal(receipt.timedOut, true)
      assert.ok(typeof receipt.ownedPid === 'number' && receipt.ownedPid > 0)
      return true
    }
  )
  assert.ok(Date.now() - started < 3000)
})
