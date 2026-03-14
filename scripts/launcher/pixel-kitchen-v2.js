// ── Pixel Kitchen (Basic) ─────────────────────────────────────
// Clean OpenClaw Command Center with basic pixel art characters.
// Shows: 4 agents, live activity, job schedule, system status.
;(function () {
  const canvas = document.getElementById('office-canvas')
  if (!canvas) return
  const ctx = canvas.getContext('2d')
  let officeRunning = false
  let officeRAF = null
  let tick = 0

  // ── Colors ──
  const C = {
    bg: '#0e0e1a',
    panel: '#161625',
    panelBorder: '#2a2a44',
    text: '#e0dcd0',
    textDim: '#8888a0',
    green: '#5ac54f',
    red: '#ea323c',
    yellow: '#ffc825',
    orange: '#ed7614',
    blue: '#0098dc',
    cyan: '#0cf1ff',
    crimson: '#c42430',
    lime: '#99e65f',
    gold: '#edab50',
    salmon: '#f68187',
    skin: '#e69c69',
    white: '#f9e6cf',
  }

  // ── Agent activity (polled from server) ──
  let agentLog = { main: [], build: [], qa: [], runner: [] }
  let ocOnline = false
  let ocLastActivity = ''
  let ocJobs = []

  async function pollStatus() {
    try {
      const r = await fetch('/api/openclaw/status')
      if (!r.ok) return
      const d = await r.json()
      ocOnline = d.online || false
      ocLastActivity = d.lastActivity || ''
      if (d.jobs) ocJobs = d.jobs
      if (d.agents) {
        for (const k of Object.keys(agentLog)) {
          if (d.agents[k]) {
            const log = d.agents[k].log || []
            agentLog[k] = log.length > 0 ? log : (ocOnline ? ['Standing by'] : ['OFFLINE'])
          }
        }
      }
      if (!ocOnline) {
        for (const k of Object.keys(agentLog)) agentLog[k] = ['OFFLINE']
      }
    } catch {
      ocOnline = false
      for (const k of Object.keys(agentLog)) agentLog[k] = ['Connection failed']
    }
  }
  pollStatus()
  setInterval(pollStatus, 8000)

  // ── Drawing helpers ──
  function rect(x, y, w, h, color) {
    ctx.fillStyle = color
    ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h))
  }

  function text(str, x, y, color, size, align) {
    ctx.fillStyle = color
    ctx.font = (size || 12) + 'px monospace'
    ctx.textAlign = align || 'left'
    ctx.textBaseline = 'middle'
    ctx.fillText(str, Math.round(x), Math.round(y))
  }

  function roundRect(x, y, w, h, r, color) {
    ctx.fillStyle = color
    ctx.beginPath()
    ctx.roundRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h), r)
    ctx.fill()
  }

  // ── Draw a basic pixel art character ──
  function drawAgent(x, y, scale, color, hasToque, working) {
    const s = scale
    const bob = working ? Math.sin(tick * 0.05) * 2 : 0

    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.3)'
    ctx.beginPath()
    ctx.ellipse(x, y + 14 * s, 5 * s, 2 * s, 0, 0, Math.PI * 2)
    ctx.fill()

    // Legs
    rect(x - 3 * s, y + 10 * s + bob, 2 * s, 4 * s, '#333')
    rect(x + 1 * s, y + 10 * s + bob, 2 * s, 4 * s, '#333')
    // Body
    rect(x - 4 * s, y + 3 * s + bob, 8 * s, 8 * s, color)
    // Arms
    rect(x - 6 * s, y + 4 * s + bob, 2 * s, 6 * s, color)
    rect(x + 4 * s, y + 4 * s + bob, 2 * s, 6 * s, color)
    // Head
    rect(x - 3 * s, y - 2 * s + bob, 6 * s, 5 * s, C.skin)
    // Eyes
    rect(x - 2 * s, y + bob, s, s, '#111')
    rect(x + 1 * s, y + bob, s, s, '#111')
    // Hat
    if (hasToque) {
      rect(x - 3 * s, y - 6 * s + bob, 6 * s, 4 * s, C.white)
      rect(x - 2 * s, y - 9 * s + bob, 4 * s, 3 * s, C.white)
    } else {
      rect(x - 4 * s, y - 3 * s + bob, 8 * s, 2 * s, color)
    }

    // Working sparkle
    if (working && tick % 30 < 15) {
      rect(x + 5 * s, y - 6 * s + bob, 2 * s, 2 * s, C.yellow)
    }
  }

  // ── Main draw ──
  function drawScene() {
    const W = canvas.width
    const H = canvas.height

    // Background
    rect(0, 0, W, H, C.bg)

    // ── Title bar ──
    roundRect(12, 8, W - 24, 36, 6, C.panel)
    const dot = ocOnline ? C.green : C.red
    rect(24, 22, 10, 10, dot)
    text('OPENCLAW COMMAND CENTER', 42, 27, C.text, 16, 'left')
    text(ocOnline ? 'ONLINE  10.0.0.177  v2026.3.13' : 'GATEWAY OFFLINE', W - 24, 27, ocOnline ? C.green : C.red, 13, 'right')
    if (ocLastActivity) {
      const timeStr = ocLastActivity.replace('T', ' ').substring(11, 19)
      text('last: ' + timeStr, W - 300, 27, C.textDim, 11, 'right')
    }

    // ── Agent rows ──
    const agents = [
      { key: 'main', name: 'MAIN', role: 'Conductor', color: C.crimson, toque: true },
      { key: 'build', name: 'BUILD', role: 'Builder', color: C.lime, toque: false },
      { key: 'qa', name: 'QA', role: 'Auditor', color: C.gold, toque: false },
      { key: 'runner', name: 'RUNNER', role: 'Runner', color: C.salmon, toque: false },
    ]

    const agentStartY = 56
    const rowH = Math.min(90, (H - agentStartY - 200) / agents.length)
    const charX = 60
    const textStartX = 120

    agents.forEach((agent, i) => {
      const ry = agentStartY + i * rowH

      // Row background (alternating)
      if (i % 2 === 0) roundRect(12, ry, W - 24, rowH - 4, 4, 'rgba(30,30,50,0.5)')

      // Separator
      if (i > 0) {
        ctx.strokeStyle = 'rgba(255,255,255,0.06)'
        ctx.lineWidth = 1
        ctx.beginPath()
        ctx.moveTo(20, ry)
        ctx.lineTo(W - 20, ry)
        ctx.stroke()
      }

      // Character
      const working = ocOnline && (tick + i * 80) % 400 < 250
      drawAgent(charX, ry + rowH / 2 - 8, 2.5, agent.color, agent.toque, working && ocOnline)

      // Name + role + model
      text(agent.name, textStartX, ry + 16, agent.color, 15, 'left')
      text(agent.role + '  |  llama3.2', textStartX + 90, ry + 16, C.textDim, 11, 'left')

      // Status dot
      const logs = agentLog[agent.key] || []
      const hasActivity = logs.length > 0 && logs[0] !== 'Standing by' && logs[0] !== 'OFFLINE'
      rect(textStartX, ry + 30, 6, 6, hasActivity ? C.green : (ocOnline ? C.yellow : C.red))

      // Activity log lines
      const maxLogLines = Math.floor((rowH - 35) / 14) + 1
      logs.slice(0, maxLogLines).forEach((line, li) => {
        const lineY = ry + 32 + li * 14
        const truncated = line.length > 100 ? line.substring(0, 100) + '...' : line
        text(truncated, textStartX + 12, lineY, li === 0 ? C.text : C.textDim, 10, 'left')
      })
    })

    // ── Job Schedule panel ──
    const schedY = agentStartY + agents.length * rowH + 8
    const schedH = H - schedY - 12
    roundRect(12, schedY, W - 24, schedH, 6, C.panel)
    ctx.strokeStyle = C.panelBorder
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.roundRect(12, schedY, W - 24, schedH, 6)
    ctx.stroke()

    text('JOB SCHEDULE', 28, schedY + 16, C.text, 13, 'left')
    text(ocJobs.length + ' jobs configured', 180, schedY + 16, C.textDim, 11, 'left')

    if (ocJobs.length > 0) {
      // Column headers
      const colX = { name: 28, schedule: 320, agent: 480, channel: 580 }
      const headerY = schedY + 34
      text('Job', colX.name, headerY, C.textDim, 10, 'left')
      text('Schedule', colX.schedule, headerY, C.textDim, 10, 'left')
      text('Agent', colX.agent, headerY, C.textDim, 10, 'left')
      text('Channel', colX.channel, headerY, C.textDim, 10, 'left')

      // Job rows
      const maxJobs = Math.floor((schedH - 50) / 16)
      ocJobs.slice(0, maxJobs).forEach((job, i) => {
        const jy = headerY + 16 + i * 16
        const agentColor = { main: C.crimson, build: C.lime, qa: C.gold, runner: C.salmon }[job.agent] || C.textDim

        // Enabled dot
        rect(colX.name, jy - 3, 4, 4, job.enabled ? C.green : C.red)

        text(job.name || job.id, colX.name + 10, jy, C.text, 10, 'left')
        const sched = typeof job.schedule === 'object' ? (job.schedule.expr || JSON.stringify(job.schedule)) : String(job.schedule)
        text(sched, colX.schedule, jy, C.textDim, 10, 'left')
        text(job.agent, colX.agent, jy, agentColor, 10, 'left')
        text(job.channel || '', colX.channel, jy, C.textDim, 9, 'left')
      })
    } else if (ocOnline) {
      text('Waiting for job data...', 28, schedY + 40, C.textDim, 11, 'left')
    } else {
      text('Gateway offline - no job data available', 28, schedY + 40, C.red, 11, 'left')
    }

    // ── Status bar at bottom ──
    const barY = H - 28
    rect(0, barY, W, 28, 'rgba(20,20,35,0.9)')
    const services = [
      { name: 'OpenClaw', up: ocOnline },
      { name: 'Ollama', up: true }, // assume up if OpenClaw is working
      { name: 'Model: llama3.2', up: ocOnline },
    ]
    services.forEach((svc, i) => {
      const sx = 20 + i * 160
      rect(sx, barY + 10, 8, 8, svc.up ? C.green : C.red)
      text(svc.name, sx + 14, barY + 14, svc.up ? C.text : C.textDim, 10, 'left')
    })

    // Timestamp
    const now = new Date()
    const ts = now.toLocaleTimeString('en-US', { hour12: false })
    text(ts, W - 24, barY + 14, C.textDim, 10, 'right')

    tick++
  }

  // ── Canvas sizing ──
  function initOffice() {
    const parent = canvas.parentElement
    if (!parent) return
    const dpr = window.devicePixelRatio || 1
    const w = parent.clientWidth
    const h = parent.clientHeight - 40
    canvas.width = w * dpr
    canvas.height = h * dpr
    canvas.style.width = w + 'px'
    canvas.style.height = h + 'px'
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    canvas.width = w
    canvas.height = h
  }

  function officeLoop() {
    if (!officeRunning) return
    drawScene()
    officeRAF = requestAnimationFrame(officeLoop)
  }

  window.startPixelOffice = function () {
    if (officeRunning) return
    initOffice()
    officeRunning = true
    officeLoop()
  }

  window.stopPixelOffice = function () {
    officeRunning = false
    if (officeRAF) cancelAnimationFrame(officeRAF)
  }

  // Start immediately
  startPixelOffice()

  // Resize handler
  window.addEventListener('resize', () => {
    if (officeRunning) initOffice()
  })
})()
