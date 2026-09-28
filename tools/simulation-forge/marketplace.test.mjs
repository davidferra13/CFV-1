import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { runScenario, replay, minimize, compare } from './core.mjs'
import { marketplaceScenario, marketplaceAdapter, marketplaceVariants,
  marketplaceAvailabilityRegression } from './marketplace.mjs'
const persona = JSON.parse(readFileSync(new URL('./fixtures/chef-enthusiast.json', import.meta.url)))
const scenario = marketplaceScenario(persona)
const fixed = marketplaceAdapter()
const broken = marketplaceAdapter({ injectMissingAvailabilityRecheck: true })
test('synthetic marketplace calls real ChefFlow capacity model and respects price, place and supply', async () => {
  const run = await runScenario(scenario, fixed, { seed: 101, commit: 'test-sha' })
  assert.deepEqual(run.violations, [])
  const market = run.observations.find(x => x.kind === 'market_state')
  assert.equal(run.scores.demand, 2)
  assert.equal(run.scores.allocations, 2)
  assert.deepEqual(market.allocations.map(a => a.chefId), ['chef-a', 'chef-b'])
  assert.ok(run.trajectory.some(t => t.data.toolCalls?.some(c => c.name === 'deriveCapacityDecision')))
  assert.equal(run.source.realCapacityModel, 'lib/intelligence/chef-capacity-twin.ts#deriveCapacityDecision')
})
test('late chef outage yields minimized injected counterexample and guarded replay', async () => {
  const mutated = marketplaceAvailabilityRegression(scenario)
  const failed = await runScenario(mutated, broken, { seed: 101 })
  assert.ok(failed.violations.some(v => v.invariant === 'match_requires_available_chef'))
  const reduced = await minimize(mutated, broken, 'match_requires_available_chef', { seed: 101 })
  assert.ok(reduced.scenario.events.length < mutated.events.length)
  const repaired = await runScenario(reduced.scenario, fixed, { seed: 101 })
  assert.deepEqual(repaired.violations, [])
  assert.equal(repaired.scores.allocations, 0)
  assert.ok(repaired.observations.find(x => x.kind === 'blocked_events').values.some(x => x.reason.includes('availability')))
  const repeated = await replay(reduced.scenario, fixed, 10, { seed: 101 })
  assert.equal(new Set(repeated.map(r => JSON.stringify([r.trajectory, r.scores]))).size, 1)
  const comparison = await compare([reduced.scenario], broken, fixed, { seed: 101 })
  assert.equal(comparison[0].before.violations.length, 1)
  assert.equal(comparison[0].after.violations.length, 0)
})
test('bounded market mutations expose availability, budget, geography, cancellations and seasonality', async () => {
  const variants = marketplaceVariants(scenario)
  assert.equal(variants.length, 7)
  const runs = await Promise.all(variants.map(s => runScenario(s, fixed, { seed: 101 })))
  assert.ok(runs.every(r => r.violations.length === 0))
  assert.equal(runs[0].scores.allocations, 1)
  assert.equal(runs[1].observations.find(x => x.kind === 'market_state').requests[0].status, 'unmatched')
  assert.equal(runs[2].scores.unmatched, 2)
  assert.equal(runs[3].observations.find(x => x.kind === 'market_state').allocations[0].chefId, 'chef-c')
  assert.equal(runs[4].scores.cancelled, 1)
  assert.equal(runs[4].observations.find(x => x.kind === 'market_state').allocations[0].chefId, 'chef-a')
  assert.ok(runs[5].scores.demand >= 3)
  assert.equal(runs[6].observations.find(x => x.kind === 'market_state').allocations[0].chefId, 'chef-b')
})
test('paired distinct seeds expose synthetic demand sensitivity without changing invariant outcome', async () => {
  const summer = marketplaceVariants(scenario)[5]
  const seeds = [1, 101, 1001, 10001, 1234567, 987654321]
  const runs = await Promise.all(seeds.map(seed => runScenario(summer, fixed, { seed, commit: 'test-sha' })))
  assert.equal(new Set(runs.map(r => r.runId)).size, seeds.length)
  assert.ok(new Set(runs.map(r => r.scores.demand)).size >= 2)
  assert.ok(runs.every(r => r.violations.length === 0))
})

test('distinct-seed counterfactuals compare the same synthetic market draw before and after guard', async () => {
  const counterexample = marketplaceAvailabilityRegression(scenario)
  for (const seed of [1, 101, 1001, 10001, 1234567, 987654321]) {
    const [before, after] = await Promise.all([
      runScenario(counterexample, broken, { seed, commit: 'test-sha' }),
      runScenario(counterexample, fixed, { seed, commit: 'test-sha' })
    ])
    assert.equal(before.seed, after.seed)
    assert.equal(before.observations.find(x => x.kind === 'market_state').demandDraw,
      after.observations.find(x => x.kind === 'market_state').demandDraw)
    assert.equal(before.violations[0].invariant, 'match_requires_available_chef')
    assert.deepEqual(after.violations, [])
  }
})

test('minimized market outage fixture remains an automatic reproducible regression', async () => {
  const retained = JSON.parse(readFileSync(new URL('./fixtures/marketplace-availability-regression.json', import.meta.url)))
  assert.equal(retained.events.length, 4)
  const [before, after] = await Promise.all([
    runScenario(retained, broken, { seed: 101, commit: 'test-sha' }),
    runScenario(retained, fixed, { seed: 101, commit: 'test-sha' })])
  assert.equal(before.violations[0].invariant, 'match_requires_available_chef')
  assert.deepEqual(after.violations, [])
  assert.equal(after.scores.allocations, 0)
})
