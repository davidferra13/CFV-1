import test from 'node:test'
import assert from 'node:assert/strict'
import routeInventory from '@/lib/interface/route-inventory'
import {
  SURFACE_COMPLETENESS_CHECKS,
  buildSystemContractGraph,
  runSurfaceCompletenessAudit,
} from '@/lib/interface/surface-completeness'

test('surface completeness audit exposes stable machine-readable check ids', () => {
  assert.deepEqual(
    SURFACE_COMPLETENESS_CHECKS.map((check) => check.id),
    [
      'static-route-coverage',
      'dynamic-route-resolution',
      'build-surface-integrity',
      'surface-mode-declaration',
      'route-policy-alignment',
      'api-auth-inventory',
      'server-action-auth-inventory',
      'server-action-mutation-inventory',
      'derived-output-provenance-inventory',
      'public-seo-contract',
      'national-brand-audit',
      'platform-observability-coverage',
    ]
  )
})

test('surface completeness audit passes core structural checks', async () => {
  const report = await runSurfaceCompletenessAudit({
    checkIds: [
      'static-route-coverage',
      'build-surface-integrity',
      'surface-mode-declaration',
      'route-policy-alignment',
      'api-auth-inventory',
      'platform-observability-coverage',
    ],
  })

  assert.equal(report.failCount, 0, JSON.stringify(report.results, null, 2))
  assert.equal(report.warnCount, 0, JSON.stringify(report.results, null, 2))
})

test('surface completeness audit runs the server action auth inventory check', async () => {
  const report = await runSurfaceCompletenessAudit({
    checkIds: ['server-action-auth-inventory'],
  })

  assert.equal(report.selectedCheckCount, 1)
  assert.equal(report.results[0]?.id, 'server-action-auth-inventory')
  assert.equal(typeof report.results[0]?.summary.totalServerActionFiles, 'number')
  assert.equal(typeof report.results[0]?.summary.totalServerActionFunctions, 'number')
  assert.equal(typeof report.results[0]?.summary.missingAuthFunctions, 'number')
})

test('surface completeness audit runs the server action mutation inventory check', async () => {
  const report = await runSurfaceCompletenessAudit({
    checkIds: ['server-action-mutation-inventory'],
  })

  assert.equal(report.selectedCheckCount, 1)
  assert.equal(report.results[0]?.id, 'server-action-mutation-inventory')
  assert.equal(typeof report.results[0]?.summary.totalMutationFunctions, 'number')
  assert.equal(typeof report.results[0]?.summary.pageFacingMutationFunctions, 'number')
  assert.equal(typeof report.results[0]?.summary.contractCompliantFunctions, 'number')
  assert.equal(typeof report.results[0]?.summary.contractWarningFunctions, 'number')
  assert.equal(typeof report.results[0]?.summary.contractRequiredViolationFunctions, 'number')
  assert.equal(typeof report.results[0]?.summary.missingValidationFunctions, 'number')
  assert.equal(typeof report.results[0]?.summary.missingRevalidationFunctions, 'number')
  assert.equal(typeof report.results[0]?.summary.missingObservabilityFunctions, 'number')
  assert.equal(typeof report.results[0]?.summary.missingExplicitOutcomeFunctions, 'number')
  assert.equal(typeof report.results[0]?.summary.inputTenantMutationFunctions, 'number')
})

test('surface completeness audit inventories derived output provenance coverage', async () => {
  const report = await runSurfaceCompletenessAudit({
    checkIds: ['derived-output-provenance-inventory'],
  })

  assert.equal(report.selectedCheckCount, 1)
  assert.equal(report.results[0]?.id, 'derived-output-provenance-inventory')
  assert.equal(typeof report.results[0]?.summary.totalDerivedOutputs, 'number')
  assert.equal(typeof report.results[0]?.summary.sharedContractOutputs, 'number')
  assert.equal(typeof report.results[0]?.summary.aiAssistedOutputs, 'number')
  assert.equal(typeof report.results[0]?.summary.missingSharedContractOutputs, 'number')
  assert.equal(typeof report.results[0]?.summary.missingFreshnessOutputs, 'number')
  assert.equal(typeof report.results[0]?.summary.missingModelMetadataOutputs, 'number')
  assert.equal(typeof report.results[0]?.summary.observabilityBridgeOutputs, 'number')
})

test('surface completeness audit exposes dynamic route resolution inventory', async () => {
  const report = await runSurfaceCompletenessAudit({
    checkIds: ['dynamic-route-resolution'],
  })

  assert.equal(report.selectedCheckCount, 1)
  assert.equal(report.results[0]?.id, 'dynamic-route-resolution')
  assert.equal(typeof report.results[0]?.summary.totalDynamicTemplates, 'number')
  assert.equal(typeof report.results[0]?.summary.resolvedDynamicTemplates, 'number')
  assert.equal(typeof report.results[0]?.summary.staticParamResolvedTemplates, 'number')
  assert.equal(typeof report.results[0]?.summary.guardedPlaceholderTemplates, 'number')
  assert.ok(
    Number(report.results[0]?.summary.staticParamResolvedTemplates) > 0,
    'expected at least one dynamic route template to resolve through generateStaticParams or a static-param fallback'
  )
  assert.ok(
    Number(report.results[0]?.summary.guardedPlaceholderTemplates) > 0,
    'expected at least one dynamic route template to resolve through a guarded placeholder contract'
  )
})

test('surface completeness audit exposes build surface integrity inventory', async () => {
  const report = await runSurfaceCompletenessAudit({
    checkIds: ['build-surface-integrity'],
  })

  assert.equal(report.selectedCheckCount, 1)
  assert.equal(report.results[0]?.id, 'build-surface-integrity')
  assert.equal(report.results[0]?.status, 'pass', JSON.stringify(report.results, null, 2))
  assert.equal(typeof report.results[0]?.summary.surfacesChecked, 'number')
  assert.equal(typeof report.results[0]?.summary.missingExpectedPageRoutes, 'number')
  assert.equal(typeof report.results[0]?.summary.missingExpectedApiRoutes, 'number')
  assert.equal(report.results[0]?.summary.missingPaths, 0)
})

test('surface completeness audit exposes surface mode declarations', async () => {
  const report = await runSurfaceCompletenessAudit({
    checkIds: ['surface-mode-declaration'],
  })

  assert.equal(report.selectedCheckCount, 1)
  assert.equal(report.results[0]?.id, 'surface-mode-declaration')
  assert.equal(report.results[0]?.status, 'pass', JSON.stringify(report.results, null, 2))
  assert.equal(typeof report.results[0]?.summary.runtimeLayoutsChecked, 'number')
  assert.equal(typeof report.results[0]?.summary.buildSurfaceShellsChecked, 'number')
  assert.equal(report.results[0]?.summary.missingPortalMarkers, 0)
  assert.equal(report.results[0]?.summary.missingSurfaceMarkers, 0)
  assert.equal(report.results[0]?.summary.missingResolvers, 0)
  assert.equal(report.results[0]?.summary.missingPathnameBindings, 0)
  assert.equal(report.results[0]?.summary.missingBuildSurfaceShellMarkers, 0)
})

test('route inventory exposes dynamic page entries without changing static route counts', () => {
  const pageEntries = routeInventory.getPageRouteEntries()
  const staticEntries = routeInventory.getStaticPageRouteEntries()
  const dynamicEntries = routeInventory.getDynamicPageRouteEntries()

  assert.ok(pageEntries.length > staticEntries.length)
  assert.ok(dynamicEntries.length > 0)
  assert.equal(pageEntries.filter((entry) => !entry.isDynamic).length, staticEntries.length)
  assert.equal(pageEntries.filter((entry) => entry.isDynamic).length, dynamicEntries.length)
})

test('system contract graph links routes, APIs, build surfaces, and audit entrypoints', async () => {
  const graph = await buildSystemContractGraph()
  const pageRouteNodes = graph.nodes.filter((node) => node.kind === 'page-route')
  const apiRouteNodes = graph.nodes.filter((node) => node.kind === 'api-route')
  const mutationNodes = graph.nodes.filter((node) => node.kind === 'server-action-mutation')
  const derivedOutputNodes = graph.nodes.filter((node) => node.kind === 'derived-output')
  const buildSurfaceNodes = graph.nodes.filter((node) => node.kind === 'build-surface')
  const auditNodes = graph.nodes.filter((node) => node.kind === 'audit-entrypoint')
  const homeRouteNode = pageRouteNodes.find(
    (node) => node.metadata.template === '/' && node.metadata.sourceLayer === 'app'
  )
  const compareRouteNode = pageRouteNodes.find(
    (node) => node.metadata.template === '/compare/[slug]' && node.metadata.sourceLayer === 'app'
  )
  const ingredientCategoryRouteNode = pageRouteNodes.find(
    (node) =>
      node.metadata.template === '/ingredients/[category]' && node.metadata.sourceLayer === 'app'
  )
  const webBetaNode = buildSurfaceNodes.find((node) => node.id === 'build-surface:web-beta')

  assert.equal(graph.summary.pageRoutes, pageRouteNodes.length)
  assert.equal(graph.summary.apiRoutes, apiRouteNodes.length)
  assert.equal(graph.summary.serverActionMutations, mutationNodes.length)
  assert.equal(graph.summary.derivedOutputNodes, derivedOutputNodes.length)
  assert.equal(graph.summary.buildSurfaces, buildSurfaceNodes.length)
  assert.equal(graph.summary.auditEntrypoints, auditNodes.length)
  assert.equal(graph.summary.buildSurfaceIntegrityFailures, 0)
  assert.ok(graph.summary.pageFacingWriteActions > 0)
  assert.ok(graph.summary.derivedOutputContractCompliantNodes > 0)
  assert.equal(typeof graph.summary.pageFacingWriteContractCompliantActions, 'number')
  assert.equal(typeof graph.summary.pageFacingWriteContractWarningActions, 'number')
  assert.equal(typeof graph.summary.pageFacingWriteContractRequiredViolationActions, 'number')
  assert.ok(homeRouteNode, 'expected the home route to appear in the contract graph')
  assert.ok(compareRouteNode, 'expected a dynamic compare route to appear in the contract graph')
  assert.ok(
    ingredientCategoryRouteNode,
    'expected the ingredient category route to appear in the contract graph'
  )
  assert.ok(webBetaNode, 'expected the web-beta build surface to appear in the contract graph')
  assert.ok(
    mutationNodes.some((node) => node.metadata.classification === 'page-facing'),
    'expected page-facing mutation actions to appear in the contract graph'
  )
  assert.ok(
    mutationNodes.some(
      (node) =>
        typeof node.metadata.mutationContractStatus === 'string' &&
        Array.isArray(node.metadata.mutationContractRequiredViolationCodes) &&
        Array.isArray(node.metadata.mutationContractWarningCodes)
    ),
    'expected mutation nodes to expose machine-readable write contract metadata'
  )
  assert.ok(
    derivedOutputNodes.some(
      (node) =>
        node.metadata.relativeFilePath === 'lib/reports/compute-daily-report.ts' &&
        node.metadata.hasSharedContract === true
    ),
    'expected derived output producers to appear in the contract graph with shared-contract status'
  )
  assert.ok(
    graph.edges.some(
      (edge) => edge.from === homeRouteNode?.id && edge.type === 'has-seo-expectation'
    ),
    'expected the home route to link to a public SEO expectation'
  )
  assert.ok(
    graph.edges.some(
      (edge) =>
        edge.from.startsWith('api-route:') && edge.to === 'audit-entrypoint:audit:completeness:json'
    ),
    'expected API routes to link to the machine-readable audit entrypoint'
  )
  assert.ok(
    graph.edges.some(
      (edge) =>
        edge.from === 'build-surface:web-beta' &&
        edge.to === 'audit-entrypoint:audit:completeness:json'
    ),
    'expected the web-beta build surface to link to the machine-readable audit entrypoint'
  )
  assert.ok(
    graph.edges.some(
      (edge) =>
        edge.from === 'build-surface:web-beta' &&
        edge.to === 'audit-entrypoint:verify:release:web-beta'
    ),
    'expected the web-beta build surface to link to release verification'
  )
  assert.ok(
    graph.edges.some(
      (edge) =>
        edge.from.startsWith('server-action-mutation:') &&
        edge.to === 'audit-entrypoint:q80-cache-revalidation-after-mutation'
    ),
    'expected mutation actions to link to the Q80 write-contract ratchet'
  )
  assert.ok(
    graph.edges.some(
      (edge) =>
        edge.from === 'derived-output:lib/reports/compute-daily-report.ts' &&
        edge.to === 'audit-entrypoint:audit:completeness:json'
    ),
    'expected derived outputs to link to the machine-readable completeness audit'
  )
  assert.deepEqual(webBetaNode?.metadata.missingExpectedPageRoutes, [])
  assert.deepEqual(webBetaNode?.metadata.missingExpectedApiRoutes, [])
  assert.equal(webBetaNode?.metadata.releaseProfileId, 'web-beta')
  assert.equal(compareRouteNode?.metadata.siteAudit?.status, 'resolved')
  assert.equal(typeof homeRouteNode?.metadata.surfaceMode, 'string')
  assert.equal(typeof compareRouteNode?.metadata.surfaceMode, 'string')
  assert.ok(
    Array.isArray(compareRouteNode?.metadata.siteAudit?.resolverKinds) &&
      compareRouteNode.metadata.siteAudit.resolverKinds.includes('static-params'),
    'expected the compare route to resolve through a static-params contract'
  )
  assert.ok(
    Array.isArray(ingredientCategoryRouteNode?.metadata.siteAudit?.resolverKinds) &&
      ingredientCategoryRouteNode.metadata.siteAudit.resolverKinds.includes('static-params'),
    'expected ingredient category pages to resolve through a shared static-params contract'
  )
})
