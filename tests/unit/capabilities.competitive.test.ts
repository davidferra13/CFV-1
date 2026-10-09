import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync } from 'node:fs'
import {
  buildCompetitiveAudit,
  orderBenchmarks,
  productStatus,
  safeReference,
  safeSourceUrl,
  sourceStatus,
  validateCompetitiveRegistry,
  validDate,
} from '../../lib/capabilities/competitive.mjs'
import {
  escapeHtml,
  renderCompetitiveHtml,
  renderCompetitiveMarkdown,
} from '../../lib/capabilities/competitive-report.mjs'
const catalog = JSON.parse(
  readFileSync(new URL('../../lib/capabilities/competitive-catalog.json', import.meta.url), 'utf8')
)
const { benchmarks } = JSON.parse(
  readFileSync(
    new URL('../../lib/capabilities/competitive-benchmarks.json', import.meta.url),
    'utf8'
  )
)
const ids = new Set(benchmarks.flatMap((item) => item.canonicalCapabilityIds))
// Unit fixture only. The actual audit loads registry.ts; these are not implementation observations.
const canonical = [...ids].map((id) => ({ id, capability: id, evidence: ['lib/recipes'] }))
const clone = (value) => structuredClone(value)
const sources = new Map(catalog.sources.map((source) => [source.id, source]))
function audit(overrides = {}) {
  return buildCompetitiveAudit({
    catalog,
    benchmarks,
    canonicalRegistry: canonical,
    asOf: '2026-09-30',
    revision: { commit: 'test-fixture-only', dirty: false },
    ...overrides,
  })
}

test('catalog and benchmarks pass structural validation', () => {
  assert.deepEqual(validateCompetitiveRegistry(catalog, benchmarks, ids), [])
})
test('candidate universe is deduplicated without pretending it is exhaustive', () => {
  assert.equal(catalog.products.length, 233)
  assert.equal(catalog.categories.length, 24)
  assert.match(catalog.scope, /Non-exhaustive/)
  assert.equal(new Set(catalog.products.map((item) => item.id)).size, catalog.products.length)
  assert.equal(
    catalog.products
      .find((item) => item.id === 'samsung-food')
      .aliases.includes('Samsung Food Communities'),
    true
  )
})
test('unconfirmed candidates stay separate from documented vendors', () => {
  const counts = audit().summary.productResearch
  assert.equal(counts.UNCONFIRMED, 221)
  assert.equal(counts.VENDOR_DOCUMENTED, 11)
  assert.equal(counts.WINDING_DOWN_ANNOUNCED, 1)
})
test('source reviews reject impossible dates', () => {
  assert.equal(validDate('2026-02-30'), false)
  assert.equal(validDate('2026-09-30'), true)
  assert.equal(validDate('yesterday'), false)
})
test('source freshness uses the explicit audit date', () => {
  const source = catalog.sources[0]
  assert.equal(sourceStatus(source, '2026-09-29'), 'FUTURE_DATED')
  assert.equal(sourceStatus(source, '2026-10-30'), 'CURRENT_DOCUMENTATION')
  assert.equal(sourceStatus(source, '2026-10-31'), 'REVIEW_REQUIRED')
  assert.throws(() => sourceStatus(source, 'tomorrow'), /ISO calendar/)
})
test('announced closure never becomes claimed observed closure', () => {
  const product = catalog.products.find((item) => item.id === 'mealime')
  assert.equal(productStatus(product, sources, '2026-10-20'), 'WINDING_DOWN_ANNOUNCED')
  assert.equal(productStatus(product, sources, '2026-10-21'), 'ANNOUNCED_END_RECHECK_REQUIRED')
  assert.equal(productStatus(product, sources, '2026-12-01'), 'REVIEW_REQUIRED')
})
test('each benchmark has source-specific claims and at least two acceptance criteria', () => {
  assert.equal(benchmarks.length, 46)
  for (const row of benchmarks) {
    assert.ok(row.acceptance.length >= 2)
    for (const claim of row.competitorClaims)
      assert.equal(sources.get(claim.sourceId).productId, claim.productId)
  }
})
test('duplicate product IDs fail', () => {
  const input = clone(catalog)
  input.products.push(clone(input.products[0]))
  assert.match(validateCompetitiveRegistry(input, benchmarks, ids).join('\n'), /duplicate ID/)
})
test('duplicate names fail independently of IDs', () => {
  const input = clone(catalog)
  input.products[1].name = input.products[0].name
  assert.match(
    validateCompetitiveRegistry(input, benchmarks, ids).join('\n'),
    /Duplicate product name/
  )
})
test('source and product mismatches fail', () => {
  const input = clone(benchmarks)
  input[0].competitorClaims[0].productId = 'paprika-recipe-manager'
  assert.match(
    validateCompetitiveRegistry(catalog, input, ids).join('\n'),
    /source\/product mismatch/
  )
})
test('documented products require reciprocal sources', () => {
  const input = clone(catalog)
  input.products.find((item) => item.id === 'meez').sourceIds = []
  assert.match(validateCompetitiveRegistry(input, benchmarks, ids).join('\n'), /requires a source/)
})
test('unknown canonical mappings fail rather than silently becoming missing features', () => {
  const input = clone(benchmarks)
  input[0].canonicalCapabilityIds = ['invented-capability']
  assert.match(
    validateCompetitiveRegistry(catalog, input, ids).join('\n'),
    /unknown canonical capability/
  )
})
test('unknown dependencies fail', () => {
  const input = clone(benchmarks)
  input[0].dependsOn = ['invented-step']
  assert.throws(() => orderBenchmarks(input), /Unknown dependency/)
})
test('dependency cycles fail', () => {
  const input = clone(benchmarks)
  input[0].dependsOn = [input[1].id]
  assert.throws(() => orderBenchmarks(input), /Dependency cycle/)
})
test('work order respects dependencies even when their priority is lower', () => {
  const ordered = orderBenchmarks(benchmarks)
  const position = new Map(ordered.map((item, index) => [item.id, index]))
  for (const item of ordered)
    for (const dependency of item.dependsOn)
      assert.ok(position.get(dependency) < position.get(item.id))
  assert.ok(position.get('recipe-unit-conversion') < position.get('grocery-aggregation'))
})
test('ordering is deterministic', () => {
  assert.deepEqual(
    orderBenchmarks(benchmarks).map((item) => item.id),
    orderBenchmarks([...benchmarks].reverse()).map((item) => item.id)
  )
})
test('directory existence is only a candidate signal, never proven behavior', () => {
  const report = audit({
    pathObservations: { 'lib/recipes': { exists: true, kind: 'directory signal only' } },
  })
  assert.ok(report.benchmarks.some((item) => item.codeSignal === 'MAPPED_REFERENCE_FOUND'))
  assert.equal(report.summary.narrowWorkflowsProven, 0)
  assert.ok(report.benchmarks.every((item) => item.workflowVerdict === 'NOT_ASSESSED'))
})
test('missing references mean mapping work, not a claim the feature is absent', () => {
  const report = audit()
  assert.ok(
    report.benchmarks.every(
      (item) => item.recommendedWork === 'MAP_IMPLEMENTATION_BEFORE_DECLARING_ABSENT'
    )
  )
  assert.ok(report.benchmarks.every((item) => item.codeSignal === 'NO_MAPPED_REFERENCE'))
})
test('even verified canonical receipts do not imply narrow benchmark parity', () => {
  const proofEvaluations = Object.fromEntries(
    [...ids].map((id) => [id, { state: 'VERIFIED', reasons: [] }])
  )
  const report = audit({ proofEvaluations })
  assert.equal(report.summary.canonicalProofStates.VERIFIED, ids.size)
  assert.equal(report.summary.narrowWorkflowsProven, 0)
  assert.ok(report.benchmarks.every((item) => item.workflowVerdict === 'NOT_ASSESSED'))
})
test('proof evaluation failures remain distinct from missing proof', () => {
  const first = [...ids][0]
  const report = audit({
    proofEvaluations: { [first]: { state: 'ERROR', reasons: ['test error'] } },
  })
  assert.equal(report.summary.canonicalProofStates.ERROR, 1)
})
test('unsupported manual parity promotion is rejected', () => {
  const input = clone(benchmarks)
  input[0].parity = 'SUPERIOR'
  assert.match(
    validateCompetitiveRegistry(catalog, input, ids).join('\n'),
    /unsupported parity claim/
  )
})
test('reference paths cannot escape the repository', () => {
  for (const path of ['../secret', '/tmp/file', 'C:\\secret', 'lib/../secret', 'lib//file'])
    assert.equal(safeReference(path), false)
  assert.equal(safeReference('lib/recipes'), true)
})
test('source links reject executable and local URLs', () => {
  for (const url of [
    'javascript:alert(1)',
    'http://vendor.com',
    'https://127.0.0.1',
    'https://user:pass@vendor.com',
    'https://localhost',
    'https://device.local',
  ])
    assert.equal(safeSourceUrl(url), false)
  assert.equal(safeSourceUrl('https://www.paprikaapp.com/'), true)
})
test('unsafe source URLs fail validation', () => {
  const input = clone(catalog)
  input.sources[0].url = 'javascript:alert(1)'
  assert.match(validateCompetitiveRegistry(input, benchmarks, ids).join('\n'), /unsafe source URL/)
})
test('HTML escapes stored labels and contains no external scripts', () => {
  const report = audit()
  report.products[0].name = '<img src=x onerror=alert(1)>'
  const html = renderCompetitiveHtml(report)
  assert.ok(!html.includes('<img src=x'))
  assert.ok(html.includes('&lt;img src=x'))
  assert.equal((html.match(/<script>/g) ?? []).length, 1)
  assert.ok(!html.includes('<script src='))
  assert.equal(escapeHtml('"<&'), '&quot;&lt;&amp;')
})
test('HTML exposes search, categories, mobile layout, empty state and evidence boundaries', () => {
  const html = renderCompetitiveHtml(audit())
  for (const phrase of [
    'type="search"',
    'id="category"',
    'aria-live="polite"',
    'id="empty"',
    '@media(max-width:760px)',
    'No jobs have been dispatched',
    '0 narrow workflows proven',
  ])
    assert.ok(html.includes(phrase), phrase)
})
test('Markdown keeps source URLs and non-completion caveats', () => {
  const markdown = renderCompetitiveMarkdown(audit())
  assert.ok(markdown.includes('https://www.takeachef.com/en-us'))
  assert.ok(markdown.includes('not an executing job queue'))
  assert.ok(markdown.includes('workflows proven by this audit: 0'))
})
test('proposed queue never implies work is running', () => {
  assert.ok(audit().proposedWorkQueue.every((item) => item.state === 'PROPOSED_NOT_EXECUTED'))
})
test('canonical data inputs are never mutated by an audit', () => {
  const before = JSON.stringify({ catalog, benchmarks, canonical })
  audit()
  assert.equal(JSON.stringify({ catalog, benchmarks, canonical }), before)
})

test('benchmark mappings resolve to actual canonical registry IDs', async () => {
  const module = await import('../../lib/capabilities/registry.ts')
  const api = module.default ?? module
  assert.deepEqual(
    validateCompetitiveRegistry(
      catalog,
      benchmarks,
      new Set(api.CHEFFLOW_CAPABILITY_REGISTRY.map((item) => item.id))
    ),
    []
  )
})
