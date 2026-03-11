import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  DEFAULT_PRIMARY_SHORTCUT_HREFS,
  ensureRequiredPrimaryShortcutHrefs,
  mobileTabItems,
  resolveStandaloneTop,
} from '@/components/navigation/nav-config'
import { LEGACY_DEFAULT_PRIMARY_SHORTCUT_HREFS } from '@/lib/navigation/primary-shortcuts'

describe('navigation primary shortcuts', () => {
  it('ships the approved default shortcut order', () => {
    assert.deepEqual(DEFAULT_PRIMARY_SHORTCUT_HREFS, [
      '/dashboard',
      '/inbox',
      '/clients',
      '/inquiries',
      '/quotes',
      '/schedule',
      '/events',
      '/menus',
      '/recipes',
      '/communications',
      '/inventory',
      '/documents',
      '/finance/invoices',
    ])
  })

  it('re-inserts menus for legacy saved shortcut layouts', () => {
    const shortcuts = resolveStandaloneTop(['/dashboard', '/inbox', '/events'])

    assert.deepEqual(
      shortcuts.map((item) => item.href),
      ['/dashboard', '/inbox', '/events', '/menus']
    )
  })

  it('normalizes saved hrefs so menus cannot disappear', () => {
    assert.deepEqual(
      ensureRequiredPrimaryShortcutHrefs(['/dashboard', '/dashboard', '/clients']),
      ['/dashboard', '/dashboard', '/clients', '/menus']
    )
  })

  it('falls back to the approved default shortcut bar when no saved layout exists', () => {
    assert.deepEqual(
      resolveStandaloneTop().map((item) => item.href),
      DEFAULT_PRIMARY_SHORTCUT_HREFS
    )
  })

  it('upgrades the legacy platform default bar to the approved bar', () => {
    assert.deepEqual(
      resolveStandaloneTop([...LEGACY_DEFAULT_PRIMARY_SHORTCUT_HREFS]).map((item) => item.href),
      DEFAULT_PRIMARY_SHORTCUT_HREFS
    )
  })

  it('shows menus in the mobile tab bar', () => {
    assert.ok(mobileTabItems.some((item) => item.href === '/menus'))
    assert.equal(mobileTabItems[1]?.href, '/menus')
  })
})
