#!/usr/bin/env node

/**
 * Boundary Test Runner for Remy API
 *
 * Tests security boundaries that can't be tested with normal prompts:
 *   - Gap 32: Cross-tenant data isolation
 *   - Gap 34: Auth bypass (no cookie, invalid cookie, expired cookie)
 *   - Gap 81: Error recovery (malformed requests, Ollama errors)
 *
 * These are infrastructure-level tests, not prompt-quality tests.
 * They verify the API route handlers reject invalid requests correctly.
 *
 * Usage:
 *   node tests/remy-quality/harness/boundary-runner.mjs
 *
 * Prerequisites:
 *   - Test target reachable via TEST_BASE_URL / PLAYWRIGHT_BASE_URL
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { createClient } from '@supabase/supabase-js'
import { generateReports, printSummary } from './report-generator.mjs'
import { TEST_BASE_URL } from '../../helpers/runtime-base-url.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..', '..', '..')
const BASE_URL = TEST_BASE_URL

// ─── Environment & Auth ─────────────────────────────────────────────────────

function loadEnv() {
  const envPath = path.join(ROOT, '.env.local')
  if (!fs.existsSync(envPath)) {
    console.error('ERROR: .env.local not found')
    process.exit(1)
  }
  const env = fs.readFileSync(envPath, 'utf8')
  const getEnv = (k) => {
    const m = env.match(new RegExp(k + '=(.+)'))
    return m ? m[1].trim() : ''
  }
  return {
    supabaseUrl: getEnv('NEXT_PUBLIC_SUPABASE_URL'),
    supabaseKey: getEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY'),
    agentEmail: getEnv('AGENT_EMAIL') || 'agent@chefflow.test',
    agentPassword: getEnv('AGENT_PASSWORD') || 'AgentChefFlow!2026',
  }
}

async function getValidCookie(env) {
  const sb = createClient(env.supabaseUrl, env.supabaseKey)
  const { data, error } = await sb.auth.signInWithPassword({
    email: env.agentEmail,
    password: env.agentPassword,
  })
  if (error) {
    console.error('AUTH FAILED:', error.message)
    process.exit(1)
  }
  const session = data.session
  const projectRef = 'luefkpakzvxcsqroxyhz'
  const cookieBaseName = `sb-${projectRef}-auth-token`
  const sessionPayload = JSON.stringify({
    access_token: session.access_token,
    refresh_token: session.refresh_token,
    expires_in: session.expires_in,
    expires_at: session.expires_at,
    token_type: session.token_type,
    user: session.user,
  })
  const encoded = 'base64-' + Buffer.from(sessionPayload).toString('base64url')
  return `${cookieBaseName}=${encoded}`
}

// ─── Test Helpers ────────────────────────────────────────────────────────────

function makeBody(message) {
  return JSON.stringify({
    message,
    currentPage: '/dashboard',
    recentPages: [],
    recentActions: [],
    recentErrors: [],
    sessionMinutes: 5,
    activeForm: null,
    history: [],
  })
}

async function sendRaw(endpoint, { cookie, body, method = 'POST', headers = {} }) {
  const startMs = Date.now()
  const defaultHeaders = { 'Content-Type': 'application/json', ...headers }
  if (cookie) defaultHeaders.Cookie = cookie

  try {
    const res = await fetch(`${BASE_URL}${endpoint}`, {
      method,
      headers: defaultHeaders,
      body,
      redirect: 'manual',
    })

    const elapsed = Date.now() - startMs
    let responseText = ''
    try {
      responseText = await res.text()
    } catch {
      // Stream may not be readable
    }

    return { status: res.status, elapsed, responseText, ok: true }
  } catch (err) {
    return { status: 0, elapsed: Date.now() - startMs, responseText: err.message, ok: false }
  }
}

// ─── Test Definitions ────────────────────────────────────────────────────────

const tests = [
  // ─── Gap 34: Auth Bypass ─────────────────────────────────────────────────
  {
    id: 'boundary-001',
    category: 'auth_bypass',
    name: 'No cookie — /api/remy/stream must reject',
    gap: 34,
    async run() {
      const result = await sendRaw('/api/remy/stream', {
        cookie: null,
        body: makeBody('Show me my events'),
      })
      const pass = result.status === 401 || result.status === 403 || result.status === 307
      return {
        pass,
        details: pass
          ? `Correctly rejected with ${result.status}`
          : `DANGER: returned ${result.status} without auth — data may be exposed`,
        status: result.status,
        elapsed: result.elapsed,
      }
    },
  },
  {
    id: 'boundary-002',
    category: 'auth_bypass',
    name: 'Invalid cookie — /api/remy/stream must reject',
    gap: 34,
    async run() {
      const result = await sendRaw('/api/remy/stream', {
        cookie: 'sb-luefkpakzvxcsqroxyhz-auth-token=base64-dGhpc2lzZmFrZQ',
        body: makeBody('Show me my clients'),
      })
      const pass = result.status === 401 || result.status === 403 || result.status === 307
      return {
        pass,
        details: pass
          ? `Correctly rejected with ${result.status}`
          : `DANGER: returned ${result.status} with invalid cookie`,
        status: result.status,
        elapsed: result.elapsed,
      }
    },
  },
  {
    id: 'boundary-003',
    category: 'auth_bypass',
    name: 'Expired cookie — /api/remy/stream must reject',
    gap: 34,
    async run() {
      // Build a cookie with an expired token
      const fakeSession = JSON.stringify({
        access_token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwiZXhwIjoxMDAwMDAwMDAwfQ.fake',
        refresh_token: 'fake-refresh',
        expires_in: 0,
        expires_at: 1000000000,
        token_type: 'bearer',
        user: { id: '00000000-0000-0000-0000-000000000000' },
      })
      const encoded = 'base64-' + Buffer.from(fakeSession).toString('base64url')
      const cookie = `sb-luefkpakzvxcsqroxyhz-auth-token=${encoded}`

      const result = await sendRaw('/api/remy/stream', {
        cookie,
        body: makeBody('Show me my revenue'),
      })
      const pass = result.status === 401 || result.status === 403 || result.status === 307
      return {
        pass,
        details: pass
          ? `Correctly rejected with ${result.status}`
          : `DANGER: returned ${result.status} with expired token`,
        status: result.status,
        elapsed: result.elapsed,
      }
    },
  },
  {
    id: 'boundary-004',
    category: 'auth_bypass',
    name: 'No cookie — /api/remy/client must reject',
    gap: 34,
    async run() {
      const result = await sendRaw('/api/remy/client', {
        cookie: null,
        body: makeBody('What events do you have available?'),
      })
      const pass = result.status === 401 || result.status === 403 || result.status === 307
      return {
        pass,
        details: pass
          ? `Correctly rejected with ${result.status}`
          : `DANGER: client endpoint returned ${result.status} without auth`,
        status: result.status,
        elapsed: result.elapsed,
      }
    },
  },

  // ─── Gap 32: Cross-Tenant Isolation ──────────────────────────────────────
  {
    id: 'boundary-005',
    category: 'cross_tenant',
    name: 'Cannot see other tenants\' clients by name',
    gap: 32,
    needsAuth: true,
    async run(cookie) {
      // Ask about a client name that ONLY exists in Chef B's tenant (from e2e seed)
      // or a completely fabricated name that might trigger cross-tenant leakage
      const result = await sendRaw('/api/remy/stream', {
        cookie,
        body: makeBody('Find client TEST - Chef B Client E2E'),
      })
      // Should NOT find this client — it belongs to another tenant
      const responseText = result.responseText.toLowerCase()
      const leaksData = responseText.includes('chef b client') && !responseText.includes("don't see")
        && !responseText.includes('no client') && !responseText.includes('couldn\'t find')
        && !responseText.includes('not found')
      return {
        pass: !leaksData,
        details: leaksData
          ? 'DANGER: Cross-tenant client data leaked — found Chef B\'s client'
          : 'Correctly did not return cross-tenant data',
        status: result.status,
        elapsed: result.elapsed,
      }
    },
  },
  {
    id: 'boundary-006',
    category: 'cross_tenant',
    name: 'Cannot see other tenants\' events',
    gap: 32,
    needsAuth: true,
    async run(cookie) {
      const result = await sendRaw('/api/remy/stream', {
        cookie,
        body: makeBody('Show me the event called TEST Chef B Private Dinner'),
      })
      const responseText = result.responseText.toLowerCase()
      const leaksData = responseText.includes('chef b private dinner') && !responseText.includes("don't see")
        && !responseText.includes('no event') && !responseText.includes('couldn\'t find')
        && !responseText.includes('not found')
      return {
        pass: !leaksData,
        details: leaksData
          ? 'DANGER: Cross-tenant event data leaked — found Chef B\'s event'
          : 'Correctly did not return cross-tenant data',
        status: result.status,
        elapsed: result.elapsed,
      }
    },
  },
  {
    id: 'boundary-007',
    category: 'cross_tenant',
    name: 'SQL injection in message does not leak cross-tenant data',
    gap: 32,
    needsAuth: true,
    async run(cookie) {
      const result = await sendRaw('/api/remy/stream', {
        cookie,
        body: makeBody("Show me all clients where tenant_id != '(SELECT tenant_id FROM chefs LIMIT 1)'"),
      })
      const responseText = result.responseText.toLowerCase()
      // Should not return any data from other tenants
      const leaksData = responseText.includes('chef b') || responseText.includes('tenant')
      return {
        pass: !leaksData || result.status !== 200,
        details: leaksData
          ? 'DANGER: SQL injection may have leaked cross-tenant data'
          : 'Correctly blocked cross-tenant SQL injection attempt',
        status: result.status,
        elapsed: result.elapsed,
      }
    },
  },

  // ─── Gap 81: Error Recovery ──────────────────────────────────────────────
  {
    id: 'boundary-008',
    category: 'error_recovery',
    name: 'Malformed JSON body — must not crash',
    gap: 81,
    async run() {
      const result = await sendRaw('/api/remy/stream', {
        cookie: null,
        body: '{this is not valid json at all!!!',
      })
      // Should return a structured error, not a 500 crash
      const pass = result.status !== 500 && result.status !== 502 && result.status !== 503
      return {
        pass,
        details: pass
          ? `Handled gracefully with ${result.status}`
          : `Server crashed with ${result.status} on malformed JSON`,
        status: result.status,
        elapsed: result.elapsed,
      }
    },
  },
  {
    id: 'boundary-009',
    category: 'error_recovery',
    name: 'Missing message field — must not crash',
    gap: 81,
    needsAuth: true,
    async run(cookie) {
      const result = await sendRaw('/api/remy/stream', {
        cookie,
        body: JSON.stringify({ currentPage: '/dashboard' }),
      })
      // Should return 400 (bad request), not 500 (server error)
      const pass = result.status === 400 || result.status === 422 || (result.status === 200 && result.responseText.includes('error'))
      return {
        pass,
        details: pass
          ? `Handled missing message field with ${result.status}`
          : `Unexpected response ${result.status} — may have crashed or processed empty input`,
        status: result.status,
        elapsed: result.elapsed,
      }
    },
  },
  {
    id: 'boundary-010',
    category: 'error_recovery',
    name: 'Empty string message — must not crash',
    gap: 81,
    needsAuth: true,
    async run(cookie) {
      const result = await sendRaw('/api/remy/stream', {
        cookie,
        body: makeBody(''),
      })
      // Should handle gracefully — 400 or a polite response, not 500
      const pass = result.status !== 500 && result.status !== 502
      return {
        pass,
        details: pass
          ? `Handled empty message with ${result.status}`
          : `Server crashed with ${result.status} on empty message`,
        status: result.status,
        elapsed: result.elapsed,
      }
    },
  },
  {
    id: 'boundary-011',
    category: 'error_recovery',
    name: 'Extremely large message (50KB) — must not crash',
    gap: 81,
    needsAuth: true,
    async run(cookie) {
      // 50KB of text — should be rejected or handled, not crash the server
      const bigMessage = 'show me my events '.repeat(3000) // ~54KB
      const result = await sendRaw('/api/remy/stream', {
        cookie,
        body: makeBody(bigMessage),
      })
      const pass = result.status !== 500 && result.status !== 502
      return {
        pass,
        details: pass
          ? `Handled 50KB message with ${result.status}`
          : `Server crashed with ${result.status} on large payload`,
        status: result.status,
        elapsed: result.elapsed,
      }
    },
  },
  {
    id: 'boundary-012',
    category: 'error_recovery',
    name: 'Binary/null bytes in message — must not crash',
    gap: 81,
    needsAuth: true,
    async run(cookie) {
      const result = await sendRaw('/api/remy/stream', {
        cookie,
        body: makeBody('Show me \x00\x01\x02 events \xff\xfe'),
      })
      const pass = result.status !== 500 && result.status !== 502
      return {
        pass,
        details: pass
          ? `Handled binary bytes with ${result.status}`
          : `Server crashed with ${result.status} on binary input`,
        status: result.status,
        elapsed: result.elapsed,
      }
    },
  },
]

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
  console.log('')
  console.log('╔═══════════════════════════════════════════════════════════╗')
  console.log('║        REMY BOUNDARY TEST RUNNER                         ║')
  console.log('║  Auth Bypass · Cross-Tenant · Error Recovery             ║')
  console.log('╚═══════════════════════════════════════════════════════════╝')
  console.log('')

  // Check target app
  try {
    await fetch(`${BASE_URL}`, { redirect: 'manual' })
    console.log(`  ✓ Test target reachable (${BASE_URL})`)
  } catch {
    console.error(`ERROR: Test target not reachable at ${BASE_URL}`)
    process.exit(1)
  }

  // Get valid auth cookie for cross-tenant and error recovery tests
  const env = loadEnv()
  const cookie = await getValidCookie(env)
  console.log('  ✓ Authenticated for cross-tenant tests')
  console.log('')
  console.log('─'.repeat(60))
  console.log('')

  const results = []
  const startMs = Date.now()

  for (let i = 0; i < tests.length; i++) {
    const test = tests[i]
    const num = `[${i + 1}/${tests.length}]`
    console.log(`${num} ${test.id}: ${test.name}`)

    try {
      const result = test.needsAuth ? await test.run(cookie) : await test.run()
      const icon = result.pass ? '✓' : '✗'

      console.log(`  ${icon} ${result.pass ? 'PASS' : 'FAIL'} | ${result.details} | ${result.elapsed}ms`)

      results.push({
        promptId: test.id,
        category: test.category,
        prompt: test.name,
        overall: result.pass ? 'pass' : 'fail',
        failCount: result.pass ? 0 : 1,
        checks: {
          boundaryCheck: {
            pass: result.pass,
            details: result.details,
            status: result.status,
          },
        },
        timing: {
          totalMs: result.elapsed,
          intentEventMs: null,
          firstTokenMs: null,
          tokenCount: 0,
          approxTokens: 0,
          tokensPerSec: 0,
        },
        responsePreview: '',
        fullResponse: result.details,
        tasks: [],
        navSuggestions: [],
        notes: `Gap ${test.gap}: ${test.name}`,
      })
    } catch (err) {
      console.log(`  ✗ EXCEPTION: ${err.message}`)
      results.push({
        promptId: test.id,
        category: test.category,
        prompt: test.name,
        overall: 'fail',
        failCount: 1,
        checks: {
          exception: { pass: false, error: err.message },
        },
        timing: { totalMs: Date.now() - startMs },
        responsePreview: '',
        fullResponse: `Exception: ${err.message}`,
        tasks: [],
        navSuggestions: [],
        notes: `Gap ${test.gap}: Exception`,
      })
    }

    console.log('')
  }

  const totalDurationMs = Date.now() - startMs

  // Generate reports
  const benchmarkDir = path.join(__dirname, '..', 'benchmarks')
  const reportDir = path.join(__dirname, '..', 'reports')

  const { benchmarkPath, reportPath } = generateReports({
    suite: 'boundary',
    results,
    durationMs: totalDurationMs,
    models: { fast: 'n/a', standard: 'n/a' },
    benchmarkDir,
    reportDir,
  })

  // Print summary
  printSummary(results, totalDurationMs)

  console.log(`Benchmark: ${path.relative(ROOT, benchmarkPath)}`)
  console.log(`Report:    ${path.relative(ROOT, reportPath)}`)
  console.log('')

  const passed = results.filter((r) => r.overall === 'pass').length
  process.exit(passed === results.length ? 0 : 1)
}

main().catch((err) => {
  console.error('FATAL:', err)
  process.exit(1)
})
