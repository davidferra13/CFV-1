#!/usr/bin/env node
// ═══════════════════════════════════════════════════════════════════
// ChefFlow Mission Control — Dashboard Server
// ═══════════════════════════════════════════════════════════════════
// Battle.net-style launcher for managing all ChefFlow services.
// Serves the dashboard UI + API for controlling dev, beta, Ollama, git.
//
// Usage:  node scripts/launcher/server.mjs
//         npm run dashboard
//
// Opens: http://localhost:41937
// ═══════════════════════════════════════════════════════════════════

import { createServer } from 'node:http'
import { exec, spawn } from 'node:child_process'
import { readFile, appendFile, stat } from 'node:fs/promises'
import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { promisify } from 'node:util'

const execAsync = promisify(exec)
const __dirname = dirname(fileURLToPath(import.meta.url))
const PROJECT_ROOT = join(__dirname, '..', '..')
const PORT = 41937

// Load .env.local for Supabase credentials
try {
  const envContent = readFileSync(join(PROJECT_ROOT, '.env.local'), 'utf-8')
  for (const line of envContent.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eqIndex = trimmed.indexOf('=')
    if (eqIndex === -1) continue
    const key = trimmed.slice(0, eqIndex).trim()
    const value = trimmed.slice(eqIndex + 1).trim().replace(/^["']|["']$/g, '')
    if (!process.env[key]) process.env[key] = value
  }
} catch { /* .env.local not found */ }

// ── Configuration ─────────────────────────────────────────────────

const CONFIG = {
  devPort: 3100,
  betaUrl: 'https://beta.cheflowhq.com',
  betaHealthUrl: 'https://beta.cheflowhq.com/api/health',
  prodUrl: 'https://app.cheflowhq.com',
  prodHealthUrl: 'https://app.cheflowhq.com/api/health',
  ollamaPcUrl: process.env.OLLAMA_BASE_URL || 'http://localhost:11434',
  ollamaPiUrl: process.env.OLLAMA_PI_URL || 'http://10.0.0.177:11434',
  ollamaPcModel: process.env.OLLAMA_MODEL || 'qwen3-coder:30b',
  ollamaPiModel: process.env.OLLAMA_PI_MODEL || 'qwen3:8b',
  piSsh: 'ssh pi',
  logFile: join(PROJECT_ROOT, 'mission-control.log'),
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  supabaseServiceKey: process.env.SUPABASE_SERVICE_ROLE_KEY || '',
}

// ── Chat Configuration ───────────────────────────────────────────

const CHAT_CONFIG = {
  maxHistoryMessages: 20,
  maxTokens: 1024,
  timeoutMs: 120_000,
  streamTimeoutMs: 30_000,
}

// ── Event Log + SSE ───────────────────────────────────────────────

const eventLog = []
const sseClients = new Set()
const MAX_LOG = 500

function log(source, message, type = 'info') {
  const entry = { time: Date.now(), source, message, type }
  eventLog.push(entry)
  if (eventLog.length > MAX_LOG) eventLog.shift()
  for (const client of sseClients) {
    try {
      client.write(`data: ${JSON.stringify(entry)}\n\n`)
    } catch { sseClients.delete(client) }
  }
  // Persist to log file (non-blocking, errors silently)
  const ts = new Date(entry.time).toISOString()
  appendFile(CONFIG.logFile, `[${ts}] [${type}] [${source}] ${message}\n`).catch(() => {})
}

// ── Process tracking ──────────────────────────────────────────────

let devServerProcess = null
const runningJobs = new Map()

// ── Utility functions ─────────────────────────────────────────────

async function httpCheck(url, timeout = 4000) {
  const start = Date.now()
  try {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), timeout)
    const res = await fetch(url, { signal: controller.signal, cache: 'no-store' })
    clearTimeout(timer)
    return { ok: res.ok, status: res.status, latency: Date.now() - start }
  } catch (err) {
    return { ok: false, status: 0, latency: Date.now() - start, error: err?.message }
  }
}

async function sshExec(cmd, timeout = 15000) {
  return execAsync(`ssh -o ConnectTimeout=5 pi "${cmd}"`, {
    cwd: PROJECT_ROOT,
    timeout,
  })
}

async function findPidOnPort(port) {
  try {
    const { stdout } = await execAsync(
      `netstat -ano | findstr :${port} | findstr LISTENING`,
      { shell: 'cmd' }
    )
    const lines = stdout.trim().split('\n')
    if (lines.length > 0) {
      const pid = lines[0].trim().split(/\s+/).pop()
      if (pid && !isNaN(Number(pid))) return Number(pid)
    }
  } catch { /* no process found */ }
  return null
}

// ── Status Checks ─────────────────────────────────────────────────

async function checkDevServer() {
  const check = await httpCheck(`http://localhost:${CONFIG.devPort}`)
  return {
    online: check.ok,
    latency: check.latency,
    port: CONFIG.devPort,
    managedByUs: devServerProcess !== null,
  }
}

async function checkBetaServer() {
  const check = await httpCheck(CONFIG.betaHealthUrl, 6000)
  let details = null
  if (check.ok) {
    try {
      const controller = new AbortController()
      const timer = setTimeout(() => controller.abort(), 5000)
      const res = await fetch(CONFIG.betaHealthUrl, { signal: controller.signal, cache: 'no-store' })
      clearTimeout(timer)
      details = await res.json()
    } catch { /* ignore */ }
  }
  return {
    online: check.ok,
    latency: check.latency,
    status: check.status,
    details,
  }
}

async function checkOllama(url, model) {
  const result = { online: false, latency: 0, models: [], modelReady: false, configured: model }
  const check = await httpCheck(`${url}/api/tags`)
  result.latency = check.latency
  if (!check.ok) return result
  result.online = true
  try {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 4000)
    const res = await fetch(`${url}/api/tags`, { signal: controller.signal, cache: 'no-store' })
    clearTimeout(timer)
    const data = await res.json()
    result.models = (data.models ?? []).map(m => m.name)
    result.modelReady = result.models.some(m => m === model || m.startsWith(model.split(':')[0]))
  } catch { /* ignore */ }
  return result
}

async function checkProduction() {
  const check = await httpCheck(CONFIG.prodHealthUrl, 6000)
  let details = null
  if (check.ok) {
    try {
      const controller = new AbortController()
      const timer = setTimeout(() => controller.abort(), 5000)
      const res = await fetch(CONFIG.prodHealthUrl, { signal: controller.signal, cache: 'no-store' })
      clearTimeout(timer)
      details = await res.json()
    } catch { /* ignore */ }
  }
  // Try to get last deploy info and usage from Vercel API
  let vercel = null
  try {
    const token = process.env.VERCEL_TOKEN
    if (token) {
      // Get recent deployments
      const controller = new AbortController()
      const timer = setTimeout(() => controller.abort(), 8000)
      const res = await fetch('https://api.vercel.com/v6/deployments?limit=3&projectId=' + (process.env.VERCEL_PROJECT_ID || ''), {
        headers: { Authorization: `Bearer ${token}` },
        signal: controller.signal,
      })
      clearTimeout(timer)
      if (res.ok) {
        const data = await res.json()
        const deployments = (data.deployments || []).map(d => ({
          url: d.url,
          state: d.state,
          created: d.created,
          target: d.target,
          meta: { branch: d.meta?.githubCommitRef, message: d.meta?.githubCommitMessage },
        }))
        vercel = { deployments }
      }
      // Get usage/billing if available
      try {
        const teamRes = await fetch('https://api.vercel.com/v2/teams?limit=1', {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (teamRes.ok) {
          const teamData = await teamRes.json()
          vercel = vercel || {}
          vercel.team = teamData.teams?.[0]?.name
        }
      } catch { /* ignore */ }
    }
  } catch { /* ignore */ }
  return {
    online: check.ok,
    latency: check.latency,
    status: check.status,
    details,
    vercel,
  }
}

async function checkGitStatus() {
  try {
    const [branchResult, statusResult, logResult] = await Promise.all([
      execAsync('git branch --show-current', { cwd: PROJECT_ROOT }),
      execAsync('git status --porcelain', { cwd: PROJECT_ROOT }),
      execAsync('git log --oneline -5', { cwd: PROJECT_ROOT }),
    ])
    const dirty = statusResult.stdout.trim().split('\n').filter(l => l.trim()).length
    return {
      branch: branchResult.stdout.trim(),
      dirty,
      clean: dirty === 0,
      recentCommits: logResult.stdout.trim().split('\n').slice(0, 5),
    }
  } catch (err) {
    return { branch: 'unknown', dirty: 0, clean: true, recentCommits: [], error: err.message }
  }
}

async function getAllStatus() {
  const [dev, beta, prod, ollamaPc, ollamaPi, git] = await Promise.allSettled([
    checkDevServer(),
    checkBetaServer(),
    checkProduction(),
    checkOllama(CONFIG.ollamaPcUrl, CONFIG.ollamaPcModel),
    checkOllama(CONFIG.ollamaPiUrl, CONFIG.ollamaPiModel),
    checkGitStatus(),
  ])
  return {
    dev: dev.status === 'fulfilled' ? dev.value : { online: false },
    beta: beta.status === 'fulfilled' ? beta.value : { online: false },
    prod: prod.status === 'fulfilled' ? prod.value : { online: false },
    ollamaPc: ollamaPc.status === 'fulfilled' ? ollamaPc.value : { online: false },
    ollamaPi: ollamaPi.status === 'fulfilled' ? ollamaPi.value : { online: false },
    git: git.status === 'fulfilled' ? git.value : { branch: 'unknown' },
    timestamp: Date.now(),
  }
}

async function readPersistentLog(lines = 100) {
  try {
    const content = await readFile(CONFIG.logFile, 'utf-8')
    return content.trim().split('\n').slice(-lines)
  } catch { return [] }
}

// ── Actions ───────────────────────────────────────────────────────

async function startDevServer() {
  const pid = await findPidOnPort(CONFIG.devPort)
  if (pid) return { ok: true, message: 'Dev server already running', alreadyRunning: true }

  log('dev', 'Starting dev server on port 3100...', 'info')
  devServerProcess = spawn('npx', ['next', 'dev', '-p', String(CONFIG.devPort), '-H', '0.0.0.0'], {
    cwd: PROJECT_ROOT,
    shell: true,
    stdio: ['ignore', 'pipe', 'pipe'],
  })

  devServerProcess.stdout.on('data', d => {
    const text = d.toString().trim()
    if (text) log('dev', text)
  })
  devServerProcess.stderr.on('data', d => {
    const text = d.toString().trim()
    if (text && !text.includes('ExperimentalWarning')) log('dev', text, 'warn')
  })
  devServerProcess.on('close', code => {
    log('dev', `Dev server exited (code ${code})`, code === 0 ? 'info' : 'error')
    devServerProcess = null
  })

  return { ok: true, message: 'Dev server starting...' }
}

async function stopDevServer() {
  if (devServerProcess) {
    log('dev', 'Stopping dev server...', 'info')
    try {
      if (process.platform === 'win32') {
        exec(`taskkill /PID ${devServerProcess.pid} /T /F`, { shell: 'cmd' })
      } else {
        devServerProcess.kill('SIGTERM')
      }
    } catch { /* ignore */ }
    devServerProcess = null
    return { ok: true, message: 'Dev server stopped' }
  }

  const pid = await findPidOnPort(CONFIG.devPort)
  if (pid) {
    log('dev', `Killing external dev server (PID ${pid})...`, 'info')
    try {
      exec(`taskkill /PID ${pid} /T /F`, { shell: 'cmd' })
      return { ok: true, message: `Stopped external process (PID ${pid})` }
    } catch (err) {
      return { ok: false, error: err.message }
    }
  }

  return { ok: true, message: 'Dev server not running' }
}

async function restartBeta() {
  log('beta', 'Restarting beta server (PM2)...', 'info')
  try {
    const { stdout } = await sshExec('pm2 restart chefflow-beta')
    log('beta', stdout.trim() || 'PM2 restart sent', 'success')
    // Wait a moment then health check
    await new Promise(r => setTimeout(r, 3000))
    const check = await httpCheck(`http://10.0.0.177:3100`, 5000)
    if (check.ok) {
      log('beta', 'Beta server is back online!', 'success')
    } else {
      log('beta', 'Beta may still be starting...', 'warn')
    }
    return { ok: true, message: 'Beta restarted' }
  } catch (err) {
    log('beta', `Restart failed: ${err.message}`, 'error')
    return { ok: false, error: err.message }
  }
}

function deployBeta() {
  if (runningJobs.has('deploy')) return { ok: false, error: 'Deploy already in progress' }

  log('beta', 'Starting deploy to beta...', 'info')
  const child = spawn('bash', ['scripts/deploy-beta.sh'], {
    cwd: PROJECT_ROOT,
    stdio: ['ignore', 'pipe', 'pipe'],
  })

  const job = { id: 'deploy', child, startTime: Date.now(), status: 'running' }
  runningJobs.set('deploy', job)

  child.stdout.on('data', d => {
    d.toString().trim().split('\n').forEach(line => {
      if (line.trim()) log('deploy', line.trim())
    })
  })
  child.stderr.on('data', d => {
    d.toString().trim().split('\n').forEach(line => {
      if (line.trim()) log('deploy', line.trim(), 'warn')
    })
  })
  child.on('close', code => {
    job.status = code === 0 ? 'success' : 'failed'
    log('deploy', code === 0 ? 'Deploy completed successfully!' : `Deploy failed (code ${code})`, code === 0 ? 'success' : 'error')
    runningJobs.delete('deploy')
  })

  return { ok: true, message: 'Deploy started — watch the console' }
}

async function rollbackBeta() {
  log('beta', 'Rolling back beta server...', 'info')
  try {
    const child = spawn('bash', ['scripts/rollback-beta.sh'], {
      cwd: PROJECT_ROOT,
      stdio: ['ignore', 'pipe', 'pipe'],
    })
    child.stdout.on('data', d => log('rollback', d.toString().trim()))
    child.stderr.on('data', d => log('rollback', d.toString().trim(), 'warn'))
    return new Promise(resolve => {
      child.on('close', code => {
        log('rollback', code === 0 ? 'Rollback complete!' : `Rollback failed (code ${code})`, code === 0 ? 'success' : 'error')
        resolve({ ok: code === 0, message: code === 0 ? 'Rollback complete' : 'Rollback failed' })
      })
    })
  } catch (err) {
    return { ok: false, error: err.message }
  }
}

async function ollamaAction(target, action) {
  const label = target === 'pc' ? 'Ollama PC' : 'Ollama Pi'
  log('ollama', `${action === 'start' ? 'Starting' : 'Stopping'} ${label}...`, 'info')

  try {
    if (target === 'pc') {
      if (action === 'start') {
        spawn('ollama', ['serve'], { cwd: PROJECT_ROOT, detached: true, stdio: 'ignore', shell: true }).unref()
        log('ollama', 'Ollama PC starting...', 'success')
      } else {
        await execAsync('taskkill /IM ollama.exe /F', { shell: 'cmd' })
        log('ollama', 'Ollama PC stopped', 'success')
      }
    } else {
      const cmd = action === 'start' ? 'sudo systemctl start ollama' : 'sudo systemctl stop ollama'
      await sshExec(cmd)
      log('ollama', `${label} ${action === 'start' ? 'started' : 'stopped'}`, 'success')
    }
    return { ok: true }
  } catch (err) {
    log('ollama', `${label} ${action} failed: ${err.message}`, 'error')
    return { ok: false, error: err.message }
  }
}

async function gitPush() {
  log('git', 'Pushing current branch...', 'info')
  try {
    const { stdout: branch } = await execAsync('git branch --show-current', { cwd: PROJECT_ROOT })
    const branchName = branch.trim()
    const { stdout } = await execAsync(`git push origin ${branchName}`, { cwd: PROJECT_ROOT })
    log('git', stdout.trim() || `Pushed ${branchName} to origin`, 'success')
    return { ok: true, branch: branchName }
  } catch (err) {
    log('git', `Push failed: ${err.stderr || err.message}`, 'error')
    return { ok: false, error: err.stderr || err.message }
  }
}

async function gitCommit(message) {
  if (!message || !message.trim()) {
    return { ok: false, error: 'Commit message is required' }
  }
  log('git', `Committing: ${message}`, 'info')
  try {
    await execAsync('git add -A', { cwd: PROJECT_ROOT })
    const escaped = message.replace(/"/g, '\\"').replace(/\$/g, '\\$').replace(/`/g, '\\`')
    const { stdout } = await execAsync(`git commit -m "${escaped}"`, { cwd: PROJECT_ROOT })
    log('git', stdout.trim() || 'Changes committed', 'success')
    return { ok: true, message: stdout.trim() || 'Changes committed' }
  } catch (err) {
    if (err.stdout?.includes('nothing to commit')) {
      log('git', 'Nothing to commit — working tree clean', 'info')
      return { ok: true, message: 'Nothing to commit — working tree clean' }
    }
    log('git', `Commit failed: ${err.stderr || err.message}`, 'error')
    return { ok: false, error: err.stderr || err.message }
  }
}

async function dbBackup() {
  const timestamp = new Date().toISOString().slice(0, 10).replace(/-/g, '')
  const filename = `backup-${timestamp}.sql`
  log('db', `Creating database backup: ${filename}...`, 'info')
  try {
    await execAsync(`npx supabase db dump --linked > ${filename}`, {
      cwd: PROJECT_ROOT,
      timeout: 60000,
    })
    log('db', `Backup saved: ${filename}`, 'success')
    return { ok: true, message: `Backup saved as ${filename}` }
  } catch (err) {
    log('db', `Backup failed: ${err.stderr || err.message}`, 'error')
    return { ok: false, error: err.stderr || err.message }
  }
}

// ── Ship It (commit + push + deploy) ────────────────────────────

async function shipIt(message) {
  if (runningJobs.has('ship-it')) return { ok: false, error: 'Ship It already in progress' }

  log('ship', '🚀 SHIP IT — Starting full pipeline...', 'info')
  const results = { commit: null, push: null, deploy: null }

  // Step 1: Commit
  const commitMsg = message || `update: ${new Date().toISOString().slice(0, 10)} ship from Mission Control`
  log('ship', `Step 1/3: Committing — "${commitMsg}"`, 'info')
  try {
    await execAsync('git add -A', { cwd: PROJECT_ROOT })
    const escaped = commitMsg.replace(/"/g, '\\"').replace(/\$/g, '\\$').replace(/`/g, '\\`')
    const { stdout } = await execAsync(`git commit -m "${escaped}"`, { cwd: PROJECT_ROOT })
    results.commit = { ok: true, message: stdout.trim() || 'Committed' }
    log('ship', `Committed: ${stdout.trim() || 'done'}`, 'success')
  } catch (err) {
    if (err.stdout?.includes('nothing to commit')) {
      results.commit = { ok: true, message: 'Nothing to commit — clean tree' }
      log('ship', 'Nothing to commit — working tree clean', 'info')
    } else {
      results.commit = { ok: false, error: err.stderr || err.message }
      log('ship', `Commit failed: ${err.stderr || err.message}`, 'error')
      return { ok: false, error: `Commit failed: ${err.stderr || err.message}`, results }
    }
  }

  // Step 2: Push
  log('ship', 'Step 2/3: Pushing to GitHub...', 'info')
  try {
    const { stdout: branch } = await execAsync('git branch --show-current', { cwd: PROJECT_ROOT })
    const branchName = branch.trim()
    const { stdout } = await execAsync(`git push origin ${branchName}`, { cwd: PROJECT_ROOT })
    results.push = { ok: true, branch: branchName, message: stdout.trim() || `Pushed ${branchName}` }
    log('ship', `Pushed ${branchName} to origin`, 'success')
  } catch (err) {
    results.push = { ok: false, error: err.stderr || err.message }
    log('ship', `Push failed: ${err.stderr || err.message}`, 'error')
    return { ok: false, error: `Push failed: ${err.stderr || err.message}`, results }
  }

  // Step 3: Deploy to beta
  log('ship', 'Step 3/3: Deploying to beta...', 'info')
  const deployResult = deployBeta()
  results.deploy = deployResult

  return { ok: true, message: '🚀 Ship It complete! Commit → Push → Deploy started.', results }
}

// ── Clear .next Cache ───────────────────────────────────────────

async function clearCache() {
  log('cache', 'Clearing .next/ build cache...', 'info')
  try {
    const { stdout } = await execAsync(
      process.platform === 'win32'
        ? 'if exist ".next" rmdir /s /q ".next"'
        : 'rm -rf .next/',
      { cwd: PROJECT_ROOT, shell: process.platform === 'win32' ? 'cmd' : true }
    )
    log('cache', 'Build cache cleared!', 'success')
    return { ok: true, message: 'Build cache (.next/) cleared successfully' }
  } catch (err) {
    log('cache', `Cache clear failed: ${err.message}`, 'error')
    return { ok: false, error: err.message }
  }
}

// ── NPM Install ─────────────────────────────────────────────────

async function npmInstall() {
  if (runningJobs.has('npm-install')) return { ok: false, error: 'npm install already in progress' }

  log('npm', 'Running npm install...', 'info')
  const child = spawn('npm', ['install'], {
    cwd: PROJECT_ROOT,
    shell: true,
    stdio: ['ignore', 'pipe', 'pipe'],
  })

  const job = { id: 'npm-install', child, startTime: Date.now(), status: 'running' }
  runningJobs.set('npm-install', job)

  child.stdout.on('data', d => {
    d.toString().trim().split('\n').forEach(line => {
      if (line.trim()) log('npm', line.trim())
    })
  })
  child.stderr.on('data', d => {
    d.toString().trim().split('\n').forEach(line => {
      if (line.trim()) log('npm', line.trim(), 'warn')
    })
  })
  child.on('close', code => {
    job.status = code === 0 ? 'success' : 'failed'
    const duration = ((Date.now() - job.startTime) / 1000).toFixed(1)
    log('npm', code === 0 ? `npm install completed (${duration}s)` : `npm install failed (${duration}s)`, code === 0 ? 'success' : 'error')
    runningJobs.delete('npm-install')
  })

  return { ok: true, message: 'npm install started — watch the console' }
}

// ── Generate DB Types ───────────────────────────────────────────

async function generateTypes() {
  if (runningJobs.has('gen-types')) return { ok: false, error: 'Type generation already in progress' }

  log('db', 'Generating database types from Supabase...', 'info')
  const child = spawn('npx', ['supabase', 'gen', 'types', 'typescript', '--linked'], {
    cwd: PROJECT_ROOT,
    shell: true,
    stdio: ['ignore', 'pipe', 'pipe'],
  })

  const job = { id: 'gen-types', child, startTime: Date.now(), status: 'running' }
  runningJobs.set('gen-types', job)

  let output = ''
  child.stdout.on('data', d => { output += d.toString() })
  child.stderr.on('data', d => {
    d.toString().trim().split('\n').forEach(line => {
      if (line.trim()) log('db', line.trim(), 'warn')
    })
  })
  child.on('close', async code => {
    if (code === 0 && output.trim()) {
      try {
        const typesPath = join(PROJECT_ROOT, 'types', 'database.ts')
        const { writeFile } = await import('node:fs/promises')
        await writeFile(typesPath, output)
        log('db', 'types/database.ts regenerated successfully!', 'success')
      } catch (err) {
        log('db', `Failed to write types file: ${err.message}`, 'error')
      }
    } else if (code !== 0) {
      log('db', 'Type generation failed', 'error')
    }
    job.status = code === 0 ? 'success' : 'failed'
    const duration = ((Date.now() - job.startTime) / 1000).toFixed(1)
    log('db', `Type generation ${code === 0 ? 'completed' : 'failed'} (${duration}s)`, code === 0 ? 'success' : 'error')
    runningJobs.delete('gen-types')
  })

  return { ok: true, message: 'Generating database types — watch the console' }
}

// ── Prompt Queue ────────────────────────────────────────────────

async function getPromptQueue() {
  try {
    const { readdir } = await import('node:fs/promises')
    const queueDir = join(PROJECT_ROOT, 'prompts', 'queue')
    let files = []
    try {
      files = await readdir(queueDir)
      files = files.filter(f => f.endsWith('.md'))
    } catch { /* directory may not exist */ }

    if (files.length === 0) {
      return { ok: true, prompts: [], total: 0, message: 'Prompt queue is empty' }
    }

    const prompts = []
    for (const f of files) {
      try {
        const content = await readFile(join(queueDir, f), 'utf-8')
        const titleMatch = content.match(/^#\s+(.+)/m)
        prompts.push({
          file: f,
          title: titleMatch ? titleMatch[1] : f.replace('.md', ''),
          preview: content.slice(0, 200),
        })
      } catch { prompts.push({ file: f, title: f.replace('.md', ''), preview: '' }) }
    }

    return { ok: true, prompts, total: prompts.length, message: `${prompts.length} prompt(s) in queue` }
  } catch (err) {
    return { ok: false, error: err.message, prompts: [], total: 0 }
  }
}

// ── Feature Close-Out (typecheck + build + commit + push) ───────

async function closeOutFeature(message) {
  if (runningJobs.has('close-out')) return { ok: false, error: 'Close-out already in progress' }

  log('close-out', '✅ Feature Close-Out — Starting pipeline...', 'info')
  const job = { id: 'close-out', startTime: Date.now(), status: 'running' }
  runningJobs.set('close-out', job)

  // Step 1: Type check
  log('close-out', 'Step 1/4: Running type check...', 'info')
  try {
    await execAsync('npx tsc --noEmit --skipLibCheck', { cwd: PROJECT_ROOT, timeout: 120000 })
    log('close-out', 'Type check passed!', 'success')
  } catch (err) {
    log('close-out', `Type check failed: ${err.stderr || err.message}`, 'error')
    job.status = 'failed'
    runningJobs.delete('close-out')
    return { ok: false, error: `Type check failed: ${err.stderr || err.message}` }
  }

  // Step 2: Full build
  log('close-out', 'Step 2/4: Running full build...', 'info')
  try {
    await execAsync('npx next build --no-lint', { cwd: PROJECT_ROOT, timeout: 300000 })
    log('close-out', 'Build passed!', 'success')
  } catch (err) {
    log('close-out', `Build failed: ${err.stderr || err.message}`, 'error')
    job.status = 'failed'
    runningJobs.delete('close-out')
    return { ok: false, error: `Build failed: ${err.stderr || err.message}` }
  }

  // Step 3: Commit
  const commitMsg = message || `feat: close-out ${new Date().toISOString().slice(0, 10)}`
  log('close-out', `Step 3/4: Committing — "${commitMsg}"`, 'info')
  try {
    await execAsync('git add -A', { cwd: PROJECT_ROOT })
    const escaped = commitMsg.replace(/"/g, '\\"').replace(/\$/g, '\\$').replace(/`/g, '\\`')
    await execAsync(`git commit -m "${escaped}"`, { cwd: PROJECT_ROOT })
    log('close-out', 'Committed!', 'success')
  } catch (err) {
    if (err.stdout?.includes('nothing to commit')) {
      log('close-out', 'Nothing to commit — working tree clean', 'info')
    } else {
      log('close-out', `Commit failed: ${err.stderr || err.message}`, 'error')
      job.status = 'failed'
      runningJobs.delete('close-out')
      return { ok: false, error: `Commit failed: ${err.stderr || err.message}` }
    }
  }

  // Step 4: Push
  log('close-out', 'Step 4/4: Pushing to GitHub...', 'info')
  try {
    const { stdout: branch } = await execAsync('git branch --show-current', { cwd: PROJECT_ROOT })
    await execAsync(`git push origin ${branch.trim()}`, { cwd: PROJECT_ROOT })
    log('close-out', `Pushed ${branch.trim()} to origin`, 'success')
  } catch (err) {
    log('close-out', `Push failed: ${err.stderr || err.message}`, 'error')
    job.status = 'failed'
    runningJobs.delete('close-out')
    return { ok: false, error: `Push failed: ${err.stderr || err.message}` }
  }

  job.status = 'success'
  const duration = ((Date.now() - job.startTime) / 1000).toFixed(1)
  log('close-out', `✅ Feature close-out complete! (${duration}s)`, 'success')
  runningJobs.delete('close-out')
  return { ok: true, message: `Feature close-out complete (${duration}s). Type check ✓ Build ✓ Commit ✓ Push ✓` }
}

async function runBuild(type) {
  const jobId = `build-${type}`
  if (runningJobs.has(jobId)) return { ok: false, error: 'Build already in progress' }

  const cmd = type === 'typecheck' ? 'npx tsc --noEmit --skipLibCheck' : 'npx next build --no-lint'
  log('build', `Running ${type === 'typecheck' ? 'type check' : 'full build'}...`, 'info')

  const child = spawn(cmd.split(' ')[0], cmd.split(' ').slice(1), {
    cwd: PROJECT_ROOT,
    shell: true,
    stdio: ['ignore', 'pipe', 'pipe'],
  })

  const job = { id: jobId, child, startTime: Date.now(), status: 'running' }
  runningJobs.set(jobId, job)

  child.stdout.on('data', d => {
    d.toString().trim().split('\n').forEach(line => {
      if (line.trim()) log('build', line.trim())
    })
  })
  child.stderr.on('data', d => {
    d.toString().trim().split('\n').forEach(line => {
      if (line.trim()) log('build', line.trim(), 'warn')
    })
  })
  child.on('close', code => {
    job.status = code === 0 ? 'success' : 'failed'
    const duration = ((Date.now() - job.startTime) / 1000).toFixed(1)
    log('build', code === 0 ? `${type === 'typecheck' ? 'Type check' : 'Build'} passed (${duration}s)` : `${type === 'typecheck' ? 'Type check' : 'Build'} failed (${duration}s)`, code === 0 ? 'success' : 'error')
    runningJobs.delete(jobId)
  })

  return { ok: true, message: `${type} started` }
}

// ── History & Feedback ──────────────────────────────────────────

async function getGitHistory() {
  try {
    const { stdout } = await execAsync(
      'git log --pretty=format:"%h|%ad|%s" --date=short',
      { cwd: PROJECT_ROOT, maxBuffer: 5 * 1024 * 1024 }
    )
    const lines = stdout.trim().split('\n').filter(l => l.trim())
    const commits = lines.map(line => {
      const [hash, date, ...msgParts] = line.split('|')
      return { hash, date, message: msgParts.join('|') }
    })
    return { ok: true, commits, total: commits.length }
  } catch (err) {
    return { ok: false, error: err.message, commits: [], total: 0 }
  }
}

async function getFeedback() {
  if (!CONFIG.supabaseUrl || !CONFIG.supabaseServiceKey) {
    return { ok: false, error: 'Supabase credentials not configured', entries: [] }
  }
  try {
    const url = `${CONFIG.supabaseUrl}/rest/v1/user_feedback?select=id,created_at,sentiment,message,anonymous,user_role,page_context&order=created_at.desc&limit=200`
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 10000)
    const res = await fetch(url, {
      headers: {
        'apikey': CONFIG.supabaseServiceKey,
        'Authorization': `Bearer ${CONFIG.supabaseServiceKey}`,
      },
      signal: controller.signal,
    })
    clearTimeout(timer)
    if (!res.ok) return { ok: false, error: `Supabase returned ${res.status}`, entries: [] }
    const data = await res.json()
    return { ok: true, entries: data, total: data.length }
  } catch (err) {
    return { ok: false, error: err.message, entries: [] }
  }
}

// ── Supabase Query Helper ────────────────────────────────────────

async function supabaseQuery(endpoint, { select, filters = [], order, limit = 50, extra = '' } = {}) {
  if (!CONFIG.supabaseUrl || !CONFIG.supabaseServiceKey) {
    return { ok: false, error: 'Supabase credentials not configured' }
  }
  try {
    const params = []
    if (select) params.push(`select=${encodeURIComponent(select)}`)
    for (const f of filters) params.push(f) // filters are pre-formatted PostgREST syntax
    if (order) params.push(`order=${encodeURIComponent(order)}`)
    if (limit) params.push(`limit=${limit}`)
    const url = `${CONFIG.supabaseUrl}/rest/v1/${endpoint}${params.length ? '?' + params.join('&') : ''}`

    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 10000)
    const res = await fetch(url.toString(), {
      headers: {
        'apikey': CONFIG.supabaseServiceKey,
        'Authorization': `Bearer ${CONFIG.supabaseServiceKey}`,
        'Accept': 'application/json',
      },
      signal: controller.signal,
    })
    clearTimeout(timer)
    if (!res.ok) {
      const errBody = await res.text()
      // Truncate HTML error pages (Cloudflare worker crashes)
      const cleanErr = errBody.startsWith('<!DOCTYPE') || errBody.startsWith('<html')
        ? `Cloudflare/Supabase error ${res.status} (may be rate-limited — try again in a moment)`
        : errBody.slice(0, 300)
      return { ok: false, error: `Supabase ${res.status}: ${cleanErr}` }
    }
    const data = await res.json()
    return { ok: true, data, count: data.length }
  } catch (err) {
    return { ok: false, error: err.message }
  }
}

// ── Business Data Tools ─────────────────────────────────────────

async function getUpcomingEvents() {
  const now = new Date().toISOString().slice(0, 10)
  const result = await supabaseQuery('events', {
    select: 'id,event_date,serve_time,status,guest_count,occasion,service_style,location_city,client:clients(full_name)',
    filters: [`event_date=gte.${now}`, 'status=neq.cancelled'],
    order: 'event_date.asc',
    limit: 15,
  })
  if (!result.ok) return result
  const events = result.data.map(e => ({
    name: e.occasion || 'Event',
    date: e.event_date,
    time: e.serve_time || '',
    status: e.status,
    guests: e.guest_count || 0,
    style: e.service_style || '',
    city: e.location_city || '',
    client: e.client?.full_name || 'No client',
  }))
  return { ok: true, events, total: events.length, message: `${events.length} upcoming events` }
}

async function getEventsByStatus() {
  const result = await supabaseQuery('events', {
    select: 'status',
    limit: 1000,
  })
  if (!result.ok) return result
  const counts = {}
  for (const e of result.data) {
    counts[e.status] = (counts[e.status] || 0) + 1
  }
  return { ok: true, counts, total: result.data.length, message: `${result.data.length} total events` }
}

async function getRevenueSummary() {
  const result = await supabaseQuery('event_financial_summary', {
    select: 'event_id,total_paid_cents,total_refunded_cents,net_revenue_cents,total_expenses_cents,profit_cents,profit_margin,food_cost_percentage,outstanding_balance_cents',
    limit: 1000,
  })
  if (!result.ok) return result
  const totals = result.data.reduce((acc, e) => ({
    revenue: acc.revenue + (e.net_revenue_cents || 0),
    expenses: acc.expenses + (e.total_expenses_cents || 0),
    profit: acc.profit + (e.profit_cents || 0),
    outstanding: acc.outstanding + (e.outstanding_balance_cents || 0),
    refunds: acc.refunds + (e.total_refunded_cents || 0),
  }), { revenue: 0, expenses: 0, profit: 0, outstanding: 0, refunds: 0 })
  const fmt = c => '$' + (Math.abs(c) / 100).toFixed(2)
  return {
    ok: true,
    summary: {
      totalRevenue: fmt(totals.revenue),
      totalExpenses: fmt(totals.expenses),
      totalProfit: fmt(totals.profit),
      outstandingBalance: fmt(totals.outstanding),
      totalRefunds: fmt(totals.refunds),
      eventCount: result.data.length,
      avgMargin: result.data.length
        ? (result.data.reduce((s, e) => s + (e.profit_margin || 0), 0) / result.data.length * 100).toFixed(1) + '%'
        : '0%',
    },
    message: `Revenue: ${fmt(totals.revenue)} | Profit: ${fmt(totals.profit)} | Outstanding: ${fmt(totals.outstanding)}`,
  }
}

async function getClients(param) {
  const opts = {
    select: 'id,full_name,email,phone,created_at',
    order: 'created_at.desc',
    limit: 25,
  }
  opts.limit = 200 // Fetch more for local filtering
  const result = await supabaseQuery('clients', opts)
  if (!result.ok) return result
  let clients = result.data
  if (param && param.trim()) {
    const q = param.trim().toLowerCase()
    clients = clients.filter(c =>
      (c.full_name || '').toLowerCase().includes(q) ||
      (c.email || '').toLowerCase().includes(q)
    )
  }
  return {
    ok: true,
    clients: clients.slice(0, 25).map(c => ({
      name: c.full_name || 'Unknown',
      email: c.email || '',
      phone: c.phone || '',
      since: c.created_at?.slice(0, 10) || '',
    })),
    total: clients.length,
    message: `${clients.length} clients${param ? ` matching "${param}"` : ''}`,
  }
}

async function getOpenInquiries() {
  const result = await supabaseQuery('inquiries', {
    select: 'id,created_at,event_type,event_date,guest_count,status,budget_range,client:clients(full_name)',
    filters: ['status=in.(new,open,pending,contacted)'],
    order: 'created_at.desc',
    limit: 20,
  })
  if (!result.ok) return result
  return {
    ok: true,
    inquiries: result.data.map(i => ({
      type: i.event_type || 'General',
      date: i.event_date || 'TBD',
      guests: i.guest_count || 0,
      status: i.status,
      budget: i.budget_range || 'Not specified',
      client: i.client?.full_name || 'Unknown',
      received: i.created_at?.slice(0, 10) || '',
    })),
    total: result.data.length,
    message: `${result.data.length} open inquiries`,
  }
}

// ── Pi System Monitoring ────────────────────────────────────────

async function getPiStatus() {
  try {
    const { stdout } = await sshExec(
      'echo "===UPTIME===" && uptime && echo "===DISK===" && df -h / && echo "===MEMORY===" && free -h && echo "===PM2===" && pm2 jlist 2>/dev/null && echo "===SERVICES===" && systemctl is-active ollama cloudflared 2>/dev/null',
      20000
    )
    // Parse PM2 JSON
    let pm2Info = 'unknown'
    const pm2Match = stdout.match(/===PM2===\s*\n([\s\S]*?)(?:===|$)/)
    if (pm2Match) {
      try {
        const pm2Data = JSON.parse(pm2Match[1].trim())
        pm2Info = pm2Data.map(p => `${p.name}: ${p.pm2_env?.status || 'unknown'} (pid ${p.pid}, restarts: ${p.pm2_env?.restart_time || 0})`).join('\n')
      } catch { pm2Info = pm2Match[1].trim() }
    }
    return { ok: true, output: stdout, pm2: pm2Info, message: 'Pi status retrieved' }
  } catch (err) {
    return { ok: false, error: err.message }
  }
}

async function getPiLogs(param) {
  const lines = parseInt(param) || 50
  try {
    const { stdout } = await sshExec(`pm2 logs chefflow-beta --lines ${lines} --nostream 2>&1`, 15000)
    return { ok: true, logs: stdout, message: `Last ${lines} lines of PM2 logs` }
  } catch (err) {
    return { ok: false, error: err.message }
  }
}

// ── App Health Check ────────────────────────────────────────────

async function getAppHealth() {
  try {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 8000)
    const res = await fetch(`http://localhost:${CONFIG.devPort}/api/health`, {
      signal: controller.signal,
      cache: 'no-store',
    })
    clearTimeout(timer)
    if (!res.ok) return { ok: false, error: `Health endpoint returned ${res.status}` }
    const data = await res.json()
    return {
      ok: true,
      health: data,
      message: `App status: ${data.status} | DB: ${data.checks?.database} (${data.latencyMs?.database}ms)${data.checks?.redis ? ` | Redis: ${data.checks.redis}` : ''}`,
    }
  } catch (err) {
    return { ok: false, error: `Dev server not reachable: ${err.message}. Start it first.` }
  }
}

// ── Production / Vercel ─────────────────────────────────────────

async function getVercelDeployments() {
  const prod = await checkProduction()
  if (!prod.vercel?.deployments) {
    return { ok: false, error: 'No Vercel data available. Set VERCEL_TOKEN and VERCEL_PROJECT_ID in .env.local' }
  }
  return {
    ok: true,
    deployments: prod.vercel.deployments.map(d => ({
      state: d.state,
      branch: d.meta?.branch || 'unknown',
      message: d.meta?.message || '',
      created: d.created ? new Date(d.created).toISOString().replace('T', ' ').slice(0, 19) : '',
      url: d.url || '',
    })),
    team: prod.vercel.team || null,
    prodOnline: prod.online,
    message: `${prod.vercel.deployments.length} recent deployments | Production: ${prod.online ? 'ONLINE' : 'OFFLINE'}`,
  }
}

// ── Test Runner ─────────────────────────────────────────────────

async function runTests(param) {
  const testType = param?.trim() || 'smoke'
  const commands = {
    smoke: 'npx playwright test tests/launch/ --reporter=line',
    typecheck: 'npx tsc --noEmit --skipLibCheck',
  }
  const cmd = commands[testType]
  if (!cmd) return { ok: false, error: `Unknown test type: ${testType}. Available: ${Object.keys(commands).join(', ')}` }

  const jobId = `test-${testType}`
  if (runningJobs.has(jobId)) return { ok: false, error: 'Test already in progress' }

  log('test', `Running ${testType} tests...`, 'info')
  const child = spawn(cmd.split(' ')[0], cmd.split(' ').slice(1), {
    cwd: PROJECT_ROOT,
    shell: true,
    stdio: ['ignore', 'pipe', 'pipe'],
  })
  const job = { id: jobId, child, startTime: Date.now(), status: 'running' }
  runningJobs.set(jobId, job)

  child.stdout.on('data', d => {
    d.toString().trim().split('\n').forEach(line => {
      if (line.trim()) log('test', line.trim())
    })
  })
  child.stderr.on('data', d => {
    d.toString().trim().split('\n').forEach(line => {
      if (line.trim()) log('test', line.trim(), 'warn')
    })
  })
  child.on('close', code => {
    job.status = code === 0 ? 'success' : 'failed'
    const duration = ((Date.now() - job.startTime) / 1000).toFixed(1)
    log('test', `${testType} tests ${code === 0 ? 'passed' : 'failed'} (${duration}s)`, code === 0 ? 'success' : 'error')
    runningJobs.delete(jobId)
  })

  return { ok: true, message: `${testType} tests started — watch the console` }
}

// ── Remy Bridge ─────────────────────────────────────────────────

async function askRemy(param) {
  if (!param || !param.trim()) return { ok: false, error: 'Provide a question for Remy' }
  const devOnline = await httpCheck(`http://localhost:${CONFIG.devPort}`)
  if (!devOnline.ok) {
    return { ok: false, error: 'Dev server is offline. Start it first to access Remy.' }
  }
  try {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 60000)
    const res = await fetch(`http://localhost:${CONFIG.devPort}/api/ai/remy`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: param.trim() }),
      signal: controller.signal,
    })
    clearTimeout(timer)
    if (!res.ok) return { ok: false, error: `Remy API returned ${res.status}` }
    const data = await res.json()
    return { ok: true, response: data.response || data.message || JSON.stringify(data), message: 'Remy responded' }
  } catch (err) {
    return { ok: false, error: `Remy bridge failed: ${err.message}` }
  }
}

// ── Chat Tool Registry ───────────────────────────────────────────

const TOOLS = {
  // DevOps — Process Control
  'dev/start':        { fn: startDevServer,                       desc: 'Start the local Next.js dev server on port 3100' },
  'dev/stop':         { fn: stopDevServer,                        desc: 'Stop the local dev server' },
  'beta/restart':     { fn: restartBeta,                          desc: 'Restart the beta server (PM2 on Raspberry Pi)' },
  'beta/deploy':      { fn: () => deployBeta(),                   desc: 'Deploy current code to beta.cheflowhq.com (takes 8-10 min)' },
  'beta/rollback':    { fn: rollbackBeta,                         desc: 'Rollback beta to previous build' },
  'ollama/pc/start':  { fn: () => ollamaAction('pc', 'start'),   desc: 'Start Ollama on the PC' },
  'ollama/pc/stop':   { fn: () => ollamaAction('pc', 'stop'),    desc: 'Stop Ollama on the PC' },
  'ollama/pi/start':  { fn: () => ollamaAction('pi', 'start'),   desc: 'Start Ollama on the Raspberry Pi' },
  'ollama/pi/stop':   { fn: () => ollamaAction('pi', 'stop'),    desc: 'Stop Ollama on the Raspberry Pi' },

  // DevOps — Git & Build
  'git/push':         { fn: gitPush,                              desc: 'Push current git branch to origin' },
  'git/commit':       { fn: (param) => gitCommit(param),          desc: 'Stage all changes and commit (use git/commit:your message here)' },
  'build/typecheck':  { fn: () => runBuild('typecheck'),          desc: 'Run TypeScript type check (npx tsc --noEmit)' },
  'build/full':       { fn: () => runBuild('full'),               desc: 'Run full Next.js production build' },
  'test/run':         { fn: (param) => runTests(param),           desc: 'Run tests (use test/run:smoke or test/run:typecheck)' },

  // Pipelines (multi-step)
  'ship-it':          { fn: (param) => shipIt(param),             desc: 'SHIP IT — commit + push + deploy to beta in one shot (use ship-it:commit message)' },
  'close-out':        { fn: (param) => closeOutFeature(param),    desc: 'Feature Close-Out — typecheck + build + commit + push (use close-out:commit message)' },

  // Maintenance
  'cache/clear':      { fn: clearCache,                           desc: 'Clear the .next/ build cache (fixes ENOTEMPTY errors)' },
  'npm/install':      { fn: npmInstall,                           desc: 'Run npm install to update dependencies' },
  'db/gen-types':     { fn: generateTypes,                        desc: 'Regenerate types/database.ts from Supabase schema' },
  'prompts/queue':    { fn: getPromptQueue,                       desc: 'Show pending prompts from the Claude Code queue' },

  // Status & Monitoring
  'status/all':       { fn: getAllStatus,                         desc: 'Get current status of all services (dev, beta, prod, Ollama, git)' },
  'status/git':       { fn: checkGitStatus,                       desc: 'Get git branch, dirty files, and recent commits' },
  'health/app':       { fn: getAppHealth,                         desc: 'Check app health (database, Redis, circuit breakers) — requires dev server running' },
  'pi/status':        { fn: getPiStatus,                          desc: 'Get Raspberry Pi system status (uptime, disk, memory, PM2, services)' },
  'pi/logs':          { fn: (param) => getPiLogs(param),          desc: 'Get recent PM2 logs from Pi (use pi/logs:100 for more lines)' },
  'prod/deployments': { fn: getVercelDeployments,                 desc: 'Show recent Vercel production deployments' },

  // Business Data (read-only Supabase queries)
  'data/events':      { fn: getUpcomingEvents,                    desc: 'List upcoming events with client, date, status, guest count' },
  'data/events-by-status': { fn: getEventsByStatus,               desc: 'Count events grouped by FSM status (draft, proposed, accepted, etc.)' },
  'data/revenue':     { fn: getRevenueSummary,                    desc: 'Revenue summary: total revenue, expenses, profit, outstanding balance' },
  'data/clients':     { fn: (param) => getClients(param),         desc: 'List or search clients (use data/clients:sarah to search)' },
  'data/inquiries':   { fn: getOpenInquiries,                     desc: 'List open inquiries awaiting response' },

  // Database & History
  'db/backup':        { fn: dbBackup,                             desc: 'Backup the Supabase database to a local SQL file' },
  'history/all':      { fn: getGitHistory,                        desc: 'Get the full project commit history' },
  'feedback/all':     { fn: getFeedback,                          desc: 'Get all user feedback from the database' },

  // Remy Bridge
  'remy/ask':         { fn: (param) => askRemy(param),            desc: 'Ask Remy (business AI) a question — requires dev server running. Use remy/ask:your question here' },
}

async function getAvailableOllamaEndpoint() {
  const pcCheck = await httpCheck(`${CONFIG.ollamaPcUrl}/api/tags`)
  if (pcCheck.ok) return { url: CONFIG.ollamaPcUrl, model: CONFIG.ollamaPcModel, source: 'PC' }
  const piCheck = await httpCheck(`${CONFIG.ollamaPiUrl}/api/tags`)
  if (piCheck.ok) return { url: CONFIG.ollamaPiUrl, model: CONFIG.ollamaPiModel, source: 'Pi' }
  return null
}

async function buildChatSystemPrompt() {
  const status = await getAllStatus()
  const toolList = Object.entries(TOOLS)
    .map(([name, { desc }]) => `  - ${name}: ${desc}`)
    .join('\n')

  return `You are Gustav, the ChefFlow Mission Control AI — the developer's right hand. You manage infrastructure, query business data, monitor systems, and bridge to Remy (the in-app business AI). ChefFlow is a private chef operations platform.

## Your Capabilities
Execute actions by including tags in your response.
Format: <action>action/name</action>
With parameters: <action>action/name:parameter value</action>

Available actions:
${toolList}

## Current System Status
- Dev Server: ${status.dev.online ? `**ONLINE** (${status.dev.latency}ms)` : '**OFFLINE**'}
- Beta: ${status.beta.online ? `**ONLINE** (${status.beta.latency}ms)` : '**OFFLINE**'}
- Production: ${status.prod.online ? `**ONLINE** (${status.prod.latency}ms)` : '**OFFLINE**'}
- Ollama PC: ${status.ollamaPc.online ? `**ONLINE** — ${status.ollamaPc.models.join(', ')}` : '**OFFLINE**'}
- Ollama Pi: ${status.ollamaPi.online ? `**ONLINE** — ${status.ollamaPi.models.join(', ')}` : '**OFFLINE**'}
- Git: \`${status.git.branch}\` (${status.git.clean ? 'clean' : `${status.git.dirty} dirty files`})
- Commits: ${(status.git.recentCommits || []).slice(0, 3).join(' | ')}

## Rules
1. **FULL AUTHORITY.** No confirmation needed. User asks, you execute.
2. Execute **multiple actions** per response. Just include multiple <action> tags.
3. After executing, briefly describe results. Don't be verbose.
4. Use the status above for quick answers. Call <action>status/all</action> only to refresh.
5. **Be concise.** Developer tool. Short, direct. No fluff.
6. **NEVER suggest without executing.** "start dev" = just do it.
7. Chain naturally: "push and deploy" = <action>git/push</action> then <action>beta/deploy</action>.
8. Use **markdown**: tables for data, code blocks for logs/output, bold for emphasis, lists for options.
9. For business questions about **client interactions, email drafts, or AI analysis**, use <action>remy/ask:question</action> (requires dev server).
10. Financial data: always format cents as dollars ($X.XX).

## Capability Areas

### DevOps
Start/stop dev server, deploy/rollback/restart beta, control Ollama on PC and Pi.

### Git & Build
Push, commit, typecheck, full build, run smoke tests.

### Business Data (live Supabase queries)
Upcoming events, event status breakdown, revenue/profit summary, client search, open inquiries. All read-only, real-time.

### Monitoring
App health (DB, Redis, circuit breakers), Pi vitals (disk/memory/CPU/PM2), Vercel deployment history, PM2 logs.

### Remy Bridge
For complex business AI (client follow-ups, draft emails, recipe analysis) — proxy to Remy, the 40-year veteran sous chef AI. Requires dev server.

## Personality
Gustav — senior ops engineer, mission control vibe. Direct, efficient, dry humor. Data first. Action, then explanation. NASA flight controller meets chef's right hand.`
}

async function parseAndExecuteActions(responseText) {
  const actionRegex = /<action>([\w/\-]+)(?::([^<]+))?<\/action>/g
  const actions = []
  let match
  while ((match = actionRegex.exec(responseText)) !== null) {
    actions.push({ name: match[1], param: match[2] || null })
  }
  if (actions.length === 0) return { actions: [], results: [] }

  const results = []
  for (const { name: actionName, param } of actions) {
    const tool = TOOLS[actionName]
    if (!tool) {
      results.push({ action: actionName, ok: false, error: `Unknown action: ${actionName}` })
      log('chat', `Unknown action requested: ${actionName}`, 'warn')
      continue
    }
    log('chat', `Executing: ${actionName}${param ? ': ' + param : ''}`, 'info')
    try {
      const result = await tool.fn(param)
      results.push({ action: actionName, ok: true, result })
      log('chat', `Action ${actionName} completed`, 'success')
    } catch (err) {
      results.push({ action: actionName, ok: false, error: err.message })
      log('chat', `Action ${actionName} failed: ${err.message}`, 'error')
    }
  }
  return { actions, results }
}

// ── Request handling ──────────────────────────────────────────────

function parseBody(req) {
  return new Promise((resolve) => {
    let body = ''
    req.on('data', chunk => { body += chunk })
    req.on('end', () => {
      try { resolve(JSON.parse(body || '{}')) }
      catch { resolve({}) }
    })
  })
}

function json(res, data, status = 200) {
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
  })
  res.end(JSON.stringify(data))
}

async function handleRequest(req, res) {
  const url = new URL(req.url, `http://localhost:${PORT}`)
  const path = url.pathname
  const method = req.method

  // CORS preflight
  if (method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    })
    return res.end()
  }

  // Static files
  if (path === '/' || path === '/index.html') {
    try {
      const html = await readFile(join(__dirname, 'index.html'), 'utf-8')
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' })
      return res.end(html)
    } catch {
      res.writeHead(500)
      return res.end('Dashboard HTML not found')
    }
  }

  // Gustav storage JS
  if (path === '/gustav-storage.js') {
    try {
      const js = await readFile(join(__dirname, 'gustav-storage.js'), 'utf-8')
      res.writeHead(200, { 'Content-Type': 'application/javascript; charset=utf-8' })
      return res.end(js)
    } catch {
      res.writeHead(500)
      return res.end('Gustav storage JS not found')
    }
  }

  // SSE event stream
  if (path === '/api/events' && method === 'GET') {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
    })
    // Send recent log entries
    const recent = eventLog.slice(-50)
    for (const entry of recent) {
      res.write(`data: ${JSON.stringify(entry)}\n\n`)
    }
    sseClients.add(res)
    req.on('close', () => sseClients.delete(res))
    return
  }

  // API routes
  if (path === '/api/status' && method === 'GET') {
    const status = await getAllStatus()
    return json(res, status)
  }

  if (path === '/api/dev/start' && method === 'POST') {
    return json(res, await startDevServer())
  }
  if (path === '/api/dev/stop' && method === 'POST') {
    return json(res, await stopDevServer())
  }

  if (path === '/api/beta/restart' && method === 'POST') {
    return json(res, await restartBeta())
  }
  if (path === '/api/beta/deploy' && method === 'POST') {
    return json(res, deployBeta())
  }
  if (path === '/api/beta/rollback' && method === 'POST') {
    return json(res, await rollbackBeta())
  }

  if (path === '/api/ollama/pc/start' && method === 'POST') {
    return json(res, await ollamaAction('pc', 'start'))
  }
  if (path === '/api/ollama/pc/stop' && method === 'POST') {
    return json(res, await ollamaAction('pc', 'stop'))
  }
  if (path === '/api/ollama/pi/start' && method === 'POST') {
    return json(res, await ollamaAction('pi', 'start'))
  }
  if (path === '/api/ollama/pi/stop' && method === 'POST') {
    return json(res, await ollamaAction('pi', 'stop'))
  }

  if (path === '/api/git/push' && method === 'POST') {
    return json(res, await gitPush())
  }
  if (path === '/api/git/info' && method === 'GET') {
    return json(res, await checkGitStatus())
  }

  if (path === '/api/git/commit' && method === 'POST') {
    const body = await parseBody(req)
    return json(res, await gitCommit(body.message))
  }

  if (path === '/api/db/backup' && method === 'POST') {
    return json(res, await dbBackup())
  }

  if (path === '/api/git/history' && method === 'GET') {
    return json(res, await getGitHistory())
  }

  if (path === '/api/feedback' && method === 'GET') {
    return json(res, await getFeedback())
  }

  if (path === '/api/build/typecheck' && method === 'POST') {
    return json(res, await runBuild('typecheck'))
  }
  if (path === '/api/build/full' && method === 'POST') {
    return json(res, await runBuild('full'))
  }

  // New pipeline routes
  if (path === '/api/ship-it' && method === 'POST') {
    const body = await parseBody(req)
    return json(res, await shipIt(body.message))
  }
  if (path === '/api/close-out' && method === 'POST') {
    const body = await parseBody(req)
    return json(res, await closeOutFeature(body.message))
  }
  if (path === '/api/cache/clear' && method === 'POST') {
    return json(res, await clearCache())
  }
  if (path === '/api/npm/install' && method === 'POST') {
    return json(res, await npmInstall())
  }
  if (path === '/api/db/gen-types' && method === 'POST') {
    return json(res, await generateTypes())
  }
  if (path === '/api/prompts/queue' && method === 'GET') {
    return json(res, await getPromptQueue())
  }

  // ── Infrastructure info (Pi health, ports, quick links) ──────────
  if (path === '/api/infra' && method === 'GET') {
    const infra = {
      ports: {
        dev: { port: 3100, label: 'Dev Server', url: 'http://localhost:3100' },
        launcher: { port: PORT, label: 'Mission Control', url: `http://localhost:${PORT}` },
        soak: { port: 3200, label: 'Soak Tests', url: 'http://localhost:3200' },
        beta: { port: 443, label: 'Beta', url: 'https://beta.cheflowhq.com' },
        prod: { port: 443, label: 'Production', url: 'https://app.cheflowhq.com' },
        ollamaPc: { port: 11434, label: 'Ollama PC', url: 'http://localhost:11434' },
        ollamaPi: { port: 11434, label: 'Ollama Pi', url: 'http://10.0.0.177:11434' },
      },
      quickLinks: {
        supabase: 'https://supabase.com/dashboard/project/luefkpakzvxcsqroxyhz',
        vercel: 'https://vercel.com/dashboard',
        github: 'https://github.com/davidferra13/CFV1',
        cloudflare: 'https://dash.cloudflare.com',
        beta: 'https://beta.cheflowhq.com',
        prod: 'https://app.cheflowhq.com',
      },
      pi: null,
    }
    // Fetch Pi system info (non-blocking — if Pi is down, we still return the rest)
    try {
      const { stdout } = await sshExec(
        "echo RAM_START && free -m | grep Mem && echo SWAP_START && swapon --show 2>/dev/null | head -2 && echo UPTIME_START && uptime -p && echo SERVICES_START && echo ollama:$(systemctl is-active ollama 2>/dev/null || echo disabled) && echo cloudflared:$(systemctl is-active cloudflared 2>/dev/null) && echo ssh:$(systemctl is-active ssh 2>/dev/null) && echo zramswap:$(systemctl is-active zramswap 2>/dev/null) && echo pm2:$(pm2 pid chefflow-beta >/dev/null 2>&1 && echo active || echo inactive) && echo WATCHDOG_START && (test -e /dev/watchdog && echo active || echo inactive)",
        10000
      )
      const lines = stdout.trim().split('\n')
      const ramLine = lines.find(l => l.startsWith('Mem:'))
      const uptimeLine = lines.find(l => l.startsWith('up '))
      const services = {}
      let inServices = false
      for (const l of lines) {
        if (l === 'SERVICES_START') { inServices = true; continue }
        if (l === 'WATCHDOG_START') { inServices = false; continue }
        if (inServices && l.includes(':')) {
          const [svc, status] = l.split(':')
          services[svc] = status
        }
      }
      const watchdogLine = lines[lines.length - 1]
      let ram = null
      if (ramLine) {
        const parts = ramLine.trim().split(/\s+/)
        ram = { total: parts[1] + ' MB', used: parts[2] + ' MB', free: parts[3] + ' MB', available: parts[6] + ' MB' }
      }
      infra.pi = {
        reachable: true,
        ram,
        uptime: uptimeLine || 'unknown',
        services,
        watchdog: watchdogLine === 'active' ? 'active' : 'inactive',
      }
    } catch {
      infra.pi = { reachable: false, error: 'Pi unreachable via SSH' }
    }
    return json(res, infra)
  }

  if (path === '/api/jobs' && method === 'GET') {
    const jobs = {}
    for (const [id, job] of runningJobs) {
      jobs[id] = { id: job.id, status: job.status, startTime: job.startTime, elapsed: Date.now() - job.startTime }
    }
    return json(res, jobs)
  }

  if (path === '/api/logs' && method === 'GET') {
    const lines = parseInt(url.searchParams.get('lines') || '100', 10)
    const logLines = await readPersistentLog(lines)
    return json(res, { lines: logLines })
  }

  // ── Chat endpoint (streaming) ──────────────────────────────────
  if (path === '/api/chat' && method === 'POST') {
    const body = await parseBody(req)
    const { message, history = [] } = body

    if (!message || typeof message !== 'string') {
      return json(res, { error: 'Message is required' }, 400)
    }

    const endpoint = await getAvailableOllamaEndpoint()
    if (!endpoint) {
      return json(res, { error: 'No Ollama instance available. Start Ollama on PC or Pi first.' }, 503)
    }

    log('chat', `Chat request via ${endpoint.source} (${endpoint.model})`, 'info')

    const systemPrompt = await buildChatSystemPrompt()
    const trimmedHistory = history.slice(-CHAT_CONFIG.maxHistoryMessages)
    const messages = [
      { role: 'system', content: systemPrompt },
      ...trimmedHistory,
      { role: 'user', content: message },
    ]

    res.writeHead(200, {
      'Content-Type': 'text/plain; charset=utf-8',
      'Transfer-Encoding': 'chunked',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'X-Chat-Source': endpoint.source,
    })

    try {
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), CHAT_CONFIG.timeoutMs)

      const ollamaRes = await fetch(`${endpoint.url}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: endpoint.model,
          messages,
          stream: true,
          options: { num_predict: CHAT_CONFIG.maxTokens },
        }),
        signal: controller.signal,
      })

      clearTimeout(timeout)

      if (!ollamaRes.ok) {
        res.write(JSON.stringify({ type: 'error', error: `Ollama returned ${ollamaRes.status}` }) + '\n')
        return res.end()
      }

      let fullResponse = ''
      const reader = ollamaRes.body.getReader()
      const decoder = new TextDecoder()

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value, { stream: true })
        const lines = chunk.split('\n').filter(l => l.trim())

        for (const line of lines) {
          try {
            const parsed = JSON.parse(line)
            if (parsed.message?.content) {
              fullResponse += parsed.message.content
              res.write(JSON.stringify({ type: 'token', content: parsed.message.content }) + '\n')
            }
          } catch { /* skip malformed lines */ }
        }
      }

      const { actions, results } = await parseAndExecuteActions(fullResponse)

      if (results.length > 0) {
        res.write(JSON.stringify({ type: 'action_results', results }) + '\n')
      }

      res.write(JSON.stringify({ type: 'done', fullResponse, actions }) + '\n')
      res.end()

    } catch (err) {
      const errMsg = err.name === 'AbortError' ? 'Request timed out' : err.message
      log('chat', `Chat error: ${errMsg}`, 'error')
      try {
        res.write(JSON.stringify({ type: 'error', error: errMsg }) + '\n')
        res.end()
      } catch { /* response already closed */ }
    }
    return
  }

  // 404
  res.writeHead(404)
  res.end('Not found')
}

// ── Server startup ────────────────────────────────────────────────

const server = createServer(handleRequest)

server.listen(PORT, '127.0.0.1', () => {
  console.log(`
  ╔═══════════════════════════════════════════════╗
  ║                                               ║
  ║    🍳  ChefFlow Mission Control               ║
  ║                                               ║
  ║    Dashboard: http://localhost:${PORT}           ║
  ║                                               ║
  ╚═══════════════════════════════════════════════╝
  `)
  log('system', `Mission Control started on port ${PORT}`, 'success')

  // Auto-open in browser
  const openCmd = process.platform === 'win32' ? 'start' : process.platform === 'darwin' ? 'open' : 'xdg-open'
  exec(`${openCmd} http://localhost:${PORT}`)
})

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.log(`Port ${PORT} already in use — dashboard may already be running.`)
    console.log(`Open http://localhost:${PORT} in your browser.`)
    const openCmd = process.platform === 'win32' ? 'start' : 'open'
    exec(`${openCmd} http://localhost:${PORT}`)
  } else {
    console.error('Server error:', err)
  }
  process.exit(1)
})

// Graceful shutdown
process.on('SIGINT', () => {
  log('system', 'Mission Control shutting down...', 'info')
  if (devServerProcess) {
    try { exec(`taskkill /PID ${devServerProcess.pid} /T /F`, { shell: 'cmd' }) } catch {}
  }
  server.close()
  process.exit(0)
})
