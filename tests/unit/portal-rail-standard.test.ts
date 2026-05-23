import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import {
  PORTAL_RAIL_STANDARD,
  getPortalRailOffsetClass,
  getPortalRailWidthClass,
  isPortalRouteActive,
} from '@/components/navigation/portal-rail-standard'
import {
  isAdminRoutePath,
  isChefRoutePath,
  isClientRoutePath,
  isPartnerRoutePath,
  isStaffRoutePath,
  isVendorRoutePath,
} from '@/lib/auth/route-policy'

const ROOT = join(__dirname, '..', '..')

function readWorkspaceFile(...parts: string[]) {
  return readFileSync(join(ROOT, ...parts), 'utf-8')
}

describe('Portal rail standard', () => {
  it('defines shared prominent desktop widths and matching content offsets', () => {
    assert.equal(PORTAL_RAIL_STANDARD.collapsedWidth, 'lg:w-20')
    assert.equal(PORTAL_RAIL_STANDARD.expandedWidth, 'lg:w-72')
    assert.equal(getPortalRailWidthClass(true), 'lg:w-20')
    assert.equal(getPortalRailWidthClass(false), 'lg:w-72')
    assert.equal(getPortalRailOffsetClass(true), 'lg:pl-20')
    assert.equal(getPortalRailOffsetClass(false), 'lg:pl-72')
  })

  it('matches parent routes without making sibling routes active', () => {
    assert.equal(isPortalRouteActive('/admin/events', '/admin/events'), true)
    assert.equal(isPortalRouteActive('/admin/events/evt_123', '/admin/events'), true)
    assert.equal(isPortalRouteActive('/admin/events-archive', '/admin/events'), false)
    assert.equal(isPortalRouteActive('/my-events/evt_123', '/my-events'), true)
    assert.equal(isPortalRouteActive('/my-events-old', '/my-events'), false)
  })

  it('keeps portal routes protected by server-side role policy', () => {
    assert.equal(isAdminRoutePath('/admin'), true)
    assert.equal(isChefRoutePath('/dashboard'), true)
    assert.equal(isClientRoutePath('/my-events/evt_123'), true)
    assert.equal(isStaffRoutePath('/staff-dashboard'), true)
    assert.equal(isPartnerRoutePath('/partner/locations'), true)
    assert.equal(isVendorRoutePath('/vendor/orders/po_123'), true)
  })

  it('keeps portal layouts gated by role guards', () => {
    assert.match(readWorkspaceFile('app', '(admin)', 'layout.tsx'), /requireAdmin\(/)
    assert.match(readWorkspaceFile('app', '(chef)', 'layout.tsx'), /requireChef\(/)
    assert.match(readWorkspaceFile('app', '(client)', 'layout.tsx'), /requireClient\(/)
    assert.match(readWorkspaceFile('app', '(staff)', 'layout.tsx'), /requireStaff\(/)
    assert.match(readWorkspaceFile('app', '(partner)', 'partner', 'layout.tsx'), /requirePartner\(/)
    assert.match(readWorkspaceFile('app', '(vendor)', 'vendor', 'layout.tsx'), /requireVendor\(/)
  })
})
