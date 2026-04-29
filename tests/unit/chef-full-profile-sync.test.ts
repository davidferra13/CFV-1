import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const source = readFileSync(resolve(process.cwd(), 'lib/chef/profile-actions.ts'), 'utf-8')
const contractSource = readFileSync(
  resolve(process.cwd(), 'lib/sync/mutation-sync-contracts.ts'),
  'utf-8'
)

test('chef full profile mutations execute the shared profile sync contract', () => {
  assert.match(source, /getMutationSyncPlan\('chef_profile_contexts'/)
  assert.match(source, /revalidatePath\(route\.path, route\.type\)/)
  assert.match(source, /revalidateTag\(materializeSyncTag\(tag, input\.chefId\)\)/)
  assert.match(source, /invalidateRemyContextCache\(input\.tenantId\)/)
  assert.match(source, /broadcastTenantMutation\(input\.tenantId/)
  assert.match(source, /entity: plan\.liveEntities\[0\] \?\? plan\.entity/)
  assert.match(source, /action: 'mutation'/)
  assert.match(source, /source: 'mutation'/)
})

test('profile sync contract targets real cache tags and public profile surfaces', () => {
  assert.match(contractSource, /path: '\/settings\/my-profile'/)
  assert.match(contractSource, /path: '\/settings\/public-profile'/)
  assert.match(contractSource, /path: '\/chef\/\[slug\]'/)
  assert.match(contractSource, /path: '\/remy'/)
  assert.match(contractSource, /'chef-layout-\{chefId\}'/)
  assert.match(contractSource, /'chef-profile-context-\{chefId\}'/)
  assert.doesNotMatch(contractSource, /chef-layout:\{chefId\}/)
})

test('all chef profile write actions call the profile sync helper', () => {
  const actions = [
    ['updateChefFullProfile', 'updateRestaurantGroupName'],
    ['updateRestaurantGroupName', 'getRestaurantGroupName'],
    ['uploadChefLogo', 'removeChefLogo'],
    ['removeChefLogo', 'markOnboardingComplete'],
  ] as const

  for (const [startName, endName] of actions) {
    const start = source.indexOf(`export async function ${startName}`)
    const end = source.indexOf(`export async function ${endName}`, start + 1)
    assert.ok(start >= 0, `${startName} must exist`)
    assert.ok(end > start, `${endName} must appear after ${startName}`)
    const section = source.slice(start, end)
    assert.match(section, /syncChefProfileMutation\(/, `${startName} must sync profile mutations`)
  }
})
