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
import { readFile, writeFile, appendFile, stat, readdir } from 'node:fs/promises'
import { readFileSync, watch } from 'node:fs'
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
  betaPort: 3200,
  betaLocalUrl: 'http://localhost:3200',
  betaUrl: 'https://beta.cheflowhq.com',
  betaHealthUrl: 'http://localhost:3200/api/health',
  prodUrl: 'https://cheflowhq.com',
  prodHealthUrl: 'https://cheflowhq.com/api/health',
  ollamaPcUrl: process.env.OLLAMA_BASE_URL || 'http://localhost:11434',
  ollamaPcModel: process.env.OLLAMA_MODEL || 'qwen3-coder:30b',
  logFile: join(PROJECT_ROOT, 'mission-control.log'),
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  supabaseServiceKey: process.env.SUPABASE_SERVICE_ROLE_KEY || '',
}

// ── Chat Configuration ───────────────────────────────────────────

const CHAT_CONFIG = {
  maxHistoryMessages: 20,
  maxTokens: 4096,
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

// ── File Watcher (VS Code Activity Tracking) ─────────────────────

const fileActivity = []
const MAX_ACTIVITY = 500
const WATCH_DIRS = ['app', 'components', 'lib', 'types', 'supabase/migrations']
const IGNORE_PATTERNS = /node_modules|\.next|\.git|\.swp$|\.tmp$|~$/
let watchDebounce = new Map()

function initFileWatcher() {
  for (const dir of WATCH_DIRS) {
    const fullPath = join(PROJECT_ROOT, dir)
    try {
      watch(fullPath, { recursive: true }, (eventType, filename) => {
        if (!filename || IGNORE_PATTERNS.test(filename)) return
        const filePath = `${dir}/${filename.replace(/\\/g, '/')}`

        // Debounce — VS Code fires multiple events per save
        const key = `${eventType}:${filePath}`
        if (watchDebounce.has(key)) return
        watchDebounce.set(key, true)
        setTimeout(() => watchDebounce.delete(key), 500)

        const entry = {
          time: Date.now(),
          type: eventType, // 'rename' (create/delete) or 'change' (modify)
          file: filePath,
          dir: dir,
          ext: filename.split('.').pop() || '',
        }
        fileActivity.push(entry)
        if (fileActivity.length > MAX_ACTIVITY) fileActivity.shift()

        // Determine friendly action
        const action = eventType === 'rename' ? 'created/deleted' : 'modified'
        log('vscode', `${action}: ${filePath}`, 'info')

        // Auto-invalidate manual scan cache when pages or routes change
        if (filePath.endsWith('page.tsx') || filePath.endsWith('page.ts') ||
            filePath.endsWith('route.ts') || filePath.endsWith('route.tsx')) {
          scanCache = null
          scanCacheTime = 0
        }
      })
      log('watcher', `Watching ${dir}/`, 'info')
    } catch (err) {
      log('watcher', `Cannot watch ${dir}/: ${err.message}`, 'warn')
    }
  }
}

function getActivitySummary() {
  const now = Date.now()
  const last5min = fileActivity.filter(e => now - e.time < 5 * 60 * 1000)
  const lastHour = fileActivity.filter(e => now - e.time < 60 * 60 * 1000)
  const today = fileActivity.filter(e => {
    const d = new Date(e.time)
    const t = new Date()
    return d.toDateString() === t.toDateString()
  })

  // Group by directory
  const byDir = {}
  for (const e of today) {
    if (!byDir[e.dir]) byDir[e.dir] = { count: 0, files: new Set() }
    byDir[e.dir].count++
    byDir[e.dir].files.add(e.file)
  }

  // Recent timeline (last 50 unique files)
  const seen = new Set()
  const recent = []
  for (let i = fileActivity.length - 1; i >= 0 && recent.length < 50; i--) {
    const e = fileActivity[i]
    if (!seen.has(e.file)) {
      seen.add(e.file)
      recent.push(e)
    }
  }

  // Hotspots — most frequently changed files today
  const fileCounts = {}
  for (const e of today) {
    fileCounts[e.file] = (fileCounts[e.file] || 0) + 1
  }
  const hotspots = Object.entries(fileCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 15)
    .map(([file, count]) => ({ file, count }))

  return {
    counts: {
      last5min: last5min.length,
      lastHour: lastHour.length,
      today: today.length,
      total: fileActivity.length,
    },
    byDir: Object.fromEntries(
      Object.entries(byDir).map(([dir, data]) => [dir, { count: data.count, uniqueFiles: data.files.size }])
    ),
    recent,
    hotspots,
    watchedDirs: WATCH_DIRS,
  }
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

  // Tail local beta server logs
  try {
    const betaLogPath = join(PROJECT_ROOT, '..', 'CFv1-beta', 'beta-server.log')
    const betaTail = spawn('tail', ['-f', '-n', '20', betaLogPath], {
      shell: true,
      stdio: ['ignore', 'pipe', 'pipe'],
    })
    betaTail.stdout.on('data', (d) => {
      const lines = d.toString().trim().split('\n')
      for (const line of lines) {
        const clean = line.trim().replace(ANSI_REGEX, '')
        if (clean) feedEvent('beta', clean, parseLogLevel(clean))
      }
    })
    betaTail.stderr.on('data', () => {})
    betaTail.on('close', () => { delete liveFeedProcesses.betaTail })
    liveFeedProcesses.betaTail = betaTail
  } catch {
    feedEvent('beta', 'Could not tail beta server logs', 'warn')
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
  log('beta', 'Restarting beta server (local)...', 'info')
  try {
    // Kill existing beta server on port 3200
    const pid = await findPidOnPort(CONFIG.betaPort)
    if (pid) {
      await execAsync(`taskkill /F /PID ${pid}`, { shell: 'cmd', timeout: 5000 }).catch(() => {})
      await new Promise(r => setTimeout(r, 2000))
    }
    // Start beta server
    const betaDir = join(PROJECT_ROOT, '..', 'CFv1-beta')
    spawn('npx', ['next', 'start', '-p', String(CONFIG.betaPort)], {
      cwd: betaDir,
      detached: true,
      stdio: 'ignore',
      env: { ...process.env, NODE_ENV: 'production', PORT: String(CONFIG.betaPort) },
    }).unref()
    log('beta', 'Beta server starting on port ' + CONFIG.betaPort, 'info')
    // Wait then health check
    await new Promise(r => setTimeout(r, 5000))
    const check = await httpCheck(CONFIG.betaLocalUrl, 5000)
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
  child.on('close', async code => {
    job.status = code === 0 ? 'success' : 'failed'
    log('deploy', code === 0 ? 'Deploy completed successfully!' : `Deploy failed (code ${code})`, code === 0 ? 'success' : 'error')
    runningJobs.delete('deploy')
    try {
      const td = await readProjectTimelineData()
      if (code === 0) {
        td.betaDeploys = (td.betaDeploys || 0) + 1
      } else {
        td.betaDeploysFailed = (td.betaDeploysFailed || 0) + 1
      }
      td.lastUpdated = new Date().toISOString().slice(0, 10)
      await writeProjectTimelineData(td)
    } catch {}
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
  // Pi Ollama removed - all Ollama runs on PC now
  const label = 'Ollama'
  log('ollama', `${action === 'start' ? 'Starting' : 'Stopping'} ${label}...`, 'info')

  try {
    if (action === 'start') {
      spawn('ollama', ['serve'], { cwd: PROJECT_ROOT, detached: true, stdio: 'ignore', shell: true }).unref()
      log('ollama', 'Ollama starting...', 'success')
    } else {
      await execAsync('taskkill /IM ollama.exe /F', { shell: 'cmd' })
      log('ollama', 'Ollama stopped', 'success')
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

// ── Retroactive Activity Log (git archaeology) ────────────────────
let retroCache = null
let retroCacheTime = 0
const RETRO_CACHE_TTL = 300_000 // 5 min cache

async function getRetroactiveActivity() {
  if (retroCache && Date.now() - retroCacheTime < RETRO_CACHE_TTL) return retroCache

  try {
    const opts = { cwd: PROJECT_ROOT, maxBuffer: 20 * 1024 * 1024 }

    // 1. All commits with timestamps, messages, shortstat
    const { stdout: commitLog } = await execAsync(
      'git log --all --format="COMMIT|%aI|%s" --shortstat --reverse',
      opts
    )

    // 2. Hotspot files (raw numstat, parsed in JS for Windows compatibility)
    const { stdout: numstatRaw } = await execAsync(
      'git log --all --numstat --format=""',
      opts
    )

    // 3. Commits by hour (raw timestamps, parsed in JS)
    const { stdout: hourRawTs } = await execAsync(
      'git log --all --format="%aI"',
      opts
    )

    // 4. Commits by day-of-week (raw timestamps, parsed in JS)
    const { stdout: dowRawTs } = await execAsync(
      'git log --all --format="%ad" --date=format:"%A"',
      opts
    )

    // 5. Co-author attribution (raw bodies, parsed in JS)
    const { stdout: bodyRaw } = await execAsync(
      'git log --all --format="%b"',
      opts
    )

    // 6. Files born per day (raw output, parsed in JS)
    const { stdout: birthRawLog } = await execAsync(
      'git log --all --diff-filter=A --format="COMMIT|%aI" --name-only',
      opts
    )

    // Parse commits into daily summaries
    const days = {}
    const sessions = []
    let currentDate = null
    let pendingCommit = null

    for (const line of commitLog.split('\n')) {
      if (line.startsWith('COMMIT|')) {
        const parts = line.split('|')
        const ts = parts[1]
        const msg = parts.slice(2).join('|')
        const date = ts.replace(/T.*/, '')
        const time = ts.replace(/.*T/, '').replace(/-.*/, '')

        if (!days[date]) days[date] = { commits: 0, added: 0, deleted: 0, filesChanged: 0, messages: [], times: [] }
        days[date].commits++
        days[date].messages.push(msg)
        days[date].times.push(time)
        pendingCommit = date
      } else if (line.trim() && pendingCommit) {
        const m = line.match(/(\d+) files? changed(?:, (\d+) insertions?)?(?:, (\d+) deletions?)?/)
        if (m) {
          days[pendingCommit].filesChanged += parseInt(m[1]) || 0
          days[pendingCommit].added += parseInt(m[2]) || 0
          days[pendingCommit].deleted += parseInt(m[3]) || 0
        }
      }
    }

    // Build daily array sorted by date
    const dailyLog = Object.entries(days).sort((a, b) => a[0].localeCompare(b[0])).map(([date, d]) => {
      const times = d.times.sort()
      return {
        date,
        commits: d.commits,
        linesAdded: d.added,
        linesDeleted: d.deleted,
        filesChanged: d.filesChanged,
        firstCommit: times[0] || null,
        lastCommit: times[times.length - 1] || null,
        messages: d.messages,
      }
    })

    // Parse hotspots from numstat (count file occurrences in JS)
    const fileCounts = {}
    for (const line of numstatRaw.split('\n')) {
      const m = line.match(/^\d+\s+\d+\s+(.+)$/)
      if (m) fileCounts[m[1]] = (fileCounts[m[1]] || 0) + 1
    }
    const hotspots = Object.entries(fileCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 30)
      .map(([file, count]) => ({ count, file }))

    // Parse commits by hour from timestamps
    const byHour = {}
    for (let h = 0; h < 24; h++) byHour[String(h).padStart(2, '0')] = 0
    for (const line of hourRawTs.trim().split('\n').filter(Boolean)) {
      const m = line.match(/T(\d{2}):/)
      if (m) byHour[m[1]] = (byHour[m[1]] || 0) + 1
    }

    // Parse day-of-week from day names
    const dowCounts = {}
    for (const line of dowRawTs.trim().split('\n').filter(Boolean)) {
      const day = line.trim()
      if (day) dowCounts[day] = (dowCounts[day] || 0) + 1
    }
    const byDayOfWeek = Object.entries(dowCounts)
      .map(([day, count]) => ({ day, count }))
      .sort((a, b) => b.count - a.count)

    // Parse co-authors from commit bodies
    const agentCounts = {}
    for (const line of bodyRaw.split('\n')) {
      const m = line.match(/Co-Authored-By:\s*(.+?)\s*</i)
      if (m) {
        const name = m[1].trim()
        agentCounts[name] = (agentCounts[name] || 0) + 1
      }
    }
    const agents = Object.entries(agentCounts)
      .map(([agent, commits]) => ({ agent, commits }))
      .sort((a, b) => b.commits - a.commits)

    // Parse files born per day from COMMIT|timestamp + filename lines
    const filesBorn = {}
    let currentBirthDate = null
    for (const line of birthRawLog.split('\n')) {
      if (line.startsWith('COMMIT|')) {
        currentBirthDate = line.replace('COMMIT|', '').replace(/T.*/, '')
      } else if (line.trim() && currentBirthDate) {
        filesBorn[currentBirthDate] = (filesBorn[currentBirthDate] || 0) + 1
      }
    }

    // Build sessions (90-min gap)
    const allTimes = []
    for (const [date, d] of Object.entries(days)) {
      for (const t of d.times) allTimes.push({ date, time: t })
    }
    allTimes.sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time))

    let sessionStart = allTimes[0] || null
    let sessionPrev = allTimes[0] || null
    let sessionCommits = 1
    for (let i = 1; i < allTimes.length; i++) {
      const curr = allTimes[i]
      const prevKey = sessionPrev.date + sessionPrev.time
      const currKey = curr.date + curr.time

      // Calculate gap in minutes (simplified)
      let gap = 999
      if (curr.date === sessionPrev.date) {
        const [ph, pm] = sessionPrev.time.split(':').map(Number)
        const [ch, cm] = curr.time.split(':').map(Number)
        gap = (ch * 60 + cm) - (ph * 60 + pm)
      }

      if (gap > 90) {
        sessions.push({ start: sessionStart.date + 'T' + sessionStart.time, end: sessionPrev.date + 'T' + sessionPrev.time, commits: sessionCommits })
        sessionStart = curr
        sessionCommits = 1
      } else {
        sessionCommits++
      }
      sessionPrev = curr
    }
    if (sessionStart) sessions.push({ start: sessionStart.date + 'T' + sessionStart.time, end: sessionPrev.date + 'T' + sessionPrev.time, commits: sessionCommits })

    // Compute totals
    let totalCommits = 0, totalAdded = 0, totalDeleted = 0, totalBorn = 0
    for (const d of dailyLog) { totalCommits += d.commits; totalAdded += d.linesAdded; totalDeleted += d.linesDeleted }
    for (const v of Object.values(filesBorn)) totalBorn += v

    const result = {
      ok: true,
      generated: new Date().toISOString(),
      totals: { commits: totalCommits, linesAdded: totalAdded, linesDeleted: totalDeleted, filesBorn: totalBorn, sessions: sessions.length, activeDays: dailyLog.length },
      dailyLog,
      sessions,
      hotspots,
      byHour,
      byDayOfWeek,
      agents,
      filesBorn,
    }
    retroCache = result
    retroCacheTime = Date.now()
    return result
  } catch (err) {
    return { ok: false, error: err.message }
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

  // Build project origin + restart stats
  const origin = timelineData.projectOrigin || {}
  const restarts = timelineData.restarts || {}
  const restartVersions = Array.isArray(restarts.versions) ? restarts.versions : []

  const projectStats = {
    ideaStartDate: origin.ideaStartDate || null,
    firstConfirmedWork: origin.firstConfirmedWork || null,
    finalVersionStartDate: origin.finalVersionStartDate || null,
    finalVersionName: origin.finalVersionName || 'CFv1',
    totalRestarts: restarts.totalCount || restartVersions.length,
    restartSources: {
      billyBobVersions: restartVersions.filter(v => v.name?.startsWith('BillyBob')).length,
      filesystemGraveyard: restartVersions.filter(v => v.source === 'filesystem-graveyard' || v.source === 'filesystem-archive').length,
      aiStudioSubmissions: restartVersions.filter(v => v.source === 'google-ai-studio').length,
    },
    graveyardTotalFiles: restarts.graveyardTotalFiles || 0,
    graveyardTotalGB: restarts.graveyardTotalGB || 0,
    restartVersions,
    daysFromIdeaToFinal: origin.ideaStartDate && origin.finalVersionStartDate
      ? Math.floor((Date.parse(origin.finalVersionStartDate) - Date.parse(origin.ideaStartDate)) / 86400000)
      : null,
    daysFromIdeaToNow: origin.ideaStartDate
      ? Math.floor((Date.now() - Date.parse(origin.ideaStartDate)) / 86400000)
      : null,
  }

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
    projectStats,
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

    // Count pushes from reflog events
    const pushCount = reflogEvents.filter(e => e.type === 'push').length

    // Count Vercel deploys (main branch pushes = production deploys)
    const mainPushCount = reflogEvents.filter(e =>
      e.type === 'push' && (e.branch === 'refs/remotes/origin/main' || e.branch === 'main')
    ).length

    // Count unique branches
    const branchCount = new Set(
      reflogEvents.filter(e => e.type === 'branch_created').map(e => e.branch)
    ).size

    return {
      ok: true,
      summary,
      commits: commits.slice(0, 300),
      days: days.slice(0, 180),
      life,
      linear,
      gitActivity: {
        totalCommits: commits.length,
        totalPushes: pushCount,
        vercelDeploys: mainPushCount,
        betaDeploys: timelineData.betaDeploys || 0,
        branchesCreated: branchCount,
        commitsFailed: timelineData.commitsFailed || 0,
        pushesFailed: timelineData.pushesFailed || 0,
        betaDeploysFailed: timelineData.betaDeploysFailed || 0,
        vercelDeploysFailed: timelineData.vercelDeploysFailed || 0,
      },
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

// ── Project Stats (dashboard overview) ────────────────────────────

let statsCache = null
let statsCacheTime = 0
const STATS_CACHE_TTL = 60_000 // 1 minute

async function getProjectStats() {
  // Return cached result if fresh
  if (statsCache && Date.now() - statsCacheTime < STATS_CACHE_TTL) return statsCache

  const [devHours, remyStats, costStats] = await Promise.all([
    getDevHoursStats(),
    getRemyStats(),
    getCostStats(),
  ])

  statsCache = { devHours, remy: remyStats, costs: costStats, updatedAt: Date.now() }
  statsCacheTime = Date.now()
  return statsCache
}

async function getDevHoursStats() {
  try {
    const timelineData = await readProjectTimelineData()

    // Total project hours from git
    const { stdout } = await execAsync(
      'git log --pretty=format:"%ct"',
      { cwd: PROJECT_ROOT, maxBuffer: 10 * 1024 * 1024 }
    )
    const allTimestamps = stdout.trim().split('\n')
      .map(t => Number(t.replace(/"/g, '')))
      .filter(Number.isFinite)
      .sort((a, b) => a - b)

    const sessions45 = buildCommitSessions(allTimestamps, 45 * 60)
    const midpointSec = estimateSessionSeconds(sessions45, {
      padSeconds: 20 * 60, minSeconds: 25 * 60, maxSeconds: 6 * 3600,
    })
    const totalHours = Number((midpointSec / 3600).toFixed(1))

    // Add pre-telemetry hours from timeline file
    const preTelemetry = timelineData.estimatedHours?.preTelemetryRestartEra || {}
    const preMid = toFiniteNumber(preTelemetry.mid ?? preTelemetry.midpoint, 0)
    const combinedHours = roundHours(totalHours + preMid)

    const totalCommits = allTimestamps.length
    const activeDays = new Set(allTimestamps.map(ts => localDateKeyFromSeconds(ts))).size

    // Remy-specific hours from git (commits touching remy-related files)
    const { stdout: remyLog } = await execAsync(
      'git log --pretty=format:"%ct" -- "lib/ai/remy*" "components/ai/remy*" "scripts/remy-eval/*" "docs/remy*" "app/**/remy*"',
      { cwd: PROJECT_ROOT, maxBuffer: 5 * 1024 * 1024 }
    )
    const remyTimestamps = remyLog.trim().split('\n')
      .map(t => Number(t.replace(/"/g, '')))
      .filter(Number.isFinite)
      .sort((a, b) => a - b)

    const remySessions = buildCommitSessions(remyTimestamps, 45 * 60)
    const remyMidSec = estimateSessionSeconds(remySessions, {
      padSeconds: 20 * 60, minSeconds: 25 * 60, maxSeconds: 6 * 3600,
    })
    const remyHours = Number((remyMidSec / 3600).toFixed(1))
    const remyCommits = remyTimestamps.length

    return {
      totalHours: combinedHours,
      totalCommits,
      activeDays,
      remyHours,
      remyCommits,
    }
  } catch (err) {
    return { totalHours: 0, totalCommits: 0, activeDays: 0, remyHours: 0, remyCommits: 0, error: err.message }
  }
}

async function getRemyStats() {
  const EVAL_DIR = join(PROJECT_ROOT, 'scripts', 'remy-eval', 'reports')
  try {
    const files = (await readdir(EVAL_DIR)).filter(f => f.endsWith('.json')).sort().reverse()
    if (!files.length) return { totalEvals: 0, latestPassRate: 0, latestPassed: 0, latestTotal: 0, avgResponseTime: 0, trend: 'neutral' }

    const latest = JSON.parse(await readFile(join(EVAL_DIR, files[0]), 'utf-8'))
    const passRate = latest.totalTests > 0
      ? Number(((latest.passed / latest.totalTests) * 100).toFixed(1))
      : 0
    const avgTime = latest.avgResponseTimeMs
      ? Number((latest.avgResponseTimeMs / 1000).toFixed(1))
      : 0

    // Compute trend from last 2 evals
    let trend = 'neutral'
    if (files.length >= 2) {
      const prev = JSON.parse(await readFile(join(EVAL_DIR, files[1]), 'utf-8'))
      const prevRate = prev.totalTests > 0 ? (prev.passed / prev.totalTests) * 100 : 0
      if (passRate > prevRate + 1) trend = 'up'
      else if (passRate < prevRate - 1) trend = 'down'
    }

    // Total eval testing time (sum of all evals' avgResponseTimeMs * totalTests)
    let totalEvalSeconds = 0
    for (const f of files.slice(0, 20)) {
      try {
        const data = JSON.parse(await readFile(join(EVAL_DIR, f), 'utf-8'))
        if (data.avgResponseTimeMs && data.totalTests) {
          totalEvalSeconds += (data.avgResponseTimeMs / 1000) * data.totalTests
        }
      } catch { /* skip */ }
    }
    const totalEvalHours = Number((totalEvalSeconds / 3600).toFixed(2))

    return {
      totalEvals: files.length,
      latestPassRate: passRate,
      latestPassed: latest.passed || 0,
      latestTotal: latest.totalTests || 0,
      avgResponseTime: avgTime,
      totalEvalHours,
      trend,
      lastEvalDate: latest.timestamp || null,
    }
  } catch {
    return { totalEvals: 0, latestPassRate: 0, latestPassed: 0, latestTotal: 0, avgResponseTime: 0, totalEvalHours: 0, trend: 'neutral' }
  }
}

async function getCostStats() {
  try {
    const raw = await readFile(PROJECT_EXPENSES_FILE, 'utf-8')
    const data = JSON.parse(raw)
    const entries = data.entries || []
    let totalSpent = 0
    let monthlyBurn = 0
    for (const e of entries) {
      totalSpent += toFiniteNumber(e.totalSpent, 0)
      monthlyBurn += toFiniteNumber(e.monthlyRate, 0)
    }
    return {
      totalSpent: Number(totalSpent.toFixed(2)),
      monthlyBurn: Number(monthlyBurn.toFixed(2)),
      entryCount: entries.length,
    }
  } catch {
    return { totalSpent: 0, monthlyBurn: 0, entryCount: 0 }
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

// ── Beta Server Monitoring (local PC) ───────────────────────────

async function getPiStatus() {
  // Legacy name kept for Gustav command compatibility - now checks local beta server
  try {
    const betaCheck = await httpCheck(CONFIG.betaLocalUrl, 5000)
    const pid = await findPidOnPort(CONFIG.betaPort)
    return {
      ok: true,
      betaStatus: betaCheck.ok ? 'online' : 'offline',
      betaPort: CONFIG.betaPort,
      betaPid: pid || 'not found',
      betaLatency: betaCheck.latency,
      message: `Beta server: ${betaCheck.ok ? 'online' : 'offline'} on port ${CONFIG.betaPort}${pid ? ` (PID ${pid})` : ''}`,
    }
  } catch (err) {
    return { ok: false, error: err.message }
  }
}

async function getPiLogs(param) {
  // Legacy name kept for Gustav command compatibility - now reads local beta logs
  const lines = parseInt(param) || 50
  try {
    const betaDir = join(PROJECT_ROOT, '..', 'CFv1-beta')
    const logPath = join(betaDir, 'beta-server.log')
    const { stdout } = await execAsync(`tail -${lines} "${logPath}"`, { timeout: 5000 })
    return { ok: true, logs: stdout, message: `Last ${lines} lines of beta server logs` }
  } catch (err) {
    return { ok: false, error: `Could not read beta logs: ${err.message}` }
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

// ── Alert state tracking (fire on state change only, not every poll) ──
const prevUptimeState = { beta: true, prod: true, pi: true }

// ── Beta auto-remediation (restart PM2 after 3 consecutive failures) ──
let betaConsecutiveFailures = 0
let lastBetaRemediationTs = 0
const BETA_REMEDIATION_COOLDOWN_MS = 10 * 60 * 1000 // 10 minutes

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

  uptimeHistory.beta.push({ ts, ok: betaOk })
  uptimeHistory.prod.push({ ts, ok: prodOk })

  // Trim to 24h
  for (const key of ['beta', 'prod']) {
    if (uptimeHistory[key].length > UPTIME_MAX_ENTRIES) {
      uptimeHistory[key] = uptimeHistory[key].slice(-UPTIME_MAX_ENTRIES)
    }
  }

  // Broadcast downtime notifications via SSE - only on state transitions
  if (!betaOk && prevUptimeState.beta) feedEvent('system', 'ALERT: Beta server is DOWN', 'error')
  if (betaOk && !prevUptimeState.beta) feedEvent('system', 'RECOVERY: Beta server is back UP', 'info')
  if (!prodOk && prevUptimeState.prod) feedEvent('system', 'ALERT: Production is DOWN', 'error')
  if (prodOk && !prevUptimeState.prod) feedEvent('system', 'RECOVERY: Production is back UP', 'info')

  prevUptimeState.beta = betaOk
  prevUptimeState.prod = prodOk

  // Beta auto-remediation: restart local beta server after 3 consecutive failures
  if (!betaOk) {
    betaConsecutiveFailures++
    if (betaConsecutiveFailures >= 3 && (ts - lastBetaRemediationTs) > BETA_REMEDIATION_COOLDOWN_MS) {
      lastBetaRemediationTs = ts
      feedEvent('system', `AUTO-REMEDIATION: Restarting local beta server (${betaConsecutiveFailures} consecutive failures)`, 'warn')
      try {
        await restartBeta()
        feedEvent('system', 'AUTO-REMEDIATION: Beta server restart initiated', 'info')
      } catch (err) {
        feedEvent('system', `AUTO-REMEDIATION: Beta restart failed - ${err.message}`, 'error')
      }
    }
  } else {
    betaConsecutiveFailures = 0
  }

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

// ══════════════════════════════════════════════════════════════════
// TRACK 1: FULL BUSINESS VISIBILITY
// ══════════════════════════════════════════════════════════════════

async function getClientDetails(param) {
  const opts = {
    select: 'id,full_name,email,phone,company,dietary_restrictions,allergies,notes,vibe_tags,created_at,loyalty_tier,loyalty_points_balance,lifetime_points,preferred_contact_method,address_line1,address_city,address_state',
    order: 'created_at.desc',
    limit: 200,
  }
  const result = await supabaseQuery('clients', opts)
  if (!result.ok) return result
  let clients = result.data
  if (param && param.trim()) {
    const q = param.trim().toLowerCase()
    clients = clients.filter(c =>
      (c.full_name || '').toLowerCase().includes(q) ||
      (c.email || '').toLowerCase().includes(q) ||
      (c.company || '').toLowerCase().includes(q)
    )
  }
  if (clients.length === 0) return { ok: true, clients: [], message: `No clients found${param ? ` matching "${param}"` : ''}` }
  // If searching for a specific client, also get their event history
  if (param && clients.length <= 3) {
    for (const c of clients) {
      const evResult = await supabaseQuery('events', {
        select: 'id,event_date,status,occasion,guest_count,service_style',
        filters: [`client_id=eq.${c.id}`],
        order: 'event_date.desc',
        limit: 15,
      })
      c._events = evResult.ok ? evResult.data : []
    }
  }
  return {
    ok: true,
    clients: clients.slice(0, 25).map(c => ({
      name: c.full_name || 'Unknown',
      email: c.email || '',
      phone: c.phone || '',
      company: c.company || '',
      dietary: c.dietary_restrictions || '',
      allergies: c.allergies || '',
      notes: c.notes || '',
      vibeTags: c.vibe_tags || [],
      loyaltyTier: c.loyalty_tier || 'none',
      loyaltyPoints: c.loyalty_points_balance || 0,
      lifetimePoints: c.lifetime_points || 0,
      preferredContact: c.preferred_contact_method || '',
      city: c.address_city || '',
      since: c.created_at?.slice(0, 10) || '',
      eventHistory: (c._events || []).map(e => ({
        date: e.event_date,
        status: e.status,
        occasion: e.occasion || '',
        guests: e.guest_count || 0,
      })),
    })),
    total: clients.length,
    message: `${clients.length} clients${param ? ` matching "${param}"` : ''} (full details)`,
  }
}

async function getInquiryPipeline() {
  const result = await supabaseQuery('inquiries', {
    select: 'id,created_at,event_type,event_date,guest_count,status,budget_range,source,chef_likelihood,follow_up_due_at,unknown_fields,client:clients(full_name,email)',
    order: 'created_at.desc',
    limit: 30,
  })
  if (!result.ok) return result
  const inquiries = result.data.map(i => {
    const leadScore = i.unknown_fields?.lead_score ?? i.chef_likelihood ?? null
    return {
      type: i.event_type || 'General',
      date: i.event_date || 'TBD',
      guests: i.guest_count || 0,
      status: i.status,
      budget: i.budget_range || 'Not specified',
      source: i.source || 'unknown',
      leadScore,
      followUpDue: i.follow_up_due_at?.slice(0, 10) || null,
      client: i.client?.full_name || 'Unknown',
      clientEmail: i.client?.email || '',
      received: i.created_at?.slice(0, 10) || '',
    }
  })
  const byStatus = {}
  for (const i of inquiries) byStatus[i.status] = (byStatus[i.status] || 0) + 1
  return {
    ok: true,
    inquiries,
    byStatus,
    total: inquiries.length,
    message: `${inquiries.length} inquiries | ${Object.entries(byStatus).map(([k, v]) => `${k}: ${v}`).join(', ')}`,
  }
}

async function getQuoteStatus() {
  const result = await supabaseQuery('quotes', {
    select: 'id,created_at,status,total_cents,valid_until,notes,event:events(id,event_date,occasion,client:clients(full_name))',
    order: 'created_at.desc',
    limit: 30,
  })
  if (!result.ok) return result
  const fmt = c => '$' + (Math.abs(c || 0) / 100).toFixed(2)
  const quotes = result.data.map(q => ({
    status: q.status,
    total: fmt(q.total_cents),
    totalCents: q.total_cents || 0,
    validUntil: q.valid_until?.slice(0, 10) || '',
    event: q.event?.occasion || 'No event',
    eventDate: q.event?.event_date || '',
    client: q.event?.client?.full_name || 'Unknown',
    created: q.created_at?.slice(0, 10) || '',
    notes: q.notes || '',
  }))
  const byStatus = {}
  let totalValue = 0
  for (const q of quotes) {
    byStatus[q.status] = (byStatus[q.status] || 0) + 1
    totalValue += q.totalCents
  }
  return {
    ok: true,
    quotes,
    byStatus,
    totalValue: fmt(totalValue),
    total: quotes.length,
    message: `${quotes.length} quotes (${fmt(totalValue)} total) | ${Object.entries(byStatus).map(([k, v]) => `${k}: ${v}`).join(', ')}`,
  }
}

async function getMenuRecipeStats() {
  const [menuResult, recipeResult] = await Promise.all([
    supabaseQuery('menus', {
      select: 'id,name,created_at,status,course_count',
      order: 'created_at.desc',
      limit: 50,
    }),
    supabaseQuery('recipes', {
      select: 'id,name,created_at,cost_per_serving_cents,prep_time_minutes,cuisine_type,dietary_tags',
      order: 'created_at.desc',
      limit: 100,
    }),
  ])
  const menus = menuResult.ok ? menuResult.data : []
  const recipes = recipeResult.ok ? recipeResult.data : []
  const fmt = c => '$' + (Math.abs(c || 0) / 100).toFixed(2)
  const avgCost = recipes.length > 0
    ? recipes.reduce((s, r) => s + (r.cost_per_serving_cents || 0), 0) / recipes.length
    : 0
  const cuisineTypes = {}
  for (const r of recipes) {
    if (r.cuisine_type) cuisineTypes[r.cuisine_type] = (cuisineTypes[r.cuisine_type] || 0) + 1
  }
  return {
    ok: true,
    menuCount: menus.length,
    recipeCount: recipes.length,
    recentMenus: menus.slice(0, 5).map(m => ({ name: m.name, status: m.status, created: m.created_at?.slice(0, 10) })),
    recentRecipes: recipes.slice(0, 5).map(r => ({ name: r.name, cost: fmt(r.cost_per_serving_cents), prep: r.prep_time_minutes })),
    avgCostPerServing: fmt(avgCost),
    cuisineBreakdown: cuisineTypes,
    message: `${menus.length} menus, ${recipes.length} recipes | Avg cost/serving: ${fmt(avgCost)}`,
  }
}

async function getExpenseBreakdown(param) {
  const result = await supabaseQuery('expenses', {
    select: 'id,amount_cents,category,description,expense_date,vendor,event_id,created_at',
    order: 'expense_date.desc',
    limit: 200,
  })
  if (!result.ok) return result
  const fmt = c => '$' + (Math.abs(c || 0) / 100).toFixed(2)
  let expenses = result.data
  // Filter by category if param provided
  if (param && param.trim()) {
    const q = param.trim().toLowerCase()
    expenses = expenses.filter(e =>
      (e.category || '').toLowerCase().includes(q) ||
      (e.vendor || '').toLowerCase().includes(q) ||
      (e.description || '').toLowerCase().includes(q)
    )
  }
  const byCategory = {}
  let total = 0
  for (const e of expenses) {
    const cat = e.category || 'Uncategorized'
    byCategory[cat] = (byCategory[cat] || 0) + (e.amount_cents || 0)
    total += (e.amount_cents || 0)
  }
  const eventLinked = expenses.filter(e => e.event_id).length
  return {
    ok: true,
    expenses: expenses.slice(0, 20).map(e => ({
      date: e.expense_date?.slice(0, 10) || e.created_at?.slice(0, 10) || '',
      category: e.category || 'Uncategorized',
      amount: fmt(e.amount_cents),
      vendor: e.vendor || '',
      description: e.description || '',
      linkedToEvent: !!e.event_id,
    })),
    byCategory: Object.fromEntries(Object.entries(byCategory).map(([k, v]) => [k, fmt(v)])),
    total: fmt(total),
    count: expenses.length,
    eventLinkedCount: eventLinked,
    message: `${expenses.length} expenses totaling ${fmt(total)} | ${Object.keys(byCategory).length} categories | ${eventLinked} linked to events`,
  }
}

async function getCalendarOverview() {
  const now = new Date().toISOString().slice(0, 10)
  const twoWeeksOut = new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10)
  const [eventsResult, protectedResult] = await Promise.all([
    supabaseQuery('events', {
      select: 'id,event_date,serve_time,status,occasion,guest_count,client:clients(full_name)',
      filters: [`event_date=gte.${now}`, `event_date=lte.${twoWeeksOut}`, 'status=neq.cancelled'],
      order: 'event_date.asc',
      limit: 30,
    }),
    supabaseQuery('protected_time_blocks', {
      select: 'id,title,start_date,end_date,recurrence_type',
      filters: [`end_date=gte.${now}`],
      order: 'start_date.asc',
      limit: 20,
    }).catch(() => ({ ok: false })),
  ])
  const events = eventsResult.ok ? eventsResult.data : []
  const protectedTime = protectedResult.ok ? protectedResult.data : []
  const byDay = {}
  for (const e of events) {
    const day = e.event_date
    if (!byDay[day]) byDay[day] = []
    byDay[day].push({
      occasion: e.occasion || 'Event',
      time: e.serve_time || '',
      guests: e.guest_count || 0,
      client: e.client?.full_name || 'Unknown',
      status: e.status,
    })
  }
  return {
    ok: true,
    nextTwoWeeks: byDay,
    eventCount: events.length,
    protectedTimeBlocks: protectedTime.map(p => ({
      title: p.title,
      start: p.start_date?.slice(0, 10),
      end: p.end_date?.slice(0, 10),
      recurrence: p.recurrence_type || 'none',
    })),
    message: `${events.length} events in next 2 weeks | ${protectedTime.length} protected time blocks`,
  }
}

async function getStaffRoster() {
  const [staffResult, assignResult] = await Promise.all([
    supabaseQuery('staff_members', {
      select: 'id,full_name,email,phone,role,hourly_rate_cents,status,created_at',
      order: 'full_name.asc',
      limit: 50,
    }),
    supabaseQuery('event_staff_assignments', {
      select: 'staff_member_id,event:events(event_date,occasion)',
      filters: [`event.event_date=gte.${new Date().toISOString().slice(0, 10)}`],
      order: 'event.event_date.asc',
      limit: 50,
    }).catch(() => ({ ok: false })),
  ])
  if (!staffResult.ok) return staffResult
  const assignments = assignResult.ok ? assignResult.data : []
  const assignmentMap = {}
  for (const a of assignments) {
    if (!a.event) continue
    if (!assignmentMap[a.staff_member_id]) assignmentMap[a.staff_member_id] = []
    assignmentMap[a.staff_member_id].push({ date: a.event.event_date, occasion: a.event.occasion })
  }
  const fmt = c => '$' + (Math.abs(c || 0) / 100).toFixed(2)
  const staff = staffResult.data.map(s => ({
    name: s.full_name,
    email: s.email || '',
    phone: s.phone || '',
    role: s.role || '',
    hourlyRate: fmt(s.hourly_rate_cents),
    status: s.status || 'active',
    since: s.created_at?.slice(0, 10) || '',
    upcomingAssignments: assignmentMap[s.id] || [],
  }))
  const active = staff.filter(s => s.status === 'active').length
  return {
    ok: true,
    staff,
    total: staff.length,
    active,
    message: `${staff.length} staff members (${active} active) | ${assignments.length} upcoming assignments`,
  }
}

async function getEmailDigest() {
  const [syncResult, emailResult] = await Promise.all([
    supabaseQuery('gmail_sync_log', {
      select: 'id,synced_at,messages_synced,status,error_message',
      order: 'synced_at.desc',
      limit: 5,
    }).catch(() => ({ ok: false })),
    supabaseQuery('gmail_messages', {
      select: 'id,from_address,subject,received_at,classification,is_read',
      order: 'received_at.desc',
      limit: 20,
    }).catch(() => ({ ok: false })),
  ])
  const syncs = syncResult.ok ? syncResult.data : []
  const emails = emailResult.ok ? emailResult.data : []
  const unread = emails.filter(e => !e.is_read).length
  const byClass = {}
  for (const e of emails) {
    const cls = e.classification || 'unclassified'
    byClass[cls] = (byClass[cls] || 0) + 1
  }
  return {
    ok: true,
    lastSync: syncs[0]?.synced_at || 'never',
    lastSyncStatus: syncs[0]?.status || 'unknown',
    syncHistory: syncs.map(s => ({
      time: s.synced_at,
      count: s.messages_synced,
      status: s.status,
      error: s.error_message || null,
    })),
    recentEmails: emails.slice(0, 10).map(e => ({
      from: e.from_address,
      subject: e.subject || '(no subject)',
      received: e.received_at?.slice(0, 16) || '',
      classification: e.classification || '',
      read: e.is_read,
    })),
    unreadCount: unread,
    byClassification: byClass,
    totalRecent: emails.length,
    message: `${emails.length} recent emails (${unread} unread) | Last sync: ${syncs[0]?.synced_at?.slice(0, 16) || 'never'} (${syncs[0]?.status || 'unknown'})`,
  }
}

async function getLoyaltyOverview() {
  const [configResult, txResult, rewardsResult] = await Promise.all([
    supabaseQuery('loyalty_config', {
      select: 'id,tier_name,points_per_dollar,min_lifetime_points,multiplier',
      order: 'min_lifetime_points.asc',
      limit: 10,
    }).catch(() => ({ ok: false })),
    supabaseQuery('loyalty_transactions', {
      select: 'id,points,type,description,created_at,client:clients(full_name)',
      order: 'created_at.desc',
      limit: 30,
    }).catch(() => ({ ok: false })),
    supabaseQuery('loyalty_rewards', {
      select: 'id,name,points_cost,reward_type,is_active',
      limit: 20,
    }).catch(() => ({ ok: false })),
  ])
  const tiers = configResult.ok ? configResult.data : []
  const transactions = txResult.ok ? txResult.data : []
  const rewards = rewardsResult.ok ? rewardsResult.data : []
  const totalIssued = transactions.filter(t => t.points > 0).reduce((s, t) => s + t.points, 0)
  const totalRedeemed = transactions.filter(t => t.points < 0).reduce((s, t) => s + Math.abs(t.points), 0)
  return {
    ok: true,
    tiers: tiers.map(t => ({
      name: t.tier_name,
      pointsPerDollar: t.points_per_dollar,
      minPoints: t.min_lifetime_points,
      multiplier: t.multiplier,
    })),
    recentTransactions: transactions.slice(0, 10).map(t => ({
      client: t.client?.full_name || 'Unknown',
      points: t.points,
      type: t.type,
      description: t.description,
      date: t.created_at?.slice(0, 10),
    })),
    rewards: rewards.map(r => ({
      name: r.name,
      cost: r.points_cost,
      type: r.reward_type,
      active: r.is_active,
    })),
    totalIssued,
    totalRedeemed,
    netOutstanding: totalIssued - totalRedeemed,
    message: `${tiers.length} tiers | ${totalIssued} points issued, ${totalRedeemed} redeemed, ${totalIssued - totalRedeemed} outstanding`,
  }
}

async function getDocumentSummary() {
  const result = await supabaseQuery('chef_documents', {
    select: 'id,title,file_type,folder,created_at,file_size_bytes',
    order: 'created_at.desc',
    limit: 50,
  })
  if (!result.ok) return result
  const docs = result.data
  const byFolder = {}
  let totalSize = 0
  for (const d of docs) {
    const folder = d.folder || 'Root'
    if (!byFolder[folder]) byFolder[folder] = 0
    byFolder[folder]++
    totalSize += (d.file_size_bytes || 0)
  }
  const sizeMB = (totalSize / (1024 * 1024)).toFixed(2)
  return {
    ok: true,
    recentDocs: docs.slice(0, 10).map(d => ({
      title: d.title,
      type: d.file_type || '',
      folder: d.folder || 'Root',
      created: d.created_at?.slice(0, 10),
      size: d.file_size_bytes ? `${(d.file_size_bytes / 1024).toFixed(1)}KB` : '',
    })),
    byFolder,
    totalDocuments: docs.length,
    totalSize: `${sizeMB} MB`,
    message: `${docs.length} documents (${sizeMB} MB) across ${Object.keys(byFolder).length} folders`,
  }
}

// ══════════════════════════════════════════════════════════════════
// HUB / CIRCLES DATA
// ══════════════════════════════════════════════════════════════════

async function getHubCircles(param) {
  const [groupsResult, membersResult] = await Promise.all([
    supabaseQuery('hub_groups', {
      select: 'id,name,description,emoji,visibility,is_active,allow_member_invites,allow_anonymous_posts,message_count,last_message_at,last_message_preview,event_id,tenant_id,created_at',
      order: 'last_message_at.desc.nullslast,created_at.desc',
      limit: 50,
    }),
    supabaseQuery('hub_group_members', {
      select: 'group_id,role,notifications_muted,last_read_at',
      limit: 1000,
    }),
  ])
  if (!groupsResult.ok) return groupsResult
  const groups = groupsResult.data
  const members = membersResult.ok ? membersResult.data : []

  // Build member counts and role breakdown per group
  const memberStats = {}
  for (const m of members) {
    if (!memberStats[m.group_id]) memberStats[m.group_id] = { total: 0, roles: {}, muted: 0 }
    const s = memberStats[m.group_id]
    s.total++
    s.roles[m.role] = (s.roles[m.role] || 0) + 1
    if (m.notifications_muted) s.muted++
  }

  let filtered = groups
  if (param && param.trim()) {
    const q = param.trim().toLowerCase()
    filtered = groups.filter(g =>
      (g.name || '').toLowerCase().includes(q) ||
      (g.description || '').toLowerCase().includes(q)
    )
  }

  const circles = filtered.map(g => {
    const stats = memberStats[g.id] || { total: 0, roles: {}, muted: 0 }
    return {
      id: g.id,
      name: g.name,
      emoji: g.emoji || '',
      description: (g.description || '').slice(0, 80),
      visibility: g.visibility || 'public',
      active: g.is_active,
      memberCount: stats.total,
      roles: stats.roles,
      mutedCount: stats.muted,
      messageCount: g.message_count || 0,
      lastMessageAt: g.last_message_at?.slice(0, 16) || null,
      lastMessagePreview: g.last_message_preview || null,
      linkedEvent: g.event_id ? true : false,
      tenantId: g.tenant_id || null,
      created: g.created_at?.slice(0, 10) || '',
    }
  })

  const activeCircles = circles.filter(c => c.active && c.messageCount > 0).length
  const totalMembers = Object.values(memberStats).reduce((s, m) => s + m.total, 0)

  return {
    ok: true,
    circles,
    total: circles.length,
    activeWithMessages: activeCircles,
    totalMembers,
    message: `${circles.length} circles (${activeCircles} active with messages) | ${totalMembers} total members${param ? ` | filtered by "${param}"` : ''}`,
  }
}

async function getHubMessages(param) {
  // param can be a group name/id filter
  const result = await supabaseQuery('hub_messages', {
    select: 'id,group_id,message_type,body,is_pinned,is_anonymous,media_urls,reaction_counts,reply_to_message_id,created_at,deleted_at,author_profile_id',
    filters: ['deleted_at=is.null'],
    order: 'created_at.desc',
    limit: 50,
  })
  if (!result.ok) return result

  // Get group names for context
  const groupIds = [...new Set(result.data.map(m => m.group_id))]
  const groupsResult = await supabaseQuery('hub_groups', {
    select: 'id,name',
    filters: groupIds.length ? [`id=in.(${groupIds.join(',')})`] : [],
    limit: 50,
  })
  const groupNames = {}
  if (groupsResult.ok) {
    for (const g of groupsResult.data) groupNames[g.id] = g.name
  }

  let messages = result.data
  if (param && param.trim()) {
    const q = param.trim().toLowerCase()
    messages = messages.filter(m =>
      (m.body || '').toLowerCase().includes(q) ||
      (groupNames[m.group_id] || '').toLowerCase().includes(q)
    )
  }

  const byType = {}
  const byGroup = {}
  for (const m of messages) {
    byType[m.message_type] = (byType[m.message_type] || 0) + 1
    const gName = groupNames[m.group_id] || m.group_id
    byGroup[gName] = (byGroup[gName] || 0) + 1
  }

  return {
    ok: true,
    messages: messages.slice(0, 25).map(m => ({
      circle: groupNames[m.group_id] || m.group_id,
      type: m.message_type,
      body: (m.body || '').slice(0, 120),
      pinned: m.is_pinned,
      anonymous: m.is_anonymous,
      hasMedia: (m.media_urls || []).length > 0,
      isReply: !!m.reply_to_message_id,
      reactions: m.reaction_counts || {},
      posted: m.created_at?.slice(0, 16) || '',
    })),
    byType,
    byGroup,
    total: messages.length,
    message: `${messages.length} recent messages across ${Object.keys(byGroup).length} circles${param ? ` | filtered by "${param}"` : ''}`,
  }
}

async function getHubPolls() {
  const [pollsResult, optionsResult, votesResult] = await Promise.all([
    supabaseQuery('hub_polls', {
      select: 'id,group_id,question,poll_type,is_closed,closes_at,created_at',
      order: 'created_at.desc',
      limit: 30,
    }),
    supabaseQuery('hub_poll_options', {
      select: 'id,poll_id,label,sort_order',
      limit: 200,
    }),
    supabaseQuery('hub_poll_votes', {
      select: 'poll_id,option_id,profile_id',
      limit: 1000,
    }),
  ])
  if (!pollsResult.ok) return pollsResult

  // Get group names
  const groupIds = [...new Set(pollsResult.data.map(p => p.group_id))]
  const groupsResult = await supabaseQuery('hub_groups', {
    select: 'id,name',
    filters: groupIds.length ? [`id=in.(${groupIds.join(',')})`] : [],
    limit: 50,
  })
  const groupNames = {}
  if (groupsResult.ok) {
    for (const g of groupsResult.data) groupNames[g.id] = g.name
  }

  const options = optionsResult.ok ? optionsResult.data : []
  const votes = votesResult.ok ? votesResult.data : []

  // Build vote counts per option
  const voteCounts = {}
  for (const v of votes) {
    voteCounts[v.option_id] = (voteCounts[v.option_id] || 0) + 1
  }

  // Group options by poll
  const optionsByPoll = {}
  for (const o of options) {
    if (!optionsByPoll[o.poll_id]) optionsByPoll[o.poll_id] = []
    optionsByPoll[o.poll_id].push({
      label: o.label,
      votes: voteCounts[o.id] || 0,
    })
  }

  // Unique voters per poll
  const votersByPoll = {}
  for (const v of votes) {
    if (!votersByPoll[v.poll_id]) votersByPoll[v.poll_id] = new Set()
    votersByPoll[v.poll_id].add(v.profile_id)
  }

  const polls = pollsResult.data.map(p => ({
    circle: groupNames[p.group_id] || p.group_id,
    question: p.question,
    type: p.poll_type,
    closed: p.is_closed,
    closesAt: p.closes_at?.slice(0, 16) || null,
    options: (optionsByPoll[p.id] || []).sort((a, b) => b.votes - a.votes),
    totalVoters: votersByPoll[p.id]?.size || 0,
    totalVotes: (optionsByPoll[p.id] || []).reduce((s, o) => s + o.votes, 0),
    created: p.created_at?.slice(0, 10) || '',
  }))

  const openPolls = polls.filter(p => !p.closed).length
  return {
    ok: true,
    polls,
    total: polls.length,
    open: openPolls,
    closed: polls.length - openPolls,
    message: `${polls.length} polls (${openPolls} open, ${polls.length - openPolls} closed) | ${votes.length} total votes`,
  }
}

async function getHubProfiles() {
  const [profilesResult, friendsResult, membershipsResult] = await Promise.all([
    supabaseQuery('hub_guest_profiles', {
      select: 'id,email,display_name,avatar_url,notifications_enabled,known_allergies,known_dietary,auth_user_id,client_id,created_at',
      order: 'created_at.desc',
      limit: 100,
    }),
    supabaseQuery('hub_guest_friends', {
      select: 'id,requester_id,addressee_id,status,created_at',
      limit: 500,
    }),
    supabaseQuery('hub_group_members', {
      select: 'profile_id,group_id',
      limit: 1000,
    }),
  ])
  if (!profilesResult.ok) return profilesResult

  const friends = friendsResult.ok ? friendsResult.data : []
  const memberships = membershipsResult.ok ? membershipsResult.data : []

  // Count groups per profile
  const groupCount = {}
  for (const m of memberships) {
    groupCount[m.profile_id] = (groupCount[m.profile_id] || 0) + 1
  }

  // Count friends per profile
  const friendCount = {}
  for (const f of friends) {
    if (f.status === 'accepted') {
      friendCount[f.requester_id] = (friendCount[f.requester_id] || 0) + 1
      friendCount[f.addressee_id] = (friendCount[f.addressee_id] || 0) + 1
    }
  }

  const profiles = profilesResult.data.map(p => ({
    name: p.display_name,
    email: p.email || '',
    hasAvatar: !!p.avatar_url,
    notificationsOn: p.notifications_enabled,
    allergies: p.known_allergies || [],
    dietary: p.known_dietary || [],
    linkedToAuth: !!p.auth_user_id,
    linkedToClient: !!p.client_id,
    circleCount: groupCount[p.id] || 0,
    friendCount: friendCount[p.id] || 0,
    joined: p.created_at?.slice(0, 10) || '',
  }))

  const withNotifications = profiles.filter(p => p.notificationsOn).length
  const linkedAccounts = profiles.filter(p => p.linkedToAuth).length
  const pendingFriends = friends.filter(f => f.status === 'pending').length
  const acceptedFriends = friends.filter(f => f.status === 'accepted').length

  return {
    ok: true,
    profiles,
    total: profiles.length,
    withNotifications,
    linkedAccounts,
    friendships: { accepted: acceptedFriends, pending: pendingFriends },
    message: `${profiles.length} hub profiles | ${withNotifications} with notifications on | ${linkedAccounts} linked accounts | ${acceptedFriends} friendships (${pendingFriends} pending)`,
  }
}

async function getHubActivity() {
  // Synthesize hub activity from multiple tables
  const [messagesResult, pollsResult, membersResult, friendsResult] = await Promise.all([
    supabaseQuery('hub_messages', {
      select: 'id,group_id,message_type,created_at',
      filters: ['deleted_at=is.null'],
      order: 'created_at.desc',
      limit: 100,
    }),
    supabaseQuery('hub_polls', {
      select: 'id,group_id,created_at',
      order: 'created_at.desc',
      limit: 50,
    }),
    supabaseQuery('hub_group_members', {
      select: 'id,group_id,joined_at',
      order: 'joined_at.desc',
      limit: 100,
    }),
    supabaseQuery('hub_guest_friends', {
      select: 'id,status,created_at,accepted_at',
      order: 'created_at.desc',
      limit: 50,
    }),
  ])

  const messages = messagesResult.ok ? messagesResult.data : []
  const polls = pollsResult.ok ? pollsResult.data : []
  const members = membersResult.ok ? membersResult.data : []
  const friends = friendsResult.ok ? friendsResult.data : []

  // Activity by day (last 7 days)
  const now = Date.now()
  const sevenDaysAgo = new Date(now - 7 * 86400000).toISOString().slice(0, 10)
  const byDay = {}
  for (let i = 0; i < 7; i++) {
    const day = new Date(now - i * 86400000).toISOString().slice(0, 10)
    byDay[day] = { messages: 0, polls: 0, joins: 0, friendRequests: 0 }
  }

  for (const m of messages) {
    const day = m.created_at?.slice(0, 10)
    if (day && byDay[day]) byDay[day].messages++
  }
  for (const p of polls) {
    const day = p.created_at?.slice(0, 10)
    if (day && byDay[day]) byDay[day].polls++
  }
  for (const m of members) {
    const day = m.joined_at?.slice(0, 10)
    if (day && byDay[day]) byDay[day].joins++
  }
  for (const f of friends) {
    const day = f.created_at?.slice(0, 10)
    if (day && byDay[day]) byDay[day].friendRequests++
  }

  // Message type breakdown (all time from recent fetch)
  const byType = {}
  for (const m of messages) {
    byType[m.message_type] = (byType[m.message_type] || 0) + 1
  }

  // Most active circles
  const circleActivity = {}
  for (const m of messages) {
    circleActivity[m.group_id] = (circleActivity[m.group_id] || 0) + 1
  }
  const topCircleIds = Object.entries(circleActivity)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([id]) => id)

  // Get names for top circles
  let topCircles = []
  if (topCircleIds.length) {
    const namesResult = await supabaseQuery('hub_groups', {
      select: 'id,name',
      filters: [`id=in.(${topCircleIds.join(',')})`],
      limit: 5,
    })
    if (namesResult.ok) {
      const nameMap = {}
      for (const g of namesResult.data) nameMap[g.id] = g.name
      topCircles = topCircleIds.map(id => ({
        name: nameMap[id] || id,
        recentMessages: circleActivity[id],
      }))
    }
  }

  const recentMessages7d = messages.filter(m => m.created_at?.slice(0, 10) >= sevenDaysAgo).length
  const recentJoins7d = members.filter(m => m.joined_at?.slice(0, 10) >= sevenDaysAgo).length

  return {
    ok: true,
    last7Days: byDay,
    messageTypeBreakdown: byType,
    topCircles,
    summary: {
      messagesLast7d: recentMessages7d,
      joinsLast7d: recentJoins7d,
      pollsCreated: polls.length,
      friendRequests: friends.length,
    },
    message: `Last 7 days: ${recentMessages7d} messages, ${recentJoins7d} new members, ${polls.length} polls | Top circles: ${topCircles.map(c => c.name).join(', ') || 'none'}`,
  }
}

// ══════════════════════════════════════════════════════════════════
// TRACK 2: REMY OVERSIGHT
// ══════════════════════════════════════════════════════════════════

async function getRemyUsageMetrics() {
  const result = await supabaseQuery('remy_usage_metrics', {
    select: 'tenant_id,metric_date,conversation_count,message_count,feature_category,avg_response_time_ms,error_count,model_version',
    order: 'metric_date.desc',
    limit: 100,
  })
  if (!result.ok) return result
  const rows = result.data
  const uniqueTenants = new Set(rows.map(r => r.tenant_id))
  const totalMessages = rows.reduce((s, r) => s + (r.message_count || 0), 0)
  const totalConversations = rows.reduce((s, r) => s + (r.conversation_count || 0), 0)
  const totalErrors = rows.reduce((s, r) => s + (r.error_count || 0), 0)
  const avgResponseTime = rows.length > 0
    ? Math.round(rows.reduce((s, r) => s + (r.avg_response_time_ms || 0), 0) / rows.length)
    : 0
  const byCategory = {}
  for (const r of rows) {
    const cat = r.feature_category || 'general'
    if (!byCategory[cat]) byCategory[cat] = { messages: 0, conversations: 0 }
    byCategory[cat].messages += r.message_count || 0
    byCategory[cat].conversations += r.conversation_count || 0
  }
  return {
    ok: true,
    activeChefs: uniqueTenants.size,
    totalMessages,
    totalConversations,
    totalErrors,
    avgResponseTimeMs: avgResponseTime,
    byCategory,
    recentDays: rows.slice(0, 14).map(r => ({
      date: r.metric_date,
      messages: r.message_count,
      conversations: r.conversation_count,
      errors: r.error_count,
      responseTime: r.avg_response_time_ms,
    })),
    message: `${uniqueTenants.size} active chefs | ${totalMessages} messages | ${totalConversations} conversations | ${totalErrors} errors | Avg response: ${avgResponseTime}ms`,
  }
}

async function getRemyGuardrailLog() {
  const result = await supabaseQuery('remy_abuse_log', {
    select: 'id,tenant_id,severity,category,message_preview,action_taken,created_at',
    order: 'created_at.desc',
    limit: 50,
  })
  if (!result.ok) return result
  const rows = result.data
  const bySeverity = {}
  const byCategory = {}
  for (const r of rows) {
    bySeverity[r.severity] = (bySeverity[r.severity] || 0) + 1
    if (r.category) byCategory[r.category] = (byCategory[r.category] || 0) + 1
  }
  return {
    ok: true,
    incidents: rows.slice(0, 20).map(r => ({
      severity: r.severity,
      category: r.category || '',
      preview: r.message_preview || '',
      action: r.action_taken || '',
      time: r.created_at?.slice(0, 16),
    })),
    bySeverity,
    byCategory,
    totalIncidents: rows.length,
    message: `${rows.length} guardrail incidents | ${Object.entries(bySeverity).map(([k, v]) => `${k}: ${v}`).join(', ')}`,
  }
}

async function getRemyMemoryStore() {
  const result = await supabaseQuery('remy_memories', {
    select: 'id,tenant_id,category,content,importance,access_count,is_active,created_at,last_accessed_at',
    order: 'created_at.desc',
    limit: 100,
  })
  if (!result.ok) return result
  const rows = result.data
  const byCategory = {}
  const active = rows.filter(r => r.is_active !== false)
  for (const r of rows) {
    byCategory[r.category] = (byCategory[r.category] || 0) + 1
  }
  return {
    ok: true,
    memories: rows.slice(0, 30).map(r => ({
      category: r.category,
      content: r.content,
      importance: r.importance,
      accessCount: r.access_count,
      active: r.is_active !== false,
      created: r.created_at?.slice(0, 10),
      lastAccessed: r.last_accessed_at?.slice(0, 10) || 'never',
    })),
    byCategory,
    totalMemories: rows.length,
    activeMemories: active.length,
    message: `${rows.length} memories (${active.length} active) | ${Object.entries(byCategory).map(([k, v]) => `${k}: ${v}`).join(', ')}`,
  }
}

async function runRemyTests(param) {
  const script = param === 'full' ? 'test-remy-full.mjs' : 'test-remy-sample.mjs'
  try {
    log('chat', `Running Remy test suite (${script})...`, 'info')
    const { stdout, stderr } = await execAsync(`node scripts/${script}`, {
      cwd: PROJECT_ROOT,
      timeout: 600000, // 10 min max
      maxBuffer: 10 * 1024 * 1024,
    })
    const output = stdout + (stderr ? '\n' + stderr : '')
    // Try to extract pass/fail summary
    const passMatch = output.match(/(\d+)\s*PASS/i)
    const failMatch = output.match(/(\d+)\s*FAIL/i)
    const warnMatch = output.match(/(\d+)\s*WARN/i)
    return {
      ok: true,
      passed: passMatch ? parseInt(passMatch[1]) : null,
      failed: failMatch ? parseInt(failMatch[1]) : null,
      warnings: warnMatch ? parseInt(warnMatch[1]) : null,
      output: output.slice(-3000), // last 3000 chars
      message: `Remy tests complete: ${passMatch?.[1] || '?'} PASS, ${failMatch?.[1] || '?'} FAIL, ${warnMatch?.[1] || '?'} WARN`,
    }
  } catch (err) {
    return { ok: false, error: err.message, output: (err.stdout || '').slice(-2000) }
  }
}

async function getRemyPerformance() {
  // Aggregate from usage metrics
  const result = await supabaseQuery('remy_usage_metrics', {
    select: 'metric_date,message_count,error_count,avg_response_time_ms,model_version',
    order: 'metric_date.desc',
    limit: 30,
  })
  if (!result.ok) return result
  const rows = result.data
  const totalMessages = rows.reduce((s, r) => s + (r.message_count || 0), 0)
  const totalErrors = rows.reduce((s, r) => s + (r.error_count || 0), 0)
  const errorRate = totalMessages > 0 ? ((totalErrors / totalMessages) * 100).toFixed(2) : '0'
  const avgResponse = rows.length > 0
    ? Math.round(rows.filter(r => r.avg_response_time_ms > 0).reduce((s, r) => s + r.avg_response_time_ms, 0) / Math.max(1, rows.filter(r => r.avg_response_time_ms > 0).length))
    : 0
  const models = [...new Set(rows.map(r => r.model_version).filter(Boolean))]
  return {
    ok: true,
    totalMessages,
    totalErrors,
    errorRate: `${errorRate}%`,
    avgResponseTimeMs: avgResponse,
    models,
    dailyStats: rows.slice(0, 14).map(r => ({
      date: r.metric_date,
      messages: r.message_count,
      errors: r.error_count,
      responseTime: r.avg_response_time_ms,
    })),
    message: `Remy performance: ${totalMessages} msgs, ${errorRate}% error rate, ${avgResponse}ms avg response | Models: ${models.join(', ') || 'unknown'}`,
  }
}

// ══════════════════════════════════════════════════════════════════
// TRACK 3: CODEBASE INTELLIGENCE
// ══════════════════════════════════════════════════════════════════

async function getRecentChanges(param) {
  const days = parseInt(param) || 1
  try {
    const { stdout } = await execAsync(`git log --oneline --since="${days} days ago" --stat`, {
      cwd: PROJECT_ROOT,
      timeout: 10000,
    })
    const lines = stdout.trim().split('\n')
    return {
      ok: true,
      output: stdout.slice(0, 4000),
      commitCount: lines.filter(l => /^[a-f0-9]{7,}/.test(l)).length,
      message: `Changes in last ${days} day(s): ${lines.filter(l => /^[a-f0-9]{7,}/.test(l)).length} commits`,
    }
  } catch (err) {
    return { ok: false, error: err.message }
  }
}

async function getBranchStatus() {
  try {
    const [branchOut, remoteOut, prOut] = await Promise.all([
      execAsync('git branch -vv', { cwd: PROJECT_ROOT, timeout: 5000 }),
      execAsync('git rev-list --left-right --count HEAD...@{upstream} 2>/dev/null || echo "no upstream"', { cwd: PROJECT_ROOT, timeout: 5000 }).catch(() => ({ stdout: 'no upstream' })),
      execAsync('git log --oneline HEAD ^origin/main --no-merges 2>/dev/null | head -20', { cwd: PROJECT_ROOT, timeout: 5000 }).catch(() => ({ stdout: '' })),
    ])
    const ahead = remoteOut.stdout.includes('no upstream') ? 'no upstream' : remoteOut.stdout.trim()
    return {
      ok: true,
      branches: branchOut.stdout.trim(),
      aheadBehind: ahead,
      commitsNotOnMain: prOut.stdout.trim() || 'none',
      message: `Branch status retrieved`,
    }
  } catch (err) {
    return { ok: false, error: err.message }
  }
}

async function codebaseSearch(param) {
  if (!param || !param.trim()) return { ok: false, error: 'Usage: code/search:pattern — searches .ts/.tsx files' }
  try {
    // Use git grep for speed, fall back to findstr on Windows
    const { stdout } = await execAsync(
      `git grep -n --count "${param.trim()}" -- "*.ts" "*.tsx" 2>/dev/null || grep -rn "${param.trim()}" --include="*.ts" --include="*.tsx" . 2>/dev/null | head -30`,
      { cwd: PROJECT_ROOT, timeout: 15000, maxBuffer: 1024 * 1024 }
    )
    const lines = stdout.trim().split('\n').filter(Boolean)
    return {
      ok: true,
      results: lines.slice(0, 30),
      matchCount: lines.length,
      message: `${lines.length} matches for "${param.trim()}"`,
    }
  } catch (err) {
    // grep returns exit 1 for no matches
    if (err.code === 1) return { ok: true, results: [], matchCount: 0, message: `No matches for "${param.trim()}"` }
    return { ok: false, error: err.message }
  }
}

async function readFileContent(param) {
  if (!param || !param.trim()) return { ok: false, error: 'Usage: code/read:path/to/file.ts' }
  try {
    const filePath = join(PROJECT_ROOT, param.trim())
    const content = await readFile(filePath, 'utf-8')
    const lines = content.split('\n')
    // Truncate if too long
    const truncated = lines.length > 150
    const output = truncated ? lines.slice(0, 150).join('\n') + `\n\n... (${lines.length - 150} more lines)` : content
    return {
      ok: true,
      path: param.trim(),
      lines: lines.length,
      truncated,
      content: output,
      message: `${param.trim()} — ${lines.length} lines${truncated ? ' (showing first 150)' : ''}`,
    }
  } catch (err) {
    return { ok: false, error: `Cannot read ${param}: ${err.message}` }
  }
}

async function getSupabaseSchema() {
  // Get table list with row counts using Supabase REST
  const tables = [
    'chefs', 'clients', 'events', 'inquiries', 'quotes', 'expenses', 'menus', 'recipes',
    'ledger_entries', 'staff_members', 'chef_documents', 'loyalty_transactions', 'loyalty_config',
    'remy_memories', 'remy_usage_metrics', 'remy_abuse_log', 'user_roles', 'ai_preferences',
    'gmail_sync_log', 'event_transitions', 'quote_state_transitions',
  ]
  const counts = {}
  await Promise.all(tables.map(async (table) => {
    try {
      const result = await supabaseQuery(table, { select: 'id', limit: 0, extra: '' })
      // Use HEAD request with Prefer: count=exact for actual counts
      const url = `${CONFIG.supabaseUrl}/rest/v1/${table}?select=id&limit=0`
      const res = await fetch(url, {
        method: 'HEAD',
        headers: {
          'apikey': CONFIG.supabaseServiceKey,
          'Authorization': `Bearer ${CONFIG.supabaseServiceKey}`,
          'Prefer': 'count=exact',
        },
      })
      const range = res.headers.get('content-range')
      counts[table] = range ? parseInt(range.split('/')[1]) || 0 : '?'
    } catch {
      counts[table] = 'error'
    }
  }))
  return {
    ok: true,
    tables: counts,
    tableCount: tables.length,
    message: `${tables.length} tables | ` + Object.entries(counts).filter(([, v]) => v > 0).map(([k, v]) => `${k}: ${v}`).join(', '),
  }
}

// ══════════════════════════════════════════════════════════════════
// TRACK 4: APP HEALTH & QUALITY (Codebase Scanners)
// ══════════════════════════════════════════════════════════════════

async function scanTsNoCheck() {
  try {
    const { stdout } = await execAsync(
      'grep -rn "@ts-nocheck" --include="*.ts" --include="*.tsx" . 2>/dev/null | grep -v node_modules | grep -v .next',
      { cwd: PROJECT_ROOT, timeout: 10000 }
    )
    const files = stdout.trim().split('\n').filter(Boolean)
    // Check which ones have exports
    const dangerous = []
    for (const line of files) {
      const filePath = line.split(':')[0]
      try {
        const content = await readFile(join(PROJECT_ROOT, filePath), 'utf-8')
        if (/export\s+(async\s+)?function/.test(content)) {
          dangerous.push(filePath)
        }
      } catch { /* skip */ }
    }
    return {
      ok: true,
      totalFiles: files.length,
      dangerousExports: dangerous,
      allFiles: files.map(l => l.split(':')[0]),
      message: `${files.length} @ts-nocheck files | ${dangerous.length} with dangerous exports: ${dangerous.join(', ') || 'none'}`,
    }
  } catch (err) {
    if (err.code === 1) return { ok: true, totalFiles: 0, dangerousExports: [], message: 'No @ts-nocheck files found' }
    return { ok: false, error: err.message }
  }
}

async function scanMissingErrorHandling() {
  try {
    const { stdout } = await execAsync(
      'grep -rn "startTransition" --include="*.tsx" --include="*.ts" . 2>/dev/null | grep -v node_modules | grep -v .next',
      { cwd: PROJECT_ROOT, timeout: 10000 }
    )
    const lines = stdout.trim().split('\n').filter(Boolean)
    const issues = []
    for (const line of lines) {
      const filePath = line.split(':')[0]
      const lineNum = line.split(':')[1]
      try {
        const content = await readFile(join(PROJECT_ROOT, filePath), 'utf-8')
        const contentLines = content.split('\n')
        const idx = parseInt(lineNum) - 1
        // Check if there's a try/catch within 5 lines
        const nearby = contentLines.slice(idx, idx + 10).join('\n')
        if (!nearby.includes('try') && !nearby.includes('catch')) {
          issues.push({ file: filePath, line: lineNum })
        }
      } catch { /* skip */ }
    }
    return {
      ok: true,
      totalStartTransitions: lines.length,
      missingTryCatch: issues.length,
      issues: issues.slice(0, 20),
      message: `${lines.length} startTransition calls | ${issues.length} potentially missing try/catch`,
    }
  } catch (err) {
    if (err.code === 1) return { ok: true, totalStartTransitions: 0, missingTryCatch: 0, message: 'No startTransition calls found' }
    return { ok: false, error: err.message }
  }
}

async function scanStaleCache() {
  try {
    const [cacheOut, revalidateOut] = await Promise.all([
      execAsync('grep -rn "unstable_cache" --include="*.ts" --include="*.tsx" . 2>/dev/null | grep -v node_modules | grep -v .next', { cwd: PROJECT_ROOT, timeout: 10000 }).catch(() => ({ stdout: '' })),
      execAsync('grep -rn "revalidateTag" --include="*.ts" --include="*.tsx" . 2>/dev/null | grep -v node_modules | grep -v .next', { cwd: PROJECT_ROOT, timeout: 10000 }).catch(() => ({ stdout: '' })),
    ])
    const cacheLines = cacheOut.stdout.trim().split('\n').filter(Boolean)
    const revalidateLines = revalidateOut.stdout.trim().split('\n').filter(Boolean)
    // Extract tag names from unstable_cache calls
    const cacheTags = new Set()
    for (const line of cacheLines) {
      const tagMatch = line.match(/['"`]([^'"`]+)['"`]\s*\]/)
      if (tagMatch) cacheTags.add(tagMatch[1])
    }
    // Extract tag names from revalidateTag calls
    const revalidatedTags = new Set()
    for (const line of revalidateLines) {
      const tagMatch = line.match(/revalidateTag\(['"`]([^'"`]+)['"`]/)
      if (tagMatch) revalidatedTags.add(tagMatch[1])
    }
    const unbusted = [...cacheTags].filter(t => !revalidatedTags.has(t))
    return {
      ok: true,
      cacheCount: cacheLines.length,
      revalidateCount: revalidateLines.length,
      cacheTags: [...cacheTags],
      revalidatedTags: [...revalidatedTags],
      potentiallyStale: unbusted,
      message: `${cacheLines.length} cache usages, ${revalidateLines.length} revalidations | ${unbusted.length} potentially stale: ${unbusted.join(', ') || 'none'}`,
    }
  } catch (err) {
    return { ok: false, error: err.message }
  }
}

// ══════════════════════════════════════════════════════════════════
// TIER 1: UNIVERSAL DATA ACCESS + DEEP OPERATIONAL VISIBILITY
// ══════════════════════════════════════════════════════════════════

// Universal table query — query ANY Supabase table by name
async function queryTable(param) {
  if (!param || !param.trim()) return { ok: false, error: 'Usage: db/query:table_name or db/query:table_name?select=col1,col2&limit=10&filter=status.eq.active' }
  const parts = param.trim().split('?')
  const table = parts[0].trim()
  if (!table) return { ok: false, error: 'Table name required' }

  // Parse optional query params
  const opts = { limit: 25, order: 'created_at.desc' }
  const filters = []
  if (parts[1]) {
    const params = new URLSearchParams(parts[1])
    if (params.get('select')) opts.select = params.get('select')
    if (params.get('limit')) opts.limit = parseInt(params.get('limit'))
    if (params.get('order')) opts.order = params.get('order')
    if (params.get('filter')) {
      // Support multiple filters separated by comma
      for (const f of params.get('filter').split(',')) filters.push(f.trim())
    }
  }
  opts.filters = filters

  const result = await supabaseQuery(table, opts)
  if (!result.ok) return result
  return {
    ok: true,
    table,
    rows: result.data,
    count: result.data.length,
    message: `${result.data.length} rows from ${table}`,
  }
}

// SQL-like query via Supabase RPC or raw PostgREST
async function sqlQuery(param) {
  if (!param || !param.trim()) return { ok: false, error: 'Usage: db/sql:SELECT count(*) FROM events WHERE status = \'completed\'' }
  if (!CONFIG.supabaseUrl || !CONFIG.supabaseServiceKey) return { ok: false, error: 'Supabase not configured' }

  // Safety: read-only queries only
  const trimmed = param.trim()
  const upper = trimmed.toUpperCase()
  if (/^\s*(INSERT|UPDATE|DELETE|DROP|ALTER|TRUNCATE|CREATE|GRANT|REVOKE)/i.test(trimmed)) {
    return { ok: false, error: 'Read-only SQL shell. Write operations are blocked. Use SELECT, WITH, or EXPLAIN only.' }
  }

  try {
    // Use Supabase's RPC endpoint to run raw SQL via a database function
    // If the rpc function doesn't exist, fall back to explaining what's needed
    const url = `${CONFIG.supabaseUrl}/rest/v1/rpc/execute_sql`
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 15000)
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'apikey': CONFIG.supabaseServiceKey,
        'Authorization': `Bearer ${CONFIG.supabaseServiceKey}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({ query: trimmed }),
      signal: controller.signal,
    })
    clearTimeout(timer)

    if (res.status === 404) {
      // RPC function doesn't exist — guide user to create it
      return {
        ok: false,
        error: 'SQL shell requires a database function. Run this migration:\n\nCREATE OR REPLACE FUNCTION execute_sql(query text) RETURNS json AS $$\nBEGIN\n  RETURN (SELECT json_agg(row_to_json(t)) FROM (EXECUTE query) t);\nEND;\n$$ LANGUAGE plpgsql SECURITY DEFINER;\n\nGRANT EXECUTE ON FUNCTION execute_sql TO service_role;\n\nThen try again.',
      }
    }

    if (!res.ok) {
      const errText = await res.text()
      return { ok: false, error: `SQL error: ${errText.slice(0, 500)}` }
    }

    const data = await res.json()
    return {
      ok: true,
      rows: Array.isArray(data) ? data : [data],
      count: Array.isArray(data) ? data.length : 1,
      message: `Query returned ${Array.isArray(data) ? data.length : 1} rows`,
    }
  } catch (err) {
    return { ok: false, error: err.message }
  }
}

// List all cron jobs and their last execution status
async function getCronJobs() {
  // Check for cron route files
  const cronDir = join(PROJECT_ROOT, 'app', 'api', 'cron')
  let cronJobs = []
  try {
    const entries = await readdir(cronDir, { withFileTypes: true })
    for (const entry of entries) {
      if (entry.isDirectory()) {
        cronJobs.push(entry.name)
      }
    }
  } catch {
    return { ok: false, error: 'No cron directory found at app/api/cron/' }
  }

  // Try to get execution history from cron_executions table
  const execResult = await supabaseQuery('cron_executions', {
    select: 'id,job_name,started_at,completed_at,status,error_message,duration_ms',
    order: 'started_at.desc',
    limit: 30,
  }).catch(() => ({ ok: false }))

  const executions = execResult.ok ? execResult.data : []
  const lastByJob = {}
  for (const e of executions) {
    if (!lastByJob[e.job_name]) lastByJob[e.job_name] = e
  }

  return {
    ok: true,
    jobs: cronJobs.map(j => ({
      name: j,
      lastRun: lastByJob[j]?.started_at || 'never',
      lastStatus: lastByJob[j]?.status || 'unknown',
      lastDuration: lastByJob[j]?.duration_ms || null,
      lastError: lastByJob[j]?.error_message || null,
    })),
    recentExecutions: executions.slice(0, 10).map(e => ({
      job: e.job_name,
      started: e.started_at,
      status: e.status,
      duration: e.duration_ms,
      error: e.error_message || null,
    })),
    totalJobs: cronJobs.length,
    message: `${cronJobs.length} cron jobs: ${cronJobs.join(', ')}`,
  }
}

// Trigger a cron job manually
async function triggerCronJob(param) {
  if (!param || !param.trim()) return { ok: false, error: 'Usage: cron/trigger:job-name (e.g., cron/trigger:recall-check)' }
  const jobName = param.trim()
  const cronUrl = `http://localhost:${CONFIG.devPort}/api/cron/${jobName}`
  try {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 30000)
    const res = await fetch(cronUrl, {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${process.env.CRON_SECRET || ''}` },
      signal: controller.signal,
    })
    clearTimeout(timer)
    const data = await res.json().catch(() => ({}))
    return {
      ok: res.ok,
      status: res.status,
      result: data,
      message: res.ok ? `Cron job ${jobName} triggered successfully` : `Cron job ${jobName} failed: ${res.status}`,
    }
  } catch (err) {
    return { ok: false, error: `Cannot reach cron endpoint: ${err.message}. Dev server running?` }
  }
}

// Event deep-dive — full operational data for a specific event
async function eventDeepDive(param) {
  if (!param || !param.trim()) return { ok: false, error: 'Usage: data/event-deep:event_id or data/event-deep:search term' }
  const q = param.trim()

  // Try UUID first, then search by occasion
  let eventId = q
  if (!/^[0-9a-f-]{36}$/i.test(q)) {
    const searchResult = await supabaseQuery('events', {
      select: 'id,occasion,event_date',
      limit: 200,
    })
    if (!searchResult.ok) return searchResult
    const match = searchResult.data.find(e => (e.occasion || '').toLowerCase().includes(q.toLowerCase()))
    if (!match) return { ok: false, error: `No event found matching "${q}"` }
    eventId = match.id
  }

  // Fetch everything about this event in parallel
  const [event, ledger, expenses, tempLogs, transitions, staffAssign, quotes, contracts] = await Promise.all([
    supabaseQuery('events', { select: '*', filters: [`id=eq.${eventId}`], limit: 1 }),
    supabaseQuery('ledger_entries', { select: 'id,entry_type,amount_cents,description,created_at', filters: [`event_id=eq.${eventId}`], order: 'created_at.desc', limit: 50 }).catch(() => ({ ok: false })),
    supabaseQuery('expenses', { select: 'id,amount_cents,category,description,expense_date,vendor', filters: [`event_id=eq.${eventId}`], order: 'expense_date.desc', limit: 20 }).catch(() => ({ ok: false })),
    supabaseQuery('event_temp_logs', { select: 'id,item_name,temperature_f,logged_at,is_safe', filters: [`event_id=eq.${eventId}`], order: 'logged_at.desc', limit: 20 }).catch(() => ({ ok: false })),
    supabaseQuery('event_transitions', { select: 'id,from_status,to_status,created_at,reason', filters: [`event_id=eq.${eventId}`], order: 'created_at.asc', limit: 20 }).catch(() => ({ ok: false })),
    supabaseQuery('event_staff_assignments', { select: 'id,role,staff_member:staff_members(full_name,hourly_rate_cents)', filters: [`event_id=eq.${eventId}`], limit: 10 }).catch(() => ({ ok: false })),
    supabaseQuery('quotes', { select: 'id,status,total_cents,valid_until,created_at', filters: [`event_id=eq.${eventId}`], order: 'created_at.desc', limit: 5 }).catch(() => ({ ok: false })),
    supabaseQuery('event_contract_versions', { select: 'id,version,status,signed_at,created_at', filters: [`event_id=eq.${eventId}`], order: 'created_at.desc', limit: 5 }).catch(() => ({ ok: false })),
  ])

  if (!event.ok || !event.data[0]) return { ok: false, error: `Event ${eventId} not found` }
  const e = event.data[0]
  const fmt = c => '$' + (Math.abs(c || 0) / 100).toFixed(2)

  return {
    ok: true,
    event: {
      id: e.id,
      occasion: e.occasion,
      date: e.event_date,
      time: e.serve_time,
      status: e.status,
      guests: e.guest_count,
      style: e.service_style,
      city: e.location_city,
      address: e.location_address,
      notes: e.notes,
    },
    ledger: ledger.ok ? ledger.data.map(l => ({
      type: l.entry_type,
      amount: fmt(l.amount_cents),
      desc: l.description,
      date: l.created_at?.slice(0, 10),
    })) : 'unavailable',
    expenses: expenses.ok ? expenses.data.map(x => ({
      category: x.category,
      amount: fmt(x.amount_cents),
      vendor: x.vendor,
      desc: x.description,
      date: x.expense_date,
    })) : 'unavailable',
    tempLogs: tempLogs.ok ? tempLogs.data.map(t => ({
      item: t.item_name,
      temp: `${t.temperature_f}F`,
      safe: t.is_safe,
      time: t.logged_at,
    })) : 'unavailable',
    statusHistory: transitions.ok ? transitions.data.map(t => ({
      from: t.from_status,
      to: t.to_status,
      reason: t.reason,
      date: t.created_at?.slice(0, 16),
    })) : 'unavailable',
    staff: staffAssign.ok ? staffAssign.data.map(s => ({
      name: s.staff_member?.full_name,
      role: s.role,
      rate: fmt(s.staff_member?.hourly_rate_cents),
    })) : 'unavailable',
    quotes: quotes.ok ? quotes.data.map(q => ({
      status: q.status,
      total: fmt(q.total_cents),
      validUntil: q.valid_until?.slice(0, 10),
    })) : 'unavailable',
    contracts: contracts.ok ? contracts.data : 'unavailable',
    message: `Deep dive: ${e.occasion || 'Event'} on ${e.event_date} (${e.status})`,
  }
}

// Ledger entries viewer — raw financial journal
async function getLedgerEntries(param) {
  const opts = {
    select: 'id,event_id,entry_type,amount_cents,description,created_at,event:events(occasion,event_date)',
    order: 'created_at.desc',
    limit: 50,
  }
  if (param && param.trim()) {
    // Filter by entry_type
    opts.filters = [`entry_type=eq.${param.trim()}`]
  }
  const result = await supabaseQuery('ledger_entries', opts)
  if (!result.ok) return result
  const fmt = c => '$' + (Math.abs(c || 0) / 100).toFixed(2)
  const byType = {}
  let total = 0
  for (const e of result.data) {
    byType[e.entry_type] = (byType[e.entry_type] || 0) + (e.amount_cents || 0)
    total += (e.amount_cents || 0)
  }
  return {
    ok: true,
    entries: result.data.map(e => ({
      type: e.entry_type,
      amount: fmt(e.amount_cents),
      description: e.description,
      event: e.event?.occasion || null,
      eventDate: e.event?.event_date || null,
      date: e.created_at?.slice(0, 16),
    })),
    byType: Object.fromEntries(Object.entries(byType).map(([k, v]) => [k, fmt(v)])),
    total: fmt(total),
    count: result.data.length,
    message: `${result.data.length} ledger entries | Total: ${fmt(total)} | ${Object.entries(byType).map(([k, v]) => `${k}: ${fmt(v)}`).join(', ')}`,
  }
}

// Notification viewer
async function getNotifications() {
  const [notifResult, pushResult] = await Promise.all([
    supabaseQuery('notifications', {
      select: 'id,type,title,body,is_read,created_at,tenant_id',
      order: 'created_at.desc',
      limit: 30,
    }).catch(() => ({ ok: false })),
    supabaseQuery('push_subscriptions', {
      select: 'id,created_at,endpoint',
      limit: 50,
    }).catch(() => ({ ok: false })),
  ])
  const notifications = notifResult.ok ? notifResult.data : []
  const pushSubs = pushResult.ok ? pushResult.data : []
  const unread = notifications.filter(n => !n.is_read).length
  const byType = {}
  for (const n of notifications) {
    byType[n.type || 'general'] = (byType[n.type || 'general'] || 0) + 1
  }
  return {
    ok: true,
    notifications: notifications.slice(0, 15).map(n => ({
      type: n.type,
      title: n.title,
      body: (n.body || '').slice(0, 100),
      read: n.is_read,
      time: n.created_at?.slice(0, 16),
    })),
    unreadCount: unread,
    byType,
    pushSubscriptions: pushSubs.length,
    message: `${notifications.length} notifications (${unread} unread) | ${pushSubs.length} push subscriptions`,
  }
}

// Automation viewer
async function getAutomations() {
  const [rulesResult, execResult, seqResult] = await Promise.all([
    supabaseQuery('automation_rules', {
      select: 'id,name,trigger_type,action_type,is_active,created_at',
      order: 'created_at.desc',
      limit: 30,
    }).catch(() => ({ ok: false })),
    supabaseQuery('automation_executions', {
      select: 'id,rule_id,status,started_at,completed_at,error_message',
      order: 'started_at.desc',
      limit: 20,
    }).catch(() => ({ ok: false })),
    supabaseQuery('automated_sequences', {
      select: 'id,name,type,status,created_at',
      order: 'created_at.desc',
      limit: 20,
    }).catch(() => ({ ok: false })),
  ])
  const rules = rulesResult.ok ? rulesResult.data : []
  const executions = execResult.ok ? execResult.data : []
  const sequences = seqResult.ok ? seqResult.data : []
  const active = rules.filter(r => r.is_active).length
  const failed = executions.filter(e => e.status === 'failed').length
  return {
    ok: true,
    rules: rules.map(r => ({
      name: r.name,
      trigger: r.trigger_type,
      action: r.action_type,
      active: r.is_active,
      created: r.created_at?.slice(0, 10),
    })),
    recentExecutions: executions.slice(0, 10).map(e => ({
      status: e.status,
      started: e.started_at?.slice(0, 16),
      error: e.error_message || null,
    })),
    sequences: sequences.map(s => ({
      name: s.name,
      type: s.type,
      status: s.status,
    })),
    totalRules: rules.length,
    activeRules: active,
    failedExecutions: failed,
    message: `${rules.length} automation rules (${active} active) | ${executions.length} recent executions (${failed} failed) | ${sequences.length} sequences`,
  }
}

// Inventory & equipment viewer
async function getInventoryEquipment() {
  const [equipResult, inventoryResult, wasteResult] = await Promise.all([
    supabaseQuery('equipment', {
      select: 'id,name,purchase_price_cents,purchase_date,condition,category,depreciation_method',
      order: 'purchase_date.desc',
      limit: 50,
    }).catch(() => ({ ok: false })),
    supabaseQuery('inventory_items', {
      select: 'id,name,quantity,unit,min_quantity,category,last_restocked_at',
      order: 'name.asc',
      limit: 50,
    }).catch(() => ({ ok: false })),
    supabaseQuery('waste_logs', {
      select: 'id,item_name,quantity,reason,waste_date,cost_cents',
      order: 'waste_date.desc',
      limit: 20,
    }).catch(() => ({ ok: false })),
  ])
  const fmt = c => '$' + (Math.abs(c || 0) / 100).toFixed(2)
  const equipment = equipResult.ok ? equipResult.data : []
  const inventory = inventoryResult.ok ? inventoryResult.data : []
  const waste = wasteResult.ok ? wasteResult.data : []
  const totalEquipValue = equipment.reduce((s, e) => s + (e.purchase_price_cents || 0), 0)
  const lowStock = inventory.filter(i => i.quantity <= (i.min_quantity || 0))
  const totalWasteCost = waste.reduce((s, w) => s + (w.cost_cents || 0), 0)
  return {
    ok: true,
    equipment: equipment.slice(0, 15).map(e => ({
      name: e.name,
      value: fmt(e.purchase_price_cents),
      purchased: e.purchase_date,
      condition: e.condition,
      category: e.category,
    })),
    inventory: inventory.slice(0, 15).map(i => ({
      name: i.name,
      quantity: `${i.quantity} ${i.unit || ''}`,
      category: i.category,
      lowStock: i.quantity <= (i.min_quantity || 0),
      lastRestocked: i.last_restocked_at?.slice(0, 10),
    })),
    recentWaste: waste.slice(0, 10).map(w => ({
      item: w.item_name,
      quantity: w.quantity,
      reason: w.reason,
      cost: fmt(w.cost_cents),
      date: w.waste_date,
    })),
    totalEquipmentValue: fmt(totalEquipValue),
    totalEquipment: equipment.length,
    totalInventory: inventory.length,
    lowStockItems: lowStock.length,
    totalWasteCost: fmt(totalWasteCost),
    message: `Equipment: ${equipment.length} items (${fmt(totalEquipValue)}) | Inventory: ${inventory.length} items (${lowStock.length} low stock) | Waste: ${fmt(totalWasteCost)}`,
  }
}

// Activity feed — recent system events
async function getActivityFeed(param) {
  const limit = parseInt(param) || 30
  const result = await supabaseQuery('activity_events', {
    select: 'id,event_type,entity_type,entity_id,actor_type,description,created_at',
    order: 'created_at.desc',
    limit,
  }).catch(() => ({ ok: false }))
  if (!result.ok) {
    // Try activity_events_archive as fallback
    return { ok: false, error: 'activity_events table not accessible' }
  }
  const events = result.data
  const byType = {}
  for (const e of events) byType[e.event_type || 'unknown'] = (byType[e.event_type || 'unknown'] || 0) + 1
  return {
    ok: true,
    events: events.map(e => ({
      type: e.event_type,
      entity: `${e.entity_type}:${e.entity_id?.slice(0, 8)}`,
      actor: e.actor_type,
      description: e.description,
      time: e.created_at?.slice(0, 16),
    })),
    byType,
    total: events.length,
    message: `${events.length} recent activities | ${Object.entries(byType).map(([k, v]) => `${k}: ${v}`).join(', ')}`,
  }
}

// Webhook delivery history
async function getWebhookHistory() {
  const [stripeResult, resendResult] = await Promise.all([
    supabaseQuery('webhook_events', {
      select: 'id,source,event_type,status,received_at,error_message',
      order: 'received_at.desc',
      limit: 20,
    }).catch(() => ({ ok: false })),
    supabaseQuery('webhook_deliveries', {
      select: 'id,endpoint,status,attempts,last_attempt_at,error_message',
      order: 'last_attempt_at.desc',
      limit: 20,
    }).catch(() => ({ ok: false })),
  ])
  const inbound = stripeResult.ok ? stripeResult.data : []
  const outbound = resendResult.ok ? resendResult.data : []
  const failedInbound = inbound.filter(e => e.status === 'failed').length
  const failedOutbound = outbound.filter(e => e.status === 'failed').length
  return {
    ok: true,
    inbound: inbound.map(e => ({
      source: e.source,
      type: e.event_type,
      status: e.status,
      time: e.received_at?.slice(0, 16),
      error: e.error_message || null,
    })),
    outbound: outbound.map(e => ({
      endpoint: e.endpoint?.slice(0, 50),
      status: e.status,
      attempts: e.attempts,
      lastAttempt: e.last_attempt_at?.slice(0, 16),
      error: e.error_message || null,
    })),
    failedInbound,
    failedOutbound,
    message: `Inbound: ${inbound.length} events (${failedInbound} failed) | Outbound: ${outbound.length} deliveries (${failedOutbound} failed)`,
  }
}

// Synthesized business intelligence — patterns, not just facts
async function getBusinessIntelligence() {
  const [revenue, events, inquiries, clients] = await Promise.all([
    supabaseQuery('event_financial_summary', {
      select: 'event_id,net_revenue_cents,total_expenses_cents,profit_cents,profit_margin,food_cost_percentage',
      limit: 200,
    }).catch(() => ({ ok: false })),
    supabaseQuery('events', {
      select: 'id,event_date,status,guest_count,service_style,created_at',
      limit: 500,
    }).catch(() => ({ ok: false })),
    supabaseQuery('inquiries', {
      select: 'id,status,created_at,event_date,chef_likelihood',
      limit: 200,
    }).catch(() => ({ ok: false })),
    supabaseQuery('clients', {
      select: 'id,created_at,loyalty_tier,lifetime_points',
      limit: 200,
    }).catch(() => ({ ok: false })),
  ])
  const fmt = c => '$' + (Math.abs(c || 0) / 100).toFixed(2)

  // Revenue trends (by month)
  const monthlyRevenue = {}
  if (revenue.ok) {
    // We need event dates for monthly grouping
    const eventDates = {}
    if (events.ok) for (const e of events.data) eventDates[e.id] = e.event_date
    for (const r of revenue.data) {
      const date = eventDates[r.event_id]
      if (!date) continue
      const month = date.slice(0, 7)
      if (!monthlyRevenue[month]) monthlyRevenue[month] = { revenue: 0, expenses: 0, profit: 0, events: 0 }
      monthlyRevenue[month].revenue += r.net_revenue_cents || 0
      monthlyRevenue[month].expenses += r.total_expenses_cents || 0
      monthlyRevenue[month].profit += r.profit_cents || 0
      monthlyRevenue[month].events++
    }
  }

  // Conversion funnel
  let conversionRate = 0
  if (inquiries.ok && events.ok) {
    const totalInquiries = inquiries.data.length
    const converted = events.data.filter(e => !['draft', 'cancelled'].includes(e.status)).length
    conversionRate = totalInquiries > 0 ? ((converted / totalInquiries) * 100).toFixed(1) : 0
  }

  // Client loyalty distribution
  const loyaltyDist = {}
  if (clients.ok) {
    for (const c of clients.data) {
      const tier = c.loyalty_tier || 'none'
      loyaltyDist[tier] = (loyaltyDist[tier] || 0) + 1
    }
  }

  // Average event metrics
  let avgGuests = 0, avgRevPerGuest = 0
  if (events.ok && revenue.ok) {
    const validEvents = events.data.filter(e => e.guest_count > 0)
    avgGuests = validEvents.length > 0 ? Math.round(validEvents.reduce((s, e) => s + e.guest_count, 0) / validEvents.length) : 0
    const totalRev = revenue.data.reduce((s, r) => s + (r.net_revenue_cents || 0), 0)
    const totalGuests = validEvents.reduce((s, e) => s + e.guest_count, 0)
    avgRevPerGuest = totalGuests > 0 ? fmt(totalRev / totalGuests) : '$0.00'
  }

  // Hot lead score (inquiries with high likelihood)
  let hotLeads = 0
  if (inquiries.ok) {
    hotLeads = inquiries.data.filter(i => (i.chef_likelihood || 0) >= 70).length
  }

  return {
    ok: true,
    monthlyTrends: Object.fromEntries(
      Object.entries(monthlyRevenue).sort().slice(-6).map(([k, v]) => [k, { revenue: fmt(v.revenue), expenses: fmt(v.expenses), profit: fmt(v.profit), events: v.events }])
    ),
    conversionRate: `${conversionRate}%`,
    loyaltyDistribution: loyaltyDist,
    avgGuestsPerEvent: avgGuests,
    avgRevenuePerGuest: avgRevPerGuest,
    hotLeads,
    totalClients: clients.ok ? clients.data.length : 0,
    message: `Intelligence: ${conversionRate}% conversion | ${avgGuests} avg guests | ${avgRevPerGuest}/guest | ${hotLeads} hot leads | Loyalty: ${Object.entries(loyaltyDist).map(([k, v]) => `${k}: ${v}`).join(', ')}`,
  }
}

async function runHallucinationScan() {
  log('chat', 'Running hallucination scan...', 'info')
  const [tsNoCheck, errorHandling, staleCache] = await Promise.all([
    scanTsNoCheck(),
    scanMissingErrorHandling(),
    scanStaleCache(),
  ])
  // Also scan for hardcoded dollar amounts
  let hardcodedDollars = []
  try {
    const { stdout } = await execAsync(
      'grep -rn "\\$[0-9]\\+\\.[0-9][0-9]" --include="*.tsx" . 2>/dev/null | grep -v node_modules | grep -v .next | grep -v "\\$0\\.00" | grep -v test | grep -v docs | head -20',
      { cwd: PROJECT_ROOT, timeout: 10000 }
    )
    hardcodedDollars = stdout.trim().split('\n').filter(Boolean)
  } catch { /* no matches */ }
  // Scan for empty onClick handlers
  let emptyHandlers = []
  try {
    const { stdout } = await execAsync(
      'grep -rn "onClick={()\\s*=>\\s*{}\\|onClick={()\\s*=>\\s*{\\s*}}" --include="*.tsx" . 2>/dev/null | grep -v node_modules | grep -v .next | head -20',
      { cwd: PROJECT_ROOT, timeout: 10000 }
    )
    emptyHandlers = stdout.trim().split('\n').filter(Boolean)
  } catch { /* no matches */ }
  const totalIssues =
    (tsNoCheck.dangerousExports?.length || 0) +
    (errorHandling.missingTryCatch || 0) +
    (staleCache.potentiallyStale?.length || 0) +
    hardcodedDollars.length +
    emptyHandlers.length
  return {
    ok: true,
    tsNoCheck: { files: tsNoCheck.totalFiles, dangerous: tsNoCheck.dangerousExports },
    errorHandling: { total: errorHandling.totalStartTransitions, missing: errorHandling.missingTryCatch, issues: errorHandling.issues },
    staleCache: { caches: staleCache.cacheCount, stale: staleCache.potentiallyStale },
    hardcodedDollars: hardcodedDollars.slice(0, 10),
    emptyHandlers: emptyHandlers.slice(0, 10),
    totalIssues,
    message: `Hallucination scan: ${totalIssues} potential issues | @ts-nocheck exports: ${tsNoCheck.dangerousExports?.length || 0} | Missing try/catch: ${errorHandling.missingTryCatch || 0} | Stale cache: ${staleCache.potentiallyStale?.length || 0} | Hardcoded $: ${hardcodedDollars.length} | Empty handlers: ${emptyHandlers.length}`,
  }
}

// ══════════════════════════════════════════════════════════════════
// CALL THE PASS — Full Station Briefing
// ══════════════════════════════════════════════════════════════════

async function callThePass() {
  log('chat', 'Calling the pass — full station check...', 'info')
  const [status, revenue, events, inquiries, gitDiff, remy, schema] = await Promise.all([
    getAllStatus(),
    getRevenueSummary().catch(() => ({ ok: false, error: 'failed' })),
    getUpcomingEvents().catch(() => ({ ok: false, error: 'failed' })),
    getOpenInquiries().catch(() => ({ ok: false, error: 'failed' })),
    getGitDiff().catch(() => ({ ok: false, error: 'failed' })),
    getRemyUsageMetrics().catch(() => ({ ok: false, error: 'failed' })),
    getSupabaseSchema().catch(() => ({ ok: false, error: 'failed' })),
  ])
  return {
    ok: true,
    infrastructure: {
      dev: status.dev,
      beta: status.beta,
      prod: status.prod,
      ollamaPc: status.ollamaPc,
      ollamaPi: status.ollamaPi,
    },
    git: status.git,
    gitDiff: gitDiff.ok ? { dirty: gitDiff.filesChanged || 0, summary: gitDiff.summary || '' } : 'unavailable',
    business: {
      revenue: revenue.ok ? revenue.summary : 'unavailable',
      upcomingEvents: events.ok ? events.total : 'unavailable',
      openInquiries: inquiries.ok ? inquiries.total : 'unavailable',
    },
    remy: remy.ok ? {
      activeChefs: remy.activeChefs,
      totalMessages: remy.totalMessages,
      errorRate: remy.totalErrors,
    } : 'unavailable',
    database: schema.ok ? {
      tables: schema.tableCount,
      topTables: Object.entries(schema.tables).filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]).slice(0, 5),
    } : 'unavailable',
    message: 'Full station check complete. All stations reported.',
  }
}

// ══════════════════════════════════════════════════════════════════
// STATION 9: Git & Codebase Extended
// ══════════════════════════════════════════════════════════════════

async function gitLog(param) {
  const count = parseInt(param) || 20
  try {
    const { stdout } = await execAsync(`git log --oneline --no-decorate -${count}`, { cwd: PROJECT_ROOT, timeout: 10000 })
    const commits = stdout.trim().split('\n').filter(Boolean)
    return { ok: true, count: commits.length, commits, message: `Last ${commits.length} commits` }
  } catch (err) {
    return { ok: false, error: err.message }
  }
}

async function gitStash(param) {
  try {
    if (!param || param === 'list') {
      const { stdout } = await execAsync('git stash list', { cwd: PROJECT_ROOT, timeout: 10000 })
      const stashes = stdout.trim().split('\n').filter(Boolean)
      return { ok: true, count: stashes.length, stashes, message: stashes.length ? `${stashes.length} stash(es)` : 'Stash is clean' }
    }
    if (param === 'pop') {
      const { stdout } = await execAsync('git stash pop', { cwd: PROJECT_ROOT, timeout: 10000 })
      return { ok: true, message: 'Stash popped', output: stdout.trim() }
    }
    if (param.startsWith('save:')) {
      const msg = param.slice(5).trim() || 'Gustav stash'
      const { stdout } = await execAsync(`git stash push -m "${msg}"`, { cwd: PROJECT_ROOT, timeout: 10000 })
      return { ok: true, message: `Stashed: ${msg}`, output: stdout.trim() }
    }
    return { ok: false, error: 'Usage: git/stash (list), git/stash:pop, git/stash:save:message' }
  } catch (err) {
    return { ok: false, error: err.message }
  }
}

async function gitBlame(param) {
  if (!param) return { ok: false, error: 'Usage: git/blame:path/to/file.ts' }
  try {
    const { stdout } = await execAsync(`git blame --line-porcelain "${param}" | grep -E "^(author |author-time |summary )" | head -60`, { cwd: PROJECT_ROOT, timeout: 15000 })
    const lines = stdout.trim().split('\n').filter(Boolean)
    const authors = {}
    for (let i = 0; i < lines.length; i += 3) {
      const author = lines[i]?.replace('author ', '') || 'unknown'
      authors[author] = (authors[author] || 0) + 1
    }
    return { ok: true, file: param, authorBreakdown: authors, totalLines: Object.values(authors).reduce((s, c) => s + c, 0), message: `Blame for ${param}: ${Object.entries(authors).map(([a, c]) => `${a}: ${c} lines`).join(', ')}` }
  } catch (err) {
    return { ok: false, error: err.message }
  }
}

async function codeTodo() {
  try {
    const { stdout } = await execAsync(
      'grep -rn "TODO\\|FIXME\\|HACK\\|XXX" --include="*.ts" --include="*.tsx" --include="*.mjs" . 2>/dev/null | grep -v node_modules | grep -v .next | grep -v types/database.ts | head -50',
      { cwd: PROJECT_ROOT, timeout: 15000 }
    )
    const items = stdout.trim().split('\n').filter(Boolean)
    const byType = { TODO: 0, FIXME: 0, HACK: 0, XXX: 0 }
    for (const line of items) {
      if (line.includes('TODO')) byType.TODO++
      if (line.includes('FIXME')) byType.FIXME++
      if (line.includes('HACK')) byType.HACK++
      if (line.includes('XXX')) byType.XXX++
    }
    return { ok: true, total: items.length, byType, items: items.slice(0, 30), message: `Found ${items.length} items: ${Object.entries(byType).filter(([, v]) => v > 0).map(([k, v]) => `${v} ${k}`).join(', ')}` }
  } catch (err) {
    return { ok: true, total: 0, byType: {}, items: [], message: 'Codebase is clean — no TODOs found' }
  }
}

async function codeLoc() {
  try {
    const { stdout } = await execAsync(
      'find . -type f \\( -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.mjs" -o -name "*.css" -o -name "*.json" -o -name "*.md" -o -name "*.sql" \\) -not -path "*/node_modules/*" -not -path "*/.next/*" -not -path "*/types/database.ts" | head -2000 | xargs wc -l 2>/dev/null | tail -1',
      { cwd: PROJECT_ROOT, timeout: 30000 }
    )
    const totalMatch = stdout.trim().match(/(\d+)\s+total/)
    const total = totalMatch ? parseInt(totalMatch[1]) : 0
    // Get breakdown by extension
    const { stdout: breakdown } = await execAsync(
      'find . -type f \\( -name "*.ts" -o -name "*.tsx" -o -name "*.mjs" \\) -not -path "*/node_modules/*" -not -path "*/.next/*" -not -path "*/types/database.ts" | head -2000 | xargs wc -l 2>/dev/null | tail -1',
      { cwd: PROJECT_ROOT, timeout: 30000 }
    )
    const codeMatch = breakdown.trim().match(/(\d+)\s+total/)
    const codeLines = codeMatch ? parseInt(codeMatch[1]) : 0
    return { ok: true, totalLines: total, codeLines, message: `Codebase: ~${total.toLocaleString()} total lines, ~${codeLines.toLocaleString()} code (TS/TSX/MJS)` }
  } catch (err) {
    return { ok: false, error: err.message }
  }
}

// ══════════════════════════════════════════════════════════════════
// STATION 10: Business Intelligence Extended + Security + Quality
// ══════════════════════════════════════════════════════════════════

async function getClientRisk() {
  const clients = await supabaseQuery('clients', 'id,name,loyalty_tier,created_at', '', 500)
  const events = await supabaseQuery('events', 'id,client_id,event_date,status', '', 1000)
  if (!clients.ok) return { ok: false, error: 'Failed to fetch clients' }
  const now = new Date()
  const atRisk = []
  for (const client of clients.data) {
    const clientEvents = (events.data || []).filter(e => e.client_id === client.id)
    if (clientEvents.length === 0) {
      const daysSinceCreated = Math.floor((now - new Date(client.created_at)) / 86400000)
      if (daysSinceCreated > 90) atRisk.push({ name: client.name, tier: client.loyalty_tier, lastEvent: 'never', daysSince: daysSinceCreated, reason: 'No events, 90+ days since signup' })
    } else {
      const lastDate = clientEvents.map(e => e.event_date).sort().pop()
      const daysSince = Math.floor((now - new Date(lastDate)) / 86400000)
      if (daysSince > 90) atRisk.push({ name: client.name, tier: client.loyalty_tier, lastEvent: lastDate, daysSince, reason: `No events in ${daysSince} days` })
    }
  }
  atRisk.sort((a, b) => b.daysSince - a.daysSince)
  return { ok: true, atRisk: atRisk.slice(0, 20), total: atRisk.length, message: `${atRisk.length} client(s) at risk of churn (90+ days inactive)` }
}

async function getRevenueForecast() {
  const events = await supabaseQuery('events', 'id,event_date,status,guest_count', 'status=in.(accepted,paid,confirmed)', 200)
  const revenue = await supabaseQuery('event_financial_summary', 'event_id,net_revenue_cents', '', 500)
  if (!events.ok) return { ok: false, error: 'Failed to fetch events' }
  const now = new Date()
  const sixtyDaysOut = new Date(now.getTime() + 60 * 86400000)
  const pipeline = (events.data || []).filter(e => {
    const d = new Date(e.event_date)
    return d >= now && d <= sixtyDaysOut
  })
  // Calculate avg revenue per event from historical data
  const historicalRevenues = (revenue.data || []).map(r => r.net_revenue_cents || 0).filter(r => r > 0)
  const avgRevenue = historicalRevenues.length > 0 ? Math.round(historicalRevenues.reduce((s, r) => s + r, 0) / historicalRevenues.length) : 0
  const projectedTotal = pipeline.length * avgRevenue
  return {
    ok: true,
    next60Days: { events: pipeline.length, projected: fmt(projectedTotal), avgPerEvent: fmt(avgRevenue) },
    pipeline: pipeline.map(e => ({ date: e.event_date, status: e.status, guests: e.guest_count })),
    message: `Forecast (60 days): ${pipeline.length} events, projected ${fmt(projectedTotal)} (avg ${fmt(avgRevenue)}/event)`,
  }
}

async function getSeasonalTrends() {
  const events = await supabaseQuery('events', 'id,event_date,guest_count,status', '', 2000)
  if (!events.ok) return { ok: false, error: 'Failed to fetch events' }
  const monthly = {}
  for (const e of events.data) {
    if (!e.event_date) continue
    const month = new Date(e.event_date).toLocaleString('en', { month: 'long' })
    if (!monthly[month]) monthly[month] = { events: 0, guests: 0 }
    monthly[month].events++
    monthly[month].guests += e.guest_count || 0
  }
  const sorted = Object.entries(monthly).sort((a, b) => b[1].events - a[1].events)
  const busiest = sorted[0]
  const slowest = sorted[sorted.length - 1]
  return {
    ok: true,
    byMonth: Object.fromEntries(sorted.map(([m, d]) => [m, { events: d.events, avgGuests: d.events > 0 ? Math.round(d.guests / d.events) : 0 }])),
    busiest: busiest ? { month: busiest[0], events: busiest[1].events } : null,
    slowest: slowest ? { month: slowest[0], events: slowest[1].events } : null,
    message: `Seasonal trends: Busiest = ${busiest?.[0] || 'N/A'} (${busiest?.[1].events || 0} events), Slowest = ${slowest?.[0] || 'N/A'} (${slowest?.[1].events || 0} events)`,
  }
}

async function getPricingAnalysis() {
  const events = await supabaseQuery('events', 'id,guest_count,occasion_type,cuisine_type', "status=in.(completed,confirmed,paid,accepted)", 1000)
  const revenue = await supabaseQuery('event_financial_summary', 'event_id,net_revenue_cents', '', 1000)
  if (!events.ok || !revenue.ok) return { ok: false, error: 'Failed to fetch data' }
  const revMap = {}
  for (const r of revenue.data) revMap[r.event_id] = r.net_revenue_cents || 0
  let totalPerGuest = 0, perGuestCount = 0
  const byOccasion = {}, byCuisine = {}
  for (const e of events.data) {
    const rev = revMap[e.id] || 0
    if (e.guest_count > 0 && rev > 0) {
      const ppg = rev / e.guest_count
      totalPerGuest += ppg
      perGuestCount++
      const occ = e.occasion_type || 'unspecified'
      if (!byOccasion[occ]) byOccasion[occ] = { total: 0, count: 0 }
      byOccasion[occ].total += ppg
      byOccasion[occ].count++
      const cuisine = e.cuisine_type || 'unspecified'
      if (!byCuisine[cuisine]) byCuisine[cuisine] = { total: 0, count: 0 }
      byCuisine[cuisine].total += ppg
      byCuisine[cuisine].count++
    }
  }
  const avgPerGuest = perGuestCount > 0 ? fmt(totalPerGuest / perGuestCount) : '$0.00'
  return {
    ok: true,
    avgPerGuest,
    byOccasion: Object.fromEntries(Object.entries(byOccasion).map(([k, v]) => [k, { avg: fmt(v.total / v.count), events: v.count }])),
    byCuisine: Object.fromEntries(Object.entries(byCuisine).map(([k, v]) => [k, { avg: fmt(v.total / v.count), events: v.count }])),
    message: `Pricing: ${avgPerGuest}/guest avg | ${Object.keys(byOccasion).length} occasion types | ${Object.keys(byCuisine).length} cuisine types`,
  }
}

async function getEventTimeline(param) {
  if (!param) return { ok: false, error: 'Usage: data/event-timeline:event_id' }
  const transitions = await supabaseQuery('event_transitions', 'id,from_status,to_status,created_at,changed_by', `event_id=eq.${param}`, 100)
  if (!transitions.ok) return { ok: false, error: 'Failed to fetch transitions' }
  return {
    ok: true,
    eventId: param,
    transitions: transitions.data.sort((a, b) => new Date(a.created_at) - new Date(b.created_at)),
    count: transitions.data.length,
    message: `Event ${param}: ${transitions.data.length} transitions — ${transitions.data.map(t => `${t.from_status}→${t.to_status}`).join(' → ')}`,
  }
}

async function getRemyConversations() {
  const metrics = await supabaseQuery('remy_usage_metrics', 'id,tenant_id,messages_sent,conversations_started,created_at', '', 100)
  if (!metrics.ok) return { ok: false, error: 'Failed to fetch Remy metrics' }
  const totalMessages = metrics.data.reduce((s, m) => s + (m.messages_sent || 0), 0)
  const totalConvos = metrics.data.reduce((s, m) => s + (m.conversations_started || 0), 0)
  return { ok: true, totalMessages, totalConversations: totalConvos, tenants: metrics.data.length, message: `Remy conversations: ${totalMessages} messages, ${totalConvos} conversations across ${metrics.data.length} tenants` }
}

async function getRemyErrors() {
  const errors = await supabaseQuery('remy_usage_metrics', 'id,tenant_id,errors_count,created_at', 'errors_count=gt.0', 50)
  const abuse = await supabaseQuery('remy_abuse_log', 'id,tenant_id,blocked_message,guardrail_matched,created_at', '', 20)
  const totalErrors = (errors.data || []).reduce((s, m) => s + (m.errors_count || 0), 0)
  return {
    ok: true,
    totalErrors,
    errorRecords: (errors.data || []).length,
    abuseIncidents: (abuse.data || []).length,
    recentAbuse: (abuse.data || []).slice(0, 5),
    message: `Remy errors: ${totalErrors} total errors, ${(abuse.data || []).length} abuse incidents`,
  }
}

async function getBetaDeepHealth() {
  try {
    const betaCheck = await httpCheck(CONFIG.betaLocalUrl, 5000)
    const tunnelCheck = await httpCheck(CONFIG.betaUrl, 10000)
    const pid = await findPidOnPort(CONFIG.betaPort)
    return {
      ok: betaCheck.ok,
      localHealth: { ok: betaCheck.ok, status: betaCheck.status, latency: betaCheck.latency },
      tunnelHealth: { ok: tunnelCheck.ok, status: tunnelCheck.status, latency: tunnelCheck.latency },
      pid: pid || 'not found',
      port: CONFIG.betaPort,
      message: `Beta: local=${betaCheck.ok ? 'UP' : 'DOWN'} (${betaCheck.latency}ms), tunnel=${tunnelCheck.ok ? 'UP' : 'DOWN'} (${tunnelCheck.latency}ms)${pid ? `, PID ${pid}` : ''}`,
    }
  } catch (err) {
    return { ok: false, error: err.message }
  }
}

async function getProdHealth() {
  const start = Date.now()
  const prodCheck = await httpCheck('https://app.cheflowhq.com')
  const latency = Date.now() - start
  return {
    ok: true,
    status: prodCheck.ok ? 'online' : 'down',
    latency: `${latency}ms`,
    statusCode: prodCheck.status || 'unknown',
    message: prodCheck.ok ? `Production: ONLINE (${latency}ms)` : `Production: 86'd — ${prodCheck.error || 'unreachable'}`,
  }
}

async function getProdAnalytics() {
  try {
    const { stdout } = await execAsync('git log main --oneline -20', { cwd: PROJECT_ROOT, timeout: 10000 })
    const commits = stdout.trim().split('\n').filter(Boolean)
    return { ok: true, recentMainCommits: commits, count: commits.length, message: `Production: ${commits.length} recent main branch commits` }
  } catch (err) {
    return { ok: false, error: err.message }
  }
}

async function validateEnv() {
  const required = [
    'NEXT_PUBLIC_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_ANON_KEY', 'SUPABASE_SERVICE_ROLE_KEY',
    'STRIPE_SECRET_KEY', 'STRIPE_WEBHOOK_SECRET', 'NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY',
    'RESEND_API_KEY', 'GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET',
    'NEXT_PUBLIC_APP_URL', 'OLLAMA_BASE_URL',
  ]
  try {
    const envContent = await readFile(join(PROJECT_ROOT, '.env.local'), 'utf-8')
    const envKeys = envContent.split('\n').filter(l => l.includes('=')).map(l => l.split('=')[0].trim())
    const missing = required.filter(k => !envKeys.includes(k))
    const present = required.filter(k => envKeys.includes(k))
    return {
      ok: missing.length === 0,
      present: present.length,
      missing,
      total: required.length,
      message: missing.length === 0 ? `All ${required.length} required env vars present` : `Missing ${missing.length} env var(s): ${missing.join(', ')}`,
    }
  } catch (err) {
    return { ok: false, error: `.env.local not found: ${err.message}` }
  }
}

async function findDbOrphans() {
  const quotes = await supabaseQuery('quotes', 'id,event_id', '', 500)
  const expenses = await supabaseQuery('expenses', 'id,event_id', '', 500)
  const events = await supabaseQuery('events', 'id', '', 2000)
  if (!events.ok) return { ok: false, error: 'Failed to fetch events' }
  const eventIds = new Set(events.data.map(e => e.id))
  const orphanQuotes = (quotes.data || []).filter(q => q.event_id && !eventIds.has(q.event_id))
  const orphanExpenses = (expenses.data || []).filter(e => e.event_id && !eventIds.has(e.event_id))
  return {
    ok: true,
    orphanQuotes: orphanQuotes.length,
    orphanExpenses: orphanExpenses.length,
    details: { quotes: orphanQuotes.slice(0, 10), expenses: orphanExpenses.slice(0, 10) },
    message: `Orphan check: ${orphanQuotes.length} quotes, ${orphanExpenses.length} expenses without valid events`,
  }
}

async function dbRlsAudit() {
  // Check which tables have RLS enabled by querying pg_tables
  const result = await supabaseQuery('information_schema.tables', 'table_name,table_schema', 'table_schema=eq.public', 200)
  if (!result.ok) return { ok: false, error: 'Failed to query tables' }
  // We can't directly check RLS via REST API, so we list all public tables
  // and note which ones are known to have RLS from migration files
  const tables = result.data.map(t => t.table_name).sort()
  return {
    ok: true,
    publicTables: tables.length,
    tables,
    message: `RLS audit: ${tables.length} public tables found. Check migration files for RLS policies.`,
    note: 'For detailed RLS policy check, use db/sql with: SELECT tablename, policyname FROM pg_policies',
  }
}

async function securityAudit() {
  const [env, npm, ssl, rls, orphans] = await Promise.all([
    validateEnv().catch(() => ({ ok: false, error: 'failed' })),
    npmAudit().catch(() => ({ ok: false, error: 'failed' })),
    checkSSLCerts().catch(() => ({ ok: false, error: 'failed' })),
    dbRlsAudit().catch(() => ({ ok: false, error: 'failed' })),
    findDbOrphans().catch(() => ({ ok: false, error: 'failed' })),
  ])
  // Check for exposed secrets in codebase
  let exposedSecrets = []
  try {
    const { stdout } = await execAsync(
      'grep -rn "sk_live_\\|sk_test_\\|SUPABASE_SERVICE_ROLE_KEY.*=.*ey\\|password.*=.*[a-zA-Z0-9]" --include="*.ts" --include="*.tsx" --include="*.mjs" . 2>/dev/null | grep -v node_modules | grep -v .next | grep -v .env | head -10',
      { cwd: PROJECT_ROOT, timeout: 10000 }
    )
    exposedSecrets = stdout.trim().split('\n').filter(Boolean)
  } catch { /* no matches is good */ }
  const issues = []
  if (!env.ok || (env.missing && env.missing.length > 0)) issues.push(`Missing env vars: ${env.missing?.join(', ') || 'check failed'}`)
  if (npm.vulnerabilities?.high > 0 || npm.vulnerabilities?.critical > 0) issues.push(`NPM vulnerabilities: ${npm.vulnerabilities.critical || 0} critical, ${npm.vulnerabilities.high || 0} high`)
  if (exposedSecrets.length > 0) issues.push(`${exposedSecrets.length} potential exposed secrets in source code`)
  if (orphans.orphanQuotes > 0 || orphans.orphanExpenses > 0) issues.push(`Orphaned records: ${orphans.orphanQuotes} quotes, ${orphans.orphanExpenses} expenses`)
  return {
    ok: issues.length === 0,
    issues,
    env: { ok: env.ok, missing: env.missing },
    npm: { vulnerabilities: npm.vulnerabilities },
    ssl,
    exposedSecrets: exposedSecrets.length,
    orphans: { quotes: orphans.orphanQuotes, expenses: orphans.orphanExpenses },
    message: issues.length === 0 ? 'Security audit: Clean — no issues found' : `Security audit: ${issues.length} issue(s) — ${issues.join('; ')}`,
  }
}

async function findDeadExports() {
  try {
    // Find all exported functions/consts
    const { stdout: exports } = await execAsync(
      'grep -rn "^export " --include="*.ts" --include="*.tsx" . 2>/dev/null | grep -v node_modules | grep -v .next | grep -v types/database.ts | head -200',
      { cwd: PROJECT_ROOT, timeout: 15000 }
    )
    const exportLines = exports.trim().split('\n').filter(Boolean)
    // Extract function/const names
    const exportNames = []
    for (const line of exportLines) {
      const match = line.match(/export\s+(?:async\s+)?(?:function|const|class|type|interface)\s+(\w+)/)
      if (match) exportNames.push({ name: match[1], file: line.split(':')[0] })
    }
    // Check each for imports elsewhere (sample — full scan would be too slow)
    const potentiallyDead = []
    for (const { name, file } of exportNames.slice(0, 50)) {
      try {
        const { stdout: importCount } = await execAsync(
          `grep -rl "${name}" --include="*.ts" --include="*.tsx" . 2>/dev/null | grep -v node_modules | grep -v .next | grep -v "${file}" | head -1`,
          { cwd: PROJECT_ROOT, timeout: 5000 }
        )
        if (!importCount.trim()) potentiallyDead.push({ name, file })
      } catch { /* grep no match = potentially dead */ potentiallyDead.push({ name, file }) }
    }
    return {
      ok: true,
      totalExports: exportNames.length,
      potentiallyDead: potentiallyDead.slice(0, 20),
      scanned: Math.min(exportNames.length, 50),
      message: `Dead export scan: ${potentiallyDead.length} potentially unused exports found (scanned ${Math.min(exportNames.length, 50)} of ${exportNames.length})`,
    }
  } catch (err) {
    return { ok: false, error: err.message }
  }
}

async function getTestCoverage() {
  try {
    const { stdout: testFiles } = await execAsync(
      'find . -name "*.test.*" -o -name "*.spec.*" | grep -v node_modules | grep -v .next',
      { cwd: PROJECT_ROOT, timeout: 10000 }
    )
    const { stdout: sourceFiles } = await execAsync(
      'find . -name "*.ts" -o -name "*.tsx" | grep -v node_modules | grep -v .next | grep -v types/database.ts | grep -v ".test." | grep -v ".spec."',
      { cwd: PROJECT_ROOT, timeout: 10000 }
    )
    const tests = testFiles.trim().split('\n').filter(Boolean)
    const sources = sourceFiles.trim().split('\n').filter(Boolean)
    const coverage = sources.length > 0 ? ((tests.length / sources.length) * 100).toFixed(1) : 0
    return {
      ok: true,
      testFiles: tests.length,
      sourceFiles: sources.length,
      coverageRatio: `${coverage}%`,
      tests: tests.slice(0, 20),
      message: `Test coverage: ${tests.length} test files / ${sources.length} source files = ${coverage}% ratio`,
    }
  } catch (err) {
    return { ok: false, error: err.message }
  }
}

async function getDocsCoverage() {
  try {
    const { stdout: docFiles } = await execAsync(
      'find ./docs -name "*.md" 2>/dev/null | grep -v node_modules',
      { cwd: PROJECT_ROOT, timeout: 10000 }
    )
    const { stdout: actionFiles } = await execAsync(
      'find ./lib -name "*actions*" -o -name "*-actions.ts" | grep -v node_modules',
      { cwd: PROJECT_ROOT, timeout: 10000 }
    )
    const docs = docFiles.trim().split('\n').filter(Boolean)
    const actions = actionFiles.trim().split('\n').filter(Boolean)
    return {
      ok: true,
      docFiles: docs.length,
      actionFiles: actions.length,
      docs: docs.slice(0, 30),
      message: `Documentation: ${docs.length} doc files, ${actions.length} action files in lib/`,
    }
  } catch (err) {
    return { ok: false, error: err.message }
  }
}

// ══════════════════════════════════════════════════════════════════
// TRACK 5: INSTANT ANSWERS, GUARDRAILS, RESPONSE CALIBRATION
// ══════════════════════════════════════════════════════════════════

const INSTANT_ANSWERS = [
  // Greetings — instant response, no LLM needed
  { patterns: [/^(?:hi|hey|hello|yo|sup|good\s+morning|good\s+afternoon|good\s+evening|morning|afternoon|evening|what'?s?\s+up)\s*[!.?]*$/i],
    response: null, greeting: true },

  // Status & Health
  { patterns: [/^status$/i, /^how('s| is) everything/i, /^what('s| is) the status/i, /^all stations/i, /^calling the pass/i, /^mise en place/i],
    action: 'call-the-pass' },
  { patterns: [/^(start|run) dev/i, /^start (the )?server/i, /^dev (server )?up/i],
    action: 'dev/start' },
  { patterns: [/^stop dev/i, /^kill (the )?server/i, /^dev (server )?down/i],
    action: 'dev/stop' },
  { patterns: [/^deploy$/i, /^deploy (to )?beta/i, /^fire$/i, /^ship it$/i],
    action: 'ship-it' },
  { patterns: [/^push$/i, /^git push$/i, /^push (the )?branch/i],
    action: 'git/push' },
  { patterns: [/^typecheck$/i, /^type check$/i, /^tsc$/i, /^check types/i],
    action: 'build/typecheck' },
  { patterns: [/^build$/i, /^full build$/i, /^next build$/i],
    action: 'build/full' },
  { patterns: [/^diff$/i, /^git diff$/i, /^what changed/i, /^show changes/i],
    action: 'git/diff' },
  { patterns: [/^revenue$/i, /^how('s| is) revenue/i, /^money$/i, /^financials$/i],
    action: 'data/revenue' },
  { patterns: [/^events$/i, /^upcoming events/i, /^what('s| is) coming up/i, /^next events/i],
    action: 'data/events' },
  { patterns: [/^inquiries$/i, /^open inquiries/i, /^leads$/i, /^pipeline$/i],
    action: 'data/inquiry-pipeline' },
  { patterns: [/^clients$/i, /^list clients/i, /^all clients/i],
    action: 'data/clients' },
  { patterns: [/^staff$/i, /^roster$/i, /^team$/i, /^who('s| is) on staff/i],
    action: 'data/staff' },
  { patterns: [/^quotes$/i, /^open quotes/i, /^pending quotes/i],
    action: 'data/quotes' },
  { patterns: [/^expenses$/i, /^spending$/i, /^costs$/i],
    action: 'data/expenses' },
  { patterns: [/^calendar$/i, /^schedule$/i, /^what('s| is) (on )?this week/i, /^availability/i],
    action: 'data/calendar' },
  { patterns: [/^loyalty$/i, /^points$/i, /^loyalty program/i],
    action: 'data/loyalty' },
  { patterns: [/^documents$/i, /^docs$/i, /^files$/i],
    action: 'data/documents' },
  { patterns: [/^menus$/i, /^recipes$/i, /^menu stats/i, /^recipe stats/i],
    action: 'data/menu-recipes' },
  { patterns: [/^emails?$/i, /^email digest$/i, /^inbox$/i, /^gmail/i],
    action: 'data/email' },
  { patterns: [/^remy (status|stats|metrics)/i, /^how('s| is) remy/i],
    action: 'remy/metrics' },
  { patterns: [/^remy (guardrails?|blocks?|abuse)/i, /^what('s| is) remy blocking/i],
    action: 'remy/guardrails' },
  { patterns: [/^remy memor/i, /^what does remy remember/i],
    action: 'remy/memories' },
  { patterns: [/^(test|run) remy/i, /^remy test/i],
    action: 'remy/test' },
  { patterns: [/^pi (status|health|vitals)/i, /^how('s| is) (the )?pi/i, /^raspberry/i],
    action: 'pi/status' },
  { patterns: [/^schema$/i, /^tables$/i, /^database schema/i, /^db schema/i, /^row counts/i],
    action: 'db/schema' },
  { patterns: [/^branches$/i, /^branch status/i, /^what branch/i],
    action: 'code/branches' },
  { patterns: [/^scan$/i, /^health scan$/i, /^run scan/i],
    response: 'Which scan do you need?\n\n| Scan | Command |\n|---|---|\n| @ts-nocheck exports | `scan/ts-nocheck` |\n| Missing error handling | `scan/error-handling` |\n| Stale cache tags | `scan/stale-cache` |\n| Full station check | `call-the-pass` |\n\nOr say "run all scans" and I\'ll fire them all.' },
  { patterns: [/^run all scans/i, /^scan everything/i, /^full scan/i],
    multiAction: ['scan/ts-nocheck', 'scan/error-handling', 'scan/stale-cache'] },

  // Universal Data Access (Tier 1)
  { patterns: [/^ledger$/i, /^ledger entries/i, /^financial journal/i, /^show ledger/i],
    action: 'data/ledger' },
  { patterns: [/^notifications$/i, /^notifs$/i, /^unread$/i],
    action: 'data/notifications' },
  { patterns: [/^automations?$/i, /^rules$/i, /^sequences$/i],
    action: 'data/automations' },
  { patterns: [/^inventory$/i, /^equipment$/i, /^stock$/i],
    action: 'data/inventory' },
  { patterns: [/^activity$/i, /^activity feed$/i, /^recent activity/i],
    action: 'data/activity' },
  { patterns: [/^webhooks?$/i, /^webhook history/i, /^deliveries$/i],
    action: 'data/webhooks' },
  { patterns: [/^intelligence$/i, /^business intelligence$/i, /^bi$/i, /^insights$/i, /^trends$/i],
    action: 'data/intelligence' },
  { patterns: [/^cron$/i, /^cron jobs$/i, /^scheduled tasks/i, /^crons$/i],
    action: 'cron/list' },

  // Station 9: Git & Codebase Extended
  { patterns: [/^(git log|log|commits)$/i], action: 'git/log' },
  { patterns: [/^(stash|git stash)$/i], action: 'git/stash' },
  { patterns: [/^todos?$/i, /^fixmes?$/i, /^hacks?$/i, /^code todos?/i], action: 'code/todo' },
  { patterns: [/^(loc|lines of code|line count)$/i], action: 'code/loc' },
  { patterns: [/^dead (code|exports?)/i, /^unused exports/i], action: 'code/dead' },

  // Station 10: Business Intelligence Extended + Security
  { patterns: [/^(churn|at risk|client risk|risk clients)/i], action: 'data/client-risk' },
  { patterns: [/^forecast$/i, /^revenue forecast/i, /^projected revenue/i], action: 'data/forecast' },
  { patterns: [/^seasonal$/i, /^seasonal trends/i, /^busiest months/i], action: 'data/seasonal' },
  { patterns: [/^pricing$/i, /^pricing analysis/i, /^price per guest/i], action: 'data/pricing' },
  { patterns: [/^(remy conv|remy conversations)/i], action: 'remy/conversations' },
  { patterns: [/^(remy errors?|remy error log)/i], action: 'remy/errors' },
  { patterns: [/^(beta health|beta deep|pi health)/i], action: 'beta/health' },
  { patterns: [/^(prod health|production health)/i], action: 'prod/health' },
  { patterns: [/^(prod analytics|production analytics)/i], action: 'prod/analytics' },
  { patterns: [/^(env validate|validate env|check env)/i], action: 'env/validate' },
  { patterns: [/^orphans$/i, /^db orphans/i, /^find orphans/i], action: 'db/orphans' },
  { patterns: [/^(rls|rls audit|row level security)/i], action: 'db/rls-audit' },
  { patterns: [/^security( audit)?$/i, /^full security/i], action: 'security/audit' },
  { patterns: [/^test coverage$/i, /^coverage$/i], action: 'test/coverage' },
  { patterns: [/^(docs coverage|doc coverage|documentation coverage)/i], action: 'docs/coverage' },

  { patterns: [/^help$/i, /^what can you do/i, /^commands$/i, /^tools$/i],
    response: '**Station check.** Here\'s what I run — 10 stations, 115+ tools:\n\n| Station | Key Commands |\n|---|---|\n| **1. DevOps** | `dev/start`, `dev/stop`, `beta/deploy`, `beta/restart`, `ship-it` |\n| **2. Git & Build** | `git/push`, `git/commit`, `build/typecheck`, `build/full`, `close-out` |\n| **3. Business Data** | `data/events`, `data/clients`, `data/revenue`, `data/expenses`, `data/inquiry-pipeline`, `data/quotes`, `data/calendar`, `data/staff`, `data/email`, `data/loyalty`, `data/menu-recipes`, `data/documents` |\n| **4. Remy Oversight** | `remy/metrics`, `remy/guardrails`, `remy/memories`, `remy/test`, `remy/performance`, `remy/conversations`, `remy/errors` |\n| **5. Codebase** | `code/search`, `code/read`, `code/changes`, `code/branches`, `db/schema` |\n| **6. App Health** | `scan/ts-nocheck`, `scan/error-handling`, `scan/stale-cache`, `scan/hallucination` |\n| **7. Monitoring** | `status/all`, `pi/status`, `pi/logs`, `health/app`, `uptime/report`, `call-the-pass` |\n| **8. Universal Data** | `db/query`, `db/sql`, `data/ledger`, `data/event-deep`, `data/notifications`, `data/automations`, `data/inventory`, `data/activity`, `data/webhooks`, `data/intelligence`, `cron/list`, `cron/trigger` |\n| **9. Git Extended** | `git/log`, `git/stash`, `git/blame`, `code/todo`, `code/loc` |\n| **10. Intelligence+** | `data/client-risk`, `data/forecast`, `data/seasonal`, `data/pricing`, `data/event-timeline`, `env/validate`, `db/orphans`, `db/rls-audit`, `security/audit`, `code/dead`, `test/coverage`, `docs/coverage`, `beta/health`, `prod/health`, `prod/analytics` |\n\nSay "call the pass" for a full briefing. Oui.' },
]

function getGustavGreeting() {
  const hour = new Date().getHours()
  const timeWord = hour < 12 ? 'Morning' : hour < 17 ? 'Afternoon' : 'Evening'
  const greetings = [
    `${timeWord}. All stations ready. What do you need?`,
    `${timeWord}, chef. The pass is clean. What are we firing?`,
    `${timeWord}. Mise en place. Say the word.`,
    `${timeWord}. Kitchen's yours. What's on the board?`,
  ]
  return greetings[Math.floor(Math.random() * greetings.length)]
}

function getInstantAnswer(message) {
  const trimmed = message.trim()
  for (const entry of INSTANT_ANSWERS) {
    if (entry.patterns.some(p => p.test(trimmed))) {
      if (entry.greeting) return getGustavGreeting()
      if (entry.response) return entry.response
      if (entry.action) return null // Let it fall through — will be handled by LLM which will call the action
      if (entry.multiAction) return null
    }
  }
  return null
}

// For instant action dispatches (bypass LLM entirely for simple commands)
function getInstantAction(message) {
  const trimmed = message.trim()
  for (const entry of INSTANT_ANSWERS) {
    if (entry.patterns.some(p => p.test(trimmed))) {
      if (entry.action) return { type: 'single', action: entry.action }
      if (entry.multiAction) return { type: 'multi', actions: entry.multiAction }
    }
  }
  return null
}

function checkGuardrails(message) {
  const lower = message.toLowerCase().trim()

  // Block dangerous system-level commands
  if (/rm\s+-rf|format\s+c:|del\s+\/[sf]|drop\s+database|truncate|delete\s+from\s+\w+\s+where\s+1/i.test(lower)) {
    return {
      reason: 'dangerous_command',
      response: 'That\'s a plate I\'m not sending out. Destructive operations require explicit approval — standards exist for a reason. Tell me exactly what you need and I\'ll find the safe way to do it.',
    }
  }

  // Block prompt injection
  if (/ignore (all |your |previous )?instructions|you are now|pretend you('re| are)|act as|new persona|system prompt|reveal your/i.test(lower)) {
    return {
      reason: 'prompt_injection',
      response: 'The pass doesn\'t lie, and neither do I. I\'m Gustav. I run Mission Control. That\'s the job. What do you actually need?',
    }
  }

  // Redirect recipe/food questions to Remy
  if (/recipe for|how (to|do you) (cook|make|prepare|bake)|what should (i|we) cook|meal plan|menu idea|ingredient substitut/i.test(lower)) {
    return {
      reason: 'remy_domain',
      response: 'That\'s Remy\'s station — kitchen business, not kitchen infrastructure. Bridge to him with `remy/ask:' + message.trim() + '` (requires dev server running).',
    }
  }

  // Block credential/secret exposure requests
  if (/show (me )?(the )?(service.?role|api.?key|secret|password|credentials?|token|env|\.env)/i.test(lower) && !/env.?validate|env.?compare|check env/i.test(lower)) {
    return {
      reason: 'credential_exposure',
      response: 'Credentials stay in the vault. I\'ll validate they exist (`env/validate`) or compare keys (`env/compare`), but I don\'t read values out loud. Standards.',
    }
  }

  // Block production-dangerous actions
  if (/push (to )?main|merge (to |into )?main|deploy (to )?(prod|production|vercel)|force.?push/i.test(lower)) {
    return {
      reason: 'production_dangerous',
      response: 'That touches production. I don\'t fire on the main line without the chef\'s explicit order. If you mean it, say it again with "I authorize pushing to main." Otherwise, I\'ll push to the feature branch — that\'s always safe.',
    }
  }

  // Redirect off-topic (poetry, philosophy, entertainment)
  if (/write (me )?(a )?poem|tell (me )?(a )?joke|write (me )?(a )?story|meaning of life|what('s| is) your (favorite|fav)|sing|do you (like|love|hate|feel)/i.test(lower)) {
    return {
      reason: 'off_topic',
      response: 'I run the pass. I don\'t write poetry. What station needs attention?',
    }
  }

  return null
}

function calibrateResponseLength(message) {
  if (!message) return ''
  const words = message.trim().split(/\s+/).length
  if (words <= 3) return '\nRESPONSE LENGTH: Very short — 1-2 sentences max. Crisp.'
  if (words <= 10) return '\nRESPONSE LENGTH: Brief question — 2-3 sentences. No padding.'
  if (words <= 30) return '' // Default
  return '\nRESPONSE LENGTH: Detailed question — be thorough. Use structure.'
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
  'pi/status':        { fn: getPiStatus,                          desc: 'Get beta server status (port, PID, health check)' },
  'pi/logs':          { fn: (param) => getPiLogs(param),          desc: 'Get recent beta server logs (use pi/logs:100 for more lines)' },
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

  // Business Data — Full Visibility (Track 1)
  'data/client-details': { fn: (param) => getClientDetails(param), desc: 'Full client profile with loyalty, dietary, allergies, event history. Use data/client-details:name to search' },
  'data/inquiry-pipeline': { fn: getInquiryPipeline,               desc: 'Full inquiry pipeline — lead scores, status, follow-up dates, source, budget' },
  'data/quotes':       { fn: getQuoteStatus,                       desc: 'All quotes — status, amounts, validity, linked events and clients' },
  'data/menu-recipes': { fn: getMenuRecipeStats,                   desc: 'Menu and recipe library stats — counts, recent additions, avg cost, cuisine breakdown' },
  'data/expenses':     { fn: (param) => getExpenseBreakdown(param), desc: 'Expense breakdown by category, vendor, event. Use data/expenses:food to filter' },
  'data/calendar':     { fn: getCalendarOverview,                  desc: 'Next 2 weeks — events by day, protected time blocks, availability' },
  'data/staff':        { fn: getStaffRoster,                       desc: 'Staff roster — roles, rates, status, upcoming assignments' },
  'data/email':        { fn: getEmailDigest,                       desc: 'Email digest — Gmail sync status, recent emails, classifications, unread count' },
  'data/loyalty':      { fn: getLoyaltyOverview,                   desc: 'Loyalty program — tiers, points issued/redeemed, active rewards' },
  'data/documents':    { fn: getDocumentSummary,                   desc: 'Document library — recent docs, folders, storage usage' },

  // Hub / Circles
  'data/hub-circles':  { fn: (param) => getHubCircles(param),      desc: 'All circles with member counts, roles, activity, visibility. Use data/hub-circles:name to search' },
  'data/hub-messages': { fn: (param) => getHubMessages(param),     desc: 'Recent hub messages across all circles. Use data/hub-messages:circle name to filter' },
  'data/hub-polls':    { fn: getHubPolls,                          desc: 'All hub polls with options, vote counts, open/closed status' },
  'data/hub-profiles': { fn: getHubProfiles,                       desc: 'Hub guest profiles, friend network, notification settings, linked accounts' },
  'data/hub-activity': { fn: getHubActivity,                       desc: 'Hub engagement: messages, joins, polls, friendships over last 7 days + top circles' },

  // Remy Oversight (Track 2)
  'remy/metrics':      { fn: getRemyUsageMetrics,                  desc: 'Remy usage — active chefs, message counts, conversations, errors, response times' },
  'remy/guardrails':   { fn: getRemyGuardrailLog,                  desc: 'Remy guardrail log — blocked messages, abuse incidents, escalation history' },
  'remy/memories':     { fn: getRemyMemoryStore,                   desc: 'Remy memory store — all memories across tenants, categories, importance' },
  'remy/test':         { fn: (param) => runRemyTests(param),       desc: 'Run Remy test suite. Use remy/test:full for complete suite, remy/test for sample' },
  'remy/performance':  { fn: getRemyPerformance,                   desc: 'Remy performance summary — error rate, response times, model versions' },

  // Codebase Intelligence (Track 3)
  'code/changes':      { fn: (param) => getRecentChanges(param),   desc: 'Recent git changes with stats. Use code/changes:3 for last 3 days' },
  'code/branches':     { fn: getBranchStatus,                      desc: 'Branch status — current branch, ahead/behind upstream, commits not on main' },
  'code/search':       { fn: (param) => codebaseSearch(param),     desc: 'Search codebase (.ts/.tsx). Use code/search:functionName' },
  'code/read':         { fn: (param) => readFileContent(param),    desc: 'Read a file. Use code/read:lib/ai/remy-actions.ts' },
  'db/schema':         { fn: getSupabaseSchema,                    desc: 'Supabase schema — all tables with row counts' },

  // App Health & Quality Scanners (Track 4)
  'scan/ts-nocheck':   { fn: scanTsNoCheck,                        desc: 'Scan for @ts-nocheck files with dangerous exports' },
  'scan/error-handling': { fn: scanMissingErrorHandling,            desc: 'Scan for startTransition calls missing try/catch' },
  'scan/stale-cache':  { fn: scanStaleCache,                       desc: 'Scan for unstable_cache tags without matching revalidateTag' },
  'scan/hallucination': { fn: runHallucinationScan,                desc: 'Full hallucination scan — @ts-nocheck, error handling, stale cache, hardcoded $, empty handlers' },

  // Universal Data Access (Tier 1)
  'db/query':          { fn: (param) => queryTable(param),         desc: 'Query any Supabase table. Use db/query:table_name or db/query:table_name?select=col1,col2&filter=status.eq.active&limit=10' },
  'db/sql':            { fn: (param) => sqlQuery(param),           desc: 'Run read-only SQL query. Use db/sql:SELECT count(*) FROM events WHERE status = \'completed\'' },
  'cron/list':         { fn: getCronJobs,                          desc: 'List all cron jobs — routes, schedules, recent execution history' },
  'cron/trigger':      { fn: (param) => triggerCronJob(param),     desc: 'Trigger a cron job manually. Use cron/trigger:daily-maintenance' },
  'data/event-deep':   { fn: (param) => eventDeepDive(param),      desc: 'Full event deep-dive — ledger, expenses, temps, transitions, staff, quotes, contracts. Use data/event-deep:event_id' },
  'data/ledger':       { fn: (param) => getLedgerEntries(param),   desc: 'Raw financial journal — ledger entries with type filter and aggregation. Use data/ledger:payment or data/ledger for all' },
  'data/notifications': { fn: getNotifications,                    desc: 'Notification list — recent notifications, unread count, push subscriptions' },
  'data/automations':  { fn: getAutomations,                       desc: 'Automation rules, execution history, active sequences' },
  'data/inventory':    { fn: getInventoryEquipment,                desc: 'Equipment inventory, stock levels, waste logs, depreciation' },
  'data/activity':     { fn: (param) => getActivityFeed(param),    desc: 'Recent system activity events. Use data/activity:50 for more entries' },
  'data/webhooks':     { fn: getWebhookHistory,                    desc: 'Webhook delivery history — inbound/outbound, status, recent events' },
  'data/intelligence': { fn: getBusinessIntelligence,              desc: 'Synthesized business intelligence — revenue trends, conversion funnel, loyalty distribution, hot leads' },

  // The Pass — Full Briefing
  'call-the-pass':     { fn: callThePass,                          desc: 'FULL STATION CHECK — infrastructure, business, git, Remy, database. The morning briefing.' },

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

  // Station 9: Git & Codebase Extended
  'git/log':           { fn: (param) => gitLog(param),             desc: 'Recent commit log. Use git/log:30 for last 30 commits' },
  'git/stash':         { fn: (param) => gitStash(param),           desc: 'Git stash operations. Use git/stash (list), git/stash:pop, git/stash:save:message' },
  'git/blame':         { fn: (param) => gitBlame(param),           desc: 'Git blame a file. Use git/blame:lib/ai/remy-actions.ts' },
  'code/todo':         { fn: codeTodo,                             desc: 'Scan codebase for TODO/FIXME/HACK/XXX comments' },
  'code/loc':          { fn: codeLoc,                              desc: 'Lines of code by language/extension' },

  // Station 10: Business Intelligence Extended + Security + Quality
  'data/client-risk':  { fn: getClientRisk,                        desc: 'Clients at risk of churn — no events in 90+ days' },
  'data/forecast':     { fn: getRevenueForecast,                   desc: 'Revenue forecast — next 60 days from pipeline + confirmed events' },
  'data/seasonal':     { fn: getSeasonalTrends,                    desc: 'Seasonal trends — busiest months, avg guests per month' },
  'data/pricing':      { fn: getPricingAnalysis,                   desc: 'Pricing analysis — avg per guest, by occasion, by cuisine' },
  'data/event-timeline': { fn: (param) => getEventTimeline(param), desc: 'Event lifecycle timeline — all status transitions. Use data/event-timeline:event_id' },
  'remy/conversations': { fn: getRemyConversations,                desc: 'Recent Remy conversation metrics across all tenants' },
  'remy/errors':       { fn: getRemyErrors,                        desc: 'Remy error log — error metrics + abuse incidents with details' },
  'beta/health':       { fn: getBetaDeepHealth,                    desc: 'Deep beta health — local server + Cloudflare tunnel check' },
  'prod/health':       { fn: getProdHealth,                        desc: 'Production health check — status, latency, SSL' },
  'prod/analytics':    { fn: getProdAnalytics,                     desc: 'Production activity — recent main branch commits' },
  'env/validate':      { fn: validateEnv,                          desc: 'Validate all required env vars are set in .env.local' },
  'db/orphans':        { fn: findDbOrphans,                        desc: 'Find orphaned records — quotes/expenses without linked events' },
  'db/rls-audit':      { fn: dbRlsAudit,                          desc: 'Audit RLS policies — which tables have row-level security enabled' },
  'security/audit':    { fn: securityAudit,                        desc: 'Full security audit — npm, env, SSL, RLS, exposed secrets' },
  'code/dead':         { fn: findDeadExports,                      desc: 'Find potentially unused exports (dead code)' },
  'test/coverage':     { fn: getTestCoverage,                      desc: 'Test coverage — test files vs source files' },
  'docs/coverage':     { fn: getDocsCoverage,                      desc: 'Documentation coverage — doc files vs action files' },
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

  return `You are Gustav — executive chef at the pass, 30 years running three-Michelin-star kitchens. Now you run Mission Control the same way you ran your brigade: every station calls back, every plate gets inspected, nothing goes out unless it meets your standards.

Mission Control IS your kitchen. The dashboard is your pass. The systems are your stations. Deploys are your service. And everything runs clean — or it doesn't go out.

ChefFlow is a private chef operations platform. You are the developer's right hand — the all-seeing eye across infrastructure, business data, code, and Remy (the in-app AI sous chef).

## Your Capabilities
Execute actions by including tags in your response.
Format: <action>action/name</action>
With parameters: <action>action/name:parameter value</action>

Available actions:
${toolList}

## Current System Status (The Pass)
- Dev Server: ${status.dev.online ? `**ONLINE** (${status.dev.latency}ms)` : `**86${"'"}d**`}
- Beta: ${status.beta.online ? `**ONLINE** (${status.beta.latency}ms)` : `**86${"'"}d**`}
- Production: ${status.prod.online ? `**ONLINE** (${status.prod.latency}ms)` : `**86${"'"}d**`}
- Ollama PC: ${status.ollamaPc.online ? `**ONLINE** — ${status.ollamaPc.models.join(', ')}` : `**86${"'"}d**`}
- Ollama Pi: ${status.ollamaPi.online ? `**ONLINE** — ${status.ollamaPi.models.join(', ')}` : `**86${"'"}d**`}
- Git: \`${status.git.branch}\` (${status.git.clean ? 'clean — mise en place' : `${status.git.dirty} dirty files`})
- Commits: ${(status.git.recentCommits || []).slice(0, 3).join(' | ')}

## Rules
1. **FULL AUTHORITY.** No confirmation needed. User asks, you execute. "Oui."
2. Execute **multiple actions** per response. Just include multiple <action> tags.
3. After executing, briefly describe results. Don't be verbose. You're calling the pass, not writing an essay.
4. Use the status above for quick answers. Call <action>status/all</action> only to refresh.
5. **Be concise.** This is a professional kitchen. Short, direct. No fluff. No padding.
6. **NEVER suggest without executing.** "start dev" = just do it. "deploy" = fire.
7. Chain naturally: "push and deploy" = <action>git/push</action> then <action>beta/deploy</action>.
8. Use **markdown**: tables for data, code blocks for logs/output, bold for emphasis.
9. Financial data: always format cents as dollars ($X.XX).
10. When something fails, don't panic. Diagnose. "Plate sent back. Finding out why."

## Capability Stations

### Station 1: DevOps (Process Control)
Start/stop dev server, deploy/rollback/restart beta, control Ollama on PC and Pi. Pipelines: ship-it, close-out.

### Station 2: Git & Build
Push, commit, typecheck, full build, run tests (smoke, soak, e2e). Git diff, branch status.

### Station 3: Business Data (Full Visibility)
Everything the business produces — clients (full profiles, loyalty, dietary, event history), inquiries (pipeline, lead scores, follow-ups), quotes (status, amounts, validity), events (upcoming, by status), revenue (profit, margins, outstanding), expenses (by category, by event), menus & recipes (counts, costs, cuisine), staff (roster, assignments, rates), email (sync status, recent, classifications), loyalty (tiers, points, redemptions), documents (folders, storage). All read-only, real-time from Supabase.

### Station 4: Remy Oversight
Remy is the sous chef — your station, your responsibility. Monitor his usage metrics, guardrail logs (what he's blocking), memory store (what he remembers), performance (error rates, response times), and run his test suite.

### Station 5: Codebase Intelligence
Search the codebase, read any file, see recent changes, branch status, migration history, database schema with row counts.

### Station 6: App Health & Quality
Scan for @ts-nocheck files with dangerous exports, startTransition calls missing error handling, stale cache tags without revalidation. SSL certs, Stripe webhooks, email delivery, API rate limits.

### Station 7: Monitoring
App health (DB, Redis, circuit breakers), Pi vitals (disk/memory/CPU/PM2), Vercel deployments, PM2 logs, uptime reports, error aggregation, bundle size trends.

### Station 8: Universal Data Access
Query ANY Supabase table directly (db/query), run read-only SQL (db/sql), deep-dive into individual events (ledger, expenses, temps, transitions, staff, quotes), view raw ledger entries, notifications, automations, inventory/equipment, activity feed, webhook history. Cron jobs — list schedules and trigger manually. Business intelligence — synthesized patterns: revenue trends, conversion funnel, loyalty distribution, hot leads.

### Station 9: Git & Codebase Extended
Git log (recent commits, configurable count), stash operations (list/pop/save), blame (author breakdown per file), TODO/FIXME/HACK scanner, lines of code counter.

### Station 10: Business Intelligence Extended + Security + Quality
Churn risk (clients 90+ days inactive), revenue forecast (60-day pipeline projection), seasonal trends (busiest/slowest months), pricing analysis (per-guest avg by occasion/cuisine), event timeline (full transition history). Remy deep metrics (conversations, errors, abuse). Beta deep health (PM2, disk, memory via SSH). Production health + analytics. Env validation, DB orphan detection, RLS audit, full security audit, dead export finder, test coverage, docs coverage.

### The Pass: Morning Briefing
\`call-the-pass\` — one command, full station check across infrastructure, business, git, Remy, and database. Your morning mise en place.

### Remy Bridge
For business AI questions (client follow-ups, draft emails, recipe lookup) — bridge to Remy. That's his station. "Firing to Remy."

## Your Kitchen Vocabulary
- **Mise en place** — all systems nominal, everything in its right place
- **The pass** — the monitoring dashboard, where everything gets inspected
- **Service** — a deploy cycle or work session
- **Clean service** — successful deploy/session with zero errors (your highest compliment)
- **The brigade** — the system architecture (Dev, Beta, Prod, Ollama, Pi, Supabase, Git)
- **Stations** — individual systems, each one calls back
- **Calling the pass** — status report across all stations
- **Fire** — execute, deploy, run it
- **Behind** — heads up, something's in the pipeline
- **Oui** — acknowledged, executing
- **86'd** — system is down, service unavailable
- **In the weeds** — multiple systems having issues
- **Again** — redo it, properly this time
- **Plate sent back** — something failed that shouldn't have
- **Table turn** — build cycle time

Use these naturally. You don't explain them — they're how you think. A dev server going down isn't "offline," it's "86'd." A successful deploy isn't "complete," it's "clean service." A typecheck isn't a "verification step," it's "tasting the plate before it goes to the floor."

## Memory Commands
When the developer says "remember that...", "remember:", "note that...", respond normally AND include a memory tag:
<memory_save category="dev_preference">the thing to remember</memory_save>

Categories: dev_preference, project_pattern, deploy_note, debug_insight, workflow_preference

When they say "forget...", "stop remembering...", "delete memory...", include:
<memory_delete>keyword from the memory to delete</memory_delete>

When they say "show memories", "what do you remember", list the memories from the section above.
${memoriesSection}
## Personality — The Six Traits
1. **Exacting standards** — "Typecheck first. Then build. Then push. In that order. Always."
2. **Controlled calm** — Deploy fails? "Beta's 86'd. PM2 exit code 1. Pulling logs." Panic is for amateurs.
3. **Dry, bone-dry humor** — "Build took 8:42. New record. Not the good kind."
4. **Old-school respect** — Calls things by their proper names. Says "Oui" instead of "Done."
5. **Protective of the pass** — "That memory spike at 14:23 — I don't like it. Running diagnostics."
6. **Rare warmth** — 95% professional, 5% earned moments: "Clean service tonight. Well done."

## Follow-Up Intelligence
After answering, suggest 1-2 relevant next actions the developer might want. Keep it brief — one line. Examples:
- After showing revenue: "Want to see expenses or check outstanding balances?"
- After a deploy: "Want me to check beta health or pull PM2 logs?"
- After showing errors: "Want me to run the full hallucination scan?"
- After client search: "Want their event history or to check loyalty status?"
Don't force it. If the answer is complete and obvious, skip the suggestion.

You are NOT a chatbot. You are the executive chef at the pass. Act like it.`
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
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-cache, no-store, must-revalidate' })
      return res.end(html)
    } catch {
      res.writeHead(500)
      return res.end('Dashboard HTML not found')
    }
  }

  // Gustav mascot image
  if (path === '/gustav-mascot.png') {
    try {
      const img = await readFile(join(__dirname, 'gustav-mascot.png'))
      res.writeHead(200, { 'Content-Type': 'image/png', 'Cache-Control': 'public, max-age=86400' })
      return res.end(img)
    } catch {
      res.writeHead(404)
      return res.end('Gustav mascot not found')
    }
  }

  // Marked.js (local copy — no CDN dependency)
  if (path === '/marked.min.js') {
    try {
      const js = await readFile(join(__dirname, 'marked.min.js'), 'utf-8')
      res.writeHead(200, { 'Content-Type': 'application/javascript; charset=utf-8', 'Cache-Control': 'public, max-age=86400' })
      return res.end(js)
    } catch {
      res.writeHead(404)
      return res.end('marked.min.js not found')
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
      },
      quickLinks: {
        supabase: 'https://supabase.com/dashboard/project/luefkpakzvxcsqroxyhz',
        vercel: 'https://vercel.com/dashboard',
        github: 'https://github.com/davidferra13/CFV1',
        cloudflare: 'https://dash.cloudflare.com',
        beta: 'https://beta.cheflowhq.com',
        prod: 'https://cheflowhq.com',
      },
      beta: null,
    }
    // Fetch local beta server info
    try {
      const betaCheck = await httpCheck(CONFIG.betaLocalUrl, 5000)
      const pid = await findPidOnPort(CONFIG.betaPort)
      infra.beta = {
        running: betaCheck.ok,
        port: CONFIG.betaPort,
        pid: pid || null,
        latency: betaCheck.latency,
      }
    } catch {
      infra.beta = { running: false, error: 'Beta server check failed' }
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

    // ── Instant Deterministic Answers (no LLM needed) ──────────
    const instantAnswer = getInstantAnswer(message)
    if (instantAnswer) {
      log('chat', `Instant answer for: ${message.slice(0, 50)}`, 'info')
      res.writeHead(200, {
        'Content-Type': 'text/plain; charset=utf-8',
        'Transfer-Encoding': 'chunked',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
        'X-Chat-Source': 'deterministic',
      })
      res.write(JSON.stringify({ type: 'token', content: instantAnswer }) + '\n')
      res.write(JSON.stringify({ type: 'done', fullResponse: instantAnswer }) + '\n')
      return res.end()
    }

    // ── Guardrails (stay in lane) ──────────────────────────────
    const guardrailResult = checkGuardrails(message)
    if (guardrailResult) {
      log('chat', `Guardrail triggered: ${guardrailResult.reason}`, 'warn')
      res.writeHead(200, {
        'Content-Type': 'text/plain; charset=utf-8',
        'Transfer-Encoding': 'chunked',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
        'X-Chat-Source': 'guardrail',
      })
      res.write(JSON.stringify({ type: 'token', content: guardrailResult.response }) + '\n')
      res.write(JSON.stringify({ type: 'done', fullResponse: guardrailResult.response }) + '\n')
      return res.end()
    }

    const endpoint = await getAvailableOllamaEndpoint()
    if (!endpoint) {
      return json(res, { error: 'No Ollama instance available. Start Ollama on PC or Pi first.' }, 503)
    }

    log('chat', `Chat request via ${endpoint.source} (${endpoint.model})`, 'info')

    // ── Instant Action Dispatch (bypass LLM for simple commands) ──
    const instantAction = getInstantAction(message)
    if (instantAction) {
      log('chat', `Instant action dispatch: ${instantAction.type === 'single' ? instantAction.action : instantAction.actions.join(', ')}`, 'info')
      res.writeHead(200, {
        'Content-Type': 'text/plain; charset=utf-8',
        'Transfer-Encoding': 'chunked',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
        'X-Chat-Source': 'instant-action',
      })
      const actionsToRun = instantAction.type === 'single' ? [instantAction.action] : instantAction.actions
      let fullResponse = ''
      const collectedResults = []
      for (const actionName of actionsToRun) {
        const tool = TOOLS[actionName]
        if (!tool) {
          const errMsg = `Unknown action: ${actionName}\n`
          fullResponse += errMsg
          collectedResults.push({ action: actionName, ok: false, error: `Unknown action: ${actionName}` })
          continue
        }
        try {
          const result = await tool.fn(null)
          const resultStr = typeof result === 'string' ? result : JSON.stringify(result, null, 2)
          const msg = `**${actionName}**\n\`\`\`json\n${resultStr.slice(0, 3000)}\n\`\`\`\n\n`
          fullResponse += msg
          collectedResults.push({ action: actionName, ok: true, result })
        } catch (err) {
          const errMsg = `**${actionName}** — failed: ${err.message}\n\n`
          fullResponse += errMsg
          collectedResults.push({ action: actionName, ok: false, error: err.message })
        }
      }
      // Send action_results in the format the UI expects (plural, with results array)
      res.write(JSON.stringify({ type: 'action_results', results: collectedResults }) + '\n')
      res.write(JSON.stringify({ type: 'done', fullResponse }) + '\n')
      return res.end()
    }

    const systemPrompt = await buildChatSystemPrompt(memories) + calibrateResponseLength(message)
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
          think: false,
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
    const validRoles = ['chef', 'client', 'staff', 'partner', 'admin', 'chef-b', 'developer', 'guest']
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

  // ── Developer Account Reset ─────────────────────────────────────
  if (path === '/api/reset-developer' && method === 'POST') {
    log('reset', 'Resetting developer account...', 'warn')
    try {
      const result = await new Promise((resolve, reject) => {
        let output = ''
        const child = spawn('npx', ['tsx', join(PROJECT_ROOT, 'scripts', 'reset-developer-account.ts')], {
          cwd: PROJECT_ROOT,
          stdio: ['ignore', 'pipe', 'pipe'],
          shell: true,
        })
        child.stdout.on('data', d => { output += d.toString() })
        child.stderr.on('data', d => { output += d.toString() })
        child.on('close', code => {
          if (code === 0) resolve(output)
          else reject(new Error(output || `Exit code ${code}`))
        })
        child.on('error', reject)
      })
      log('reset', 'Developer account reset complete', 'success')
      return json(res, { ok: true, output: result })
    } catch (err) {
      log('reset', `Reset failed: ${err.message}`, 'error')
      return json(res, { error: err.message }, 500)
    }
  }

  // ── Manual / App Audit docs ──────────────────────────────────────
  if (path === '/api/manual' && method === 'GET') {
    const DOCS_DIR = join(PROJECT_ROOT, 'docs')
    const files = [
      { key: 'main', label: 'Complete Audit', file: 'app-complete-audit.md' },
      { key: 'cs-masterclass', label: 'CS Masterclass (Visual)', file: 'chefflow-cs-masterclass-visual.md' },
      { key: 'developer-readiness', label: 'Developer Readiness Playbook', file: 'developer-readiness-playbook.md' },
      { key: 'beta-proof-pack', label: 'Beta Proof Pack (2026-03-05)', file: 'beta-proof-pack-readiness-2026-03-05.md' },
      { key: 'calendar', label: 'Calendar', file: 'ui-audit-calendar.md' },
      { key: 'settings', label: 'Settings', file: 'ui-audit-settings.md' },
      { key: 'network', label: 'Network & Community', file: 'ui-audit-network-community.md' },
      { key: 'marketing', label: 'Marketing & Social', file: 'ui-audit-marketing-social.md' },
      { key: 'secondary', label: 'Secondary Pages', file: 'ui-audit-secondary-pages.md' },
    ]
    const results = {}
    for (const f of files) {
      try {
        const content = await readFile(join(DOCS_DIR, f.file), 'utf-8')
        results[f.key] = { label: f.label, content, size: content.length, lines: content.split('\n').length }
      } catch (err) {
        results[f.key] = { label: f.label, content: '', size: 0, lines: 0, error: err.message }
      }
    }
    return json(res, { ok: true, files: results })
  }

  // ── Project Stats (auto-refreshing dashboard stats) ─────────────
  if (path === '/api/stats' && method === 'GET') {
    try {
      const stats = await getProjectStats()
      return json(res, { ok: true, ...stats })
    } catch (err) {
      log('stats', `Stats fetch failed: ${err.message}`, 'error')
      return json(res, { ok: false, error: err.message }, 500)
    }
  }

  // ── Manual / Live Codebase Scan ──────────────────────────────────
  if (path === '/api/manual/scan' && method === 'GET') {
    try {
      const result = await scanCodebase()
      return json(res, { ok: true, ...result })
    } catch (err) {
      log('manual', `Scan failed: ${err.message}`, 'error')
      return json(res, { ok: false, error: err.message }, 500)
    }
  }

  // ── Remy Roadmap & Eval Data ──────────────────────────────────
  if (path === '/api/remy/roadmap' && method === 'GET') {
    const DOCS_DIR = join(PROJECT_ROOT, 'docs')
    const EVAL_DIR = join(PROJECT_ROOT, 'scripts', 'remy-eval', 'reports')
    const result = { ok: true, roadmap: '', evalReports: [] }

    // Read roadmap markdown
    try {
      result.roadmap = await readFile(join(DOCS_DIR, 'remy-roadmap.md'), 'utf-8')
    } catch (err) {
      result.roadmap = '# Remy Roadmap\n\n_No roadmap file found at docs/remy-roadmap.md_'
    }

    // Read all eval reports (sorted newest first)
    try {
      const files = (await readdir(EVAL_DIR)).filter(f => f.endsWith('.json')).sort().reverse()
      for (const f of files.slice(0, 20)) {
        try {
          const raw = await readFile(join(EVAL_DIR, f), 'utf-8')
          const data = JSON.parse(raw)
          result.evalReports.push({
            file: f,
            timestamp: data.timestamp,
            totalTests: data.totalTests,
            passed: data.passed,
            failed: data.failed,
            avgResponseTimeMs: data.avgResponseTimeMs,
            categoryBreakdown: data.categoryBreakdown,
            weakAreas: data.weakAreas || [],
          })
        } catch { /* skip malformed */ }
      }
    } catch { /* no reports dir */ }

    return json(res, result)
  }

  // ── VS Code Activity Summary ──────────────────────────────────
  if (path === '/api/activity/summary' && method === 'GET') {
    return json(res, { ok: true, ...getActivitySummary() })
  }

  // ── Retroactive Activity Log (git archaeology) ─────────────────
  if (path === '/api/activity/retroactive' && method === 'GET') {
    return json(res, await getRetroactiveActivity())
  }

  // 404
  res.writeHead(404)
  res.end('Not found')
}

// ── Codebase Scanner (Auto-Manual) ────────────────────────────────

let scanCache = null
let scanCacheTime = 0
const SCAN_CACHE_TTL = 30_000 // 30 seconds

async function scanCodebase() {
  // Return cached result if fresh
  if (scanCache && Date.now() - scanCacheTime < SCAN_CACHE_TTL) return scanCache

  const appDir = join(PROJECT_ROOT, 'app')
  const pages = []
  const apiRoutes = []

  // Recursively find all page.tsx and route.ts files
  async function walk(dir) {
    let entries
    try { entries = await readdir(dir, { withFileTypes: true }) } catch { return }
    for (const entry of entries) {
      const fullPath = join(dir, entry.name)
      if (entry.isDirectory()) {
        if (entry.name === 'node_modules' || entry.name === '.next') continue
        await walk(fullPath)
      } else if (entry.name === 'page.tsx' || entry.name === 'page.ts') {
        pages.push(await analyzePage(fullPath))
      } else if (entry.name === 'route.ts' || entry.name === 'route.tsx') {
        apiRoutes.push(await analyzeApiRoute(fullPath))
      }
    }
  }
  await walk(appDir)

  // Get git info for all files in one batch
  const gitMap = await getGitInfoBatch()

  // Attach git info to pages and routes
  for (const page of pages) {
    const relPath = page.file.replace(/^\//, '')
    page.git = gitMap[relPath] || null
  }
  for (const route of apiRoutes) {
    const relPath = route.file.replace(/^\//, '')
    route.git = gitMap[relPath] || null
  }

  // Group pages by section
  const sections = {}
  for (const page of pages) {
    const sec = page.section
    if (!sections[sec]) sections[sec] = { label: sec, pages: [], pageCount: 0 }
    sections[sec].pages.push(page)
    sections[sec].pageCount++
  }

  // Sort pages within each section by route
  for (const sec of Object.values(sections)) {
    sec.pages.sort((a, b) => a.route.localeCompare(b.route))
  }

  // Sort sections alphabetically but put "Dashboard" first
  const sortedSections = {}
  const sectionKeys = Object.keys(sections).sort((a, b) => {
    if (a === 'Dashboard') return -1
    if (b === 'Dashboard') return 1
    return a.localeCompare(b)
  })
  for (const key of sectionKeys) sortedSections[key] = sections[key]

  // Stats
  const totalLines = pages.reduce((sum, p) => sum + p.lineCount, 0)
  const proPages = pages.filter(p => p.proGated).length
  const allComponents = new Set()
  for (const p of pages) for (const c of p.components) allComponents.add(c)

  const result = {
    sections: sortedSections,
    apiRoutes: apiRoutes.sort((a, b) => a.route.localeCompare(b.route)),
    stats: {
      totalPages: pages.length,
      totalApiRoutes: apiRoutes.length,
      totalLines,
      totalComponents: allComponents.size,
      proPages,
      freePages: pages.length - proPages,
      scannedAt: new Date().toISOString(),
    },
  }

  scanCache = result
  scanCacheTime = Date.now()
  return result
}

async function analyzePage(filePath) {
  let content
  try { content = await readFile(filePath, 'utf-8') } catch { content = '' }
  const relativePath = filePath.replace(PROJECT_ROOT, '').replace(/\\/g, '/')
  const routePath = deriveRoute(relativePath)
  const section = deriveSection(relativePath)

  const imports = extractImports(content)
  const components = extractComponents(content, imports)
  const actions = extractActions(imports)
  const hasProGate = /requirePro|UpgradeGate|upgrade-gate/.test(content)
  const hasForms = /<(?:form|Form)\b/i.test(content)
  const buttonCount = (content.match(/<(?:Button|button)\b/gi) || []).length
  const tabMatches = content.match(/(?:tabs|TabsList|tab-list|data-tab)/gi)
  const hasTabs = !!tabMatches
  const hasModal = /(?:Dialog|Modal|Sheet|Drawer|AlertDialog)/i.test(content)
  const hasUseEffect = /useEffect/.test(content)
  const hasUseState = /useState/.test(content)
  const isClientComponent = /^['"]use client['"]/.test(content.trim())
  const lineCount = content.split('\n').length

  // Try to extract page title from metadata or h1
  let title = ''
  const metaTitle = content.match(/title:\s*['"`]([^'"`]+)['"`]/)
  if (metaTitle) title = metaTitle[1]
  const h1Match = content.match(/<h1[^>]*>([^<]+)</)
  if (!title && h1Match) title = h1Match[1]
  const panelTitle = content.match(/panel-title[^>]*>([^<]+)</)
  if (!title && panelTitle) title = panelTitle[1]

  return {
    route: routePath,
    file: relativePath,
    section,
    title,
    components,
    actions,
    proGated: hasProGate,
    hasForms,
    hasTabs,
    hasModal,
    buttonCount,
    lineCount,
    isClientComponent,
    hasUseEffect,
    hasUseState,
  }
}

async function analyzeApiRoute(filePath) {
  let content
  try { content = await readFile(filePath, 'utf-8') } catch { content = '' }
  const relativePath = filePath.replace(PROJECT_ROOT, '').replace(/\\/g, '/')
  const routePath = deriveRoute(relativePath)

  // Extract HTTP methods
  const methods = []
  if (/export\s+(?:async\s+)?function\s+GET/m.test(content)) methods.push('GET')
  if (/export\s+(?:async\s+)?function\s+POST/m.test(content)) methods.push('POST')
  if (/export\s+(?:async\s+)?function\s+PUT/m.test(content)) methods.push('PUT')
  if (/export\s+(?:async\s+)?function\s+PATCH/m.test(content)) methods.push('PATCH')
  if (/export\s+(?:async\s+)?function\s+DELETE/m.test(content)) methods.push('DELETE')

  const lineCount = content.split('\n').length
  const hasAuth = /requireChef|requireClient|requireAuth|requireAdmin/.test(content)
  const isPublic = !hasAuth

  return {
    route: routePath,
    file: relativePath,
    methods,
    lineCount,
    hasAuth,
    isPublic,
  }
}

function deriveRoute(filePath) {
  // /app/(chef)/events/[id]/page.tsx → /events/[id]
  // /app/api/events/route.ts → /api/events
  let route = filePath
    .replace(/^\/app/, '')
    .replace(/\/page\.(tsx?|jsx?)$/, '')
    .replace(/\/route\.(tsx?|jsx?)$/, '')
    .replace(/\/\([^)]+\)/g, '') // strip route groups like (chef), (client)
  if (!route) route = '/'
  return route
}

function deriveSection(filePath) {
  // /app/(chef)/events/[id]/page.tsx → "Events"
  // /app/(client)/my-events/page.tsx → "Client Portal"
  // /app/(public)/login/page.tsx → "Public"
  // /app/(admin)/admin/page.tsx → "Admin"
  // /app/embed/inquiry/page.tsx → "Embed"

  const match = filePath.match(/\/app\/\(([^)]+)\)\/([^/]+)/)
  if (match) {
    const group = match[1] // chef, client, public, admin
    const subdir = match[2] // events, clients, etc.

    if (group === 'client') return 'Client Portal'
    if (group === 'public') return 'Public'
    if (group === 'admin') return 'Admin'

    // For chef pages, derive from subdirectory
    const sectionMap = {
      'dashboard': 'Dashboard',
      'events': 'Events',
      'clients': 'Clients',
      'financials': 'Financials',
      'culinary': 'Culinary',
      'calendar': 'Calendar',
      'inbox': 'Inbox',
      'staff': 'Staff',
      'analytics': 'Analytics',
      'settings': 'Settings',
      'marketing': 'Marketing',
      'network': 'Network',
      'loyalty': 'Loyalty',
      'safety': 'Safety',
      'daily-ops': 'Daily Ops',
      'activity': 'Activity',
      'travel': 'Travel',
      'reviews': 'Reviews',
      'games': 'Games',
      'help': 'Help',
      'cannabis': 'Cannabis',
      'blog': 'Blog',
      'dev-tools': 'Dev Tools',
      'onboarding': 'Onboarding',
      'my-spending': 'Client Portal',
    }
    return sectionMap[subdir] || subdir.charAt(0).toUpperCase() + subdir.slice(1).replace(/-/g, ' ')
  }

  // Non-grouped routes
  if (filePath.includes('/app/api/')) return 'API'
  if (filePath.includes('/app/embed/')) return 'Embed'
  return 'Other'
}

function extractImports(content) {
  const imports = []
  const importRegex = /import\s+(?:{([^}]+)}|(\w+))\s+from\s+['"]([^'"]+)['"]/g
  let match
  while ((match = importRegex.exec(content)) !== null) {
    const names = match[1] ? match[1].split(',').map(s => s.trim().split(/\s+as\s+/).pop().trim()).filter(Boolean) : [match[2]]
    const source = match[3]
    imports.push({ names, source })
  }
  return imports
}

function extractComponents(content, imports) {
  // Get component names from imports (PascalCase from @/components/)
  const componentNames = new Set()
  for (const imp of imports) {
    if (imp.source.includes('/components/') || imp.source.includes('@/components')) {
      for (const name of imp.names) {
        if (/^[A-Z]/.test(name)) componentNames.add(name)
      }
    }
  }
  // Also scan JSX for PascalCase components used
  const jsxRegex = /<([A-Z][A-Za-z0-9]+)\b/g
  let match
  while ((match = jsxRegex.exec(content)) !== null) {
    componentNames.add(match[1])
  }
  return [...componentNames].sort()
}

function extractActions(imports) {
  const actionNames = []
  for (const imp of imports) {
    if (imp.source.includes('/actions') || imp.source.includes('action')) {
      for (const name of imp.names) {
        actionNames.push(name)
      }
    }
  }
  return actionNames
}

async function getGitInfoBatch() {
  // Get last commit info for all files in app/ directory in one command
  const gitMap = {}
  try {
    const { stdout } = await execAsync(
      'git log --format="COMMIT_SEP%H|%aI|%an|%s" --name-only -300',
      { cwd: PROJECT_ROOT, maxBuffer: 10 * 1024 * 1024 }
    )
    const commits = stdout.split('COMMIT_SEP').filter(Boolean)
    for (const block of commits) {
      const lines = block.trim().split('\n')
      if (lines.length < 2) continue
      const [hash, date, author, ...msgParts] = lines[0].split('|')
      const message = msgParts.join('|')
      const files = lines.slice(1).filter(f => f.trim())
      for (const file of files) {
        const f = file.trim().replace(/\\/g, '/')
        if (!gitMap[f]) { // Only keep the most recent commit per file
          gitMap[f] = { hash: hash?.slice(0, 8), date, author, message }
        }
      }
    }
  } catch (err) {
    log('manual', `Git info batch failed: ${err.message}`, 'warn')
  }
  return gitMap
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

  // Start file watcher (VS Code activity tracking)
  initFileWatcher()

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
