// Acceptance tests for Amendment 2 of docs/chef-navigation-decision-contract.md
// (the comfort model: hide by archetype, delete nothing).
//
// These lock the three things that are easy to regress: the route inventory,
// full route ownership, and archetype presets that actually differ.
import test from 'node:test'
import assert from 'node:assert/strict'

import { standaloneTop, navGroups, hiddenNavItems } from '@/components/navigation/nav-config'
import {
  ARCHETYPES,
  applyModuleOverrides,
  diffModulesAgainstPreset,
  normalizeModuleOverrides,
  resolveModulesForArchetypeSwitch,
} from '@/lib/archetypes/presets'
import { MODULES } from '@/lib/billing/modules'
import {
  CORE_OWNER,
  NAV_GROUP_OWNER,
  getRouteOwner,
  isNavGroupEnabled,
} from '@/lib/surfaces/route-module-ownership'

function allNavHrefs(): string[] {
  const hrefs: string[] = []
  for (const item of standaloneTop as any[]) {
    hrefs.push(item.href)
    for (const sub of item.subMenu ?? []) hrefs.push(sub.href)
  }
  for (const group of navGroups as any[]) {
    for (const item of group.items ?? []) {
      hrefs.push(item.href)
      for (const child of item.children ?? []) hrefs.push(child.href)
    }
  }
  for (const group of hiddenNavItems as any[]) {
    for (const item of group.items ?? []) hrefs.push(item.href)
  }
  return [...new Set(hrefs)]
}

test('the chef nav route inventory does not shrink', () => {
  // Cardinality lock. Hiding is a default, never a deletion. If this number
  // goes DOWN, routes were removed and that breaks the amendment. If it goes
  // UP, routes were added: raise the floor here on purpose.
  assert.ok(
    allNavHrefs().length >= 470,
    `chef nav inventory fell to ${allNavHrefs().length}, floor is 470`
  )
})

test('every chef nav route has exactly one owner', () => {
  const unowned = allNavHrefs().filter((href) => getRouteOwner(href) === undefined)
  assert.deepEqual(unowned, [], `unowned routes cannot be hidden by any toggle: ${unowned.join(' ')}`)
})

test('every owner is a real module slug or the core owner', () => {
  const slugs = new Set(MODULES.map((m) => m.slug))
  for (const href of allNavHrefs()) {
    const owner = getRouteOwner(href)!
    assert.ok(owner === CORE_OWNER || slugs.has(owner), `${href} claims unknown owner "${owner}"`)
  }
  for (const [groupId, owner] of Object.entries(NAV_GROUP_OWNER)) {
    assert.ok(
      owner === CORE_OWNER || slugs.has(owner),
      `nav group ${groupId} claims unknown owner "${owner}"`
    )
  }
})

test('the escape hatches are never hidden by a module toggle', () => {
  for (const href of ['/settings', '/settings/modules', '/help', '/inbox', '/dashboard']) {
    assert.equal(getRouteOwner(href), CORE_OWNER, `${href} must stay reachable`)
  }
  assert.equal(isNavGroupEnabled('tools', []), true, 'the tools group is the way back')
})

test('archetypes are not all the same, and none enables everything', () => {
  const sets = ARCHETYPES.map((a) => [...new Set(a.enabledModules)].sort().join(','))
  assert.ok(new Set(sets).size > 1, 'all archetypes share one module set, which is the old defect')
  for (const a of ARCHETYPES) {
    assert.ok(
      new Set(a.enabledModules).size < MODULES.length,
      `${a.id} enables every module, which is the old defect`
    )
  }
})

test('every archetype keeps the five core modules', () => {
  for (const a of ARCHETYPES) {
    for (const core of ['dashboard', 'events', 'culinary', 'clients', 'finance']) {
      assert.ok(a.enabledModules.includes(core), `${a.id} is missing core module ${core}`)
    }
  }
})

test('switching archetype preserves a module the chef turned on', () => {
  const next = resolveModulesForArchetypeSwitch({
    previousArchetype: 'private-chef',
    previousEnabledModules: [
      ...ARCHETYPES.find((a) => a.id === 'private-chef')!.enabledModules,
      'commerce',
    ],
    nextArchetype: 'caterer',
  })
  assert.ok(next.includes('commerce'), 'a module the chef switched on must survive the switch')
})

test('switching archetype preserves a module the chef turned off', () => {
  const privateChef = ARCHETYPES.find((a) => a.id === 'private-chef')!
  const next = resolveModulesForArchetypeSwitch({
    previousArchetype: 'private-chef',
    previousEnabledModules: privateChef.enabledModules.filter((m) => m !== 'pipeline'),
    nextArchetype: 'caterer',
  })
  assert.ok(!next.includes('pipeline'), 'a module the chef switched off must stay off')
})

test('recorded overrides survive switching there and back', () => {
  // The chef is a private chef who turned the register on and the sales
  // pipeline off. Their toggles are recorded as a deviation when they save, so
  // a trip through another archetype and back returns their own set exactly.
  const privateChef = ARCHETYPES.find((a) => a.id === 'private-chef')!
  const mine = [...privateChef.enabledModules.filter((m) => m !== 'pipeline'), 'commerce']

  const overrides = diffModulesAgainstPreset('private-chef', mine)
  assert.deepEqual(overrides, { on: ['commerce'], off: ['pipeline'] })

  const asRestaurant = applyModuleOverrides('restaurant', overrides)
  assert.ok(asRestaurant.includes('commerce'))
  assert.ok(!asRestaurant.includes('pipeline'))

  const backHome = applyModuleOverrides('private-chef', overrides)
  assert.deepEqual([...backHome].sort(), [...new Set(mine)].sort())
})

test('inference keeps a single switch honest when no overrides are recorded', () => {
  // Fallback path for a database that has not taken the overrides migration.
  // One switch preserves both directions; that is what it can promise.
  const privateChef = ARCHETYPES.find((a) => a.id === 'private-chef')!
  const next = resolveModulesForArchetypeSwitch({
    previousArchetype: 'private-chef',
    previousEnabledModules: [
      ...privateChef.enabledModules.filter((m) => m !== 'pipeline'),
      'commerce',
    ],
    nextArchetype: 'caterer',
  })
  assert.ok(next.includes('commerce'))
  assert.ok(!next.includes('pipeline'))
})

test('an empty override set leaves the preset alone', () => {
  assert.deepEqual(
    applyModuleOverrides('caterer', { on: [], off: [] }).sort(),
    [...new Set(ARCHETYPES.find((a) => a.id === 'caterer')!.enabledModules)].sort()
  )
})

test('garbage in the overrides column cannot break the resolution', () => {
  assert.deepEqual(normalizeModuleOverrides(null), { on: [], off: [] })
  assert.deepEqual(normalizeModuleOverrides({ on: 'commerce' }), { on: [], off: [] })
  assert.deepEqual(normalizeModuleOverrides({ on: ['a', 'a', 2], off: null }), {
    on: ['a'],
    off: [],
  })
})

test('a first-time chef with no previous archetype just gets the preset', () => {
  const next = resolveModulesForArchetypeSwitch({
    previousArchetype: null,
    previousEnabledModules: ['commerce', 'more', 'protection', 'social-hub'],
    nextArchetype: 'private-chef',
  })
  assert.deepEqual(
    [...next].sort(),
    [...new Set(ARCHETYPES.find((a) => a.id === 'private-chef')!.enabledModules)].sort()
  )
})
