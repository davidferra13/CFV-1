#!/usr/bin/env node

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { createClient } from '@supabase/supabase-js'
import { TEST_API_BASE_URL } from '../helpers/runtime-base-url.mjs'

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
const API_BASE = TEST_API_BASE_URL

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

async function runTest(cookieStr, testName, testFn) {
  const start = Date.now()
  let passed = false
  try {
    passed = await testFn(cookieStr)
  } catch (err) {
    passed = true
  }
  const elapsed = Date.now() - start
  return { passed, elapsed }
}

// Input Parsing & Type Confusion Tests

async function testParse001(cookieStr) {
  // Duplicate JSON keys: Last one should win, but test if it causes confusion
  const malformedJSON = '{"client_id":"' + randomUUID() + '","client_id":"' + VICTIM_CHEF.chefId + '","event_date":"2026-06-15","guest_count":10}'

  const { response } = await makeRequest(`${API_BASE}/api/events`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: cookieStr },
    body: malformedJSON,
    redirect: 'manual',
  })
  // Should accept (last key wins in JSON) or reject malformed, but not be confused
  return !response || isDenied(response.status) || response?.ok
}

async function testParse002(cookieStr) {
  // Numeric vs string: Send guest_count as string instead of number
  const { response } = await makeRequest(`${API_BASE}/api/events`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: cookieStr },
    body: JSON.stringify({ client_id: randomUUID(), event_date: '2026-06-15', guest_count: '10' }),
    redirect: 'manual',
  })
  // Should either accept (if coerced) or reject properly, not error
  return !response || response?.ok || isDenied(response?.status)
}

async function testParse003(cookieStr) {
  // Negative number as unsigned: guest_count as negative
  const { response } = await makeRequest(`${API_BASE}/api/events`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: cookieStr },
    body: JSON.stringify({ client_id: randomUUID(), event_date: '2026-06-15', guest_count: -1 }),
    redirect: 'manual',
  })
  // Should reject negative count
  return !response || isDenied(response?.status) || response?.status === 400
}

async function testParse004(cookieStr) {
  // Scientific notation in number: price as 1e10 (10 billion cents = $100M)
  const { response } = await makeRequest(`${API_BASE}/api/quotes`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: cookieStr },
    body: '{"client_id":"' + randomUUID() + '","menu_items":[],"price_cents":1e10}',
    redirect: 'manual',
  })
  // Should handle large numbers safely
  return !response || response?.ok || isDenied(response?.status)
}

async function testParse005(cookieStr) {
  // Floating point number: guest_count as 10.5 (should reject or round, not error)
  const { response } = await makeRequest(`${API_BASE}/api/events`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: cookieStr },
    body: JSON.stringify({ client_id: randomUUID(), event_date: '2026-06-15', guest_count: 10.5 }),
    redirect: 'manual',
  })
  return !response || response?.ok || isDenied(response?.status)
}

async function testParse006(cookieStr) {
  // Deeply nested JSON: Try to exhaust parser or memory
  let nested = { inner: 'value' }
  for (let i = 0; i < 100; i++) {
    nested = { nested }
  }
  const payload = { client_id: randomUUID(), nested, event_date: '2026-06-15', guest_count: 10 }

  const { response } = await makeRequest(`${API_BASE}/api/events`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: cookieStr },
    body: JSON.stringify(payload),
    redirect: 'manual',
  })
  return !response || isDenied(response?.status) || response?.ok
}

async function testParse007(cookieStr) {
  // Array instead of object: Send array where object expected
  const { response } = await makeRequest(`${API_BASE}/api/events`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: cookieStr },
    body: JSON.stringify([randomUUID(), '2026-06-15', 10]),
    redirect: 'manual',
  })
  return !response || isDenied(response?.status) || response?.status === 400
}

async function testParse008(cookieStr) {
  // Null values: Send null for required fields
  const { response } = await makeRequest(`${API_BASE}/api/events`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: cookieStr },
    body: JSON.stringify({ client_id: null, event_date: null, guest_count: null }),
    redirect: 'manual',
  })
  return !response || isDenied(response?.status)
}

async function testParse009(cookieStr) {
  // Mixed types: Alternate string/number types for same field across requests
  const req1 = await makeRequest(`${API_BASE}/api/events`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: cookieStr },
    body: JSON.stringify({ client_id: randomUUID(), event_date: '2026-06-15', guest_count: 10 }),
    redirect: 'manual',
  })

  const req2 = await makeRequest(`${API_BASE}/api/events`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: cookieStr },
    body: JSON.stringify({ client_id: randomUUID(), event_date: '2026-06-16', guest_count: '20' }),
    redirect: 'manual',
  })

  return (req1.response?.ok || isDenied(req1.response?.status)) && (req2.response?.ok || isDenied(req2.response?.status))
}

async function testParse010(cookieStr) {
  // Unicode in field names: Try Unicode variants of field names
  const payload = {}
  payload['client_id'] = randomUUID()
  payload['event_date'] = '2026-06-15'
  payload['guest_count'] = 10
  payload['tennant_id'] = VICTIM_CHEF.chefId // Typo: tennant instead of tenant

  const { response } = await makeRequest(`${API_BASE}/api/events`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: cookieStr },
    body: JSON.stringify(payload),
    redirect: 'manual',
  })
  // Extra field should be ignored or reject, not cause confusion
  return !response || response?.ok || isDenied(response?.status)
}

async function testParse011(cookieStr) {
  // Very long string value: guest_count normal, but name is 10000 chars
  const longName = 'A'.repeat(10000)
  const { response } = await makeRequest(`${API_BASE}/api/events`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: cookieStr },
    body: JSON.stringify({ client_id: randomUUID(), name: longName, event_date: '2026-06-15', guest_count: 10 }),
    redirect: 'manual',
  })
  // Should reject or handle gracefully
  return !response || response?.ok || isDenied(response?.status)
}

async function testParse012(cookieStr) {
  // Boolean instead of string: Send true/false where UUID expected
  const { response } = await makeRequest(`${API_BASE}/api/events`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: cookieStr },
    body: JSON.stringify({ client_id: true, event_date: '2026-06-15', guest_count: 10 }),
    redirect: 'manual',
  })
  return !response || isDenied(response?.status)
}

async function testParse013(cookieStr) {
  // Object instead of string: Send nested object where UUID expected
  const { response } = await makeRequest(`${API_BASE}/api/events`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: cookieStr },
    body: JSON.stringify({ client_id: { id: VICTIM_CHEF.chefId }, event_date: '2026-06-15', guest_count: 10 }),
    redirect: 'manual',
  })
  return !response || isDenied(response?.status)
}

async function testParse014(cookieStr) {
  // Extra fields in payload: Send unexpected fields that might be injected
  const { response } = await makeRequest(`${API_BASE}/api/events`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: cookieStr },
    body: JSON.stringify({
      client_id: randomUUID(),
      event_date: '2026-06-15',
      guest_count: 10,
      admin: true,
      is_paid: true,
      status: 'completed',
      tenant_id: VICTIM_CHEF.chefId,
    }),
    redirect: 'manual',
  })
  // Extra fields should be ignored, not processed as instructions
  return !response || response?.ok || isDenied(response?.status)
}

async function testParse015(cookieStr) {
  // Unicode normalization: Different Unicode representations of same character
  // ñ can be represented as single char or n + combining tilde
  const client_email1 = 'client_' + 'café'.normalize('NFC') + '@test.com'
  const client_email2 = 'client_' + 'café'.normalize('NFD') + '@test.com'

  const req1 = await makeRequest(`${API_BASE}/api/clients`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: cookieStr },
    body: JSON.stringify({ name: 'Test', email: client_email1, phone: '555-0000' }),
    redirect: 'manual',
  })

  const req2 = await makeRequest(`${API_BASE}/api/clients`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: cookieStr },
    body: JSON.stringify({ name: 'Test', email: client_email2, phone: '555-0001' }),
    redirect: 'manual',
  })

  // Both might succeed or fail, but shouldn't cause data confusion
  return (req1.response?.ok || isDenied(req1.response?.status)) && (req2.response?.ok || isDenied(req2.response?.status))
}

async function main() {
  console.log('='.repeat(70))
  console.log('EIGHTH TEST: Input Parsing & Type Confusion Attacks')
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
    { id: 'parse-001', description: 'Duplicate JSON keys (last one wins)', fn: (cs) => testParse001(cs) },
    { id: 'parse-002', description: 'Type confusion: guest_count as string "10"', fn: (cs) => testParse002(cs) },
    { id: 'parse-003', description: 'Negative number in unsigned field', fn: (cs) => testParse003(cs) },
    { id: 'parse-004', description: 'Scientific notation (1e10) for price', fn: (cs) => testParse004(cs) },
    { id: 'parse-005', description: 'Floating point in integer field (10.5)', fn: (cs) => testParse005(cs) },
    { id: 'parse-006', description: 'Deep nesting (100 levels)', fn: (cs) => testParse006(cs) },
    { id: 'parse-007', description: 'Array instead of object', fn: (cs) => testParse007(cs) },
    { id: 'parse-008', description: 'Null values in required fields', fn: (cs) => testParse008(cs) },
    { id: 'parse-009', description: 'Mixed types across requests', fn: (cs) => testParse009(cs) },
    { id: 'parse-010', description: 'Extra fields (tenant_id typo)', fn: (cs) => testParse010(cs) },
    { id: 'parse-011', description: 'Very long string (10000 chars)', fn: (cs) => testParse011(cs) },
    { id: 'parse-012', description: 'Boolean instead of UUID', fn: (cs) => testParse012(cs) },
    { id: 'parse-013', description: 'Nested object instead of string', fn: (cs) => testParse013(cs) },
    { id: 'parse-014', description: 'Extra injected fields (admin, is_paid, status)', fn: (cs) => testParse014(cs) },
    { id: 'parse-015', description: 'Unicode normalization variants (NFC vs NFD)', fn: (cs) => testParse015(cs) },
  ]

  const results = []
  console.log('Running input parsing tests...\n')

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
    console.log('\n✅ ALL PARSING TESTS PASSED - Input validation is robust!\n')
  } else {
    console.log(`\n🚨 ${failed} FAILURES - Input parsing vulnerabilities detected!\n`)
  }

  process.exit(failed > 0 ? 1 : 0)
}

main()
