import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import test from 'node:test'

function read(relativePath: string) {
  return readFileSync(join(process.cwd(), relativePath), 'utf8')
}

test('client service-day event reads are scoped by client and tenant', () => {
  const source = read('lib/events/service-day-live-actions.ts')

  assert.match(source, /await requireClient\(\)/)
  assert.match(source, /Client account is missing tenant context/)
  assert.match(
    source,
    /\.from\('events'\)[\s\S]*?\.eq\('id', parsed\.data\)[\s\S]*?\.eq\('client_id', user\.entityId\)[\s\S]*?\.eq\('tenant_id', user\.tenantId\)/
  )
})

test('proposal builder verifies event ownership with id and tenant in the same query', () => {
  const source = read('lib/quotes/proposal-builder-actions.ts')

  const scopedEventLookups = source.match(
    /\.from\('events'\)[\s\S]*?\.select\('tenant_id'\)[\s\S]*?\.eq\('id', eventId\)[\s\S]*?\.eq\('tenant_id', user\.tenantId\)[\s\S]*?\.single\(\)/g
  )

  assert.equal(scopedEventLookups?.length, 3)
  assert.doesNotMatch(
    source,
    /from\('events'\)\.select\('tenant_id'\)\.eq\('id', eventId\)\.single\(\)/
  )
})

test('client quote detail and menu reads stay tenant scoped for account and portal access', () => {
  const source = read('lib/quotes/client-actions.ts')

  assert.match(
    source,
    /async function loadQuoteMenus\(db: any, eventId: string \| null, tenantId: string\)/
  )
  assert.match(
    source,
    /\.from\('menus'\)[\s\S]*?\.eq\('event_id', eventId\)[\s\S]*?\.eq\('tenant_id', tenantId\)/
  )
  assert.match(
    source,
    /\.from\('quotes'\)[\s\S]*?\.eq\('id', quoteId\)[\s\S]*?\.eq\('client_id', clientId\)[\s\S]*?\.eq\('tenant_id', tenantId\)/
  )
  assert.match(source, /getQuoteDetailForClient\(db, quoteId, access\.clientId, access\.tenantId\)/)
})

test('quote response paths precheck quote ownership with tenant before atomic mutation', () => {
  const source = read('lib/quotes/client-actions.ts')

  assert.match(
    source,
    /acceptQuoteForContext[\s\S]*?\.from\('quotes'\)[\s\S]*?\.eq\('id', quoteId\)[\s\S]*?\.eq\('client_id', context\.clientId\)[\s\S]*?\.eq\('tenant_id', context\.tenantId\)/
  )
  assert.match(
    source,
    /rejectQuoteForContext[\s\S]*?\.from\('quotes'\)[\s\S]*?\.eq\('id', quoteId\)[\s\S]*?\.eq\('client_id', context\.clientId\)[\s\S]*?\.eq\('tenant_id', context\.tenantId\)/
  )
})

test('quote delivery repair resolves inquiry and event occasion inside the repaired tenant', () => {
  const source = read('lib/quotes/quote-delivery.ts')

  assert.match(
    source,
    /input: \{ tenantId: string; inquiryId: string \| null; eventId: string \| null \}/
  )
  assert.match(
    source,
    /\.from\('inquiries'\)[\s\S]*?\.eq\('id', input\.inquiryId\)[\s\S]*?\.eq\('tenant_id', input\.tenantId\)/
  )
  assert.match(
    source,
    /\.from\('events'\)[\s\S]*?\.eq\('id', input\.eventId\)[\s\S]*?\.eq\('tenant_id', input\.tenantId\)/
  )
})
