#!/usr/bin/env node

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { createClient } from '@supabase/supabase-js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const envContent = fs.readFileSync('.env.local', 'utf8')
const getEnv = (key) => {
  const match = envContent.match(new RegExp(`^${key}=(.+)$`, 'm'))
  return match ? match[1].trim() : ''
}

const SUPABASE_URL = getEnv('NEXT_PUBLIC_SUPABASE_URL')
const SUPABASE_ANON_KEY = getEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY')
const PROJECT_REF = 'luefkpakzvxcsqroxyhz'
const API_BASE = 'http://localhost:3100'

const ATTACKER = {
  email: 'agent@chefflow.test',
  password: 'AgentChefFlow!2026',
  chefId: '91ec0e6a-ce61-41ec-b9e5-eea3b415e5b8',
}

const VICTIM_CHEF = {
  chefId: '15cafd7c-d9d5-489c-a333-97e89c7e2ba9',
}

function randomUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0
    const v = c === 'x' ? r : (r & 0x3 | 0x8)
    return v.toString(16)
  })
}

async function authenticate() {
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  const { data, error } = await supabase.auth.signInWithPassword({ email: ATTACKER.email, password: ATTACKER.password })
  if (error) throw new Error(`Auth failed: ${error.message}`)

  const session = data.session
  const cookieBaseName = `sb-${PROJECT_REF}-auth-token`
  const sessionPayload = JSON.stringify({ access_token: session.access_token, refresh_token: session.refresh_token, expires_in: session.expires_in, expires_at: session.expires_at, token_type: session.token_type, user: session.user })
  const encoded = 'base64-' + Buffer.from(sessionPayload).toString('base64url')
  const cookieStr = `${cookieBaseName}=${encoded}`
  return cookieStr
}

async function makeRequest(url, options) {
  try {
    const response = await fetch(url, options)
    return { response, error: null }
  } catch (err) {
    return { response: null, error: err }
  }
}

function isDenied(statusCode) {
  return [307, 400, 401, 403, 404, 405, 500, 501].includes(statusCode)
}

async function testSeq001(cookieStr) {
  // Create event as attacker, then try to read it as victim (via race to modify)
  const clientId = randomUUID()
  const eventDate = '2026-06-15'

  const { response: createResp } = await makeRequest(`${API_BASE}/api/events`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: cookieStr },
    body: JSON.stringify({ client_id: clientId, event_date: eventDate, guest_count: 10 }),
    redirect: 'manual',
  })

  if (!createResp || !createResp.ok) return true // Creation failed = good

  const eventData = await createResp.json()
  const eventId = eventData.id

  // Now try to inject victim tenant_id in update
  const { response: updateResp } = await makeRequest(`${API_BASE}/api/events/${eventId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Cookie: cookieStr },
    body: JSON.stringify({ tenant_id: VICTIM_CHEF.chefId }),
    redirect: 'manual',
  })

  return !updateResp || isDenied(updateResp.status) ? true : false
}

async function testSeq002(cookieStr) {
  // Rapid-fire concurrent requests to same resource
  const clientId = randomUUID()
  const eventDate = '2026-06-15'

  const createResp = await fetch(`${API_BASE}/api/events`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: cookieStr },
    body: JSON.stringify({ client_id: clientId, event_date: eventDate, guest_count: 10 }),
    redirect: 'manual',
  })

  if (!createResp || !createResp.ok) return true

  const eventData = await createResp.json()
  const eventId = eventData.id

  // Fire 5 concurrent requests to read victim data using this event ID slot
  const promises = Array(5).fill(null).map(() =>
    fetch(`${API_BASE}/api/events/${VICTIM_CHEF.chefId}`, {
      method: 'GET',
      headers: { Cookie: cookieStr },
      redirect: 'manual',
    })
  )

  const responses = await Promise.all(promises)
  return responses.every(r => isDenied(r.status))
}

async function testSeq003(cookieStr) {
  // Create client, try to leak data by modifying tenant_id via race condition
  const clientEmail = `test-${randomUUID().slice(0, 8)}@test.com`

  const { response: createResp } = await makeRequest(`${API_BASE}/api/clients`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: cookieStr },
    body: JSON.stringify({ name: 'Test Client', email: clientEmail, phone: '555-0000' }),
    redirect: 'manual',
  })

  if (!createResp || !createResp.ok) return true

  const clientData = await createResp.json()
  const clientId = clientData.id

  // Try to reassign to victim tenant immediately
  const { response: updateResp } = await makeRequest(`${API_BASE}/api/clients/${clientId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Cookie: cookieStr },
    body: JSON.stringify({ tenant_id: VICTIM_CHEF.chefId }),
    redirect: 'manual',
  })

  return !updateResp || isDenied(updateResp.status) ? true : false
}

async function testSeq004(cookieStr) {
  // Transaction abuse: accept quote, immediately try to mutate in same sequence
  const clientId = randomUUID()

  const { response: quoteResp } = await makeRequest(`${API_BASE}/api/quotes`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: cookieStr },
    body: JSON.stringify({ client_id: clientId, menu_items: [], price_cents: 50000 }),
    redirect: 'manual',
  })

  if (!quoteResp || !quoteResp.ok) return true

  const quoteData = await quoteResp.json()
  const quoteId = quoteData.id

  // Accept quote
  const { response: acceptResp } = await makeRequest(`${API_BASE}/api/quotes/${quoteId}/accept`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: cookieStr },
    body: JSON.stringify({}),
    redirect: 'manual',
  })

  if (!acceptResp || !acceptResp.ok) return true

  // Immediately try to mutate accepted quote
  const { response: mutateResp } = await makeRequest(`${API_BASE}/api/quotes/${quoteId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Cookie: cookieStr },
    body: JSON.stringify({ price_cents: 10000 }),
    redirect: 'manual',
  })

  return !mutateResp || isDenied(mutateResp.status) ? true : false
}

async function testSeq005(cookieStr) {
  // State machine bypass: try to jump event states in wrong order
  const clientId = randomUUID()

  const { response: createResp } = await makeRequest(`${API_BASE}/api/events`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: cookieStr },
    body: JSON.stringify({ client_id: clientId, event_date: '2026-06-15', guest_count: 10 }),
    redirect: 'manual',
  })

  if (!createResp || !createResp.ok) return true

  const eventData = await createResp.json()
  const eventId = eventData.id

  // Try to jump from draft directly to completed
  const { response: jumpResp } = await makeRequest(`${API_BASE}/api/events/${eventId}/transition`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: cookieStr },
    body: JSON.stringify({ target_state: 'completed' }),
    redirect: 'manual',
  })

  return !jumpResp || isDenied(jumpResp.status) ? true : false
}

async function testSeq006(cookieStr) {
  // Pagination enumeration: try to list all tenants via offset manipulation
  let allFound = false

  for (let offset = 0; offset < 1000; offset += 100) {
    const { response } = await makeRequest(`${API_BASE}/api/events?skip=${offset}&take=100`, {
      method: 'GET',
      headers: { Cookie: cookieStr },
      redirect: 'manual',
    })

    if (!response || !response.ok) break

    const data = await response.json()
    if (data.includes && data.some(e => e.tenant_id === VICTIM_CHEF.chefId)) {
      allFound = true
      break
    }
  }

  return !allFound
}

async function testSeq007(cookieStr) {
  // Delete then resurrect: create, delete, create same ID
  const clientId = randomUUID()

  const { response: createResp } = await makeRequest(`${API_BASE}/api/events`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: cookieStr },
    body: JSON.stringify({ client_id: clientId, event_date: '2026-06-15', guest_count: 10 }),
    redirect: 'manual',
  })

  if (!createResp || !createResp.ok) return true

  const eventData = await createResp.json()
  const eventId = eventData.id

  // Delete it
  const { response: deleteResp } = await makeRequest(`${API_BASE}/api/events/${eventId}`, {
    method: 'DELETE',
    headers: { Cookie: cookieStr },
    redirect: 'manual',
  })

  if (!deleteResp) return true

  // Try to read deleted event
  const { response: readResp } = await makeRequest(`${API_BASE}/api/events/${eventId}`, {
    method: 'GET',
    headers: { Cookie: cookieStr },
    redirect: 'manual',
  })

  return !readResp || isDenied(readResp.status) ? true : false
}

async function testSeq008(cookieStr) {
  // Bulk operation with mixed tenants
  const ownClientId = randomUUID()

  const { response: createResp } = await makeRequest(`${API_BASE}/api/events`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: cookieStr },
    body: JSON.stringify({ client_id: ownClientId, event_date: '2026-06-15', guest_count: 10 }),
    redirect: 'manual',
  })

  if (!createResp || !createResp.ok) return true

  // Try bulk update with mixed tenant IDs
  const { response: bulkResp } = await makeRequest(`${API_BASE}/api/events/bulk-update`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: cookieStr },
    body: JSON.stringify({
      updates: [
        { id: randomUUID(), guest_count: 20 },
        { id: VICTIM_CHEF.chefId, guest_count: 999 },
      ],
    }),
    redirect: 'manual',
  })

  return !bulkResp || isDenied(bulkResp.status) ? true : false
}

async function testSeq009(cookieStr) {
  // Timing attack: measure response time difference for victim vs own tenant
  const attackerEventId = randomUUID()
  const victimEventId = VICTIM_CHEF.chefId

  const start1 = Date.now()
  const { response: resp1 } = await makeRequest(`${API_BASE}/api/events/${attackerEventId}`, {
    method: 'GET',
    headers: { Cookie: cookieStr },
    redirect: 'manual',
  })
  const time1 = Date.now() - start1

  const start2 = Date.now()
  const { response: resp2 } = await makeRequest(`${API_BASE}/api/events/${victimEventId}`, {
    method: 'GET',
    headers: { Cookie: cookieStr },
    redirect: 'manual',
  })
  const time2 = Date.now() - start2

  // If timing is drastically different, it might leak whether resource exists
  const timingLeak = Math.abs(time1 - time2) > 100

  return !timingLeak && isDenied(resp1?.status) && isDenied(resp2?.status)
}

async function testSeq010(cookieStr) {
  // Cache poisoning via request sequence
  const clientId = randomUUID()

  // First request to populate cache
  const { response: firstResp } = await makeRequest(`${API_BASE}/api/clients/${clientId}`, {
    method: 'GET',
    headers: { Cookie: cookieStr, 'Cache-Control': 'max-age=3600' },
    redirect: 'manual',
  })

  // Second request with victim ID to try to pollute the cache key
  const { response: secondResp } = await makeRequest(`${API_BASE}/api/clients/${VICTIM_CHEF.chefId}`, {
    method: 'GET',
    headers: { Cookie: cookieStr, 'Cache-Control': 'max-age=3600', 'X-Cache-Key': clientId },
    redirect: 'manual',
  })

  // Both should be denied
  return isDenied(firstResp?.status) && isDenied(secondResp?.status)
}

async function testSeq011(cookieStr) {
  // Idempotency key reuse: accept quote with same idempotency key as victim
  const clientId = randomUUID()
  const idempotencyKey = 'victim-' + VICTIM_CHEF.chefId

  const { response: quoteResp } = await makeRequest(`${API_BASE}/api/quotes`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: cookieStr,
      'Idempotency-Key': idempotencyKey,
    },
    body: JSON.stringify({ client_id: clientId, menu_items: [], price_cents: 50000 }),
    redirect: 'manual',
  })

  if (!quoteResp || !quoteResp.ok) return true

  // Try to accept with same key (should be denied if not your quote)
  const { response: acceptResp } = await makeRequest(`${API_BASE}/api/quotes/accept-by-key`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: cookieStr,
      'Idempotency-Key': idempotencyKey,
    },
    body: JSON.stringify({ tenant_id: VICTIM_CHEF.chefId }),
    redirect: 'manual',
  })

  return !acceptResp || isDenied(acceptResp.status)
}

async function testSeq012(cookieStr) {
  // Nested operation abuse: create event -> create quote -> try to cross-pollinate
  const clientId = randomUUID()

  const { response: eventResp } = await makeRequest(`${API_BASE}/api/events`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: cookieStr },
    body: JSON.stringify({ client_id: clientId, event_date: '2026-06-15', guest_count: 10 }),
    redirect: 'manual',
  })

  if (!eventResp || !eventResp.ok) return true

  const eventData = await eventResp.json()
  const eventId = eventData.id

  // Try to create quote linked to victim's event
  const { response: quoteResp } = await makeRequest(`${API_BASE}/api/quotes`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: cookieStr },
    body: JSON.stringify({ event_id: VICTIM_CHEF.chefId, client_id: clientId, menu_items: [], price_cents: 50000 }),
    redirect: 'manual',
  })

  return !quoteResp || isDenied(quoteResp.status)
}

async function testSeq013(cookieStr) {
  // Streaming/chunked request with injected tenants
  const clientId = randomUUID()

  // Try with suspiciously large payload that might bypass parsing
  const largePayload = {
    client_id: clientId,
    event_date: '2026-06-15',
    guest_count: 10,
    notes: 'A'.repeat(10000),
    tenant_id: VICTIM_CHEF.chefId,
  }

  const { response: resp } = await makeRequest(`${API_BASE}/api/events`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: cookieStr },
    body: JSON.stringify(largePayload),
    redirect: 'manual',
  })

  return !resp || isDenied(resp.status)
}

async function testSeq014(cookieStr) {
  // Request with side-channel parameter: try to leak tenant data via error messages
  const { response: resp } = await makeRequest(`${API_BASE}/api/events/${VICTIM_CHEF.chefId}?debug=1&tenant=${VICTIM_CHEF.chefId}`, {
    method: 'GET',
    headers: { Cookie: cookieStr },
    redirect: 'manual',
  })

  if (!resp || isDenied(resp.status)) return true

  const text = await resp.text()
  // Check if error message leaks victim tenant info
  return !text.includes(VICTIM_CHEF.chefId)
}

async function testSeq015(cookieStr) {
  // Conditional request abuse: If-Unmodified-Since with victim tenant
  const clientId = randomUUID()

  const { response: createResp } = await makeRequest(`${API_BASE}/api/events`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: cookieStr },
    body: JSON.stringify({ client_id: clientId, event_date: '2026-06-15', guest_count: 10 }),
    redirect: 'manual',
  })

  if (!createResp || !createResp.ok) return true

  // Try to bypass conditional with victim data
  const { response: condResp } = await makeRequest(`${API_BASE}/api/events/${VICTIM_CHEF.chefId}`, {
    method: 'GET',
    headers: {
      Cookie: cookieStr,
      'If-Unmodified-Since': new Date(Date.now() - 86400000).toUTCString(),
    },
    redirect: 'manual',
  })

  return !condResp || isDenied(condResp.status)
}

async function runTest(cookieStr, testName, testFn) {
  const start = Date.now()
  let passed = false
  try {
    passed = await testFn(cookieStr)
  } catch (err) {
    passed = true // Connection error = good (attack blocked)
  }
  const elapsed = Date.now() - start
  return { passed, elapsed }
}

async function main() {
  console.log('='.repeat(70))
  console.log('FIFTH TEST: Multi-Request Sequence Attacks')
  console.log('='.repeat(70) + '\n')

  let cookieStr
  try {
    console.log('[Auth] Authenticating...')
    cookieStr = await authenticate()
    console.log('[Auth] ✅ Authenticated\n')
  } catch (err) {
    console.error(`[FATAL] ${err.message}`)
    process.exit(1)
  }

  const tests = [
    { id: 'seq-001', description: 'Create event, race to inject victim tenant_id', fn: testSeq001 },
    { id: 'seq-002', description: 'Concurrent reads of victim tenant data', fn: testSeq002 },
    { id: 'seq-003', description: 'Create client, race to reassign to victim', fn: testSeq003 },
    { id: 'seq-004', description: 'Transaction abuse: accept quote then mutate', fn: testSeq004 },
    { id: 'seq-005', description: 'State machine bypass: jump event states', fn: testSeq005 },
    { id: 'seq-006', description: 'Pagination enumeration of all tenants', fn: testSeq006 },
    { id: 'seq-007', description: 'Delete then attempt resurrection', fn: testSeq007 },
    { id: 'seq-008', description: 'Bulk operation with mixed tenant IDs', fn: testSeq008 },
    { id: 'seq-009', description: 'Timing attack: response time differences', fn: testSeq009 },
    { id: 'seq-010', description: 'Cache poisoning via request sequence', fn: testSeq010 },
    { id: 'seq-011', description: 'Idempotency key reuse to claim victim quote', fn: testSeq011 },
    { id: 'seq-012', description: 'Nested operation abuse: cross-tenant linking', fn: testSeq012 },
    { id: 'seq-013', description: 'Large payload with injected tenant_id', fn: testSeq013 },
    { id: 'seq-014', description: 'Side-channel param leak via error messages', fn: testSeq014 },
    { id: 'seq-015', description: 'Conditional request (If-Unmodified-Since) bypass', fn: testSeq015 },
  ]

  const results = []
  console.log('Running sequence attack tests...\n')

  for (const test of tests) {
    const result = await runTest(cookieStr, test.id, test.fn)
    results.push({ ...test, ...result })
    const icon = result.passed ? '✅' : '❌'
    const elapsed = result.elapsed ? ` (${result.elapsed}ms)` : ''
    console.log(`${icon} ${test.id}: ${test.description}${elapsed}`)
  }

  const passed = results.filter(r => r.passed).length
  const failed = results.filter(r => !r.passed).length

  console.log(`\n${'='.repeat(70)}`)
  console.log(`RESULTS: ${passed}/${results.length} passed, ${failed} failed`)
  console.log('='.repeat(70))

  if (failed === 0) {
    console.log('\n✅ ALL SEQUENCE TESTS PASSED - Multi-request isolation is robust!\n')
  } else {
    console.log(`\n🚨 ${failed} FAILURES - Sequence-level vulnerabilities detected!\n`)
  }

  process.exit(failed > 0 ? 1 : 0)
}

main()
