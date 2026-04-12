import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

function read(relativePath: string) {
  return readFileSync(join(process.cwd(), relativePath), 'utf8')
}

test('settings hub keeps developer tools off the default surface', () => {
  const source = read('app/(chef)/settings/page.tsx')

  assert.match(source, /hasChefFeatureFlag\(CHEF_FEATURE_FLAGS\.developerTools\)/)
  assert.match(source, /sectionCount=\{developerToolsEnabled \? 20 : 19\}/)
  assert.match(source, /\{developerToolsEnabled && \(\s*<Link[\s\S]*href="\/settings\/zapier"/)
  assert.match(
    source,
    /\{developerToolsEnabled && \(\s*<SettingsCategory[\s\S]*title="API & Developer"/
  )
  assert.match(source, /description=\{systemAndAccountDescription\}/)
  assert.doesNotMatch(source, /description="Developer tools, legal, and account management"/)
})

test('developer-only settings routes redirect unless the feature flag is enabled', () => {
  const apiKeysPage = read('app/(chef)/settings/api-keys/page.tsx')
  const webhooksPage = read('app/(chef)/settings/webhooks/page.tsx')
  const zapierPage = read('app/(chef)/settings/zapier/page.tsx')

  for (const pageSource of [apiKeysPage, webhooksPage, zapierPage]) {
    assert.match(
      pageSource,
      /hasChefFeatureFlagWithDb\(db, user\.entityId, CHEF_FEATURE_FLAGS\.developerTools\)/
    )
    assert.match(pageSource, /redirect\('\/settings'\)/)
  }
})

test('server actions and API endpoints enforce the developer_tools flag', () => {
  const apiKeyActions = read('lib/api/key-actions.ts')
  const webhookActions = read('lib/webhooks/actions.ts')
  const zapierActions = read('lib/integrations/zapier/zapier-webhooks.ts')
  const zapierRoute = read('app/api/integrations/zapier/subscribe/route.ts')
  const apiMiddleware = read('lib/api/v2/middleware.ts')
  const webhookIndexRoute = read('app/api/v2/webhooks/route.ts')
  const webhookItemRoute = read('app/api/v2/webhooks/[id]/route.ts')
  const webhookTestRoute = read('app/api/v2/webhooks/[id]/test/route.ts')
  const webhookLogsRoute = read('app/api/v2/webhooks/[id]/logs/route.ts')

  assert.match(apiKeyActions, /requireChefFeatureFlag\(CHEF_FEATURE_FLAGS\.developerTools\)/)
  assert.match(webhookActions, /requireChefFeatureFlag\(CHEF_FEATURE_FLAGS\.developerTools\)/)
  assert.match(zapierActions, /requireChefFeatureFlag\(CHEF_FEATURE_FLAGS\.developerTools\)/)

  assert.match(
    zapierRoute,
    /hasChefFeatureFlag\(CHEF_FEATURE_FLAGS\.developerTools, user\.entityId\)/
  )
  assert.match(
    zapierRoute,
    /hasChefFeatureFlagWithDb\(db, tenantId, CHEF_FEATURE_FLAGS\.developerTools\)/
  )

  assert.match(apiMiddleware, /featureFlag\?: ChefFeatureFlag/)
  assert.match(
    apiMiddleware,
    /hasChefFeatureFlagWithDb\(db, keyCtx\.tenantId, options\.featureFlag\)/
  )

  for (const routeSource of [
    webhookIndexRoute,
    webhookItemRoute,
    webhookTestRoute,
    webhookLogsRoute,
  ]) {
    assert.match(routeSource, /featureFlag: CHEF_FEATURE_FLAGS\.developerTools/)
  }
})

test('the flag is operationally controllable and auditable', () => {
  const adminFlagsPage = read('app/(admin)/admin/flags/page.tsx')
  const backfillScript = read('scripts/backfill-developer-tools-flags.ts')
  const runbook = read('docs/developer-tools-runbook.md')
  const auditTypes = read('lib/admin/audit.ts')
  const flagActions = read('lib/admin/flag-actions.ts')

  assert.match(adminFlagsPage, /key: 'developer_tools'/)
  assert.match(adminFlagsPage, /label: 'Developer Tools'/)
  assert.match(adminFlagsPage, /Developer Tools Policy/)
  assert.match(adminFlagsPage, /Keep .*developer_tools.* off by default/)
  assert.match(adminFlagsPage, /npm run audit:developer-tools/)
  assert.match(adminFlagsPage, /docs\/developer-tools-runbook\.md/)
  assert.match(auditTypes, /'developer_tools_enabled'/)
  assert.match(auditTypes, /'developer_tools_disabled'/)
  assert.match(flagActions, /flagName === 'developer_tools'/)
  assert.match(flagActions, /\? 'developer_tools_enabled'/)
  assert.match(flagActions, /: 'developer_tools_disabled'/)
  assert.match(backfillScript, /const FLAG_NAME = 'developer_tools'/)
  assert.match(backfillScript, /Active raw webhooks:/)
  assert.match(backfillScript, /Active Zapier webhooks:/)
  assert.match(runbook, /## Default State/)
  assert.match(runbook, /Default: `off`/)
  assert.match(runbook, /## Enablement Rule/)
  assert.match(runbook, /## Review And Sunset/)
  assert.match(runbook, /## Observability/)
  assert.match(runbook, /developer_tools_enabled/)
  assert.match(runbook, /developer_tools_disabled/)
})

test('default-chef inventories and crawl scripts no longer treat developer tools as baseline', () => {
  const launchSpec = read('tests/launch/15-settings-and-modules.spec.ts')
  const productSpec = read('tests/product/09-deep-chef-features.spec.ts')
  const journeyHelpers = read('tests/journey/helpers/journey-helpers.ts')
  const crawlSite = read('tests/crawl-site.ts')
  const crawlSiteV2 = read('tests/crawl-site-v2.ts')
  const crawlFinal = read('tests/crawl-final.ts')
  const fullSiteCrawl = read('tests/e2e/99-full-site-crawl.spec.ts')
  const walkthrough = read('tests/full-walkthrough.mjs')
  const walkthroughJwt = read('tests/full-walkthrough-jwt.mjs')

  for (const source of [
    launchSpec,
    productSpec,
    journeyHelpers,
    crawlSite,
    crawlSiteV2,
    crawlFinal,
    fullSiteCrawl,
    walkthrough,
    walkthroughJwt,
  ]) {
    assert.doesNotMatch(source, /\/settings\/api-keys/)
    assert.doesNotMatch(source, /\/settings\/webhooks/)
    assert.doesNotMatch(source, /\/settings\/zapier/)
  }
})

test('canonical docs mark developer-tool routes as gated rather than default-visible', () => {
  const apiReference = read('docs/api-v2-reference.md')
  const featureRouteMap = read('docs/feature-route-map.md')
  const portalIndex = read('docs/chef-portal-complete-index.md')

  assert.match(apiReference, /developer_tools/)
  assert.match(
    featureRouteMap,
    /\/settings\/api-keys\s+\|\s+integrations-webhooks\s+\|\s+Integrations And Webhooks\s+\|\s+chef_privileged\s+\|\s+gated/
  )
  assert.match(
    featureRouteMap,
    /\/settings\/webhooks\s+\|\s+integrations-webhooks\s+\|\s+Integrations And Webhooks\s+\|\s+chef_privileged\s+\|\s+gated/
  )
  assert.match(
    featureRouteMap,
    /\/settings\/zapier\s+\|\s+integrations-webhooks\s+\|\s+Integrations And Webhooks\s+\|\s+chef_privileged\s+\|\s+gated/
  )
  assert.match(portalIndex, /### Developer Tools \(feature-flagged\)/)
})

test('first-use observability is wired across every developer-tool creation path', () => {
  const helper = read('lib/features/developer-tools-observability.ts')
  const apiKeyActions = read('lib/api/key-actions.ts')
  const webhookActions = read('lib/webhooks/actions.ts')
  const zapierActions = read('lib/integrations/zapier/zapier-webhooks.ts')
  const webhookIndexRoute = read('app/api/v2/webhooks/route.ts')
  const zapierRoute = read('app/api/integrations/zapier/subscribe/route.ts')

  assert.match(
    helper,
    /type DeveloperToolsFirstUseKind = 'api_key' \| 'raw_webhook' \| 'zapier_subscription'/
  )
  assert.match(helper, /action: 'api_key_created'/)
  assert.match(helper, /action: 'webhook_endpoint_created'/)
  assert.match(helper, /action: 'zapier_subscription_created'/)
  assert.match(helper, /developer_tools: true/)
  assert.match(helper, /first_use: true/)

  for (const source of [
    apiKeyActions,
    webhookActions,
    zapierActions,
    webhookIndexRoute,
    zapierRoute,
  ]) {
    assert.match(source, /logDeveloperToolsFirstUseIfNeeded\(/)
  }

  assert.match(webhookIndexRoute, /via: 'api_v2'/)
  assert.match(zapierRoute, /via: 'zapier_rest'/)
})
