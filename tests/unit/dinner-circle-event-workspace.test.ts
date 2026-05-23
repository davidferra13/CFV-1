import test from 'node:test'
import assert from 'node:assert/strict'
import {
  buildDinnerCircleEventPacketManifest,
  resolveDinnerCircleWorkspaceModules,
} from '../../lib/dinner-circles/event-workspace'
import { resolveDinnerCircleActions } from '../../lib/dinner-circles/action-surface'
import {
  filterDinnerCircleArrivalGuideForViewer,
  normalizeDinnerCircleArrivalGuide,
} from '../../lib/dinner-circles/arrival-guide'

const DRAIN_LANE_QUEUE_IDS = [
  'BQ-20260519T171015Z-add-arrival-parking-and-access-guide-for-attendees',
  'BQ-20260519T171015Z-add-attendee-profile-cards-and-relationship-context-for-dinn',
  'BQ-20260519T171015Z-add-dinner-circle-seating-chart-and-table-plan',
  'BQ-20260519T171015Z-add-dinner-circle-q-a-and-concierge-knowledge-base',
  'BQ-20260519T171015Z-add-gift-surprise-and-celebration-coordination-board',
  'BQ-20260519T171015Z-add-menu-reveal-and-dish-story-experience-for-dinner-circle-',
  'BQ-20260519T171015Z-add-participant-facing-dinner-itinerary-and-run-of-show',
  'BQ-20260519T171015Z-add-weather-and-backup-plan-coordination-for-relevant-dinner',
  'BQ-20260519T171016Z-add-day-of-attendee-live-status-and-calm-updates',
  'BQ-20260519T171016Z-add-dinner-circle-digest-and-quiet-summary-controls',
  'BQ-20260519T171016Z-add-dinner-circle-share-export-and-printable-event-packet',
  'BQ-20260519T171016Z-add-outside-collaborator-access-for-planners-vendors-and-hou',
  'BQ-20260519T171016Z-add-post-event-memory-album-thank-you-and-feedback-loop',
  'BQ-20260519T171511Z-dinner-circle-growth-engine-google-reviews-guest-leads-follo',
  'BQ-20260519T172328Z-add-host-visual-intake-and-photo-slots-for-dinner-circle-pla',
]

test('workspace contract maps the Dinner Circle drain lane queue ids', () => {
  const modules = resolveDinnerCircleWorkspaceModules({
    role: 'host',
    permissions: { canManagePrivacy: true },
    includeUnavailable: true,
  })
  const queueIds = new Set(modules.map((module) => module.queueId))

  for (const queueId of DRAIN_LANE_QUEUE_IDS) {
    assert.equal(queueIds.has(queueId), true, `${queueId} is missing from workspace modules`)
  }
})

test('guest workspace exposes participant surfaces without host-only collaborator controls', () => {
  const modules = resolveDinnerCircleWorkspaceModules({
    role: 'guest',
    includeUnavailable: true,
  })

  const byId = new Map(modules.map((module) => [module.id, module]))

  assert.equal(byId.get('attendee_profiles')?.permitted, true)
  assert.equal(byId.get('arrival_guide')?.permitted, true)
  assert.equal(byId.get('itinerary')?.permitted, true)
  assert.equal(byId.get('menu_reveal')?.permitted, true)
  assert.equal(byId.get('concierge_qa')?.permitted, true)
  assert.equal(byId.get('collaborator_access')?.permitted, false)
  assert.equal(
    byId.get('collaborator_access')?.disabledReason,
    'Only hosts and operators can manage outside collaborators.'
  )
})

test('chef workspace sees execution modules but not private celebration chatter as a public feed', () => {
  const modules = resolveDinnerCircleWorkspaceModules({ role: 'chef' })
  const byId = new Map(modules.map((module) => [module.id, module]))

  assert.equal(byId.get('weather_backup')?.permitted, true)
  assert.equal(byId.get('visual_intake')?.permitted, true)
  assert.match(byId.get('celebration_board')?.privacyGuardrail ?? '', /execution-relevant/i)
  assert.match(byId.get('seating_plan')?.privacyGuardrail ?? '', /conflict/i)
})

test('event packet manifest redacts role-limited sections for guests and keeps timestamps', () => {
  const guestPacket = buildDinnerCircleEventPacketManifest({
    role: 'guest',
    generatedAt: '2026-05-21T17:00:00.000Z',
  })
  const hostPacket = buildDinnerCircleEventPacketManifest({
    role: 'host',
    generatedAt: '2026-05-21T17:00:00.000Z',
  })

  assert.equal(guestPacket.generatedAt, '2026-05-21T17:00:00.000Z')
  assert.equal(
    guestPacket.sections.some((section) => section.id === 'arrival_guide'),
    true
  )
  assert.equal(
    guestPacket.sections.some((section) => section.id === 'collaborator_access'),
    false
  )
  assert.equal(
    hostPacket.sections.some((section) => section.id === 'collaborator_access'),
    true
  )
  assert.ok(guestPacket.redactions.includes('private guest notes'))
  assert.ok(guestPacket.redactions.includes('chef-only production details'))
})

test('arrival guide print-safe projection omits sensitive and expired access details', () => {
  const guide = normalizeDinnerCircleArrivalGuide({
    status: 'published',
    sections: {
      parking: {
        body: 'Use the north garage.',
        visibility: 'attendee_visible',
        sensitive: false,
      },
      building_gate_access: {
        body: 'Gate code 1234.',
        visibility: 'attendee_visible',
        sensitive: true,
      },
      arrival_contact: {
        body: 'Text the house manager.',
        visibility: 'attendee_visible',
        sensitive: true,
        expiresAt: '2026-05-20T18:00:00.000Z',
      },
      elevator_loading_notes: {
        body: 'Chef should use the service elevator.',
        visibility: 'host_and_chef',
        chefRelevant: true,
      },
    },
  })

  const printSafe = filterDinnerCircleArrivalGuideForViewer(
    guide,
    { role: 'attendee', profileId: 'profile-1' },
    { printSafe: true, now: new Date('2026-05-21T12:00:00.000Z') }
  )
  const chefView = filterDinnerCircleArrivalGuideForViewer(
    guide,
    { role: 'chef' },
    { now: new Date('2026-05-21T12:00:00.000Z') }
  )

  assert.equal(Boolean(printSafe.sections.parking), true)
  assert.equal(Boolean(printSafe.sections.building_gate_access), false)
  assert.equal(Boolean(printSafe.sections.arrival_contact), false)
  assert.equal(Boolean(printSafe.sections.elevator_loading_notes), false)
  assert.equal(Boolean(chefView.sections.elevator_loading_notes), true)
})

test('action resolver includes new Dinner Circle event workspace actions by role', () => {
  const guestActions = resolveDinnerCircleActions({
    role: 'guest',
    permissions: { canInvite: false, canBroadcast: false },
    includeUnavailable: true,
  })
  const hostActions = resolveDinnerCircleActions({
    role: 'host',
    permissions: { canInvite: true, canBroadcast: true, canManagePrivacy: true },
  })

  assert.equal(guestActions.find((action) => action.id === 'seating_plan')?.permitted, true)
  assert.equal(guestActions.find((action) => action.id === 'collaborator_access')?.permitted, false)
  assert.equal(hostActions.find((action) => action.id === 'collaborator_access')?.permitted, true)
  assert.equal(hostActions.find((action) => action.id === 'growth_actions')?.permitted, true)
})
