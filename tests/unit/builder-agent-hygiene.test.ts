import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { hygieneRiskEvents, scanReleaseHygiene } from '../../lib/builder-agent/release-hygiene'

test('release hygiene flags source maps, secret-like files, and internal public artifacts', () => {
  const root = mkdtempSync(join(tmpdir(), 'builder-agent-hygiene-'))
  mkdirSync(join(root, 'public'), { recursive: true })
  writeFileSync(join(root, 'public', 'app.js.map'), '{}', 'utf8')
  writeFileSync(join(root, '.env.production'), 'SECRET=1', 'utf8')
  writeFileSync(join(root, 'public', 'agent-journal.json'), '{}', 'utf8')
  writeFileSync(join(root, 'debug.log'), 'trace', 'utf8')

  const findings = scanReleaseHygiene(root)
  const kinds = findings.map((finding) => finding.kind)

  assert.ok(kinds.includes('source_map'))
  assert.ok(kinds.includes('secret_like_file'))
  assert.ok(kinds.includes('internal_artifact'))
  assert.ok(kinds.includes('debug_artifact'))
  assert.ok(hygieneRiskEvents('run-1', findings).some((event) => event.severity === 'critical'))
})

