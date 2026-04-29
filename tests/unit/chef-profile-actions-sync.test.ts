import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const source = readFileSync(resolve(process.cwd(), 'lib/ai/chef-profile-actions.ts'), 'utf-8')
const contractSource = readFileSync(
  resolve(process.cwd(), 'lib/sync/mutation-sync-contracts.ts'),
  'utf-8'
)

test('culinary profile saves use the mutation sync contract', () => {
  assert.match(source, /getMutationSyncPlan\('chef_culinary_profiles'/)
  assert.match(source, /revalidatePath\(route\.path/)
  assert.match(source, /revalidateTag\(materializeTag\(tag, input\.chefId\)\)/)
  assert.match(source, /invalidateRemyContextCache\(input\.tenantId\)/)

  assert.match(contractSource, /path: '\/settings\/culinary-profile'/)
  assert.match(contractSource, /path: '\/chef\/\[slug\]'/)
  assert.match(contractSource, /path: '\/chef\/\[slug\]\/inquire'/)
  assert.match(contractSource, /path: '\/book\/\[chefSlug\]'/)
  assert.match(contractSource, /'chef-booking-profile'/)
  assert.match(contractSource, /'chef-layout:\{chefId\}'/)
})

test('culinary profile saves broadcast tenant-scoped live mutations', () => {
  const saveStart = source.indexOf('export async function saveCulinaryProfileAnswer')
  const bulkStart = source.indexOf('export async function saveCulinaryProfileBulk')
  const promptStart = source.indexOf('export async function getCulinaryProfileForPrompt')

  assert.ok(saveStart >= 0, 'single-answer save action must exist')
  assert.ok(bulkStart > saveStart, 'bulk save action must exist after single-answer save action')
  assert.ok(promptStart > bulkStart, 'prompt getter must exist after bulk save action')

  const singleSaveSource = source.slice(saveStart, bulkStart)
  const bulkSaveSource = source.slice(bulkStart, promptStart)

  for (const actionSource of [singleSaveSource, bulkSaveSource]) {
    assert.match(actionSource, /syncCulinaryProfileMutation\(/)
  }

  assert.match(source, /broadcastTenantMutation\(input\.tenantId/)
  assert.match(source, /entity: plan\.liveEntities\[0\] \?\? plan\.entity/)
  assert.match(source, /action: 'mutation'/)
  assert.match(source, /source: 'mutation'/)
  assert.match(source, /catch \(err\)/)
})
