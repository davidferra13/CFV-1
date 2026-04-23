import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

function read(relativePath: string) {
  return readFileSync(join(process.cwd(), relativePath), 'utf8')
}

test('guest-count change workflow stays on the shared audit and work-graph path', () => {
  const clientActions = read('lib/events/client-actions.ts')
  const sharedGuestCount = read('lib/guests/count-changes.ts')
  const workGraphActions = read('lib/client-work-graph/actions.ts')
  const clientEventPage = read('app/(client)/my-events/[id]/page.tsx')
  const chefMoneyTab = read('app/(chef)/events/[id]/_components/event-detail-money-tab.tsx')

  assert.match(clientActions, /requestClientGuestCountChange\(/)
  assert.doesNotMatch(clientActions, /\.from\('events'\)\s*\.update\(\{\s*guest_count:/s)

  assert.match(sharedGuestCount, /\.from\('guest_count_changes'\)/)
  assert.match(sharedGuestCount, /status:\s*'pending'/)
  assert.match(sharedGuestCount, /reviewGuestCountChange/)

  assert.match(workGraphActions, /getLatestPendingClientGuestCountChangeMap/)
  assert.match(clientEventPage, /GuestCountChangeCard/)
  assert.match(chefMoneyTab, /EventDetailGuestCountRequests/)
})
