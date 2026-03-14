/**
 * TENANT ISOLATION & ACCESS CONTROL AUDIT
 *
 * Comprehensive security test: Agent account attempts to access other chefs' data
 * across all high-value resources (events, clients, financials, quotes).
 *
 * Run: npm run test:access-control
 * Generate report: npm run test:access-control 2>&1 | tee access-control-audit.log
 */

import { test, expect } from '@playwright/test'
import * as fs from 'fs'
import * as path from 'path'

const API_BASE = 'http://localhost:3100'
const REPORT_DIR = path.join(process.cwd(), 'data', 'access-control-reports')

// Test accounts from .auth/seed-ids.json
const ATTACKER = {
  email: 'agent@chefflow.test',
  password: 'AgentChefFlow!2026',
  chefId: '91ec0e6a-ce61-41ec-b9e5-eea3b415e5b8',
  tenantId: '91ec0e6a-ce61-41ec-b9e5-eea3b415e5b8',
}

const VICTIM_CHEF = {
  chefId: '15cafd7c-d9d5-489c-a333-97e89c7e2ba9',
  email: 'e2e.chef.20260302@chefflow.test',
}

const VICTIM_CHEF_B = {
  chefId: '42128f49-83eb-402a-8bff-82863f4c24d5',
  email: 'e2e.chef-b.20260302@chefflow.test',
}

// Seed data IDs from .auth/seed-ids.json
const VICTIM_DATA = {
  // Chef's clients
  clientPrimary: '809a9fef-d526-45db-9018-d619783bc585',
  clientSecondary: 'aa8c896b-0dd0-48fe-b6c9-4a0243fca302',
  clientDormant: 'a2ccffe9-f9bc-4be9-8b67-237ab654918f',

  // Chef's events
  eventDraft: 'c1aff94a-2632-407f-a051-304b44fce89f',
  eventProposed: 'e4c870d9-63f8-4aeb-8deb-7d3d64638d8f',
  eventPaid: '5372daa4-8b42-41d0-ad2a-047a6e6eae53',
  eventConfirmed: 'ec0ce9ef-4e34-4750-be28-5fc4edbb0cc2',
  eventCompleted: '020756c2-a8fb-4f80-8d4f-a59189e3b323',

  // Chef's quotes
  quoteDraft: '0ebe11ce-70b1-4549-ad82-9035afd89fd7',
  quoteSent: 'fef8be3b-7127-4597-ae0b-89e7ebde7132',
  quoteAccepted: '5b3df8ff-1434-455e-bc99-c27fa12792ca',

  // Chef B's data
  chefBEventId: '085a5e98-f9f1-4ea1-96d9-90a42b3a685f',
  chefBClientId: 'e5731699-1d00-4435-8a9e-68b4c39f4abd',
}

interface TestCase {
  id: string
  category: string
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM'
  description: string
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE'
  endpoint: string
  body?: any
  expectStatus: number[]
  expectNoData?: boolean
}

const TESTS: TestCase[] = [
  // ═══════════════════════════════════════════════════════════════════════════
  // CRITICAL: FINANCIALS & REVENUE
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: 'fin-001',
    category: 'Financials',
    severity: 'CRITICAL',
    description: 'Agent reads victim chef event financial summary',
    method: 'GET',
    endpoint: `/api/documents/financial-summary/${VICTIM_DATA.eventCompleted}`,
    expectStatus: [403, 404, 401],
    expectNoData: true,
  },
  {
    id: 'fin-002',
    category: 'Financials',
    severity: 'CRITICAL',
    description: 'Agent accesses victim chef ledger entries',
    method: 'GET',
    endpoint: `/api/chef/${VICTIM_CHEF.chefId}/financials`,
    expectStatus: [403, 404, 401],
    expectNoData: true,
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // CRITICAL: CLIENT DATA (PII)
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: 'cli-001',
    category: 'Clients',
    severity: 'CRITICAL',
    description: 'Agent reads victim chef primary client details',
    method: 'GET',
    endpoint: `/api/clients/${VICTIM_DATA.clientPrimary}`,
    expectStatus: [403, 404, 401],
    expectNoData: true,
  },
  {
    id: 'cli-002',
    category: 'Clients',
    severity: 'CRITICAL',
    description: 'Agent lists all victim chef clients',
    method: 'GET',
    endpoint: `/api/chef/${VICTIM_CHEF.chefId}/clients`,
    expectStatus: [403, 404, 401],
    expectNoData: true,
  },
  {
    id: 'cli-003',
    category: 'Clients',
    severity: 'CRITICAL',
    description: 'Agent updates victim chef client contact info',
    method: 'PATCH',
    endpoint: `/api/clients/${VICTIM_DATA.clientSecondary}`,
    body: { email: 'hacked@evil.com', phone: '555-1234' },
    expectStatus: [403, 404, 401],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // HIGH: EVENTS (Revenue, Schedule, Client Relationships)
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: 'evt-001',
    category: 'Events',
    severity: 'HIGH',
    description: 'Agent reads victim chef draft event',
    method: 'GET',
    endpoint: `/api/events/${VICTIM_DATA.eventDraft}`,
    expectStatus: [403, 404, 401],
    expectNoData: true,
  },
  {
    id: 'evt-002',
    category: 'Events',
    severity: 'HIGH',
    description: 'Agent reads victim chef paid event (most valuable)',
    method: 'GET',
    endpoint: `/api/events/${VICTIM_DATA.eventPaid}`,
    expectStatus: [403, 404, 401],
    expectNoData: true,
  },
  {
    id: 'evt-003',
    category: 'Events',
    severity: 'HIGH',
    description: 'Agent modifies victim chef event pricing',
    method: 'PATCH',
    endpoint: `/api/events/${VICTIM_DATA.eventProposed}`,
    body: { quoted_price_cents: 100000 }, // Set to $1000
    expectStatus: [403, 404, 401],
  },
  {
    id: 'evt-004',
    category: 'Events',
    severity: 'HIGH',
    description: 'Agent cancels victim chef event',
    method: 'PATCH',
    endpoint: `/api/events/${VICTIM_DATA.eventConfirmed}`,
    body: { status: 'cancelled' },
    expectStatus: [403, 404, 401],
  },
  {
    id: 'evt-005',
    category: 'Events',
    severity: 'HIGH',
    description: 'Agent lists victim chef all events',
    method: 'GET',
    endpoint: `/api/chef/${VICTIM_CHEF.chefId}/events`,
    expectStatus: [403, 404, 401],
    expectNoData: true,
  },
  {
    id: 'evt-006',
    category: 'Events',
    severity: 'HIGH',
    description: 'Agent reads Chef-B event (cross-chef attack)',
    method: 'GET',
    endpoint: `/api/events/${VICTIM_DATA.chefBEventId}`,
    expectStatus: [403, 404, 401],
    expectNoData: true,
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // HIGH: QUOTES & PROPOSALS (Binding contracts)
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: 'quo-001',
    category: 'Quotes',
    severity: 'HIGH',
    description: 'Agent reads victim chef draft quote',
    method: 'GET',
    endpoint: `/api/quotes/${VICTIM_DATA.quoteDraft}`,
    expectStatus: [403, 404, 401],
    expectNoData: true,
  },
  {
    id: 'quo-002',
    category: 'Quotes',
    severity: 'HIGH',
    description: 'Agent accepts victim chef quote (binding)',
    method: 'PATCH',
    endpoint: `/api/quotes/${VICTIM_DATA.quoteSent}`,
    body: { status: 'accepted' },
    expectStatus: [403, 404, 401],
  },
  {
    id: 'quo-003',
    category: 'Quotes',
    severity: 'HIGH',
    description: 'Agent lists victim chef all quotes',
    method: 'GET',
    endpoint: `/api/chef/${VICTIM_CHEF.chefId}/quotes`,
    expectStatus: [403, 404, 401],
    expectNoData: true,
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // MEDIUM: RECIPES & MENUS (IP, but less immediately damaging)
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: 'rcp-001',
    category: 'Recipes',
    severity: 'MEDIUM',
    description: 'Agent accesses victim chef recipes',
    method: 'GET',
    endpoint: `/api/chef/${VICTIM_CHEF.chefId}/recipes`,
    expectStatus: [403, 404, 401],
    expectNoData: true,
  },
]

interface TestResult {
  testId: string
  category: string
  severity: string
  description: string
  passed: boolean
  statusCode: number
  hasData: boolean
  expected: string
  actual: string
  curl: string
}

test.describe('Tenant Isolation & Access Control Audit', () => {
  let authToken = ''
  const results: TestResult[] = []

  test.beforeAll(async () => {
    // Authenticate as attacker (agent account)
    const response = await fetch(`${API_BASE}/api/e2e/auth`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: ATTACKER.email,
        password: ATTACKER.password,
      }),
    })

    expect(response.ok).toBeTruthy()
    const data = (await response.json()) as any
    authToken = data.token || data.access_token || ''
    console.log(`\n[Auth] Agent account authenticated: ${ATTACKER.email}`)
    console.log(`[Auth] Chef ID: ${ATTACKER.chefId}`)
  })

  // Run each test case
  for (const testCase of TESTS) {
    test(`${testCase.id}: ${testCase.description}`, async () => {
      const url = `${API_BASE}${testCase.endpoint}`
      const options: RequestInit = {
        method: testCase.method,
        headers: {
          'Content-Type': 'application/json',
          Cookie: authToken ? `auth-token=${authToken}` : '',
        },
        redirect: 'manual',
      }

      if (testCase.body) {
        options.body = JSON.stringify(testCase.body)
      }

      const response = await fetch(url, options)
      let data: any = null

      try {
        const text = await response.text()
        data = text ? JSON.parse(text) : null
      } catch {
        data = null
      }

      const hasData = !!(data && typeof data === 'object' && Object.keys(data).length > 0)
      const passed =
        testCase.expectStatus.includes(response.status) && (!testCase.expectNoData || !hasData)

      const curl = `curl -X ${testCase.method} "${url}" -H "Cookie: auth-token=${authToken}"${
        testCase.body ? ` -d '${JSON.stringify(testCase.body)}'` : ''
      }`

      const result: TestResult = {
        testId: testCase.id,
        category: testCase.category,
        severity: testCase.severity,
        description: testCase.description,
        passed,
        statusCode: response.status,
        hasData,
        expected: `Status in [${testCase.expectStatus.join(', ')}]${
          testCase.expectNoData ? ' + no data' : ''
        }`,
        actual: `Status ${response.status}${hasData ? ' + data returned' : ''}`,
        curl,
      }

      results.push(result)

      const status = passed ? '✅' : '❌'
      console.log(`${status} ${testCase.id}: ${testCase.description}`)
      if (!passed) {
        console.log(`   Expected: ${result.expected}`)
        console.log(`   Got:      ${result.actual}`)
      }

      expect(passed).toBeTruthy()
    })
  }

  test.afterAll(() => {
    // Generate comprehensive report
    const passed = results.filter((r) => r.passed).length
    const failed = results.filter((r) => !r.passed).length
    const critical = results.filter((r) => r.severity === 'CRITICAL' && !r.passed).length
    const high = results.filter((r) => r.severity === 'HIGH' && !r.passed).length

    let markdown = `# Access Control Audit Report\n\n`
    markdown += `**Date:** ${new Date().toISOString()}\n\n`
    markdown += `## Summary\n\n`
    markdown += `| Metric | Count |\n`
    markdown += `|--------|-------|\n`
    markdown += `| Total Tests | ${results.length} |\n`
    markdown += `| ✅ Passed | ${passed} |\n`
    markdown += `| ❌ Failed | ${failed} |\n`
    markdown += `| 🚨 Critical Failures | ${critical} |\n`
    markdown += `| ⚠️ High Failures | ${high} |\n\n`

    // Failures first
    const failures = results.filter((r) => !r.passed)
    if (failures.length > 0) {
      markdown += `## 🚨 FAILURES (Access Control Breaches)\n\n`
      for (const f of failures) {
        markdown += `### ${f.testId} — ${f.category} [${f.severity}]\n`
        markdown += `**Description:** ${f.description}\n\n`
        markdown += `**Expected:** ${f.expected}\n\n`
        markdown += `**Actual:** ${f.actual}\n\n`
        markdown += `**To Reproduce:**\n\`\`\`bash\n${f.curl}\n\`\`\`\n\n`
      }
    }

    // Passes
    const passes = results.filter((r) => r.passed)
    markdown += `## ✅ PASSES (Boundaries Protected)\n\n`
    for (const p of passes) {
      markdown += `- ${p.testId} (${p.category}): ${p.description}\n`
    }
    markdown += '\n'

    // By category
    markdown += `## Category Breakdown\n\n`
    const byCategory = {} as Record<string, { pass: number; fail: number }>
    for (const r of results) {
      if (!byCategory[r.category]) byCategory[r.category] = { pass: 0, fail: 0 }
      byCategory[r.category][r.passed ? 'pass' : 'fail']++
    }

    markdown += `| Category | ✅ Pass | ❌ Fail | Status |\n`
    markdown += `|----------|---------|---------|--------|\n`
    for (const [cat, counts] of Object.entries(byCategory)) {
      const status = counts.fail === 0 ? '✅ SECURE' : '❌ VULNERABLE'
      markdown += `| ${cat} | ${counts.pass} | ${counts.fail} | ${status} |\n`
    }
    markdown += '\n'

    // Severity breakdown
    markdown += `## Severity Breakdown\n\n`
    const critical_failures = failures.filter((r) => r.severity === 'CRITICAL')
    const high_failures = failures.filter((r) => r.severity === 'HIGH')
    const medium_failures = failures.filter((r) => r.severity === 'MEDIUM')

    if (critical_failures.length > 0) {
      markdown += `### 🚨 CRITICAL (${critical_failures.length})\n`
      for (const f of critical_failures) {
        markdown += `- ${f.testId}: ${f.description}\n`
      }
      markdown += '\n'
    }

    if (high_failures.length > 0) {
      markdown += `### ⚠️ HIGH (${high_failures.length})\n`
      for (const f of high_failures) {
        markdown += `- ${f.testId}: ${f.description}\n`
      }
      markdown += '\n'
    }

    if (medium_failures.length > 0) {
      markdown += `### ℹ️ MEDIUM (${medium_failures.length})\n`
      for (const f of medium_failures) {
        markdown += `- ${f.testId}: ${f.description}\n`
      }
      markdown += '\n'
    }

    // Conclusion
    markdown += `## Conclusion\n\n`
    if (failed === 0) {
      markdown += `✅ **ALL TESTS PASSED** — Tenant isolation is working correctly. Access control boundaries are secure.\n`
    } else {
      markdown += `❌ **${failed} TEST(S) FAILED** — Access control breaches detected. See failures above for reproduction steps.\n`
      if (critical > 0) {
        markdown += `\n🚨 **CRITICAL:** ${critical} critical vulnerabilities must be fixed immediately.\n`
      }
    }

    // Write reports
    fs.mkdirSync(REPORT_DIR, { recursive: true })
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').substring(0, 19)
    const mdPath = path.join(REPORT_DIR, `access-control-${timestamp}.md`)
    const jsonPath = path.join(REPORT_DIR, `access-control-${timestamp}.json`)

    fs.writeFileSync(mdPath, markdown)
    fs.writeFileSync(
      jsonPath,
      JSON.stringify({ timestamp, results, summary: { passed, failed, critical, high } }, null, 2)
    )

    console.log(`\n` + '='.repeat(70))
    console.log('ACCESS CONTROL AUDIT COMPLETE')
    console.log('='.repeat(70))
    console.log(`✅ Passed: ${passed}/${results.length}`)
    console.log(`❌ Failed: ${failed}/${results.length}`)
    if (critical > 0) console.log(`🚨 CRITICAL: ${critical}`)
    console.log(`\nReport: ${mdPath}`)
    console.log(`JSON:   ${jsonPath}`)
    console.log('='.repeat(70) + '\n')
  })
})
