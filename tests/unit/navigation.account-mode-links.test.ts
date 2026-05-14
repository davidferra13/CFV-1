import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import fs from 'node:fs'
import path from 'node:path'
import {
  actionBarItems,
  mobileTabItems,
  standaloneBottom,
} from '@/components/navigation/nav-config'
import { getRouteAccountMode, getRoutePolicyDecisionForRole } from '@/lib/auth/route-policy'

function readClientGuestNavHrefs(): string[] {
  const source = fs.readFileSync(
    path.join(process.cwd(), 'components/navigation/client-nav.tsx'),
    'utf8'
  )
  const navStart = source.indexOf('const navItems = [')
  const navEnd = source.indexOf('type ClientSidebarContextType')
  assert.notEqual(navStart, -1)
  assert.notEqual(navEnd, -1)

  const navSource = source.slice(navStart, navEnd)
  const hrefs = [...navSource.matchAll(/href: '([^']+)'/g)].map((match) => match[1])
  return ['/book-now', ...hrefs].sort()
}

describe('account-mode navigation links', () => {
  it('keeps chef workspace navigation out of guest-only routes', () => {
    const chefHrefs = [
      ...standaloneBottom.map((item) => item.href),
      ...mobileTabItems.map((item) => item.href),
      ...actionBarItems.map((item) => item.href),
    ]

    for (const href of chefHrefs) {
      const mode = getRouteAccountMode(href)
      const decision = getRoutePolicyDecisionForRole(href, 'chef')

      assert.notEqual(mode, 'guest', href)
      assert.equal(decision.allowed, true, href)
    }
  })

  it('keeps guest mode navigation out of chef workspace routes', () => {
    for (const href of readClientGuestNavHrefs()) {
      const mode = getRouteAccountMode(href)
      const decision = getRoutePolicyDecisionForRole(href, 'client')

      assert.notEqual(mode, 'chef_workspace', href)
      assert.equal(decision.allowed, true, href)
    }
  })
})
