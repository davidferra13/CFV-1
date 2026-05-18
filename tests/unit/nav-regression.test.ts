import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { actionBarItems, navGroups, standaloneBottom } from '@/components/navigation/nav-config'

describe('Navigation regression guard', () => {
  const actionBarHrefs = new Set(actionBarItems.map((i) => i.href))
  const allNavGroupHrefs = new Set(
    navGroups.flatMap((g) =>
      g.items.flatMap((item) => [item.href, ...(item.children?.map((c) => c.href) ?? [])])
    )
  )
  const bottomHrefs = new Set(standaloneBottom.map((i) => i.href))
  const allHrefs = new Set([...actionBarHrefs, ...allNavGroupHrefs, ...bottomHrefs])

  it('Action Bar contains critical daily-driver items', () => {
    const required = [
      '/dashboard',
      '/inbox',
      '/autopilot',
      '/events',
      '/inquiries',
      '/clients',
      '/calendar',
      '/menus',
      '/recipes',
      '/finance',
      '/tasks',
      '/circles',
    ]
    for (const href of required) {
      assert.ok(actionBarHrefs.has(href), `Action Bar missing: ${href}`)
    }
  })

  it('Nav groups contain required feature categories', () => {
    const requiredGroupIds = [
      'pipeline',
      'events',
      'clients',
      'culinary',
      'finance',
      'operations',
      'supply-chain',
      'tools',
      'analytics',
      'marketing',
      'protection',
    ]
    const groupIds = new Set(navGroups.map((g) => g.id))
    for (const id of requiredGroupIds) {
      assert.ok(groupIds.has(id), `Nav group missing: ${id}`)
    }
  })

  it('Critical routes reachable from at least one nav surface', () => {
    const criticalRoutes = [
      '/dashboard',
      '/inbox',
      '/autopilot',
      '/events',
      '/events/upcoming',
      '/calendar',
      '/clients',
      '/recipes',
      '/menus',
      '/culinary',
      '/finance',
      '/inquiries',
      '/quotes',
      '/contracts',
      '/tasks',
      '/settings',
      '/circles',
      '/chat',
      '/notifications',
      '/expenses',
    ]
    for (const route of criticalRoutes) {
      assert.ok(allHrefs.has(route), `Route unreachable from nav: ${route}`)
    }
  })

  it('Every nav group has a module assignment', () => {
    for (const group of navGroups) {
      assert.ok(group.module, `Nav group "${group.id}" has no module`)
    }
  })

  it('No nav group is empty after hidden-item filtering', () => {
    for (const group of navGroups) {
      const visibleItems = group.items.filter((item) => !item.hidden)
      assert.ok(visibleItems.length > 0, `Nav group "${group.id}" has zero visible items`)
    }
  })

  it('standaloneBottom has Settings link', () => {
    assert.ok(bottomHrefs.has('/settings'), 'standaloneBottom missing /settings')
  })

  it('Action Bar item count stays within budget (max 20)', () => {
    assert.ok(
      actionBarItems.length <= 20,
      `Action Bar has ${actionBarItems.length} items, exceeds budget of 20`
    )
  })
})
