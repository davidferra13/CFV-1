import { createHash } from 'node:crypto'
import { freemem } from 'node:os'
const clone = x => structuredClone(x)
const hash = x => createHash('sha256').update(JSON.stringify(x)).digest('hex').slice(0, 16)
export const budgetDefaults = { maxRuns: 100, maxMs: 30000, minFreeRamBytes: 512 * 1024 * 1024 }
export function validate(s) {
  for (const key of ['id', 'product', 'actors', 'environment', 'initialState', 'events', 'expectedInvariants'])
    if (s[key] == null) throw Error('Missing scenario field: ' + key)
  if (!s.product.id || !Array.isArray(s.actors) || !Array.isArray(s.events) || !Array.isArray(s.expectedInvariants)) throw Error('Invalid schema')
  if (!['synthetic','observed','inferred'].includes(s.provenance?.kind)) throw Error('Provenance kind required')
  return s
}
export async function runScenario(s, adapter, { seed = 1, commit = 'unknown', configId = 'default', budget: override = {} } = {}) {
  validate(s)
  const budget = { ...budgetDefaults, ...override }
  if (freemem() < budget.minFreeRamBytes) throw Error('Low memory headroom')
  const start = performance.now(), epoch = Date.parse(s.environment.at)
  if (!Number.isFinite(epoch)) throw Error('Invalid environment.at')
  let state = clone(s.initialState), index = 0, error = null
  const trajectory = []
  const emit = (kind, data) => trajectory.push({ index: index++, at: new Date(epoch + index).toISOString(), kind, data: clone(data) })
  let randomState = seed >>> 0
  const ctx = { actors: clone(s.actors), environment: clone(s.environment), emit,
    random: () => ((randomState = (Math.imul(randomState, 1664525) + 1013904223) >>> 0) / 4294967296) }
  emit('start', { product: s.product.id, actors: s.actors.map(a => a.id) })
  for (const event of s.events) {
    if (performance.now() - start > budget.maxMs) { error = 'Runtime budget'; break }
    emit('input', event)
    const before = clone(state)
    try {
      const result = await adapter.step(clone(state), clone(event), ctx)
      state = result.state
      emit('transition', { before, after: state, messages: result.messages ?? [], toolCalls: result.toolCalls ?? [], decisions: result.decisions ?? [] })
    } catch (e) { error = String(e); emit('error', { message: error }); break }
  }
  let evalResult
  try { evalResult = await adapter.evaluate(clone(state), s, clone(trajectory)) }
  catch (e) { error = String(e); evalResult = { observations: [], scores: {}, violations: [] } }
  const violations = [...(evalResult.violations ?? []), ...(error ? [{ invariant: 'engine_error', detail: error }] : [])]
  emit('outcome', { observations: evalResult.observations, scores: evalResult.scores, violations })
  return { runId: hash([s, seed, adapter.version, adapter.evaluatorVersion ?? adapter.version, commit, configId, budget]), scenarioId: s.id, product: s.product.id, source: s.provenance,
    adapterVersion: adapter.version, evaluatorVersion: adapter.evaluatorVersion ?? adapter.version,
    configId, productVersion: s.product.version, model: 'none', seed, commit,
    environment: s.environment, actors: s.actors, observations: evalResult.observations, scores: evalResult.scores,
    violations, trajectory, measuredMs: +(performance.now() - start).toFixed(3) }
}
export async function replay(s, adapter, count = 10, opts = {}) {
  const budget = { ...budgetDefaults, ...opts.budget }
  if (!Number.isInteger(count) || count < 1 || count > budget.maxRuns) throw Error('Run budget exceeded')
  const seedMode = opts.seedMode ?? 'fixed'
  if (!['fixed', 'vary'].includes(seedMode)) throw Error('Unknown replay seed mode')
  const baseSeed = opts.seed ?? 1
  if (seedMode === 'vary' &&
    (!Number.isSafeInteger(baseSeed) || baseSeed < 0 || baseSeed + count - 1 > 0xffffffff))
    throw Error('Replay seed range exceeded')
  const start = performance.now(), runs = []
  for (let i = 0; i < count; i++) {
    if (performance.now() - start > budget.maxMs) throw Error('Replay time budget exceeded')
    runs.push(await runScenario(s, adapter, {
      ...opts, seed: seedMode === 'vary' ? baseSeed + i : baseSeed, budget
    }))
  }
  return runs
}
export function mutate(s, changes, maxCases = 16) {
  if (changes.length > maxCases) throw Error('Mutation budget exceeded')
  return changes.map(change => {
    const out = clone(s)
    out.id = s.id + ':' + change.id
    out.actors[0].constraints = { ...out.actors[0].constraints, ...change.constraints }
    out.environment = { ...out.environment, ...change.environment }
    out.mutation = { from: s.id, ...change }
    return out
  })
}
export async function minimize(s, adapter, invariant, opts = {}) {
  let smallest = clone(s), attempts = 0
  const failing = async candidate => { attempts++; return (await runScenario(candidate, adapter, opts)).violations.some(v => v.invariant === invariant) }
  if (!(await failing(smallest))) throw Error('Cannot reproduce failure')
  for (const key of ['events','items']) {
    const members = key === 'events' ? smallest.events : (Array.isArray(smallest.initialState.items) ? smallest.initialState.items : [])
    for (let i = members.length - 1; i >= 0; i--) {
      const candidate = clone(smallest)
      if (key === 'events') candidate.events.splice(i, 1)
      else candidate.initialState.items.splice(i, 1)
      if (await failing(candidate)) smallest = candidate
    }
  }
  return { scenario: smallest, attempts, evidence: await runScenario(smallest, adapter, opts) }
}
export function cluster(runs) {
  const map = new Map()
  for (const run of runs) for (const v of run.violations) {
    const key = [run.product, v.invariant, v.class ?? 'invariant'].join(':')
    const group = map.get(key) ?? { key, count: 0, runIds: [] }
    group.count++; group.runIds.push(run.runId); map.set(key, group)
  }
  return [...map.values()]
}
export async function compare(scenarios, before, after, opts = {}) {
  const cases = []
  for (const s of scenarios) {
    const a = await runScenario(s, before, opts), b = await runScenario(s, after, opts)
    cases.push({ scenarioId: s.id, seed: a.seed, before: { version: a.adapterVersion, violations: a.violations, scores: a.scores },
      after: { version: b.adapterVersion, violations: b.violations, scores: b.scores }, runIds: [a.runId, b.runId] })
  }
  return cases
}
