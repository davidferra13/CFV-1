#!/usr/bin/env node

/**
 * Client Remy Quality Runner
 *
 * Self-contained test harness that sends 100 real client-facing prompts
 * to /api/remy/client (the client portal endpoint), through real Ollama
 * inference, timing and evaluating every response.
 *
 * No mocks, no Playwright, no browser. Direct HTTP calls with SSE stream parsing.
 *
 * Usage:
 *   node tests/remy-quality/harness/client-quality-runner.mjs
 *
 * Prerequisites:
 *   - Dev server running on port 3100
 *   - Ollama running with qwen3:30b loaded
 *   - Client test account seeded (.auth/seed-ids.json)
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { createClient } from '@supabase/supabase-js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const ROOT = path.resolve(__dirname, '../../..')

// ─── Configuration ─────────────────────────────────────────────────────────

const BASE_URL = 'http://localhost:3100'
const API_ENDPOINT = '/api/remy/client'
const PROJECT_REF = 'luefkpakzvxcsqroxyhz'
const RATE_LIMIT_DELAY_MS = 6500 // ~9/min to stay safely under 12/min client rate limit
const REQUEST_TIMEOUT_MS = 180_000 // 3 min (matches server timeout)
const PRE_WARM_TIMEOUT_MS = 60_000

// ─── Load Environment ──────────────────────────────────────────────────────

function loadEnv() {
  const envPath = path.join(ROOT, '.env.local')
  if (!fs.existsSync(envPath)) {
    console.error('ERROR: .env.local not found')
    process.exit(1)
  }
  const env = fs.readFileSync(envPath, 'utf8')
  const get = (k) => {
    const m = env.match(new RegExp(`^${k}=(.+)$`, 'm'))
    return m ? m[1].trim() : ''
  }
  return {
    supabaseUrl: get('NEXT_PUBLIC_SUPABASE_URL'),
    supabaseAnonKey: get('NEXT_PUBLIC_SUPABASE_ANON_KEY'),
  }
}

// ─── Load Client Credentials ───────────────────────────────────────────────

function loadClientCredentials() {
  const seedPath = path.join(ROOT, '.auth/seed-ids.json')
  if (fs.existsSync(seedPath)) {
    const seed = JSON.parse(fs.readFileSync(seedPath, 'utf8'))
    if (seed.clientEmail && seed.clientPassword) {
      return { email: seed.clientEmail, password: seed.clientPassword }
    }
  }
  // Fallback to hardcoded e2e client
  return {
    email: 'e2e.client.20260227@chefflow.test',
    password: 'E2eClientTest!2026',
  }
}

// ─── Authentication ────────────────────────────────────────────────────────

/** @type {{ supabaseUrl: string, supabaseAnonKey: string } | null} */
let _envCache = null
/** @type {{ email: string, password: string } | null} */
let _credsCache = null

async function authenticate() {
  if (!_envCache) _envCache = loadEnv()
  if (!_credsCache) _credsCache = loadClientCredentials()
  const { supabaseUrl, supabaseAnonKey } = _envCache
  const creds = _credsCache

  console.log(`Authenticating as client: ${creds.email}`)

  const sb = createClient(supabaseUrl, supabaseAnonKey)
  const { data, error } = await sb.auth.signInWithPassword({
    email: creds.email,
    password: creds.password,
  })

  if (error) {
    console.error(`Auth failed: ${error.message}`)
    process.exit(1)
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
  const cookie = `${cookieBaseName}=${encoded}`

  console.log('Client auth OK.\n')
  return cookie
}

/** How often to re-authenticate (every N prompts) to prevent mid-run session expiry */
const AUTH_REFRESH_INTERVAL = 25

// ─── SSE Stream Parser ─────────────────────────────────────────────────────

function parseSSEStream(rawText) {
  const events = []
  const lines = rawText.split('\n')
  let buffer = ''

  for (const line of lines) {
    if (line.startsWith('data: ')) {
      buffer = line.slice(6)
    } else if (line === '' && buffer) {
      try {
        events.push(JSON.parse(buffer))
      } catch {
        // Skip malformed JSON
      }
      buffer = ''
    } else if (buffer && line) {
      buffer += line
    }
  }
  // Handle last event if no trailing newline
  if (buffer) {
    try {
      events.push(JSON.parse(buffer))
    } catch {
      // Skip
    }
  }

  return events
}

// ─── Send Prompt ────────────────────────────────────────────────────────────

async function sendPrompt(cookie, message) {
  const timings = {
    requestStart: Date.now(),
    firstToken: null,
    totalMs: 0,
    tokenCount: 0,
  }

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)

  try {
    const res = await fetch(`${BASE_URL}${API_ENDPOINT}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: cookie,
      },
      body: JSON.stringify({
        message,
        history: [],
      }),
      signal: controller.signal,
      redirect: 'manual',
    })

    if (res.status !== 200) {
      clearTimeout(timeout)
      return {
        success: false,
        error: `HTTP ${res.status}`,
        response: '',
        events: [],
        timings,
      }
    }

    // Read stream
    const reader = res.body.getReader()
    const decoder = new TextDecoder()
    let rawText = ''
    let tokens = []

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      const chunk = decoder.decode(value, { stream: true })
      rawText += chunk

      // Parse events from this chunk for first-token timing
      const chunkEvents = parseSSEStream(chunk)
      for (const evt of chunkEvents) {
        if (evt.type === 'token' && !timings.firstToken) {
          timings.firstToken = Date.now() - timings.requestStart
        }
        if (evt.type === 'token') {
          timings.tokenCount++
          tokens.push(evt.data)
        }
      }
    }

    clearTimeout(timeout)
    timings.totalMs = Date.now() - timings.requestStart

    // Re-parse the full stream for complete results
    const allEvents = parseSSEStream(rawText)
    const allTokens = allEvents
      .filter((e) => e.type === 'token')
      .map((e) => e.data)
      .join('')
    const errors = allEvents.filter((e) => e.type === 'error')
    const doneEvent = allEvents.find((e) => e.type === 'done')

    // Recalculate token count from full parse
    timings.tokenCount = allEvents.filter((e) => e.type === 'token').length

    if (errors.length > 0 && !allTokens) {
      return {
        success: false,
        error: errors.map((e) => e.data).join('; '),
        response: '',
        events: allEvents,
        timings,
      }
    }

    return {
      success: true,
      response: allTokens,
      events: allEvents,
      timings,
      hasErrors: errors.length > 0,
      errorMessages: errors.map((e) => e.data),
    }
  } catch (err) {
    clearTimeout(timeout)
    timings.totalMs = Date.now() - timings.requestStart
    return {
      success: false,
      error: err.name === 'AbortError' ? 'Request timeout' : err.message,
      response: '',
      events: [],
      timings,
    }
  }
}

// ─── Evaluator ──────────────────────────────────────────────────────────────

function evaluateResponse(prompt, result, defaults) {
  const checks = []
  const response = result.response || ''
  const expected = { ...defaults, ...prompt.expected }

  // 1. Success check
  if (!result.success) {
    checks.push({ name: 'request_success', pass: false, detail: result.error })
    return { pass: false, checks, score: 0 }
  }

  // 2. Length checks
  const minLen = expected.minLength || defaults.minLength
  const maxLen = expected.maxLength || defaults.maxLength
  checks.push({
    name: 'min_length',
    pass: response.length >= minLen,
    detail: `${response.length} chars (min: ${minLen})`,
  })
  checks.push({
    name: 'max_length',
    pass: response.length <= maxLen,
    detail: `${response.length} chars (max: ${maxLen})`,
  })

  // 3. Timing check
  const maxMs = expected.timing?.totalMaxMs || defaults.timing.totalMaxMs
  checks.push({
    name: 'timing',
    pass: result.timings.totalMs <= maxMs,
    detail: `${result.timings.totalMs}ms (max: ${maxMs}ms)`,
  })

  // 4. mustContain — at least one of the keywords must appear (case-insensitive)
  if (prompt.expected.mustContain && prompt.expected.mustContain.length > 0) {
    const lower = response.toLowerCase()
    const found = prompt.expected.mustContain.filter((kw) =>
      lower.includes(kw.toLowerCase())
    )
    checks.push({
      name: 'must_contain',
      pass: found.length > 0,
      detail:
        found.length > 0
          ? `Found: ${found.join(', ')}`
          : `Missing all of: ${prompt.expected.mustContain.join(', ')}`,
    })
  }

  // 5. mustNotContain
  const banned = defaults.mustNotContain || []
  const foundBanned = banned.filter((kw) =>
    response.toLowerCase().includes(kw.toLowerCase())
  )
  checks.push({
    name: 'must_not_contain',
    pass: foundBanned.length === 0,
    detail:
      foundBanned.length === 0
        ? 'Clean'
        : `Found banned: ${foundBanned.join(', ')}`,
  })

  // 6. Forbidden phrases (tone check)
  const forbidden = defaults.forbiddenPhrases || []
  const foundForbidden = forbidden.filter((phrase) =>
    response.toLowerCase().includes(phrase.toLowerCase())
  )
  checks.push({
    name: 'tone_check',
    pass: foundForbidden.length === 0,
    detail:
      foundForbidden.length === 0
        ? 'Warm concierge tone'
        : `Robotic phrases: ${foundForbidden.join(', ')}`,
  })

  // 7. Privacy violation check — should never mention internal data
  const privacyTerms = [
    'tenant_id',
    'entity_id',
    'auth_user_id',
    'supabase',
    'migration',
    'ledger_entries',
    'event_transitions',
    'profit margin',
    'food cost %',
    'internal note',
  ]
  const foundPrivacy = privacyTerms.filter((term) =>
    response.toLowerCase().includes(term.toLowerCase())
  )
  checks.push({
    name: 'privacy',
    pass: foundPrivacy.length === 0,
    detail:
      foundPrivacy.length === 0
        ? 'No privacy leaks'
        : `PRIVACY VIOLATION: ${foundPrivacy.join(', ')}`,
    severity: foundPrivacy.length > 0 ? 'critical' : 'ok',
  })

  // 8. Check for thinking artifacts (qwen3 <think> tags leaking)
  const thinkingLeaked = response.includes('<think>') || response.includes('</think>')
  checks.push({
    name: 'no_thinking_leak',
    pass: !thinkingLeaked,
    detail: thinkingLeaked ? 'LEAKED <think> tags in response' : 'Clean',
  })

  // Score
  const passCount = checks.filter((c) => c.pass).length
  const score = Math.round((passCount / checks.length) * 100)
  const pass = checks.every((c) => c.pass)

  return { pass, checks, score }
}

// ─── Pre-warm Ollama ────────────────────────────────────────────────────────

async function prewarmOllama() {
  console.log('Pre-warming qwen3:30b (conversation model)...')
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), PRE_WARM_TIMEOUT_MS)
    await fetch('http://localhost:11434/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'qwen3:30b',
        prompt: 'Hello',
        options: { num_predict: 1 },
      }),
      signal: controller.signal,
    })
    clearTimeout(timeout)
    console.log('qwen3:30b ready.\n')
  } catch (err) {
    console.warn(`Pre-warm warning: ${err.message} (continuing anyway)\n`)
  }
}

// ─── Report Generator ───────────────────────────────────────────────────────

function generateMarkdownReport(results, startTime, endTime) {
  const totalMs = endTime - startTime
  const passCount = results.filter((r) => r.evaluation.pass).length
  const failCount = results.length - passCount
  const passRate = ((passCount / results.length) * 100).toFixed(1)

  // Timing stats
  const timings = results
    .filter((r) => r.result.success)
    .map((r) => r.result.timings)
  const totalTimes = timings.map((t) => t.totalMs)
  const firstTokenTimes = timings.filter((t) => t.firstToken).map((t) => t.firstToken)
  const tokenCounts = timings.map((t) => t.tokenCount)

  const avg = (arr) => arr.length ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length) : 0
  const median = (arr) => {
    if (!arr.length) return 0
    const sorted = [...arr].sort((a, b) => a - b)
    const mid = Math.floor(sorted.length / 2)
    return sorted.length % 2 ? sorted[mid] : Math.round((sorted[mid - 1] + sorted[mid]) / 2)
  }
  const p95 = (arr) => {
    if (!arr.length) return 0
    const sorted = [...arr].sort((a, b) => a - b)
    return sorted[Math.floor(sorted.length * 0.95)]
  }

  // Category breakdown
  const categories = {}
  for (const r of results) {
    const cat = r.prompt.category
    if (!categories[cat]) categories[cat] = { pass: 0, fail: 0, total: 0 }
    categories[cat].total++
    if (r.evaluation.pass) categories[cat].pass++
    else categories[cat].fail++
  }

  // Tokens per second
  const tokPerSec = timings.map(
    (t) => (t.tokenCount > 0 && t.totalMs > 0 ? t.tokenCount / (t.totalMs / 1000) : 0)
  )

  let md = `# Client Remy Quality Report

**Date:** ${new Date().toISOString().split('T')[0]}
**Endpoint:** \`${API_ENDPOINT}\`
**Model:** qwen3:30b (conversation)
**Prompts:** ${results.length}
**Total Runtime:** ${(totalMs / 1000 / 60).toFixed(1)} minutes

---

## Summary

| Metric | Value |
|--------|-------|
| **Pass Rate** | ${passRate}% (${passCount}/${results.length}) |
| **Failures** | ${failCount} |
| **Avg Response Time** | ${avg(totalTimes)}ms |
| **Median Response Time** | ${median(totalTimes)}ms |
| **P95 Response Time** | ${p95(totalTimes)}ms |
| **Avg First Token** | ${avg(firstTokenTimes)}ms |
| **Median First Token** | ${median(firstTokenTimes)}ms |
| **Avg Tokens/Response** | ${avg(tokenCounts)} |
| **Avg Tokens/sec** | ${avg(tokPerSec).toFixed(1)} |

---

## Category Breakdown

| Category | Pass | Fail | Rate |
|----------|------|------|------|
`

  for (const [cat, stats] of Object.entries(categories)) {
    const rate = ((stats.pass / stats.total) * 100).toFixed(0)
    md += `| ${cat} | ${stats.pass} | ${stats.fail} | ${rate}% |\n`
  }

  md += `
---

## Failures

`
  const failures = results.filter((r) => !r.evaluation.pass)
  if (failures.length === 0) {
    md += '_No failures._\n'
  } else {
    for (const f of failures) {
      const failedChecks = f.evaluation.checks.filter((c) => !c.pass)
      md += `### #${f.prompt.id}: ${f.prompt.message}\n`
      md += `**Category:** ${f.prompt.category}\n\n`
      md += `**Failed checks:**\n`
      for (const c of failedChecks) {
        md += `- ${c.name}: ${c.detail}\n`
      }
      md += `\n**Response:**\n\`\`\`\n${(f.result.response || f.result.error || 'No response').substring(0, 1500)}\n\`\`\`\n\n`
    }
  }

  md += `---

## All Responses

`

  for (const r of results) {
    const status = r.evaluation.pass ? 'PASS' : 'FAIL'
    const statusIcon = r.evaluation.pass ? '✓' : '✗'
    md += `### ${statusIcon} #${r.prompt.id} — ${r.prompt.category} [${status}]\n\n`
    md += `**Prompt:** "${r.prompt.message}"\n\n`
    md += `**Timing:** total=${r.result.timings.totalMs}ms | first-token=${r.result.timings.firstToken || 'N/A'}ms | tokens=${r.result.timings.tokenCount} | tok/s=${r.result.timings.totalMs > 0 ? (r.result.timings.tokenCount / (r.result.timings.totalMs / 1000)).toFixed(1) : 'N/A'}\n\n`
    md += `**Score:** ${r.evaluation.score}%\n\n`

    if (!r.result.success) {
      md += `**Error:** ${r.result.error}\n\n`
    } else {
      md += `**Response:**\n\`\`\`\n${r.result.response}\n\`\`\`\n\n`
    }

    // Show check details for failures
    if (!r.evaluation.pass) {
      md += `**Check Details:**\n`
      for (const c of r.evaluation.checks) {
        md += `- ${c.pass ? '✓' : '✗'} ${c.name}: ${c.detail}\n`
      }
      md += '\n'
    }

    md += '---\n\n'
  }

  return md
}

function generateBenchmarkJSON(results, startTime, endTime) {
  const timings = results
    .filter((r) => r.result.success)
    .map((r) => r.result.timings)

  return {
    meta: {
      timestamp: new Date().toISOString(),
      endpoint: API_ENDPOINT,
      model: 'qwen3:30b',
      role: 'client',
      totalPrompts: results.length,
      totalRuntimeMs: endTime - startTime,
    },
    summary: {
      passRate: results.filter((r) => r.evaluation.pass).length / results.length,
      passCount: results.filter((r) => r.evaluation.pass).length,
      failCount: results.filter((r) => !r.evaluation.pass).length,
      avgResponseMs: timings.length
        ? Math.round(timings.reduce((s, t) => s + t.totalMs, 0) / timings.length)
        : 0,
      avgFirstTokenMs: (() => {
        const fts = timings.filter((t) => t.firstToken).map((t) => t.firstToken)
        return fts.length ? Math.round(fts.reduce((s, v) => s + v, 0) / fts.length) : 0
      })(),
      avgTokenCount: timings.length
        ? Math.round(timings.reduce((s, t) => s + t.tokenCount, 0) / timings.length)
        : 0,
    },
    results: results.map((r) => ({
      id: r.prompt.id,
      category: r.prompt.category,
      message: r.prompt.message,
      pass: r.evaluation.pass,
      score: r.evaluation.score,
      checks: r.evaluation.checks,
      timing: r.result.timings,
      responseLength: (r.result.response || '').length,
      response: r.result.response || null,
      error: r.result.error || null,
    })),
  }
}

// ─── Main ───────────────────────────────────────────────────────────────────

async function main() {
  console.log('='.repeat(60))
  console.log('  CLIENT REMY QUALITY TEST SUITE')
  console.log('  Endpoint: /api/remy/client')
  console.log('  Model: qwen3:30b (conversation)')
  console.log('='.repeat(60))
  console.log()

  // Load prompts
  const promptsPath = path.join(__dirname, '../prompts/client-prompts.json')
  if (!fs.existsSync(promptsPath)) {
    console.error('ERROR: client-prompts.json not found')
    process.exit(1)
  }
  const promptData = JSON.parse(fs.readFileSync(promptsPath, 'utf8'))
  const prompts = promptData.prompts
  const defaults = promptData.defaults.expected

  console.log(`Loaded ${prompts.length} client prompts across ${promptData.meta.categories.length} categories\n`)

  // Authenticate
  let cookie = await authenticate()

  // Pre-warm Ollama
  await prewarmOllama()

  // Check dev server
  try {
    const health = await fetch(`${BASE_URL}/api/health`, { redirect: 'manual' })
    // Any response means the server is up
    console.log('Dev server is reachable.\n')
  } catch {
    console.error(`ERROR: Dev server not reachable at ${BASE_URL}`)
    console.error('Start the dev server with: npm run dev')
    process.exit(1)
  }

  // Run tests
  const results = []
  const startTime = Date.now()

  for (let i = 0; i < prompts.length; i++) {
    // Refresh auth token periodically to prevent mid-run session expiry
    if (i > 0 && i % AUTH_REFRESH_INTERVAL === 0) {
      console.log(`\n  Refreshing auth token (every ${AUTH_REFRESH_INTERVAL} prompts)...`)
      cookie = await authenticate()
    }

    const prompt = prompts[i]
    const progress = `[${i + 1}/${prompts.length}]`

    process.stdout.write(`${progress} #${prompt.id} (${prompt.category}): "${prompt.message.substring(0, 50)}..." `)

    const result = await sendPrompt(cookie, prompt.message)
    const evaluation = evaluateResponse(prompt, result, defaults)

    const status = evaluation.pass ? 'PASS' : 'FAIL'
    const timeStr = result.timings.totalMs > 0 ? `${result.timings.totalMs}ms` : 'N/A'
    const tokStr = result.timings.tokenCount || 0

    console.log(`${status} (${timeStr}, ${tokStr} tok, score=${evaluation.score}%)`)

    if (!evaluation.pass) {
      const failed = evaluation.checks.filter((c) => !c.pass)
      for (const f of failed) {
        console.log(`    ✗ ${f.name}: ${f.detail}`)
      }
    }

    results.push({ prompt, result, evaluation })

    // Rate limit delay (skip after last prompt)
    if (i < prompts.length - 1) {
      await new Promise((r) => setTimeout(r, RATE_LIMIT_DELAY_MS))
    }
  }

  const endTime = Date.now()

  // Generate outputs
  console.log('\n' + '='.repeat(60))
  console.log('  GENERATING REPORTS')
  console.log('='.repeat(60))

  // Ensure output directories exist
  const benchmarkDir = path.join(__dirname, '../benchmarks')
  const reportDir = path.join(__dirname, '../reports')
  fs.mkdirSync(benchmarkDir, { recursive: true })
  fs.mkdirSync(reportDir, { recursive: true })

  // Write benchmark JSON
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
  const benchmarkPath = path.join(benchmarkDir, `${timestamp}-client.json`)
  const benchmark = generateBenchmarkJSON(results, startTime, endTime)
  fs.writeFileSync(benchmarkPath, JSON.stringify(benchmark, null, 2))
  console.log(`Benchmark: ${benchmarkPath}`)

  // Write Markdown report
  const date = new Date().toISOString().split('T')[0]
  const reportPath = path.join(reportDir, `${date}-client-quality.md`)
  const report = generateMarkdownReport(results, startTime, endTime)
  fs.writeFileSync(reportPath, report)
  console.log(`Report: ${reportPath}`)

  // Print summary
  const passCount = results.filter((r) => r.evaluation.pass).length
  const failCount = results.length - passCount
  const passRate = ((passCount / results.length) * 100).toFixed(1)
  const totalMinutes = ((endTime - startTime) / 1000 / 60).toFixed(1)

  const timings = results.filter((r) => r.result.success).map((r) => r.result.timings)
  const avgMs = timings.length
    ? Math.round(timings.reduce((s, t) => s + t.totalMs, 0) / timings.length)
    : 0
  const avgFirstToken = (() => {
    const fts = timings.filter((t) => t.firstToken).map((t) => t.firstToken)
    return fts.length ? Math.round(fts.reduce((s, v) => s + v, 0) / fts.length) : 0
  })()

  console.log('\n' + '='.repeat(60))
  console.log('  CLIENT REMY QUALITY SUMMARY')
  console.log('='.repeat(60))
  console.log(`  Pass Rate:       ${passRate}% (${passCount}/${results.length})`)
  console.log(`  Failures:        ${failCount}`)
  console.log(`  Avg Response:    ${avgMs}ms`)
  console.log(`  Avg First Token: ${avgFirstToken}ms`)
  console.log(`  Total Runtime:   ${totalMinutes} minutes`)
  console.log('='.repeat(60))

  // Exit with error code if pass rate < 70%
  if (passCount / results.length < 0.7) {
    console.log('\nWARNING: Pass rate below 70% threshold')
    process.exit(1)
  }
}

main().catch((err) => {
  console.error('Fatal error:', err)
  process.exit(1)
})
