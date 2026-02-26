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
// Opens: http://localhost:3200
// ═══════════════════════════════════════════════════════════════════

import { createServer } from 'node:http'
import { exec, spawn } from 'node:child_process'
import { readFile, appendFile, stat } from 'node:fs/promises'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { promisify } from 'node:util'

const execAsync = promisify(exec)
const __dirname = dirname(fileURLToPath(import.meta.url))
const PROJECT_ROOT = join(__dirname, '..', '..')
const PORT = 3200

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

  if (path === '/api/build/typecheck' && method === 'POST') {
    return json(res, await runBuild('typecheck'))
  }
  if (path === '/api/build/full' && method === 'POST') {
    return json(res, await runBuild('full'))
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
