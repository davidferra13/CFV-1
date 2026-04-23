import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import {
  buildReleaseProfileContext,
  buildReleaseProfiles,
} from '../../scripts/verify-release.mjs'
import { resolveBuildSurfaceManifest } from '../../scripts/build-surface-manifest.mjs'
import { getReleaseGateManifest } from '../../lib/release/release-gate-manifest.js'

function read(relativePath: string) {
  return readFileSync(join(process.cwd(), relativePath), 'utf8')
}

test('verify-release supports profile selection and exposes beta release scripts', () => {
  const source = read('scripts/verify-release.mjs')
  const webBetaConfig = read('playwright.web-beta-release.config.ts')
  const buildSurfaceManifest = read('scripts/build-surface-manifest.mjs')
  const packageJson = JSON.parse(read('package.json')) as {
    scripts?: Record<string, string>
  }
  const manifest = resolveBuildSurfaceManifest('web-beta')
  const releaseGateManifest = getReleaseGateManifest()
  const profiles = buildReleaseProfiles(buildReleaseProfileContext())
  const fullProfile = profiles.full
  const webBetaProfile = profiles['web-beta']
  const webBetaBuildStep = webBetaProfile.find(
    (step) => step.name === manifest?.releaseProfile?.buildStepName
  )
  const webBetaSmokeStep = webBetaProfile.find(
    (step) => step.name === manifest?.releaseProfile?.e2eScript
  )

  assert.match(source, /export function resolveProfile\(args = process\.argv\.slice\(2\)\)/)
  assert.match(source, /--profile=/)
  assert.match(source, /value === '--profile'/)
  assert.match(source, /'web-beta'/)
  assert.match(source, /export function buildReleaseProfiles/)
  assert.match(source, /webBetaReleaseProfile\.e2eScript/)
  assert.match(webBetaConfig, /npx next start -p 3111/)
  assert.match(
    webBetaConfig,
    /NEXT_BUILD_SURFACE: process\.env\.NEXT_BUILD_SURFACE \|\| 'web-beta'/
  )
  assert.ok(releaseGateManifest.profiles.full)
  assert.ok(releaseGateManifest.profiles['web-beta'])
  assert.deepEqual(
    fullProfile.map((step) => step.name),
    releaseGateManifest.profiles.full.steps.map((step) => step.name)
  )
  assert.match(buildSurfaceManifest, /'web-beta': \{/)
  assert.match(buildSurfaceManifest, /app\/\(public\)/)
  assert.match(buildSurfaceManifest, /build-surfaces\/web-beta\/app/)
  assert.ok(manifest)
  assert.ok(webBetaProfile)
  assert.deepEqual(
    webBetaProfile.map((step) => step.name),
    [
      'verify:secrets',
      'audit:completeness:json',
      'audit:db:contract:json',
      manifest?.releaseProfile?.typecheckScript,
      manifest?.releaseProfile?.lintScript,
      'test:critical',
      manifest?.releaseProfile?.unitTestScript,
      manifest?.releaseProfile?.buildStepName,
      manifest?.releaseProfile?.e2eScript,
    ]
  )
  assert.equal(webBetaBuildStep?.args.join(' '), 'run build')
  assert.equal(webBetaBuildStep?.env?.NEXT_BUILD_SURFACE, 'web-beta')
  assert.equal(webBetaBuildStep?.env?.NEXT_PUBLIC_MARKETING_MODE, 'beta')
  assert.equal(webBetaBuildStep?.env?.NEXT_PUBLIC_RELEASE_PROFILE, 'web-beta')
  assert.equal(webBetaBuildStep?.classification, 'contract')
  assert.equal(webBetaBuildStep?.gateSeverity, 'block')
  assert.equal(webBetaSmokeStep?.args.join(' '), 'run test:e2e:web-beta:release')
  assert.equal(webBetaSmokeStep?.env?.NEXT_BUILD_SURFACE, 'web-beta')
  assert.equal(webBetaSmokeStep?.env?.NEXT_PUBLIC_MARKETING_MODE, 'beta')
  assert.equal(webBetaSmokeStep?.env?.NEXT_PUBLIC_RELEASE_PROFILE, 'web-beta')
  assert.equal(
    packageJson.scripts?.['test:e2e:web-beta:release'],
    'npx playwright test --config=playwright.web-beta-release.config.ts'
  )
  assert.match(packageJson.scripts?.['test:unit:web-beta'] ?? '', /api\.health-route\.test\.ts/)
  assert.match(packageJson.scripts?.['lint:web-beta'] ?? '', /app\/api\/health\/route\.ts/)
  assert.equal(
    packageJson.scripts?.['verify:release:web-beta'],
    'node scripts/verify-release.mjs --profile web-beta'
  )
  assert.equal(
    packageJson.scripts?.['verify:release'],
    'node scripts/verify-release.mjs --profile full'
  )
})
