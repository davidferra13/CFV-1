import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { ARCHETYPES } from '@/lib/archetypes/presets'
import { DEFAULT_PRIMARY_SHORTCUT_HREFS } from '@/lib/navigation/primary-shortcuts'

describe('archetype nav presets', () => {
  it('keeps the approved baseline shortcuts across all archetypes', () => {
    for (const archetype of ARCHETYPES) {
      for (const href of DEFAULT_PRIMARY_SHORTCUT_HREFS) {
        assert.ok(
          archetype.primaryNavHrefs.includes(href),
          `${archetype.id} is missing ${href} from primary nav`
        )
      }
    }
  })

  it('adds context-specific shortcuts for each archetype', () => {
    const byId = new Map(ARCHETYPES.map((archetype) => [archetype.id, archetype]))

    assert.ok(byId.get('private-chef')?.primaryNavHrefs.includes('/travel'))
    assert.ok(byId.get('caterer')?.primaryNavHrefs.includes('/staff'))
    assert.ok(byId.get('meal-prep')?.primaryNavHrefs.includes('/production'))
    assert.ok(byId.get('restaurant')?.primaryNavHrefs.includes('/commerce/register'))
    assert.ok(byId.get('food-truck')?.primaryNavHrefs.includes('/travel'))
    assert.ok(byId.get('bakery')?.primaryNavHrefs.includes('/bakery/production'))
  })
})
