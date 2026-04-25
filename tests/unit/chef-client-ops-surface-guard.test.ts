import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

function read(relativePath: string) {
  return readFileSync(join(process.cwd(), relativePath), 'utf8')
}

test('chef client detail reuses the shared client ops snapshot instead of stitching the client graph inline', () => {
  const clientDetailPage = read('app/(chef)/clients/[id]/page.tsx')
  const sharedSnapshot = read('lib/client-work-graph/shared-snapshot.ts')

  assert.match(clientDetailPage, /getSharedClientWorkGraphSnapshot/)
  assert.match(clientDetailPage, /buildClientWorkGraph/)
  assert.match(clientDetailPage, /buildClientActionRequiredSummary/)
  assert.match(clientDetailPage, /Client Ops Snapshot/)
  assert.doesNotMatch(clientDetailPage, /from\('client_meal_requests'\)/)
  assert.doesNotMatch(clientDetailPage, /from\('event_shares'\)/)
  assert.doesNotMatch(clientDetailPage, /from\('event_rsvp_summary'\)/)

  assert.match(sharedSnapshot, /from\('client_meal_requests'\)/)
  assert.match(sharedSnapshot, /from\('event_rsvp_summary'\)/)
  assert.match(sharedSnapshot, /from\('event_shares'\)/)
})
