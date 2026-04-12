#!/usr/bin/env node

/**
 * Client Remy Edge Case Runner
 *
 * Tests graceful handling of unusual inputs: unicode, emoji-only,
 * very long messages, contradictions, ambiguous input, special chars,
 * SQL/XSS injection attempts, and more.
 *
 * 25 edge case prompts. Evaluation focuses on:
 * - Did it crash? (success/failure)
 * - Did it respond with something reasonable?
 * - No thinking leaks, no internal data leaks
 *
 * Usage:
 *   node tests/remy-quality/harness/client-edge-runner.mjs
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { createClient } from '../../../scripts/lib/db.mjs'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const ROOT = path.resolve(__dirname, '../../..')

const BASE_URL = 'http://localhost:3100'
const API_ENDPOINT = '/api/remy/client'
const PROJECT_REF = 'luefkpakzvxcsqroxyhz'
const RATE_LIMIT_DELAY_MS = 6500
const REQUEST_TIMEOUT_MS = 180_000

// ─── Shared helpers ──────────────────────────────────────────────────────────

function loadEnv() {
  const env = fs.readFileSync(path.join(ROOT, '.env.local'), 'utf8')
  const get = (k) => { const m = env.match(new RegExp(`^${k}=(.+)$`, 'm')); return m ? m[1].trim() : '' }
  return { dbUrl: get('NEXT_PUBLIC_DB_URL'), dbAnonKey: get('NEXT_PUBLIC_DB_ANON_KEY') }
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
  const { dbUrl, dbAnonKey } = loadEnv()
  const creds = loadClientCredentials()
  console.log(`Authenticating as client: ${creds.email}`)
  const sb = createClient(dbUrl, dbAnonKey)
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

async function sendPrompt(cookie, message) {
  const start = Date.now()
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)
  try {
    const res = await fetch(`${BASE_URL}${API_ENDPOINT}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: cookie },
      body: JSON.stringify({ message, history: [] }),
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
    const errors = events.filter(e => e.type === 'error')
    return { success: true, response, errors, ms: Date.now() - start, hasErrors: errors.length > 0 }
  } catch (err) {
    clearTimeout(timeout)
    return { success: false, error: err.name === 'AbortError' ? 'Timeout' : err.message, response: '', ms: Date.now() - start }
  }
}

// ─── Edge Case Evaluation ────────────────────────────────────────────────────

function evaluateEdge(prompt, result) {
  const checks = []
  const response = result.response || ''

  if (prompt.expectSuccess) {
    // Should succeed without crashing
    const gotSomething = result.success && (response.length > 0 || (result.errors && result.errors.length > 0))
    checks.push({
      name: 'no_crash',
      pass: result.success,
      detail: result.success ? 'Request completed without crash' : `Crashed: ${result.error}`,
    })

    // Should produce some response (even if short)
    if (result.success) {
      const hasContent = response.length > 0 || (result.hasErrors && result.errors?.some(e => typeof e.data === 'string' && e.data.length > 0))
      checks.push({
        name: 'produced_output',
        pass: hasContent,
        detail: hasContent ? `Response: ${response.length} chars` : 'No output at all',
      })
    }

    // No internal data leaks
    if (response.length > 0) {
      const internalTerms = ['tenant_id', 'entity_id', 'database', 'postgresql', 'node_modules', 'ECONNREFUSED']
      const found = internalTerms.filter(t => response.toLowerCase().includes(t))
      checks.push({
        name: 'no_internal_leak',
        pass: found.length === 0,
        detail: found.length === 0 ? 'Clean' : `LEAKED: ${found.join(', ')}`,
      })

      // No thinking leaks
      const thinkLeak = response.includes('<think>') || response.includes('</think>')
      checks.push({
        name: 'no_think_leak',
        pass: !thinkLeak,
        detail: thinkLeak ? 'LEAKED <think> tags' : 'Clean',
      })
    }
  }

  const passCount = checks.filter(c => c.pass).length
  return { pass: checks.every(c => c.pass), checks, score: checks.length > 0 ? Math.round((passCount / checks.length) * 100) : 100 }
}

// ─── Report ──────────────────────────────────────────────────────────────────

function generateReport(results, startTime, endTime) {
  const passCount = results.filter(r => r.evaluation.pass).length

  let md = `# Client Remy Edge Case Test Report

**Date:** ${((_d) => `${_d.getFullYear()}-${String(_d.getMonth() + 1).padStart(2, '0')}-${String(_d.getDate()).padStart(2, '0')}`)(new Date())}
**Prompts:** ${results.length} | **Pass:** ${passCount} | **Fail:** ${results.length - passCount}
**Pass Rate:** ${((passCount / results.length) * 100).toFixed(1)}%
**Runtime:** ${((endTime - startTime) / 1000 / 60).toFixed(1)} minutes

---

## Category Breakdown

| Category | Pass | Fail |
|----------|------|------|
`
  const cats = {}
  for (const r of results) {
    const c = r.prompt.category
    if (!cats[c]) cats[c] = { pass: 0, fail: 0 }
    if (r.evaluation.pass) cats[c].pass++; else cats[c].fail++
  }
  for (const [cat, s] of Object.entries(cats)) md += `| ${cat} | ${s.pass} | ${s.fail} |\n`

  md += `\n---\n\n## All Results\n\n`
  for (const r of results) {
    const icon = r.evaluation.pass ? '✓' : '✗'
    md += `### ${icon} ${r.prompt.id} — ${r.prompt.category}\n\n`
    md += `**Input:** \`${r.prompt.message.substring(0, 100)}${r.prompt.message.length > 100 ? '...' : ''}\`\n`
    md += `**Description:** ${r.prompt.description}\n`
    md += `**Time:** ${r.result.ms}ms | **Score:** ${r.evaluation.score}%\n\n`
    if (r.result.response) md += `**Response:**\n\`\`\`\n${r.result.response}\n\`\`\`\n\n`
    else if (r.result.error) md += `**Error:** ${r.result.error}\n\n`
    else if (r.result.errors?.length) md += `**Guardrail:** ${r.result.errors.map(e => e.data).join('; ')}\n\n`
    if (!r.evaluation.pass) {
      for (const c of r.evaluation.checks.filter(c => !c.pass)) md += `- ✗ ${c.name}: ${c.detail}\n`
      md += '\n'
    }
    md += '---\n\n'
  }
  return md
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
  console.log('='.repeat(60))
  console.log('  CLIENT REMY EDGE CASE TEST SUITE')
  console.log('='.repeat(60) + '\n')

  const dataPath = path.join(__dirname, '../prompts/client-edge-cases.json')
  const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'))
  const prompts = data.prompts
  console.log(`Loaded ${prompts.length} edge case prompts\n`)

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

  const results = []
  const startTime = Date.now()

  for (let i = 0; i < prompts.length; i++) {
    const prompt = prompts[i]
    process.stdout.write(`[${i + 1}/${prompts.length}] ${prompt.id} (${prompt.category}): `)

    const result = await sendPrompt(cookie, prompt.message)
    const evaluation = evaluateEdge(prompt, result)

    console.log(`${evaluation.pass ? 'PASS' : 'FAIL'} (${result.ms}ms, score=${evaluation.score}%)`)
    if (!evaluation.pass) {
      for (const c of evaluation.checks.filter(c => !c.pass)) console.log(`    ✗ ${c.name}: ${c.detail}`)
    }

    results.push({ prompt, result, evaluation })
    if (i < prompts.length - 1) await new Promise(r => setTimeout(r, RATE_LIMIT_DELAY_MS))
  }

  const endTime = Date.now()

  const reportDir = path.join(__dirname, '../reports')
  const benchmarkDir = path.join(__dirname, '../benchmarks')
  fs.mkdirSync(reportDir, { recursive: true })
  fs.mkdirSync(benchmarkDir, { recursive: true })

  const _d = new Date()
  const date = `${_d.getFullYear()}-${String(_d.getMonth() + 1).padStart(2, '0')}-${String(_d.getDate()).padStart(2, '0')}`
  fs.writeFileSync(path.join(reportDir, `${date}-client-edge-cases.md`), generateReport(results, startTime, endTime))

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
  fs.writeFileSync(path.join(benchmarkDir, `${timestamp}-client-edge-cases.json`), JSON.stringify({
    meta: { timestamp: new Date().toISOString(), suite: 'client-edge-cases', total: results.length },
    summary: { pass: results.filter(r => r.evaluation.pass).length, fail: results.filter(r => !r.evaluation.pass).length },
    results: results.map(r => ({ id: r.prompt.id, category: r.prompt.category, pass: r.evaluation.pass, score: r.evaluation.score, ms: r.result.ms, response: r.result.response || null })),
  }, null, 2))

  const passCount = results.filter(r => r.evaluation.pass).length
  console.log(`\n${'='.repeat(60)}`)
  console.log(`  Pass: ${passCount}/${results.length} (${((passCount / results.length) * 100).toFixed(1)}%)`)
  console.log('='.repeat(60))
}

main().catch(err => { console.error('Fatal:', err); process.exit(1) })
