import test from 'node:test'
import assert from 'node:assert/strict'
import { execFile } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { promisify } from 'node:util'
import { fileURLToPath } from 'node:url'

const execFileAsync = promisify(execFile)
const source = readFileSync(new URL('../../scripts/dev-runtime.mjs', import.meta.url), 'utf8')
const start = source.indexOf('async function powershellJson(')
const end = source.indexOf('\nasync function getProcesses()', start)
if (start < 0 || end < 0) throw new Error('Cannot load runtime inspection function')

// Replace only the external Windows command with a native finite fixture.
// The actual parsing, timeout and failure handling remain production code.
function probe(fixture: string) {
  const adapter = (_command: string, _args: string[], options: object) =>
    execFileAsync(process.execPath, ['-e', fixture], options)
  return new Function(
    'execFileAsync',
    'PROJECT_ROOT',
    'PROCESS_INSPECTION_TIMEOUT_MS',
    source.slice(start, end) + '\nreturn powershellJson'
  )(adapter, fileURLToPath(new URL('../../', import.meta.url)), 2000) as (
    script: string
  ) => Promise<unknown[]>
}

test('runtime inspection normalizes a valid single process record', async () => {
  const result = await probe('console.log(JSON.stringify({ ProcessId: 42, Name: "node.exe" }))')(
    'fixture'
  )
  assert.deepEqual(result, [{ ProcessId: 42, Name: 'node.exe' }])
})

test('runtime inspection preserves a valid process list', async () => {
  const result = await probe('console.log(JSON.stringify([{ ProcessId: 42 }, { ProcessId: 43 }]))')(
    'fixture'
  )
  assert.deepEqual(result, [{ ProcessId: 42 }, { ProcessId: 43 }])
})

test('malformed process output fails rather than claiming an empty runtime', async () => {
  await assert.rejects(probe('console.log("not-json")')('fixture'), SyntaxError)
})

test('an unsuccessful process inspection fails closed', async () => {
  await assert.rejects(
    probe('console.error("fixture-failed"); process.exit(7)')('fixture'),
    (error: unknown) => {
      assert.equal((error as { code: number }).code, 7)
      return true
    }
  )
})

test('an unresponsive native inspection is bounded and reports unknown ownership', async () => {
  const started = Date.now()
  await assert.rejects(
    probe('setTimeout(() => console.log("[]"), 6000)')('fixture'),
    (error: unknown) => {
      const receipt = error as Error & { code?: string; ownedPid?: number }
      assert.equal(receipt.code, 'DEV_RUNTIME_INSPECTION_TIMEOUT')
      assert.ok(typeof receipt.ownedPid === 'number' && receipt.ownedPid > 0)
      assert.match(receipt.message, /ownership.*unknown/i)
      return true
    }
  )
  assert.ok(Date.now() - started < 5000, 'inspection must not wait for the stalled provider')
})
