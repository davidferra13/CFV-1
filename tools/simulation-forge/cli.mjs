#!/usr/bin/env node
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { execFileSync } from 'node:child_process'
import { runScenario, replay, mutate, minimize, cluster, compare } from './core.mjs'
import { chefFlowAdapter, weatherFixtureAdapter } from './adapters.mjs'
import { homepageTasteScenario, homepageTasteAdapter } from './homepage-source.mjs'
import { bookingScenario, bookingAdapter, bookingVariants, availabilityRegression } from './booking.mjs'
import { marketplaceScenario, marketplaceAdapter, marketplaceVariants, marketplaceAvailabilityRegression } from './marketplace.mjs'

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
const sourceScenario = homepageTasteScenario(chef)
const sourceAdapter = homepageTasteAdapter()
const booking = bookingScenario(chef)
const bookingFixed = bookingAdapter()
const marketplace = marketplaceScenario(chef)
const marketplaceFixed = marketplaceAdapter()
if (command === 'release') {
  const runs = await Promise.all([chef, ...mutations].map(s => runScenario(s, fixed, opts)))
  const second = await runScenario(weather, weatherFixtureAdapter, opts)
  const realSource = await runScenario(sourceScenario, sourceAdapter, opts)
  const retained = load('booking-availability-regression.json')
  const bookings = await Promise.all([booking, ...bookingVariants(booking), retained].map(s => runScenario(s, bookingFixed, opts)))
  const retainedMarket = load('marketplace-availability-regression.json')
  const markets = await Promise.all([marketplace, ...marketplaceVariants(marketplace), retainedMarket]
    .map(s => runScenario(s, marketplaceFixed, opts)))
  const all = [...runs, second, realSource, ...bookings, ...markets]
  const violations = cluster(all)
  console.log(JSON.stringify({ command, commit, cases: all.length, violations, runIds: all.map(x => x.runId) }))
  if (violations.length) process.exitCode = 1
} else if (command === 'replay') {
  const n = Number(process.argv[3] ?? 10)
  const runs = await replay(chef, fixed, n, opts)
  console.log(JSON.stringify({ command, count: runs.length, distinctOutcomes: new Set(runs.map(x => JSON.stringify([x.scores,x.violations]))).size,
    clusters: cluster(runs), runId: runs[0].runId }))
  if (runs.some(r => r.violations.length)) process.exitCode = 1
} else if (command === 'marketplace-proof') {
  const changedSupply = marketplaceAvailabilityRegression(marketplace)
  const injectedAdapter = marketplaceAdapter({ injectMissingAvailabilityRecheck: true })
  const injected = await runScenario(changedSupply, injectedAdapter, opts)
  const reduced = await minimize(changedSupply, injectedAdapter, 'match_requires_available_chef', opts)
  const repaired = await runScenario(reduced.scenario, marketplaceFixed, opts)
  const repeated = await replay(reduced.scenario, marketplaceFixed, 10, opts)
  const family = await Promise.all([marketplace, ...marketplaceVariants(marketplace)]
    .map(s => runScenario(s, marketplaceFixed, opts)))
  const comparison = await compare([reduced.scenario], injectedAdapter, marketplaceFixed, opts)
  const trialSeeds = [1, 101, 1001, 10001, 1234567, 987654321]
  const paired = await Promise.all(trialSeeds.map(async seed => {
    const [before, after] = await Promise.all([
      runScenario(reduced.scenario, injectedAdapter, { ...opts, seed }),
      runScenario(reduced.scenario, marketplaceFixed, { ...opts, seed })])
    return { seed, before: { runId: before.runId, observations: before.observations, scores: before.scores,
      violations: before.violations }, after: { runId: after.runId, observations: after.observations,
      scores: after.scores, violations: after.violations } }
  }))
  const summer = marketplaceVariants(marketplace).find(s => s.mutation.kind === 'summer-demand')
  const sensitivity = await Promise.all(trialSeeds.map(seed => runScenario(summer, marketplaceFixed, { ...opts, seed })))
  if (!injected.violations.some(v => v.invariant === 'match_requires_available_chef') ||
    reduced.scenario.events.length >= changedSupply.events.length || repaired.violations.length ||
    repeated.some(r => r.violations.length) || family.some(r => r.violations.length) ||
    paired.some(p => !p.before.violations.length || p.after.violations.length) ||
    sensitivity.some(r => r.violations.length) ||
    new Set(sensitivity.map(r => r.scores.demand)).size < 2 ||
    !comparison[0].before.violations.length || comparison[0].after.violations.length)
    throw Error('Marketplace proof failed')
  const fixture = join(root, 'tools', 'simulation-forge', 'fixtures', 'marketplace-availability-regression.json')
  writeFileSync(fixture, JSON.stringify(reduced.scenario, null, 2) + '\n')
  const proof = { kind: 'simulation-forge-marketplace-proof', generatedAt: new Date().toISOString(), commit,
    note: 'Synthetic supply, geography, prices, requests, cancellations and season. Results show model sensitivity, never empirical demand or a business forecast.',
    capacitySource: marketplace.provenance.realCapacityModel, injected,
    minimized: { attempts: reduced.attempts, eventCount: reduced.scenario.events.length,
      fixture: 'tools/simulation-forge/fixtures/marketplace-availability-regression.json', evidence: reduced.evidence },
    repaired, replay: { count: repeated.length,
      distinctTrajectories: new Set(repeated.map(r => JSON.stringify(r.trajectory))).size,
      runIds: repeated.map(r => r.runId) },
    family: family.map(r => ({ scenarioId: r.scenarioId, runId: r.runId,
      observations: r.observations, scores: r.scores, violations: r.violations })),
    comparison, paired, sensitivity: sensitivity.map(r => ({ seed: r.seed, runId: r.runId,
      observations: r.observations, scores: r.scores, violations: r.violations })) }
  const target = join(root, 'docs', 'simulation-forge', 'marketplace-evidence.json')
  writeFileSync(target, JSON.stringify(proof, null, 2) + '\n')
  console.log(JSON.stringify({ command, target, fixture, injectedRunId: injected.runId,
    minimizedRunId: reduced.evidence.runId, repairedRunId: repaired.runId,
    minimizedEvents: reduced.scenario.events.length, replayCount: repeated.length,
    familyCount: family.length, pairedSeeds: trialSeeds, sensitivityDemand: sensitivity.map(r => r.scores.demand) }))
} else if (command === 'booking-proof') {
  const changedAvailability = availabilityRegression(booking)
  const injectedAdapter = bookingAdapter({ injectMissingAvailabilityRecheck: true })
  const injected = await runScenario(changedAvailability, injectedAdapter, opts)
  const reduced = await minimize(changedAvailability, injectedAdapter, 'confirmed_requires_available_chef', opts)
  const repaired = await runScenario(reduced.scenario, bookingFixed, opts)
  const repeated = await replay(reduced.scenario, bookingFixed, 10, opts)
  const family = await Promise.all([booking, ...bookingVariants(booking)].map(s => runScenario(s, bookingFixed, opts)))
  const comparison = await compare([reduced.scenario], injectedAdapter, bookingFixed, opts)
  if (!injected.violations.some(v => v.invariant === 'confirmed_requires_available_chef') ||
    reduced.scenario.events.length >= changedAvailability.events.length || repaired.violations.length ||
    repeated.some(r => r.violations.length) || family.some(r => r.violations.length) ||
    !comparison[0].before.violations.length || comparison[0].after.violations.length)
    throw Error('Booking proof failed')
  const fixture = join(root, 'tools', 'simulation-forge', 'fixtures', 'booking-availability-regression.json')
  writeFileSync(fixture, JSON.stringify(reduced.scenario, null, 2) + '\n')
  const proof = { kind: 'simulation-forge-booking-proof', generatedAt: new Date().toISOString(), commit,
    note: 'Historical persona with synthetic chef and interactions. The paid FSM state is reached by an explicitly synthetic acknowledgment. No payment, client message or production write occurred.',
    source: { persona: booking.provenance.source, modeledInquiryMap: booking.provenance.modeledInquiryMap,
      realEventFsm: booking.provenance.realEventFsm }, injected,
    minimized: { attempts: reduced.attempts, eventCount: reduced.scenario.events.length,
      fixture: 'tools/simulation-forge/fixtures/booking-availability-regression.json', evidence: reduced.evidence }, repaired,
    replay: { count: repeated.length, distinctTrajectories: new Set(repeated.map(r => JSON.stringify(r.trajectory))).size,
      runIds: repeated.map(r => r.runId) },
    family: family.map(r => ({ scenarioId: r.scenarioId, runId: r.runId, observations: r.observations,
      scores: r.scores, violations: r.violations })),
    comparison }
  const target = join(root, 'docs', 'simulation-forge', 'booking-evidence.json')
  writeFileSync(target, JSON.stringify(proof, null, 2) + '\n')
  console.log(JSON.stringify({ command, target, fixture, injectedRunId: injected.runId,
    minimizedRunId: reduced.evidence.runId, repairedRunId: repaired.runId, minimizedEvents: reduced.scenario.events.length,
    replayCount: repeated.length, familyCount: family.length, violationsAfter: repaired.violations.length }))
} else if (command === 'source-proof') {
  const real = await runScenario(sourceScenario, sourceAdapter, opts)
  const repeats = await replay(sourceScenario, sourceAdapter, 10, opts)
  const unavailable = await runScenario(sourceScenario, homepageTasteAdapter({ loadCandidates: () => { throw Error('offline') } }), opts)
  if (real.violations.length || repeats.some(r => r.violations.length) ||
    !unavailable.violations.some(v => v.invariant === 'candidate_source_available')) throw Error('Homepage source proof failed')
  const proof = { kind: 'simulation-forge-homepage-source-proof', generatedAt: new Date().toISOString(), commit,
    note: 'Real ChefFlow homepage candidate code was executed offline. Prices, inventory, availability, and live route behavior are not established.',
    real, replay: { count: repeats.length, distinctTrajectories: new Set(repeats.map(r => JSON.stringify(r.trajectory))).size },
    outage: unavailable }
  const target = join(root, 'docs', 'simulation-forge', 'homepage-source-evidence.json')
  writeFileSync(target, JSON.stringify(proof, null, 2) + '\n')
  console.log(JSON.stringify({ command, target, runId: real.runId, candidateCount: real.observations.find(x => x.kind === 'real_source').count,
    priceKnownCount: real.observations.find(x => x.kind === 'real_source').priceKnownCount,
    repeatCount: repeats.length, outageViolation: unavailable.violations[0]?.invariant }))
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
} else throw Error('Use prove, source-proof, booking-proof, marketplace-proof, release, or replay [count]')
