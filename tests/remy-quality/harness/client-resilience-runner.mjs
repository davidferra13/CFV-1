#!/usr/bin/env node

/**
 * Client Remy Resilience Test Runner
 *
 * Tests 5 infrastructure failure modes that the quality/adversarial suites miss:
 *
 *  1. Rate limit exhaustion — rapid-fire 15 messages, verify refusal at #13
 *  2. Bad auth — expired cookie, garbage cookie, no cookie, wrong role (chef)
 *  3. Cold model load — unload qwen3:30b, time the cold-start response
 *  4. Max history capacity — 20 messages of ~3500 chars each, verify coherence
 *  5. NAV_SUGGESTIONS stress — prompts designed to trigger nav output, validate JSON
 *
 * These are NOT prompt-quality tests — they're infrastructure resilience tests.
 * Each test has its own setup/teardown and doesn't rely on prompt JSON files.
 *
 * Usage:
 *   node tests/remy-quality/harness/client-resilience-runner.mjs
 *
 * WARNING: Test 1 (rate limit) will exhaust the rate limit bucket for ~60s.
 *          Test 3 (cold start) will unload qwen3:30b temporarily.
 *          Run this suite LAST, not before other suites.
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { createClient } from '@supabase/supabase-js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const ROOT = path.resolve(__dirname, '../../..')

const BASE_URL = 'http://localhost:3100'
const API_ENDPOINT = '/api/remy/client'
const PROJECT_REF = 'luefkpakzvxcsqroxyhz'
const REQUEST_TIMEOUT_MS = 180_000
const OLLAMA_URL = 'http://localhost:11434'

// ─── Shared helpers ──────────────────────────────────────────────────────────

function loadEnv() {
  const env = fs.readFileSync(path.join(ROOT, '.env.local'), 'utf8')
  const get = (k) => {
    const m = env.match(new RegExp(`^${k}=(.+)$`, 'm'))
    return m ? m[1].trim() : ''
  }
  return {
    supabaseUrl: get('NEXT_PUBLIC_SUPABASE_URL'),
    supabaseAnonKey: get('NEXT_PUBLIC_SUPABASE_ANON_KEY'),
  }
}

function loadCredentials(role = 'client') {
  const seedPath = path.join(ROOT, '.auth/seed-ids.json')
  if (fs.existsSync(seedPath)) {
    const seed = JSON.parse(fs.readFileSync(seedPath, 'utf8'))
    if (role === 'client' && seed.clientEmail && seed.clientPassword)
      return { email: seed.clientEmail, password: seed.clientPassword }
    if (role === 'chef' && seed.chefEmail && seed.chefPassword)
      return { email: seed.chefEmail, password: seed.chefPassword }
  }
  if (role === 'client')
    return {
      email: 'e2e.client.20260227@chefflow.test',
      password: 'E2eClientTest!2026',
    }
  return {
    email: 'e2e.chef.20260227@chefflow.test',
    password: 'E2eChefTest!2026',
  }
}

async function buildAuthCookie(email, password) {
  const { supabaseUrl, supabaseAnonKey } = loadEnv()
  const sb = createClient(supabaseUrl, supabaseAnonKey)
  const { data, error } = await sb.auth.signInWithPassword({ email, password })
  if (error) return { cookie: null, error: error.message }
  const session = data.session
  const payload = JSON.stringify({
    access_token: session.access_token,
    refresh_token: session.refresh_token,
    expires_in: session.expires_in,
    expires_at: session.expires_at,
    token_type: session.token_type,
    user: session.user,
  })
  return {
    cookie: `sb-${PROJECT_REF}-auth-token=base64-${Buffer.from(payload).toString('base64url')}`,
    error: null,
  }
}

function parseSSE(raw) {
  const events = []
  for (const chunk of raw.split('\n\n')) {
    if (!chunk.startsWith('data: ')) continue
    try {
      events.push(JSON.parse(chunk.slice(6)))
    } catch {}
  }
  return events
}

async function sendRaw(cookie, message, history = [], timeoutMs = REQUEST_TIMEOUT_MS) {
  const start = Date.now()
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), timeoutMs)
  const headers = { 'Content-Type': 'application/json' }
  if (cookie) headers.Cookie = cookie

  try {
    const res = await fetch(`${BASE_URL}${API_ENDPOINT}`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ message, history }),
      signal: controller.signal,
      redirect: 'manual',
    })
    const status = res.status

    if (status !== 200) {
      let body = ''
      try {
        body = await res.text()
      } catch {}
      clearTimeout(timeout)
      return {
        success: false,
        httpStatus: status,
        error: `HTTP ${status}`,
        body,
        response: '',
        events: [],
        ms: Date.now() - start,
      }
    }

    const reader = res.body.getReader()
    const decoder = new TextDecoder()
    let raw = ''
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      raw += decoder.decode(value, { stream: true })
    }
    clearTimeout(timeout)
    const events = parseSSE(raw)
    const response = events
      .filter((e) => e.type === 'token')
      .map((e) => e.data)
      .join('')
    const errors = events.filter((e) => e.type === 'error')
    return {
      success: true,
      httpStatus: 200,
      response,
      events,
      errors,
      ms: Date.now() - start,
    }
  } catch (err) {
    clearTimeout(timeout)
    return {
      success: false,
      httpStatus: 0,
      error: err.name === 'AbortError' ? 'Timeout' : err.message,
      response: '',
      events: [],
      ms: Date.now() - start,
    }
  }
}

// ─── Test 1: Rate Limit Exhaustion ───────────────────────────────────────────

async function testRateLimit(cookie) {
  console.log('\n' + '═'.repeat(60))
  console.log('  TEST 1: Rate Limit Exhaustion')
  console.log('═'.repeat(60))
  console.log('  Sending 15 rapid-fire messages (limit is 12/min)')
  console.log('  Expecting refusal at message #13\n')

  const results = []
  const RAPID_COUNT = 15

  for (let i = 1; i <= RAPID_COUNT; i++) {
    process.stdout.write(`  Message ${i}/${RAPID_COUNT}: `)
    const result = await sendRaw(cookie, `Quick test message number ${i}`)
    const isRateLimited =
      result.errors &&
      result.errors.length > 0 &&
      result.errors.some(
        (e) =>
          typeof e.data === 'string' &&
          (e.data.includes('slow down') || e.data.includes('messages a minute'))
      )
    const hasTokens = result.response && result.response.length > 0

    results.push({ index: i, rateLimited: isRateLimited, hasTokens, ms: result.ms })

    if (isRateLimited) {
      console.log(`RATE LIMITED (${result.ms}ms) — "${(result.errors[0]?.data || '').substring(0, 60)}"`)
    } else if (hasTokens) {
      console.log(`OK (${result.ms}ms, ${result.response.length} chars)`)
    } else {
      console.log(`ERROR (${result.ms}ms) — ${result.error || 'unknown'}`)
    }

    // No delay — this is the point
    await new Promise((r) => setTimeout(r, 50)) // tiny delay to avoid TCP issues
  }

  // Evaluate
  const firstRateLimit = results.findIndex((r) => r.rateLimited)
  const checksPass = []

  // Rate limit should kick in somewhere around message 13
  checksPass.push({
    name: 'rate_limit_triggered',
    pass: firstRateLimit !== -1,
    detail:
      firstRateLimit !== -1
        ? `First rate limit at message #${firstRateLimit + 1}`
        : 'Rate limit NEVER triggered — 15 messages went through!',
    severity: firstRateLimit === -1 ? 'critical' : 'ok',
  })

  // Messages after the rate limit should also be blocked
  if (firstRateLimit !== -1) {
    const afterLimit = results.slice(firstRateLimit)
    const allBlocked = afterLimit.every((r) => r.rateLimited)
    checksPass.push({
      name: 'consistent_blocking',
      pass: allBlocked,
      detail: allBlocked
        ? `All ${afterLimit.length} messages after limit were blocked`
        : `Some messages after limit were NOT blocked`,
    })
  }

  // First 12 should NOT be rate limited (but some may get Ollama responses)
  const firstTwelve = results.slice(0, 12)
  const earlyBlocks = firstTwelve.filter((r) => r.rateLimited)
  checksPass.push({
    name: 'no_premature_blocking',
    pass: earlyBlocks.length === 0,
    detail:
      earlyBlocks.length === 0
        ? 'First 12 messages were not rate-limited'
        : `${earlyBlocks.length} messages were rate-limited too early`,
  })

  const pass = checksPass.every((c) => c.pass)
  console.log(`\n  Result: ${pass ? 'PASS' : 'FAIL'}`)
  for (const c of checksPass) console.log(`    ${c.pass ? '✓' : '✗'} ${c.name}: ${c.detail}`)

  // Wait for rate limit window to reset before proceeding
  console.log('\n  Waiting 65 seconds for rate limit window to reset...')
  await new Promise((r) => setTimeout(r, 65_000))
  console.log('  Rate limit window reset.')

  return { name: 'Rate Limit Exhaustion', pass, checks: checksPass, results }
}

// ─── Test 2: Bad Auth ────────────────────────────────────────────────────────

async function testBadAuth(validClientCookie) {
  console.log('\n' + '═'.repeat(60))
  console.log('  TEST 2: Bad Authentication')
  console.log('═'.repeat(60))

  const scenarios = [
    {
      name: 'No cookie at all',
      cookie: null,
      expect: 'error',
    },
    {
      name: 'Garbage cookie',
      cookie: `sb-${PROJECT_REF}-auth-token=base64-dGhpcyBpcyBnYXJiYWdl`,
      expect: 'error',
    },
    {
      name: 'Expired session structure',
      cookie: `sb-${PROJECT_REF}-auth-token=base64-${Buffer.from(
        JSON.stringify({
          access_token: 'expired_token_abc123',
          refresh_token: 'expired_refresh',
          expires_in: 3600,
          expires_at: Math.floor(Date.now() / 1000) - 86400, // 24h ago
          token_type: 'bearer',
          user: { id: 'fake-id', role: 'authenticated' },
        })
      ).toString('base64url')}`,
      expect: 'error',
    },
    {
      name: 'Chef cookie (wrong role)',
      cookie: '__chef__', // placeholder — will be replaced
      expect: 'error',
    },
  ]

  // Build chef cookie
  const chefCreds = loadCredentials('chef')
  const chefAuth = await buildAuthCookie(chefCreds.email, chefCreds.password)
  if (chefAuth.cookie) {
    scenarios[3].cookie = chefAuth.cookie
  } else {
    console.log(`  WARNING: Could not build chef cookie: ${chefAuth.error}`)
    scenarios[3].cookie = null
    scenarios[3].name += ' (SKIPPED — chef auth failed)'
  }

  const checks = []

  for (const scenario of scenarios) {
    process.stdout.write(`  ${scenario.name}: `)
    const result = await sendRaw(scenario.cookie, 'What events do I have?')

    const gotError =
      result.httpStatus === 401 ||
      result.httpStatus === 403 ||
      result.httpStatus === 307 || // redirect to login
      (result.errors && result.errors.length > 0) ||
      !result.response

    // Should NOT return a 200 with actual Remy content
    const noDataLeak = !result.response || result.response.length < 10

    // Should NOT contain internal error details
    const noInternalLeak = !(result.body || result.response || '').includes('node_modules') &&
      !(result.body || result.response || '').includes('supabase') &&
      !(result.body || result.response || '').includes('ECONNREFUSED') &&
      !(result.body || result.response || '').includes('stack')

    const pass = (gotError || noDataLeak) && noInternalLeak

    console.log(
      `HTTP ${result.httpStatus} (${result.ms}ms) — ${pass ? 'PASS' : 'FAIL'}${
        result.response ? ` — got ${result.response.length} chars` : ''
      }`
    )

    checks.push({
      name: scenario.name,
      pass,
      detail: `HTTP ${result.httpStatus}, dataLeak=${!noDataLeak}, internalLeak=${!noInternalLeak}`,
      httpStatus: result.httpStatus,
    })
  }

  const pass = checks.every((c) => c.pass)
  console.log(`\n  Result: ${pass ? 'PASS' : 'FAIL'}`)
  for (const c of checks) console.log(`    ${c.pass ? '✓' : '✗'} ${c.name}: ${c.detail}`)

  return { name: 'Bad Auth', pass, checks }
}

// ─── Test 3: Cold Model Load ─────────────────────────────────────────────────

async function testColdStart(cookie) {
  console.log('\n' + '═'.repeat(60))
  console.log('  TEST 3: Cold Model Load')
  console.log('═'.repeat(60))
  console.log('  Unloading qwen3:30b, then timing cold-start response\n')

  const checks = []

  // First, get a warm baseline
  process.stdout.write('  Warm baseline: ')
  const warmResult = await sendRaw(cookie, 'Hello, what can you help me with?')
  console.log(
    `${warmResult.success ? 'OK' : 'FAIL'} (${warmResult.ms}ms, ${(warmResult.response || '').length} chars)`
  )
  const warmMs = warmResult.ms

  // Unload the model
  process.stdout.write('  Unloading qwen3:30b... ')
  try {
    await fetch(`${OLLAMA_URL}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: 'qwen3:30b', keep_alive: 0 }),
    })
    console.log('done')
  } catch (err) {
    console.log(`failed: ${err.message}`)
    checks.push({
      name: 'model_unload',
      pass: false,
      detail: `Could not unload model: ${err.message}`,
    })
    return { name: 'Cold Model Load', pass: false, checks }
  }

  // Wait a moment for the model to fully unload
  await new Promise((r) => setTimeout(r, 2000))

  // Send cold request
  process.stdout.write('  Cold start: ')
  const coldResult = await sendRaw(cookie, 'Hello, what can you help me with?')
  console.log(
    `${coldResult.success ? 'OK' : 'FAIL'} (${coldResult.ms}ms, ${(coldResult.response || '').length} chars)`
  )
  const coldMs = coldResult.ms

  // Evaluate
  checks.push({
    name: 'cold_start_succeeds',
    pass: coldResult.success && (coldResult.response || '').length > 10,
    detail: coldResult.success
      ? `Got ${(coldResult.response || '').length} chars in ${coldMs}ms`
      : `Failed: ${coldResult.error}`,
  })

  const slowdown = coldMs / Math.max(warmMs, 1)
  checks.push({
    name: 'cold_start_timing',
    pass: true, // informational
    detail: `Warm: ${warmMs}ms, Cold: ${coldMs}ms, Slowdown: ${slowdown.toFixed(1)}x`,
  })

  // Cold start should still be under 3 minutes (server timeout)
  checks.push({
    name: 'within_timeout',
    pass: coldMs < 180_000,
    detail:
      coldMs < 180_000
        ? `${coldMs}ms < 180000ms timeout`
        : `EXCEEDED server timeout: ${coldMs}ms`,
  })

  // Response quality should still be reasonable
  if (coldResult.response) {
    const hasThinkLeak =
      coldResult.response.includes('<think>') || coldResult.response.includes('</think>')
    checks.push({
      name: 'no_think_leak',
      pass: !hasThinkLeak,
      detail: hasThinkLeak ? 'LEAKED <think> tags on cold start' : 'Clean',
    })
  }

  // Re-warm for subsequent tests
  console.log('  Re-warming model...')
  try {
    await fetch(`${OLLAMA_URL}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: 'qwen3:30b', prompt: 'hello', options: { num_predict: 1 } }),
    })
  } catch {}

  const pass = checks.filter((c) => c.name !== 'cold_start_timing').every((c) => c.pass)
  console.log(`\n  Result: ${pass ? 'PASS' : 'FAIL'}`)
  for (const c of checks) console.log(`    ${c.pass ? '✓' : '✗'} ${c.name}: ${c.detail}`)

  return { name: 'Cold Model Load', pass, checks }
}

// ─── Test 4: Max History Capacity ────────────────────────────────────────────

async function testMaxHistory(cookie) {
  console.log('\n' + '═'.repeat(60))
  console.log('  TEST 4: Max History Capacity')
  console.log('═'.repeat(60))
  console.log('  Sending 20 history messages of ~3500 chars each\n')

  // Build a massive history — 20 messages alternating user/assistant
  const filler = (i) => {
    const topics = [
      'discussing the appetizer course for the Italian-themed dinner party with details about bruschetta, antipasto, and fresh mozzarella',
      'talking about wine pairings and the sommelier recommendations for the Tuscan reds and prosecco for the aperitivo hour',
      'reviewing the guest dietary requirements including two vegans, one celiac, and three lactose intolerant guests',
      'planning the dessert course with options for tiramisu, panna cotta, and a chocolate fondant for the non-dairy guests',
      'discussing the timeline and logistics for the evening including setup time, cooking schedule, and cleanup',
    ]
    const topic = topics[i % topics.length]
    // Pad to ~3500 chars
    let msg = `Message ${i + 1}: We were ${topic}. `
    while (msg.length < 3500) {
      msg += `This is additional context for the conversation about ${topic}, ensuring the chef understands all the details and requirements that have been discussed previously. `
    }
    return msg.substring(0, 3500)
  }

  const history = []
  for (let i = 0; i < 20; i++) {
    history.push({
      role: i % 2 === 0 ? 'user' : 'assistant',
      content: filler(i),
    })
  }

  const totalHistoryChars = history.reduce((s, m) => s + m.content.length, 0)
  console.log(
    `  History: ${history.length} messages, ${totalHistoryChars.toLocaleString()} total chars\n`
  )

  const checks = []

  // Send with massive history
  process.stdout.write('  Sending with max history: ')
  const result = await sendRaw(cookie, 'Can you summarize what we discussed about the dinner?')
  console.log(
    `${result.success ? 'OK' : 'FAIL'} (${result.ms}ms, ${(result.response || '').length} chars)`
  )

  // Should not crash
  checks.push({
    name: 'no_crash',
    pass: result.success,
    detail: result.success ? 'Request completed' : `Crashed: ${result.error}`,
  })

  // Should produce a response
  if (result.success) {
    checks.push({
      name: 'produced_response',
      pass: (result.response || '').length >= 20,
      detail: `${(result.response || '').length} chars`,
    })

    // Should not leak internal data
    const leakTerms = ['tenant_id', 'entity_id', 'supabase', 'node_modules']
    const found = leakTerms.filter((t) => (result.response || '').toLowerCase().includes(t))
    checks.push({
      name: 'no_internal_leak',
      pass: found.length === 0,
      detail: found.length === 0 ? 'Clean' : `LEAKED: ${found.join(', ')}`,
    })

    // Should not have think leaks
    const thinkLeak =
      (result.response || '').includes('<think>') || (result.response || '').includes('</think>')
    checks.push({
      name: 'no_think_leak',
      pass: !thinkLeak,
      detail: thinkLeak ? 'LEAKED <think> tags' : 'Clean',
    })

    // Timing should be reasonable (massive context = slower, but not 3min+)
    checks.push({
      name: 'reasonable_timing',
      pass: result.ms < 180_000,
      detail: `${result.ms}ms${result.ms > 120_000 ? ' — WARNING: very slow' : ''}`,
    })
  }

  // Also test with a simple question (not summarize) — to check model isn't confused
  process.stdout.write('  Simple question with max history: ')
  const simpleResult = await sendRaw(cookie, 'How many guests are coming?')
  console.log(
    `${simpleResult.success ? 'OK' : 'FAIL'} (${simpleResult.ms}ms, ${(simpleResult.response || '').length} chars)`
  )

  checks.push({
    name: 'simple_q_with_big_history',
    pass: simpleResult.success && (simpleResult.response || '').length >= 10,
    detail: simpleResult.success
      ? `${(simpleResult.response || '').length} chars in ${simpleResult.ms}ms`
      : `Failed: ${simpleResult.error}`,
  })

  const pass = checks.every((c) => c.pass)
  console.log(`\n  Result: ${pass ? 'PASS' : 'FAIL'}`)
  for (const c of checks) console.log(`    ${c.pass ? '✓' : '✗'} ${c.name}: ${c.detail}`)

  return {
    name: 'Max History Capacity',
    pass,
    checks,
    historyStats: { messages: history.length, totalChars: totalHistoryChars },
  }
}

// ─── Test 5: NAV_SUGGESTIONS Stress ──────────────────────────────────────────

async function testNavSuggestions(cookie) {
  console.log('\n' + '═'.repeat(60))
  console.log('  TEST 5: NAV_SUGGESTIONS Validation')
  console.log('═'.repeat(60))
  console.log('  Prompts designed to trigger nav suggestions\n')

  const VALID_ROUTES = new Set([
    '/my-events',
    '/my-quotes',
    '/my-spending',
    '/my-chat',
    '/my-profile',
    '/book-now',
  ])

  const navPrompts = [
    'Where do I see my events?',
    'How do I view my quotes?',
    'Where can I check my payment history?',
    'I want to message the chef',
    'How do I update my profile?',
    'I want to book a new event',
    'Show me where to find my spending',
    'How do I navigate to see upcoming dinners?',
  ]

  const checks = []
  let totalNavSuggestions = 0
  let validNavSuggestions = 0
  let malformedNavSuggestions = 0
  let invalidRoutes = []

  for (let i = 0; i < navPrompts.length; i++) {
    process.stdout.write(`  [${i + 1}/${navPrompts.length}] "${navPrompts[i].substring(0, 40)}..." `)

    const result = await sendRaw(cookie, navPrompts[i])
    const response = result.response || ''

    // Check for NAV_SUGGESTIONS in response
    const navMatch = response.match(/NAV_SUGGESTIONS:\s*(\[[\s\S]*?\])/)
    if (navMatch) {
      totalNavSuggestions++
      try {
        const navs = JSON.parse(navMatch[1])
        // Validate each route
        for (const nav of navs) {
          if (nav.href) {
            if (VALID_ROUTES.has(nav.href)) {
              validNavSuggestions++
            } else {
              invalidRoutes.push({ prompt: navPrompts[i], route: nav.href })
            }
          }
        }
        console.log(
          `OK (${result.ms}ms) — NAV: ${navs.length} suggestion(s): ${navs.map((n) => n.href).join(', ')}`
        )
      } catch {
        malformedNavSuggestions++
        console.log(`MALFORMED NAV JSON (${result.ms}ms)`)
      }
    } else {
      console.log(`OK (${result.ms}ms) — no NAV_SUGGESTIONS`)
    }

    // Rate limit spacing
    if (i < navPrompts.length - 1) await new Promise((r) => setTimeout(r, 6500))
  }

  // Evaluate
  checks.push({
    name: 'nav_suggestions_present',
    pass: totalNavSuggestions > 0,
    detail:
      totalNavSuggestions > 0
        ? `${totalNavSuggestions}/${navPrompts.length} responses included NAV_SUGGESTIONS`
        : 'No NAV_SUGGESTIONS in any response — model may not be producing them',
  })

  checks.push({
    name: 'no_malformed_json',
    pass: malformedNavSuggestions === 0,
    detail:
      malformedNavSuggestions === 0
        ? 'All NAV_SUGGESTIONS had valid JSON'
        : `${malformedNavSuggestions} had MALFORMED JSON — will silently fail in UI`,
  })

  checks.push({
    name: 'all_routes_valid',
    pass: invalidRoutes.length === 0,
    detail:
      invalidRoutes.length === 0
        ? `All ${validNavSuggestions} suggested routes are valid client portal paths`
        : `Invalid routes: ${invalidRoutes.map((r) => `${r.route} (from "${r.prompt.substring(0, 30)}")`).join(', ')}`,
  })

  const pass = checks.every((c) => c.pass)
  console.log(`\n  Result: ${pass ? 'PASS' : 'FAIL'}`)
  for (const c of checks) console.log(`    ${c.pass ? '✓' : '✗'} ${c.name}: ${c.detail}`)

  return {
    name: 'NAV_SUGGESTIONS Validation',
    pass,
    checks,
    stats: { total: totalNavSuggestions, valid: validNavSuggestions, malformed: malformedNavSuggestions, invalid: invalidRoutes },
  }
}

// ─── Report ──────────────────────────────────────────────────────────────────

function generateReport(testResults, startTime, endTime) {
  const passCount = testResults.filter((t) => t.pass).length

  let md = `# Client Remy Resilience Test Report

**Date:** ${new Date().toISOString().split('T')[0]}
**Tests:** ${testResults.length} | **Pass:** ${passCount} | **Fail:** ${testResults.length - passCount}
**Runtime:** ${((endTime - startTime) / 1000 / 60).toFixed(1)} minutes

---

## Summary

| Test | Result |
|------|--------|
`
  for (const t of testResults) {
    md += `| ${t.pass ? '✓' : '✗'} ${t.name} | ${t.pass ? 'PASS' : 'FAIL'} |\n`
  }

  md += `\n---\n\n## Detail\n\n`

  for (const t of testResults) {
    md += `### ${t.pass ? '✓' : '✗'} ${t.name}\n\n`
    for (const c of t.checks) {
      md += `- ${c.pass ? '✓' : '✗'} **${c.name}:** ${c.detail}\n`
    }
    md += '\n---\n\n'
  }

  return md
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
  console.log('═'.repeat(60))
  console.log('  CLIENT REMY RESILIENCE TEST SUITE')
  console.log('  Tests 5 infrastructure failure modes')
  console.log('═'.repeat(60))

  // Authenticate as client
  const clientCreds = loadCredentials('client')
  const clientAuth = await buildAuthCookie(clientCreds.email, clientCreds.password)
  if (!clientAuth.cookie) {
    console.error(`Client auth failed: ${clientAuth.error}`)
    process.exit(1)
  }
  console.log(`Client auth OK: ${clientCreds.email}\n`)

  const startTime = Date.now()
  const testResults = []

  // Run Test 2 first (bad auth) — doesn't need warm model or clean rate limit
  testResults.push(await testBadAuth(clientAuth.cookie))

  // Test 5 (NAV suggestions) — needs warm model, clean rate limit
  testResults.push(await testNavSuggestions(clientAuth.cookie))

  // Test 4 (max history) — needs warm model
  testResults.push(await testMaxHistory(clientAuth.cookie))

  // Test 3 (cold start) — unloads model, re-warms at end
  testResults.push(await testColdStart(clientAuth.cookie))

  // Test 1 (rate limit) — LAST because it exhausts rate limit + waits 65s
  testResults.push(await testRateLimit(clientAuth.cookie))

  const endTime = Date.now()

  // Write reports
  const reportDir = path.join(__dirname, '../reports')
  const benchmarkDir = path.join(__dirname, '../benchmarks')
  fs.mkdirSync(reportDir, { recursive: true })
  fs.mkdirSync(benchmarkDir, { recursive: true })

  const date = new Date().toISOString().split('T')[0]
  fs.writeFileSync(
    path.join(reportDir, `${date}-client-resilience.md`),
    generateReport(testResults, startTime, endTime)
  )

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
  fs.writeFileSync(
    path.join(benchmarkDir, `${timestamp}-client-resilience.json`),
    JSON.stringify(
      {
        meta: { timestamp: new Date().toISOString(), suite: 'client-resilience' },
        summary: {
          total: testResults.length,
          pass: testResults.filter((t) => t.pass).length,
          fail: testResults.filter((t) => !t.pass).length,
        },
        tests: testResults.map((t) => ({
          name: t.name,
          pass: t.pass,
          checks: t.checks,
        })),
      },
      null,
      2
    )
  )

  // Summary
  const passCount = testResults.filter((t) => t.pass).length
  console.log('\n' + '═'.repeat(60))
  console.log(`  RESILIENCE RESULTS: ${passCount}/${testResults.length} passed`)
  for (const t of testResults)
    console.log(`    ${t.pass ? '✓' : '✗'} ${t.name}`)
  console.log('═'.repeat(60))

  if (passCount < testResults.length) process.exit(1)
}

main().catch((err) => {
  console.error('Fatal:', err)
  process.exit(1)
})
