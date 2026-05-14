import test from 'node:test'
import assert from 'node:assert/strict'

import {
  buildCirclePlanningListSummary,
  buildSharedDinnerConsensusSnapshot,
} from '@/lib/hub/shared-dinner-planning'
import type { HubGroup, HubGroupMember, MealBoardEntry } from '@/lib/hub/types'

const group: HubGroup = {
  id: 'circle-1',
  event_id: null,
  event_stub_id: null,
  tenant_id: null,
  name: 'Friday dinner circle',
  description: 'Dinner consensus fixture',
  cover_image_url: null,
  emoji: null,
  group_token: 'group-token',
  theme_id: null,
  is_active: true,
  allow_member_invites: true,
  allow_anonymous_posts: false,
  visibility: 'private',
  group_type: 'circle',
  created_by_profile_id: 'host-profile',
  last_message_at: null,
  last_message_preview: null,
  message_count: 2,
  created_at: '2026-05-13T00:00:00.000Z',
  updated_at: '2026-05-13T00:00:00.000Z',
  member_count: 2,
}

const members: HubGroupMember[] = [
  member('member-1', 'host-profile', 'host', 'Host', 'accepted'),
  member('member-2', 'guest-profile', 'member', 'Guest', 'accepted'),
]

const meals: MealBoardEntry[] = [
  {
    id: 'option-1',
    group_id: 'circle-1',
    author_profile_id: 'host-profile',
    meal_date: '2026-05-13',
    meal_type: 'dinner',
    title: 'Northern European pasta night',
    description: 'Seasonal dinner',
    dietary_tags: ['vegetarian'],
    allergen_flags: [],
    menu_id: 'menu-1',
    dish_id: 'dish-1',
    head_count: 2,
    prep_notes: null,
    serving_time: '19:00',
    assigned_profile_id: null,
    assigned_display_name: null,
    assignment_notes: null,
    status: 'confirmed',
    created_at: '2026-05-13T00:10:00.000Z',
    updated_at: '2026-05-13T00:20:00.000Z',
  },
]

test('shared dinner consensus snapshot exposes host readiness and ranking', () => {
  const snapshot = buildSharedDinnerConsensusSnapshot({
    group,
    members,
    mealBoardEntries: meals,
    currentMember: members[0],
  })

  assert.equal(snapshot.access.canFinalizeDecision, true)
  assert.equal(snapshot.access.canInvite, true)
  assert.equal(snapshot.consensus.topCandidate?.label, 'Northern European pasta night')
  assert.equal(snapshot.readiness.readyToFinalize, true)
  assert.equal(snapshot.votedMemberCount, 2)
  assert.equal(snapshot.memberCount, 2)
  assert.equal(snapshot.topCandidates[0].label, 'Northern European pasta night')
  assert.equal(snapshot.topCandidates[0].blockers.length, 0)
})

test('shared dinner consensus keeps member permissions below host authority', () => {
  const snapshot = buildSharedDinnerConsensusSnapshot({
    group,
    members,
    mealBoardEntries: meals,
    currentMember: members[1],
  })

  assert.equal(snapshot.access.canContribute, true)
  assert.equal(snapshot.access.canFinalizeDecision, false)
  assert.equal(snapshot.access.canInvite, false)
  assert.equal(snapshot.permissionCopy.includes('Member mode'), true)
})

test('shared dinner consensus blocks non-member writes and does not expose private profile fields', () => {
  const snapshot = buildSharedDinnerConsensusSnapshot({
    group,
    members,
    mealBoardEntries: meals,
    currentMember: null,
  })

  assert.equal(snapshot.access.canViewSession, false)
  assert.equal(snapshot.access.canContribute, false)
  assert.equal(snapshot.access.canFinalizeDecision, false)
  assert.equal(JSON.stringify(snapshot).includes('secret-token'), false)
  assert.equal(JSON.stringify(snapshot).includes('private-allergy'), false)
})

test('circle planning list summary stays limited to readiness cues', () => {
  assert.deepEqual(
    buildCirclePlanningListSummary({ memberCount: 2, messageCount: 4, hasUnread: true }),
    { label: 'New circle planning activity', tone: 'ready' }
  )
  assert.deepEqual(buildCirclePlanningListSummary({ memberCount: 2, messageCount: 0 }), {
    label: 'Needs votes to build consensus',
    tone: 'needs_signal',
  })
})

function member(
  id: string,
  profileId: string,
  role: HubGroupMember['role'],
  name: string,
  rsvpStatus: string | null
): HubGroupMember {
  return {
    id,
    group_id: 'circle-1',
    profile_id: profileId,
    role,
    can_post: true,
    can_invite: role === 'host',
    can_pin: role === 'host',
    last_read_at: null,
    notifications_muted: false,
    is_co_host: false,
    rsvp_status: rsvpStatus,
    joined_at: '2026-05-13T00:00:00.000Z',
    profile: {
      id: profileId,
      email: null,
      email_normalized: null,
      display_name: name,
      avatar_url: null,
      bio: null,
      profile_token: 'secret-token',
      auth_user_id: null,
      client_id: null,
      known_allergies: ['private-allergy'],
      known_dietary: ['private-diet'],
      dislikes: ['private-dislike'],
      favorites: ['private-favorite'],
      spice_tolerance: null,
      cuisine_preferences: ['private-cuisine'],
      notifications_enabled: true,
      created_at: '2026-05-13T00:00:00.000Z',
      updated_at: '2026-05-13T00:00:00.000Z',
    },
  }
}
