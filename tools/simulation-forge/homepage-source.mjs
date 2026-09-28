import * as tasteRail from '../../lib/discovery/homepage-taste-rail.ts'
import * as destinations from '../../lib/discovery/homepage-discovery-destinations.ts'
import { chefFlowAdapter } from './adapters.mjs'
const buildHomepageTasteRailItems = tasteRail.buildHomepageTasteRailItems ?? tasteRail.default?.buildHomepageTasteRailItems
const auditRailDestinations = destinations.auditRailDestinations ?? destinations.default?.auditRailDestinations
const clone = x => structuredClone(x)
export function homepageTasteScenario(personaScenario) {
  const scenario = clone(personaScenario)
  scenario.id = 'chef-real-homepage-taste-001'
  scenario.provenance = { kind: 'inferred', source: 'lib/discovery/homepage-taste-rail.ts#buildHomepageTasteRailItems',
    actorSource: personaScenario.provenance.source,
    note: 'Real production code generates candidate links; actor behavior and events remain synthetic. Candidate prices and availability are unknown.' }
  scenario.product.version = 'source-checkout'
  scenario.actors[0].constraints = {}
  scenario.environment.serviceStatus = 'up'
  scenario.objective = 'Discover an actionable cuisine route from actual homepage source candidates'
  scenario.initialState = { items: [], sourceStatus: 'not_loaded' }
  scenario.expectedInvariants = [
    { id: 'valid_destinations', description: 'All returned links pass ChefFlow destination validation' },
    { id: 'candidate_source_available', description: 'Source failure produces no fabricated candidate' }
  ]
  return scenario
}
export function homepageTasteAdapter({ loadCandidates = buildHomepageTasteRailItems, limit = 40 } = {}) {
  if (!Number.isInteger(limit) || limit < 1 || limit > 120) throw Error('Candidate limit must be 1..120')
  const base = chefFlowAdapter()
  return {
    version: loadCandidates === buildHomepageTasteRailItems ? 'chef-homepage-source-v1' : 'chef-homepage-source-injected-v1',
    async step(state, event, ctx) {
      if (event.type !== 'discover') return base.step(state, event, ctx)
      try {
        const raw = loadCandidates({ seed: 'simulation-forge', limit })
        if (!Array.isArray(raw)) throw Error('Candidate source returned no array')
        state.items = raw.slice(0, limit).map(item => ({ ...item, id: item.type + ':' + item.href }))
        state.sourceStatus = 'loaded'
      } catch {
        state.items = []
        state.sourceStatus = 'unavailable'
      }
      const result = await base.step(state, event, ctx)
      result.toolCalls = [{ name: 'buildHomepageTasteRailItems', status: state.sourceStatus, count: state.items.length },
        ...result.toolCalls]
      return result
    },
    evaluate(state, scenario, trajectory) {
      const result = base.evaluate(state, scenario, trajectory)
      const checked = auditRailDestinations(state.ranked ?? [])
      result.observations.push({ kind: 'real_source', status: state.sourceStatus, count: state.items.length,
        priceKnownCount: state.items.filter(item => Number.isFinite(item.pricePerPerson)).length,
        candidateIds: state.items.map(item => item.id), invalid: checked.invalid.map(x => x.reason) })
      result.scores.validDestinations = Number(checked.invalid.length === 0)
      result.scores.sourceAvailable = Number(state.sourceStatus === 'loaded')
      if (checked.invalid.length) result.violations.push({ invariant: 'valid_destinations', class: 'broken_link', count: checked.invalid.length })
      if (state.sourceStatus !== 'loaded') result.violations.push({ invariant: 'candidate_source_available', class: 'dependency_failure' })
      return result
    }
  }
}
