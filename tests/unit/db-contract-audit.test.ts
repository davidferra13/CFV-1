import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import {
  auditRuntimeInvariants,
  inspectMigrationDirectory,
} from '../../scripts/audit-db-contract.ts'

test('inspectMigrationDirectory flags duplicate timestamps, invalid filenames, and destructive SQL', () => {
  const rootDir = mkdtempSync(join(tmpdir(), 'db-contract-audit-'))
  const migrationsDir = join(rootDir, 'database', 'migrations')
  mkdirSync(migrationsDir, { recursive: true })

  try {
    writeFileSync(join(migrationsDir, '20260422000001_valid.sql'), 'CREATE TABLE ok (id int);')
    writeFileSync(
      join(migrationsDir, '20260422000001_duplicate.sql'),
      'CREATE INDEX ok_idx ON ok (id);'
    )
    writeFileSync(join(migrationsDir, 'bad_name.sql'), 'SELECT 1;')
    writeFileSync(join(migrationsDir, '20260422000002_destructive.sql'), 'DROP TABLE nope;')

    const report = inspectMigrationDirectory(rootDir)

    assert.deepEqual(report.invalidFiles, ['bad_name.sql'])
    assert.deepEqual(report.duplicates, [
      {
        first: '20260422000001_duplicate.sql',
        second: '20260422000001_valid.sql',
        version: '20260422000001',
      },
    ])
    assert.equal(report.destructiveStatements.length, 1)
    assert.equal(report.destructiveStatements[0]?.statement, 'DROP TABLE')
    assert.equal(report.destructiveStatements[0]?.line, 1)
  } finally {
    rmSync(rootDir, { recursive: true, force: true })
  }
})

test('auditRuntimeInvariants keeps the shared Postgres runtime and SQLite sidecar assumptions intact', () => {
  const results = auditRuntimeInvariants()
  const failures = results.filter((result) => !result.ok)

  assert.deepEqual(
    failures,
    [],
    failures
      .map(
        (failure) =>
          `${failure.id}: missing=${failure.missingPatterns.join(', ')} forbidden=${failure.forbiddenPatterns.join(', ')}`
      )
      .join('; ')
  )
})
