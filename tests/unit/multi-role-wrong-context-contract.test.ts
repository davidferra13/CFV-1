import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  evaluateAccountModeAction,
  resolveAccountModeRouteDecision,
  type AccountCapability,
  type AccountModeContext,
} from '@/lib/auth/account-mode-contract'

const chefWorkspace: AccountModeContext = {
  userId: 'user-chef-1',
  mode: 'chef_workspace',
  roles: ['chef_owner'],
  state: 'verified',
  chefAccountId: 'chef-1',
  personalProfileId: 'personal-1',
}

const chefInGuestMode: AccountModeContext = {
  ...chefWorkspace,
  mode: 'guest',
}

describe('multi-role wrong-context contract', () => {
  it('blocks personal guest writes from chef workspace with no write side effect', () => {
    const personalWrites: AccountCapability[] = [
      'personal.booking.create',
      'personal.message.send',
      'personal.review.create',
      'personal.payment_method.manage',
      'personal.profile.write',
    ]

    for (const capability of personalWrites) {
      const result = evaluateAccountModeAction(chefWorkspace, capability)

      assert.equal(result.allowed, false, capability)
      assert.equal(result.reason, 'wrong_context', capability)
      assert.equal(result.boundary, 'none', capability)
      assert.equal(result.writeAllowed, false, capability)
      assert.equal(result.suggestedMode, 'guest', capability)
      assert.equal(result.recovery?.href, '/my-events', capability)
      assert.equal(result.auditEvent.type, 'account_mode.wrong_context', capability)
      assert.equal(result.auditEvent.writeAllowed, false, capability)
    }
  })

  it('blocks chef business writes from guest mode with chef-workspace recovery', () => {
    const chefWrites: AccountCapability[] = [
      'chef.client_record.write',
      'chef.message.send',
      'chef.calendar.manage',
      'chef.review.respond',
      'chef.payout.manage',
    ]

    for (const capability of chefWrites) {
      const result = evaluateAccountModeAction(chefInGuestMode, capability)

      assert.equal(result.allowed, false, capability)
      assert.equal(result.reason, 'wrong_context', capability)
      assert.equal(result.writeAllowed, false, capability)
      assert.equal(result.suggestedMode, 'chef_workspace', capability)
      assert.equal(result.recovery?.href, '/dashboard', capability)
      assert.equal(result.auditEvent.type, 'account_mode.wrong_context', capability)
    }
  })

  it('does not turn a team member into a payout admin through mode switching', () => {
    const teamMemberInChefMode: AccountModeContext = {
      userId: 'user-team-1',
      mode: 'chef_workspace',
      roles: ['chef_team_member'],
      state: 'approved',
      chefAccountId: 'chef-1',
      teamMembershipId: 'team-1',
    }

    const result = evaluateAccountModeAction(teamMemberInChefMode, 'chef.payout.manage')

    assert.equal(result.allowed, false)
    assert.equal(result.reason, 'insufficient_role')
    assert.equal(result.suggestedMode, null)
    assert.equal(result.writeAllowed, false)
  })

  it('blocks guest portal routes from chef workspace at the route contract layer', () => {
    const decision = resolveAccountModeRouteDecision(chefWorkspace, '/my-events')

    assert.equal(decision.allowed, false)
    assert.equal(decision.visibleInNav, false)
    assert.equal(decision.reason, 'wrong_context')
    assert.equal(decision.recovery?.mode, 'guest')
    assert.equal(decision.recovery?.href, '/my-events')
    assert.equal(decision.auditEvent.boundary, 'none')
    assert.equal(decision.auditEvent.writeAllowed, false)
  })

  it('keeps admin/support permissions out of chef and guest modes', () => {
    const supportFromGuest = evaluateAccountModeAction(chefInGuestMode, 'support.account.inspect')
    const adminFromChef = evaluateAccountModeAction(chefWorkspace, 'admin.account.manage')

    assert.equal(supportFromGuest.allowed, false)
    assert.equal(supportFromGuest.reason, 'wrong_context')
    assert.equal(supportFromGuest.writeAllowed, false)

    assert.equal(adminFromChef.allowed, false)
    assert.equal(adminFromChef.reason, 'wrong_context')
    assert.equal(adminFromChef.writeAllowed, false)
  })
})
