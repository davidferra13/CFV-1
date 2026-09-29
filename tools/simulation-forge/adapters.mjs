import * as discoveryScoring from '../../lib/discovery/discovery-rail-scoring.ts'
// tsx under Node 20 exposes the repo's CommonJS-compiled TS as a default namespace.
const scoreDiscoveryRailItems = discoveryScoring.scoreDiscoveryRailItems ?? discoveryScoring.default?.scoreDiscoveryRailItems
function eligible(item, actor, environment) {
  const c = actor.constraints ?? {}
  if (c.maxPricePerPerson != null && (!Number.isFinite(item.pricePerPerson) || item.pricePerPerson > c.maxPricePerPerson)) return false
  if (c.dietary?.length && !c.dietary.every(d => item.dietary?.includes(d))) return false
  if (c.location && item.location !== c.location) return false
  if (item.available === false || environment.serviceStatus === 'down') return false
  return true
}
export function chefFlowAdapter({ injectMissingEligibility = false } = {}) {
  return {
    version: injectMissingEligibility ? 'chef-discovery-fault-injected' : 'chef-discovery-eligibility-v1',
    async step(state, event, { actors, environment }) {
      if (event.type === 'discover') {
        const actor = actors[0]
        const candidates = injectMissingEligibility ? state.items : state.items.filter(item => eligible(item, actor, environment))
        const signals = { rankedPreferences: actor.history?.rankedPreferences ?? [], suppressedItems: actor.history?.suppressedItems ?? [] }
        state.ranked = scoreDiscoveryRailItems(candidates, signals, { role: 'craving', locationActive: Boolean(actor.constraints?.location) })
          .map(({ item, debug }) => ({ ...item, debug }))
        return { state, toolCalls: [{ name: 'scoreDiscoveryRailItems', candidateCount: candidates.length }],
          decisions: [{ kind: 'rank', candidateIds: candidates.map(x => x.id) }] }
      }
      if (event.type === 'choose') {
        state.choice = state.ranked?.[0] ?? null
        return { state, messages: [{ from: 'ChefFlow', to: actors[0].id, text: state.choice?.label ?? 'No verified fit found' }] }
      }
      throw Error('Unknown ChefFlow event: ' + event.type)
    },
    evaluate(state, s) {
      const actor = s.actors[0], returned = state.ranked ?? [], unsafe = returned.filter(x => !eligible(x, actor, s.environment))
      return { observations: [{ kind: 'ranked_items', items: returned.map(x => ({ id: x.id, score: x.debug.score, pricePerPerson: x.pricePerPerson })) },
          { kind: 'selected', id: state.choice?.id ?? null }],
        scores: { hardConstraintPass: Number(unsafe.length === 0), completion: Number(Boolean(state.choice)),
          diversity: returned.length ? new Set(returned.map(x => x.type)).size / returned.length : 0, userActions: s.events.length },
        violations: unsafe.map(x => ({ invariant: 'hard_eligibility', class: 'candidate_filter', itemId: x.id })) }
    }
  }
}
// Fixture only; no WeatherHQ product code is modified or deployed.
export const weatherFixtureAdapter = {
  version: 'weather-fixture-v1',
  async step(state, event, { environment, actors }) {
    if (event.type !== 'check_forecast') throw Error('Unknown event')
    state.message = environment.serviceStatus === 'down' ? 'Forecast unavailable' : state.forecast.alert
    return { state, messages: [{ from: 'WeatherHQ fixture', to: actors[0].id, text: state.message }],
      toolCalls: [{ name: 'fixtureForecast', status: environment.serviceStatus }] }
  },
  evaluate(state, s) {
    const ok = s.environment.serviceStatus === 'down' ? state.message === 'Forecast unavailable' : state.message === state.forecast.alert
    return { observations: [{ kind: 'forecast_message', value: state.message }], scores: { truthfulStatus: Number(ok) },
      violations: ok ? [] : [{ invariant: 'truthful_status', class: 'status_mismatch' }] }
  }
}
