import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const source = readFileSync(resolve(process.cwd(), 'lib/ai/chef-profile-actions.ts'), 'utf-8')

test('culinary profile saves invalidate public and profile caches', () => {
  assert.match(source, /revalidatePath\('\/settings\/culinary-profile'\)/)
  assert.match(source, /revalidatePath\('\/chef\/\[slug\]', 'page'\)/)
  assert.match(source, /revalidatePath\('\/chef\/\[slug\]\/inquire', 'page'\)/)
  assert.match(source, /revalidatePath\('\/book\/\[chefSlug\]', 'page'\)/)
  assert.match(source, /revalidateTag\('chef-booking-profile'\)/)
  assert.match(source, /revalidateTag\(`chef-layout-\$\{user\.entityId\}`\)/)
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
    assert.match(actionSource, /broadcastTenantMutation\(user\.entityId/)
    assert.match(actionSource, /entity: 'chef_culinary_profiles'/)
    assert.match(actionSource, /action: 'mutation'/)
    assert.match(actionSource, /source: 'mutation'/)
    assert.match(actionSource, /catch \(err\)/)
  }
})
