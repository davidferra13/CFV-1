#!/usr/bin/env node

/**
 * Remy AI Response Quality Test Runner
 *
 * Sends real prompts through the full Remy pipeline (auth → guardrails → Ollama → SSE),
 * times every response, evaluates correctness, and generates benchmark reports.
 *
 * Usage:
 *   node tests/remy-quality/harness/remy-quality-runner.mjs --suite chef
 *   node tests/remy-quality/harness/remy-quality-runner.mjs --suite chef --category business_overview
 *   node tests/remy-quality/harness/remy-quality-runner.mjs --suite chef --prompt chef-001
 *
 * Prerequisites:
 *   - Dev server running on port 3100
 *   - Ollama running with qwen3:4b + qwen3-coder:30b loaded
 *   - Agent test account exists
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { createClient } from '@supabase/supabase-js'
import { parseSSEStream } from './sse-parser.mjs'
import { evaluateResponse } from './evaluator.mjs'
import { generateReports, printSummary } from './report-generator.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..', '..', '..')

// ─── CLI Argument Parsing ─────────────────────────────────────────────────────

function parseArgs() {
  const args = process.argv.slice(2)
  const opts = {
    suite: 'chef',
    category: null,
    promptId: null,
    repeat: 1,
  }

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--suite':
        opts.suite = args[++i]
        break
      case '--category':
        opts.category = args[++i]
        break
      case '--prompt':
        opts.promptId = args[++i]
        break
      case '--repeat':
        opts.repeat = parseInt(args[++i], 10) || 1
        break
      case '--help':
        console.log(`
Remy Quality Test Runner

Usage:
  node remy-quality-runner.mjs --suite <suite> [options]

Options:
  --suite <name>       Test suite: chef, client, adversarial, multi-turn,
                       hallucination, voice-messy (default: chef)
  --category <name>    Run only prompts in this category
  --prompt <id>        Run a single prompt by ID (e.g. chef-001)
  --repeat <n>         Run each prompt N times for consistency testing (default: 1)
  --help               Show this help
`)
        process.exit(0)
    }
  }
  return opts
}

// ─── Environment & Auth ───────────────────────────────────────────────────────

function loadEnv() {
  const envPath = path.join(ROOT, '.env.local')
  if (!fs.existsSync(envPath)) {
    console.error('ERROR: .env.local not found at', envPath)
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

async function authenticate(env) {
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

// ─── Prerequisite Checks ──────────────────────────────────────────────────────

async function checkDevServer() {
  try {
    const res = await fetch('http://localhost:3100', { redirect: 'manual' })
    // Any response (even redirect) means the server is running
    return true
  } catch {
    return false
  }
}

async function checkOllama() {
  try {
    const res = await fetch('http://localhost:11434/api/tags')
    const data = await res.json()
    const modelNames = (data.models || []).map((m) => m.name)
    return {
      running: true,
      models: modelNames,
      hasFast: modelNames.some((n) => n.includes('qwen3:4b')),
      hasStandard: modelNames.some((n) => n.includes('qwen3-coder') || n.includes('qwen3:30b')),
    }
  } catch {
    return { running: false, models: [], hasFast: false, hasStandard: false }
  }
}

async function prewarmModel(modelName) {
  try {
    await fetch('http://localhost:11434/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: modelName, prompt: 'hello', options: { num_predict: 1 } }),
    })
    return true
  } catch {
    return false
  }
}

// ─── Prompt Loading ───────────────────────────────────────────────────────────

function loadPrompts(suite, category, promptId) {
  const promptsDir = path.join(__dirname, '..', 'prompts')
  const filePath = path.join(promptsDir, `${suite}-prompts.json`)

  if (!fs.existsSync(filePath)) {
    console.error(`ERROR: Prompt file not found: ${filePath}`)
    process.exit(1)
  }

  const data = JSON.parse(fs.readFileSync(filePath, 'utf8'))
  let prompts = data.prompts

  if (promptId) {
    prompts = prompts.filter((p) => p.id === promptId)
    if (prompts.length === 0) {
      console.error(`ERROR: Prompt ID "${promptId}" not found in ${suite} suite`)
      process.exit(1)
    }
  } else if (category) {
    prompts = prompts.filter((p) => p.category === category)
    if (prompts.length === 0) {
      console.error(`ERROR: Category "${category}" not found in ${suite} suite`)
      process.exit(1)
    }
  }

  return { prompts, defaults: data.defaults, endpoint: data.endpoint }
}

// ─── Send a Single Prompt ─────────────────────────────────────────────────────

async function sendPrompt(prompt, defaults, endpoint, cookie) {
  // Merge prompt-specific context with defaults
  const context = { ...defaults.context, ...(prompt.context || {}) }

  const body = {
    message: prompt.prompt,
    currentPage: context.currentPage || '/dashboard',
    recentPages: context.recentPages || [],
    recentActions: context.recentActions || [],
    recentErrors: context.recentErrors || [],
    sessionMinutes: context.sessionMinutes ?? 5,
    activeForm: context.activeForm || null,
    history: context.history || [],
  }

  const startMs = Date.now()

  const res = await fetch(`http://localhost:3100${endpoint}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: cookie },
    body: JSON.stringify(body),
    redirect: 'manual',
  })

  if (res.status !== 200) {
    const elapsed = Date.now() - startMs
    return {
      httpError: true,
      status: res.status,
      timing: {
        firstEventMs: null,
        intentEventMs: null,
        firstTokenMs: null,
        totalMs: elapsed,
        tokenCount: 0,
        approxTokens: 0,
        tokensPerSec: 0,
      },
      intent: null,
      tokens: '',
      tasks: [],
      navSuggestions: [],
      memoryItems: [],
      errors: [`HTTP ${res.status}`],
      events: [],
    }
  }

  return parseSSEStream(res, startMs)
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const opts = parseArgs()

  console.log('')
  console.log('╔═══════════════════════════════════════════════════════════╗')
  console.log('║        REMY AI RESPONSE QUALITY TEST RUNNER              ║')
  console.log('╚═══════════════════════════════════════════════════════════╝')
  console.log('')

  // 1. Check prerequisites
  console.log('Checking prerequisites...')

  const serverOk = await checkDevServer()
  if (!serverOk) {
    console.error('ERROR: Dev server not running on port 3100. Start it first.')
    process.exit(1)
  }
  console.log('  ✓ Dev server running on port 3100')

  const ollama = await checkOllama()
  if (!ollama.running) {
    console.error('ERROR: Ollama not running. Start Ollama first.')
    process.exit(1)
  }
  console.log(`  ✓ Ollama running (${ollama.models.length} models loaded)`)

  if (!ollama.hasFast) {
    console.warn('  ⚠ qwen3:4b not loaded — classification may use a different model')
  }
  if (!ollama.hasStandard) {
    console.warn('  ⚠ qwen3-coder:30b not loaded — responses may use a different model')
  }

  // 2. Authenticate
  console.log('  Authenticating as agent...')
  const env = loadEnv()
  const cookie = await authenticate(env)
  console.log('  ✓ Authenticated')

  // 3. Pre-warm models
  console.log('  Pre-warming models...')
  if (ollama.hasFast) {
    await prewarmModel('qwen3:4b')
    console.log('    ✓ qwen3:4b warm')
  }
  console.log('')

  // 4. Probe: verify Remy is enabled before running the suite
  console.log('  Checking Remy is enabled...')
  try {
    const probeRes = await fetch(`http://localhost:3100/api/remy/stream`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: cookie },
      body: JSON.stringify({ message: 'ping', currentPage: '/dashboard', recentPages: [], recentActions: [], recentErrors: [], sessionMinutes: 1, activeForm: null, history: [] }),
      redirect: 'manual',
    })
    const probeBody = await probeRes.text()
    if (probeBody.includes('Remy is currently disabled') || probeBody.includes('Complete AI onboarding')) {
      console.error('\n❌ ABORT: Remy is disabled for the agent test account.')
      console.error('   Fix: Sign in as the agent, go to Settings > Remy Control Center, and complete AI onboarding.')
      console.error('   All tests would return 0% — skipping to save time.\n')
      process.exit(1)
    }
    if (probeRes.status === 307) {
      console.error('\n❌ ABORT: Auth session was redirected (HTTP 307). Cookie may be invalid.')
      process.exit(1)
    }
    console.log('  ✓ Remy is enabled')
  } catch (err) {
    console.warn(`  ⚠ Remy probe failed: ${err.message} — continuing anyway`)
  }

  // 5. Load prompts
  const { prompts, defaults, endpoint } = loadPrompts(opts.suite, opts.category, opts.promptId)

  // Build run list — expand prompts × repeat count
  const runList = []
  for (const prompt of prompts) {
    for (let r = 0; r < opts.repeat; r++) {
      runList.push({
        ...prompt,
        id: opts.repeat > 1 ? `${prompt.id}_run${r + 1}` : prompt.id,
        _originalId: prompt.id,
        _runNumber: r + 1,
      })
    }
  }

  const totalRuns = runList.length
  console.log(`Suite: ${opts.suite} | Prompts: ${prompts.length}${opts.repeat > 1 ? ` × ${opts.repeat} repeats = ${totalRuns} total runs` : ''}`)
  if (opts.category) console.log(`Category filter: ${opts.category}`)
  if (opts.promptId) console.log(`Single prompt: ${opts.promptId}`)
  if (opts.repeat > 1) console.log(`Consistency mode: each prompt runs ${opts.repeat} times`)

  const estimateMin = Math.round((totalRuns * 45) / 60) // ~45s avg
  console.log(`Estimated duration: ~${estimateMin} minutes`)
  console.log('')
  console.log('─'.repeat(60))
  console.log('')

  // 6. Run prompts sequentially
  const results = []
  const runStartMs = Date.now()

  for (let i = 0; i < runList.length; i++) {
    const prompt = runList[i]
    const num = `[${i + 1}/${totalRuns}]`
    const repeatLabel = opts.repeat > 1 ? ` (run ${prompt._runNumber}/${opts.repeat})` : ''

    console.log(`${num} ${prompt.id}: "${prompt.prompt}"${repeatLabel}`)

    try {
      const sseResult = await sendPrompt(prompt, defaults, endpoint, cookie)

      if (sseResult.httpError) {
        console.log(`  ✗ HTTP ERROR: ${sseResult.status}`)
        results.push({
          promptId: prompt.id,
          category: prompt.category,
          prompt: prompt.prompt,
          overall: 'fail',
          failCount: 1,
          checks: {
            httpStatus: { pass: false, status: sseResult.status },
          },
          timing: sseResult.timing,
          responsePreview: '',
          fullResponse: '',
          tasks: [],
          navSuggestions: [],
          notes: `HTTP ${sseResult.status}`,
        })
        console.log('')
        continue
      }

      // Evaluate
      const evaluation = evaluateResponse(prompt, sseResult, defaults)
      results.push(evaluation)

      // Log result
      const icon = evaluation.overall === 'pass' ? '✓' : evaluation.overall === 'warn' ? '~' : '✗'
      const intent = sseResult.intent || 'n/a'
      const totalSec = (sseResult.timing.totalMs / 1000).toFixed(1)
      const tps = sseResult.timing.tokensPerSec

      console.log(`  ${icon} ${evaluation.overall.toUpperCase()} | intent: ${intent} | ${totalSec}s | ${tps} tok/s | ${(sseResult.tokens || '').length} chars`)

      // Show failed checks
      if (evaluation.overall !== 'pass') {
        for (const [name, check] of Object.entries(evaluation.checks)) {
          if (!check.pass) {
            console.log(`    ✗ ${name}`)
          }
        }
      }

      // Show first 150 chars of response
      const preview = (sseResult.tokens || '').substring(0, 150).replace(/\n/g, ' ')
      if (preview) console.log(`  > ${preview}...`)

    } catch (err) {
      console.log(`  ✗ EXCEPTION: ${err.message}`)
      results.push({
        promptId: prompt.id,
        category: prompt.category,
        prompt: prompt.prompt,
        overall: 'fail',
        failCount: 1,
        checks: {
          exception: { pass: false, error: err.message },
        },
        timing: { totalMs: Date.now() - runStartMs },
        responsePreview: '',
        fullResponse: '',
        tasks: [],
        navSuggestions: [],
        notes: `Exception: ${err.message}`,
      })
    }

    console.log('')
  }

  const totalDurationMs = Date.now() - runStartMs

  // 6. Generate reports
  const models = {
    fast: 'qwen3:4b',
    standard: ollama.models.find((m) => m.includes('qwen3-coder')) || 'qwen3-coder:30b',
  }

  const benchmarkDir = path.join(__dirname, '..', 'benchmarks')
  const reportDir = path.join(__dirname, '..', 'reports')

  const { benchmarkPath, reportPath } = generateReports({
    suite: opts.suite,
    results,
    durationMs: totalDurationMs,
    models,
    benchmarkDir,
    reportDir,
  })

  // 7. Print summary
  printSummary(results, totalDurationMs)

  // 7b. Consistency analysis (when --repeat > 1)
  if (opts.repeat > 1) {
    console.log('')
    console.log('═'.repeat(60))
    console.log('  CONSISTENCY ANALYSIS')
    console.log('═'.repeat(60))
    console.log('')

    // Group results by original prompt ID
    const groups = {}
    for (const r of results) {
      const origId = r.promptId.replace(/_run\d+$/, '')
      if (!groups[origId]) groups[origId] = []
      groups[origId].push(r)
    }

    let consistentCount = 0
    let inconsistentCount = 0

    for (const [origId, runs] of Object.entries(groups)) {
      const verdicts = runs.map((r) => r.overall)
      const timings = runs.map((r) => r.timing?.totalMs || 0)
      const allSame = verdicts.every((v) => v === verdicts[0])
      const avgTime = Math.round(timings.reduce((a, b) => a + b, 0) / timings.length)
      const minTime = Math.min(...timings)
      const maxTime = Math.max(...timings)
      const variance = maxTime - minTime

      if (allSame && verdicts[0] === 'pass') {
        consistentCount++
        console.log(`  ✓ ${origId}: ${verdicts.join(', ')} | avg ${(avgTime / 1000).toFixed(1)}s (±${(variance / 1000).toFixed(1)}s)`)
      } else {
        inconsistentCount++
        console.log(`  ✗ ${origId}: ${verdicts.join(', ')} | avg ${(avgTime / 1000).toFixed(1)}s (±${(variance / 1000).toFixed(1)}s) ← INCONSISTENT`)
      }
    }

    console.log('')
    console.log(`  Consistent: ${consistentCount}/${Object.keys(groups).length}`)
    console.log(`  Inconsistent: ${inconsistentCount}/${Object.keys(groups).length}`)
    console.log('─'.repeat(60))
  }

  console.log(`Benchmark: ${path.relative(ROOT, benchmarkPath)}`)
  console.log(`Report:    ${path.relative(ROOT, reportPath)}`)
  console.log('')

  // 8. Exit code
  const passRate = results.filter((r) => r.overall === 'pass').length / results.length
  process.exit(passRate >= 0.8 ? 0 : 1)
}

main().catch((err) => {
  console.error('FATAL:', err)
  process.exit(1)
})
