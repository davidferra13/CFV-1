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
import { readFile, writeFile, appendFile, stat } from 'node:fs/promises'
import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { promisify } from 'node:util'

const execAsync = promisify(exec)
const __dirname = dirname(fileURLToPath(import.meta.url))
const PROJECT_ROOT = join(__dirname, '..', '..')
const PORT = 41937
const PROJECT_TIMELINE_FILE = join(PROJECT_ROOT, 'docs', 'project-timeline.json')
const PROJECT_EXPENSES_FILE = join(PROJECT_ROOT, 'docs', 'project-expenses.json')
const UPTIME_HISTORY_FILE = join(PROJECT_ROOT, 'docs', 'uptime-history.json')
const ROLLBACK_HISTORY_FILE = join(PROJECT_ROOT, 'docs', 'rollback-history.json')
const BUNDLE_SIZE_FILE = join(PROJECT_ROOT, 'docs', 'bundle-size-history.json')

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
  prodUrl: 'https://cheflowhq.com',
  prodHealthUrl: 'https://cheflowhq.com/api/health',
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

// ── Error Buffer (for aggregation — must be before feedEvent) ─────
const errorBuffer = []
const ERROR_BUFFER_MAX = 500

// ── Live Feed (Observe panel) ─────────────────────────────────────
const liveFeedClients = new Set()
const liveFeedBuffers = {
  dev: [],
  ollama: [],
  beta: [],
  tunnel: [],
  system: [],
}
const MAX_FEED_BUFFER = 200 // per source
let liveFeedProcesses = {} // track spawned tailing processes
let liveFeedActive = false
const ANSI_REGEX = /\x1b\[[0-9;]*m/g

function feedEvent(source, message, level = 'info') {
  const entry = { source, message, level, ts: Date.now() }
  const buf = liveFeedBuffers[source]
  if (buf) {
    buf.push(entry)
    if (buf.length > MAX_FEED_BUFFER) buf.splice(0, 50)
  }
  // Track errors for aggregation
  if (level === 'error' || level === 'warn') {
    errorBuffer.push({ ts: Date.now(), source, message })
    if (errorBuffer.length > ERROR_BUFFER_MAX) errorBuffer.splice(0, 100)
  }
  for (const client of liveFeedClients) {
    try {
      client.write(`event: log\ndata: ${JSON.stringify(entry)}\n\n`)
    } catch { liveFeedClients.delete(client) }
  }
}

function parseLogLevel(text) {
  const lower = text.toLowerCase()
  if (lower.includes('error') || lower.includes('err ') || lower.includes('fatal') || lower.includes('econnrefused') || lower.includes('enoent')) return 'error'
  if (lower.includes('warn') || lower.includes('warning') || lower.includes('deprecated')) return 'warn'
  if (lower.includes('debug') || lower.includes('trace')) return 'debug'
  return 'info'
}

function startLiveFeedTaps() {
  if (liveFeedActive) return
  liveFeedActive = true

  // Tap dev server stdout — add secondary listener if process exists
  if (devServerProcess) {
    const devTap = (d) => {
      const text = d.toString().trim().replace(ANSI_REGEX, '')
      if (text) feedEvent('dev', text, parseLogLevel(text))
    }
    devServerProcess.stdout.on('data', devTap)
    devServerProcess.stderr.on('data', (d) => {
      const text = d.toString().trim().replace(ANSI_REGEX, '')
      if (text && !text.includes('ExperimentalWarning')) feedEvent('dev', text, 'warn')
    })
    liveFeedProcesses.devTap = devTap
  }

  // Tail Ollama logs on Windows
  const ollamaLogPath = join(process.env.LOCALAPPDATA || '', 'Ollama', 'logs', 'server.log')
  try {
    // Use PowerShell Get-Content -Wait for Windows tail -f equivalent
    const ollamaTail = spawn('powershell', ['-Command', `Get-Content -Path '${ollamaLogPath}' -Tail 20 -Wait`], {
      shell: false,
      stdio: ['ignore', 'pipe', 'pipe'],
    })
    ollamaTail.stdout.on('data', (d) => {
      const lines = d.toString().trim().split('\n')
      for (const line of lines) {
        const clean = line.trim().replace(ANSI_REGEX, '')
        if (clean) feedEvent('ollama', clean, parseLogLevel(clean))
      }
    })
    ollamaTail.stderr.on('data', () => {}) // silently ignore
    ollamaTail.on('close', () => { delete liveFeedProcesses.ollamaTail })
    liveFeedProcesses.ollamaTail = ollamaTail
  } catch {
    feedEvent('ollama', 'Could not tail Ollama logs — file may not exist', 'warn')
  }

  // Tail PM2 logs from Pi via SSH (streaming)
  try {
    const betaTail = spawn('ssh', ['-o', 'ConnectTimeout=5', '-o', 'ServerAliveInterval=30', 'pi',
      'pm2 logs chefflow-beta --lines 20 --raw --nostream; pm2 logs chefflow-beta --raw'], {
      shell: false,
      stdio: ['ignore', 'pipe', 'pipe'],
    })
    betaTail.stdout.on('data', (d) => {
      const lines = d.toString().trim().split('\n')
      for (const line of lines) {
        const clean = line.trim().replace(ANSI_REGEX, '')
        if (clean) feedEvent('beta', clean, parseLogLevel(clean))
      }
    })
    betaTail.stderr.on('data', (d) => {
      const text = d.toString().trim()
      if (text && !text.includes('Warning:')) feedEvent('beta', text, 'warn')
    })
    betaTail.on('close', () => { delete liveFeedProcesses.betaTail })
    liveFeedProcesses.betaTail = betaTail
  } catch {
    feedEvent('beta', 'Could not connect to Pi for beta logs', 'warn')
  }

  // Tail cloudflared journal from Pi via SSH
  try {
    const tunnelTail = spawn('ssh', ['-o', 'ConnectTimeout=5', '-o', 'ServerAliveInterval=30', 'pi',
      'journalctl -u cloudflared -n 20 -f --no-pager'], {
      shell: false,
      stdio: ['ignore', 'pipe', 'pipe'],
    })
    tunnelTail.stdout.on('data', (d) => {
      const lines = d.toString().trim().split('\n')
      for (const line of lines) {
        const clean = line.trim().replace(ANSI_REGEX, '')
        if (clean) feedEvent('tunnel', clean, parseLogLevel(clean))
      }
    })
    tunnelTail.stderr.on('data', () => {})
    tunnelTail.on('close', () => { delete liveFeedProcesses.tunnelTail })
    liveFeedProcesses.tunnelTail = tunnelTail
  } catch {
    feedEvent('tunnel', 'Could not connect to Pi for tunnel logs', 'warn')
  }

  // System metrics — push CPU/memory every 10 seconds
  liveFeedProcesses.systemInterval = setInterval(() => {
    const mem = process.memoryUsage()
    feedEvent('system', `Mission Control heap: ${(mem.heapUsed / 1024 / 1024).toFixed(1)} MB`, 'info')
  }, 10000)

  feedEvent('system', 'Live feed started — tapping all sources', 'info')
}

function stopLiveFeedTaps() {
  liveFeedActive = false
  // Kill all spawned tailing processes
  for (const [key, proc] of Object.entries(liveFeedProcesses)) {
    if (proc && typeof proc.kill === 'function') {
      try { proc.kill() } catch {}
    } else if (key === 'systemInterval') {
      clearInterval(proc)
    }
  }
  liveFeedProcesses = {}
}

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
  // Source NVM so pm2/node/npm are in PATH for non-interactive SSH
  const wrappedCmd = `source ~/.nvm/nvm.sh 2>/dev/null; ${cmd}`
  return execAsync(`ssh -o ConnectTimeout=5 pi "${wrappedCmd}"`, {
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
  // Dev server is "online" if it responds at all (even 500 = app bug, not server down)
  const responding = check.status > 0
  return {
    online: responding,
    latency: check.latency,
    port: CONFIG.devPort,
    status: check.status,
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
    feedEvent('dev', `Dev server exited (code ${code})`, code === 0 ? 'info' : 'error')
    devServerProcess = null
  })

  // If live feed is active, tap this new process
  if (liveFeedActive) {
    devServerProcess.stdout.on('data', (d) => {
      const text = d.toString().trim().replace(ANSI_REGEX, '')
      if (text) feedEvent('dev', text, parseLogLevel(text))
    })
    devServerProcess.stderr.on('data', (d) => {
      const text = d.toString().trim().replace(ANSI_REGEX, '')
      if (text && !text.includes('ExperimentalWarning')) feedEvent('dev', text, 'warn')
    })
  }

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
      child.on('close', async code => {
        log('rollback', code === 0 ? 'Rollback complete!' : `Rollback failed (code ${code})`, code === 0 ? 'success' : 'error')
        if (code === 0) {
          await logRollback({ trigger: 'manual', result: 'success' })
        }
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
      if (action === 'start') {
        // Unmask first in case it was masked, then start
        await sshExec('sudo systemctl unmask ollama 2>/dev/null; sudo systemctl start ollama')
      } else {
        await sshExec('sudo systemctl stop ollama')
      }
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

function localDateKeyFromSeconds(seconds) {
  const d = new Date(seconds * 1000)
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

function buildCommitSessions(timestampsAsc, gapSeconds) {
  if (!timestampsAsc.length) return []
  const sessions = []
  let start = timestampsAsc[0]
  let prev = timestampsAsc[0]

  for (let i = 1; i < timestampsAsc.length; i += 1) {
    const current = timestampsAsc[i]
    if ((current - prev) > gapSeconds) {
      sessions.push([start, prev])
      start = current
    }
    prev = current
  }
  sessions.push([start, prev])
  return sessions
}

function estimateSessionSeconds(sessions, { padSeconds, minSeconds, maxSeconds }) {
  let total = 0
  for (const [start, end] of sessions) {
    let duration = (end - start) + padSeconds
    if (duration < minSeconds) duration = minSeconds
    if (duration > maxSeconds) duration = maxSeconds
    total += duration
  }
  return total
}

function computeLongestStreak(dateKeysAsc) {
  if (!dateKeysAsc.length) return 0
  let longest = 1
  let current = 1
  for (let i = 1; i < dateKeysAsc.length; i += 1) {
    const prev = new Date(`${dateKeysAsc[i - 1]}T12:00:00`)
    const next = new Date(`${dateKeysAsc[i]}T12:00:00`)
    const deltaDays = Math.round((next - prev) / (24 * 60 * 60 * 1000))
    if (deltaDays === 1) {
      current += 1
      if (current > longest) longest = current
    } else {
      current = 1
    }
  }
  return longest
}

function toFiniteNumber(value, fallback = 0) {
  const n = Number(value)
  return Number.isFinite(n) ? n : fallback
}

function roundHours(value) {
  return Number(toFiniteNumber(value, 0).toFixed(1))
}

function normalizeHoursBlock(input = {}) {
  const low = roundHours(input.low ?? 0)
  const mid = roundHours(input.mid ?? input.midpoint ?? low)
  const high = roundHours(input.high ?? input.aggressive ?? mid)
  const upperBoundRaw = input.upperBound ?? input.upper
  const upperBound = upperBoundRaw == null ? null : roundHours(upperBoundRaw)
  return { low, mid, high, upperBound }
}

function defaultProjectTimelineData() {
  return {
    lastUpdated: null,
    assumptions: {
      earliestProjectWorkDate: null,
      notes: [],
    },
    estimatedHours: {
      trackedSinceTelemetry: { low: 0, mid: 0, high: 0, upperBound: null },
      preTelemetryRestartEra: { low: 0, mid: 0, high: 0, upperBound: null },
    },
    milestones: [],
  }
}

async function readProjectTimelineData() {
  try {
    const raw = await readFile(PROJECT_TIMELINE_FILE, 'utf-8')
    const parsed = JSON.parse(raw)
    const base = defaultProjectTimelineData()
    const merged = {
      ...base,
      ...parsed,
      assumptions: {
        ...base.assumptions,
        ...(parsed.assumptions || {}),
      },
      estimatedHours: {
        ...base.estimatedHours,
        ...(parsed.estimatedHours || {}),
      },
      milestones: Array.isArray(parsed.milestones) ? parsed.milestones : [],
    }
    return merged
  } catch {
    return defaultProjectTimelineData()
  }
}

async function writeProjectTimelineData(data) {
  await writeFile(PROJECT_TIMELINE_FILE, `${JSON.stringify(data, null, 2)}\n`)
}

function nextMilestoneId(milestones) {
  const max = milestones.reduce((acc, item) => {
    const raw = String(item?.id || '').replace(/^mil_/, '')
    const n = parseInt(raw, 10)
    return Number.isFinite(n) ? Math.max(acc, n) : acc
  }, 0)
  return `mil_${String(max + 1).padStart(3, '0')}`
}

function buildLifeTimelineView(timelineData, gitSummary) {
  const trackedFromFile = normalizeHoursBlock(timelineData.estimatedHours?.trackedSinceTelemetry || {})
  const preTelemetry = normalizeHoursBlock(timelineData.estimatedHours?.preTelemetryRestartEra || {})
  const gitModel = gitSummary
    ? normalizeHoursBlock({
      low: gitSummary.estimatedHours?.conservative ?? 0,
      mid: gitSummary.estimatedHours?.midpoint ?? 0,
      high: gitSummary.estimatedHours?.aggressive ?? 0,
    })
    : normalizeHoursBlock({})

  // Use the stronger tracked estimate between saved VS Code evidence and current git signal.
  const tracked = {
    low: roundHours(Math.max(trackedFromFile.low, gitModel.low)),
    mid: roundHours(Math.max(trackedFromFile.mid, gitModel.mid)),
    high: roundHours(Math.max(trackedFromFile.high, gitModel.high)),
    upperBound: trackedFromFile.upperBound == null
      ? null
      : roundHours(Math.max(trackedFromFile.upperBound, trackedFromFile.high, gitModel.high)),
  }

  const combined = {
    low: roundHours(tracked.low + preTelemetry.low),
    mid: roundHours(tracked.mid + preTelemetry.mid),
    high: roundHours(tracked.high + preTelemetry.high),
    upperBound: tracked.upperBound == null
      ? null
      : roundHours(tracked.upperBound + preTelemetry.high),
  }

  const milestones = [...(timelineData.milestones || [])]
    .filter(m => m && typeof m.date === 'string' && typeof m.title === 'string')
    .sort((a, b) => String(b.date).localeCompare(String(a.date)))
    .slice(0, 300)

  return {
    lastUpdated: timelineData.lastUpdated || null,
    assumptions: timelineData.assumptions || {},
    estimates: {
      tracked,
      preTelemetry,
      combined,
      gitOnly: gitModel,
    },
    anchors: {
      gitFirstTimestamp: gitSummary?.firstTimestamp || null,
      gitLastTimestamp: gitSummary?.lastTimestamp || null,
    },
    milestones,
  }
}

function cleanEventIdPart(value) {
  return String(value || '')
    .replace(/[^a-zA-Z0-9._-]+/g, '_')
    .slice(0, 80)
}

function parseSelectorDate(selector) {
  const text = String(selector || '')
  const at = text.lastIndexOf('@{')
  const close = text.endsWith('}')
  if (at === -1 || !close) return { ref: text, timestamp: null, dateRaw: null }
  const ref = text.slice(0, at)
  const dateRaw = text.slice(at + 2, -1)
  const ms = Date.parse(dateRaw)
  if (!Number.isFinite(ms)) return { ref, timestamp: null, dateRaw }
  return { ref, timestamp: Math.floor(ms / 1000), dateRaw }
}

function timestampFromDate(dateLike) {
  if (!dateLike) return null
  const ms = Date.parse(String(dateLike))
  if (Number.isFinite(ms)) return Math.floor(ms / 1000)
  return null
}

function classifyReflogMessage(message) {
  const lower = String(message || '').toLowerCase()
  if (!lower) return null
  if (lower.includes('update by push')) return 'push'
  if (lower.startsWith('branch: created')) return 'branch_created'
  if (lower.startsWith('branch: deleted')) return 'branch_deleted'
  if (lower.startsWith('branch: renamed')) return 'branch_renamed'
  if (lower.startsWith('checkout:')) return 'checkout'
  if (lower.startsWith('merge ')) return 'merge'
  if (lower.startsWith('rebase')) return 'rebase'
  if (lower.startsWith('reset:')) return 'reset'
  if (lower.startsWith('pull ')) return 'pull'
  if (lower.startsWith('cherry-pick')) return 'cherry_pick'
  return null
}

function titleForReflogEvent(type, ref, message) {
  if (type === 'push') return `Push: ${ref}`
  if (type === 'branch_created') return `Branch created: ${ref}`
  if (type === 'branch_deleted') return `Branch deleted: ${ref}`
  if (type === 'branch_renamed') return `Branch renamed: ${ref}`
  if (type === 'checkout') return `Checkout switch (${ref})`
  if (type === 'merge') return `Merge action (${ref})`
  if (type === 'rebase') return `Rebase action (${ref})`
  if (type === 'reset') return `Reset action (${ref})`
  if (type === 'pull') return `Pull action (${ref})`
  if (type === 'cherry_pick') return `Cherry-pick action (${ref})`
  return message || `Reflog event (${ref})`
}

async function getReflogTimelineEvents() {
  try {
    const { stdout } = await execAsync(
      'git reflog show --all --date=iso-strict --pretty=format:"%gD%x1f%gs%x1f%H"',
      { cwd: PROJECT_ROOT, maxBuffer: 30 * 1024 * 1024 }
    )
    const lines = stdout.split('\n').filter(line => line.trim())
    const out = []
    const seen = new Set()

    for (const line of lines) {
      const [selectorRaw, messageRaw, hashRaw] = line.split('\x1f')
      const message = String(messageRaw || '').trim()
      const type = classifyReflogMessage(message)
      if (!type) continue

      const parsed = parseSelectorDate(selectorRaw)
      if (!Number.isFinite(parsed.timestamp)) continue

      const hash = String(hashRaw || '').trim()
      const dedupeKey = `${type}|${parsed.ref}|${parsed.timestamp}|${message}`
      if (seen.has(dedupeKey)) continue
      seen.add(dedupeKey)

      const id = [
        'reflog',
        cleanEventIdPart(type),
        parsed.timestamp,
        cleanEventIdPart(parsed.ref),
        cleanEventIdPart(hash.slice(0, 8)),
      ].join('-')

      out.push({
        id,
        timestamp: parsed.timestamp,
        date: localDateKeyFromSeconds(parsed.timestamp),
        type,
        source: 'git-reflog',
        title: titleForReflogEvent(type, parsed.ref, message),
        details: message,
        branch: parsed.ref,
        hash: hash ? hash.slice(0, 12) : null,
      })
    }

    return out
  } catch {
    return []
  }
}

async function getFileLifecycleTimelineEvents() {
  try {
    const { stdout } = await execAsync(
      'git log --all --date=iso-strict --name-status --diff-filter=ADR --pretty=format:"__CF__%H%x1f%ad%x1f%an%x1f%s"',
      { cwd: PROJECT_ROOT, maxBuffer: 50 * 1024 * 1024 }
    )

    const lines = stdout.split('\n')
    const out = []
    let current = null
    let idx = 0

    for (const raw of lines) {
      const line = String(raw || '')
      if (line.startsWith('__CF__')) {
        const payload = line.slice('__CF__'.length)
        const [hash, dateIso, author, ...subjectParts] = payload.split('\x1f')
        const timestamp = timestampFromDate(dateIso)
        current = {
          hash: String(hash || ''),
          hashShort: String(hash || '').slice(0, 12),
          dateIso: String(dateIso || ''),
          author: String(author || 'Unknown'),
          subject: subjectParts.join('\x1f'),
          timestamp,
        }
        continue
      }

      if (!line.trim() || !current || !Number.isFinite(current.timestamp)) continue
      const cols = line.split('\t')
      const status = String(cols[0] || '').trim()
      if (!status) continue

      if (status === 'A' || status === 'D') {
        const path = String(cols[1] || '').trim()
        if (!path) continue
        idx += 1
        out.push({
          id: `file-${status.toLowerCase()}-${current.hashShort}-${idx}`,
          timestamp: current.timestamp,
          date: localDateKeyFromSeconds(current.timestamp),
          type: status === 'A' ? 'file_created' : 'file_deleted',
          source: 'git-files',
          title: `${status === 'A' ? 'File created' : 'File deleted'}: ${path}`,
          details: `Commit ${current.hashShort} by ${current.author}: ${current.subject}`,
          path,
          hash: current.hashShort,
          author: current.author,
        })
        continue
      }

      if (status.startsWith('R')) {
        const fromPath = String(cols[1] || '').trim()
        const toPath = String(cols[2] || '').trim()
        if (!fromPath || !toPath) continue
        idx += 1
        out.push({
          id: `file-r-${current.hashShort}-${idx}`,
          timestamp: current.timestamp,
          date: localDateKeyFromSeconds(current.timestamp),
          type: 'file_renamed',
          source: 'git-files',
          title: `File renamed: ${fromPath} -> ${toPath}`,
          details: `Commit ${current.hashShort} by ${current.author}: ${current.subject}`,
          path: toPath,
          fromPath,
          hash: current.hashShort,
          author: current.author,
        })
      }
    }

    return out
  } catch {
    return []
  }
}

function commitToTimelineEvent(commit) {
  return {
    id: `commit-${cleanEventIdPart(commit.hash)}`,
    timestamp: commit.timestamp,
    date: commit.date,
    type: 'commit',
    source: 'git',
    title: commit.message,
    details: `${commit.author} committed ${commit.hash}`,
    hash: commit.hash,
    author: commit.author,
  }
}

function milestoneToTimelineEvent(milestone, index) {
  const createdTs = timestampFromDate(milestone.createdAt)
  const dateTs = /^\d{4}-\d{2}-\d{2}$/.test(String(milestone.date || ''))
    ? timestampFromDate(`${milestone.date}T12:00:00`)
    : null
  const timestamp = Number.isFinite(createdTs) ? createdTs : dateTs
  if (!Number.isFinite(timestamp)) return null

  const low = toFiniteNumber(milestone.hoursLow, 0)
  const mid = toFiniteNumber(milestone.hoursMid, 0)
  const high = toFiniteNumber(milestone.hoursHigh, 0)
  const hoursText = (low > 0 || mid > 0 || high > 0) ? ` | hours ${low}/${mid}/${high}` : ''

  return {
    id: `milestone-${cleanEventIdPart(milestone.id || index + 1)}`,
    timestamp,
    date: localDateKeyFromSeconds(timestamp),
    type: 'milestone',
    source: milestone.source ? `timeline-${milestone.source}` : 'timeline',
    title: milestone.title || `Milestone ${index + 1}`,
    details: `${milestone.notes || ''}${hoursText}`.trim(),
    milestoneType: milestone.type || 'manual',
  }
}

function buildLinearTimelineBundle({ commits, timelineData, reflogEvents, fileEvents }) {
  const commitEvents = (commits || []).map(commitToTimelineEvent)
  const milestoneEvents = (timelineData.milestones || [])
    .map((m, i) => milestoneToTimelineEvent(m, i))
    .filter(Boolean)

  const events = [...commitEvents, ...milestoneEvents, ...(reflogEvents || []), ...(fileEvents || [])]
    .filter(e => e && Number.isFinite(e.timestamp))
    .sort((a, b) => {
      if (a.timestamp !== b.timestamp) return a.timestamp - b.timestamp
      return String(a.id).localeCompare(String(b.id))
    })

  const byType = {}
  const bySource = {}
  for (const event of events) {
    byType[event.type] = (byType[event.type] || 0) + 1
    bySource[event.source] = (bySource[event.source] || 0) + 1
  }

  const firstTimestamp = events.length ? events[0].timestamp : null
  const lastTimestamp = events.length ? events[events.length - 1].timestamp : null

  return {
    total: events.length,
    firstTimestamp,
    lastTimestamp,
    byType,
    bySource,
    availableTypes: Object.keys(byType).sort(),
    availableSources: Object.keys(bySource).sort(),
    events,
  }
}

async function getProjectTimeline() {
  try {
    const timelineData = await readProjectTimelineData()
    const { stdout } = await execAsync(
      'git log --pretty=format:"%h%x1f%ct%x1f%an%x1f%s"',
      { cwd: PROJECT_ROOT, maxBuffer: 10 * 1024 * 1024 }
    )
    const lines = stdout.trim().split('\n').filter(l => l.trim())
    const commits = lines.map(line => {
      const [hash, tsRaw, author, ...msgParts] = line.split('\x1f')
      const timestamp = Number(tsRaw)
      return {
        hash,
        timestamp,
        author: author || 'Unknown',
        message: msgParts.join('\x1f'),
        date: localDateKeyFromSeconds(timestamp),
      }
    }).filter(c => Number.isFinite(c.timestamp))

    const [reflogEvents, fileEvents] = await Promise.all([
      getReflogTimelineEvents(),
      getFileLifecycleTimelineEvents(),
    ])

    const linear = buildLinearTimelineBundle({
      commits,
      timelineData,
      reflogEvents,
      fileEvents,
    })

    if (!commits.length) {
      const life = buildLifeTimelineView(timelineData, null)
      return {
        ok: true,
        summary: null,
        commits: [],
        days: [],
        life,
        linear,
      }
    }

    const timestampsAsc = commits.map(c => c.timestamp).sort((a, b) => a - b)
    const firstTimestamp = timestampsAsc[0]
    const lastTimestamp = timestampsAsc[timestampsAsc.length - 1]
    const activeDateSet = new Set(commits.map(c => c.date))
    const activeDatesAsc = Array.from(activeDateSet).sort()
    const calendarSpanDays = Math.floor((lastTimestamp - firstTimestamp) / 86400) + 1
    const authors = Array.from(new Set(commits.map(c => c.author)))
    const sessions45 = buildCommitSessions(timestampsAsc, 45 * 60)
    const sessions90 = buildCommitSessions(timestampsAsc, 90 * 60)

    const conservative = estimateSessionSeconds(sessions45, {
      padSeconds: 10 * 60,
      minSeconds: 15 * 60,
      maxSeconds: 4 * 3600,
    })
    const midpoint = estimateSessionSeconds(sessions45, {
      padSeconds: 20 * 60,
      minSeconds: 25 * 60,
      maxSeconds: 6 * 3600,
    })
    const aggressive = estimateSessionSeconds(sessions90, {
      padSeconds: 30 * 60,
      minSeconds: 35 * 60,
      maxSeconds: 8 * 3600,
    })

    const dayMap = new Map()
    for (const c of commits) {
      if (!dayMap.has(c.date)) {
        dayMap.set(c.date, { date: c.date, commits: 0, firstTs: c.timestamp, lastTs: c.timestamp })
      }
      const d = dayMap.get(c.date)
      d.commits += 1
      if (c.timestamp < d.firstTs) d.firstTs = c.timestamp
      if (c.timestamp > d.lastTs) d.lastTs = c.timestamp
    }
    const days = Array.from(dayMap.values()).sort((a, b) => b.date.localeCompare(a.date))

    const summary = {
      totalCommits: commits.length,
      totalAuthors: authors.length,
      activeDays: activeDateSet.size,
      longestStreakDays: computeLongestStreak(activeDatesAsc),
      calendarSpanDays,
      firstTimestamp,
      lastTimestamp,
      commitsPerActiveDay: Number((commits.length / Math.max(1, activeDateSet.size)).toFixed(1)),
      sessions45m: sessions45.length,
      sessions90m: sessions90.length,
      estimatedHours: {
        conservative: Number((conservative / 3600).toFixed(1)),
        midpoint: Number((midpoint / 3600).toFixed(1)),
        aggressive: Number((aggressive / 3600).toFixed(1)),
      },
    }

    const life = buildLifeTimelineView(timelineData, summary)

    return {
      ok: true,
      summary,
      commits: commits.slice(0, 300),
      days: days.slice(0, 180),
      life,
      linear,
    }
  } catch (err) {
    return {
      ok: false,
      error: err.message,
      summary: null,
      commits: [],
      days: [],
      life: null,
      linear: null,
    }
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

// ── Soak Tests ──────────────────────────────────────────────────

function runSoakTest(quick = true) {
  const jobId = quick ? 'soak-quick' : 'soak-full'
  if (runningJobs.has(jobId)) return { ok: false, error: 'Soak test already in progress' }

  const label = quick ? 'Quick Soak (10 iterations)' : 'Full Soak (100 iterations)'
  log('test', `Starting ${label}...`, 'info')

  const env = { ...process.env }
  if (quick) {
    env.SOAK_ITERATIONS = '10'
    env.SOAK_CHECKPOINT_INTERVAL = '5'
  }

  // Soak tests need a build first, then run playwright with soak config
  const child = spawn('npx', ['next', 'build', '--no-lint'], {
    cwd: PROJECT_ROOT,
    shell: true,
    stdio: ['ignore', 'pipe', 'pipe'],
    env,
  })

  const job = { id: jobId, child, startTime: Date.now(), status: 'running', phase: 'building' }
  runningJobs.set(jobId, job)

  child.stdout.on('data', d => {
    d.toString().trim().split('\n').forEach(line => {
      if (line.trim()) log('test', `[build] ${line.trim()}`)
    })
  })
  child.stderr.on('data', d => {
    d.toString().trim().split('\n').forEach(line => {
      if (line.trim()) log('test', `[build] ${line.trim()}`, 'warn')
    })
  })
  child.on('close', buildCode => {
    if (buildCode !== 0) {
      job.status = 'failed'
      log('test', `Soak test aborted — build failed (code ${buildCode})`, 'error')
      runningJobs.delete(jobId)
      return
    }
    log('test', 'Build complete, starting soak tests...', 'info')
    job.phase = 'testing'

    const testChild = spawn('npx', ['playwright', 'test', '--config=playwright.soak.config.ts'], {
      cwd: PROJECT_ROOT,
      shell: true,
      stdio: ['ignore', 'pipe', 'pipe'],
      env,
    })
    job.child = testChild

    testChild.stdout.on('data', d => {
      d.toString().trim().split('\n').forEach(line => {
        if (line.trim()) log('test', line.trim())
      })
    })
    testChild.stderr.on('data', d => {
      d.toString().trim().split('\n').forEach(line => {
        if (line.trim()) log('test', line.trim(), 'warn')
      })
    })
    testChild.on('close', testCode => {
      job.status = testCode === 0 ? 'success' : 'failed'
      const duration = ((Date.now() - job.startTime) / 1000).toFixed(1)
      log('test', testCode === 0
        ? `${label} passed! (${duration}s) — no memory leaks detected`
        : `${label} failed (${duration}s) — check results for details`,
        testCode === 0 ? 'success' : 'error')
      runningJobs.delete(jobId)
    })
  })

  return { ok: true, message: `${label} started — building first, then running tests. Watch the log.` }
}

// ── E2E Tests ───────────────────────────────────────────────────

function runE2ETests(project) {
  const jobId = `e2e-${project || 'all'}`
  if (runningJobs.has(jobId)) return { ok: false, error: 'E2E tests already in progress' }

  const args = ['playwright', 'test']
  let label = 'All E2E Tests'
  if (project) {
    args.push('--project=' + project)
    label = `E2E Tests (${project})`
  }

  log('test', `Starting ${label}...`, 'info')
  const child = spawn('npx', args, {
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
    log('test', `${label} ${code === 0 ? 'passed' : 'failed'} (${duration}s)`, code === 0 ? 'success' : 'error')
    runningJobs.delete(jobId)
  })

  return { ok: true, message: `${label} started — watch the log` }
}

// ── Demo Data Reset ─────────────────────────────────────────────

function resetDemoData() {
  const jobId = 'demo-reset'
  if (runningJobs.has(jobId)) return { ok: false, error: 'Demo reset already in progress' }

  log('demo', 'Resetting demo data (clear + reload)...', 'info')
  const child = spawn('npm', ['run', 'demo:reset'], {
    cwd: PROJECT_ROOT,
    shell: true,
    stdio: ['ignore', 'pipe', 'pipe'],
  })

  const job = { id: jobId, child, startTime: Date.now(), status: 'running' }
  runningJobs.set(jobId, job)

  child.stdout.on('data', d => {
    d.toString().trim().split('\n').forEach(line => {
      if (line.trim()) log('demo', line.trim())
    })
  })
  child.stderr.on('data', d => {
    d.toString().trim().split('\n').forEach(line => {
      if (line.trim()) log('demo', line.trim(), 'warn')
    })
  })
  child.on('close', code => {
    job.status = code === 0 ? 'success' : 'failed'
    const duration = ((Date.now() - job.startTime) / 1000).toFixed(1)
    log('demo', code === 0
      ? `Demo data reset complete (${duration}s)`
      : `Demo data reset failed (${duration}s)`,
      code === 0 ? 'success' : 'error')
    runningJobs.delete(jobId)
  })

  return { ok: true, message: 'Demo data reset started — clearing old data and loading fresh' }
}

// ── Agent Account Setup ─────────────────────────────────────────

function setupAgentAccount() {
  const jobId = 'agent-setup'
  if (runningJobs.has(jobId)) return { ok: false, error: 'Agent setup already in progress' }

  log('agent', 'Setting up agent test account...', 'info')
  const child = spawn('npm', ['run', 'agent:setup'], {
    cwd: PROJECT_ROOT,
    shell: true,
    stdio: ['ignore', 'pipe', 'pipe'],
  })

  const job = { id: jobId, child, startTime: Date.now(), status: 'running' }
  runningJobs.set(jobId, job)

  child.stdout.on('data', d => {
    d.toString().trim().split('\n').forEach(line => {
      if (line.trim()) log('agent', line.trim())
    })
  })
  child.stderr.on('data', d => {
    d.toString().trim().split('\n').forEach(line => {
      if (line.trim()) log('agent', line.trim(), 'warn')
    })
  })
  child.on('close', code => {
    job.status = code === 0 ? 'success' : 'failed'
    log('agent', code === 0
      ? 'Agent account ready — credentials saved to .auth/agent.json'
      : 'Agent setup failed — check the log',
      code === 0 ? 'success' : 'error')
    runningJobs.delete(jobId)
  })

  return { ok: true, message: 'Setting up agent test account...' }
}

// ── Health Check Only (typecheck + build, no commit) ────────────

async function healthCheckOnly() {
  if (runningJobs.has('health-check')) return { ok: false, error: 'Health check already in progress' }

  log('health', '🏥 Health Check — typecheck + build (no commit)...', 'info')
  const job = { id: 'health-check', startTime: Date.now(), status: 'running' }
  runningJobs.set('health-check', job)

  // Step 1: Type check
  log('health', 'Step 1/2: Running type check...', 'info')
  try {
    await execAsync('npx tsc --noEmit --skipLibCheck', { cwd: PROJECT_ROOT, timeout: 120000 })
    log('health', 'Type check passed!', 'success')
  } catch (err) {
    log('health', `Type check failed: ${err.stderr || err.message}`, 'error')
    job.status = 'failed'
    runningJobs.delete('health-check')
    return { ok: false, error: `Type check failed: ${err.stderr || err.message}` }
  }

  // Step 2: Full build
  log('health', 'Step 2/2: Running full build...', 'info')
  try {
    await execAsync('npx next build --no-lint', { cwd: PROJECT_ROOT, timeout: 300000 })
    log('health', 'Build passed!', 'success')
  } catch (err) {
    log('health', `Build failed: ${err.stderr || err.message}`, 'error')
    job.status = 'failed'
    runningJobs.delete('health-check')
    return { ok: false, error: `Build failed: ${err.stderr || err.message}` }
  }

  job.status = 'success'
  const duration = ((Date.now() - job.startTime) / 1000).toFixed(1)
  log('health', `🏥 Health check passed! (${duration}s) — Ready to merge.`, 'success')
  runningJobs.delete('health-check')
  return { ok: true, message: `Health check passed (${duration}s). Type check ✓ Build ✓ — Ready to merge.` }
}

// ── List Migrations ─────────────────────────────────────────────

async function listMigrations() {
  try {
    const { readdir } = await import('node:fs/promises')
    const migrationsDir = join(PROJECT_ROOT, 'supabase', 'migrations')
    let files = await readdir(migrationsDir)
    files = files.filter(f => f.endsWith('.sql')).sort()
    const latest = files.length > 0 ? files[files.length - 1] : 'none'
    const latestTimestamp = latest !== 'none' ? latest.match(/^(\d+)/)?.[1] || 'unknown' : 'none'
    return {
      ok: true,
      migrations: files.map(f => {
        const ts = f.match(/^(\d+)/)?.[1] || ''
        const name = f.replace(/^\d+_/, '').replace('.sql', '')
        return { file: f, timestamp: ts, name }
      }),
      total: files.length,
      latestTimestamp,
      message: `${files.length} migrations. Latest timestamp: ${latestTimestamp}`,
    }
  } catch (err) {
    return { ok: false, error: err.message, migrations: [], total: 0 }
  }
}

// ── Uptime History (poll every 60s, store 24h rolling) ───────────

const uptimeHistory = { beta: [], prod: [], pi: [] }
const UPTIME_MAX_ENTRIES = 1440 // 24h at 60s intervals

async function loadUptimeHistory() {
  try {
    const raw = await readFile(UPTIME_HISTORY_FILE, 'utf-8')
    const data = JSON.parse(raw)
    if (data.beta) uptimeHistory.beta = data.beta
    if (data.prod) uptimeHistory.prod = data.prod
    if (data.pi) uptimeHistory.pi = data.pi
  } catch { /* file doesn't exist yet */ }
}

async function saveUptimeHistory() {
  try {
    await writeFile(UPTIME_HISTORY_FILE, JSON.stringify(uptimeHistory) + '\n')
  } catch { /* ignore write errors */ }
}

async function pollUptime() {
  const ts = Date.now()
  const [beta, prod] = await Promise.allSettled([
    httpCheck(CONFIG.betaHealthUrl, 6000),
    httpCheck(CONFIG.prodHealthUrl, 6000),
  ])
  const betaOk = beta.status === 'fulfilled' && beta.value.ok
  const prodOk = prod.status === 'fulfilled' && prod.value.ok

  let piOk = false
  try {
    await sshExec('echo ok', 5000)
    piOk = true
  } catch { /* pi unreachable */ }

  uptimeHistory.beta.push({ ts, ok: betaOk })
  uptimeHistory.prod.push({ ts, ok: prodOk })
  uptimeHistory.pi.push({ ts, ok: piOk })

  // Trim to 24h
  for (const key of ['beta', 'prod', 'pi']) {
    if (uptimeHistory[key].length > UPTIME_MAX_ENTRIES) {
      uptimeHistory[key] = uptimeHistory[key].slice(-UPTIME_MAX_ENTRIES)
    }
  }

  // Broadcast downtime notifications via SSE
  if (!betaOk) feedEvent('system', 'ALERT: Beta server is DOWN', 'error')
  if (!prodOk) feedEvent('system', 'ALERT: Production is DOWN', 'error')
  if (!piOk) feedEvent('system', 'ALERT: Raspberry Pi is UNREACHABLE', 'error')

  saveUptimeHistory().catch(() => {})
}

function computeUptimeStats(entries) {
  if (!entries.length) return { percentage: 100, total: 0, up: 0, down: 0, downtimeWindows: [] }
  const up = entries.filter(e => e.ok).length
  const down = entries.length - up
  const percentage = Number(((up / entries.length) * 100).toFixed(2))

  // Find downtime windows
  const windows = []
  let windowStart = null
  for (const entry of entries) {
    if (!entry.ok && !windowStart) {
      windowStart = entry.ts
    } else if (entry.ok && windowStart) {
      windows.push({ start: windowStart, end: entry.ts, duration: entry.ts - windowStart })
      windowStart = null
    }
  }
  if (windowStart) {
    windows.push({ start: windowStart, end: Date.now(), duration: Date.now() - windowStart, ongoing: true })
  }

  return { percentage, total: entries.length, up, down, downtimeWindows: windows.slice(-10) }
}

function getUptimeReport() {
  return {
    ok: true,
    beta: computeUptimeStats(uptimeHistory.beta),
    prod: computeUptimeStats(uptimeHistory.prod),
    pi: computeUptimeStats(uptimeHistory.pi),
    message: `Beta: ${computeUptimeStats(uptimeHistory.beta).percentage}% | Prod: ${computeUptimeStats(uptimeHistory.prod).percentage}% | Pi: ${computeUptimeStats(uptimeHistory.pi).percentage}%`,
  }
}

// ── Error Aggregation ────────────────────────────────────────────

function getErrorAggregation() {
  const oneHourAgo = Date.now() - 3600000
  const recent = errorBuffer.filter(e => e.ts >= oneHourAgo)
  const grouped = {}
  for (const entry of recent) {
    // Normalize error messages (strip timestamps, PIDs, etc.)
    const key = entry.message.replace(/\d{4}-\d{2}-\d{2}T[\d:.]+Z?/g, '').replace(/pid \d+/g, 'pid X').trim().slice(0, 120)
    if (!grouped[key]) grouped[key] = { message: entry.message, count: 0, lastSeen: 0, source: entry.source }
    grouped[key].count++
    if (entry.ts > grouped[key].lastSeen) grouped[key].lastSeen = entry.ts
  }
  const top5 = Object.values(grouped).sort((a, b) => b.count - a.count).slice(0, 5)
  return {
    ok: true,
    totalErrors: recent.length,
    top5,
    timeWindow: '1 hour',
    message: `${recent.length} errors in the last hour. Top: ${top5.length > 0 ? top5[0].message.slice(0, 60) : 'none'}`,
  }
}

// ── Rollback History ─────────────────────────────────────────────

async function logRollback(details) {
  try {
    let history = []
    try {
      const raw = await readFile(ROLLBACK_HISTORY_FILE, 'utf-8')
      history = JSON.parse(raw)
    } catch { /* file doesn't exist */ }
    history.push({
      timestamp: new Date().toISOString(),
      ...details,
    })
    await writeFile(ROLLBACK_HISTORY_FILE, JSON.stringify(history, null, 2) + '\n')
  } catch { /* ignore write errors */ }
}

async function getRollbackHistory() {
  try {
    const raw = await readFile(ROLLBACK_HISTORY_FILE, 'utf-8')
    const history = JSON.parse(raw)
    return { ok: true, entries: history, total: history.length }
  } catch {
    return { ok: true, entries: [], total: 0, message: 'No rollback history found' }
  }
}

// ── Git Diff (for diff viewer) ───────────────────────────────────

async function getGitDiff() {
  try {
    const [statResult, diffResult] = await Promise.all([
      execAsync('git diff --stat', { cwd: PROJECT_ROOT, maxBuffer: 2 * 1024 * 1024 }),
      execAsync('git diff --no-color', { cwd: PROJECT_ROOT, maxBuffer: 5 * 1024 * 1024 }),
    ])
    // Also get staged diff
    const [stagedStatResult, stagedDiffResult] = await Promise.all([
      execAsync('git diff --staged --stat', { cwd: PROJECT_ROOT, maxBuffer: 2 * 1024 * 1024 }),
      execAsync('git diff --staged --no-color', { cwd: PROJECT_ROOT, maxBuffer: 5 * 1024 * 1024 }),
    ])
    return {
      ok: true,
      unstaged: {
        stat: statResult.stdout.trim(),
        diff: diffResult.stdout.slice(0, 50000), // Cap at 50KB
      },
      staged: {
        stat: stagedStatResult.stdout.trim(),
        diff: stagedDiffResult.stdout.slice(0, 50000),
      },
    }
  } catch (err) {
    return { ok: false, error: err.message }
  }
}

// ── npm Audit ────────────────────────────────────────────────────

async function npmAudit() {
  try {
    const { stdout } = await execAsync('npm audit --json 2>/dev/null || true', {
      cwd: PROJECT_ROOT,
      timeout: 30000,
      maxBuffer: 2 * 1024 * 1024,
    })
    const data = JSON.parse(stdout)
    const meta = data.metadata || {}
    return {
      ok: true,
      vulnerabilities: data.vulnerabilities ? Object.keys(data.vulnerabilities).length : 0,
      severity: {
        critical: meta.vulnerabilities?.critical || 0,
        high: meta.vulnerabilities?.high || 0,
        moderate: meta.vulnerabilities?.moderate || 0,
        low: meta.vulnerabilities?.low || 0,
        info: meta.vulnerabilities?.info || 0,
      },
      totalDeps: meta.dependencies || 0,
      message: `${meta.vulnerabilities?.critical || 0} critical, ${meta.vulnerabilities?.high || 0} high, ${meta.vulnerabilities?.moderate || 0} moderate`,
    }
  } catch (err) {
    return { ok: false, error: err.message }
  }
}

// ── Bundle Size Tracking ─────────────────────────────────────────

async function captureBundleSize() {
  try {
    const buildManifest = join(PROJECT_ROOT, '.next', 'build-manifest.json')
    const raw = await readFile(buildManifest, 'utf-8')
    const manifest = JSON.parse(raw)
    const routeCount = Object.keys(manifest.pages || {}).length

    // Get total .next size
    const { stdout } = await execAsync(
      process.platform === 'win32'
        ? 'powershell -Command "(Get-ChildItem .next -Recurse | Measure-Object -Property Length -Sum).Sum"'
        : 'du -sb .next | cut -f1',
      { cwd: PROJECT_ROOT, timeout: 15000 }
    )
    const totalBytes = parseInt(stdout.trim()) || 0

    const entry = {
      timestamp: new Date().toISOString(),
      totalBytes,
      totalMB: Number((totalBytes / 1024 / 1024).toFixed(1)),
      routeCount,
    }

    // Append to history
    let history = []
    try {
      const histRaw = await readFile(BUNDLE_SIZE_FILE, 'utf-8')
      history = JSON.parse(histRaw)
    } catch { /* file doesn't exist */ }
    history.push(entry)
    if (history.length > 100) history = history.slice(-100)
    await writeFile(BUNDLE_SIZE_FILE, JSON.stringify(history, null, 2) + '\n')

    return { ok: true, current: entry, history, message: `Bundle: ${entry.totalMB} MB, ${routeCount} routes` }
  } catch (err) {
    return { ok: false, error: err.message }
  }
}

async function getBundleSizeHistory() {
  try {
    const raw = await readFile(BUNDLE_SIZE_FILE, 'utf-8')
    const history = JSON.parse(raw)
    return { ok: true, history, total: history.length }
  } catch {
    return { ok: true, history: [], total: 0, message: 'No bundle size history — run a build first' }
  }
}

// ── Environment Variable Comparison ──────────────────────────────

async function compareEnvFiles() {
  const files = {
    dev: join(PROJECT_ROOT, '.env.local'),
    beta: join(PROJECT_ROOT, '.env.local.beta'),
  }
  const envKeys = {}
  for (const [env, filepath] of Object.entries(files)) {
    try {
      const content = await readFile(filepath, 'utf-8')
      envKeys[env] = content.split('\n')
        .map(l => l.trim())
        .filter(l => l && !l.startsWith('#'))
        .map(l => l.split('=')[0].trim())
        .filter(Boolean)
        .sort()
    } catch {
      envKeys[env] = null // file not found
    }
  }

  // Find differences (keys only — never values)
  const allKeys = new Set()
  for (const keys of Object.values(envKeys)) {
    if (keys) keys.forEach(k => allKeys.add(k))
  }

  const comparison = []
  for (const key of Array.from(allKeys).sort()) {
    const entry = { key }
    for (const [env, keys] of Object.entries(envKeys)) {
      entry[env] = keys ? keys.includes(key) : null
    }
    comparison.push(entry)
  }

  const missing = comparison.filter(c => Object.values(c).some(v => v === false))
  return {
    ok: true,
    comparison,
    missing,
    environments: Object.keys(files),
    message: `${missing.length} keys missing in at least one environment`,
  }
}

// ── Scheduled DB Backups ─────────────────────────────────────────

let scheduledBackupTimer = null

async function scheduledDbBackup() {
  const timestamp = new Date().toISOString().slice(0, 10).replace(/-/g, '')
  const backupDir = join(PROJECT_ROOT, 'backups')
  const filename = `backup-${timestamp}.sql`

  try {
    // Ensure backups directory exists
    const { mkdir } = await import('node:fs/promises')
    await mkdir(backupDir, { recursive: true })

    log('backup', `Scheduled backup starting: ${filename}...`, 'info')
    await execAsync(`npx supabase db dump --linked > "${join(backupDir, filename)}"`, {
      cwd: PROJECT_ROOT,
      timeout: 120000,
    })
    log('backup', `Scheduled backup saved: backups/${filename}`, 'success')

    // Retention: keep last 7
    const { readdir, unlink } = await import('node:fs/promises')
    const files = (await readdir(backupDir)).filter(f => f.startsWith('backup-') && f.endsWith('.sql')).sort()
    while (files.length > 7) {
      const old = files.shift()
      await unlink(join(backupDir, old))
      log('backup', `Removed old backup: ${old}`, 'info')
    }

    return { ok: true, message: `Backup saved: backups/${filename}` }
  } catch (err) {
    log('backup', `Scheduled backup failed: ${err.message}`, 'error')
    return { ok: false, error: err.message }
  }
}

function startScheduledBackups() {
  // Run daily at 3 AM
  const now = new Date()
  const next3am = new Date(now)
  next3am.setHours(3, 0, 0, 0)
  if (next3am <= now) next3am.setDate(next3am.getDate() + 1)
  const msUntil3am = next3am - now

  log('backup', `Scheduled daily backup — next run in ${Math.round(msUntil3am / 60000)} minutes (3:00 AM)`, 'info')

  setTimeout(() => {
    scheduledDbBackup()
    // Then repeat every 24 hours
    scheduledBackupTimer = setInterval(scheduledDbBackup, 24 * 60 * 60 * 1000)
  }, msUntil3am)
}

// ── Migration SQL Reader ─────────────────────────────────────────

async function readMigrationSql(filename) {
  try {
    const filepath = join(PROJECT_ROOT, 'supabase', 'migrations', filename)
    const content = await readFile(filepath, 'utf-8')
    return { ok: true, filename, sql: content.slice(0, 100000), size: content.length }
  } catch (err) {
    return { ok: false, error: err.message }
  }
}

// ── Supabase Connection Health ───────────────────────────────────

async function checkSupabaseHealth() {
  if (!CONFIG.supabaseUrl || !CONFIG.supabaseServiceKey) {
    return { ok: false, error: 'Supabase credentials not configured' }
  }
  const start = Date.now()
  try {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 5000)
    const res = await fetch(`${CONFIG.supabaseUrl}/rest/v1/?limit=0`, {
      headers: {
        'apikey': CONFIG.supabaseServiceKey,
        'Authorization': `Bearer ${CONFIG.supabaseServiceKey}`,
      },
      signal: controller.signal,
    })
    clearTimeout(timer)
    const latency = Date.now() - start
    return {
      ok: res.ok,
      status: res.status,
      latency,
      message: `Supabase: ${res.ok ? 'healthy' : 'error'} (${latency}ms)`,
    }
  } catch (err) {
    return { ok: false, latency: Date.now() - start, error: err.message }
  }
}

// ── SSL Certificate Check ────────────────────────────────────────

async function checkSSLCerts() {
  const domains = ['beta.cheflowhq.com', 'app.cheflowhq.com', 'cheflowhq.com']
  const results = {}
  for (const domain of domains) {
    try {
      const { stdout } = await execAsync(
        `powershell -Command "[Net.ServicePointManager]::ServerCertificateValidationCallback = {$true}; $req = [Net.HttpWebRequest]::Create('https://${domain}'); $req.Timeout = 5000; try { $resp = $req.GetResponse(); $cert = $req.ServicePoint.Certificate; Write-Output ($cert.GetExpirationDateString()); $resp.Close() } catch { Write-Output 'ERROR' }"`,
        { timeout: 10000 }
      )
      const expiry = stdout.trim()
      if (expiry && expiry !== 'ERROR') {
        const expiryDate = new Date(expiry)
        const daysUntil = Math.floor((expiryDate - new Date()) / 86400000)
        results[domain] = { valid: true, expires: expiryDate.toISOString().slice(0, 10), daysUntil }
      } else {
        results[domain] = { valid: false, error: 'Could not read cert' }
      }
    } catch {
      results[domain] = { valid: false, error: 'Check failed' }
    }
  }
  return { ok: true, certs: results }
}

// ── Stripe Webhook Health ────────────────────────────────────────

async function checkStripeWebhookHealth() {
  // Query the dev server's health/webhook endpoint if available
  try {
    const devOnline = await httpCheck(`http://localhost:${CONFIG.devPort}`)
    if (!devOnline.ok) return { ok: false, error: 'Dev server offline — cannot check webhooks' }

    // Check if stripe webhook events table exists in Supabase
    const result = await supabaseQuery('stripe_webhook_events', {
      select: 'id,event_type,created_at,status',
      order: 'created_at.desc',
      limit: 5,
    })
    if (result.ok) {
      const events = result.data
      const lastEvent = events[0]
      return {
        ok: true,
        lastReceived: lastEvent?.created_at || 'never',
        recentCount: events.length,
        events: events.map(e => ({
          type: e.event_type,
          status: e.status,
          received: e.created_at?.slice(0, 19) || '',
        })),
        message: lastEvent ? `Last webhook: ${lastEvent.event_type} at ${lastEvent.created_at?.slice(0, 19)}` : 'No webhooks recorded',
      }
    }
    return { ok: true, message: 'Stripe webhook table not found — webhooks may not be configured', events: [] }
  } catch (err) {
    return { ok: false, error: err.message }
  }
}

// ── Email Delivery Health (Resend) ───────────────────────────────

async function checkEmailHealth() {
  const resendKey = process.env.RESEND_API_KEY
  if (!resendKey) return { ok: false, error: 'RESEND_API_KEY not configured' }
  try {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 5000)
    const res = await fetch('https://api.resend.com/emails?limit=5', {
      headers: { Authorization: `Bearer ${resendKey}` },
      signal: controller.signal,
    })
    clearTimeout(timer)
    if (!res.ok) return { ok: false, error: `Resend API returned ${res.status}` }
    const data = await res.json()
    const emails = data.data || []
    return {
      ok: true,
      recentCount: emails.length,
      lastSent: emails[0]?.created_at || 'never',
      emails: emails.map(e => ({
        to: e.to?.[0] || '',
        subject: e.subject || '',
        status: e.last_event || 'sent',
        sent: e.created_at?.slice(0, 19) || '',
      })),
      message: emails.length > 0 ? `Last email: "${emails[0].subject}" (${emails[0].last_event || 'sent'})` : 'No recent emails',
    }
  } catch (err) {
    return { ok: false, error: err.message }
  }
}

// ── API Rate Limit Monitoring ────────────────────────────────────

function getApiRateLimitInfo() {
  // Static info about API limits — actual usage tracking would require wrapping each API call
  const services = [
    { name: 'Spoonacular', envKey: 'SPOONACULAR_API_KEY', dailyLimit: 150, note: 'Free tier: 150 points/day' },
    { name: 'Kroger', envKey: 'KROGER_CLIENT_ID', dailyLimit: 10000, note: 'Standard: 10K calls/day' },
    { name: 'MealMe', envKey: 'MEALME_API_KEY', dailyLimit: 1000, note: 'Varies by plan' },
    { name: 'Instacart', envKey: 'INSTACART_API_KEY', dailyLimit: null, note: 'Cart links only — no pricing API' },
    { name: 'Resend', envKey: 'RESEND_API_KEY', dailyLimit: 100, note: 'Free tier: 100 emails/day, 3K/month' },
    { name: 'Vercel', envKey: 'VERCEL_TOKEN', dailyLimit: null, note: 'Pro plan — no hard daily limit' },
  ]
  return {
    ok: true,
    services: services.map(s => ({
      ...s,
      configured: !!process.env[s.envKey],
    })),
    message: `${services.filter(s => process.env[s.envKey]).length}/${services.length} APIs configured`,
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

  // Testing & QA
  'test/soak-quick':  { fn: () => runSoakTest(true),              desc: 'Run quick soak test (10 iterations) — checks for memory leaks' },
  'test/soak-full':   { fn: () => runSoakTest(false),             desc: 'Run full soak test (100 iterations) — thorough memory leak check' },
  'test/e2e':         { fn: (param) => runE2ETests(param),        desc: 'Run E2E tests (use test/e2e:smoke for smoke tests, or test/e2e for all)' },

  // Demo & Setup
  'demo/reset':       { fn: resetDemoData,                        desc: 'Reset demo data — clears old demo data and reloads fresh' },
  'agent/setup':      { fn: setupAgentAccount,                    desc: 'Set up the agent test account for UI testing' },

  // Health & Verification
  'health/check':     { fn: healthCheckOnly,                      desc: 'Full health check (typecheck + build) without committing — shows if code is ready to merge' },
  'db/migrations':    { fn: listMigrations,                       desc: 'List all database migrations and show the latest timestamp' },

  // Remy Bridge
  'remy/ask':         { fn: (param) => askRemy(param),            desc: 'Ask Remy (business AI) a question — requires dev server running. Use remy/ask:your question here' },

  // New: Monitoring & Health
  'uptime/report':    { fn: getUptimeReport,                      desc: 'Get uptime report for beta, prod, and Pi (last 24h)' },
  'errors/top':       { fn: getErrorAggregation,                  desc: 'Get top 5 errors in the last hour from all log sources' },
  'rollback/history': { fn: getRollbackHistory,                   desc: 'Show rollback history — when and what was rolled back' },
  'git/diff':         { fn: getGitDiff,                           desc: 'Show git diff — unstaged and staged changes with file stats' },
  'audit/npm':        { fn: npmAudit,                             desc: 'Run npm audit and show vulnerability summary' },
  'bundle/size':      { fn: getBundleSizeHistory,                 desc: 'Show bundle size history and trends' },
  'bundle/capture':   { fn: captureBundleSize,                    desc: 'Capture current bundle size snapshot (requires a build first)' },
  'env/compare':      { fn: compareEnvFiles,                      desc: 'Compare environment variable keys across dev/beta (keys only, never values)' },
  'backup/now':       { fn: scheduledDbBackup,                    desc: 'Run a database backup right now (saves to backups/ with 7-day retention)' },
  'supabase/health':  { fn: checkSupabaseHealth,                  desc: 'Check Supabase database connection health and latency' },
  'ssl/check':        { fn: checkSSLCerts,                        desc: 'Check SSL certificate expiration for all domains' },
  'stripe/health':    { fn: checkStripeWebhookHealth,             desc: 'Check Stripe webhook health — last received, recent events' },
  'email/health':     { fn: checkEmailHealth,                     desc: 'Check email delivery health (Resend API) — recent sends, status' },
  'api/limits':       { fn: getApiRateLimitInfo,                  desc: 'Show API rate limits and configuration status for all external services' },
}

async function getAvailableOllamaEndpoint() {
  const pcCheck = await httpCheck(`${CONFIG.ollamaPcUrl}/api/tags`)
  if (pcCheck.ok) return { url: CONFIG.ollamaPcUrl, model: CONFIG.ollamaPcModel, source: 'PC' }
  const piCheck = await httpCheck(`${CONFIG.ollamaPiUrl}/api/tags`)
  if (piCheck.ok) return { url: CONFIG.ollamaPiUrl, model: CONFIG.ollamaPiModel, source: 'Pi' }
  return null
}

async function buildChatSystemPrompt(memories = []) {
  const status = await getAllStatus()
  const toolList = Object.entries(TOOLS)
    .map(([name, { desc }]) => `  - ${name}: ${desc}`)
    .join('\n')

  const memoriesSection = memories.length > 0
    ? `\n## Developer Memories (things they told you to remember)\n${memories.map(m => `- [${m.category}] ${m.content}`).join('\n')}\nUse these naturally when relevant. Don't list them unless asked.\n`
    : ''

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

## Memory Commands
When the developer says "remember that...", "remember:", "note that...", respond normally AND include a memory tag:
<memory_save category="dev_preference">the thing to remember</memory_save>

Categories: dev_preference, project_pattern, deploy_note, debug_insight, workflow_preference

When they say "forget...", "stop remembering...", "delete memory...", include:
<memory_delete>keyword from the memory to delete</memory_delete>

When they say "show memories", "what do you remember", list the memories from the section above.
${memoriesSection}
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
    const actionStart = Date.now()
    try {
      const result = await tool.fn(param)
      const duration = Date.now() - actionStart
      const preview = typeof result === 'string' ? result.slice(0, 200) : JSON.stringify(result || '').slice(0, 200)
      results.push({ action: actionName, ok: true, result, duration, preview, param })
      log('chat', `Action ${actionName} completed (${duration}ms)`, 'success')
    } catch (err) {
      const duration = Date.now() - actionStart
      results.push({ action: actionName, ok: false, error: err.message, duration, param })
      log('chat', `Action ${actionName} failed (${duration}ms): ${err.message}`, 'error')
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

  // Live Feed SSE stream (Observe panel)
  if (path === '/api/livefeed' && method === 'GET') {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
      'Access-Control-Allow-Origin': '*',
    })

    // Start tailing processes if not already running
    startLiveFeedTaps()

    // Replay recent buffer entries as backfill
    for (const source of Object.keys(liveFeedBuffers)) {
      for (const entry of liveFeedBuffers[source].slice(-30)) {
        res.write(`event: log\ndata: ${JSON.stringify(entry)}\n\n`)
      }
    }

    // Send a heartbeat every 15s to keep the connection alive
    const heartbeat = setInterval(() => {
      try { res.write(`event: ping\ndata: {}\n\n`) } catch { clearInterval(heartbeat) }
    }, 15000)

    liveFeedClients.add(res)
    req.on('close', () => {
      liveFeedClients.delete(res)
      clearInterval(heartbeat)
      // Stop tailing if no more clients
      if (liveFeedClients.size === 0) stopLiveFeedTaps()
    })
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
  if (path === '/api/project/timeline' && method === 'GET') {
    return json(res, await getProjectTimeline())
  }
  if (path === '/api/project/timeline/milestones' && method === 'POST') {
    const body = await parseBody(req)
    const date = String(body.date || '').trim()
    const title = String(body.title || '').trim()
    const notes = String(body.notes || '').trim()
    const type = String(body.type || 'manual').trim()
    const source = String(body.source || 'mission-control').trim()
    const hoursLow = toFiniteNumber(body.hoursLow, 0)
    const hoursMid = toFiniteNumber(body.hoursMid, 0)
    const hoursHigh = toFiniteNumber(body.hoursHigh, 0)

    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return json(res, { ok: false, error: 'date must be YYYY-MM-DD' }, 400)
    }
    if (!title) {
      return json(res, { ok: false, error: 'title is required' }, 400)
    }

    try {
      const timelineData = await readProjectTimelineData()
      const milestones = Array.isArray(timelineData.milestones) ? timelineData.milestones : []
      const milestone = {
        id: nextMilestoneId(milestones),
        date,
        title,
        type,
        source,
        notes,
        hoursLow: roundHours(hoursLow),
        hoursMid: roundHours(hoursMid),
        hoursHigh: roundHours(hoursHigh),
        createdAt: new Date().toISOString(),
      }
      milestones.push(milestone)
      timelineData.milestones = milestones
      timelineData.lastUpdated = new Date().toISOString().slice(0, 10)
      await writeProjectTimelineData(timelineData)
      log('timeline', `Added milestone: ${title} (${date})`, 'info')
      return json(res, { ok: true, milestone })
    } catch (err) {
      return json(res, { ok: false, error: `Failed to save milestone: ${err.message}` }, 500)
    }
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

  // Testing & QA routes
  if (path === '/api/test/soak-quick' && method === 'POST') {
    return json(res, runSoakTest(true))
  }
  if (path === '/api/test/soak-full' && method === 'POST') {
    return json(res, runSoakTest(false))
  }
  if (path === '/api/test/e2e' && method === 'POST') {
    const body = await parseBody(req)
    return json(res, runE2ETests(body.project))
  }

  // Demo & Setup routes
  if (path === '/api/demo/reset' && method === 'POST') {
    return json(res, resetDemoData())
  }
  if (path === '/api/agent/setup' && method === 'POST') {
    return json(res, setupAgentAccount())
  }

  // Health check & migrations routes
  if (path === '/api/health/check' && method === 'POST') {
    return json(res, await healthCheckOnly())
  }
  if (path === '/api/db/migrations' && method === 'GET') {
    return json(res, await listMigrations())
  }

  // ── Infrastructure info (Pi health, ports, quick links) ──────────
  if (path === '/api/infra' && method === 'GET') {
    const infra = {
      ports: {
        dev: { port: 3100, label: 'Dev Server', url: 'http://localhost:3100' },
        launcher: { port: PORT, label: 'Mission Control', url: `http://localhost:${PORT}` },
        soak: { port: 3200, label: 'Soak Tests', url: 'http://localhost:3200' },
        beta: { port: 443, label: 'Beta', url: 'https://beta.cheflowhq.com' },
        prod: { port: 443, label: 'Production', url: 'https://cheflowhq.com' },
        ollamaPc: { port: 11434, label: 'Ollama PC', url: 'http://localhost:11434' },
        ollamaPi: { port: 11434, label: 'Ollama Pi', url: 'http://10.0.0.177:11434' },
      },
      quickLinks: {
        supabase: 'https://supabase.com/dashboard/project/luefkpakzvxcsqroxyhz',
        vercel: 'https://vercel.com/dashboard',
        github: 'https://github.com/davidferra13/CFV1',
        cloudflare: 'https://dash.cloudflare.com',
        beta: 'https://beta.cheflowhq.com',
        prod: 'https://cheflowhq.com',
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

  // ── Expenses endpoint ────────────────────────────────────────────
  if (path === '/api/expenses' && method === 'GET') {
    try {
      const raw = await readFile(PROJECT_EXPENSES_FILE, 'utf-8')
      return json(res, JSON.parse(raw))
    } catch (err) {
      return json(res, { error: 'Failed to read expenses file: ' + err.message }, 500)
    }
  }

  if (path === '/api/expenses' && method === 'POST') {
    const body = await parseBody(req)
    const { name, category, totalSpent, monthlyRate, notes } = body

    if (!name || typeof name !== 'string') {
      return json(res, { error: 'Name is required' }, 400)
    }

    try {
      const raw = await readFile(PROJECT_EXPENSES_FILE, 'utf-8')
      const data = JSON.parse(raw)

      // Generate next ID
      const maxId = data.entries.reduce((max, e) => {
        const num = parseInt(e.id.replace('exp_', ''), 10) || 0
        return num > max ? num : max
      }, 0)
      const newId = `exp_${String(maxId + 1).padStart(3, '0')}`

      const entry = {
        id: newId,
        category: category || 'other',
        name,
        totalSpent: parseFloat(totalSpent) || 0,
        monthlyRate: parseFloat(monthlyRate) || 0,
        date: new Date().toISOString().slice(0, 10),
        notes: notes || '',
      }

      data.entries.push(entry)
      data.lastUpdated = new Date().toISOString().slice(0, 10)

      await writeFile(PROJECT_EXPENSES_FILE, JSON.stringify(data, null, 2) + '\n')
      log('expenses', `Added expense: ${name} ($${entry.totalSpent})`, 'info')
      return json(res, { ok: true, entry })
    } catch (err) {
      return json(res, { error: 'Failed to save expense: ' + err.message }, 500)
    }
  }

  // ── Chat endpoint (streaming) ──────────────────────────────────
  if (path === '/api/chat' && method === 'POST') {
    const body = await parseBody(req)
    const { message, history = [], memories = [] } = body

    if (!message || typeof message !== 'string') {
      return json(res, { error: 'Message is required' }, 400)
    }

    const endpoint = await getAvailableOllamaEndpoint()
    if (!endpoint) {
      return json(res, { error: 'No Ollama instance available. Start Ollama on PC or Pi first.' }, 503)
    }

    log('chat', `Chat request via ${endpoint.source} (${endpoint.model})`, 'info')

    const systemPrompt = await buildChatSystemPrompt(memories)
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

      // Parse memory commands from response
      const memoryCommands = []
      const saveRegex = /<memory_save\s+category="([^"]+)">([^<]+)<\/memory_save>/g
      let memMatch
      while ((memMatch = saveRegex.exec(fullResponse)) !== null) {
        memoryCommands.push({ type: 'save', category: memMatch[1], content: memMatch[2].trim() })
      }
      const deleteRegex = /<memory_delete>([^<]+)<\/memory_delete>/g
      while ((memMatch = deleteRegex.exec(fullResponse)) !== null) {
        memoryCommands.push({ type: 'delete', keyword: memMatch[1].trim() })
      }

      res.write(JSON.stringify({ type: 'done', fullResponse, actions, memoryCommands }) + '\n')
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

  // ── New API routes (Mission Control V2) ─────────────────────────

  if (path === '/api/uptime' && method === 'GET') {
    return json(res, getUptimeReport())
  }
  if (path === '/api/errors/top' && method === 'GET') {
    return json(res, getErrorAggregation())
  }
  if (path === '/api/rollback/history' && method === 'GET') {
    return json(res, await getRollbackHistory())
  }
  if (path === '/api/git/diff' && method === 'GET') {
    return json(res, await getGitDiff())
  }
  if (path === '/api/audit/npm' && method === 'GET') {
    return json(res, await npmAudit())
  }
  if (path === '/api/bundle/size' && method === 'GET') {
    return json(res, await getBundleSizeHistory())
  }
  if (path === '/api/bundle/capture' && method === 'POST') {
    return json(res, await captureBundleSize())
  }
  if (path === '/api/env/compare' && method === 'GET') {
    return json(res, await compareEnvFiles())
  }
  if (path === '/api/backup/now' && method === 'POST') {
    return json(res, await scheduledDbBackup())
  }
  if (path === '/api/backup/status' && method === 'GET') {
    // Check backups directory
    try {
      const { readdir } = await import('node:fs/promises')
      const backupDir = join(PROJECT_ROOT, 'backups')
      let files = []
      try { files = (await readdir(backupDir)).filter(f => f.startsWith('backup-') && f.endsWith('.sql')).sort() } catch {}
      return json(res, {
        ok: true,
        backups: files,
        total: files.length,
        scheduledTime: '3:00 AM daily',
        retention: '7 days',
        message: `${files.length} backups stored`,
      })
    } catch (err) {
      return json(res, { ok: false, error: err.message })
    }
  }
  if (path === '/api/supabase/health' && method === 'GET') {
    return json(res, await checkSupabaseHealth())
  }
  if (path === '/api/ssl/check' && method === 'GET') {
    return json(res, await checkSSLCerts())
  }
  if (path === '/api/stripe/health' && method === 'GET') {
    return json(res, await checkStripeWebhookHealth())
  }
  if (path === '/api/email/health' && method === 'GET') {
    return json(res, await checkEmailHealth())
  }
  if (path === '/api/api-limits' && method === 'GET') {
    return json(res, getApiRateLimitInfo())
  }
  if (path.startsWith('/api/migration/sql/') && method === 'GET') {
    const filename = decodeURIComponent(path.replace('/api/migration/sql/', ''))
    return json(res, await readMigrationSql(filename))
  }

  // ── Login launcher (opens Chrome incognito as a test role) ───────
  if (path === '/api/login-as' && method === 'POST') {
    const body = await parseBody(req)
    const role = body.role
    const validRoles = ['chef', 'client', 'staff', 'partner', 'admin', 'chef-b']
    if (!role || !validRoles.includes(role)) {
      return json(res, { error: `Invalid role. Valid: ${validRoles.join(', ')}` }, 400)
    }
    log('login', `Opening Chrome incognito as ${role}...`, 'info')
    const child = spawn('node', [join(__dirname, 'open-login.mjs'), role], {
      cwd: PROJECT_ROOT,
      stdio: 'ignore',
      detached: true,
    })
    child.unref()
    return json(res, { ok: true, role, message: `Launching Chrome as ${role}...` })
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

  // Start uptime monitoring (poll every 60s)
  loadUptimeHistory().then(() => {
    pollUptime() // initial poll
    setInterval(pollUptime, 60000)
    log('system', 'Uptime monitoring started (60s interval)', 'info')
  })

  // Start scheduled DB backups (daily at 3 AM, keep 7)
  startScheduledBackups()

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
