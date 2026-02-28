#!/usr/bin/env node

/**
 * Client Remy Multi-Turn Conversation Runner
 *
 * Tests context retention across conversation turns. Sends chained messages
 * with history, verifying that Remy remembers details from earlier turns.
 *
 * 10 scenarios with 3-5 turns each.
 *
 * Usage:
 *   node tests/remy-quality/harness/client-multiturn-runner.mjs
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
const RATE_LIMIT_DELAY_MS = 6500
const REQUEST_TIMEOUT_MS = 180_000

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

async function sendPrompt(cookie, message, history) {
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
    const errors = events.filter(e => e.type === 'error')
    return { success: true, response, errors, ms: Date.now() - start }
  } catch (err) {
    clearTimeout(timeout)
    return { success: false, error: err.name === 'AbortError' ? 'Timeout' : err.message, response: '', ms: Date.now() - start }
  }
}

// ─── Multi-Turn Evaluation ───────────────────────────────────────────────────

function evaluateTurn(turn, result) {
  const checks = []
  const response = result.response || ''
  const lower = response.toLowerCase()

  // Must get a response
  checks.push({
    name: 'got_response',
    pass: response.length >= 10,
    detail: response.length >= 10 ? `${response.length} chars` : 'Response too short or empty',
  })

  // Check expected keywords
  if (turn.expectedKeywords) {
    const found = turn.expectedKeywords.filter(kw => lower.includes(kw.toLowerCase()))
    checks.push({
      name: 'expected_keywords',
      pass: found.length > 0,
      detail: found.length > 0 ? `Found: ${found.join(', ')}` : `Missing all of: ${turn.expectedKeywords.join(', ')}`,
    })
  }

  // Check context retention — must reference earlier turn details
  if (turn.mustReferTo) {
    const found = turn.mustReferTo.filter(ref => lower.includes(ref.toLowerCase()))
    const ratio = found.length / turn.mustReferTo.length
    checks.push({
      name: 'context_retention',
      pass: ratio >= 0.3, // At least 30% of context references found
      detail: found.length > 0
        ? `Referenced ${found.length}/${turn.mustReferTo.length}: ${found.join(', ')}`
        : `Lost context — none of: ${turn.mustReferTo.join(', ')}`,
    })
  }

  // No thinking leaks
  const thinkLeak = response.includes('<think>') || response.includes('</think>')
  checks.push({ name: 'no_think_leak', pass: !thinkLeak, detail: thinkLeak ? 'LEAKED <think> tags' : 'Clean' })

  const passCount = checks.filter(c => c.pass).length
  return { pass: checks.every(c => c.pass), checks, score: Math.round((passCount / checks.length) * 100) }
}

// ─── Report ──────────────────────────────────────────────────────────────────

function generateReport(scenarioResults, startTime, endTime) {
  const totalTurns = scenarioResults.reduce((s, sr) => s + sr.turns.length, 0)
  const passedTurns = scenarioResults.reduce((s, sr) => s + sr.turns.filter(t => t.evaluation.pass).length, 0)
  const passedScenarios = scenarioResults.filter(sr => sr.turns.every(t => t.evaluation.pass)).length

  let md = `# Client Remy Multi-Turn Test Report

**Date:** ${new Date().toISOString().split('T')[0]}
**Scenarios:** ${scenarioResults.length} | **Total Turns:** ${totalTurns}
**Scenarios Passed:** ${passedScenarios}/${scenarioResults.length}
**Turns Passed:** ${passedTurns}/${totalTurns} (${((passedTurns/totalTurns)*100).toFixed(1)}%)
**Runtime:** ${((endTime - startTime) / 1000 / 60).toFixed(1)} minutes

---

## Scenario Summary

| Scenario | Turns | Passed | Result |
|----------|-------|--------|--------|
`
  for (const sr of scenarioResults) {
    const tp = sr.turns.filter(t => t.evaluation.pass).length
    const icon = tp === sr.turns.length ? '✓' : '✗'
    md += `| ${icon} ${sr.scenario.name} | ${sr.turns.length} | ${tp}/${sr.turns.length} | ${tp === sr.turns.length ? 'PASS' : 'FAIL'} |\n`
  }

  md += `\n---\n\n## Full Conversations\n\n`

  for (const sr of scenarioResults) {
    md += `### ${sr.scenario.name}\n\n`
    md += `_${sr.scenario.description}_\n\n`

    for (let i = 0; i < sr.turns.length; i++) {
      const t = sr.turns[i]
      const icon = t.evaluation.pass ? '✓' : '✗'
      md += `**Turn ${i + 1} ${icon}** (${t.result.ms}ms, score=${t.evaluation.score}%)\n\n`
      md += `> **Client:** "${t.turn.message}"\n\n`
      md += `**Remy:**\n\`\`\`\n${t.result.response || t.result.error || 'No response'}\n\`\`\`\n\n`

      if (!t.evaluation.pass) {
        md += `**Failed checks:**\n`
        for (const c of t.evaluation.checks.filter(c => !c.pass))
          md += `- ✗ ${c.name}: ${c.detail}\n`
        md += '\n'
      }
    }
    md += '---\n\n'
  }

  return md
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
  console.log('='.repeat(60))
  console.log('  CLIENT REMY MULTI-TURN TEST SUITE')
  console.log('='.repeat(60) + '\n')

  const dataPath = path.join(__dirname, '../prompts/client-multiturn.json')
  const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'))
  const scenarios = data.scenarios
  console.log(`Loaded ${scenarios.length} multi-turn scenarios\n`)

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

  const scenarioResults = []
  const startTime = Date.now()

  for (let s = 0; s < scenarios.length; s++) {
    const scenario = scenarios[s]
    console.log(`\n${'─'.repeat(50)}`)
    console.log(`Scenario ${s + 1}/${scenarios.length}: ${scenario.name}`)
    console.log('─'.repeat(50))

    const history = []
    const turnResults = []

    for (let t = 0; t < scenario.turns.length; t++) {
      const turn = scenario.turns[t]
      process.stdout.write(`  Turn ${t + 1}/${scenario.turns.length}: "${turn.message.substring(0, 50)}..." `)

      const result = await sendPrompt(cookie, turn.message, history)
      const evaluation = evaluateTurn(turn, result)

      console.log(`${evaluation.pass ? 'PASS' : 'FAIL'} (${result.ms}ms, score=${evaluation.score}%)`)
      if (!evaluation.pass) {
        for (const c of evaluation.checks.filter(c => !c.pass))
          console.log(`      ✗ ${c.name}: ${c.detail}`)
      }

      // Build history for next turn
      history.push({ role: 'user', content: turn.message })
      if (result.response) history.push({ role: 'assistant', content: result.response })

      turnResults.push({ turn, result, evaluation })

      if (t < scenario.turns.length - 1) await new Promise(r => setTimeout(r, RATE_LIMIT_DELAY_MS))
    }

    scenarioResults.push({ scenario, turns: turnResults })

    // Delay between scenarios
    if (s < scenarios.length - 1) await new Promise(r => setTimeout(r, RATE_LIMIT_DELAY_MS))
  }

  const endTime = Date.now()

  // Write reports
  const reportDir = path.join(__dirname, '../reports')
  const benchmarkDir = path.join(__dirname, '../benchmarks')
  fs.mkdirSync(reportDir, { recursive: true })
  fs.mkdirSync(benchmarkDir, { recursive: true })

  const date = new Date().toISOString().split('T')[0]
  fs.writeFileSync(path.join(reportDir, `${date}-client-multiturn.md`), generateReport(scenarioResults, startTime, endTime))

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
  const totalTurns = scenarioResults.reduce((s, sr) => s + sr.turns.length, 0)
  const passedTurns = scenarioResults.reduce((s, sr) => s + sr.turns.filter(t => t.evaluation.pass).length, 0)
  fs.writeFileSync(path.join(benchmarkDir, `${timestamp}-client-multiturn.json`), JSON.stringify({
    meta: { timestamp: new Date().toISOString(), suite: 'client-multiturn', totalScenarios: scenarios.length, totalTurns },
    summary: { scenariosPassed: scenarioResults.filter(sr => sr.turns.every(t => t.evaluation.pass)).length, turnsPassed: passedTurns, totalTurns },
    scenarios: scenarioResults.map(sr => ({
      id: sr.scenario.id, name: sr.scenario.name,
      allPassed: sr.turns.every(t => t.evaluation.pass),
      turns: sr.turns.map(t => ({ message: t.turn.message, pass: t.evaluation.pass, score: t.evaluation.score, ms: t.result.ms, response: t.result.response || null })),
    })),
  }, null, 2))

  // Summary
  const passedScenarios = scenarioResults.filter(sr => sr.turns.every(t => t.evaluation.pass)).length
  console.log(`\n${'='.repeat(60)}`)
  console.log(`  Scenarios: ${passedScenarios}/${scenarios.length} passed`)
  console.log(`  Turns: ${passedTurns}/${totalTurns} passed (${((passedTurns/totalTurns)*100).toFixed(1)}%)`)
  console.log('='.repeat(60))
}

main().catch(err => { console.error('Fatal:', err); process.exit(1) })
