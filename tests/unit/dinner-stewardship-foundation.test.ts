import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import {
  buildStewardshipSnapshot,
  getDinnerCircleParticipantParity,
  getDinnerCircleNotificationPreferences,
  getDinnerCircleActionContract,
  getDinnerStewardshipLifecycleState,
  getStewardshipAddOnPrompts,
  getStewardshipChangeWindows,
  getStewardshipNotificationTopicsForRole,
  getStewardshipTimelineGates,
} from '../../lib/dinner-circles/stewardship'

test('confirmed paid future dinner enters Confirmed Dinner Stewardship', () => {
  assert.equal(
    getDinnerStewardshipLifecycleState({
      status: 'confirmed',
      daysUntil: 120,
      menuApproved: true,
      totalPaidCents: 50000,
      outstandingBalanceCents: 0,
    }),
    'confirmed_stewardship'
  )
})

test('stewardship snapshot exposes lifecycle, gates, participants, logistics, and memory', () => {
  const snapshot = buildStewardshipSnapshot({
    now: new Date('2026-02-01T12:00:00Z'),
    event: {
      id: 'event-1',
      status: 'confirmed',
      event_date: '2026-06-06',
      created_at: '2026-01-15T12:00:00Z',
      occasion: 'June dinner',
      guest_count: 4,
      menu_approval_status: 'approved',
      menu_approved_at: '2026-02-01T12:00:00Z',
      location_address: '123 Test St',
      access_instructions: 'Side gate',
    },
    guests: [
      {
        full_name: 'Host',
        rsvp_status: 'attending',
        dietary_restrictions: [],
        allergies: [],
      },
      {
        full_name: 'Guest',
        rsvp_status: 'pending',
        dietary_restrictions: ['vegetarian'],
        allergies: [],
      },
    ],
    menuCount: 1,
    totalPaidCents: 50000,
    outstandingBalanceCents: 0,
    hasCircle: true,
  })

  assert.equal(snapshot.lifecycleState, 'confirmed_stewardship')
  assert.equal(snapshot.lifecycleLabel, 'Confirmed Dinner Stewardship')
  assert.equal(snapshot.daysUntil, 126)
  assert.equal(snapshot.participantProgress.totalKnown, 4)
  assert.equal(snapshot.participantProgress.dietaryComplete, 2)
  assert.equal(
    snapshot.gates.some((gate) => gate.id === 'participant_readiness'),
    true
  )
  assert.equal(
    snapshot.timelineGates.some((gate) => gate.id === 't120_confirmation_complete'),
    true
  )
  assert.equal(
    snapshot.changeWindows.find((window) => window.changeType === 'menu_request')?.status,
    'easy'
  )
  assert.equal(snapshot.notificationPreferences.length > 0, true)
  assert.equal(snapshot.participantParity.activeDinnerHome, true)
  assert.equal(snapshot.participantParity.qualityLayer.countdown, true)
  assert.equal(
    snapshot.addOnPrompts.some((prompt) => prompt.id === 'printed_menus'),
    true
  )
  assert.equal(snapshot.logistics.chefBrings.length > 0, true)
  assert.equal(
    snapshot.memoryFeed.some((item) => item.source === 'event_guests'),
    true
  )
})

test('participant parity keeps guests useful without granting host authority', () => {
  const guest = getDinnerCircleParticipantParity({ role: 'guest' })
  const host = getDinnerCircleParticipantParity({ role: 'host' })
  const planner = getDinnerCircleParticipantParity({ role: 'planner' })

  for (const parity of [guest, host, planner]) {
    assert.equal(parity.activeDinnerHome, true)
    assert.equal(parity.qualityLayer.countdown, true)
    assert.equal(parity.qualityLayer.eventStatus, true)
    assert.equal(parity.qualityLayer.dietaryAllergyPrompt, true)
    assert.equal(parity.qualityLayer.notificationSettings, true)
    assert.equal(parity.qualityLayer.communicateNeeds, true)
  }

  assert.equal(guest.actionIds.includes('update_guest_status'), true)
  assert.equal(guest.actionIds.includes('cancel_or_reschedule'), false)
  assert.equal(guest.notificationTopics.includes('addons_payments'), false)
  assert.equal(
    guest.authorityBoundaries.some((boundary) => /payment|billing/i.test(boundary)),
    true
  )
  assert.equal(planner.actionIds.includes('tell_us_anything_changed'), true)
})

test('participant parity handles invited muted limited and revoked access states', () => {
  const invited = getDinnerCircleParticipantParity({
    role: 'guest',
    accessState: 'invited_not_joined',
  })
  const muted = getDinnerCircleParticipantParity({ role: 'guest', accessState: 'muted' })
  const limited = getDinnerCircleParticipantParity({
    role: 'guest',
    accessState: 'permission_limited',
  })
  const revoked = getDinnerCircleParticipantParity({ role: 'guest', accessState: 'revoked' })

  assert.equal(invited.activeDinnerHome, true)
  assert.equal(invited.qualityLayer.communicateNeeds, false)
  assert.match(invited.emptyState, /Join the Dinner Circle/)

  assert.equal(muted.activeDinnerHome, true)
  assert.deepEqual(muted.notificationTopics, [])
  assert.equal(muted.qualityLayer.notificationSettings, true)

  assert.equal(limited.activeDinnerHome, true)
  assert.equal(limited.qualityLayer.menuContext, false)
  assert.equal(limited.qualityLayer.eventStatus, true)

  assert.equal(revoked.activeDinnerHome, false)
  assert.equal(revoked.actionIds.length, 0)
  assert.match(revoked.emptyState, /removed/)
})

test('change windows become review and prep aware as service approaches', () => {
  const t90 = getStewardshipChangeWindows(90)
  const t14 = getStewardshipChangeWindows(14)
  const t3 = getStewardshipChangeWindows(3)

  assert.equal(t90.find((window) => window.changeType === 'headcount')?.status, 'easy')
  assert.equal(t14.find((window) => window.changeType === 'headcount')?.status, 'chef_review')
  assert.equal(t3.find((window) => window.changeType === 'menu_request')?.status, 'locked')
  assert.equal(t3.find((window) => window.changeType === 'dietary')?.status, 'prep_impact')
  assert.equal(
    t14.find((window) => window.changeType === 'cancellation_reschedule')?.paymentScope,
    'policy_review'
  )
})

test('notification preferences are role-aware and keep sensitive topics gated', () => {
  const preferences = getDinnerCircleNotificationPreferences()
  const guestTopics = getStewardshipNotificationTopicsForRole('guest')
  const chefTopics = getStewardshipNotificationTopicsForRole('chef')
  const paymentPreference = preferences.find((preference) => preference.id === 'addons_payments')
  const riskPreference = preferences.find((preference) => preference.id === 'chef_only_risk')

  assert.equal(guestTopics.includes('major_updates'), true)
  assert.equal(guestTopics.includes('addons_payments'), false)
  assert.equal(chefTopics.includes('chef_only_risk'), true)
  assert.equal(paymentPreference?.sensitive, true)
  assert.equal(riskPreference?.allowedRoles.includes('guest'), false)
})

test('timeline gates and add-on prompts honor timing and ledger safety', () => {
  const gates = getStewardshipTimelineGates(20)
  const prompts = getStewardshipAddOnPrompts({
    daysUntil: 20,
    guestCount: 10,
    outstandingBalanceCents: 0,
    menuApproved: true,
    occasion: 'Birthday dinner',
  })
  const lockedPrompts = getStewardshipAddOnPrompts({
    daysUntil: 2,
    guestCount: 10,
    outstandingBalanceCents: 0,
    menuApproved: true,
    occasion: 'Birthday dinner',
  })

  assert.equal(gates.find((gate) => gate.id === 't30_experience_finalization')?.status, 'current')
  assert.equal(
    gates.find((gate) => gate.id === 't14_prep_impact_warning')?.notificationTopic,
    'major_updates'
  )
  assert.equal(prompts.find((prompt) => prompt.id === 'printed_menus')?.eligible, true)
  assert.equal(
    prompts.find((prompt) => prompt.id === 'staffing_service_extension')?.createsTask,
    'invoice_or_ledger'
  )
  assert.equal(
    lockedPrompts.find((prompt) => prompt.id === 'printed_menus')?.suppressedByWindow,
    true
  )
})

test('participant action contract separates useful actions from authority-sensitive actions', () => {
  const actions = getDinnerCircleActionContract()
  const intake = actions.find((action) => action.id === 'tell_us_anything_changed')
  const cancellation = actions.find((action) => action.id === 'cancel_or_reschedule')

  assert.ok(intake)
  assert.equal(intake?.allowedRoles.includes('guest'), false)
  assert.equal(intake?.requiresReview, true)
  assert.equal(intake?.visibility, 'host_chef')

  assert.ok(cancellation)
  assert.equal(cancellation?.tier, 'destructive')
  assert.deepEqual(cancellation?.allowedRoles, ['host', 'client'])
})

test('client intake action keeps auth and tenant filters in the server action', () => {
  const source = fs.readFileSync(
    path.join(process.cwd(), 'lib/dinner-circles/stewardship-actions.ts'),
    'utf8'
  )

  assert.match(source, /const user = await requireClient\(\)/)
  assert.match(source, /\.eq\('id', parsed\.data\.eventId\)/)
  assert.match(source, /\.eq\('client_id', user\.entityId\)/)
  assert.match(source, /\.eq\('tenant_id', user\.tenantId\)/)
  assert.match(source, /privateToHostChef/)
  assert.match(source, /Host\/Chef only/)
  assert.match(source, /submitDinnerNotificationPreferences/)
  assert.match(source, /submitStewardshipAddOnRequest/)
  assert.match(source, /addons_payments/)
  assert.match(source, /dinner_stewardship_add_on/)
})
