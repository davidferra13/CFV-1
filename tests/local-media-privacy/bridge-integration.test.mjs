import assert from 'node:assert/strict'
import childProcess from 'node:child_process'
import { syncBuiltinESMExports } from 'node:module'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { test } from 'node:test'
import { readApprovedBytes, sealDerivedText, verifyDerivedText, MediaPrivacyBlocked }
  from '../../scripts/openclaw-archive-digester/lib/media-privacy.mjs'

test('real Python/Node pipes enforce approval, signed provenance and revocation on own fixture', () => {
  const realSpawn = childProcess.spawnSync
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'cf-ipc-fixture-'))
  const old = { home: process.env.MEDIA_PRIVACY_HOME, python: process.env.MEDIA_PRIVACY_PYTHON }
  const command = process.platform === 'win32' ? 'py' : 'python'
  const prefix = process.platform === 'win32' ? ['-3.12'] : []
  const located = realSpawn(command, [...prefix, '-c', 'import sys; print(sys.executable)'], { encoding: 'utf8' })
  assert.equal(located.status, 0)
  const python = located.stdout.trim()
  const driver = fileURLToPath(new URL('./bridge-fixture-driver.py', import.meta.url))
  const fixture = path.join(root, 'generated.txt')
  const action = name => {
    const result = realSpawn(python, [driver, root, name], { encoding: 'utf8' })
    assert.equal(result.status, 0, 'synthetic action failed')
  }
  try {
    action('create')
    process.env.MEDIA_PRIVACY_HOME = path.join(root, 'runtime')
    process.env.MEDIA_PRIVACY_PYTHON = python
    childProcess.spawnSync = (executable, args, options) => {
      assert.equal(executable, python)
      assert.equal(path.basename(args[0]), 'bridge.py')
      const request = JSON.parse(options.input)
      assert.equal(request.path, fixture)
      return realSpawn(python, [driver, root, 'bridge'], options)
    }
    syncBuiltinESMExports()
    assert.throws(() => readApprovedBytes(fixture), MediaPrivacyBlocked)
    action('approve')
    assert.equal(readApprovedBytes(fixture).toString('utf8'), 'HARMLESS IPC FIXTURE\n')
    const receipt = sealDerivedText(fixture, 'harmless derived text')
    verifyDerivedText(fixture, 'harmless derived text', receipt)
    assert.throws(() => verifyDerivedText(fixture, 'changed text', receipt), MediaPrivacyBlocked)
    action('revoke')
    assert.throws(() => readApprovedBytes(fixture), MediaPrivacyBlocked)
    assert.throws(() => verifyDerivedText(fixture, 'harmless derived text', receipt), MediaPrivacyBlocked)
  } finally {
    childProcess.spawnSync = realSpawn
    syncBuiltinESMExports()
    if (old.home === undefined) delete process.env.MEDIA_PRIVACY_HOME
    else process.env.MEDIA_PRIVACY_HOME = old.home
    if (old.python === undefined) delete process.env.MEDIA_PRIVACY_PYTHON
    else process.env.MEDIA_PRIVACY_PYTHON = old.python
    fs.rmSync(root, { recursive: true, force: true })
  }
})
