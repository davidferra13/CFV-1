import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  CURRENT_ARCHETYPE_PRIMARY_NAV_HREFS,
  DEFAULT_PRIMARY_SHORTCUT_HREFS,
  LEGACY_ARCHETYPE_PRIMARY_NAV_HREFS,
  LEGACY_DEFAULT_PRIMARY_SHORTCUT_HREFS,
  isLegacyPrimaryNavHrefs,
  upgradeLegacyPrimaryNavHrefs,
} from '@/lib/navigation/primary-shortcuts'

describe('primary nav rollout', () => {
  it('upgrades the legacy platform default to the approved shortcut bar', () => {
    assert.deepEqual(
      upgradeLegacyPrimaryNavHrefs(LEGACY_DEFAULT_PRIMARY_SHORTCUT_HREFS),
      DEFAULT_PRIMARY_SHORTCUT_HREFS
    )
  })

  it('upgrades exact legacy archetype presets to their current versions', () => {
    assert.deepEqual(
      upgradeLegacyPrimaryNavHrefs(LEGACY_ARCHETYPE_PRIMARY_NAV_HREFS['private-chef']),
      CURRENT_ARCHETYPE_PRIMARY_NAV_HREFS['private-chef']
    )
  })

  it('preserves custom shortcut bars that do not match a legacy preset exactly', () => {
    const custom = ['/dashboard', '/quotes', '/inventory', '/documents']
    assert.deepEqual(upgradeLegacyPrimaryNavHrefs(custom), custom)
  })

  it('flags only exact legacy layouts for rollout backfill', () => {
    assert.equal(isLegacyPrimaryNavHrefs(LEGACY_DEFAULT_PRIMARY_SHORTCUT_HREFS), true)
    assert.equal(isLegacyPrimaryNavHrefs(['/dashboard', '/quotes', '/inventory']), false)
  })
})
