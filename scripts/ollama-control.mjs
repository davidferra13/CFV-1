#!/usr/bin/env node
// ═══════════════════════════════════════════════════════════════════
// Ollama Control Panel - Standalone Desktop Tool
// ═══════════════════════════════════════════════════════════════════
// Runs independently of the ChefFlow app. Use when locked out of
// localhost, beta, or production. Talks directly to Ollama endpoints.
//
// Usage:  node scripts/ollama-control.mjs
//         npm run ollama
//
// Opens: http://localhost:9999
// ═══════════════════════════════════════════════════════════════════

import { createServer } from 'http'
import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

const PORT = 9999
const PC_URL = process.env.OLLAMA_BASE_URL || 'http://localhost:11434'
const PC_MODEL = process.env.OLLAMA_MODEL || 'qwen3-coder:30b'

// ── Ollama Direct API ──────────────────────────────────────────────

async function pingEndpoint(name, url, expectedModel) {
  const result = {
    name,
    url,
    online: false,
    latencyMs: null,
    modelReady: false,
    configuredModel: expectedModel,
    loadedModels: [],
    activeGeneration: false,
    error: null,
  }

  try {
    const start = Date.now()
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 5000)
    const res = await fetch(`${url}/api/tags`, {
      signal: controller.signal,
      cache: 'no-store',
    })
    clearTimeout(timeout)
    result.latencyMs = Date.now() - start

    if (!res.ok) {
      result.error = `HTTP ${res.status}`
      return result
    }

    result.online = true
    const data = await res.json()
    result.loadedModels = (data.models ?? []).map((m) => m.name)
    result.modelReady = result.loadedModels.some(
      (m) => m === expectedModel || m.startsWith(expectedModel.split(':')[0])
    )
  } catch (err) {
    result.error = err?.message || 'Connection failed'
    return result
  }

  // Check if generating
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 3000)
    const psRes = await fetch(`${url}/api/ps`, {
      signal: controller.signal,
      cache: 'no-store',
    })
    clearTimeout(timeout)
    if (psRes.ok) {
      const psData = await psRes.json()
      result.activeGeneration = (psData.models ?? []).length > 0
    }
  } catch {
    // Non-critical
  }

  return result
}

async function getFullHealth() {
  const pc = await pingEndpoint('pc', PC_URL, PC_MODEL)

  const status = pc.online && pc.modelReady ? 'all_healthy' : pc.online ? 'degraded' : 'offline'

  return { status, endpoints: [pc], timestamp: new Date().toISOString() }
}

async function runAction(action) {
  const result = { success: false, message: '', endpoint: 'pc', action }
  const isWindows = process.platform === 'win32'

  try {
    if (action === 'ping') {
      const ping = await pingEndpoint('pc', PC_URL, PC_MODEL)
      result.success = ping.online
      result.message = ping.online
        ? `PC online (${ping.latencyMs}ms)`
        : `PC offline: ${ping.error}`
      return result
    }

    if (action === 'wake') {
      if (isWindows) {
        try {
          await execAsync('powershell -Command "Start-Service Ollama -ErrorAction SilentlyContinue"')
        } catch {
          await execAsync('start "" "ollama" serve', { windowsHide: true })
        }
      } else {
        try {
          await execAsync('systemctl start ollama 2>/dev/null || true')
        } catch {
          await execAsync('ollama serve &')
        }
      }
      await sleep(2000)
      const ping = await pingEndpoint('pc', PC_URL, PC_MODEL)
      result.success = ping.online
      result.message = ping.online
        ? `PC Ollama started (${ping.latencyMs}ms)`
        : 'PC Ollama started but not responding yet'
      return result
    }

    if (action === 'restart') {
      if (isWindows) {
        try {
          await execAsync(
            'powershell -Command "Stop-Service Ollama -ErrorAction SilentlyContinue; Start-Sleep -Seconds 2; Start-Service Ollama -ErrorAction SilentlyContinue"'
          )
        } catch {
          await execAsync('taskkill /F /IM ollama.exe 2>nul || true')
          await sleep(2000)
          await execAsync('start "" "ollama" serve', { windowsHide: true })
        }
      } else {
        await execAsync(
          'systemctl restart ollama 2>/dev/null || (pkill ollama; sleep 2; ollama serve &)'
        )
      }
      await sleep(3000)
      const ping = await pingEndpoint('pc', PC_URL, PC_MODEL)
      result.success = ping.online
      result.message = ping.online
        ? `PC Ollama restarted (${ping.latencyMs}ms)`
        : 'PC Ollama restarted but not responding yet'
      return result
    }

    if (action === 'load-model') {
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 60000)
      const res = await fetch(`${PC_URL}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: PC_MODEL, prompt: '', keep_alive: '5m' }),
        signal: controller.signal,
      })
      clearTimeout(timeout)
      result.success = res.ok
      result.message = res.ok
        ? `Model ${PC_MODEL} loaded on PC`
        : `Failed to load model: HTTP ${res.status}`
      return result
    }

    if (action === 'kill') {
      if (isWindows) {
        await execAsync('taskkill /F /IM ollama.exe 2>nul || true')
      } else {
        await execAsync('pkill ollama || true')
      }
      result.success = true
      result.message = 'PC Ollama process killed'
      return result
    }

    if (action === 'diagnose') {
      const start = Date.now()
      try {
        const controller = new AbortController()
        const timeout = setTimeout(() => controller.abort(), 5000)
        const res = await fetch(`${PC_URL}/api/tags`, { signal: controller.signal, cache: 'no-store' })
        clearTimeout(timeout)
        result.latencyMs = Date.now() - start
        result.success = res.ok
        result.message = res.ok
          ? `PC Ollama is running and responding (${result.latencyMs}ms).`
          : `PC Ollama responded with HTTP ${res.status}.`
      } catch (err) {
        result.latencyMs = Date.now() - start
        const msg = err?.message || 'Unknown error'
        result.success = false
        result.message = msg.includes('ECONNREFUSED')
          ? 'Ollama is NOT running on this PC. Start it with: ollama serve'
          : `PC Ollama unreachable: ${msg}`
      }
      return result
    }

    result.message = `Unknown action: ${action}`
    return result
  } catch (err) {
    result.message = err?.message || 'Unknown error'
    return result
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

// ── HTML UI ──────────────────────────────────────────────────────

function getHTML() {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Ollama Control Panel</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Segoe UI', -apple-system, sans-serif;
      background: #0c0a09;
      color: #e7e5e4;
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 2rem 1rem;
    }
    h1 {
      font-size: 1.5rem;
      font-weight: 700;
      margin-bottom: 0.25rem;
      color: #fafaf9;
    }
    .subtitle {
      font-size: 0.75rem;
      color: #78716c;
      margin-bottom: 2rem;
    }
    .status-bar {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      margin-bottom: 1.5rem;
      padding: 0.75rem 1.25rem;
      border-radius: 999px;
      font-size: 0.875rem;
      font-weight: 600;
    }
    .status-bar.healthy { background: #052e16; border: 1px solid #166534; color: #4ade80; }
    .status-bar.degraded { background: #451a03; border: 1px solid #92400e; color: #fbbf24; }
    .status-bar.offline { background: #450a0a; border: 1px solid #991b1b; color: #f87171; }
    .status-bar .dot {
      width: 10px; height: 10px; border-radius: 50%;
    }
    .status-bar.healthy .dot { background: #4ade80; animation: pulse 2s infinite; }
    .status-bar.degraded .dot { background: #fbbf24; animation: pulse 2s infinite; }
    .status-bar.offline .dot { background: #f87171; }
    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.4; }
    }
    .grid {
      display: grid;
      grid-template-columns: 1fr;
      gap: 1.25rem;
      width: 100%;
      max-width: 480px;
    }
    .card {
      background: #1c1917;
      border: 1px solid #292524;
      border-radius: 1rem;
      padding: 1.5rem;
      position: relative;
      overflow: hidden;
    }
    .card-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 1rem;
    }
    .card-title {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-size: 1rem;
      font-weight: 600;
    }
    .card-title svg { width: 20px; height: 20px; color: #a8a29e; }
    .online-badge, .offline-badge {
      display: inline-flex;
      align-items: center;
      gap: 0.375rem;
      font-size: 0.6875rem;
      font-weight: 600;
      padding: 0.25rem 0.625rem;
      border-radius: 999px;
    }
    .online-badge {
      background: #052e16;
      color: #4ade80;
      border: 1px solid #166534;
    }
    .offline-badge {
      background: #450a0a;
      color: #f87171;
      border: 1px solid #991b1b;
    }
    .online-badge .dot-sm, .offline-badge .dot-sm {
      width: 6px; height: 6px; border-radius: 50%;
    }
    .online-badge .dot-sm { background: #4ade80; animation: pulse 2s infinite; }
    .offline-badge .dot-sm { background: #f87171; }
    .info-row {
      display: flex;
      justify-content: space-between;
      font-size: 0.75rem;
      padding: 0.375rem 0;
      border-bottom: 1px solid #292524;
    }
    .info-row:last-child { border-bottom: none; }
    .info-label { color: #78716c; }
    .info-value { color: #d6d3d1; font-weight: 500; font-family: 'Cascadia Code', monospace; }
    .info-value.good { color: #4ade80; }
    .info-value.warn { color: #fbbf24; }
    .info-value.bad { color: #f87171; }
    .actions {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
      margin-top: 1rem;
    }
    .btn {
      display: inline-flex;
      align-items: center;
      gap: 0.375rem;
      padding: 0.5rem 0.75rem;
      border-radius: 0.5rem;
      font-size: 0.6875rem;
      font-weight: 600;
      border: 1px solid;
      cursor: pointer;
      transition: all 0.15s;
      font-family: inherit;
    }
    .btn:disabled { opacity: 0.4; cursor: not-allowed; }
    .btn svg { width: 14px; height: 14px; }
    .btn-green { background: #052e16; border-color: #166534; color: #4ade80; }
    .btn-green:hover:not(:disabled) { background: #064e3b; }
    .btn-amber { background: #451a03; border-color: #92400e; color: #fbbf24; }
    .btn-amber:hover:not(:disabled) { background: #78350f; }
    .btn-blue { background: #0c1c3a; border-color: #1e40af; color: #60a5fa; }
    .btn-blue:hover:not(:disabled) { background: #1e3a5f; }
    .btn-purple { background: #2e1065; border-color: #6d28d9; color: #a78bfa; }
    .btn-purple:hover:not(:disabled) { background: #3b0f8f; }
    .btn-red { background: #450a0a; border-color: #991b1b; color: #f87171; }
    .btn-red:hover:not(:disabled) { background: #7f1d1d; }
    .toast {
      position: fixed;
      bottom: 1.5rem;
      left: 50%;
      transform: translateX(-50%);
      padding: 0.75rem 1.5rem;
      border-radius: 0.75rem;
      font-size: 0.8125rem;
      font-weight: 500;
      z-index: 100;
      transition: opacity 0.3s;
      max-width: 90%;
      text-align: center;
    }
    .toast.success { background: #052e16; border: 1px solid #166534; color: #4ade80; }
    .toast.error { background: #450a0a; border: 1px solid #991b1b; color: #f87171; }
    .toast.info { background: #0c1c3a; border: 1px solid #1e40af; color: #60a5fa; }
    .toast.hidden { opacity: 0; pointer-events: none; }
    .footer {
      margin-top: 2rem;
      font-size: 0.6875rem;
      color: #57534e;
      text-align: center;
    }
    .footer a { color: #78716c; text-decoration: none; }
    .footer a:hover { color: #a8a29e; }
    .spinner { animation: spin 1s linear infinite; }
    @keyframes spin { to { transform: rotate(360deg); } }
    .global-actions {
      display: flex;
      gap: 0.5rem;
      margin-bottom: 1.5rem;
      justify-content: center;
    }
    .models-list {
      font-size: 0.6875rem;
      color: #78716c;
      margin-top: 0.5rem;
      padding: 0.5rem;
      background: #0c0a09;
      border-radius: 0.375rem;
      max-height: 4rem;
      overflow-y: auto;
    }
    .models-list code {
      display: block;
      padding: 0.125rem 0;
      color: #a8a29e;
      font-family: 'Cascadia Code', monospace;
      font-size: 0.625rem;
    }
    .loading-overlay {
      position: absolute;
      inset: 0;
      background: rgba(12, 10, 9, 0.7);
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 1rem;
      z-index: 10;
    }
    .loading-overlay.hidden { display: none; }
  </style>
</head>
<body>
  <h1>Ollama Control Panel</h1>
  <p class="subtitle">Standalone - bypasses ChefFlow app entirely</p>

  <div id="status-bar" class="status-bar offline">
    <span class="dot"></span>
    <span id="status-text">Checking...</span>
  </div>

  <div class="global-actions">
    <button class="btn btn-blue" onclick="refreshAll()" id="btn-refresh">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12a9 9 0 11-2.2-5.9"/><path d="M21 3v6h-6"/></svg>
      Refresh
    </button>
  </div>

  <div class="grid">
    <div class="card" id="card-pc">
      <div id="loading-pc" class="loading-overlay hidden">
        <svg class="spinner" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#a8a29e" stroke-width="2"><path d="M21 12a9 9 0 11-6.2-8.6"/></svg>
      </div>
      <div class="card-header">
        <div class="card-title">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="4" y="4" width="16" height="16" rx="2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/><line x1="9" y1="15" x2="15" y2="15"/></svg>
          PC (localhost)
        </div>
        <span id="badge-pc" class="offline-badge"><span class="dot-sm"></span>Checking</span>
      </div>
      <div id="info-pc"></div>
      <div class="actions" id="actions-pc"></div>
    </div>
  </div>

  <div id="toast" class="toast hidden"></div>

  <div class="footer">
    <p>Private AI - data stays on your machine</p>
    <p style="margin-top:0.25rem">Ollama: <a href="${PC_URL}" target="_blank">${PC_URL}</a></p>
    <p style="margin-top:0.25rem">Auto-refreshes every 15s &nbsp;|&nbsp; Port ${PORT}</p>
  </div>

  <script>
    const API = '';  // Same origin

    let refreshTimer = null;
    let toastTimer = null;

    // ── Toast ──
    function showToast(msg, type) {
      const t = document.getElementById('toast');
      t.textContent = msg;
      t.className = 'toast ' + type;
      clearTimeout(toastTimer);
      toastTimer = setTimeout(() => t.classList.add('hidden'), 4000);
    }

    // ── Render endpoint card ──
    function renderEndpoint(name, ep) {
      const badge = document.getElementById('badge-' + name);
      const info = document.getElementById('info-' + name);
      const actions = document.getElementById('actions-' + name);

      if (ep.online) {
        badge.className = 'online-badge';
        badge.innerHTML = '<span class="dot-sm"></span>' + ep.latencyMs + 'ms';
      } else {
        badge.className = 'offline-badge';
        badge.innerHTML = '<span class="dot-sm"></span>Offline';
      }

      // Info rows
      let html = '';
      html += infoRow('Model', ep.configuredModel, ep.modelReady ? 'good' : ep.online ? 'warn' : 'bad');
      html += infoRow('Status', ep.online ? (ep.modelReady ? 'Ready' : 'Online (model not loaded)') : (ep.error || 'Unreachable'),
        ep.online && ep.modelReady ? 'good' : ep.online ? 'warn' : 'bad');
      if (ep.latencyMs !== null) html += infoRow('Latency', ep.latencyMs + 'ms', ep.latencyMs < 50 ? 'good' : ep.latencyMs < 200 ? 'warn' : 'bad');
      if (ep.activeGeneration) html += infoRow('Generation', 'Active', 'warn');

      if (ep.loadedModels && ep.loadedModels.length > 0) {
        html += '<div class="models-list">';
        ep.loadedModels.forEach(m => { html += '<code>' + escHtml(m) + '</code>'; });
        html += '</div>';
      }
      info.innerHTML = html;

      // Action buttons
      let btns = '';
      if (!ep.online) {
        btns += actionBtn('Wake', 'green', 'wake',
          '<path d="M18.36 6.64a9 9 0 11-12.73 0"/><line x1="12" y1="2" x2="12" y2="12"/>');
      } else {
        btns += actionBtn('Restart', 'amber', 'restart',
          '<path d="M21 12a9 9 0 11-2.2-5.9"/><path d="M21 3v6h-6"/>');
      }
      btns += actionBtn('Ping', 'blue', 'ping',
        '<path d="M5 12.55a11 11 0 0114.08 0"/><path d="M1.42 9a16 16 0 0121.16 0"/><path d="M8.53 16.11a6 6 0 016.95 0"/><circle cx="12" cy="20" r="1"/>');
      if (ep.online && !ep.modelReady) {
        btns += actionBtn('Load Model', 'purple', 'load-model',
          '<path d="M21 12a9 9 0 11-6.2-8.6"/>');
      }
      if (ep.online) {
        btns += actionBtn('Kill', 'red', 'kill',
          '<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>');
      }
      btns += actionBtn('Diagnose', 'blue', 'diagnose',
        '<path d="M22 12h-4l-3 9L9 3l-3 9H2"/>');
      actions.innerHTML = btns;
    }

    function infoRow(label, value, cls) {
      return '<div class="info-row"><span class="info-label">' + escHtml(label) +
        '</span><span class="info-value ' + cls + '">' + escHtml(String(value)) + '</span></div>';
    }

    function actionBtn(label, color, action, svgPath) {
      return '<button class="btn btn-' + color + '" onclick="doAction(\\'' + action + '\\')">' +
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">' + svgPath + '</svg>' +
        label + '</button>';
    }

    function escHtml(s) {
      const d = document.createElement('div');
      d.textContent = s;
      return d.innerHTML;
    }

    // ── Status bar ──
    function renderStatusBar(data) {
      const bar = document.getElementById('status-bar');
      const text = document.getElementById('status-text');

      if (data.status === 'all_healthy') {
        bar.className = 'status-bar healthy';
        text.textContent = 'Ollama Healthy';
      } else if (data.status === 'degraded') {
        bar.className = 'status-bar degraded';
        text.textContent = 'Ollama Online (model not loaded)';
      } else {
        bar.className = 'status-bar offline';
        text.textContent = 'Ollama Offline';
      }
    }

    // ── API calls ──
    async function refreshAll() {
      try {
        const res = await fetch(API + '/health');
        const data = await res.json();
        renderStatusBar(data);
        data.endpoints.forEach(ep => renderEndpoint(ep.name, ep));
      } catch (err) {
        showToast('Failed to check health: ' + err.message, 'error');
      }
    }

    async function doAction(action) {
      const loader = document.getElementById('loading-pc');
      loader.classList.remove('hidden');

      try {
        const res = await fetch(API + '/action', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action }),
        });
        const data = await res.json();
        const toastType = data.action === 'diagnose' ? 'info' : (data.success ? 'success' : 'error');
        showToast(data.message, toastType);
        // Refresh after action
        setTimeout(refreshAll, 500);
      } catch (err) {
        showToast('Action failed: ' + err.message, 'error');
      } finally {
        loader.classList.add('hidden');
      }
    }

    // ── Auto-refresh ──
    refreshAll();
    refreshTimer = setInterval(refreshAll, 15000);
  </script>
</body>
</html>`
}

// ── HTTP Server ────────────────────────────────────────────────

const server = createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`)

  // CORS (in case you want to hit it from another page)
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') {
    res.writeHead(204)
    res.end()
    return
  }

  // ── Routes ──
  if (url.pathname === '/' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'text/html' })
    res.end(getHTML())
    return
  }

  if (url.pathname === '/health' && req.method === 'GET') {
    try {
      const data = await getFullHealth()
      res.writeHead(200, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify(data))
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ error: err?.message }))
    }
    return
  }

  if (url.pathname === '/action' && req.method === 'POST') {
    let body = ''
    req.on('data', (chunk) => (body += chunk))
    req.on('end', async () => {
      try {
        const { action } = JSON.parse(body)
        const result = await runAction(action)
        res.writeHead(200, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify(result))
      } catch (err) {
        res.writeHead(400, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ success: false, message: err?.message }))
      }
    })
    return
  }

  res.writeHead(404, { 'Content-Type': 'application/json' })
  res.end(JSON.stringify({ error: 'Not found' }))
})

server.listen(PORT, () => {
  console.log('')
  console.log('  ╔══════════════════════════════════════════╗')
  console.log('  ║     Ollama Control Panel - Running       ║')
  console.log(`  ║     http://localhost:${PORT}                ║`)
  console.log('  ╠══════════════════════════════════════════╣')
  console.log(`  ║  Ollama:  ${PC_URL.padEnd(30)}║`)
  console.log(`  ║  Model:   ${PC_MODEL.padEnd(30)}║`)
  console.log('  ╠══════════════════════════════════════════╣')
  console.log('  ║  Ctrl+C to stop                         ║')
  console.log('  ╚══════════════════════════════════════════╝')
  console.log('')

  // Auto-open in browser
  const openCmd =
    process.platform === 'win32' ? 'start' :
    process.platform === 'darwin' ? 'open' : 'xdg-open'
  exec(`${openCmd} http://localhost:${PORT}`)
})
