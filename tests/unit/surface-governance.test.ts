import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { DEFAULT_PRIMARY_SHORTCUT_HREFS } from '@/components/navigation/nav-config'
import { ARCHETYPES } from '@/lib/archetypes/presets'
import { DEFAULT_FOCUS_MODE_ENABLED } from '@/lib/billing/focus-mode'
import {
  MAX_PRIMARY_NAV_ITEMS,
  resolveAdminSurfaceMode,
  normalizePrimaryNavHrefs,
  resolveChefShellBudget,
  resolveChefSurfaceMode,
  resolveClientSurfaceMode,
  resolvePartnerSurfaceMode,
  resolvePublicSurfaceMode,
  resolveStaffSurfaceMode,
  resolveSurfaceModeForPortal,
} from '@/lib/interface/surface-governance'

describe('surface governance', () => {
  it('caps primary navigation to seven items', () => {
    assert.equal(MAX_PRIMARY_NAV_ITEMS, 7)
    assert.ok(DEFAULT_PRIMARY_SHORTCUT_HREFS.length <= MAX_PRIMARY_NAV_ITEMS)
    for (const archetype of ARCHETYPES) {
      assert.ok(
        archetype.primaryNavHrefs.length <= MAX_PRIMARY_NAV_ITEMS,
        `${archetype.id} exceeds the primary-nav budget`
      )
    }
  })

  it('normalizes and clamps primary nav href lists', () => {
    assert.deepEqual(
      normalizePrimaryNavHrefs([
        '/dashboard',
        '/dashboard',
        'clients',
        '/inbox',
        '/events',
        '/clients',
        '/finance',
        '/culinary',
        '/operations',
        '/extra',
      ]),
      ['/dashboard', '/inbox', '/events', '/clients', '/finance', '/culinary', '/operations']
    )
  })

  it('uses a shared focus-mode default', () => {
    assert.equal(DEFAULT_FOCUS_MODE_ENABLED, true)
  })

  it('maps chef routes to explicit surface modes', () => {
    assert.equal(resolveChefSurfaceMode('/dashboard'), 'triage')
    assert.equal(resolveChefSurfaceMode('/onboarding'), 'planning')
    assert.equal(resolveChefSurfaceMode('/events/new'), 'editing')
    assert.equal(resolveChefSurfaceMode('/clients/abc/relationship'), 'editing')
    assert.equal(resolveChefSurfaceMode('/events/abc/reset'), 'editing')
    assert.equal(resolveChefSurfaceMode('/events/abc/schedule'), 'planning')
    assert.equal(resolveChefSurfaceMode('/events/abc/procurement'), 'planning')
    assert.equal(resolveChefSurfaceMode('/events/abc/prep-plan'), 'planning')
    assert.equal(resolveChefSurfaceMode('/events/abc/staff'), 'planning')
    assert.equal(resolveChefSurfaceMode('/events/abc/execution'), 'monitoring')
    assert.equal(resolveChefSurfaceMode('/menus/abc/editor'), 'editing')
    assert.equal(resolveChefSurfaceMode('/settings/modules'), 'configuring')
    assert.equal(resolveChefSurfaceMode('/analytics/daily-report'), 'monitoring')
    assert.equal(resolveChefSurfaceMode('/events/abc/menu-approval'), 'reviewing')
    assert.equal(resolveChefSurfaceMode('/events/abc/safety'), 'reviewing')
    assert.equal(resolveChefSurfaceMode('/events/abc/billing'), 'reviewing')
    assert.equal(resolveChefSurfaceMode('/events/abc/financial'), 'reviewing')
    assert.equal(resolveChefSurfaceMode('/events/abc/receipts'), 'reviewing')
    assert.equal(resolveChefSurfaceMode('/events/abc/close-out'), 'reviewing')
    assert.equal(resolveChefSurfaceMode('/events/abc/aar'), 'reviewing')
    assert.equal(resolveChefSurfaceMode('/reviews'), 'reviewing')
  })

  it('maps non-chef portals to explicit surface modes', () => {
    assert.equal(resolvePublicSurfaceMode('/'), 'browsing')
    assert.equal(resolvePublicSurfaceMode('/contact'), 'editing')
    assert.equal(resolvePublicSurfaceMode('/compare/sample-chef'), 'reviewing')

    assert.equal(resolveClientSurfaceMode('/my-chat'), 'triage')
    assert.equal(resolveClientSurfaceMode('/my-events'), 'planning')
    assert.equal(resolveClientSurfaceMode('/my-profile'), 'editing')
    assert.equal(resolveClientSurfaceMode('/my-events/evt/pay'), 'reviewing')
    assert.equal(resolveClientSurfaceMode('/my-spending'), 'monitoring')
    assert.equal(resolveClientSurfaceMode('/my-hub'), 'browsing')

    assert.equal(resolveAdminSurfaceMode('/admin/pulse'), 'monitoring')
    assert.equal(resolveAdminSurfaceMode('/admin/system'), 'configuring')
    assert.equal(resolveAdminSurfaceMode('/admin/system/payments'), 'monitoring')
    assert.equal(resolveAdminSurfaceMode('/admin/beta-surveys'), 'monitoring')
    assert.equal(resolveAdminSurfaceMode('/admin/inquiries'), 'reviewing')

    assert.equal(resolveStaffSurfaceMode('/staff-dashboard'), 'monitoring')
    assert.equal(resolveStaffSurfaceMode('/staff-schedule'), 'planning')
    assert.equal(resolveStaffSurfaceMode('/staff-recipes'), 'browsing')
    assert.equal(resolveStaffSurfaceMode('/staff-time'), 'reviewing')

    assert.equal(resolvePartnerSurfaceMode('/partner/dashboard'), 'monitoring')
    assert.equal(resolvePartnerSurfaceMode('/partner/profile'), 'editing')
    assert.equal(resolvePartnerSurfaceMode('/partner/preview'), 'reviewing')
  })

  it('exposes one shared portal resolver across runtime surfaces', () => {
    assert.equal(resolveSurfaceModeForPortal('public', '/book'), 'editing')
    assert.equal(resolveSurfaceModeForPortal('client', '/my-hub'), 'browsing')
    assert.equal(resolveSurfaceModeForPortal('admin', '/admin/flags'), 'configuring')
    assert.equal(resolveSurfaceModeForPortal('staff', '/staff-dashboard'), 'monitoring')
    assert.equal(resolveSurfaceModeForPortal('partner', '/partner/events'), 'monitoring')
  })

  it('suppresses ambient shell prompts outside triage surfaces', () => {
    assert.deepEqual(resolveChefShellBudget('/dashboard'), {
      mode: 'triage',
      showMarketResearchBanner: true,
      showFeedbackNudge: true,
      showDesktopSidebar: true,
      showMobileNav: true,
      showBreadcrumbBar: true,
      showQuickExpenseTrigger: true,
      showRemy: true,
      showQuickCapture: true,
      showLiveAlerts: true,
      contentWidth: 'constrained',
    })
    assert.deepEqual(resolveChefShellBudget('/settings/modules'), {
      mode: 'configuring',
      showMarketResearchBanner: false,
      showFeedbackNudge: false,
      showDesktopSidebar: true,
      showMobileNav: true,
      showBreadcrumbBar: true,
      showQuickExpenseTrigger: true,
      showRemy: true,
      showQuickCapture: true,
      showLiveAlerts: true,
      contentWidth: 'constrained',
    })
    assert.deepEqual(resolveChefShellBudget('/events/new'), {
      mode: 'editing',
      showMarketResearchBanner: false,
      showFeedbackNudge: false,
      showDesktopSidebar: true,
      showMobileNav: true,
      showBreadcrumbBar: true,
      showQuickExpenseTrigger: true,
      showRemy: true,
      showQuickCapture: true,
      showLiveAlerts: true,
      contentWidth: 'constrained',
    })
    assert.deepEqual(resolveChefShellBudget('/menus/abc/editor'), {
      mode: 'editing',
      showMarketResearchBanner: false,
      showFeedbackNudge: false,
      showDesktopSidebar: false,
      showMobileNav: false,
      showBreadcrumbBar: false,
      showQuickExpenseTrigger: false,
      showRemy: false,
      showQuickCapture: false,
      showLiveAlerts: false,
      contentWidth: 'full',
    })
  })
})
