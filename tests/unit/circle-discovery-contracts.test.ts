import test from 'node:test'
import assert from 'node:assert/strict'

import {
  applyDiscoveryStateToCircle,
  buildCircleDiscoveryApplyTargets,
  createCircleDiscoveryMemberAction,
  decideCircleDiscoveryMode,
  resolveCircleDiscoveryAccess,
} from '@/lib/hub/circle-discovery-contracts'

test('circle discovery access separates host member and non-member permissions', () => {
  const host = resolveCircleDiscoveryAccess({ actorRole: 'host' })
  assert.equal(host.canFinalizeDecision, true)
  assert.equal(host.canInvite, true)
  assert.equal(host.visibility, 'circle_activity')

  const member = resolveCircleDiscoveryAccess({ actorRole: 'member' })
  assert.equal(member.canContribute, true)
  assert.equal(member.canFinalizeDecision, false)

  const nonMember = resolveCircleDiscoveryAccess({ actorRole: 'non_member' })
  assert.equal(nonMember.allowed, false)
  assert.equal(nonMember.canViewSession, false)

  const tokenViewer = resolveCircleDiscoveryAccess({
    actorRole: 'non_member',
    hasValidShareToken: true,
  })
  assert.equal(tokenViewer.allowed, true)
  assert.equal(tokenViewer.visibility, 'public_summary')
  assert.equal(tokenViewer.canContribute, false)
})

test('mode switching requires circle membership and confirmation when leaving personal state', () => {
  const blocked = decideCircleDiscoveryMode({
    requestedMode: 'circle',
    actorRole: 'non_member',
    circleId: 'circle-1',
  })
  assert.equal(blocked.allowed, false)
  assert.equal(blocked.privacyBoundary, 'blocked')

  const needsConfirmation = decideCircleDiscoveryMode({
    requestedMode: 'circle',
    currentMode: 'personal',
    actorRole: 'member',
    circleId: 'circle-1',
  })
  assert.equal(needsConfirmation.allowed, true)
  assert.equal(needsConfirmation.requiresConfirmation, true)

  const confirmed = decideCircleDiscoveryMode({
    requestedMode: 'circle',
    currentMode: 'personal',
    actorRole: 'member',
    circleId: 'circle-1',
    explicitConfirmation: true,
  })
  assert.equal(confirmed.requiresConfirmation, false)
  assert.equal(confirmed.privacyBoundary, 'circle_shared')
})

test('circle member actions block non-member writes and reserve finalization for host roles', () => {
  const memberLike = createCircleDiscoveryMemberAction({
    actorId: 'member-1',
    actorRole: 'member',
    sessionId: 'session-1',
    actionType: 'like_candidate',
    candidateId: 'restaurant-1',
    now: '2026-05-13T01:00:00.000Z',
  })
  assert.equal(memberLike.allowed, true)
  assert.equal(memberLike.action?.visibleToCircle, true)

  const memberFinalize = createCircleDiscoveryMemberAction({
    actorId: 'member-1',
    actorRole: 'member',
    sessionId: 'session-1',
    actionType: 'finalize_decision',
  })
  assert.equal(memberFinalize.allowed, false)

  const nonMemberVeto = createCircleDiscoveryMemberAction({
    actorId: 'outsider-1',
    actorRole: 'non_member',
    sessionId: 'session-1',
    actionType: 'veto_candidate',
    candidateId: 'restaurant-1',
  })
  assert.equal(nonMemberVeto.allowed, false)
})

test('apply targets and circle apply sanitize discovery state before sharing', () => {
  const targets = buildCircleDiscoveryApplyTargets({
    actorRole: 'host',
    circleId: 'circle-1',
    authenticated: true,
    remyAvailable: true,
    selectedItems: [
      { id: 'restaurant-1', type: 'restaurant', label: 'Noodle Bar', href: '/eat/noodle' },
      { id: 'menu-1', type: 'menu', label: 'Dinner menu', href: '/menus/1' },
    ],
  })

  assert.deepEqual(
    targets.filter((target) => target.eligible).map((target) => target.id),
    ['restaurants', 'menus', 'this_circle', 'remy_tuning', 'save_for_later']
  )

  const applied = applyDiscoveryStateToCircle({
    circleId: 'circle-1',
    sessionId: 'session-1',
    actorId: 'host-1',
    actorRole: 'host',
    sourceMode: 'personal',
    explicitConfirmation: true,
    now: '2026-05-13T01:00:00.000Z',
    filters: {
      cuisines: ['thai'],
      dietary: ['vegetarian'],
      remyTuning: 'guided',
      selectedRailItems: [
        { type: 'cuisine', label: 'Thai', value: 'thai', href: '/eat?cuisine=thai' },
      ],
    },
    selectedItems: [{ id: 'restaurant-1', type: 'restaurant', label: 'Noodle Bar' }],
  })

  assert.equal(applied.allowed, true)
  assert.deepEqual(applied.appliedState?.filters, {
    cuisines: ['thai'],
    dietary: ['vegetarian'],
  })
  assert.equal(applied.appliedState?.redactedPrivateFieldCount, 2)
})
