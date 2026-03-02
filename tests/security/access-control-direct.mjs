#!/usr/bin/env node

/**
 * STANDALONE ACCESS CONTROL TEST
 *
 * Direct Node.js script (no Playwright deps)
 * Tests tenant isolation by attempting cross-account data access
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { createClient } from '@supabase/supabase-js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Parse .env.local
const envContent = fs.readFileSync('.env.local', 'utf8')
const getEnv = (key) => {
  const match = envContent.match(new RegExp(`^${key}=(.+)$`, 'm'))
  return match ? match[1].trim() : ''
}

const SUPABASE_URL = getEnv('NEXT_PUBLIC_SUPABASE_URL')
const SUPABASE_ANON_KEY = getEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY')
const PROJECT_REF = 'luefkpakzvxcsqroxyhz'
const API_BASE = 'http://localhost:3100'
const REPORT_DIR = path.join(path.dirname(__dirname), '..', 'data', 'access-control-reports')

// Test accounts
const ATTACKER = {
  email: 'agent@chefflow.test',
  password: 'AgentChefFlow!2026',
  chefId: '91ec0e6a-ce61-41ec-b9e5-eea3b415e5b8',
}

const VICTIM_CHEF = {
  chefId: '15cafd7c-d9d5-489c-a333-97e89c7e2ba9',
}

const VICTIM_CHEF_B = {
  chefId: '42128f49-83eb-402a-8bff-82863f4c24d5',
}

const VICTIM_DATA = {
  clientPrimary: '809a9fef-d526-45db-9018-d619783bc585',
  clientSecondary: 'aa8c896b-0dd0-48fe-b6c9-4a0243fca302',
  eventDraft: 'c1aff94a-2632-407f-a051-304b44fce89f',
  eventPaid: '5372daa4-8b42-41d0-ad2a-047a6e6eae53',
  quoteDraft: '0ebe11ce-70b1-4549-ad82-9035afd89fd7',
  chefBEventId: '085a5e98-f9f1-4ea1-96d9-90a42b3a685f',
  chefBClientId: 'e5731699-1d00-4435-8a9e-68b4c39f4abd',
}

const TESTS = [
  // ═══ READ TESTS (passive) ═══
  // CRITICAL: FINANCIALS
  {
    id: 'fin-001',
    severity: 'CRITICAL',
    description: 'Agent reads victim chef event financial summary',
    method: 'GET',
    endpoint: `/api/documents/financial-summary/${VICTIM_DATA.eventPaid}`,
    expectDenied: true,
  },
  // CRITICAL: CLIENTS (PII)
  {
    id: 'cli-001',
    severity: 'CRITICAL',
    description: 'Agent reads victim chef primary client details',
    method: 'GET',
    endpoint: `/api/clients/${VICTIM_DATA.clientPrimary}`,
    expectDenied: true,
  },
  // HIGH: EVENTS
  {
    id: 'evt-001',
    severity: 'HIGH',
    description: 'Agent reads victim chef draft event',
    method: 'GET',
    endpoint: `/api/events/${VICTIM_DATA.eventDraft}`,
    expectDenied: true,
  },
  {
    id: 'evt-002',
    severity: 'HIGH',
    description: 'Agent reads victim chef paid event',
    method: 'GET',
    endpoint: `/api/events/${VICTIM_DATA.eventPaid}`,
    expectDenied: true,
  },
  // HIGH: QUOTES
  {
    id: 'quo-001',
    severity: 'HIGH',
    description: 'Agent reads victim chef draft quote',
    method: 'GET',
    endpoint: `/api/quotes/${VICTIM_DATA.quoteDraft}`,
    expectDenied: true,
  },
  // CROSS-CHEF ATTACK
  {
    id: 'evt-006',
    severity: 'HIGH',
    description: 'Agent reads Chef-B event',
    method: 'GET',
    endpoint: `/api/events/${VICTIM_DATA.chefBEventId}`,
    expectDenied: true,
  },

  // ═══ WRITE TESTS (AGGRESSIVE - modifying victim data) ═══
  {
    id: 'evt-write-001',
    severity: 'CRITICAL',
    description: 'Agent MODIFIES victim chef event pricing',
    method: 'PATCH',
    endpoint: `/api/events/${VICTIM_DATA.eventPaid}`,
    body: { quoted_price_cents: 99999999 },
    expectDenied: true,
  },
  {
    id: 'cli-write-001',
    severity: 'CRITICAL',
    description: 'Agent MODIFIES victim chef client contact info',
    method: 'PATCH',
    endpoint: `/api/clients/${VICTIM_DATA.clientPrimary}`,
    body: { email: 'hacked@evil.com', phone: '555-HACKED' },
    expectDenied: true,
  },
  {
    id: 'quo-write-001',
    severity: 'HIGH',
    description: 'Agent ACCEPTS victim chef quote (binding contract)',
    method: 'PATCH',
    endpoint: `/api/quotes/${VICTIM_DATA.quoteDraft}`,
    body: { status: 'accepted' },
    expectDenied: true,
  },

  // ═══ ENUMERATION TESTS (list endpoints) ═══
  {
    id: 'enum-001',
    severity: 'HIGH',
    description: 'Agent enumerates ALL victim chef clients',
    method: 'GET',
    endpoint: `/api/chef/${VICTIM_CHEF.chefId}/clients`,
    expectDenied: true,
  },
  {
    id: 'enum-002',
    severity: 'HIGH',
    description: 'Agent enumerates ALL victim chef events',
    method: 'GET',
    endpoint: `/api/chef/${VICTIM_CHEF.chefId}/events`,
    expectDenied: true,
  },
  {
    id: 'enum-003',
    severity: 'HIGH',
    description: 'Agent enumerates ALL victim chef quotes',
    method: 'GET',
    endpoint: `/api/chef/${VICTIM_CHEF.chefId}/quotes`,
    expectDenied: true,
  },

  // ═══ ADVANCED ATTACKS (cross-tenant field injection, privilege escalation) ═══
  {
    id: 'inj-001',
    severity: 'CRITICAL',
    description: 'Agent creates event with explicit cross-tenant tenant_id injection',
    method: 'POST',
    endpoint: '/api/events',
    body: {
      client_id: VICTIM_DATA.clientPrimary,
      event_date: '2026-04-01',
      event_type: 'Dinner Party',
      guest_count: 10,
      // Attempt to inject victim chef's tenant_id
      tenant_id: VICTIM_CHEF.chefId,
    },
    expectDenied: true,
  },
  {
    id: 'inj-002',
    severity: 'CRITICAL',
    description: 'Agent updates own event with cross-tenant client injection',
    method: 'PATCH',
    endpoint: `/api/events/${VICTIM_DATA.eventPaid}`,
    body: {
      // Try to claim victim chef's client
      client_id: VICTIM_DATA.clientPrimary,
    },
    expectDenied: true,
  },
  {
    id: 'esc-001',
    severity: 'CRITICAL',
    description: 'Agent attempts privilege escalation to ADMIN role',
    method: 'POST',
    endpoint: '/api/auth/escalate',
    body: { role: 'admin' },
    expectDenied: true,
  },
  {
    id: 'esc-002',
    severity: 'CRITICAL',
    description: 'Agent attempts privilege escalation to STAFF role',
    method: 'POST',
    endpoint: '/api/auth/escalate',
    body: { role: 'staff' },
    expectDenied: true,
  },
  {
    id: 'api-001',
    severity: 'HIGH',
    description: 'Agent probes /api/admin/* for unauthorized access',
    method: 'GET',
    endpoint: '/api/admin/users',
    expectDenied: true,
  },
  {
    id: 'api-002',
    severity: 'HIGH',
    description: 'Agent probes /api/staff/* for unauthorized access',
    method: 'GET',
    endpoint: '/api/staff/activity',
    expectDenied: true,
  },
  {
    id: 'del-001',
    severity: 'CRITICAL',
    description: 'Agent attempts to DELETE victim chef event',
    method: 'DELETE',
    endpoint: `/api/events/${VICTIM_DATA.eventPaid}`,
    expectDenied: true,
  },
  {
    id: 'del-002',
    severity: 'CRITICAL',
    description: 'Agent attempts to DELETE victim chef client',
    method: 'DELETE',
    endpoint: `/api/clients/${VICTIM_DATA.clientPrimary}`,
    expectDenied: true,
  },
  {
    id: 'lvl-001',
    severity: 'HIGH',
    description: 'Agent attempts bulk list of ALL chefs (ledger leak)',
    method: 'GET',
    endpoint: '/api/chefs',
    expectDenied: true,
  },
  {
    id: 'lvl-002',
    severity: 'HIGH',
    description: 'Agent attempts bulk list of ALL financial records',
    method: 'GET',
    endpoint: '/api/documents/financial-summary',
    expectDenied: true,
  },
]

async function authenticate() {
  console.log(`[Auth] Authenticating as ${ATTACKER.email}...`)
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

  const { data, error } = await supabase.auth.signInWithPassword({
    email: ATTACKER.email,
    password: ATTACKER.password,
  })

  if (error) {
    throw new Error(`Auth failed: ${error.message}`)
  }

  const session = data.session
  const cookieBaseName = `sb-${PROJECT_REF}-auth-token`
  const sessionPayload = JSON.stringify({
    access_token: session.access_token,
    refresh_token: session.refresh_token,
    expires_in: session.expires_in,
    expires_at: session.expires_at,
    token_type: session.token_type,
    user: session.user,
  })
  const encoded = 'base64-' + Buffer.from(sessionPayload).toString('base64url')
  const cookieStr = `${cookieBaseName}=${encoded}`
  console.log(`[Auth] ✅ Authenticated. Chef ID: ${ATTACKER.chefId}\n`)
  return cookieStr
}

async function runTest(cookieStr, test) {
  const url = `${API_BASE}${test.endpoint}`
  const options = {
    method: test.method,
    headers: {
      'Content-Type': 'application/json',
      Cookie: cookieStr,
    },
    redirect: 'manual',
  }

  if (test.body) {
    options.body = JSON.stringify(test.body)
  }

  const start = Date.now()
  let response
  let data = null
  let error = null

  try {
    response = await fetch(url, options)
    try {
      const text = await response.text()
      data = text ? JSON.parse(text) : null
    } catch {
      data = null
    }
  } catch (err) {
    error = err
  }

  const elapsed = Date.now() - start

  if (error) {
    return {
      ...test,
      passed: false,
      statusCode: null,
      reason: error.message,
      elapsed,
    }
  }

  // Expect DENIED: 403, 404, 401
  const isDenied = [401, 403, 404].includes(response.status)
  const hasData = !!(data && typeof data === 'object' && Object.keys(data).length > 0)
  const passed = test.expectDenied ? isDenied : !isDenied

  return {
    ...test,
    passed,
    statusCode: response.status,
    hasData,
    reason: isDenied ? 'Correctly rejected' : `ERROR: Allowed! Status ${response.status}`,
    elapsed,
  }
}

async function main() {
  console.log('=' .repeat(70))
  console.log('TENANT ISOLATION & ACCESS CONTROL AUDIT')
  console.log('=' .repeat(70))
  console.log(`Target: ${API_BASE}`)
  console.log(`Attacker: ${ATTACKER.email}`)
  console.log(`Victims: Chef (${VICTIM_CHEF.chefId.substring(0,8)}...), Chef-B (${VICTIM_CHEF_B.chefId.substring(0,8)}...)\n`)

  let cookieStr
  try {
    cookieStr = await authenticate()
  } catch (err) {
    console.error(`[FATAL] ${err.message}`)
    process.exit(1)
  }

  const results = []
  console.log('Running tests...\n')

  for (const test of TESTS) {
    const result = await runTest(cookieStr, test)
    results.push(result)

    const icon = result.passed ? '✅' : '❌'
    const elapsed = result.elapsed ? ` (${result.elapsed}ms)` : ''
    console.log(`${icon} ${test.id}: ${test.description}${elapsed}`)
    if (!result.passed) {
      console.log(`   Status: ${result.statusCode}${result.hasData ? ' + DATA LEAKED' : ''}`)
      console.log(`   ${result.reason}`)
    }
  }

  // Summary
  const passed = results.filter((r) => r.passed).length
  const failed = results.filter((r) => !r.passed).length
  const critical = results.filter((r) => r.severity === 'CRITICAL' && !r.passed).length
  const high = results.filter((r) => r.severity === 'HIGH' && !r.passed).length

  console.log(`\n` + '=' .repeat(70))
  console.log('RESULTS')
  console.log('=' .repeat(70))
  console.log(`Total: ${results.length} | ✅ Passed: ${passed} | ❌ Failed: ${failed}`)
  if (critical > 0) console.log(`🚨 CRITICAL FAILURES: ${critical}`)
  if (high > 0) console.log(`⚠️ HIGH FAILURES: ${high}`)
  console.log('=' .repeat(70) + '\n')

  // Report
  let markdown = `# Access Control Audit Report\n\n`
  markdown += `**Timestamp:** ${new Date().toISOString()}\n\n`
  markdown += `## Summary\n\n`
  markdown += `- ✅ Passed: ${passed}/${results.length}\n`
  markdown += `- ❌ Failed: ${failed}/${results.length}\n`
  markdown += `- 🚨 Critical: ${critical}\n`
  markdown += `- ⚠️ High: ${high}\n\n`

  const failures = results.filter((r) => !r.passed)
  if (failures.length > 0) {
    markdown += `## ❌ Failures\n\n`
    for (const f of failures) {
      markdown += `### ${f.id} [${f.severity}]\n`
      markdown += `**Test:** ${f.description}\n\n`
      markdown += `**Status:** ${f.statusCode}${f.hasData ? ' (DATA LEAKED)' : ''}\n\n`
      markdown += `**Endpoint:** \`${f.method} ${f.endpoint}\`\n\n`
      markdown += `**Reason:** ${f.reason}\n\n`
    }
  }

  markdown += `## ✅ Passes\n\n`
  for (const p of results.filter((r) => r.passed)) {
    markdown += `- ${p.id} (${p.severity}): ${p.description}\n`
  }

  // Severity breakdown
  markdown += `\n## By Severity\n\n`
  markdown += `| Severity | Pass | Fail |\n`
  markdown += `|----------|------|------|\n`
  for (const sev of ['CRITICAL', 'HIGH', 'MEDIUM']) {
    const tests = results.filter((r) => r.severity === sev)
    const testPassed = tests.filter((r) => r.passed).length
    const testFailed = tests.filter((r) => !r.passed).length
    if (tests.length > 0) {
      markdown += `| ${sev} | ${testPassed} | ${testFailed} |\n`
    }
  }

  markdown += `\n## Conclusion\n\n`
  if (failed === 0) {
    markdown += `✅ **ALL TESTS PASSED** — Tenant isolation boundaries are working correctly.\n`
  } else {
    markdown += `❌ **${failed} TEST(S) FAILED** — Access control vulnerabilities detected.\n`
    if (critical > 0) {
      markdown += `\n🚨 **CRITICAL:** Immediate action required.\n`
    }
  }

  // Write report
  fs.mkdirSync(REPORT_DIR, { recursive: true })
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').substring(0, 19)
  const mdPath = path.join(REPORT_DIR, `access-control-${timestamp}.md`)
  const jsonPath = path.join(REPORT_DIR, `access-control-${timestamp}.json`)

  fs.writeFileSync(mdPath, markdown)
  fs.writeFileSync(jsonPath, JSON.stringify({ timestamp, results, summary: { passed, failed, critical, high } }, null, 2))

  console.log(`Report: ${mdPath}`)
  console.log(`JSON:   ${jsonPath}\n`)

  process.exit(failed > 0 ? 1 : 0)
}

main().catch((err) => {
  console.error('[FATAL]', err.message)
  process.exit(1)
})
