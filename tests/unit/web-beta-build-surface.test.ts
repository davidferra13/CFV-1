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
  const signInPage = read('app/auth/signin/page.tsx')
  const onboardingPage = read('app/(chef)/onboarding/page.tsx')
  const clientProfilePage = read('app/(client)/my-profile/page.tsx')
  const report = await runSurfaceCompletenessAudit({
    checkIds: ['build-surface-integrity'],
  })
  const buildSurfaceResult = report.results[0]
  const graph = await buildSystemContractGraph()
  const webBetaNode = graph.nodes.find((node) => node.id === 'build-surface:web-beta')

  assert.match(manifest, /app\/\(public\)/)
  assert.match(manifest, /app\/api\/health/)
  assert.match(manifest, /app\/auth\/signin/)
  assert.match(manifest, /app\/\(chef\)\/onboarding/)
  assert.match(manifest, /app\/\(client\)\/my-profile/)
  assert.doesNotMatch(manifest, /build-surfaces\/web-beta\/app/)
  assert.match(signInPage, /Sign in/)
  assert.match(onboardingPage, /requireChef/)
  assert.match(clientProfilePage, /requireClient/)
  assert.equal(buildSurfaceResult?.status, 'pass', JSON.stringify(report.results, null, 2))
  assert.equal(buildSurfaceResult?.summary.missingPaths, 0)
  assert.equal(buildSurfaceResult?.summary.missingExpectedPageRoutes, 0)
  assert.equal(buildSurfaceResult?.summary.missingExpectedApiRoutes, 0)
  assert.equal(webBetaNode?.metadata.overlayAppDir, null)
  assert.deepEqual(webBetaNode?.metadata.requiredOverlayPaths, [])
  assert.deepEqual(webBetaNode?.metadata.missingExpectedPageRoutes, [])
  assert.deepEqual(webBetaNode?.metadata.missingExpectedApiRoutes, [])
  assert.equal(webBetaNode?.metadata.releaseProfileId, 'web-beta')
})
