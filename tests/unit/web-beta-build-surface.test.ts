import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import {
  buildSystemContractGraph,
  runSurfaceCompletenessAudit,
} from '@/lib/interface/surface-completeness'

function read(relativePath: string) {
  return readFileSync(join(process.cwd(), relativePath), 'utf8')
}

test('web-beta build surface keeps the supported route graph explicit', async () => {
  const manifest = read('scripts/build-surface-manifest.mjs')
  const betaSignInPage = read('app/auth/signin/page.tsx')
  const betaChefLayout = read('app/(chef)/layout.tsx')
  const betaDashboardPage = read('app/(chef)/dashboard/page.tsx')
  const betaClientLayout = read('app/(client)/layout.tsx')
  const betaMyEventsPage = read('app/(client)/my-events/page.tsx')
  const report = await runSurfaceCompletenessAudit({
    checkIds: ['build-surface-integrity'],
  })
  const buildSurfaceResult = report.results[0]
  const graph = await buildSystemContractGraph()
  const webBetaNode = graph.nodes.find((node) => node.id === 'build-surface:web-beta')

  assert.match(manifest, /app\/\(public\)/)
  assert.match(manifest, /app\/api\/health/)
  assert.match(manifest, /app\/auth\/signin/)
  assert.match(manifest, /app\/\(chef\)\/layout\.tsx/)
  assert.match(manifest, /app\/\(chef\)\/dashboard/)
  assert.match(manifest, /app\/\(chef\)\/onboarding/)
  assert.match(manifest, /app\/\(client\)\/layout\.tsx/)
  assert.match(manifest, /app\/\(client\)\/my-events/)
  assert.match(manifest, /app\/\(client\)\/my-profile/)
  assert.doesNotMatch(manifest, /build-surfaces\/web-beta/)
  assert.match(betaChefLayout, /requireChef/)
  assert.match(betaClientLayout, /requireClient/)
  assert.match(betaSignInPage, /signIn/)
  assert.match(betaDashboardPage, /export default/)
  assert.match(betaMyEventsPage, /export default/)
  assert.equal(buildSurfaceResult?.status, 'pass', JSON.stringify(report.results, null, 2))
  assert.equal(buildSurfaceResult?.summary.missingPaths, 0)
  assert.equal(buildSurfaceResult?.summary.missingExpectedPageRoutes, 0)
  assert.equal(buildSurfaceResult?.summary.missingExpectedApiRoutes, 0)
  assert.deepEqual(webBetaNode?.metadata.missingExpectedPageRoutes, [])
  assert.deepEqual(webBetaNode?.metadata.missingExpectedApiRoutes, [])
  assert.equal(webBetaNode?.metadata.releaseProfileId, 'web-beta')
})
