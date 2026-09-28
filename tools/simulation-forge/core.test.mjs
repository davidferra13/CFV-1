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

test('run identity includes code commit, evaluator and configuration while exact replay stays stable', async () => {
  const a = await runScenario(chef, fixed, { seed: 101, commit: 'commit-a', configId: 'config-a' })
  const repeated = await runScenario(chef, fixed, { seed: 101, commit: 'commit-a', configId: 'config-a' })
  const b = await runScenario(chef, fixed, { seed: 101, commit: 'commit-b', configId: 'config-a' })
  const c = await runScenario(chef, fixed, { seed: 101, commit: 'commit-a', configId: 'config-b' })
  const d = await runScenario(chef, { ...fixed, evaluatorVersion: 'revised-rubric' },
    { seed: 101, commit: 'commit-a', configId: 'config-a' })
  assert.equal(a.runId, repeated.runId)
  assert.equal(JSON.stringify(a.trajectory), JSON.stringify(repeated.trajectory))
  assert.equal(new Set([a.runId, b.runId, c.runId, d.runId]).size, 4)
  assert.equal(a.configId, 'config-a')
})
test('minimizer handles scenarios without an items array', async () => {
  const scenario = structuredClone(weather)
  assert.equal('items' in scenario.initialState, false)
  const brokenWeather = { ...weatherFixtureAdapter, version: 'injected-weather-failure',
    evaluate: () => ({ observations: [], scores: {}, violations: [{ invariant: 'forced_failure' }] }) }
  const result = await minimize(scenario, brokenWeather, 'forced_failure')
  assert.equal(result.evidence.violations[0].invariant, 'forced_failure')
  assert.equal(result.scenario.events.length, 0)
})

test('varying seeds explores stochastic outcomes without changing exact replay semantics', async () => {
  const stochastic = {
    version: 'seed-probe-v1',
    async step(state, _event, { random }) {
      state.draw = random()
      return { state }
    },
    evaluate(state) {
      return { observations: [{ kind: 'draw', value: state.draw }],
        scores: { draw: state.draw }, violations: [] }
    }
  }
  const fixedSeeds = await replay(weather, stochastic, 6, { seed: 101 })
  assert.equal(new Set(fixedSeeds.map(x => x.runId)).size, 1)
  assert.equal(new Set(fixedSeeds.map(x => x.scores.draw)).size, 1)

  const varied = await replay(weather, stochastic, 6, { seed: 101, seedMode: 'vary' })
  assert.deepEqual(varied.map(x => x.seed), [101, 102, 103, 104, 105, 106])
  assert.equal(new Set(varied.map(x => x.runId)).size, 6)
  assert.equal(new Set(varied.map(x => x.scores.draw)).size, 6)
  assert.deepEqual(
    varied.map(x => x.scores.draw),
    (await replay(weather, stochastic, 6, { seed: 101, seedMode: 'vary' }))
      .map(x => x.scores.draw)
  )
  await assert.rejects(() => replay(weather, stochastic, 2, { seedMode: 'vary', seed: 0xffffffff }),
    /seed range/)
  await assert.rejects(() => replay(weather, stochastic, 2, { seedMode: 'unknown' }),
    /seed mode/)
})

test('an unresolved adapter step or grader fails within the runtime budget', async () => {
  let stepSignal
  const hangingStep = {
    version: 'hanging-step-fixture',
    step(_state, _event, ctx) {
      stepSignal = ctx.signal
      return new Promise(() => {})
    },
    evaluate() {
      throw Error('Evaluator must not run after an aborted step')
    }
  }
  const stepRun = await runScenario(weather, hangingStep, { budget: { maxMs: 60 } })
  assert.ok(stepSignal?.aborted)
  assert.match(stepRun.violations[0].detail, /Runtime budget/)
  assert.equal(stepRun.violations[0].invariant, 'engine_error')
  assert.ok(stepRun.measuredMs < 2000)

  let graderSignal
  const hangingGrader = {
    version: 'hanging-grader-fixture',
    step(state) { return { state } },
    evaluate(_state, _scenario, _trajectory, ctx) {
      graderSignal = ctx.signal
      return new Promise(() => {})
    }
  }
  const graderRun = await runScenario(weather, hangingGrader, { budget: { maxMs: 60 } })
  assert.ok(graderSignal?.aborted)
  assert.match(graderRun.violations[0].detail, /Runtime budget/)
  assert.equal(graderRun.violations[0].invariant, 'engine_error')
  assert.ok(graderRun.measuredMs < 2000)
  await assert.rejects(() => runScenario(weather, hangingStep, { budget: { maxMs: Infinity } }),
    /Invalid runtime budget/)
})
