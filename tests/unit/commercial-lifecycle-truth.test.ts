import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

function read(relativePath: string) {
  return readFileSync(join(process.cwd(), relativePath), 'utf8')
}

test('quote acceptance materializes an inquiry-backed event when needed', () => {
  const source = read('lib/quotes/client-actions.ts')

  assert.match(source, /convertInquiryToEventWithContext/)
  assert.match(source, /hadLinkedEvent/)
  assert.match(source, /return \{ success: true, eventId: quote\.event_id \}/)
})

test('client portal exposes token-safe quote and contract review routes', () => {
  const quotePage = read('app/client/[token]/quotes/[quoteId]/page.tsx')
  const contractPage = read('app/client/[token]/events/[eventId]/contract/page.tsx')
  const quoteActions = read('lib/quotes/actions.ts')
  const contractActions = read('lib/contracts/actions.ts')

  assert.match(quotePage, /getClientPortalQuoteById/)
  assert.match(quotePage, /PortalQuoteResponseButtons/)
  assert.match(contractPage, /getClientPortalEventContract/)
  assert.match(contractPage, /PortalContractSigningClient/)
  assert.match(quoteActions, /createClientPortalLinkForClient/)
  assert.match(contractActions, /createClientPortalLinkForClient/)
})
