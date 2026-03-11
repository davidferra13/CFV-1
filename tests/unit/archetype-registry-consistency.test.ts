import { describe, it } from 'node:test'
import assert from 'node:assert/strict'

import { ARCHETYPES } from '@/lib/archetypes/presets'
import { getStarterTemplatesForArchetype } from '@/lib/archetypes/starter-templates'
import { getDashboardPrimaryAction } from '@/lib/archetypes/ui-copy'
import {
  ARCHETYPE_IDS,
  ARCHETYPE_REGISTRY,
  ARCHETYPE_REGISTRY_BY_ID,
} from '@/lib/archetypes/registry'
import { generateHACCPPlan } from '@/lib/haccp/templates'
import {
  CURRENT_ARCHETYPE_PRIMARY_NAV_HREFS,
  LEGACY_ARCHETYPE_PRIMARY_NAV_HREFS,
} from '@/lib/navigation/primary-shortcuts'

describe('archetype registry consistency', () => {
  it('keeps presets and primary shortcut maps aligned with the central registry ids', () => {
    const presetIds = ARCHETYPES.map((archetype) => archetype.id)
    const currentShortcutIds = Object.keys(CURRENT_ARCHETYPE_PRIMARY_NAV_HREFS).sort()
    const legacyShortcutIds = Object.keys(LEGACY_ARCHETYPE_PRIMARY_NAV_HREFS).sort()
    const registryIds = [...ARCHETYPE_IDS]

    assert.deepEqual(presetIds, registryIds)
    assert.deepEqual(currentShortcutIds, [...registryIds].sort())
    assert.deepEqual(legacyShortcutIds, [...registryIds].sort())
  })

  it('reuses registry primary actions, HACCP metadata, and starter template packs', () => {
    for (const archetype of ARCHETYPE_REGISTRY) {
      assert.deepEqual(getDashboardPrimaryAction(archetype.id), archetype.primaryAction)

      const plan = generateHACCPPlan(archetype.id)
      assert.ok(plan.planTitle.includes(archetype.haccp.label))
      assert.equal(plan.businessDescription, archetype.haccp.description)

      const templates = getStarterTemplatesForArchetype(archetype.id)
      assert.ok(templates.length > 0, `${archetype.id} should have starter templates`)
      assert.ok(
        templates.every((template) => template.archetypeId === archetype.id),
        `${archetype.id} pack should only contain templates for itself`
      )
    }
  })

  it('uses built route destinations for specialized archetype primary actions', () => {
    assert.equal(ARCHETYPE_REGISTRY_BY_ID.restaurant.primaryAction.href, '/guests/reservations')
    assert.equal(ARCHETYPE_REGISTRY_BY_ID.bakery.primaryAction.href, '/bakery/orders/new')
  })

  it('keeps preset labels and descriptions sourced from the registry', () => {
    for (const preset of ARCHETYPES) {
      const registry = ARCHETYPE_REGISTRY_BY_ID[preset.id]

      assert.equal(preset.label, registry.label)
      assert.equal(preset.description, registry.description)
      assert.equal(preset.emoji, registry.emoji)
    }
  })
})
