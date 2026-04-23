import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

function read(relativePath: string) {
  return readFileSync(join(process.cwd(), relativePath), 'utf8')
}

test('public share flow keeps Dinner Circle access bound to the share token', () => {
  const sharePage = read('app/(public)/share/[token]/page.tsx')
  const joinHubCta = read('components/hub/join-hub-cta.tsx')
  const integrationActions = read('lib/hub/integration-actions.ts')

  assert.match(sharePage, /shareToken=\{params\.token\}/)
  assert.doesNotMatch(sharePage, /tenantId=\{eventData\.tenantId\}/)

  assert.match(joinHubCta, /shareToken: string/)
  assert.doesNotMatch(joinHubCta, /tenantId: string/)
  assert.match(joinHubCta, /getOrCreateEventHubGroup\(\{\s*eventId,\s*shareToken,\s*eventTitle,\s*\}\)/s)

  assert.match(integrationActions, /eq\('token', input\.shareToken\)/)
  assert.match(integrationActions, /resolvePublicShareDinnerCircleAccess/)
  assert.doesNotMatch(integrationActions, /tenantId: string\s*\n\s*eventTitle: string\s*\n\}\): Promise<\{ groupToken: string \}> {\s*\n\s*return ensureEventDinnerCircle\(input\)/s)
})
