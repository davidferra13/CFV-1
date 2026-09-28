#!/usr/bin/env node
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { execFileSync } from 'node:child_process'
import { runScenario, replay, mutate, minimize, cluster, compare } from './core.mjs'
import { chefFlowAdapter, weatherFixtureAdapter } from './adapters.mjs'

const here = dirname(fileURLToPath(import.meta.url))
const root = join(here, '..', '..')
const load = name => JSON.parse(readFileSync(join(here, 'fixtures', name), 'utf8'))
const chef = load('chef-enthusiast.json')
const weather = load('weather-status.json')
const before = chefFlowAdapter({ injectMissingEligibility: true })
const fixed = chefFlowAdapter()
const mutations = mutate(chef, [
  { id: 'budget-floor', constraints: { maxPricePerPerson: 80 } },
  { id: 'budget-ceiling', constraints: { maxPricePerPerson: 200 } },
  { id: 'dietary-vegan', constraints: { dietary: ['vegan'] } },
  { id: 'service-outage', environment: { serviceStatus: 'down' } },
  { id: 'location-mismatch', constraints: { location: 'coastal' } }
])
const command = process.argv[2] ?? 'release'
const commit = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim()
const opts = { commit, seed: 101 }
if (command === 'release') {
  const runs = await Promise.all([chef, ...mutations].map(s => runScenario(s, fixed, opts)))
  const second = await runScenario(weather, weatherFixtureAdapter, opts)
  const violations = cluster([...runs, second])
  console.log(JSON.stringify({ command, commit, cases: runs.length + 1, violations, runIds: [...runs, second].map(x => x.runId) }))
  if (violations.length) process.exitCode = 1
} else if (command === 'replay') {
  const n = Number(process.argv[3] ?? 10)
  const runs = await replay(chef, fixed, n, opts)
  console.log(JSON.stringify({ command, count: runs.length, distinctOutcomes: new Set(runs.map(x => JSON.stringify([x.scores,x.violations]))).size,
    clusters: cluster(runs), runId: runs[0].runId }))
  if (runs.some(r => r.violations.length)) process.exitCode = 1
} else if (command === 'prove') {
  const baseline = await runScenario(chef, before, opts)
  const reproducible = await replay(chef, before, 10, opts)
  const reduced = await minimize(chef, before, 'hard_eligibility', opts)
  const repaired = await runScenario(reduced.scenario, fixed, opts)
  const replayFixed = await replay(chef, fixed, 10, opts)
  const allFixed = await Promise.all([chef, ...mutations].map(s => runScenario(s, fixed, opts)))
  const portability = await runScenario(weather, weatherFixtureAdapter, opts)
  const comparison = await compare([chef, ...mutations], before, fixed, opts)
  if (!baseline.violations.length || repaired.violations.length || replayFixed.some(x => x.violations.length) ||
    allFixed.some(x => x.violations.length) || portability.violations.length) throw Error('Milestone proof failed')
  const evidence = { kind: 'simulation-forge-m1-proof', generatedAt: new Date().toISOString(), commit, fixtureSource: chef.provenance,
    note: 'Fault-injected adapter deliberately omitted hard eligibility. Fixed adapter filters before calling the real ChefFlow scorer. Synthetic test items are not real customer outcomes.',
    baseline, repeatBefore: { count: reproducible.length, distinctOutcomes: new Set(reproducible.map(x => JSON.stringify(x.violations))).size,
      clusters: cluster(reproducible) }, minimized: { attempts: reduced.attempts, scenario: reduced.scenario, failingTrajectory: reduced.evidence.trajectory },
    repaired, repeatAfter: { count: replayFixed.length, violations: cluster(replayFixed) },
    mutationRuns: allFixed.map(x => ({ scenarioId: x.scenarioId, runId: x.runId, scores: x.scores, violations: x.violations })),
    comparison, portability }
  const target = join(root, 'docs', 'simulation-forge', 'first-milestone-evidence.json')
  mkdirSync(dirname(target), { recursive: true })
  writeFileSync(target, JSON.stringify(evidence, null, 2) + '\n')
  console.log(JSON.stringify({ command, target, baselineViolations: baseline.violations.length, minimizedItems: reduced.scenario.initialState.items.length,
    minimizedEvents: reduced.scenario.events.length, fixedReplays: replayFixed.length, mutations: allFixed.length, portability: portability.product,
    comparison, runIds: [baseline.runId, repaired.runId, portability.runId] }))
} else throw Error('Use prove, release, or replay [count]')
