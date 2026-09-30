/** Read-only competitive evidence layer. Canonical capabilities stay in registry.ts. */
const DAY = 86_400_000
const ID = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
const PRIORITIES = ['P0', 'P1', 'P2', 'P3']
const STRATEGIES = ['OWN', 'INTEGRATE', 'AGGREGATE', 'LAUNCH_ONLY']
const PERSONAS = [
  'HOST',
  'HOME_COOK',
  'HOUSEHOLD_COORDINATOR',
  'BEGINNER',
  'NON_COOK',
  'RELUCTANT_COOK',
  'PROFESSIONAL_CHEF',
  'KITCHEN_OPERATOR',
]
const PROOF_STATES = ['MISSING', 'INVALID', 'STALE', 'INCOMPLETE', 'VERIFIED', 'ERROR']
const text = (value) => typeof value === 'string' && value.trim().length > 0
const array = (value) => (Array.isArray(value) ? value : [])

export function validDate(value) {
  return (
    typeof value === 'string' &&
    /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    Number.isFinite(Date.parse(value)) &&
    new Date(value).toISOString().slice(0, 10) === value
  )
}

export function safeSourceUrl(value) {
  try {
    const url = new URL(value)
    return (
      url.protocol === 'https:' &&
      !url.username &&
      !url.password &&
      url.hostname.includes('.') &&
      !url.hostname.endsWith('.local') &&
      !/^[\d.]+$/.test(url.hostname) &&
      !url.hostname.includes(':') &&
      !url.hostname.startsWith('[')
    )
  } catch {
    return false
  }
}

export function safeReference(value) {
  return (
    text(value) &&
    !value.includes('\\') &&
    !value.startsWith('/') &&
    !value.includes(':') &&
    !value.split('/').some((part) => ['', '.', '..'].includes(part))
  )
}

/** Priority applies only after dependencies are satisfied in the proposed work order. */
export function orderBenchmarks(benchmarks) {
  const byId = new Map(benchmarks.map((item) => [item.id, item]))
  if (byId.size !== benchmarks.length) throw new Error('Duplicate benchmark ID')
  const pending = new Set(byId.keys())
  const ordered = []
  while (pending.size) {
    for (const id of pending) {
      for (const dependency of array(byId.get(id).dependsOn)) {
        if (!byId.has(dependency)) throw new Error(`Unknown dependency: ${id} -> ${dependency}`)
      }
    }
    const ready = [...pending]
      .map((id) => byId.get(id))
      .filter((item) => array(item.dependsOn).every((id) => !pending.has(id)))
      .sort(
        (a, b) =>
          PRIORITIES.indexOf(a.priority) - PRIORITIES.indexOf(b.priority) ||
          a.id.localeCompare(b.id)
      )
    if (!ready.length) throw new Error(`Dependency cycle: ${[...pending].join(', ')}`)
    const next = ready[0]
    ordered.push(next)
    pending.delete(next.id)
  }
  return ordered
}

export function validateCompetitiveRegistry(catalog, benchmarks, canonicalIds) {
  const errors = []
  if (catalog?.schemaVersion !== 1) errors.push('Unsupported catalog schemaVersion')
  if (!validDate(catalog?.snapshotDate)) errors.push('Invalid snapshot date')
  if (!Number.isInteger(catalog?.sourceReviewDays) || catalog.sourceReviewDays < 1)
    errors.push('Invalid source review interval')
  if (!text(catalog?.scope) || !text(catalog?.methodology))
    errors.push('Missing scope or methodology')
  const products = array(catalog?.products)
  const sources = array(catalog?.sources)
  const categories = array(catalog?.categories)
  if (!products.length || !categories.length || !sources.length || !array(benchmarks).length)
    errors.push('Empty registry collection')
  const unique = (items, label) => {
    const ids = new Set()
    for (const item of items) {
      if (!item || !ID.test(item.id)) {
        errors.push(`${label}: invalid ID`)
        continue
      }
      if (ids.has(item.id)) errors.push(`${label}: duplicate ID ${item.id}`)
      ids.add(item.id)
    }
    return ids
  }
  const productIds = unique(products, 'Product')
  const categoryIds = unique(categories, 'Category')
  const sourceIds = unique(sources, 'Source')
  unique(array(benchmarks), 'Benchmark')
  const sourceMap = new Map(sources.map((item) => [item?.id, item]))
  const productMap = new Map(products.map((item) => [item?.id, item]))
  const names = new Set()
  for (const category of categories) {
    if (
      !text(category?.label) ||
      !['DIRECT', 'ADJACENT', 'INFRASTRUCTURE', 'ATTENTION'].includes(category?.relationship)
    )
      errors.push(`${category?.id}: invalid category`)
  }
  for (const product of products) {
    if (!product) continue
    if (!text(product.name)) errors.push(`${product.id}: missing name`)
    const normalized = product.name?.trim().toLowerCase()
    if (names.has(normalized)) errors.push(`Duplicate product name: ${product.name}`)
    names.add(normalized)
    if (!['UNCONFIRMED', 'VENDOR_DOCUMENTED'].includes(product.researchStatus))
      errors.push(`${product.id}: invalid research status`)
    if (
      !array(product.categoryIds).length ||
      array(product.categoryIds).some((id) => !categoryIds.has(id))
    )
      errors.push(`${product.id}: invalid categories`)
    if (new Set(array(product.categoryIds)).size !== array(product.categoryIds).length)
      errors.push(`${product.id}: repeated category`)
    if (product.researchStatus === 'VENDOR_DOCUMENTED' && !array(product.sourceIds).length)
      errors.push(`${product.id}: documentation requires a source`)
    for (const id of array(product.sourceIds)) {
      if (!sourceIds.has(id) || sourceMap.get(id)?.productId !== product.id)
        errors.push(`${product.id}: invalid source ${id}`)
    }
    const lifecycle = product.lifecycle
    if (!['UNKNOWN', 'OFFERING_DOCUMENTED', 'WINDING_DOWN_ANNOUNCED'].includes(lifecycle?.state))
      errors.push(`${product.id}: invalid lifecycle`)
    if (lifecycle?.state !== 'UNKNOWN' && !validDate(lifecycle?.observedAt))
      errors.push(`${product.id}: invalid observation date`)
    if (lifecycle?.state === 'WINDING_DOWN_ANNOUNCED') {
      if (
        !validDate(lifecycle.announcedEndDate) ||
        lifecycle.announcedEndDate < lifecycle.observedAt
      )
        errors.push(`${product.id}: invalid announced end date`)
      if (!product.sourceIds.includes(lifecycle.sourceId))
        errors.push(`${product.id}: missing lifecycle source`)
    }
  }
  for (const source of sources) {
    if (!source) continue
    if (!productIds.has(source.productId)) errors.push(`${source.id}: unknown product`)
    if (!productMap.get(source.productId)?.sourceIds?.includes(source.id))
      errors.push(`${source.id}: missing reciprocal product reference`)
    if (!safeSourceUrl(source.url)) errors.push(`${source.id}: unsafe source URL`)
    if (!validDate(source.reviewedAt)) errors.push(`${source.id}: invalid review date`)
    if (source.reviewedAt > catalog.snapshotDate) errors.push(`${source.id}: review after snapshot`)
    if (source.kind !== 'VENDOR_DOCUMENTATION' || source.handsOnTested !== false)
      errors.push(`${source.id}: unsupported evidence claim`)
    if (!text(source.locator) || !text(source.summary))
      errors.push(`${source.id}: missing source context`)
  }
  for (const benchmark of array(benchmarks)) {
    if (!benchmark) continue
    const prefix = benchmark.id
    if (!text(benchmark.title) || !text(benchmark.rationale))
      errors.push(`${prefix}: missing description`)
    if (!categoryIds.has(benchmark.categoryId)) errors.push(`${prefix}: unknown category`)
    if (!PERSONAS.includes(benchmark.persona)) errors.push(`${prefix}: invalid persona`)
    if (!PRIORITIES.includes(benchmark.priority) || !STRATEGIES.includes(benchmark.strategy))
      errors.push(`${prefix}: invalid priority or strategy`)
    if (benchmark.parity !== 'NOT_ASSESSED') errors.push(`${prefix}: unsupported parity claim`)
    if (array(benchmark.acceptance).length < 2 || benchmark.acceptance.some((item) => !text(item)))
      errors.push(`${prefix}: incomplete acceptance criteria`)
    if (!Array.isArray(benchmark.dependsOn)) errors.push(`${prefix}: missing dependencies`)
    if (!Array.isArray(benchmark.canonicalCapabilityIds))
      errors.push(`${prefix}: missing canonical mapping`)
    for (const id of array(benchmark.canonicalCapabilityIds)) {
      if (canonicalIds && !canonicalIds.has(id))
        errors.push(`${prefix}: unknown canonical capability ${id}`)
    }
    for (const path of array(benchmark.codeReferences)) {
      if (!safeReference(path)) errors.push(`${prefix}: unsafe reference ${path}`)
    }
    if (!array(benchmark.competitorClaims).length) errors.push(`${prefix}: no competitor evidence`)
    for (const claim of array(benchmark.competitorClaims)) {
      const source = sourceMap.get(claim?.sourceId)
      if (!source || source.productId !== claim.productId)
        errors.push(`${prefix}: source/product mismatch`)
      if (!text(claim?.statement)) errors.push(`${prefix}: missing competitor statement`)
    }
  }
  if (!errors.length) {
    try {
      orderBenchmarks(benchmarks)
    } catch (error) {
      errors.push(error.message)
    }
  }
  return errors
}

export function sourceStatus(source, asOf, maxAgeDays = 30) {
  if (!validDate(asOf)) throw new Error('asOf must be a real ISO calendar date')
  if (!validDate(source?.reviewedAt)) return 'INVALID'
  const age = (Date.parse(asOf) - Date.parse(source.reviewedAt)) / DAY
  if (age < 0) return 'FUTURE_DATED'
  return age > maxAgeDays ? 'REVIEW_REQUIRED' : 'CURRENT_DOCUMENTATION'
}

export function productStatus(product, sourceMap, asOf, maxAgeDays = 30) {
  if (!validDate(asOf)) throw new Error('asOf must be a real ISO calendar date')
  const statuses = array(product.sourceIds).map((id) =>
    sourceStatus(sourceMap.get(id), asOf, maxAgeDays)
  )
  if (!statuses.includes('CURRENT_DOCUMENTATION'))
    return statuses.length ? 'REVIEW_REQUIRED' : 'UNCONFIRMED'
  if (product.lifecycle.state === 'WINDING_DOWN_ANNOUNCED') {
    // An announced end date is not firsthand proof of actual closure.
    return asOf >= product.lifecycle.announcedEndDate
      ? 'ANNOUNCED_END_RECHECK_REQUIRED'
      : 'WINDING_DOWN_ANNOUNCED'
  }
  return 'VENDOR_DOCUMENTED'
}

function tally(items, key) {
  return items.reduce((counts, item) => {
    const value = typeof key === 'function' ? key(item) : item[key]
    counts[value] = (counts[value] ?? 0) + 1
    return counts
  }, {})
}

/** Observations are supplied by the read-only CLI. File existence never proves behavior. */
export function buildCompetitiveAudit({
  catalog,
  benchmarks,
  canonicalRegistry,
  pathObservations = {},
  proofEvaluations = {},
  asOf,
  revision,
}) {
  const errors = validateCompetitiveRegistry(
    catalog,
    benchmarks,
    new Set(canonicalRegistry.map((item) => item.id))
  )
  if (errors.length) throw new Error(errors.join('\n'))
  if (!validDate(asOf)) throw new Error('asOf must be a real ISO calendar date')
  const sourceMap = new Map(catalog.sources.map((source) => [source.id, source]))
  const canonicalMap = new Map(canonicalRegistry.map((item) => [item.id, item]))
  const products = catalog.products.map((product) => ({
    ...product,
    currentResearchStatus: productStatus(product, sourceMap, asOf, catalog.sourceReviewDays),
  }))
  const productMap = new Map(products.map((product) => [product.id, product]))
  const rows = benchmarks.map((benchmark) => {
    const references = [
      ...new Set([
        ...benchmark.codeReferences,
        ...benchmark.canonicalCapabilityIds.flatMap((id) => canonicalMap.get(id)?.evidence ?? []),
      ]),
    ]
    const found = references.filter((path) => pathObservations[path]?.exists === true)
    const canonicalEvidence = benchmark.canonicalCapabilityIds.map((id) => {
      const result = proofEvaluations[id]
      return {
        id,
        title: canonicalMap.get(id).capability,
        proofState: PROOF_STATES.includes(result?.state) ? result.state : 'MISSING',
        reasons: array(result?.reasons),
        receiptPath: result?.receiptPath ?? `.agents/capability-proofs/${id}.json`,
      }
    })
    const competitorClaims = benchmark.competitorClaims.map((claim) => {
      const source = sourceMap.get(claim.sourceId)
      return {
        ...claim,
        productName: productMap.get(claim.productId).name,
        url: source.url,
        reviewedAt: source.reviewedAt,
        sourceStatus: sourceStatus(source, asOf, catalog.sourceReviewDays),
        productStatus: productMap.get(claim.productId).currentResearchStatus,
      }
    })
    return {
      ...benchmark,
      references: references.map((path) => ({
        path,
        ...pathObservations[path],
        exists: pathObservations[path]?.exists === true,
      })),
      codeSignal: found.length ? 'MAPPED_REFERENCE_FOUND' : 'NO_MAPPED_REFERENCE',
      canonicalEvidence,
      competitorClaims,
      // Even verified broad canonical capabilities do not prove these narrower criteria.
      workflowVerdict: 'NOT_ASSESSED',
      recommendedWork: found.length
        ? 'VERIFY_WORKFLOW_THEN_CLOSE_GAPS'
        : 'MAP_IMPLEMENTATION_BEFORE_DECLARING_ABSENT',
    }
  })
  const byId = new Map(rows.map((row) => [row.id, row]))
  const queue = orderBenchmarks(benchmarks).map((benchmark, index) => {
    const row = byId.get(benchmark.id)
    return {
      order: index + 1,
      benchmarkId: row.id,
      title: row.title,
      priority: row.priority,
      strategy: row.strategy,
      dependsOn: row.dependsOn,
      work: row.recommendedWork,
      acceptance: row.acceptance,
      state: 'PROPOSED_NOT_EXECUTED',
    }
  })
  const mappedCanonical = new Set(benchmarks.flatMap((item) => item.canonicalCapabilityIds))
  const benchmarkCategories = new Set(benchmarks.map((item) => item.categoryId))
  return {
    schemaVersion: 1,
    asOf,
    revision,
    scope: catalog.scope,
    methodology: catalog.methodology,
    limitations: [
      'Source text was reviewed, but competitor workflows were not operated or purchased.',
      'Catalog candidates are not all confirmed active products. Category assignments are editorial.',
      'References may be directories or neighboring features, not implementation of the named workflow.',
      'Existing canonical proof is reported separately and never promoted into granular competitive parity.',
      'The proposed work order is not a running agent queue and does not start jobs.',
      'No website behavior, database records or production service is changed by this audit.',
    ],
    summary: {
      candidates: products.length,
      categories: catalog.categories.length,
      documentedSources: catalog.sources.length,
      productResearch: tally(products, 'currentResearchStatus'),
      atomicBenchmarks: rows.length,
      acceptanceCriteria: rows.reduce((n, row) => n + row.acceptance.length, 0),
      canonicalCapabilities: canonicalRegistry.length,
      mappedCanonicalCapabilities: mappedCanonical.size,
      benchmarkCategories: benchmarkCategories.size,
      categoriesAwaitingBenchmarks: catalog.categories
        .filter((item) => !benchmarkCategories.has(item.id))
        .map((item) => item.label),
      codeSignals: tally(rows, 'codeSignal'),
      narrowWorkflowsProven: 0,
      canonicalProofStates: tally(
        canonicalRegistry,
        (item) => proofEvaluations[item.id]?.state ?? 'MISSING'
      ),
    },
    categories: catalog.categories,
    products,
    sources: catalog.sources,
    benchmarks: rows,
    proposedWorkQueue: queue,
  }
}
