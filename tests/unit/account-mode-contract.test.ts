import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  ACCOUNT_MODE_ROUTES,
  classifyAccountDataBoundary,
  evaluateAccountModeAction,
  getVisibleAccountModeNavItems,
  resolveAccountModeRouteDecision,
  type AccountModeContext,
} from '@/lib/auth/account-mode-contract'
import { getRouteAccountMode } from '@/lib/auth/route-policy'

const publicVisitor: AccountModeContext = {
  userId: null,
  mode: 'public',
  roles: ['public_visitor'],
  state: 'anonymous',
}

const chefOwnerGuestMode: AccountModeContext = {
  userId: 'user-chef-1',
  mode: 'guest',
  roles: ['chef_owner'],
  state: 'verified',
  chefAccountId: 'chef-1',
  personalProfileId: 'personal-1',
}

const chefOwnerWorkspace: AccountModeContext = {
  ...chefOwnerGuestMode,
  mode: 'chef_workspace',
}

describe('account mode contract - role, state, and mode matrix', () => {
  it('keeps public discovery open without granting portal capabilities', () => {
    const discovery = evaluateAccountModeAction(publicVisitor, 'public.discovery.view')
    const booking = evaluateAccountModeAction(publicVisitor, 'personal.booking.create')

    assert.equal(discovery.allowed, true)
    assert.equal(discovery.boundary, 'public_catalog')

    assert.equal(booking.allowed, false)
    assert.equal(booking.reason, 'unauthenticated')
    assert.equal(booking.writeAllowed, false)
  })

  it('lets a chef owner act as a personal guest only inside guest mode', () => {
    const booking = evaluateAccountModeAction(chefOwnerGuestMode, 'personal.booking.create')
    const paymentMethod = evaluateAccountModeAction(
      chefOwnerGuestMode,
      'personal.payment_method.manage'
    )

    assert.equal(booking.allowed, true)
    assert.equal(booking.boundary, 'personal_client')
    assert.equal(booking.writeAllowed, true)

    assert.equal(paymentMethod.allowed, true)
    assert.equal(paymentMethod.boundary, 'personal_client')
  })

  it('separates guest payment methods from chef payouts', () => {
    const guestPayment = classifyAccountDataBoundary(chefOwnerGuestMode, 'personal_payment_method')
    const chefPayout = classifyAccountDataBoundary(chefOwnerWorkspace, 'chef_payout_account')

    assert.equal(guestPayment.boundary, 'personal_client')
    assert.equal(guestPayment.financialRail, 'guest_payment_method')
    assert.equal(guestPayment.writeAllowed, true)

    assert.equal(chefPayout.boundary, 'chef_business')
    assert.equal(chefPayout.financialRail, 'chef_payout')
    assert.equal(chefPayout.writeAllowed, true)
  })

  it('projects personal calendar holds into chef workspace as busy-only data', () => {
    const projection = classifyAccountDataBoundary(chefOwnerWorkspace, 'personal_calendar_hold')

    assert.equal(projection.boundary, 'cross_context_projection')
    assert.equal(projection.detailLevel, 'busy_only')
    assert.equal(projection.writeAllowed, false)
    assert.equal(projection.auditEvent.type, 'account_mode.data_projection')
  })

  it('fails closed for inactive accounts before capability checks', () => {
    const suspendedChef: AccountModeContext = {
      ...chefOwnerWorkspace,
      state: 'suspended',
    }

    const result = evaluateAccountModeAction(suspendedChef, 'chef.payout.manage')

    assert.equal(result.allowed, false)
    assert.equal(result.reason, 'inactive_account')
    assert.equal(result.writeAllowed, false)
    assert.equal(result.auditEvent.type, 'account_mode.action_denied')
  })

  it('requires onboarding before private account reads or writes', () => {
    const pendingChef: AccountModeContext = {
      ...chefOwnerWorkspace,
      state: 'pending_onboarding',
    }

    const publicDiscovery = evaluateAccountModeAction(pendingChef, 'public.discovery.view')
    const clientRead = evaluateAccountModeAction(pendingChef, 'chef.client_record.read')

    assert.equal(publicDiscovery.allowed, true)
    assert.equal(clientRead.allowed, false)
    assert.equal(clientRead.reason, 'onboarding_required')
    assert.equal(clientRead.writeAllowed, false)
  })

  it('limits writes for limited-access accounts while preserving read visibility', () => {
    const limitedChef: AccountModeContext = {
      ...chefOwnerWorkspace,
      state: 'limited_access',
    }

    const read = evaluateAccountModeAction(limitedChef, 'chef.client_record.read')
    const write = evaluateAccountModeAction(limitedChef, 'chef.client_record.write')

    assert.equal(read.allowed, true)
    assert.equal(read.writeAllowed, false)

    assert.equal(write.allowed, false)
    assert.equal(write.reason, 'limited_access')
    assert.equal(write.writeAllowed, false)
  })
})

describe('account mode contract - route and nav visibility', () => {
  it('shows only guest-mode navigation while preserving public discovery visibility', () => {
    const nav = getVisibleAccountModeNavItems(chefOwnerGuestMode).map((item) => item.id)

    assert.deepEqual(nav, [
      'public.discovery',
      'guest.bookings',
      'guest.profile',
      'guest.messages',
      'guest.payments',
    ])
  })

  it('hides guest navigation from the chef workspace', () => {
    const nav = getVisibleAccountModeNavItems(chefOwnerWorkspace).map((item) => item.id)

    assert.deepEqual(nav, [
      'public.discovery',
      'chef.dashboard',
      'chef.clients',
      'chef.calendar',
      'chef.reviews',
      'chef.payouts',
    ])
  })

  it('returns a wrong-context recovery for chef routes requested from guest mode', () => {
    const decision = resolveAccountModeRouteDecision(chefOwnerGuestMode, '/payments')

    assert.equal(decision.allowed, false)
    assert.equal(decision.visibleInNav, false)
    assert.equal(decision.reason, 'wrong_context')
    assert.equal(decision.recovery?.mode, 'chef_workspace')
    assert.equal(decision.recovery?.href, '/dashboard')
    assert.equal(decision.auditEvent.type, 'account_mode.wrong_context')
    assert.equal(decision.auditEvent.writeAllowed, false)
  })

  it('keeps account mode routes aligned with route policy modes', () => {
    const expectedModes = new Map([
      ['public.discovery', 'public'],
      ['guest.bookings', 'guest'],
      ['guest.profile', 'guest'],
      ['guest.messages', 'guest'],
      ['guest.payments', 'guest'],
      ['chef.dashboard', 'chef_workspace'],
      ['chef.clients', 'chef_workspace'],
      ['chef.calendar', 'chef_workspace'],
      ['chef.reviews', 'chef_workspace'],
      ['chef.payouts', 'chef_workspace'],
      ['team.tasks', 'team_workspace'],
      ['support.accounts', 'admin_console'],
      ['admin.accounts', 'admin_console'],
    ])

    for (const route of ACCOUNT_MODE_ROUTES) {
      assert.equal(getRouteAccountMode(route.href), expectedModes.get(route.id), route.id)
    }
  })
})
