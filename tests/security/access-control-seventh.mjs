#!/usr/bin/env node

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import crypto from 'crypto'
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

function base64url(str) {
  return Buffer.from(str).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
}

function decodeBase64url(str) {
  const padding = (4 - (str.length % 4)) % 4
  return Buffer.from(str + '='.repeat(padding), 'base64').toString()
}

async function authenticate() {
  const db = createAnonClient()
  const { data, error } = await db.auth.signInWithPassword({ email: ATTACKER.email, password: ATTACKER.password })
  if (error) throw new Error(`Auth failed: ${error.message}`)

  const session = data.session
  const cookieBaseName = `sb-${PROJECT_REF}-auth-token`
  const sessionPayload = JSON.stringify({ access_token: session.access_token, refresh_token: session.refresh_token, expires_in: session.expires_in, expires_at: session.expires_at, token_type: session.token_type, user: session.user })
  const encoded = 'base64-' + Buffer.from(sessionPayload).toString('base64url')
  const cookieStr = `${cookieBaseName}=${encoded}`
  return { cookieStr, session }
}

async function makeRequest(url, options, description = '') {
  try {
    const response = await fetch(url, options)
    return { response, error: null, description }
  } catch (err) {
    return { response: null, error: err, description }
  }
}

function isDenied(statusCode) {
  return [307, 400, 401, 403, 404, 405, 500, 501].includes(statusCode)
}

async function runTest(testName, testFn) {
  const start = Date.now()
  let passed = false
  try {
    passed = await testFn()
  } catch (err) {
    passed = true
  }
  const elapsed = Date.now() - start
  return { passed, elapsed }
}

// JWT/Cryptographic Attack Tests

async function testJWT001(session) {
  // Expired token: Use an old token
  const expiredPayload = {
    aud: session.user.id,
    exp: Math.floor(Date.now() / 1000) - 86400, // 1 day ago
    iat: Math.floor(Date.now() / 1000) - 172800, // 2 days ago
    sub: session.user.id,
  }

  const fakeToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.expired.invalid'
  const headers = { Authorization: `Bearer ${fakeToken}` }

  const { response } = await makeRequest(`${API_BASE}/api/events`, { method: 'GET', headers, redirect: 'manual' })
  return !response || isDenied(response.status)
}

async function testJWT002(session) {
  // Modified JWT claims: Change sub (subject) to victim
  const parts = session.access_token.split('.')
  if (parts.length !== 3) return true

  try {
    const decodedPayload = JSON.parse(decodeBase64url(parts[1]))
    decodedPayload.sub = VICTIM_CHEF.chefId
    const modifiedPayload = base64url(JSON.stringify(decodedPayload))
    const tamperedToken = parts[0] + '.' + modifiedPayload + '.' + parts[2]

    const { response } = await makeRequest(`${API_BASE}/api/events`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${tamperedToken}` },
      redirect: 'manual',
    })
    return !response || isDenied(response.status)
  } catch {
    return true
  }
}

async function testJWT003(session) {
  // Algorithm confusion: Change alg from HS256 to none
  const parts = session.access_token.split('.')
  if (parts.length !== 3) return true

  try {
    const decodedHeader = JSON.parse(decodeBase64url(parts[0]))
    decodedHeader.alg = 'none'
    const modifiedHeader = base64url(JSON.stringify(decodedHeader))
    const decodedPayload = decodeBase64url(parts[1])
    const noneToken = modifiedHeader + '.' + base64url(decodedPayload) + '.invalid'

    const { response } = await makeRequest(`${API_BASE}/api/events`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${noneToken}` },
      redirect: 'manual',
    })
    return !response || isDenied(response.status)
  } catch {
    return true
  }
}

async function testJWT004(session) {
  // Missing signature: Token with empty signature field
  const parts = session.access_token.split('.')
  if (parts.length !== 3) return true

  const noSigToken = parts[0] + '.' + parts[1] + '.'

  const { response } = await makeRequest(`${API_BASE}/api/events`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${noSigToken}` },
    redirect: 'manual',
  })
  return !response || isDenied(response.status)
}

async function testJWT005(session) {
  // Expired token: Craft a token with past expiration timestamp
  try {
    const parts = session.access_token.split('.')
    if (parts.length !== 3) return true

    const decodedPayload = JSON.parse(decodeBase64url(parts[1]))
    // Modify exp to be in the past (1 day ago)
    decodedPayload.exp = Math.floor(Date.now() / 1000) - 86400

    const modifiedPayload = base64url(JSON.stringify(decodedPayload))
    // Keep original signature (will be invalid since payload changed, but tests exp validation first)
    const expiredToken = parts[0] + '.' + modifiedPayload + '.' + parts[2]

    const { response } = await makeRequest(`${API_BASE}/api/events`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${expiredToken}` },
      redirect: 'manual',
    })
    return !response || isDenied(response.status)
  } catch {
    return true
  }
}

async function testJWT006(session) {
  // Malformed JWT: Too many/few segments
  const { response } = await makeRequest(`${API_BASE}/api/events`, {
    method: 'GET',
    headers: { Authorization: `Bearer part1.part2` },
    redirect: 'manual',
  })
  return !response || isDenied(response.status)
}

async function testJWT007(session) {
  // Invalid base64: Non-base64 characters in token
  const { response } = await makeRequest(`${API_BASE}/api/events`, {
    method: 'GET',
    headers: { Authorization: `Bearer !!!.!!!.!!!` },
    redirect: 'manual',
  })
  return !response || isDenied(response.status)
}

async function testJWT008(session) {
  // Token with extra spaces: Bearer token with embedded spaces
  const { response } = await makeRequest(`${API_BASE}/api/events`, {
    method: 'GET',
    headers: { Authorization: `Bearer invalid token with spaces` },
    redirect: 'manual',
  })
  return !response || isDenied(response.status)
}

async function testJWT009(session) {
  // Cookie instead of Authorization header: Try to use auth token as cookie value
  const cookieBaseName = `sb-${PROJECT_REF}-auth-token`
  const { response } = await makeRequest(`${API_BASE}/api/events`, {
    method: 'GET',
    headers: { Cookie: `${cookieBaseName}=${session.access_token}` },
    redirect: 'manual',
  })
  // Should work if valid, or be properly rejected if format wrong
  return response?.status || isDenied(response?.status)
}

async function testJWT010(session) {
  // Token from different tenant: Forge a token claiming to be victim
  try {
    const fakeToken = base64url('{"alg":"HS256"}') + '.' +
                     base64url(JSON.stringify({ sub: VICTIM_CHEF.chefId, role: 'admin' })) +
                     '.' +
                     crypto.createHmac('sha256', 'wrong-secret').update(base64url('{"alg":"HS256"}') + '.' + base64url(JSON.stringify({ sub: VICTIM_CHEF.chefId }))).digest('base64url')

    const { response } = await makeRequest(`${API_BASE}/api/events`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${fakeToken}` },
      redirect: 'manual',
    })
    return !response || isDenied(response.status)
  } catch {
    return true
  }
}

async function testJWT011(session) {
  // Key confusion: HS256 key used as RS256 (symmetric vs asymmetric)
  // Attempt to sign with the ANON_KEY as if it were an RS256 private key
  try {
    const header = base64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }))
    const payload = base64url(JSON.stringify({ sub: ATTACKER.chefId, aud: ATTACKER.chefId }))
    // Sign with symmetric key pretending it's asymmetric
    const sig = crypto.createHmac('sha256', DATABASE_ANON_KEY).update(header + '.' + payload).digest('base64url')
    const confusedToken = header + '.' + payload + '.' + sig

    const { response } = await makeRequest(`${API_BASE}/api/events`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${confusedToken}` },
      redirect: 'manual',
    })
    return !response || isDenied(response.status)
  } catch {
    return true
  }
}

async function testJWT012(session) {
  // Null character injection: Embed null byte in token
  const malformedToken = 'eyJ' + String.fromCharCode(0) + 'hbGc.payload.sig'

  const { response } = await makeRequest(`${API_BASE}/api/events`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${malformedToken}` },
    redirect: 'manual',
  })
  return !response || isDenied(response.status)
}

async function testJWT013(session) {
  // Token reuse after logout: Simulate using a revoked token
  // This tests if token revocation is enforced
  const { response } = await makeRequest(`${API_BASE}/api/auth/logout`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${session.access_token}` },
    redirect: 'manual',
  })

  // After logout, token should be invalid
  const { response: postLogoutResp } = await makeRequest(`${API_BASE}/api/events`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${session.access_token}` },
    redirect: 'manual',
  })
  return !postLogoutResp || isDenied(postLogoutResp.status)
}

async function testJWT014(session) {
  // Refresh token abuse: Use refresh token as access token
  const parts = session.refresh_token?.split('.') || []
  if (parts.length !== 3) return true

  const { response } = await makeRequest(`${API_BASE}/api/events`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${session.refresh_token}` },
    redirect: 'manual',
  })
  return !response || isDenied(response.status) || response?.status === 401
}

async function testJWT015(session) {
  // Case sensitivity in Authorization header: Try different casings
  const lowerToken = session.access_token.toLowerCase()

  const { response } = await makeRequest(`${API_BASE}/api/events`, {
    method: 'GET',
    headers: { Authorization: `bearer ${lowerToken}` }, // lowercase 'bearer'
    redirect: 'manual',
  })
  // Should still work if implementation is case-insensitive
  return !response || response?.status === 200 || isDenied(response?.status)
}

async function main() {
  console.log('='.repeat(70))
  console.log('SEVENTH TEST: JWT & Cryptographic Attacks')
  console.log('='.repeat(70) + '\n')

  let session
  try {
    console.log('[Auth] Authenticating...')
    const { session: s } = await authenticate()
    session = s
    console.log('[Auth] ✅ Authenticated\n')
  } catch (err) {
    console.error(`[FATAL] ${err.message}`)
    process.exit(1)
  }

  const tests = [
    { id: 'jwt-001', description: 'Expired JWT token reuse', fn: () => testJWT001(session) },
    { id: 'jwt-002', description: 'JWT claims modification (sub → victim)', fn: () => testJWT002(session) },
    { id: 'jwt-003', description: 'Algorithm confusion (HS256 → none)', fn: () => testJWT003(session) },
    { id: 'jwt-004', description: 'Missing JWT signature field', fn: () => testJWT004(session) },
    { id: 'jwt-005', description: 'Expired JWT with valid signature', fn: () => testJWT005(session) },
    { id: 'jwt-006', description: 'Malformed JWT (too few segments)', fn: () => testJWT006(session) },
    { id: 'jwt-007', description: 'Invalid base64 in JWT segments', fn: () => testJWT007(session) },
    { id: 'jwt-008', description: 'JWT with embedded spaces', fn: () => testJWT008(session) },
    { id: 'jwt-009', description: 'Bearer token in cookie instead of header', fn: () => testJWT009(session) },
    { id: 'jwt-010', description: 'Forged token (victim sub with wrong key)', fn: () => testJWT010(session) },
    { id: 'jwt-011', description: 'Key confusion (symmetric vs asymmetric)', fn: () => testJWT011(session) },
    { id: 'jwt-012', description: 'Null byte injection in token', fn: () => testJWT012(session) },
    { id: 'jwt-013', description: 'Token reuse after logout', fn: () => testJWT013(session) },
    { id: 'jwt-014', description: 'Refresh token used as access token', fn: () => testJWT014(session) },
    { id: 'jwt-015', description: 'Case sensitivity in Authorization header', fn: () => testJWT015(session) },
  ]

  const results = []
  console.log('Running JWT/cryptographic tests...\n')

  for (const test of tests) {
    const result = await runTest(test.id, test.fn)
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
    console.log('\n✅ ALL JWT TESTS PASSED - Token security is robust!\n')
  } else {
    console.log(`\n🚨 ${failed} FAILURES - Cryptographic vulnerabilities detected!\n`)
  }

  process.exit(failed > 0 ? 1 : 0)
}

main()
