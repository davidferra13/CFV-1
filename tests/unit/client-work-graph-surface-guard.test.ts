import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

function read(relativePath: string) {
  return readFileSync(join(process.cwd(), relativePath), 'utf8')
}

test('client route surfaces and Remy stay wired to the shared work graph', () => {
  const myEventsPage = read('app/(client)/my-events/page.tsx')
  const myBookingsPage = read('app/(client)/my-bookings/page.tsx')
  const eventDetailPage = read('app/(client)/my-events/[id]/page.tsx')
  const proposalPage = read('app/(client)/my-events/[id]/proposal/page.tsx')
  const paymentPage = read('app/(client)/my-events/[id]/pay/page.tsx')
  const contractPage = read('app/(client)/my-events/[id]/contract/page.tsx')
  const contractSigningClient = read(
    'app/(client)/my-events/[id]/contract/contract-signing-client.tsx'
  )
  const dashboardActions = read('lib/client-dashboard/actions.ts')
  const workGraphActions = read('lib/client-work-graph/actions.ts')
  const sharedSnapshot = read('lib/client-work-graph/shared-snapshot.ts')
  const remyContext = read('lib/ai/remy-client-context.ts')
  const remyRoute = read('app/api/remy/client/route.ts')

  assert.match(myEventsPage, /workGraph\.items\.slice\(0, 5\)/)
  assert.match(myEventsPage, /workGraph\.eventActionsById\[String\(event\.id\)\]/)
  assert.match(eventDetailPage, /GuestCountChangeCard/)
  assert.match(eventDetailPage, /getCurrentJourneyAction/)
  assert.match(eventDetailPage, /successRedirectHref=\{postAcceptRedirectHref\}/)

  assert.match(myBookingsPage, /getClientWorkGraphSnapshot/)
  assert.match(myBookingsPage, /workGraph\.eventActionsById\[String\(event\.id\)\]/)
  assert.match(myBookingsPage, /const bookingWorkItems = workGraph\.items\.filter/)
  assert.doesNotMatch(myBookingsPage, /function getEventAction/)
  assert.doesNotMatch(myBookingsPage, /const getEventAction =/)

  assert.match(proposalPage, /AcceptProposalButton/)
  assert.match(proposalPage, /getCurrentJourneyAction/)
  assert.match(proposalPage, /contract\?next=payment/)
  assert.match(proposalPage, /event\.status !== 'proposed' && contractPendingSignature/)
  assert.match(proposalPage, /Accept the proposal first/)
  assert.match(paymentPage, /getClientEventContract/)
  assert.match(paymentPage, /contract\?next=payment/)
  assert.match(contractPage, /event\.status === 'proposed'/)
  assert.match(contractPage, /redirect\(`\/my-events\/\$\{params\.id\}\/proposal`\)/)
  assert.match(contractPage, /continueToPayment/)
  assert.match(contractSigningClient, /continueToPayment/)
  assert.match(contractSigningClient, /router\.push\(`\/my-events\/\$\{eventId\}\/pay`\)/)

  assert.match(dashboardActions, /buildClientActionRequiredSummary\(workGraph\.summary\)/)

  assert.match(workGraphActions, /getSharedClientWorkGraphSnapshot/)
  assert.doesNotMatch(workGraphActions, /from\('event_financial_summary'\)/)
  assert.doesNotMatch(workGraphActions, /from\('event_contracts'\)/)

  assert.match(sharedSnapshot, /from\('client_meal_requests'\)/)
  assert.match(sharedSnapshot, /from\('event_shares'\)/)
  assert.match(sharedSnapshot, /buildClientActionRequiredSummary/)

  assert.match(remyContext, /getClientWorkGraphSnapshot/)
  assert.match(remyContext, /workGraph: snapshot\.workGraph/)
  assert.match(remyContext, /workItems: snapshot\.workGraph\.items\.slice\(0, 5\)/)

  assert.match(remyRoute, /suggestClientNavFromWorkGraph/)
  assert.match(remyRoute, /context\.workGraph/)
})
