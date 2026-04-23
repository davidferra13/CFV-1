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
  const betaChefLayout = read('build-surfaces/web-beta/app/(chef)/layout.tsx')
  const betaClientLayout = read('build-surfaces/web-beta/app/(client)/layout.tsx')
  const releaseShell = read('build-surfaces/web-beta/app/_components/release-portal-shell.tsx')
  const betaSignInPage = read('build-surfaces/web-beta/app/auth/signin/page.tsx')
  const betaDashboardPage = read('build-surfaces/web-beta/app/(chef)/dashboard/page.tsx')
  const betaMyEventsPage = read('build-surfaces/web-beta/app/(client)/my-events/page.tsx')
  const report = await runSurfaceCompletenessAudit({
    checkIds: ['build-surface-integrity'],
  })
  const buildSurfaceResult = report.results[0]
  const graph = await buildSystemContractGraph()
  const webBetaNode = graph.nodes.find((node) => node.id === 'build-surface:web-beta')

  assert.match(manifest, /app\/\(public\)/)
  assert.match(manifest, /app\/api\/health/)
  assert.match(manifest, /app\/\(chef\)\/onboarding/)
  assert.match(manifest, /app\/\(client\)\/my-profile/)
  assert.match(betaChefLayout, /requireChef/)
  assert.match(betaChefLayout, /ReleasePortalShell/)
  assert.match(betaChefLayout, /surfaceMode="planning"/)
  assert.match(betaClientLayout, /requireClient/)
  assert.match(betaClientLayout, /ReleasePortalShell/)
  assert.match(betaClientLayout, /surfaceMode="editing"/)
  assert.match(releaseShell, /data-cf-portal=\{portal\}/)
  assert.match(releaseShell, /data-cf-surface=\{surfaceMode\}/)
  assert.match(betaSignInPage, /Request beta access/)
  assert.match(betaDashboardPage, /redirect\('\/onboarding'\)/)
  assert.match(betaMyEventsPage, /redirect\('\/my-profile'\)/)
  assert.equal(buildSurfaceResult?.status, 'pass', JSON.stringify(report.results, null, 2))
  assert.equal(buildSurfaceResult?.summary.missingPaths, 0)
  assert.equal(buildSurfaceResult?.summary.missingExpectedPageRoutes, 0)
  assert.equal(buildSurfaceResult?.summary.missingExpectedApiRoutes, 0)
  assert.deepEqual(webBetaNode?.metadata.missingExpectedPageRoutes, [])
  assert.deepEqual(webBetaNode?.metadata.missingExpectedApiRoutes, [])
  assert.equal(webBetaNode?.metadata.releaseProfileId, 'web-beta')
})
