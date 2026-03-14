import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'

import {
  buildMigrationRepairPlan,
  createMigrationRepairReport,
  inspectLocalMigrationDirectory,
  parseSupabaseMigrationListOutput,
} from '../../scripts/plan-supabase-migration-repair.mjs'

describe('Supabase migration repair plan', () => {
  it('parses local and remote versions independently from the CLI table', () => {
    const output = `
       Local          | Remote         | Time (UTC)
      ----------------|----------------|---------------------
       20260304000010 | 20260304000010 | 2026-03-04 00:00:10
                      | 20260305       | 20260305
       20260305000001 | 20260305000001 | 2026-03-05 00:00:01
       20260305000010 |                | 2026-03-05 00:00:10
       20260313000011 |                | 2026-03-13 00:00:11
       20260322000057 | 20260322000057 | 2026-03-22 00:00:57
       20260322000058 |                | 2026-03-22 00:00:58
       20260330000032 | 20260330000032 | 2026-03-30 00:00:32
       20260330000033 |                | 2026-03-30 00:00:33
       20260330000082 |                | 2026-03-30 00:00:82
    `

    const parsed = parseSupabaseMigrationListOutput(output)
    const plan = buildMigrationRepairPlan({
      localVersions: [
        '20260304000010',
        '20260305000001',
        '20260305000010',
        '20260313000011',
        '20260322000057',
        '20260322000058',
        '20260330000032',
        '20260330000033',
        '20260330000082',
      ],
      remoteVersions: parsed.remoteVersions,
    })

    assert.deepEqual(parsed.remoteVersions, [
      '20260305',
      '20260304000010',
      '20260305000001',
      '20260322000057',
      '20260330000032',
    ])
    assert.deepEqual(plan.remoteOnly, ['20260305'])
    assert.deepEqual(plan.historicalLocalOnly, [
      '20260305000010',
      '20260313000011',
      '20260322000058',
    ])
    assert.deepEqual(plan.tailLocalOnly, ['20260330000033', '20260330000082'])
    assert.deepEqual(
      plan.repairCommands.map((item) => item.command),
      [
        'npx supabase migration repair --linked --status reverted 20260305',
        'npx supabase migration repair --linked --status applied 20260313000011',
      ]
    )
    assert.deepEqual(plan.pushableLocalOnly, [
      '20260305000010',
      '20260322000058',
      '20260330000033',
      '20260330000082',
    ])
  })

  it('flags invalid local filenames before planning', () => {
    const dir = mkdtempSync(join(tmpdir(), 'migration-plan-'))
    try {
      writeFileSync(join(dir, '20260305_owner_observability_indexes.sql'), '-- bad')
      writeFileSync(join(dir, '20260305000010_owner_observability_indexes.sql'), '-- ok')
      writeFileSync(join(dir, '20260305000010_duplicate.sql'), '-- dup')

      const local = inspectLocalMigrationDirectory(dir)

      assert.deepEqual(local.invalidFiles, ['20260305_owner_observability_indexes.sql'])
      assert.deepEqual(local.duplicates, [
        {
          version: '20260305000010',
          first: '20260305000010_duplicate.sql',
          second: '20260305000010_owner_observability_indexes.sql',
        },
      ])
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  })

  it('builds a full report from a migration-list snapshot', () => {
    const dir = mkdtempSync(join(tmpdir(), 'migration-report-'))
    try {
      writeFileSync(join(dir, '20260305000010_owner_observability_indexes.sql'), '-- ok')
      writeFileSync(join(dir, '20260322000057_existing.sql'), '-- ok')
      writeFileSync(join(dir, '20260313000011_purchase_orders.sql'), '-- ok')
      writeFileSync(join(dir, '20260322000058_event_prep_blocks_catchup.sql'), '-- ok')

      const output = `
         Local          | Remote         | Time (UTC)
        ----------------|----------------|---------------------
                        | 20260305       | 20260305
         20260322000057 | 20260322000057 | 2026-03-22 00:00:57
      `

      const report = createMigrationRepairReport({
        migrationsDir: dir,
        migrationListOutput: output,
      })

      assert.equal(report.localCount, 4)
      assert.equal(report.remoteCount, 2)
      assert.deepEqual(report.plan.remoteOnly, ['20260305'])
      assert.deepEqual(report.plan.localOnly, [
        '20260305000010',
        '20260313000011',
        '20260322000058',
      ])
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  })
})
