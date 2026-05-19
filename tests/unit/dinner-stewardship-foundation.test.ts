import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import {
  buildStewardshipSnapshot,
  getDinnerCircleActionContract,
  getDinnerStewardshipLifecycleState,
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
  assert.equal(snapshot.logistics.chefBrings.length > 0, true)
  assert.equal(
    snapshot.memoryFeed.some((item) => item.source === 'event_guests'),
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
})
