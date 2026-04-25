import test from 'node:test'
import assert from 'node:assert/strict'
import {
  buildDinnerCircleSnapshot,
  normalizeDinnerCircleConfig,
} from '../../lib/dinner-circles/event-circle'
import { isPublicUnauthenticatedPath } from '../../lib/auth/route-policy'

test('public ticketed event page stays unauthenticated', () => {
  assert.equal(isPublicUnauthenticatedPath('/e/share-token'), true)
})

test('dinner circle snapshot keeps the full event flow on one event object', () => {
  const event = {
    id: 'event-1',
    status: 'confirmed',
    guest_count: 12,
    quoted_price_cents: 144000,
    location: 'Farm table',
  }
  const config = normalizeDinnerCircleConfig({
    money: {
      paySplit: 'Net after costs split 70/30 between chef and host.',
      ticketSeller: 'ChefFlow public page',
      compensation: 'Chef paid from final payout.',
      platformFeePercent: 3,
    },
    supplier: {
      rawInput: 'tomatoes - 10 lb - Red Barn Farm\nbasil - 2 bunches - Red Barn Farm',
      sourceLinks: [{ ingredient: 'tomatoes', sourceName: 'Red Barn Farm' }],
    },
    menu: { manualNotes: 'Tomato tart, basil salad', pollEnabled: true },
    adaptive: {
      availabilityItems: [
        {
          ingredient: 'tomatoes',
          quantity: '10 lb',
          sourceName: 'Red Barn Farm',
          status: 'confirmed',
          unitCostCents: 6800,
          allocatedTo: 'event-1',
          flavorRole: 'acid and sweetness',
        },
        {
          ingredient: 'basil',
          quantity: '2 bunches',
          sourceName: 'Red Barn Farm',
          status: 'flexible',
          unitCostCents: 1200,
          substitution: 'mint',
          flavorRole: 'fresh herb lift',
        },
      ],
      clientExpectationNote:
        'The menu is seasonal; core courses stay aligned while farm-specific produce can change.',
      changeWindowNote: 'Final harvest check happens 48 hours before service.',
      pricingAdjustmentPolicy: 'Ingredient substitutions refresh the working food cost.',
      substitutionValidationNotes: 'Keep acidity, herb lift, and texture balanced.',
      finalValidationLocked: true,
      finalValidationNotes: 'Final sourcing confirmed.',
    },
    publicPage: { story: 'A farm dinner.', showGuestMap: true },
    layout: {
      zones: [{ id: 'guest', label: 'Guest table', kind: 'guest', x: 10, y: 10, w: 40, h: 30 }],
    },
    farm: { enabled: true, animals: [{ name: 'Mabel', species: 'cow' }] },
    social: { enabled: true, posts: [{ source: 'manual', label: 'Harvest update' }] },
  })

  const snapshot = buildDinnerCircleSnapshot({
    event,
    config,
    ticketTypes: [
      {
        id: 'type-1',
        event_id: event.id,
        tenant_id: 'chef-1',
        name: 'Seat',
        description: null,
        price_cents: 12000,
        capacity: 12,
        sold_count: 4,
        sort_order: 0,
        is_active: true,
        created_at: '',
        updated_at: '',
      },
    ],
    tickets: [
      {
        id: 'ticket-1',
        event_id: event.id,
        tenant_id: 'chef-1',
        ticket_type_id: 'type-1',
        buyer_name: 'A Guest',
        buyer_email: 'guest@example.com',
        buyer_phone: null,
        quantity: 4,
        unit_price_cents: 12000,
        total_cents: 48000,
        stripe_checkout_session_id: null,
        stripe_payment_intent_id: null,
        payment_status: 'paid',
        guest_token: 'guest-token',
        hub_profile_id: null,
        event_guest_id: null,
        dietary_restrictions: [],
        allergies: [],
        plus_one_name: null,
        plus_one_dietary: [],
        plus_one_allergies: [],
        notes: null,
        source: 'chefflow',
        external_order_id: null,
        attended: null,
        created_at: '',
        cancelled_at: null,
      },
    ],
    ticketSummary: {
      event_id: event.id,
      tenant_id: 'chef-1',
      tickets_sold: 1,
      tickets_pending: 0,
      tickets_refunded: 0,
      guests_confirmed: 4,
      revenue_cents: 48000,
      refunded_cents: 0,
      channel_count: 1,
      sales_by_source: { chefflow: 1 },
    },
    collaborators: [{ id: 'collab-1', role: 'sous_chef' }],
    eventMenus: ['menu-1'],
    eventPhotos: [{ id: 'photo-1', is_public: true }],
    shareUrl: '/e/share-token',
    hubGroupToken: 'circle-token',
    prepTimelineReady: true,
    locationReady: true,
    totalPaidCents: 48000,
    outstandingBalanceCents: 0,
    menuCostCents: 30000,
  })

  assert.equal(snapshot.eventId, event.id)
  assert.equal(snapshot.config.supplier?.ingredientLines.length, 2)
  assert.equal(snapshot.counts.paidGuests, 4)
  assert.equal(snapshot.money.projectedRevenueCents, 144000)
  assert.equal(snapshot.money.platformFeeCents, 4320)
  assert.equal(snapshot.money.netPayoutCents, 109680)
  assert.equal(
    snapshot.checks.every((check) => check.status === 'ready'),
    true
  )
  assert.equal(snapshot.defaults.statusMessage, 'Filling up')
  assert.ok(snapshot.defaults.rolePrompts.some((prompt) => prompt.role === 'supplier'))
  assert.ok(snapshot.defaults.shareSnippets.text.includes('/e/share-token'))
  assert.equal(snapshot.adaptive.confirmedCount, 1)
  assert.equal(snapshot.adaptive.flexibleCount, 1)
  assert.equal(snapshot.adaptive.estimatedIngredientCostCents, 8000)
  assert.equal(snapshot.adaptive.liveMenuState, 'locked')
})
