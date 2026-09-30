import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import {
  DEFAULT_PRIMARY_SHORTCUT_HREFS,
  MOBILE_TAB_OPTIONS,
  actionBarItems,
  createDropdownItems,
  getPrimaryShortcutOptions,
  mobileTabItems,
  navGroups,
  resolveActionBarItems,
  standaloneTop,
} from '@/components/navigation/nav-config'
import { ARCHETYPES } from '@/lib/archetypes/presets'

const TARGET_PRIMARY_HREFS = [
  '/dashboard',
  '/calendar',
  '/events',
  '/clients',
  '/menus',
  '/inbox',
  '/finance',
]

const DEMOTED_PRIMARY_HREFS = [
  '/ops',
  '/circles',
  '/analytics',
  '/marketing',
  '/marketing/social',
  '/network',
  '/inventory',
  '/vendors',
  '/inquiries',
  '/culinary',
  '/daily',
]

function collectNavGroupHrefs() {
  const hrefs: string[] = []

  for (const group of navGroups) {
    for (const item of group.items) {
      hrefs.push(item.href)
      for (const child of item.children ?? []) {
        hrefs.push(child.href)
      }
    }
  }

  return hrefs
}

describe('chef nav priority defaults', () => {
  it('uses the September comfort-model daily-driver fallback', () => {
    assert.deepEqual(DEFAULT_PRIMARY_SHORTCUT_HREFS, TARGET_PRIMARY_HREFS)
    assert.deepEqual(
      standaloneTop.map((item) => item.href),
      TARGET_PRIMARY_HREFS
    )

    const labelsByHref = new Map(standaloneTop.map((item) => [item.href, item.label]))
    assert.equal(labelsByHref.get('/dashboard'), 'Today')
    assert.equal(labelsByHref.get('/events'), 'Dinners')
    assert.equal(labelsByHref.get('/finance'), 'Finance')
  })

  it('keeps demoted clusters out of primary nav defaults', () => {
    const primaryHrefs = new Set(DEFAULT_PRIMARY_SHORTCUT_HREFS)

    for (const href of DEMOTED_PRIMARY_HREFS) {
      assert.equal(primaryHrefs.has(href), false, `${href} must not be a primary default`)
    }
  })

  it('uses the same seven daily drivers as the fallback action bar', () => {
    assert.deepEqual(
      actionBarItems.map((item) => item.href),
      TARGET_PRIMARY_HREFS
    )
  })

  it('resolves every archetype primary shortcut list in its saved order', () => {
    for (const archetype of ARCHETYPES) {
      assert.deepEqual(
        resolveActionBarItems(archetype.primaryNavHrefs).map((item) => item.href),
        [...new Set(archetype.primaryNavHrefs)].slice(0, TARGET_PRIMARY_HREFS.length),
        `${archetype.id} primary shortcuts must render exactly as configured`
      )
    }
  })

  it('wires saved primary shortcuts into both desktop and mobile navigation', () => {
    const actionBarSource = readFileSync('components/navigation/action-bar.tsx', 'utf8')
    const desktopSource = readFileSync('components/navigation/chef-nav.tsx', 'utf8')
    const mobileSource = readFileSync('components/navigation/chef-mobile-nav.tsx', 'utf8')

    assert.match(actionBarSource, /resolveActionBarItems\(primaryNavHrefs\)/)
    assert.match(desktopSource, /primaryNavHrefs=\{primaryNavHrefs\}/)
    assert.match(mobileSource, /resolveActionBarItems\(primaryNavHrefs\)/)
  })

  it('uses five mobile daily drivers without a second Today screen', () => {
    assert.deepEqual(
      mobileTabItems.map((item) => item.href),
      ['/dashboard', '/calendar', '/events', '/inbox', '/clients']
    )
    assert.equal(
      mobileTabItems.some((item) => item.href === '/daily'),
      false
    )

    const optionHrefs = new Set(MOBILE_TAB_OPTIONS.map((item) => item.href))
    for (const href of [
      '/clients',
      '/culinary',
      '/calendar',
      '/menus',
      '/recipes',
      '/finance',
      '/culinary/prep/shopping',
      '/settings',
    ]) {
      assert.equal(optionHrefs.has(href), true, `${href} must remain a mobile option`)
    }
  })

  it('does not export the broken standalone social compose route', () => {
    const exportedSurfaceHrefs = [
      ...standaloneTop.flatMap((item) => [
        item.href,
        ...(item.subMenu ?? []).map((child) => child.href),
      ]),
      ...actionBarItems.map((item) => item.href),
      ...createDropdownItems.map((item) => item.href),
      ...mobileTabItems.map((item) => item.href),
      ...MOBILE_TAB_OPTIONS.map((item) => item.href),
      ...collectNavGroupHrefs(),
      ...getPrimaryShortcutOptions().map((item) => item.href),
    ]

    assert.equal(
      exportedSurfaceHrefs.includes('/marketing/social/compose'),
      false,
      '/marketing/social/compose must stay event-context only'
    )
  })
})
