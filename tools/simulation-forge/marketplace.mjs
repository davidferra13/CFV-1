import * as capacity from '../../lib/intelligence/chef-capacity-twin.ts'
const buildCapacityProfile = capacity.buildCapacityProfile ?? capacity.default?.buildCapacityProfile
const deriveCapacityDecision = capacity.deriveCapacityDecision ?? capacity.default?.deriveCapacityDecision
if (!buildCapacityProfile || !deriveCapacityDecision) throw Error('ChefFlow pure capacity model unavailable')
const clone = value => structuredClone(value)
const actor = (id, role, persona) => ({
  id, role, persona, goals: [], preferences: {}, knowledge: [], authority: [],
  constraints: {}, tendencies: [], history: {}, memory: [], relationships: [],
  publicState: {}, privateState: {}
})
const event = (id, type, actorId, details = {}) => ({ id, type, actor: actorId, ...details })
const DATE = '2026-11-14'
export function marketplaceScenario(persona) {
  const client = clone(persona.actors[0])
  client.id = 'client-1'
  client.role = 'private-chef client'
  const otherClients = [2, 3, 4].map(i => actor('client-' + i, 'client', 'Synthetic market demand'))
  const chefs = [
    { id: 'chef-a', geography: 'urban', pricePerPerson: 110, available: true, maxHoursPerWeek: 16, bookedDates: [] },
    { id: 'chef-b', geography: 'urban', pricePerPerson: 125, available: true, maxHoursPerWeek: 16, bookedDates: [] },
    { id: 'chef-c', geography: 'coastal', pricePerPerson: 95, available: true, maxHoursPerWeek: 12, bookedDates: [] }
  ]
  return { schemaVersion: 1, id: 'chef-marketplace-enthusiast-001',
    provenance: { kind: 'inferred', source: 'Chef Flow Personas/Completed/Public/the-enthusiast.txt',
      realCapacityModel: 'lib/intelligence/chef-capacity-twin.ts#deriveCapacityDecision',
      note: 'First client is persona-derived; other actors, inventory, demand, prices, geography, season and events are synthetic.' },
    product: { id: 'ChefFlow', version: 'source-checkout', capabilities: ['marketplace_matching', 'capacity_decision'],
      interfaces: ['synthetic_marketplace_twin'], tools: ['buildCapacityProfile', 'deriveCapacityDecision'],
      workflows: ['demand', 'quote', 'confirm', 'cancel'], permissions: [], externalDependencies: [],
      successCriteria: ['feasible synthetic allocations'], invariants: ['match_requires_available_chef',
        'match_respects_geography', 'match_within_budget', 'no_double_booking', 'capacity_decision_allows_allocation'] },
    actors: [client, ...otherClients, ...chefs.map(c => actor(c.id, 'chef', 'Synthetic chef')), actor('platform', 'marketplace operator', 'Synthetic allocator')],
    environment: { ...clone(persona.environment), season: 'winter', geography: 'urban' },
    objective: 'Probe sensitivity of synthetic matching to demand, supply, location, budget and season',
    initialState: { items: [], chefs, templates: [
      { id: 'request-1', clientId: 'client-1', geography: 'urban', budgetPerPerson: 140, guestCount: 6, date: DATE },
      { id: 'request-2', clientId: 'client-2', geography: 'urban', budgetPerPerson: 130, guestCount: 8, date: DATE },
      { id: 'request-3', clientId: 'client-3', geography: 'coastal', budgetPerPerson: 110, guestCount: 5, date: DATE },
      { id: 'request-4', clientId: 'client-4', geography: 'urban', budgetPerPerson: 105, guestCount: 4, date: DATE }],
      season: 'winter', requests: [], quotes: [], allocations: [], confirmations: [], blocked: [], processed: [],
      demandDraw: null },
    events: [event('market-1', 'market_cycle', 'platform'), event('quote-1', 'quote', 'client-1', { requestId: 'request-1' }),
      event('peek-1', 'peek_market', 'platform'), event('confirm-1', 'confirm', 'client-1', { requestId: 'request-1' }),
      event('quote-2', 'quote', 'client-2', { requestId: 'request-2' }),
      event('confirm-2', 'confirm', 'client-2', { requestId: 'request-2' })],
    expectedInvariants: ['match_requires_available_chef', 'match_respects_geography',
      'match_within_budget', 'no_double_booking', 'capacity_decision_allows_allocation'],
    hiddenInformation: ['synthetic chef capacity'], mutations: ['season', 'price', 'geography', 'availability', 'cancellation'] }
}
export function marketplaceAvailabilityRegression(s) {
  const out = clone(s)
  out.id += ':chef-unavailable-after-quote'
  out.events.splice(out.events.findIndex(e => e.id === 'confirm-1'), 0,
    event('supply-lost', 'availability_change', 'platform', { chefId: 'chef-a', available: false }))
  out.mutation = { from: s.id, kind: 'chef_unavailable_after_quote' }
  return out
}
export function marketplaceVariants(s) {
  const variant = (id, change) => {
    const out = clone(s)
    out.id += ':' + id
    change(out)
    out.mutation = { from: s.id, kind: id }
    return out
  }
  return [marketplaceAvailabilityRegression(s),
    variant('budget-floor', x => { x.initialState.templates[0].budgetPerPerson = 90 }),
    variant('chef-price-rise', x => { x.initialState.chefs[0].pricePerPerson = 155; x.initialState.chefs[1].pricePerPerson = 165 }),
    variant('coastal-demand', x => { x.initialState.templates[0].geography = 'coastal' }),
    variant('cancel-and-reallocate', x => {
      x.events.splice(x.events.findIndex(e => e.id === 'quote-2'), 0,
        event('cancel-1', 'cancel_booking', 'client-1', { requestId: 'request-1' }))
    }),
    variant('summer-demand', x => { x.environment.season = 'summer' }),
    variant('chef-offline-before-quote', x => {
      x.events.splice(x.events.findIndex(e => e.id === 'quote-1'), 0,
        event('supply-before-quote', 'availability_change', 'platform', { chefId: 'chef-a', available: false }))
    })]
}
const workloadInput = { prepMinutes: 80, shoppingMinutes: 35, adminMinutes: 15,
  travelMinutes: 30, serviceMinutes: 120, cleanupMinutes: 30, recoveryMinutes: 30,
  communicationMinutes: 15, staffCoordinationMinutes: 0, menuDevelopmentMinutes: 0, loadoutMinutes: 10,
  menuKnown: true, locationKnown: true, staffPlanKnown: true }
function capacityDecision(state, chef, request) {
  const profile = buildCapacityProfile({ tenantId: 'synthetic-market', chefId: chef.id,
    capacitySettings: { default_prep_hours: 4, default_travel_minutes: 60, default_cleanup_hours: 1 },
    legacyChef: { max_hours_per_week: chef.maxHoursPerWeek } })
  const existingDayMinutes = state.allocations
    .filter(a => a.chefId === chef.id && a.date === request.date)
    .reduce((sum, a) => sum + a.workloadMinutes, 0)
  const existingWeekMinutes = state.allocations
    .filter(a => a.chefId === chef.id).reduce((sum, a) => sum + a.workloadMinutes, 0)
  return deriveCapacityDecision({ tenantId: 'synthetic-market', chefId: chef.id,
    subjectType: 'inquiry', subjectId: request.id, targetDate: request.date, profile,
    workloadInput: { ...workloadInput, guestCount: request.guestCount },
    existingDayMinutes, existingWeekMinutes })
}
export function marketplaceAdapter({ injectMissingAvailabilityRecheck = false } = {}) {
  return { version: injectMissingAvailabilityRecheck ? 'chef-marketplace-fault-injected-v1' : 'chef-marketplace-guarded-v1',
    evaluatorVersion: 'marketplace-invariants-v1',
    async step(state, action, { random, environment }) {
      const messages = [], toolCalls = [], decisions = []
      const block = reason => {
        state.blocked.push({ eventId: action.id, type: action.type, reason })
        decisions.push({ kind: 'blocked', reason })
      }
      if (!action.id) block('event id required')
      else if (state.processed.includes(action.id)) decisions.push({ kind: 'duplicate_ignored', eventId: action.id })
      else {
        const blockedBefore = state.blocked.length
        const request = state.requests.find(r => r.id === action.requestId)
        if (['market_cycle', 'peek_market', 'availability_change'].includes(action.type) && action.actor !== 'platform')
          block('platform actor required')
        else if (['quote', 'confirm', 'cancel_booking'].includes(action.type) && (!request || request.clientId !== action.actor))
          block('request owner required')
        else switch (action.type) {
          case 'market_cycle': {
            if (state.requests.length) { block('market cycle already opened'); break }
            state.season = environment.season === 'summer' ? 'summer' : 'winter'
            state.demandDraw = random()
            const count = state.season === 'summer' ? 3 + Number(state.demandDraw < 0.5)
              : 2 + Number(state.demandDraw < 0.2)
            state.requests = state.templates.slice(0, count).map(r => ({ ...r, status: 'new' }))
            decisions.push({ kind: 'synthetic_demand_sample', season: state.season,
              draw: state.demandDraw, requestCount: count })
            break
          }
          case 'peek_market':
            decisions.push({ kind: 'market_snapshot', demand: state.requests.length, supply: state.chefs.length })
            break
          case 'availability_change': {
            const chef = state.chefs.find(c => c.id === action.chefId)
            if (!chef) { block('chef not found'); break }
            chef.available = action.available === true
            decisions.push({ kind: 'synthetic_supply_change', chefId: chef.id, available: chef.available })
            break
          }
          case 'quote': {
            if (request.status !== 'new') { block('new request required for quote'); break }
            const eligible = []
            for (const chef of state.chefs) {
              const decision = capacityDecision(state, chef, request)
              toolCalls.push({ name: 'buildCapacityProfile', chefId: chef.id, source: 'lib/intelligence/chef-capacity-twin.ts' },
                { name: 'deriveCapacityDecision', chefId: chef.id, state: decision.state,
                  knownMinutes: decision.workload.totalKnownMinutes, unknownFactors: decision.workload.unknownFactors })
              if (chef.available && chef.geography === request.geography &&
                chef.pricePerPerson <= request.budgetPerPerson && !chef.bookedDates.includes(request.date) &&
                decision.state === 'available') eligible.push({ chef, decision })
            }
            eligible.sort((a, b) => a.chef.pricePerPerson - b.chef.pricePerPerson || a.chef.id.localeCompare(b.chef.id))
            if (!eligible.length) {
              request.status = 'unmatched'
              decisions.push({ kind: 'no_match', requestId: request.id })
              break
            }
            const { chef, decision } = eligible[0]
            state.quotes.push({ requestId: request.id, chefId: chef.id, pricePerPerson: chef.pricePerPerson,
              date: request.date, workloadMinutes: decision.workload.totalKnownMinutes })
            request.status = 'quoted'
            messages.push({ from: 'platform', to: request.clientId, text: 'Synthetic chef quote offered' })
            decisions.push({ kind: 'synthetic_quote', requestId: request.id, chefId: chef.id,
              capacityState: decision.state, pricePerPerson: chef.pricePerPerson })
            break
          }
          case 'confirm': {
            const quote = state.quotes.find(q => q.requestId === request.id)
            if (!quote || request.status !== 'quoted') { block('current quote required'); break }
            const chef = state.chefs.find(c => c.id === quote.chefId)
            const decision = capacityDecision(state, chef, request)
            toolCalls.push({ name: 'deriveCapacityDecision', chefId: chef.id, state: decision.state,
              knownMinutes: decision.workload.totalKnownMinutes, unknownFactors: decision.workload.unknownFactors })
            const snapshot = { requestId: request.id, chefId: chef.id, available: chef.available,
              sameGeography: chef.geography === request.geography,
              withinBudget: quote.pricePerPerson <= request.budgetPerPerson,
              freeSlot: !chef.bookedDates.includes(request.date), capacityState: decision.state }
            if (!injectMissingAvailabilityRecheck && !snapshot.available) block('chef availability changed after quote')
            else if (!snapshot.sameGeography || !snapshot.withinBudget) block('quote no longer meets hard eligibility')
            else if (!snapshot.freeSlot || snapshot.capacityState !== 'available') block('chef date or capacity no longer available')
            else {
              state.allocations.push({ requestId: request.id, chefId: chef.id, date: request.date,
                pricePerPerson: quote.pricePerPerson, workloadMinutes: quote.workloadMinutes })
              chef.bookedDates.push(request.date)
              request.status = 'confirmed'
              state.confirmations.push(snapshot)
              messages.push({ from: 'platform', to: request.clientId, text: 'Synthetic market allocation confirmed' })
            }
            break
          }
          case 'cancel_booking': {
            if (request.status !== 'confirmed' && request.status !== 'quoted') { block('active quote or allocation required'); break }
            const allocation = state.allocations.find(a => a.requestId === request.id)
            if (allocation) {
              state.allocations = state.allocations.filter(a => a.requestId !== request.id)
              const chef = state.chefs.find(c => c.id === allocation.chefId)
              chef.bookedDates = chef.bookedDates.filter(date => date !== allocation.date)
            }
            request.status = 'cancelled'
            decisions.push({ kind: 'synthetic_cancellation', requestId: request.id, capacityReleased: Boolean(allocation) })
            break
          }
          default: block('unknown market action')
        }
        if (state.blocked.length === blockedBefore) state.processed.push(action.id)
      }
      return { state, messages, toolCalls, decisions }
    },
    evaluate(state) {
      const failures = []
      for (const c of state.confirmations) {
        if (!c.available) failures.push({ invariant: 'match_requires_available_chef', class: 'stale_quote', requestId: c.requestId })
        if (!c.sameGeography) failures.push({ invariant: 'match_respects_geography', class: 'location', requestId: c.requestId })
        if (!c.withinBudget) failures.push({ invariant: 'match_within_budget', class: 'pricing', requestId: c.requestId })
        if (!c.freeSlot) failures.push({ invariant: 'no_double_booking', class: 'slot', requestId: c.requestId })
        if (c.capacityState !== 'available') failures.push({ invariant: 'capacity_decision_allows_allocation',
          class: 'capacity', requestId: c.requestId })
      }
      const activeSlots = state.allocations.map(a => a.chefId + ':' + a.date)
      if (new Set(activeSlots).size !== activeSlots.length)
        failures.push({ invariant: 'no_double_booking', class: 'active_slot' })
      return { observations: [
        { kind: 'market_state', season: state.season, demandDraw: state.demandDraw,
          requests: state.requests.map(r => ({ id: r.id, geography: r.geography, budgetPerPerson: r.budgetPerPerson, status: r.status })),
          chefs: state.chefs.map(c => ({ id: c.id, geography: c.geography, pricePerPerson: c.pricePerPerson,
            available: c.available, bookedDates: c.bookedDates })), allocations: state.allocations },
        { kind: 'confirmation_snapshots', values: state.confirmations },
        { kind: 'blocked_events', values: state.blocked }],
        scores: { demand: state.requests.length, allocations: state.allocations.length,
          unmatched: state.requests.filter(r => r.status === 'unmatched').length,
          cancelled: state.requests.filter(r => r.status === 'cancelled').length,
          invariantPass: Number(failures.length === 0) },
        violations: failures }
    }
  }
}
