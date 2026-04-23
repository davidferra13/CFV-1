import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  DEFAULT_PRIMARY_SHORTCUT_HREFS,
  MOBILE_TAB_OPTIONS,
  actionBarItems,
  createDropdownItems,
  getPrimaryShortcutOptions,
  mobileTabItems,
  navGroups,
  standaloneTop,
} from '@/components/navigation/nav-config'

const TARGET_PRIMARY_HREFS = [
  '/dashboard',
  '/inbox',
  '/inquiries',
  '/events',
  '/culinary',
  '/clients',
  '/finance',
]

const DEMOTED_PRIMARY_HREFS = [
  '/operations',
  '/growth',
  '/circles',
  '/analytics',
  '/marketing',
  '/social',
  '/network',
  '/inventory',
  '/vendors',
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
  it('uses the canonical Today to Money primary nav defaults', () => {
    assert.deepEqual(DEFAULT_PRIMARY_SHORTCUT_HREFS, TARGET_PRIMARY_HREFS)
    assert.deepEqual(
      standaloneTop.map((item) => item.href),
      TARGET_PRIMARY_HREFS
    )

    const labelsByHref = new Map(standaloneTop.map((item) => [item.href, item.label]))
    assert.equal(labelsByHref.get('/dashboard'), 'Today')
    assert.equal(labelsByHref.get('/inquiries'), 'Pipeline')
    assert.equal(labelsByHref.get('/finance'), 'Money')
  })

  it('keeps demoted clusters out of primary nav defaults', () => {
    const primaryHrefs = new Set(DEFAULT_PRIMARY_SHORTCUT_HREFS)

    for (const href of DEMOTED_PRIMARY_HREFS) {
      assert.equal(primaryHrefs.has(href), false, `${href} must not be a primary default`)
    }
  })

  it('aligns the action bar to six active-work shortcuts', () => {
    assert.deepEqual(
      actionBarItems.map((item) => item.href),
      ['/dashboard', '/inbox', '/inquiries', '/events', '/culinary', '/finance']
    )
    assert.equal(actionBarItems.some((item) => item.href === '/clients'), false)
  })

  it('uses service-day mobile defaults with Pipeline and without Clients', () => {
    assert.deepEqual(
      mobileTabItems.map((item) => item.href),
      ['/dashboard', '/inbox', '/inquiries', '/events', '/daily']
    )
    assert.equal(mobileTabItems.some((item) => item.href === '/clients'), false)

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
      exportedSurfaceHrefs.includes('/social/compose'),
      false,
      '/social/compose must stay event-context only'
    )
  })
})
