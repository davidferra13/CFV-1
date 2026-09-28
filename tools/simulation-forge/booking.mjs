import * as eventFsm from '../../lib/events/fsm.ts'
import { mutate } from './core.mjs'
const validateTransition = eventFsm.validateTransition ?? eventFsm.default?.validateTransition
if (typeof validateTransition !== 'function') throw Error('ChefFlow event FSM unavailable')
const clone = value => structuredClone(value)
// Simulation mirror of lib/inquiries/actions.ts and app/api/v2/inquiries/[id]/route.ts.
// Both source maps are private and their server modules must not run in Forge.
const INQUIRY_NEXT = {
  new: ['awaiting_client', 'quoted', 'declined'],
  awaiting_client: ['awaiting_chef', 'quoted', 'declined', 'expired'],
  awaiting_chef: ['awaiting_client', 'quoted', 'declined'],
  quoted: ['confirmed', 'declined', 'expired'],
  confirmed: [], declined: [], expired: ['new']
}
const requiredActor = {
  discover: 'client', send_inquiry: 'client', chef_reply: 'chef', client_reply: 'client',
  chef_quote: 'chef', menu_preview: 'chef', client_accept: 'client', deposit_ack: 'platform',
  chef_confirm: 'chef', availability_change: 'platform', dietary_update: 'client', cancel: 'chef'
}
const event = (id, type, actor, more = {}) => ({ id, type, actor, ...more })
export function bookingScenario(persona) {
  const client = clone(persona.actors[0])
  client.id = 'client'
  client.role = 'private-chef client'
  const chef = { id: 'chef', role: 'chef', persona: 'Synthetic available chef', goals: ['deliver a safe dinner'],
    preferences: {}, knowledge: [], authority: ['reply', 'quote', 'confirm', 'cancel'], constraints: {},
    tendencies: [], history: {}, memory: [], relationships: ['client'], publicState: {}, privateState: {} }
  const platform = { ...clone(chef), id: 'platform', role: 'marketplace operator',
    persona: 'Simulation-only platform', authority: ['match', 'record synthetic deposit acknowledgment'],
    relationships: ['client', 'chef'] }
  return { schemaVersion: 1, id: 'chef-booking-enthusiast-001',
    provenance: { kind: 'inferred', source: 'Chef Flow Personas/Completed/Public/the-enthusiast.txt',
      modeledInquiryMap: 'lib/inquiries/actions.ts:VALID_TRANSITIONS',
      realEventFsm: 'lib/events/fsm.ts#validateTransition',
      note: 'Historical persona; chef, messages, availability, dietary events and deposit acknowledgment are synthetic.' },
    product: { id: 'ChefFlow', version: 'source-checkout', capabilities: ['inquiry', 'quote', 'event_fsm'],
      interfaces: ['synthetic_booking_funnel'], tools: ['validateTransition'], workflows: ['inquiry', 'quote', 'accept', 'confirm'],
      permissions: [], externalDependencies: [], successCriteria: ['safe simulated confirmation'],
      invariants: ['confirmed_requires_available_chef', 'confirmed_requires_dietary_review', 'confirmed_requires_deposit_ack'] },
    actors: [client, chef, platform],
    environment: { ...clone(persona.environment), chefAvailable: true },
    objective: 'Reach safe simulated booking confirmation after inquiry, quote and synthetic deposit acknowledgment',
    initialState: { items: [], selectedChefId: null, inquiry: { status: null, dietary: ['vegan'], dietaryVersion: 0, partySize: 6 },
      chef: { id: 'chef', available: true, supportsDietary: ['vegan'] }, eventStatus: null, quoteRevision: null,
      acceptedRevision: null, depositAcknowledgments: [], processedEvents: [], confirmationHistory: [], blocked: [] },
    events: [event('discover-1', 'discover', 'client'), event('inquiry-1', 'send_inquiry', 'client'),
      event('chef-reply-1', 'chef_reply', 'chef'), event('client-reply-1', 'client_reply', 'client'),
      event('quote-1', 'chef_quote', 'chef'), event('menu-1', 'menu_preview', 'chef'),
      event('accept-1', 'client_accept', 'client'),
      event('deposit-1', 'deposit_ack', 'platform', { synthetic: true }),
      event('confirm-1', 'chef_confirm', 'chef')],
    expectedInvariants: ['confirmed_requires_available_chef', 'confirmed_requires_dietary_review',
      'confirmed_requires_deposit_ack', 'no_duplicate_deposit_ack'], hiddenInformation: ['client budget'],
    mutations: ['availability', 'dietary', 'cancel', 'duplicate', 'out_of_order'] }
}
export function availabilityRegression(s) {
  const out = clone(s)
  out.id += ':lost-availability'
  out.events.splice(out.events.findIndex(e => e.type === 'chef_confirm'), 0,
    event('availability-lost', 'availability_change', 'platform', { available: false }))
  out.mutation = { from: s.id, kind: 'availability_lost_after_acceptance' }
  return out
}
export function bookingVariants(s) {
  const insert = (name, beforeType, incoming) => {
    const out = clone(s)
    out.id += ':' + name
    out.events.splice(out.events.findIndex(e => e.type === beforeType), 0, incoming)
    out.mutation = { from: s.id, kind: name }
    return out
  }
  const duplicate = clone(s)
  duplicate.id += ':duplicate-deposit'
  duplicate.events.splice(duplicate.events.findIndex(e => e.type === 'chef_confirm'), 0,
    clone(duplicate.events.find(e => e.type === 'deposit_ack')))
  duplicate.mutation = { from: s.id, kind: 'duplicate-deposit' }
  return [availabilityRegression(s),
    insert('dietary-update', 'chef_confirm', event('dietary-2', 'dietary_update', 'client', { dietary: ['vegan', 'nut-free'] })),
    insert('chef-cancel', 'deposit_ack', event('cancel-1', 'cancel', 'chef')),
    duplicate,
    insert('early-deposit', 'client_accept', event('deposit-early', 'deposit_ack', 'platform', { synthetic: true })),
    ...mutate(s, [{ id: 'initial-unavailable', environment: { chefAvailable: false } }])]
}
export function bookingAdapter({ injectMissingAvailabilityRecheck = false } = {}) {
  return { version: injectMissingAvailabilityRecheck ? 'chef-booking-fault-injected-v1' : 'chef-booking-guarded-v1',
    async step(state, action, { environment }) {
      const messages = [], toolCalls = [], decisions = []
      const block = reason => { state.blocked.push({ eventId: action.id, type: action.type, reason })
        decisions.push({ kind: 'blocked', reason }) }
      const send = (from, to, text) => messages.push({ from, to, text })
      const inquiryMove = to => {
        const from = state.inquiry.status
        if (!INQUIRY_NEXT[from]?.includes(to)) return false
        state.inquiry.status = to
        decisions.push({ kind: 'modeled_inquiry_transition', from, to })
        return true
      }
      const eventMove = (to, actor) => {
        const from = state.eventStatus
        const result = validateTransition(from, to, actor)
        toolCalls.push({ name: 'validateTransition', source: 'lib/events/fsm.ts', from, to, actor, valid: result.valid })
        if (!result.valid) { block(result.reason); return false }
        state.eventStatus = to
        decisions.push({ kind: 'real_fsm_rule_applied', from, to })
        return true
      }
      const dietaryFits = () => state.inquiry.dietary.every(d => state.chef.supportsDietary.includes(d))
      if (!action.id || !requiredActor[action.type] || requiredActor[action.type] !== action.actor) block('actor or event type not authorized')
      else if (state.processedEvents.includes(action.id)) decisions.push({ kind: 'duplicate_ignored', eventId: action.id })
      else {
        const oldBlockCount = state.blocked.length
        switch (action.type) {
          case 'discover':
            state.chef.available = environment.chefAvailable !== false
            state.selectedChefId = state.chef.available ? state.chef.id : null
            send('platform', 'client', state.selectedChefId ? 'Chef candidate found' : 'No chef available')
            break
          case 'send_inquiry':
            if (!state.selectedChefId || state.inquiry.status !== null) block('matching chef and new inquiry required')
            else { state.inquiry.status = 'new'; send('client', 'chef', 'Dinner inquiry for six guests') }
            break
          case 'chef_reply':
            if (!inquiryMove('awaiting_client')) block('inquiry not awaiting chef reply')
            else send('chef', 'client', 'Please confirm dietary needs and timing')
            break
          case 'client_reply':
            if (!inquiryMove('awaiting_chef')) block('inquiry not awaiting client reply')
            else send('client', 'chef', 'Six guests; vegan requirement confirmed')
            break
          case 'chef_quote':
            if (state.inquiry.status !== 'awaiting_chef' || !state.chef.available || !dietaryFits()) block('chef unavailable or dietary review incomplete')
            else if (!inquiryMove('quoted')) block('quote transition invalid')
            else {
              state.eventStatus = 'draft'
              decisions.push({ kind: 'synthetic_event_materialized', from: null, to: 'draft' })
              if (!eventMove('proposed', 'chef')) break
              state.quoteRevision = state.inquiry.dietaryVersion
              send('chef', 'client', 'Synthetic quote and menu proposal ready')
            }
            break
          case 'menu_preview':
            if (state.inquiry.status !== 'quoted') block('quote required for menu preview')
            else send('chef', 'client', 'Synthetic menu preview shared')
            break
          case 'client_accept':
            if (state.inquiry.status !== 'quoted') block('quoted inquiry required for acceptance')
            else if (eventMove('accepted', 'client')) {
              state.acceptedRevision = state.quoteRevision
              send('client', 'chef', 'Synthetic proposal accepted')
            }
            break
          case 'deposit_ack':
            if (!action.synthetic || state.eventStatus !== 'accepted') block('synthetic deposit acknowledgment requires accepted proposal')
            else if (eventMove('paid', 'system')) {
              state.depositAcknowledgments.push(action.id)
              decisions.push({ kind: 'synthetic_deposit_ack', externalPayment: false, eventId: action.id })
              send('platform', 'chef', 'Synthetic deposit acknowledgment recorded; no payment processed')
            }
            break
          case 'availability_change':
            state.chef.available = action.available === true
            decisions.push({ kind: 'availability_change', available: state.chef.available })
            break
          case 'dietary_update':
            if (!Array.isArray(action.dietary) || !action.dietary.every(x => typeof x === 'string')) block('invalid dietary update')
            else {
              state.inquiry.dietary = [...action.dietary]
              state.inquiry.dietaryVersion++
              send('client', 'chef', 'Dietary needs changed; quote review required')
            }
            break
          case 'cancel':
            if (state.eventStatus === null) block('no proposal to cancel')
            else if (eventMove('cancelled', 'chef')) {
              if (state.inquiry.status === 'quoted') inquiryMove('declined')
              send('chef', 'client', 'Proposal cancelled')
            }
            break
          case 'chef_confirm': {
            if (state.eventStatus !== 'paid' || state.inquiry.status !== 'quoted') {
              block('paid simulated event and quoted inquiry required')
              break
            }
            const snapshot = { available: state.chef.available && state.selectedChefId === state.chef.id,
              dietaryReviewed: dietaryFits() && state.quoteRevision === state.inquiry.dietaryVersion &&
                state.acceptedRevision === state.quoteRevision,
              syntheticDepositAcknowledged: state.depositAcknowledgments.length === 1 }
            if (!injectMissingAvailabilityRecheck && !snapshot.available) block('chef availability changed; confirmation requires recheck')
            else if (!snapshot.dietaryReviewed) block('dietary change requires quote review')
            else if (!snapshot.syntheticDepositAcknowledged) block('synthetic deposit acknowledgment required')
            else if (!INQUIRY_NEXT[state.inquiry.status].includes('confirmed')) block('inquiry confirmation transition invalid')
            else if (eventMove('confirmed', 'chef')) {
              state.inquiry.status = 'confirmed'
              state.confirmationHistory.push({ eventId: action.id, ...snapshot })
              decisions.push({ kind: 'modeled_inquiry_transition', from: 'quoted', to: 'confirmed' })
              send('platform', 'client', 'Simulation-only booking confirmed')
            }
            break
          }
        }
        if (state.blocked.length === oldBlockCount) state.processedEvents.push(action.id)
      }
      return { state, messages, toolCalls, decisions }
    },
    evaluate(state) {
      const checks = [
        ['confirmed_requires_available_chef', 'availability_recheck', x => x.available],
        ['confirmed_requires_dietary_review', 'dietary_recheck', x => x.dietaryReviewed],
        ['confirmed_requires_deposit_ack', 'synthetic_deposit_ack', x => x.syntheticDepositAcknowledged]
      ]
      const violations = state.confirmationHistory.flatMap(snapshot =>
        checks.filter(([, , passes]) => !passes(snapshot)).map(([invariant, failureClass]) =>
          ({ invariant, class: failureClass, eventId: snapshot.eventId })))
      if (new Set(state.depositAcknowledgments).size !== state.depositAcknowledgments.length)
        violations.push({ invariant: 'no_duplicate_deposit_ack', class: 'idempotency' })
      return {
        observations: [{ kind: 'booking_state', inquiryStatus: state.inquiry.status, eventStatus: state.eventStatus,
          chefAvailable: state.chef.available, dietary: state.inquiry.dietary, quoteRevision: state.quoteRevision,
          depositAcknowledgments: state.depositAcknowledgments },
          { kind: 'confirmation_snapshots', values: state.confirmationHistory },
          { kind: 'blocked_events', values: state.blocked }],
        scores: { simulatedConfirmation: Number(state.eventStatus === 'confirmed'),
          safeConfirmation: Number(violations.length === 0),
          blockedEvents: state.blocked.length, syntheticAcknowledgmentCount: state.depositAcknowledgments.length },
        violations
      }
    }
  }
}
