import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { pathToFileURL } from 'node:url'
import { execFileSync } from 'node:child_process'

function checkEnvironment(inherited = false) {
  const root = mkdtempSync(join(tmpdir(), 'chefflow-release-env-'))
  try {
    writeFileSync(
      join(root, '.env.local'),
      'DATABASE_URL=postgresql://fixture:fixture@localhost:54322/fixture\n'
    )
    const env: NodeJS.ProcessEnv = { ...process.env, NODE_ENV: 'production' }
    delete env.DATABASE_URL
    if (inherited) env.DATABASE_URL = 'postgresql://ci:fixture@localhost:54323/fixture'
    const sourceUrl = pathToFileURL(join(process.cwd(), 'scripts/verify-release.mjs')).href
    const output = execFileSync(
      process.execPath,
      [
        '--input-type=module',
        '-e',
        'const release=await import(process.argv[1]); release.loadReleaseEnvironment(process.argv[2]); console.log("ENV_PROOF:"+JSON.stringify({databaseUrl:process.env.DATABASE_URL}));',
        sourceUrl,
        root,
      ],
      { env, encoding: 'utf8', timeout: 15000 }
    )
    const proof = output.split(/\r?\n/).find((line) => line.startsWith('ENV_PROOF:'))
    assert.ok(proof)
    return JSON.parse(proof.slice('ENV_PROOF:'.length))
  } finally {
    rmSync(root, { recursive: true, force: true })
  }
}

test('release CLI loads its own Next environment before database contract checks', () => {
  assert.equal(
    checkEnvironment().databaseUrl,
    'postgresql://fixture:fixture@localhost:54322/fixture'
  )
})

test('release environment preserves an explicitly configured CI database', () => {
  assert.equal(
    checkEnvironment(true).databaseUrl,
    'postgresql://ci:fixture@localhost:54323/fixture'
  )
})
