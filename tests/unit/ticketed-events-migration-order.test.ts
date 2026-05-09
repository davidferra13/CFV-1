import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { DB_BOOT_CONTRACT_OBJECTS } from '@/lib/db/boot-contract'

const migrationsDir = join(process.cwd(), 'database', 'migrations')

function migrationFiles() {
  return readdirSync(migrationsDir)
    .filter((file) => file.endsWith('.sql'))
    .sort()
}

function readMigration(file: string) {
  return readFileSync(join(migrationsDir, file), 'utf8')
}

function firstMigrationIndexMatching(pattern: RegExp) {
  return migrationFiles().findIndex((file) => pattern.test(readMigration(file)))
}

test('event_share_settings exists before ticketing migrations depend on it', () => {
  const createIndex = firstMigrationIndexMatching(
    /CREATE\s+TABLE\s+IF\s+NOT\s+EXISTS\s+(?:public\.)?event_share_settings/i
  )
  const alterIndex = firstMigrationIndexMatching(
    /ALTER\s+TABLE\s+(?:public\.)?event_share_settings/i
  )

  assert.notEqual(createIndex, -1, 'event_share_settings must be created by a migration')
  assert.notEqual(alterIndex, -1, 'ticketing migrations should alter event_share_settings')
  assert.ok(
    createIndex <= alterIndex,
    'event_share_settings must be created before any migration alters it'
  )
})

test('ticketed event tables are part of the live DB boot contract', () => {
  const contractIds = new Set(DB_BOOT_CONTRACT_OBJECTS.map((object) => object.id))

  assert.ok(contractIds.has('public.event_share_settings'))
  assert.ok(contractIds.has('public.event_ticket_types'))
  assert.ok(contractIds.has('public.event_tickets'))
})
