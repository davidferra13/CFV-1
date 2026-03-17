// ── Pixel Kitchen (Basic) ─────────────────────────────────────
// Pixel art kitchen scene for Mission Control.
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
    text('MISSION CONTROL', 24, 27, C.text, 16, 'left')

    // ── Kitchen scene with chef character ──
    const centerX = W / 2
    const centerY = H / 2

    // Draw chef character in center
    const working = tick % 400 < 250
    drawAgent(centerX, centerY, 3, C.crimson, true, working)

    // Label
    text('ChefFlow Kitchen', centerX, centerY + 60, C.textDim, 13, 'center')

    // ── Status bar at bottom ──
    const barY = H - 28
    rect(0, barY, W, 28, 'rgba(20,20,35,0.9)')

    const services = [{ name: 'Ollama', up: true }]
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
