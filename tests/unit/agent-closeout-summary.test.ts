import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import test from 'node:test'

const repoRoot = process.cwd()
const nodeBin = process.execPath

function runNodeAllowFailure(args: string[]) {
  try {
    return {
      ok: true,
      stdout: execFileSync(nodeBin, args, { cwd: repoRoot, encoding: 'utf8', windowsHide: true }),
    }
  } catch (error) {
    const err = error as { stdout?: Buffer | string }
    return {
      ok: false,
      stdout: String(err.stdout || ''),
    }
  }
}

test('agent-closeout-summary reports owned file cleanliness and validation evidence', () => {
  const result = runNodeAllowFailure([
    'devtools/agent-closeout-summary.mjs',
    '--owned',
    'tsconfig.json',
    '--validations',
    'unit-test',
  ])
  const parsed = JSON.parse(result.stdout) as {
    owned_files_clean: boolean
    validations: string[]
    unrelated_dirty_count: number
  }

  assert.equal(parsed.owned_files_clean, true)
  assert.deepEqual(parsed.validations, ['unit-test'])
  assert.equal(typeof parsed.unrelated_dirty_count, 'number')
})
