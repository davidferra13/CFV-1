import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'

const actions = readFileSync('lib/clients/account-deletion-actions.ts', 'utf8')
const types = readFileSync('lib/clients/account-deletion-types.ts', 'utf8')
const form = readFileSync(
  'app/(client)/my-profile/delete-account/delete-account-form.tsx',
  'utf8'
)
const purgeRoute = readFileSync('app/api/cron/account-purge/route.ts', 'utf8')

test('client deletion server actions export only async actions', () => {
  assert.match(actions, /^'use server'/)
  assert.doesNotMatch(actions, /\bexport\s+(interface|type|const|class)\b/)
  assert.match(types, /export interface ClientDeletionStatus/)
  assert.match(form, /@\/lib\/clients\/account-deletion-types/)
})

test('client data export fails loudly and scopes tenant-aware queries', () => {
  assert.match(actions, /async function readRequiredData/)
  assert.match(actions, /throw new Error\(`Failed to export \$\{label\}\.`\)/)
  assert.match(actions, /function requireClientTenant/)
  assert.match(actions, /function scopeTenant/)
  assert.doesNotMatch(actions, /function maybeScopeTenant/)
  assert.doesNotMatch(actions, /user\.tenantId\s*\|\|\s*client\.tenant_id/)
  assert.doesNotMatch(actions, /return tenantId \? query\.eq\('tenant_id', tenantId\) : query/)
  assert.doesNotMatch(actions, /events:\s*events\s*\|\|\s*\[\]/)
  assert.doesNotMatch(actions, /messages\s*=\s*msgs\s*\|\|\s*\[\]/)
})

test('client deletion actions write required deletion audit records', () => {
  assert.match(actions, /account_deletion_audit/)
  assert.match(actions, /action: 'deletion_requested'/)
  assert.match(actions, /action: 'deletion_cancelled'/)
  assert.match(actions, /action: 'data_exported'/)
})

test('client purge uses deterministic tombstone emails instead of null emails', () => {
  assert.match(purgeRoute, /function tombstoneClientEmail/)
  assert.match(purgeRoute, /email: tombstoneClientEmail\(client\.id\)/)
  assert.doesNotMatch(purgeRoute, /email:\s*null/)
})

test('client purge fails loudly when pending client lookup fails', () => {
  assert.match(purgeRoute, /throw new Error\('Failed to query pending client deletions'\)/)
  assert.doesNotMatch(purgeRoute, /Don't throw; chef purges already ran successfully/)
})

test('client purge scopes destructive client cleanup by tenant', () => {
  const tenantScopedDeletes = [
    'client_notes',
    'client_photos',
    'client_taste_profiles',
    'client_kitchen_inventory',
    'client_meal_requests',
    'client_intake_responses',
    'client_allergy_records',
  ]

  for (const table of tenantScopedDeletes) {
    assert.match(
      purgeRoute,
      new RegExp(`from\\('${table}'\\)[\\s\\S]*?delete\\(\\)[\\s\\S]*?eq\\('client_id', client\\.id\\)[\\s\\S]*?eq\\('tenant_id', tenantId\\)`)
    )
  }
})

test('client purge marks deleted only after related cleanup and avoids unsupported auth_users writes', () => {
  const notesPurgeIndex = purgeRoute.indexOf("'Client notes purge'")
  const markerIndex = purgeRoute.indexOf("'Client deletion marker'")

  assert.ok(notesPurgeIndex > -1)
  assert.ok(markerIndex > notesPurgeIndex)
  assert.doesNotMatch(purgeRoute, /from\('auth_users'\)/)
})
