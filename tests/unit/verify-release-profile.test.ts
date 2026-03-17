import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

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

  assert.match(source, /function resolveProfile\(\)/)
  assert.match(source, /--profile=/)
  assert.match(source, /value === '--profile'/)
  assert.match(source, /'web-beta'/)
  assert.match(source, /name: 'build:web-beta'/)
  assert.match(source, /NEXT_BUILD_SURFACE: 'web-beta'/)
  assert.match(source, /NEXT_PUBLIC_MARKETING_MODE: 'beta'/)
  assert.match(source, /NEXT_PUBLIC_RELEASE_PROFILE: 'web-beta'/)
  assert.match(source, /test:e2e:web-beta:release/)
  assert.match(webBetaConfig, /npx next start -p 3111/)
  assert.match(
    webBetaConfig,
    /NEXT_BUILD_SURFACE: process\.env\.NEXT_BUILD_SURFACE \|\| 'web-beta'/
  )
  assert.match(buildSurfaceManifest, /'web-beta': \{/)
  assert.match(buildSurfaceManifest, /app\/\(public\)/)
  assert.match(buildSurfaceManifest, /build-surfaces\/web-beta\/app/)
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
