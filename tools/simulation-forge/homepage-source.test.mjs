import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { runScenario, replay } from './core.mjs'
import { homepageTasteScenario, homepageTasteAdapter } from './homepage-source.mjs'
const persona = JSON.parse(readFileSync(new URL('./fixtures/chef-enthusiast.json', import.meta.url)))
const scenario = homepageTasteScenario(persona)
test('actual ChefFlow taste loader yields bounded, valid candidates through the generic Forge interface', async () => {
  const runs = await replay(scenario, homepageTasteAdapter(), 10, { seed: 101 })
  assert.ok(runs.every(r => r.violations.length === 0))
  assert.equal(new Set(runs.map(r => JSON.stringify([r.trajectory, r.scores]))).size, 1)
  const source = runs[0].observations.find(x => x.kind === 'real_source')
  assert.equal(source.count, 40)
  assert.equal(source.priceKnownCount, 0)
  assert.equal(source.invalid.length, 0)
  assert.ok(runs[0].trajectory.some(x => x.kind === 'transition' && x.data.toolCalls.some(t => t.name === 'buildHomepageTasteRailItems')))
  assert.equal(runs[0].scores.validDestinations, 1)
})
test('source outage is visible and never invents a candidate', async () => {
  const broken = homepageTasteAdapter({ loadCandidates: () => { throw Error('offline') } })
  const run = await runScenario(scenario, broken)
  assert.equal(run.observations.find(x => x.kind === 'real_source').count, 0)
  assert.equal(run.observations.find(x => x.kind === 'selected').id, null)
  assert.ok(run.violations.some(v => v.invariant === 'candidate_source_available'))
  assert.equal(run.scores.sourceAvailable, 0)
  assert.notEqual(run.runId, (await runScenario(scenario, homepageTasteAdapter())).runId)
})
