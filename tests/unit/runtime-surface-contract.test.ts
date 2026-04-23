// Runtime Surface Contract Tests
// Verifies layout markers, route roots, and surface ownership stay aligned.

import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import {
  SURFACE_CONTRACTS,
  getSurfaceContract,
  validateSurfaceAlignment,
} from '../../lib/surfaces/runtime-surface-contract'

const ROOT = join(__dirname, '..', '..')

describe('Runtime Surface Contract', () => {
  it('defines all 5 canonical surfaces', () => {
    const surfaces = SURFACE_CONTRACTS.map((c) => c.surface).sort()
    assert.deepStrictEqual(surfaces, ['admin', 'chef', 'client', 'partner', 'public'])
  })

  it('every surface has a unique portal marker', () => {
    const markers = SURFACE_CONTRACTS.map((c) => c.portalMarker)
    assert.strictEqual(markers.length, new Set(markers).size, 'Duplicate portal markers found')
  })

  it('every surface has a unique nav owner', () => {
    const owners = SURFACE_CONTRACTS.map((c) => c.navOwner)
    assert.strictEqual(owners.length, new Set(owners).size, 'Duplicate nav owners found')
  })

  it('admin surface contract says admin-nav, not chef-nav', () => {
    const admin = getSurfaceContract('admin')
    assert.ok(admin, 'Admin contract missing')
    assert.strictEqual(admin.navOwner, 'admin-nav')
    assert.strictEqual(admin.authGuard, 'requireAdmin')
    assert.strictEqual(admin.portalMarker, 'admin')
  })

  it('chef surface contract says chef-nav', () => {
    const chef = getSurfaceContract('chef')
    assert.ok(chef, 'Chef contract missing')
    assert.strictEqual(chef.navOwner, 'chef-nav')
    assert.strictEqual(chef.authGuard, 'requireChef')
  })

  it('validateSurfaceAlignment catches mismatched nav owner', () => {
    const err = validateSurfaceAlignment('admin', 'admin', 'chef-nav')
    assert.ok(err, 'Should return error for chef-nav on admin surface')
    assert.ok(err.includes('Nav owner mismatch'))
  })

  it('validateSurfaceAlignment passes for correct alignment', () => {
    const err = validateSurfaceAlignment('admin', 'admin', 'admin-nav')
    assert.strictEqual(err, null)
  })

  it('admin layout uses data-cf-portal="admin"', () => {
    const layoutPath = join(ROOT, 'app', '(admin)', 'layout.tsx')
    const content = readFileSync(layoutPath, 'utf-8')
    assert.ok(
      content.includes('data-cf-portal="admin"'),
      'Admin layout must have data-cf-portal="admin"'
    )
  })

  it('admin layout does NOT import ChefSidebar', () => {
    const layoutPath = join(ROOT, 'app', '(admin)', 'layout.tsx')
    const content = readFileSync(layoutPath, 'utf-8')
    assert.ok(
      !content.includes('ChefSidebar'),
      'Admin layout must not import ChefSidebar (use AdminSidebar)'
    )
  })

  it('admin layout does NOT import ChefMobileNav', () => {
    const layoutPath = join(ROOT, 'app', '(admin)', 'layout.tsx')
    const content = readFileSync(layoutPath, 'utf-8')
    assert.ok(
      !content.includes('ChefMobileNav'),
      'Admin layout must not import ChefMobileNav (use AdminMobileNav)'
    )
  })

  it('admin layout does NOT import ChefMainContent', () => {
    const layoutPath = join(ROOT, 'app', '(admin)', 'layout.tsx')
    const content = readFileSync(layoutPath, 'utf-8')
    assert.ok(
      !content.includes('ChefMainContent'),
      'Admin layout must not import ChefMainContent (use AdminMainContent)'
    )
  })

  it('admin layout imports from admin-shell', () => {
    const layoutPath = join(ROOT, 'app', '(admin)', 'layout.tsx')
    const content = readFileSync(layoutPath, 'utf-8')
    assert.ok(content.includes('admin-shell'), 'Admin layout must import from admin-shell')
  })

  it('chef layout uses data-cf-portal="chef"', () => {
    const layoutPath = join(ROOT, 'app', '(chef)', 'layout.tsx')
    const content = readFileSync(layoutPath, 'utf-8')
    assert.ok(
      content.includes('data-cf-portal="chef"'),
      'Chef layout must have data-cf-portal="chef"'
    )
  })

  it('root layouts publish surface mode markers for drift detection', () => {
    const layoutChecks = [
      { path: join(ROOT, 'app', '(public)', 'layout.tsx'), requiresPathnameHeader: false },
      { path: join(ROOT, 'app', '(chef)', 'layout.tsx'), requiresPathnameHeader: true },
      { path: join(ROOT, 'app', '(client)', 'layout.tsx'), requiresPathnameHeader: true },
      { path: join(ROOT, 'app', '(admin)', 'layout.tsx'), requiresPathnameHeader: true },
      {
        path: join(ROOT, 'app', '(partner)', 'partner', 'layout.tsx'),
        requiresPathnameHeader: true,
      },
      { path: join(ROOT, 'app', '(staff)', 'layout.tsx'), requiresPathnameHeader: true },
    ]

    for (const layoutCheck of layoutChecks) {
      const content = readFileSync(layoutCheck.path, 'utf-8')
      assert.ok(
        content.includes('data-cf-surface='),
        `${layoutCheck.path} must publish data-cf-surface for runtime contract auditing`
      )
      if (layoutCheck.requiresPathnameHeader) {
        assert.ok(
          content.includes('PATHNAME_HEADER'),
          `${layoutCheck.path} must bind to the pathname header contract`
        )
      }
    }
  })
})
