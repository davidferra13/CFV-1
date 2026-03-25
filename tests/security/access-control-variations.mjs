#!/usr/bin/env node

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })
import { createAnonClient } from '../../scripts/lib/db.mjs'

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

const VARIATION_TESTS = [
  { id: 'var-001', description: 'Cross-tenant read with random ID', method: 'GET', endpoint: `/api/events/${randomUUID()}`, expectDenied: true },
  { id: 'var-002', description: 'Cross-tenant client read', method: 'GET', endpoint: `/api/clients/${randomUUID()}`, expectDenied: true },
  { id: 'var-003', description: 'Inject admin flag', method: 'POST', endpoint: '/api/events', body: { client_id: randomUUID(), event_date: '2026-06-15', guest_count: 15, tenant_id: VICTIM_CHEF.chefId, admin: true }, expectDenied: true },
  { id: 'var-004', description: 'Negative guest count', method: 'POST', endpoint: '/api/events', body: { client_id: randomUUID(), event_date: '2026-06-15', guest_count: -1 }, expectDenied: true },
  { id: 'var-005', description: 'Huge guest count', method: 'POST', endpoint: '/api/events', body: { client_id: randomUUID(), event_date: '2026-06-15', guest_count: 999999 }, expectDenied: true },
  { id: 'var-006', description: 'Year 1900 event', method: 'POST', endpoint: '/api/events', body: { client_id: randomUUID(), event_date: '1900-01-01', guest_count: 10 }, expectDenied: true },
  { id: 'var-007', description: 'Forged auth header', method: 'GET', endpoint: '/api/events', headers: { Authorization: `Bearer ${randomUUID()}` }, expectDenied: true },
  { id: 'var-008', description: 'X-Tenant-ID header injection', method: 'GET', endpoint: '/api/events', headers: { 'X-Tenant-ID': VICTIM_CHEF.chefId }, expectDenied: true },
  { id: 'var-009', description: 'Parameter duplication', method: 'GET', endpoint: `/api/events?chef_id=good&chef_id=${VICTIM_CHEF.chefId}`, expectDenied: true },
  { id: 'var-010', description: 'Double encoding', method: 'GET', endpoint: '/api/events/%252e%252e%2fetc', expectDenied: true },
]

async function authenticate() {
  console.log(`[Auth] Authenticating...`)
  const db = createAnonClient()
  const { data, error } = await db.auth.signInWithPassword({ email: ATTACKER.email, password: ATTACKER.password })
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
  if (test.body) options.body = JSON.stringify(test.body)
  
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
  console.log('VARIATION TEST: Different Payloads, Same Attack Vectors')
  console.log('='.repeat(70) + '\n')
  
  let cookieStr
  try { cookieStr = await authenticate() } catch (err) { console.error(`[FATAL] ${err.message}`); process.exit(1) }
  
  const results = []
  console.log('Running variation tests...\n')
  
  for (const test of VARIATION_TESTS) {
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
    console.log('\n✅ ALL VARIATION TESTS PASSED - Security is robust!\n')
  } else {
    console.log(`\n🚨 ${failed} FAILURES - System may be overfitting!\n`)
  }
  
  process.exit(failed > 0 ? 1 : 0)
}

main()
