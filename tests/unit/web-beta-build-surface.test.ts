import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

function read(relativePath: string) {
  return readFileSync(join(process.cwd(), relativePath), 'utf8')
}

test('web-beta build surface keeps the supported route graph explicit', () => {
  const manifest = read('scripts/build-surface-manifest.mjs')
  const betaChefLayout = read('build-surfaces/web-beta/app/(chef)/layout.tsx')
  const betaClientLayout = read('build-surfaces/web-beta/app/(client)/layout.tsx')
  const betaSignInPage = read('build-surfaces/web-beta/app/auth/signin/page.tsx')
  const betaDashboardPage = read('build-surfaces/web-beta/app/(chef)/dashboard/page.tsx')
  const betaMyEventsPage = read('build-surfaces/web-beta/app/(client)/my-events/page.tsx')

  assert.match(manifest, /app\/\(public\)/)
  assert.match(manifest, /app\/api\/health/)
  assert.match(manifest, /app\/\(chef\)\/onboarding/)
  assert.match(manifest, /app\/\(client\)\/my-profile/)
  assert.match(betaChefLayout, /requireChef/)
  assert.match(betaChefLayout, /ReleasePortalShell/)
  assert.match(betaClientLayout, /requireClient/)
  assert.match(betaClientLayout, /ReleasePortalShell/)
  assert.match(betaSignInPage, /Request beta access/)
  assert.match(betaDashboardPage, /redirect\('\/onboarding'\)/)
  assert.match(betaMyEventsPage, /redirect\('\/my-profile'\)/)
})
