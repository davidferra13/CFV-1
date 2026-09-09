import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { describe, it } from 'node:test'
import { resolve } from 'node:path'

const read = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8')

describe('work ledger trust boundaries', () => {
  it('requires scoped API auth and cron auth', () => {
    const evidence = read('app/api/v2/work-ledger/evidence/route.ts')
    const reconstruct = read('app/api/v2/work-ledger/reconstruct/route.ts')
    const scheduled = read('app/api/scheduled/work-ledger-reconstruct/route.ts')

    for (const route of [evidence, reconstruct]) {
      assert.match(route, /withApiAuth/)
      assert.match(route, /work-ledger:write/)
    }
    assert.ok(scheduled.indexOf('verifyCronAuth') < scheduled.indexOf('createServerClient'))
  })

  it('ships RLS and append-only enforcement in the migration', () => {
    const migration = read('lib/db/migrations/0005_work_ledger_core.sql')
    for (const table of [
      'work_evidence',
      'work_sessions',
      'work_session_evidence',
      'work_session_corrections',
      'work_inference_rules',
      'work_capture_devices',
    ]) {
      assert.match(migration, new RegExp(`ALTER TABLE "${table}" ENABLE ROW LEVEL SECURITY`))
    }
    assert.match(migration, /work_evidence_prevent_update/)
    assert.match(migration, /work_evidence_prevent_delete/)
    assert.match(migration, /UNIQUE NULLS NOT DISTINCT/)
  })

  it('does not introduce outbound communication', () => {
    const files = [
      'lib/work-ledger/actions.ts',
      'lib/work-ledger/repository.ts',
      'app/api/scheduled/work-ledger-reconstruct/route.ts',
    ]
      .map(read)
      .join('\n')
    assert.doesNotMatch(files, /sendEmail|sendSms|sendDeveloperAlert|createNotification/)
  })
})
