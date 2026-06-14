import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import {
  actionBarItems,
  createDropdownItems,
  navGroups,
  standaloneBottom,
} from '@/components/navigation/nav-config'

describe('Navigation regression guard', () => {
  const actionBarHrefs = new Set(actionBarItems.map((i) => i.href))
  const allNavGroupHrefs = new Set(
    navGroups.flatMap((g) =>
      g.items.flatMap((item) => [item.href, ...(item.children?.map((c) => c.href) ?? [])])
    )
  )
  const bottomHrefs = new Set(standaloneBottom.map((i) => i.href))
  const createHrefs = new Set(createDropdownItems.map((i) => i.href))
  const allHrefs = new Set([...actionBarHrefs, ...allNavGroupHrefs, ...bottomHrefs, ...createHrefs])

  it('Action Bar contains critical daily-driver items', () => {
    const required = ['/dashboard', '/inbox', '/inquiries', '/events', '/circles']
    for (const href of required) {
      assert.ok(actionBarHrefs.has(href), `Action Bar missing: ${href}`)
    }
  })

  it('Tables is preserved as a bottom social-zone entry point', () => {
    assert.ok(bottomHrefs.has('/tables'), 'standaloneBottom missing /tables')
  })

  it('Cannabis Portal is preserved as a bottom tier entry point', () => {
    assert.ok(bottomHrefs.has('/events/cannabis'), 'standaloneBottom missing /events/cannabis')
  })

  it('Cannabis Portal bottom visibility excludes VIP-only privileged access', () => {
    const chefNavSource = readFileSync('components/navigation/chef-nav.tsx', 'utf8')
    const layoutCacheSource = readFileSync('lib/chef/layout-data-cache.ts', 'utf8')

    const visibilityMatch = chefNavSource.match(/const showCannabisRailLink = Boolean\(([^)]*)\)/)
    assert.ok(visibilityMatch, 'showCannabisRailLink condition missing')
    assert.ok(
      !visibilityMatch[1]?.includes('isPrivileged'),
      'Cannabis Portal rail link must not show for VIP-only privileged users'
    )
    assert.ok(
      !visibilityMatch[1]?.includes('cannabisRailActive'),
      'Cannabis Portal rail link must not show from URL state alone'
    )
    assert.ok(
      layoutCacheSource.includes('if (await hasAdminAccess(authUserId)) return true'),
      'cached cannabis access should auto-grant only admin/owner access'
    )
    assert.ok(
      !layoutCacheSource.includes('hasPersistedAdminAccessForAuthUser'),
      'cached cannabis access must not use VIP-inclusive persisted admin access'
    )
    assert.ok(
      layoutCacheSource.includes('cannabis-access-admin-tier-v2'),
      'cached cannabis access key should be versioned after narrowing VIP access'
    )
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
      '/tables',
      '/events/cannabis',
      '/circles',
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
