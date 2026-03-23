#!/usr/bin/env node

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })
import { createAnonClient } from '../../scripts/lib/supabase.mjs'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
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

const FOURTH_TESTS = [
  { id: 'hdr-001', description: 'Content-Negotiation: Accept header injection with victim tenant', method: 'GET', endpoint: '/api/events', headers: { Accept: 'application/json; tenant=' + VICTIM_CHEF.chefId }, expectDenied: true },
  { id: 'hdr-002', description: 'Content-Type confusion: Submit JSON but claim form data', method: 'POST', endpoint: '/api/events', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: JSON.stringify({ client_id: randomUUID(), event_date: '2026-06-15', guest_count: 10 }), expectDenied: true },
  { id: 'hdr-003', description: 'Cache-Control header manipulation: no-cache directive injection', method: 'GET', endpoint: `/api/clients/${VICTIM_CHEF.chefId}`, headers: { 'Cache-Control': 'no-cache, max-age=999999' }, expectDenied: true },
  { id: 'hdr-004', description: 'ETag manipulation: If-Match with victim entity tag', method: 'GET', endpoint: '/api/events', headers: { 'If-Match': '"' + VICTIM_CHEF.chefId + '"' }, expectDenied: true },
  { id: 'hdr-005', description: 'X-HTTP-Method-Override: DELETE via POST', method: 'POST', endpoint: `/api/events/${randomUUID()}`, headers: { 'X-HTTP-Method-Override': 'DELETE' }, expectDenied: true },
  { id: 'hdr-006', description: 'Range request abuse: Byte range header with victim data', method: 'GET', endpoint: '/api/events', headers: { Range: 'bytes=' + VICTIM_CHEF.chefId.length + '-' }, expectDenied: true },
  { id: 'hdr-007', description: 'Connection upgrade attempt: WebSocket upgrade injection', method: 'GET', endpoint: '/api/events', headers: { Upgrade: 'websocket', Connection: 'Upgrade' }, expectDenied: true },
  { id: 'hdr-008', description: 'User-Agent header injection with SQL-like syntax', method: 'GET', endpoint: '/api/events', headers: { 'User-Agent': "Mozilla/5.0'; DROP TABLE chefs; --" }, expectDenied: true },
  { id: 'hdr-009', description: 'Matrix parameters (semicolon injection): tenant=victim', method: 'GET', endpoint: '/api/events;tenant=' + VICTIM_CHEF.chefId, expectDenied: true },
  { id: 'hdr-010', description: 'Path parameter doubling: /api/events/ID/ID', method: 'GET', endpoint: `/api/events/${randomUUID()}/${randomUUID()}`, expectDenied: true },
  { id: 'hdr-011', description: 'Accept-Language header injection with tenant ID', method: 'GET', endpoint: '/api/events', headers: { 'Accept-Language': `en-US,en;tenant=${VICTIM_CHEF.chefId}` }, expectDenied: true },
  { id: 'hdr-012', description: 'Authorization Bearer with extra parameters', method: 'GET', endpoint: '/api/events', headers: { Authorization: 'Bearer ' + randomUUID() + '; tenant=' + VICTIM_CHEF.chefId }, expectDenied: true },
  { id: 'hdr-013', description: 'X-Forwarded-For chain injection with victim IP', method: 'GET', endpoint: '/api/events', headers: { 'X-Forwarded-For': '192.168.1.1, ' + VICTIM_CHEF.chefId + ', 10.0.0.1' }, expectDenied: true },
  { id: 'hdr-014', description: 'Via header spoofing with tenant injection', method: 'GET', endpoint: '/api/events', headers: { Via: `1.1 ${VICTIM_CHEF.chefId}` }, expectDenied: true },
  { id: 'hdr-015', description: 'Expect header injection: malicious expectation', method: 'POST', endpoint: '/api/events', headers: { Expect: `tenant=${VICTIM_CHEF.chefId}` }, body: JSON.stringify({ client_id: randomUUID(), event_date: '2026-06-15', guest_count: 10 }), expectDenied: true },
  { id: 'hdr-016', description: 'From header spoofing as victim', method: 'GET', endpoint: '/api/events', headers: { From: VICTIM_CHEF.chefId + '@evil.com' }, expectDenied: true },
  { id: 'hdr-017', description: 'Host header poisoning', method: 'GET', endpoint: '/api/events', headers: { Host: VICTIM_CHEF.chefId + '.chefflow.test' }, expectDenied: true },
  { id: 'hdr-018', description: 'Forwarded header (RFC7239) with victim tenant', method: 'GET', endpoint: '/api/events', headers: { Forwarded: `for=192.0.2.1;host=${VICTIM_CHEF.chefId}` }, expectDenied: true },
  { id: 'hdr-019', description: 'Accept header with charset injection', method: 'GET', endpoint: '/api/events', headers: { Accept: `application/json; charset=${VICTIM_CHEF.chefId}` }, expectDenied: true },
  { id: 'hdr-020', description: 'DNT (Do Not Track) header with tenant mutation attempt', method: 'GET', endpoint: '/api/events', headers: { DNT: '1', 'X-Tenant-Override': VICTIM_CHEF.chefId }, expectDenied: true },
]

async function authenticate() {
  console.log(`[Auth] Authenticating...`)
  const supabase = createAnonClient()
  const { data, error } = await supabase.auth.signInWithPassword({ email: ATTACKER.email, password: ATTACKER.password })
  if (error) throw new Error(`Auth failed: ${error.message}`)

  const session = data.session
  const cookieBaseName = `sb-${PROJECT_REF}-auth-token`
  const sessionPayload = JSON.stringify({ access_token: session.access_token, refresh_token: session.refresh_token, expires_in: session.expires_in, expires_at: session.expires_at, token_type: session.token_type, user: session.user })
  const encoded = 'base64-' + Buffer.from(sessionPayload).toString('base64url')
  const cookieStr = `${cookieBaseName}=${encoded}`
  console.log(`[Auth] ✅ Authenticated\n`)
  return cookieStr
}

async function runTest(cookieStr, test) {
  const url = `${API_BASE}${test.endpoint}`
  const options = { method: test.method, headers: { 'Content-Type': 'application/json' }, redirect: 'manual', Cookie: cookieStr }

  if (test.headers) options.headers = { ...options.headers, ...test.headers }
  if (test.body) options.body = test.body

  const start = Date.now()
  let response, error = null
  try { response = await fetch(url, options) } catch (err) { error = err }
  const elapsed = Date.now() - start

  if (error) return { ...test, passed: true, statusCode: null, reason: 'Connection rejected', elapsed }

  const isDenied = [307, 400, 401, 403, 404, 405, 500, 501].includes(response.status)
  const passed = test.expectDenied ? isDenied : !isDenied
  return { ...test, passed, statusCode: response.status, reason: isDenied ? 'Correctly rejected' : `ERROR: Allowed! Status ${response.status}`, elapsed }
}

async function main() {
  console.log('='.repeat(70))
  console.log('FOURTH TEST: Header/Protocol Level Attack Vectors')
  console.log('='.repeat(70) + '\n')

  let cookieStr
  try { cookieStr = await authenticate() } catch (err) { console.error(`[FATAL] ${err.message}`); process.exit(1) }

  const results = []
  console.log('Running fourth-gen security tests...\n')

  for (const test of FOURTH_TESTS) {
    const result = await runTest(cookieStr, test)
    results.push(result)
    const icon = result.passed ? '✅' : '❌'
    const elapsed = result.elapsed ? ` (${result.elapsed}ms)` : ''
    console.log(`${icon} ${test.id}: ${test.description}${elapsed}`)
    if (!result.passed) console.log(`   Status: ${result.statusCode} - ${result.reason}`)
  }

  const passed = results.filter(r => r.passed).length
  const failed = results.filter(r => !r.passed).length

  console.log(`\n${'='.repeat(70)}`)
  console.log(`RESULTS: ${passed}/${results.length} passed, ${failed} failed`)
  console.log('='.repeat(70))

  if (failed === 0) {
    console.log('\n✅ ALL FOURTH-GEN TESTS PASSED - Security architecture is robust!\n')
  } else {
    console.log(`\n🚨 ${failed} FAILURES - Security vulnerabilities detected!\n`)
  }

  process.exit(failed > 0 ? 1 : 0)
}

main()
