import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { runScenario, replay, mutate, minimize, cluster, compare, validate } from './core.mjs'
import { chefFlowAdapter, weatherFixtureAdapter } from './adapters.mjs'
const fixture = name => JSON.parse(readFileSync(new URL('./fixtures/' + name, import.meta.url)))
const chef = fixture('chef-enthusiast.json')
const weather = fixture('weather-status.json')
const broken = chefFlowAdapter({ injectMissingEligibility: true })
const fixed = chefFlowAdapter()
test('persona-derived scenario, real scorer, deterministic replay and injected counterexample', async () => {
  assert.equal(validate(chef).provenance.source, 'Chef Flow Personas/Completed/Public/the-enthusiast.txt')
  const before = await replay(chef, broken, 10, { seed: 101 })
  assert.equal(new Set(before.map(x => JSON.stringify([x.trajectory, x.scores, x.violations]))).size, 1)
  assert.ok(before.every(x => x.violations.some(v => v.invariant === 'hard_eligibility')))
  assert.equal(cluster(before)[0].count, 10)
  const minimal = await minimize(chef, broken, 'hard_eligibility', { seed: 101 })
  assert.equal(minimal.scenario.initialState.items.length, 1)
  assert.equal(minimal.scenario.initialState.items[0].id, 'high-price')
  assert.ok(minimal.evidence.trajectory.some(x => x.kind === 'transition'))
  assert.equal((await runScenario(minimal.scenario, fixed, { seed: 101 })).violations.length, 0)
  const after = await replay(chef, fixed, 10, { seed: 101 })
  assert.ok(after.every(x => x.violations.length === 0))
  const comparison = await compare([chef], broken, fixed, { seed: 101 })
  assert.equal(comparison[0].before.scores.hardConstraintPass, 0)
  assert.equal(comparison[0].after.scores.hardConstraintPass, 1)
})
test('boundary, dietary, outage, and location mutations respect hard eligibility', async () => {
  const mutations = mutate(chef, [
    { id: 'budget-floor', constraints: { maxPricePerPerson: 80 } },
    { id: 'budget-ceiling', constraints: { maxPricePerPerson: 200 } },
    { id: 'dietary-vegan', constraints: { dietary: ['vegan'] } },
    { id: 'outage', environment: { serviceStatus: 'down' } },
    { id: 'location', constraints: { location: 'coastal' } }
  ])
  for (const scenario of mutations) assert.equal((await runScenario(scenario, fixed)).violations.length, 0)
  assert.rejects(() => replay(chef, fixed, 101), /Run budget/)
})
test('same interface can run a second product fixture without modifying it', async () => {
  const result = await runScenario(weather, weatherFixtureAdapter, { seed: 101 })
  assert.equal(result.product, 'WeatherHQ')
  assert.equal(result.scores.truthfulStatus, 1)
  assert.equal(result.violations.length, 0)
})
