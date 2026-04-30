import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { buildMemoryIndex, writeMemoryManifest } from '../../lib/builder-agent/memory-index'

function tempRoot() {
  const root = mkdtempSync(join(tmpdir(), 'builder-agent-memory-'))
  mkdirSync(join(root, 'docs', 'specs'), { recursive: true })
  mkdirSync(join(root, 'docs', 'research'), { recursive: true })
  mkdirSync(join(root, 'memory'), { recursive: true })
  return root
}

test('memory index preserves canonical source precedence and fingerprints', () => {
  const root = tempRoot()
  writeFileSync(join(root, 'CLAUDE.md'), '# Shared Title\nPolicy layer', 'utf8')
  writeFileSync(join(root, 'MEMORY.md'), '# Durable Memory\nFounder context', 'utf8')
  writeFileSync(join(root, 'docs', 'specs', 'README.md'), '# Spec Readme\nQueue rules', 'utf8')
  writeFileSync(join(root, 'docs', 'session-log.md'), '# Session Log\nHistory', 'utf8')
  writeFileSync(join(root, 'docs', 'build-state.md'), '# Build State\nGreen', 'utf8')
  writeFileSync(join(root, 'docs', 'specs', 'example.md'), '# Shared Title\nLower priority', 'utf8')

  const manifest = buildMemoryIndex(root)

  assert.deepEqual(manifest.sourcePrecedence.slice(0, 3), [
    'CLAUDE.md',
    'MEMORY.md',
    'docs/specs/README.md',
  ])
  assert.equal(manifest.records.find((record) => record.id === 'shared-title')?.sourcePath, 'CLAUDE.md')
  assert.ok(manifest.records.every((record) => record.fingerprint.length === 64))
  assert.equal(manifest.conflicts.length, 1)

  const path = writeMemoryManifest(manifest, root)
  assert.match(path.replace(/\\/g, '/'), /memory\/builder-agent\/index\/manifest\.json$/)
})

test('memory index hard fails when canonical policy or memory is missing', () => {
  const root = tempRoot()
  assert.throws(() => buildMemoryIndex(root), /Missing required builder-agent memory source/)
})

