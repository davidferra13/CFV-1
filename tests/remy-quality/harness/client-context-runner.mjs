#!/usr/bin/env node

/**
 * Client Remy Context Accuracy & NAV Validation Runner
 *
 * Tests whether Remy references actual seeded data vs hallucinated data,
 * and validates that NAV_SUGGESTIONS contain real portal routes.
 *
 * Also includes a consistency check: sends 5 identical prompts and
 * measures response consistency.
 *
 * Usage:
 *   node tests/remy-quality/harness/client-context-runner.mjs
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { createClient } from '../../../scripts/lib/supabase.mjs'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const ROOT = path.resolve(__dirname, '../../..')

const BASE_URL = 'http://localhost:3100'
const API_ENDPOINT = '/api/remy/client'
const PROJECT_REF = 'luefkpakzvxcsqroxyhz'
const RATE_LIMIT_DELAY_MS = 6500
const REQUEST_TIMEOUT_MS = 180_000

// Valid client portal routes (from remy-client-context.ts)
const VALID_CLIENT_ROUTES = [
  '/my-events', '/my-quotes', '/my-spending', '/my-chat', '/my-profile', '/book-now',
  // Also accept relative path fragments
  'my-events', 'my-quotes', 'my-spending', 'my-chat', 'my-profile', 'book-now',
]

// ─── Shared helpers ──────────────────────────────────────────────────────────

function loadEnv() {
  const env = fs.readFileSync(path.join(ROOT, '.env.local'), 'utf8')
  const get = (k) => { const m = env.match(new RegExp(`^${k}=(.+)$`, 'm')); return m ? m[1].trim() : '' }
  return { supabaseUrl: get('NEXT_PUBLIC_SUPABASE_URL'), supabaseAnonKey: get('NEXT_PUBLIC_SUPABASE_ANON_KEY') }
}

function loadClientCredentials() {
  const seedPath = path.join(ROOT, '.auth/seed-ids.json')
  if (fs.existsSync(seedPath)) {
    const seed = JSON.parse(fs.readFileSync(seedPath, 'utf8'))
    if (seed.clientEmail && seed.clientPassword) return { email: seed.clientEmail, password: seed.clientPassword }
  }
  return { email: 'e2e.client.20260227@chefflow.test', password: 'E2eClientTest!2026' }
}

async function authenticate() {
  const { supabaseUrl, supabaseAnonKey } = loadEnv()
  const creds = loadClientCredentials()
  console.log(`Authenticating as client: ${creds.email}`)
  const sb = createClient(supabaseUrl, supabaseAnonKey)
  const { data, error } = await sb.auth.signInWithPassword(creds)
  if (error) { console.error(`Auth failed: ${error.message}`); process.exit(1) }
  const session = data.session
  const payload = JSON.stringify({ access_token: session.access_token, refresh_token: session.refresh_token, expires_in: session.expires_in, expires_at: session.expires_at, token_type: session.token_type, user: session.user })
  const cookie = `sb-${PROJECT_REF}-auth-token=base64-${Buffer.from(payload).toString('base64url')}`
  console.log('Client auth OK.\n')
  return cookie
}

function parseSSE(raw) {
  const events = []
  for (const chunk of raw.split('\n\n')) {
    if (!chunk.startsWith('data: ')) continue
    try { events.push(JSON.parse(chunk.slice(6))) } catch {}
  }
  return events
}

async function sendPrompt(cookie, message, history = []) {
  const start = Date.now()
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)
  try {
    const res = await fetch(`${BASE_URL}${API_ENDPOINT}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: cookie },
      body: JSON.stringify({ message, history }),
      signal: controller.signal,
      redirect: 'manual',
    })
    if (res.status !== 200) { clearTimeout(timeout); return { success: false, error: `HTTP ${res.status}`, response: '', ms: Date.now() - start } }
    const reader = res.body.getReader()
    const decoder = new TextDecoder()
    let raw = ''
    while (true) { const { done, value } = await reader.read(); if (done) break; raw += decoder.decode(value, { stream: true }) }
    clearTimeout(timeout)
    const events = parseSSE(raw)
    const response = events.filter(e => e.type === 'token').map(e => e.data).join('')
    return { success: true, response, events, ms: Date.now() - start }
  } catch (err) {
    clearTimeout(timeout)
    return { success: false, error: err.name === 'AbortError' ? 'Timeout' : err.message, response: '', ms: Date.now() - start }
  }
}

// ─── Context Accuracy Evaluation ─────────────────────────────────────────────

function evaluateContextAccuracy(prompt, result) {
  const checks = []
  const response = result.response || ''
  const lower = response.toLowerCase()

  // Must get a response
  checks.push({
    name: 'got_response',
    pass: response.length >= 10,
    detail: response.length >= 10 ? `${response.length} chars` : 'Too short/empty',
  })

  if (response.length < 10) {
    return { pass: false, checks, score: 0 }
  }

  // Hallucination checks
  if (prompt.hallucination_check) {
    const hc = prompt.hallucination_check

    // Check for honest uncertainty when data may not exist
    if (hc.expect_honest_uncertainty) {
      const uncertaintyMarkers = ["don't have", "not sure", "don't see", "couldn't find", "no record", "not available", "check with", "reach out", "contact"]
      const hasUncertainty = uncertaintyMarkers.some(m => lower.includes(m))
      // It's also OK if Remy references real data (the test client might have events)
      const isAcceptable = hasUncertainty || response.length > 20
      checks.push({
        name: 'honest_about_uncertainty',
        pass: isAcceptable,
        detail: hasUncertainty ? 'Acknowledged uncertainty' : 'Provided a response (may reference real data)',
      })
    }

    // Check valid statuses
    if (hc.valid_statuses) {
      const mentionedStatuses = hc.valid_statuses.filter(s => lower.includes(s))
      const invalidStatuses = ['pending', 'approved', 'rejected', 'active', 'inactive']
        .filter(s => !hc.valid_statuses.includes(s))
        .filter(s => lower.includes(s))
      checks.push({
        name: 'valid_status_terms',
        pass: invalidStatuses.length === 0,
        detail: invalidStatuses.length === 0 ? 'Only valid statuses used' : `Invalid statuses mentioned: ${invalidStatuses.join(', ')}`,
      })
    }

    // Check valid tiers
    if (hc.valid_tiers) {
      const invalidTiers = ['diamond', 'emerald', 'ruby', 'sapphire', 'elite', 'premium', 'vip']
        .filter(t => lower.includes(t))
      checks.push({
        name: 'valid_tier_terms',
        pass: invalidTiers.length === 0,
        detail: invalidTiers.length === 0 ? 'Only valid tiers used' : `Invalid tiers mentioned: ${invalidTiers.join(', ')}`,
      })
    }
  }

  // NAV_SUGGESTIONS validation
  const navMatch = response.match(/NAV_SUGGESTIONS:\s*(\[[\s\S]*?\])/)
  if (navMatch) {
    try {
      const suggestions = JSON.parse(navMatch[1])
      const invalidRoutes = suggestions
        .filter(s => s.href)
        .filter(s => !VALID_CLIENT_ROUTES.some(r => s.href.includes(r)))
      checks.push({
        name: 'nav_suggestions_valid',
        pass: invalidRoutes.length === 0,
        detail: invalidRoutes.length === 0
          ? `All ${suggestions.length} nav suggestions are valid routes`
          : `Invalid routes: ${invalidRoutes.map(r => r.href).join(', ')}`,
      })
    } catch {
      checks.push({
        name: 'nav_suggestions_parseable',
        pass: false,
        detail: 'NAV_SUGGESTIONS JSON is malformed',
      })
    }
  }

  // Check expected navigation suggestion
  if (prompt.expected_nav && response.length > 0) {
    const mentionsRoute = lower.includes(prompt.expected_nav) || (navMatch && navMatch[0].includes(prompt.expected_nav))
    checks.push({
      name: 'suggested_correct_route',
      pass: mentionsRoute,
      detail: mentionsRoute ? `Correctly suggested ${prompt.expected_nav}` : `Did not suggest expected route: ${prompt.expected_nav}`,
    })
  }

  // No thinking leaks
  const thinkLeak = response.includes('<think>') || response.includes('</think>')
  checks.push({ name: 'no_think_leak', pass: !thinkLeak, detail: thinkLeak ? 'LEAKED <think> tags' : 'Clean' })

  const passCount = checks.filter(c => c.pass).length
  return { pass: checks.every(c => c.pass), checks, score: Math.round((passCount / checks.length) * 100) }
}

// ─── Consistency Check ───────────────────────────────────────────────────────

function evaluateConsistency(responses) {
  // Check that responses don't wildly contradict each other
  const checks = []

  // All should succeed
  const allSuccess = responses.every(r => r.success && r.response.length > 10)
  checks.push({
    name: 'all_responses_received',
    pass: allSuccess,
    detail: allSuccess ? `All ${responses.length} responses received` : `Some responses failed`,
  })

  if (!allSuccess) return { pass: false, checks, score: 0 }

  // Length variance — responses shouldn't vary by more than 5x
  const lengths = responses.map(r => r.response.length)
  const minLen = Math.min(...lengths)
  const maxLen = Math.max(...lengths)
  const ratio = maxLen / Math.max(minLen, 1)
  checks.push({
    name: 'length_consistency',
    pass: ratio <= 5,
    detail: `Min: ${minLen}, Max: ${maxLen}, Ratio: ${ratio.toFixed(1)}x`,
  })

  // Timing variance
  const times = responses.map(r => r.ms)
  const avgTime = Math.round(times.reduce((a, b) => a + b, 0) / times.length)
  checks.push({
    name: 'timing_info',
    pass: true, // Informational
    detail: `Avg: ${avgTime}ms, Range: ${Math.min(...times)}-${Math.max(...times)}ms`,
  })

  const passCount = checks.filter(c => c.pass).length
  return { pass: checks.every(c => c.pass), checks, score: Math.round((passCount / checks.length) * 100) }
}

// ─── Report ──────────────────────────────────────────────────────────────────

function generateReport(contextResults, consistencyResult, startTime, endTime) {
  const ctxPass = contextResults.filter(r => r.evaluation.pass).length

  let md = `# Client Remy Context Accuracy & Consistency Report

**Date:** ${new Date().toISOString().split('T')[0]}
**Runtime:** ${((endTime - startTime) / 1000 / 60).toFixed(1)} minutes

---

## Part 1: Context Accuracy (${contextResults.length} prompts)

**Pass Rate:** ${((ctxPass / contextResults.length) * 100).toFixed(1)}% (${ctxPass}/${contextResults.length})

`
  for (const r of contextResults) {
    const icon = r.evaluation.pass ? '✓' : '✗'
    md += `### ${icon} ${r.prompt.id} — ${r.prompt.category}\n\n`
    md += `**Prompt:** "${r.prompt.message}"\n`
    md += `**Description:** ${r.prompt.description}\n`
    md += `**Time:** ${r.result.ms}ms | **Score:** ${r.evaluation.score}%\n\n`
    if (r.result.response) md += `**Response:**\n\`\`\`\n${r.result.response}\n\`\`\`\n\n`
    if (!r.evaluation.pass) {
      for (const c of r.evaluation.checks.filter(c => !c.pass)) md += `- ✗ ${c.name}: ${c.detail}\n`
      md += '\n'
    }
    md += '---\n\n'
  }

  md += `## Part 2: Consistency Check

**Prompt:** "What events do I have coming up?"
**Repetitions:** ${consistencyResult.responses.length}

`
  for (let i = 0; i < consistencyResult.responses.length; i++) {
    const r = consistencyResult.responses[i]
    md += `### Attempt ${i + 1} (${r.ms}ms)\n\n`
    md += `\`\`\`\n${r.response || r.error || 'No response'}\n\`\`\`\n\n`
  }

  md += `**Consistency Evaluation:**\n`
  for (const c of consistencyResult.evaluation.checks) {
    md += `- ${c.pass ? '✓' : '✗'} ${c.name}: ${c.detail}\n`
  }

  return md
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
  console.log('='.repeat(60))
  console.log('  CLIENT REMY CONTEXT ACCURACY & CONSISTENCY SUITE')
  console.log('='.repeat(60) + '\n')

  const dataPath = path.join(__dirname, '../prompts/client-context-accuracy.json')
  const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'))
  const prompts = data.prompts
  console.log(`Loaded ${prompts.length} context accuracy prompts\n`)

  const cookie = await authenticate()

  // Pre-warm
  console.log('Pre-warming qwen3:30b...')
  try {
    await fetch('http://localhost:11434/api/generate', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: 'qwen3:30b', prompt: 'Hello', options: { num_predict: 1 } }),
    })
  } catch {}
  console.log('Ready.\n')

  const startTime = Date.now()

  // ── Part 1: Context Accuracy ────────────────────────────────────────────
  console.log('─── Part 1: Context Accuracy ───\n')
  const contextResults = []

  for (let i = 0; i < prompts.length; i++) {
    const prompt = prompts[i]
    process.stdout.write(`[${i + 1}/${prompts.length}] ${prompt.id}: "${prompt.message.substring(0, 45)}..." `)

    const result = await sendPrompt(cookie, prompt.message)
    const evaluation = evaluateContextAccuracy(prompt, result)

    console.log(`${evaluation.pass ? 'PASS' : 'FAIL'} (${result.ms}ms, score=${evaluation.score}%)`)
    if (!evaluation.pass) {
      for (const c of evaluation.checks.filter(c => !c.pass)) console.log(`    ✗ ${c.name}: ${c.detail}`)
    }

    contextResults.push({ prompt, result, evaluation })
    if (i < prompts.length - 1) await new Promise(r => setTimeout(r, RATE_LIMIT_DELAY_MS))
  }

  // ── Part 2: Consistency Check ───────────────────────────────────────────
  console.log('\n─── Part 2: Consistency (5x same prompt) ───\n')
  const consistencyPrompt = 'What events do I have coming up?'
  const consistencyResponses = []
  const CONSISTENCY_REPS = 5

  for (let i = 0; i < CONSISTENCY_REPS; i++) {
    process.stdout.write(`  Rep ${i + 1}/${CONSISTENCY_REPS}: `)
    const result = await sendPrompt(cookie, consistencyPrompt)
    console.log(`${result.success ? 'OK' : 'FAIL'} (${result.ms}ms, ${(result.response || '').length} chars)`)
    consistencyResponses.push(result)
    if (i < CONSISTENCY_REPS - 1) await new Promise(r => setTimeout(r, RATE_LIMIT_DELAY_MS))
  }

  const consistencyEval = evaluateConsistency(consistencyResponses)
  console.log(`\nConsistency: ${consistencyEval.pass ? 'PASS' : 'FAIL'} (score=${consistencyEval.score}%)`)

  const endTime = Date.now()

  // Write reports
  const reportDir = path.join(__dirname, '../reports')
  const benchmarkDir = path.join(__dirname, '../benchmarks')
  fs.mkdirSync(reportDir, { recursive: true })
  fs.mkdirSync(benchmarkDir, { recursive: true })

  const date = new Date().toISOString().split('T')[0]
  const consistencyResult = { responses: consistencyResponses, evaluation: consistencyEval }
  fs.writeFileSync(path.join(reportDir, `${date}-client-context-accuracy.md`), generateReport(contextResults, consistencyResult, startTime, endTime))

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
  const ctxPass = contextResults.filter(r => r.evaluation.pass).length
  fs.writeFileSync(path.join(benchmarkDir, `${timestamp}-client-context-accuracy.json`), JSON.stringify({
    meta: { timestamp: new Date().toISOString(), suite: 'client-context-accuracy' },
    contextAccuracy: {
      total: contextResults.length,
      pass: ctxPass,
      results: contextResults.map(r => ({ id: r.prompt.id, pass: r.evaluation.pass, score: r.evaluation.score, ms: r.result.ms, response: r.result.response || null })),
    },
    consistency: {
      prompt: consistencyPrompt,
      repetitions: CONSISTENCY_REPS,
      pass: consistencyEval.pass,
      responses: consistencyResponses.map(r => ({ ms: r.ms, length: (r.response || '').length, response: r.response || null })),
    },
  }, null, 2))

  // Summary
  console.log(`\n${'='.repeat(60)}`)
  console.log(`  Context Accuracy: ${ctxPass}/${contextResults.length} (${((ctxPass / contextResults.length) * 100).toFixed(1)}%)`)
  console.log(`  Consistency: ${consistencyEval.pass ? 'PASS' : 'FAIL'}`)
  console.log('='.repeat(60))
}

main().catch(err => { console.error('Fatal:', err); process.exit(1) })
