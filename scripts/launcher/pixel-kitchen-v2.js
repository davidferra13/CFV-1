// ── Pixel Kitchen V2 ─────────────────────────────────────────────
// Live data-driven kitchen visualization. Every pixel maps to real data.
// Features: live business data, agent state animations, click-through,
// notification animations, chef progression, day/night, seasonal, sounds
;(function () {
  const P = 6 // pixel scale

  // ── Agent definitions ──
  const AGENTS = [
    {
      id: 'larry',
      name: 'Larry',
      role: 'Exec Chef',
      kitchenRole: 'Calls the pass, reviews every plate',
      color: '#e88f47',
      model: 'Claude Opus 4.6',
      cost: '$$$',
      station: 0,
      isBoss: true,
    },
    {
      id: 'sonnet',
      name: 'Sonnet',
      role: 'Sous Chef',
      kitchenRole: 'Complex refactors, escalations',
      color: '#3b82f6',
      model: 'Claude Sonnet 4.6',
      cost: '$$',
      station: 1,
    },
    {
      id: 'build',
      name: 'Build',
      role: 'Saucier',
      kitchenRole: 'Builds every feature, writes all code',
      color: '#22c55e',
      model: 'qwen3-coder:30b',
      cost: 'FREE',
      station: 2,
    },
    {
      id: 'qa',
      name: 'QA',
      role: 'Tournant',
      kitchenRole: 'Type checks, tests, hallucination scans',
      color: '#a855f7',
      model: 'qwen3:30b',
      cost: 'FREE',
      station: 3,
    },
    {
      id: 'runner',
      name: 'Runner',
      role: 'Expeditor',
      kitchenRole: 'Remy classifier, intent routing, fast ops',
      color: '#eab308',
      model: 'qwen3:4b',
      cost: 'FREE',
      station: 4,
    },
  ]

  // ── Live business data (polled from /api/pixel/data) ──
  let bizData = {
    events: {},
    eventsTotal: 0,
    revenue: {},
    inquiries: { open: 0, overdue: 0, overdueList: [] },
    clients: { total: 0 },
    upcoming: [],
    agentStates: { ollama: false, devServer: false, betaServer: false },
    activity: { recentCommits: 0, recentFileChanges: 0 },
    staff: [],
    weather: null,
    ingredients: [],
    history: [],
  }
  let bizDataLoaded = false
  let lastBizPoll = 0
  const BIZ_POLL_INTERVAL = 15000 // 15s

  async function pollBizData() {
    try {
      const resp = await fetch('/api/pixel/data')
      if (!resp.ok) return
      const data = await resp.json()
      if (data.ok) {
        bizData = data
        bizDataLoaded = true
      }
    } catch {
      /* retry next cycle */
    }
  }
  pollBizData()
  setInterval(pollBizData, BIZ_POLL_INTERVAL)

  // ── Achievement system ──
  let achievementToasts = [] // { text, icon, color, age, maxAge }
  let checkedMilestones = new Set()
  try {
    const saved = localStorage.getItem('pk2-milestones')
    if (saved) checkedMilestones = new Set(JSON.parse(saved))
  } catch {
    /* ignore */
  }

  function parseDollars(d) {
    const r = d.revenue
    if (!r || !r.totalRevenue) return 0
    return parseFloat(String(r.totalRevenue).replace(/[$,]/g, '')) || 0
  }

  const MILESTONES = [
    {
      id: 'client-1',
      test: (d) => d.clients.total >= 1,
      text: 'First Client!',
      icon: '\u{1F464}',
      color: '#a855f7',
    },
    {
      id: 'client-5',
      test: (d) => d.clients.total >= 5,
      text: '5 Clients!',
      icon: '\u{1F465}',
      color: '#a855f7',
    },
    {
      id: 'client-10',
      test: (d) => d.clients.total >= 10,
      text: '10 Clients!',
      icon: '\u{1F389}',
      color: '#a855f7',
    },
    {
      id: 'event-1',
      test: (d) => (d.events.completed || 0) >= 1,
      text: 'First Event Done!',
      icon: '\u2705',
      color: '#22c55e',
    },
    {
      id: 'event-5',
      test: (d) => (d.events.completed || 0) >= 5,
      text: '5 Events Done!',
      icon: '\u{1F3C6}',
      color: '#22c55e',
    },
    {
      id: 'event-10',
      test: (d) => (d.events.completed || 0) >= 10,
      text: '10 Events Done!',
      icon: '\u2B50',
      color: '#ffd700',
    },
    {
      id: 'rev-1k',
      test: (d) => parseDollars(d) >= 1000,
      text: '$1K Revenue!',
      icon: '\u{1F4B0}',
      color: '#22c55e',
    },
    {
      id: 'rev-5k',
      test: (d) => parseDollars(d) >= 5000,
      text: '$5K Revenue!',
      icon: '\u{1F4B0}',
      color: '#3b82f6',
    },
    {
      id: 'rev-10k',
      test: (d) => parseDollars(d) >= 10000,
      text: '$10K Revenue!',
      icon: '\u{1F525}',
      color: '#e88f47',
    },
    {
      id: 'rev-25k',
      test: (d) => parseDollars(d) >= 25000,
      text: '$25K Revenue!',
      icon: '\u{1F680}',
      color: '#a855f7',
    },
    {
      id: 'rev-50k',
      test: (d) => parseDollars(d) >= 50000,
      text: '$50K - HALF WAY!',
      icon: '\u{1F48E}',
      color: '#f59e0b',
    },
    {
      id: 'rev-100k',
      test: (d) => parseDollars(d) >= 100000,
      text: '$100K GRAND CHEF!',
      icon: '\u{1F451}',
      color: '#ffd700',
    },
    {
      id: 'zero-overdue',
      test: (d) => d.inquiries.overdue === 0 && d.inquiries.open > 0,
      text: 'Zero Overdue!',
      icon: '\u2728',
      color: '#22c55e',
    },
    {
      id: 'brigade-online',
      test: (d) => d.agentStates.ollama && d.agentStates.devServer,
      text: 'Brigade Online!',
      icon: '\u{1F7E2}',
      color: '#22c55e',
    },
  ]

  function checkAchievements() {
    if (!bizDataLoaded) return
    MILESTONES.forEach((m) => {
      if (checkedMilestones.has(m.id)) return
      try {
        if (m.test(bizData)) {
          checkedMilestones.add(m.id)
          localStorage.setItem('pk2-milestones', JSON.stringify([...checkedMilestones]))
          achievementToasts.push({
            text: m.text,
            icon: m.icon,
            color: m.color,
            age: 0,
            maxAge: 360,
          })
          if (achievementToasts.length > 3) achievementToasts.shift()
          playBell()
        }
      } catch {
        /* ignore */
      }
    })
  }

  // ── History scrubber state ──
  let historyViewIndex = -1 // -1 = live data

  // ── Remy bubble state ──
  let remyBubbleAge = 0
  let remyBubbleText = ''

  // ── Real file activity feed ──
  let realActivity = []
  let realActivityLoaded = false
  async function pollRealActivity() {
    try {
      const resp = await fetch('/api/activity/summary')
      if (!resp.ok) return
      const data = await resp.json()
      if (data.recent && data.recent.length) {
        realActivity = data.recent.slice(0, 30).map((e) => ({
          file: e.file || e.path || 'unknown',
          time: e.time
            ? new Date(e.time).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
              })
            : '',
          action: e.action || e.eventType || 'modified',
        }))
        realActivityLoaded = true
      }
    } catch {
      /* retry */
    }
  }
  pollRealActivity()
  setInterval(pollRealActivity, 10000)

  // ── Notification queue (animated events) ──
  let notifications = [] // { type, text, x, y, opacity, age, maxAge }
  let lastInquiryCount = -1
  let lastOverdueCount = -1

  function pushNotification(type, text) {
    notifications.push({
      type,
      text,
      x: 0,
      y: 0, // positioned in draw
      opacity: 1,
      age: 0,
      maxAge: 300, // ~5 seconds at 60fps
    })
    if (notifications.length > 5) notifications.shift()
  }

  // ── Sound system ──
  let soundEnabled = false
  const audioCtx = typeof AudioContext !== 'undefined' ? new AudioContext() : null

  function playTone(freq, duration, volume) {
    if (!soundEnabled || !audioCtx) return
    try {
      const osc = audioCtx.createOscillator()
      const gain = audioCtx.createGain()
      osc.connect(gain)
      gain.connect(audioCtx.destination)
      osc.frequency.value = freq
      osc.type = 'sine'
      gain.gain.value = volume || 0.05
      osc.start()
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + (duration || 0.15))
      osc.stop(audioCtx.currentTime + (duration || 0.15))
    } catch {
      /* audio not supported */
    }
  }

  function playSizzle() {
    playTone(200 + Math.random() * 100, 0.08, 0.02)
  }
  function playChop() {
    playTone(800, 0.03, 0.03)
  }
  function playBell() {
    playTone(1200, 0.3, 0.06)
    playTone(1600, 0.2, 0.04)
  }
  function playAlarm() {
    playTone(440, 0.15, 0.05)
    setTimeout(() => playTone(520, 0.15, 0.05), 180)
  }

  // ── Chef progression (based on revenue milestones) ──
  function getChefLevel() {
    const rev = bizData.revenue
    if (!rev || !rev.totalRevenue) return { level: 1, title: 'Commis', stars: 0, color: '#94a3b8' }
    const dollars = parseFloat(rev.totalRevenue.replace(/[$,]/g, '')) || 0
    if (dollars >= 100000) return { level: 6, title: 'Grand Chef', stars: 5, color: '#ffd700' }
    if (dollars >= 50000) return { level: 5, title: 'Chef de Cuisine', stars: 4, color: '#f59e0b' }
    if (dollars >= 25000) return { level: 4, title: 'Sous Chef', stars: 3, color: '#a855f7' }
    if (dollars >= 10000) return { level: 3, title: 'Chef de Partie', stars: 2, color: '#3b82f6' }
    if (dollars >= 5000) return { level: 2, title: 'Demi Chef', stars: 1, color: '#22c55e' }
    return { level: 1, title: 'Commis', stars: 0, color: '#94a3b8' }
  }

  // ── Day/night cycle ──
  function getDayPhase() {
    const h = new Date().getHours()
    if (h >= 6 && h < 10)
      return { phase: 'morning', tint: 'rgba(255,200,100,0.04)', ambientMult: 0.85 }
    if (h >= 10 && h < 16) return { phase: 'day', tint: 'rgba(255,255,255,0)', ambientMult: 1.0 }
    if (h >= 16 && h < 19)
      return { phase: 'golden', tint: 'rgba(255,160,60,0.06)', ambientMult: 0.9 }
    if (h >= 19 && h < 22)
      return { phase: 'evening', tint: 'rgba(30,30,80,0.08)', ambientMult: 0.7 }
    return { phase: 'night', tint: 'rgba(10,10,50,0.15)', ambientMult: 0.5 }
  }

  // ── Seasonal decor ──
  function getSeason() {
    const m = new Date().getMonth()
    if (m >= 2 && m <= 4) return 'spring'
    if (m >= 5 && m <= 7) return 'summer'
    if (m >= 8 && m <= 10) return 'fall'
    return 'winter'
  }

  // ── Clickable regions ──
  let clickRegions = [] // { x, y, w, h, action, label }

  function registerClickRegion(x, y, w, h, action, label) {
    clickRegions.push({ x, y, w, h, action, label })
  }

  // ── State ──
  let officeRunning = false,
    officeRAF = null,
    agents = [],
    canvas,
    ctx
  let lastW = 0,
    lastH = 0,
    tick = 0
  let hoveredRegion = null

  // ── Drawing helpers ──
  function rect(x, y, w, h, col) {
    ctx.fillStyle = col
    ctx.fillRect(Math.round(x), Math.round(y), w, h)
  }

  function roundRect(x, y, w, h, r, col) {
    ctx.fillStyle = col
    ctx.beginPath()
    if (ctx.roundRect) {
      ctx.roundRect(Math.round(x), Math.round(y), w, h, r)
    } else {
      const rx = Math.round(x),
        ry = Math.round(y)
      ctx.moveTo(rx + r, ry)
      ctx.lineTo(rx + w - r, ry)
      ctx.quadraticCurveTo(rx + w, ry, rx + w, ry + r)
      ctx.lineTo(rx + w, ry + h - r)
      ctx.quadraticCurveTo(rx + w, ry + h, rx + w - r, ry + h)
      ctx.lineTo(rx + r, ry + h)
      ctx.quadraticCurveTo(rx, ry + h, rx, ry + h - r)
      ctx.lineTo(rx, ry + r)
      ctx.quadraticCurveTo(rx, ry, rx + r, ry)
    }
    ctx.fill()
  }

  // ── Draw pixel character ──
  function drawCharacter(cx, cy, color, standing, frame, atStation, isBoss, agentState) {
    const s = P
    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.15)'
    ctx.fillRect(cx - 3 * s, cy + 8 * s, 6 * s, 2 * s)

    // Determine animation based on real agent state
    const isWorking = agentState === 'working'
    const isIdle = agentState === 'idle'
    const isStuck = agentState === 'stuck'

    // Legs
    ctx.fillStyle = '#2a2a3a'
    const legBob = standing ? 0 : Math.sin(frame * 0.12) * s
    ctx.fillRect(cx - 2 * s, cy + 3 * s, 2 * s, 5 * s + legBob)
    ctx.fillRect(cx + 0 * s, cy + 3 * s, 2 * s, 5 * s - legBob)
    ctx.fillStyle = '#111'
    ctx.fillRect(cx - 3 * s, cy + 8 * s + legBob, 3 * s, s)
    ctx.fillRect(cx + 0 * s, cy + 8 * s - legBob, 3 * s, s)

    // Chef coat
    ctx.fillStyle = '#f0f0f0'
    ctx.fillRect(cx - 3 * s, cy - 4 * s, 6 * s, 7 * s)
    ctx.fillStyle = '#ddd'
    ctx.fillRect(cx - s, cy - 3 * s, s, s)
    ctx.fillRect(cx - s, cy - s, s, s)
    ctx.fillRect(cx - s, cy + s, s, s)
    ctx.fillStyle = color
    ctx.fillRect(cx - 3 * s, cy - 4 * s, 6 * s, s)

    // Arms (animated based on state)
    ctx.fillStyle = '#f0f0f0'
    if (isWorking && atStation) {
      // Fast working animation
      const workBob = Math.sin(frame * 0.25) * s
      ctx.fillRect(cx - 5 * s, cy - 2 * s, 2 * s, 3 * s)
      ctx.fillRect(cx + 3 * s, cy - 2 * s, 2 * s, 3 * s)
      ctx.fillStyle = '#ffcc88'
      ctx.fillRect(cx - 5 * s, cy + s + workBob, 2 * s, s)
      ctx.fillRect(cx + 3 * s, cy + s - workBob, 2 * s, s)
    } else if (isStuck) {
      // Hands on head (confused)
      ctx.fillRect(cx - 4 * s, cy - 6 * s, 2 * s, 4 * s)
      ctx.fillRect(cx + 2 * s, cy - 6 * s, 2 * s, 4 * s)
      ctx.fillStyle = '#ffcc88'
      ctx.fillRect(cx - 4 * s, cy - 7 * s, 2 * s, s)
      ctx.fillRect(cx + 2 * s, cy - 7 * s, 2 * s, s)
    } else if (atStation) {
      // Slow idle animation
      const idleBob = Math.sin(frame * 0.05) * 0.3
      ctx.fillRect(cx - 5 * s, cy - 2 * s, 2 * s, 3 * s)
      ctx.fillRect(cx + 3 * s, cy - 2 * s, 2 * s, 3 * s)
      ctx.fillStyle = '#ffcc88'
      ctx.fillRect(cx - 5 * s, cy + s + idleBob, 2 * s, s)
      ctx.fillRect(cx + 3 * s, cy + s - idleBob, 2 * s, s)
    } else {
      const armBob = Math.sin(frame * 0.12) * s
      ctx.fillRect(cx - 4 * s, cy - 3 * s, 2 * s, 5 * s + armBob)
      ctx.fillRect(cx + 2 * s, cy - 3 * s, 2 * s, 5 * s - armBob)
    }

    // Apron
    ctx.fillStyle = isBoss ? '#1a1a2e' : color + '40'
    ctx.fillRect(cx - 2 * s, cy - 2 * s, 4 * s, 6 * s)
    ctx.fillStyle = isBoss ? '#333' : color + '60'
    ctx.fillRect(cx - 3 * s, cy - s, s, s)
    ctx.fillRect(cx + 2 * s, cy - s, s, s)

    // Head
    ctx.fillStyle = '#ffcc88'
    ctx.fillRect(cx - 2 * s, cy - 8 * s, 4 * s, 4 * s)

    // Eyes (blink, or X if stuck)
    if (isStuck && frame % 60 < 30) {
      // X eyes for stuck
      ctx.fillStyle = '#ef4444'
      ctx.fillRect(cx - s, cy - 7 * s, s, s)
      ctx.fillRect(cx + s, cy - 7 * s, s, s)
    } else {
      ctx.fillStyle = '#222'
      ctx.fillRect(cx - s, cy - 7 * s, s, s)
      ctx.fillRect(cx + s, cy - 7 * s, s, s)
      if (frame % 180 > 175) {
        ctx.fillStyle = '#ffcc88'
        ctx.fillRect(cx - s, cy - 7 * s, s, s)
        ctx.fillRect(cx + s, cy - 7 * s, s, s)
      }
    }

    // Mouth
    ctx.fillStyle = isStuck ? '#cc4444' : '#cc8866'
    ctx.fillRect(cx - s, cy - 5 * s, 2 * s, s)

    // Chef hat
    if (isBoss) {
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(cx - 3 * s, cy - 9 * s, 6 * s, 2 * s)
      ctx.fillRect(cx - 2 * s, cy - 15 * s, 4 * s, 6 * s)
      ctx.fillStyle = '#eee'
      ctx.fillRect(cx - s, cy - 14 * s, s, 5 * s)
      ctx.fillRect(cx + s, cy - 13 * s, s, 4 * s)
      ctx.fillStyle = '#fff'
      ctx.fillRect(cx - 3 * s, cy - 16 * s, 6 * s, 2 * s)
      // Chef level crown color
      const lvl = getChefLevel()
      ctx.fillStyle = lvl.color
      ctx.fillRect(cx - 3 * s, cy - 9 * s, 6 * s, s)
      // Stars on hat
      if (lvl.stars > 0) {
        ctx.fillStyle = '#ffd700'
        ctx.font = 1.5 * s + 'px monospace'
        ctx.textAlign = 'center'
        ctx.fillText('\u2605'.repeat(Math.min(lvl.stars, 5)), cx, cy - 16 * s)
        ctx.textAlign = 'left'
      }
    } else {
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(cx - 2 * s, cy - 9 * s, 4 * s, s)
      ctx.fillRect(cx - 2 * s, cy - 11 * s, 4 * s, 3 * s)
      ctx.fillStyle = color
      ctx.fillRect(cx - 2 * s, cy - 9 * s, 4 * s, s)
    }

    // Stuck indicator (question marks floating)
    if (isStuck) {
      ctx.fillStyle = '#ef4444'
      ctx.font = 'bold ' + 3 * s + 'px monospace'
      const qBob = Math.sin(frame * 0.1) * 2 * s
      ctx.textAlign = 'center'
      ctx.fillText('?', cx + 6 * s, cy - 12 * s + qBob)
      ctx.textAlign = 'left'
    }

    // Working sparkles
    if (isWorking && frame % 20 < 10) {
      ctx.fillStyle = color + '80'
      const sx1 = cx + Math.sin(frame * 0.3) * 8 * s
      const sy1 = cy - 4 * s + Math.cos(frame * 0.2) * 3 * s
      ctx.fillRect(sx1, sy1, s, s)
    }
  }

  // ── Draw kitchen station ──
  function drawStation(sx, sy, agentColor, frame, hasAgent, stationType, stationData) {
    const s = P

    // Counter base
    ctx.fillStyle = '#8a8a9a'
    ctx.fillRect(sx - 15 * s, sy, 30 * s, 3 * s)
    ctx.fillStyle = '#a0a0b0'
    ctx.fillRect(sx - 15 * s, sy, 30 * s, s)
    ctx.fillStyle = '#666'
    ctx.fillRect(sx - 14 * s, sy + 3 * s, 2 * s, 5 * s)
    ctx.fillRect(sx + 12 * s, sy + 3 * s, 2 * s, 5 * s)

    if (stationType === 'pass') {
      // The pass - heat lamps + real ticket data
      ctx.fillStyle = '#444'
      ctx.fillRect(sx - 10 * s, sy - 14 * s, 2 * s, 12 * s)
      ctx.fillRect(sx + 8 * s, sy - 14 * s, 2 * s, 12 * s)
      ctx.fillRect(sx - 12 * s, sy - 15 * s, 24 * s, 2 * s)
      const glow = 0.6 + Math.sin(tick * 0.03) * 0.2
      ctx.fillStyle = `rgba(255,180,60,${glow})`
      ctx.fillRect(sx - 8 * s, sy - 13 * s, 4 * s, 2 * s)
      ctx.fillRect(sx + 4 * s, sy - 13 * s, 4 * s, 2 * s)
      ctx.fillStyle = 'rgba(255,160,40,0.08)'
      ctx.fillRect(sx - 12 * s, sy - 2 * s, 24 * s, 3 * s)

      // Ticket rail with REAL upcoming events
      ctx.fillStyle = '#555'
      ctx.fillRect(sx - 14 * s, sy - 4 * s, 28 * s, s)
      const upcoming = bizData.upcoming || []
      const ticketCount = Math.min(upcoming.length, 4)
      if (ticketCount > 0) {
        for (let i = 0; i < ticketCount; i++) {
          const tx = sx - 12 * s + i * 7 * s
          const ticketBob = Math.sin(frame * 0.02 + i) * 0.3
          // Color by event status
          const ev = upcoming[i]
          const statusColor =
            ev.status === 'confirmed'
              ? '#22c55e'
              : ev.status === 'paid'
                ? '#3b82f6'
                : ev.status === 'accepted'
                  ? '#eab308'
                  : '#f5f5f5'
          ctx.fillStyle = statusColor + '30'
          ctx.fillRect(tx, sy - 8 * s + ticketBob, 5 * s, 4 * s)
          ctx.fillStyle = '#333'
          ctx.fillRect(tx + s, sy - 7 * s + ticketBob, 3 * s, 0.5 * s)
          ctx.fillRect(tx + s, sy - 6 * s + ticketBob, 2 * s, 0.5 * s)
          // Click ticket to open specific event
          if (ev.id) {
            registerClickRegion(
              tx,
              sy - 8 * s,
              5 * s,
              4 * s,
              () => window.open('http://localhost:3100/events/' + ev.id, '_blank'),
              (ev.name || 'Event') + ' - click to view'
            )
          }
        }
      } else if (hasAgent) {
        // Placeholder tickets when no data
        for (let i = 0; i < 3; i++) {
          const tx = sx - 10 * s + i * 7 * s
          ctx.fillStyle = '#fff9e640'
          ctx.fillRect(tx, sy - 7 * s, 5 * s, 3 * s)
        }
      }

      // Plates on pass (count = completed events)
      const completedCount = Math.min((bizData.events || {}).completed || 0, 6)
      for (let i = 0; i < Math.min(completedCount, 3); i++) {
        ctx.fillStyle = '#f5f5f5'
        ctx.beginPath()
        ctx.arc(sx - 5 * s + i * 5 * s, sy + s, 2.5 * s, 0, Math.PI * 2)
        ctx.fill()
        ctx.fillStyle = ['#8B4513', '#228B22', '#DAA520'][i]
        ctx.fillRect(sx - 6 * s + i * 5 * s, sy, 2 * s, s)
      }
    } else if (stationType === 'stove') {
      // Stove - flames intensity based on active events
      ctx.fillStyle = '#333'
      ctx.fillRect(sx - 12 * s, sy - 10 * s, 24 * s, 10 * s)
      ctx.fillStyle = '#2a2a2a'
      ctx.fillRect(sx - 11 * s, sy - 9 * s, 22 * s, 8 * s)
      ctx.fillStyle = '#444'
      ctx.fillRect(sx - 8 * s, sy - 7 * s, 6 * s, 4 * s)
      ctx.fillRect(sx + 2 * s, sy - 7 * s, 6 * s, 4 * s)

      const activeEvents = (bizData.events || {}).in_progress || 0
      const flameIntensity = Math.min(1, 0.3 + activeEvents * 0.2)
      if (hasAgent) {
        const flicker = Math.sin(frame * 0.2) * 0.5
        ctx.fillStyle = `rgba(255,102,0,${flameIntensity})`
        ctx.fillRect(sx - 7 * s, sy - 5 * s - flicker, 4 * s, s)
        ctx.fillRect(sx + 3 * s, sy - 5 * s + flicker, 4 * s, s)
        ctx.fillStyle = `rgba(255,170,0,${flameIntensity * 0.8})`
        ctx.fillRect(sx - 6 * s, sy - 6 * s + flicker, 2 * s, s)
        ctx.fillRect(sx + 4 * s, sy - 6 * s - flicker, 2 * s, s)
        // Extra flames for high activity
        if (activeEvents >= 2) {
          ctx.fillStyle = `rgba(255,60,0,${flameIntensity * 0.6})`
          ctx.fillRect(sx - 5 * s, sy - 7 * s - flicker, 2 * s, s)
          ctx.fillRect(sx + 5 * s, sy - 7 * s + flicker, 2 * s, s)
        }
        // Pans
        ctx.fillStyle = '#555'
        ctx.fillRect(sx - 9 * s, sy - 8 * s, 8 * s, s)
        ctx.fillRect(sx + 1 * s, sy - 8 * s, 8 * s, s)
        ctx.fillStyle = '#666'
        ctx.fillRect(sx - 10 * s, sy - 8 * s, 2 * s, s)
        ctx.fillRect(sx + 9 * s, sy - 8 * s, 2 * s, s)
        // Steam proportional to activity
        if (frame % 40 < 20 + activeEvents * 5) {
          ctx.fillStyle = 'rgba(255,255,255,0.12)'
          ctx.fillRect(sx - 5 * s, sy - 10 * s - (frame % 15) * 0.4, s, s)
          ctx.fillRect(sx + 5 * s, sy - 11 * s - (frame % 12) * 0.3, s, s)
        }
        // Sizzle sound on high activity
        if (activeEvents >= 2 && frame % 120 === 0) playSizzle()
      }
      // Knobs
      ctx.fillStyle = '#888'
      for (let i = 0; i < 4; i++) {
        ctx.fillRect(sx - 7 * s + i * 5 * s, sy - s, s, s)
      }
    } else if (stationType === 'prep') {
      // Prep station - activity based on file changes
      ctx.fillStyle = '#c9a96e'
      ctx.fillRect(sx - 8 * s, sy - 2 * s, 10 * s, 2 * s)
      ctx.fillStyle = '#b89860'
      ctx.fillRect(sx - 7 * s, sy - s, 8 * s, s)
      if (hasAgent) {
        const chopSpeed = 0.3 + Math.min(bizData.activity.recentFileChanges, 20) * 0.02
        const chop = Math.sin(frame * chopSpeed) * s * 0.5
        ctx.fillStyle = '#ccc'
        ctx.fillRect(sx + 3 * s, sy - 3 * s + chop, s, 2 * s)
        ctx.fillStyle = '#5a3a1a'
        ctx.fillRect(sx + 3 * s, sy - s + chop, s, s)
        ctx.fillStyle = '#ff6347'
        ctx.fillRect(sx - 6 * s, sy - 2 * s, s, s)
        ctx.fillRect(sx - 4 * s, sy - 2 * s, s, s)
        ctx.fillStyle = '#228B22'
        ctx.fillRect(sx - 2 * s, sy - 2 * s, s, s)
        // Chop sound
        if (bizData.activity.recentFileChanges > 5 && frame % 60 === 0) playChop()
      }
      // Mise en place
      ctx.fillStyle = '#999'
      for (let i = 0; i < 3; i++) {
        ctx.fillRect(sx - 12 * s + i * 4 * s, sy - 6 * s, 3 * s, 3 * s)
        ctx.fillStyle = ['#ff6347', '#228B22', '#ffd700'][i]
        ctx.fillRect(sx - 11 * s + i * 4 * s, sy - 5 * s, 2 * s, s)
        ctx.fillStyle = '#999'
      }
    } else if (stationType === 'cold') {
      // Cold station - quality checks
      ctx.fillStyle = '#bbb'
      ctx.fillRect(sx - 12 * s, sy - 8 * s, 10 * s, 8 * s)
      ctx.fillStyle = '#ccc'
      ctx.fillRect(sx - 11 * s, sy - 7 * s, 8 * s, 3 * s)
      ctx.fillRect(sx - 11 * s, sy - 3 * s, 8 * s, 3 * s)
      ctx.fillStyle = '#999'
      ctx.fillRect(sx - 4 * s, sy - 6 * s, s, s)
      ctx.fillRect(sx - 4 * s, sy - 2 * s, s, s)
      // Temp display (green if Ollama online, red if not)
      const ollamaUp = bizData.agentStates.ollama
      ctx.fillStyle = ollamaUp ? '#22c55e' : '#ef4444'
      ctx.font = 1.8 * s + 'px monospace'
      ctx.textAlign = 'center'
      ctx.fillText(ollamaUp ? '38\u00b0' : 'OFF', sx - 7 * s, sy - 8.5 * s)
      ctx.textAlign = 'left'
      // Plates
      ctx.fillStyle = '#f5f5f5'
      for (let i = 0; i < 3; i++) {
        ctx.beginPath()
        ctx.arc(sx + 4 * s + i * 4 * s, sy + s, 1.5 * s, 0, Math.PI * 2)
        ctx.fill()
      }
      // Garnish
      ctx.fillStyle = '#999'
      ctx.fillRect(sx + 2 * s, sy - 4 * s, 10 * s, 3 * s)
      ctx.fillStyle = '#228B22'
      ctx.fillRect(sx + 3 * s, sy - 3 * s, 2 * s, s)
      ctx.fillStyle = '#ff69b4'
      ctx.fillRect(sx + 6 * s, sy - 3 * s, s, s)
      ctx.fillStyle = '#ffd700'
      ctx.fillRect(sx + 8 * s, sy - 3 * s, 2 * s, s)
    }
  }

  // ── SLA smoke effect ──
  function drawSmoke(x, y, intensity) {
    const s = P
    ctx.fillStyle = `rgba(100,100,100,${0.1 * intensity})`
    for (let i = 0; i < Math.min(intensity, 5); i++) {
      const sx = x + Math.sin(tick * 0.05 + i * 2) * 8 * s
      const sy = y - ((tick * 0.3 + i * 4 * s) % (20 * s))
      const size = (1 + Math.sin(tick * 0.02 + i)) * 2 * s
      ctx.beginPath()
      ctx.arc(sx, sy, size, 0, Math.PI * 2)
      ctx.fill()
    }
  }

  // ── Delivery truck animation (new inquiry) ──
  function drawDeliveryTruck(x, y, progress) {
    const s = P
    const tx = x + (1 - progress) * 100 * s
    ctx.globalAlpha = Math.min(1, progress * 3)
    // Truck body
    ctx.fillStyle = '#e88f47'
    ctx.fillRect(tx, y, 12 * s, 6 * s)
    ctx.fillStyle = '#c97a3a'
    ctx.fillRect(tx + 12 * s, y + 2 * s, 5 * s, 4 * s)
    // Wheels
    ctx.fillStyle = '#333'
    ctx.beginPath()
    ctx.arc(tx + 3 * s, y + 7 * s, 1.5 * s, 0, Math.PI * 2)
    ctx.fill()
    ctx.beginPath()
    ctx.arc(tx + 14 * s, y + 7 * s, 1.5 * s, 0, Math.PI * 2)
    ctx.fill()
    // "NEW" label
    ctx.fillStyle = '#fff'
    ctx.font = 'bold ' + 1.5 * s + 'px monospace'
    ctx.textAlign = 'center'
    ctx.fillText('NEW', tx + 6 * s, y + 4 * s)
    ctx.textAlign = 'left'
    ctx.globalAlpha = 1
  }

  // ── Draw kitchen floor ──
  function drawKitchenFloor(w, h) {
    const dayPhase = getDayPhase()
    rect(0, 0, w, h, '#3a3a44')
    const tileSize = P * 8
    for (let y = 0; y < h; y += tileSize) {
      for (let x = 0; x < w; x += tileSize) {
        const shade = (x / tileSize + y / tileSize) % 2 === 0 ? '#383842' : '#3c3c48'
        rect(x, y, tileSize, tileSize, shade)
        ctx.fillStyle = 'rgba(0,0,0,0.1)'
        ctx.fillRect(x, y, tileSize, 1)
        ctx.fillRect(x, y, 1, tileSize)
      }
    }
    // Day/night tint
    if (dayPhase.tint !== 'rgba(255,255,255,0)') {
      rect(0, 0, w, h, dayPhase.tint)
    }
  }

  // ── Draw kitchen wall ──
  function drawKitchenWall(w, h) {
    const s = P
    rect(0, 0, w, 28 * s, '#d4d4d8')
    const wallTile = 4 * s
    for (let y = 0; y < 28 * s; y += wallTile) {
      for (let x = 0; x < w; x += wallTile) {
        ctx.fillStyle = (x / wallTile + y / wallTile) % 2 === 0 ? '#d0d0d4' : '#d8d8dc'
        ctx.fillRect(x, y, wallTile, wallTile)
        ctx.fillStyle = 'rgba(0,0,0,0.03)'
        ctx.fillRect(x, y, wallTile, 1)
        ctx.fillRect(x, y, 1, wallTile)
      }
    }
    // Shelf
    rect(0, 26 * s, w, 3 * s, '#a0a0b0')
    rect(0, 26 * s, w, s, '#b8b8c8')

    // Sign
    const signX = w / 2
    const signY = 6 * s
    rect(signX - 24 * s, signY, 48 * s, 14 * s, '#1a1a2e')
    rect(signX - 23 * s, signY + s, 46 * s, 12 * s, '#0f1420')
    ctx.fillStyle = '#e88f47'
    ctx.font = 'bold ' + 3 * s + 'px monospace'
    ctx.textAlign = 'center'
    ctx.fillText('CHEFFLOW KITCHEN', signX, signY + 8 * s)
    ctx.fillStyle = '#e88f4780'
    ctx.font = 2.0 * s + 'px monospace'
    ctx.fillText('OPS FOR ARTISTS', signX, signY + 11.5 * s)
    ctx.textAlign = 'left'
    // Click sign to open dashboard
    registerClickRegion(
      signX - 24 * s,
      signY,
      48 * s,
      14 * s,
      () => window.open('http://localhost:3100/dashboard', '_blank'),
      'ChefFlow Dashboard'
    )

    // Hood vents
    ctx.fillStyle = '#888'
    rect(w * 0.15, 0, w * 0.3, 6 * s, '#999')
    rect(w * 0.55, 0, w * 0.3, 6 * s, '#999')
    for (let i = 0; i < 4; i++) {
      ctx.fillStyle = '#777'
      ctx.fillRect(w * 0.16, s + i * s * 1.2, w * 0.28, s * 0.5)
      ctx.fillRect(w * 0.56, s + i * s * 1.2, w * 0.28, s * 0.5)
    }

    // Seasonal decor on shelf
    const season = getSeason()
    const shelfY = 25 * s
    if (season === 'spring') {
      ctx.fillStyle = '#ff69b4'
      ctx.fillRect(10 * s, shelfY, 2 * s, 2 * s) // flower
      ctx.fillStyle = '#90ee90'
      ctx.fillRect(14 * s, shelfY, 2 * s, 2 * s) // herb
      ctx.fillStyle = '#ff69b4'
      ctx.fillRect(w - 16 * s, shelfY, 2 * s, 2 * s)
    } else if (season === 'summer') {
      ctx.fillStyle = '#ff6347'
      ctx.fillRect(10 * s, shelfY, 2 * s, 2 * s) // tomato
      ctx.fillStyle = '#ffd700'
      ctx.fillRect(14 * s, shelfY, 2 * s, 2 * s) // corn
      ctx.fillStyle = '#228B22'
      ctx.fillRect(18 * s, shelfY, 2 * s, 2 * s) // basil
    } else if (season === 'fall') {
      ctx.fillStyle = '#ff8c00'
      ctx.fillRect(10 * s, shelfY, 3 * s, 2 * s) // pumpkin
      ctx.fillStyle = '#8b4513'
      ctx.fillRect(15 * s, shelfY, 2 * s, 2 * s) // cinnamon
      ctx.fillStyle = '#daa520'
      ctx.fillRect(w - 16 * s, shelfY, 3 * s, 2 * s)
    } else {
      ctx.fillStyle = '#add8e6'
      ctx.fillRect(10 * s, shelfY, 2 * s, 2 * s) // snowflake
      ctx.fillStyle = '#fff'
      ctx.fillRect(14 * s, shelfY, s, 2 * s) // icicle
      ctx.fillStyle = '#8b0000'
      ctx.fillRect(w - 14 * s, shelfY, 2 * s, 2 * s) // cranberry
    }
  }

  // ── Dining room (revenue visualization, drawn at bottom of kitchen) ──
  function drawDiningRoom(x, y, w, h) {
    const s = P
    const rev = bizData.revenue
    const dollars =
      rev && rev.totalRevenue ? parseFloat(rev.totalRevenue.replace(/[$,]/g, '')) || 0 : 0
    // Tables filled proportional to revenue (max 6 tables at $50k+)
    const tableCount = Math.min(6, Math.floor(dollars / 5000) + 1)
    const tableSpacing = w / (tableCount + 1)

    for (let i = 0; i < tableCount; i++) {
      const tx = x + tableSpacing * (i + 1)
      const ty = y + h * 0.4
      // Table
      ctx.fillStyle = '#5a3a1a'
      ctx.fillRect(tx - 3 * s, ty, 6 * s, 3 * s)
      ctx.fillStyle = '#4a2a0a'
      ctx.fillRect(tx - 2 * s, ty + 3 * s, s, 3 * s)
      ctx.fillRect(tx + s, ty + 3 * s, s, 3 * s)
      // Place settings (white circles)
      ctx.fillStyle = '#f5f5f580'
      ctx.beginPath()
      ctx.arc(tx - s, ty + s, s, 0, Math.PI * 2)
      ctx.fill()
      ctx.beginPath()
      ctx.arc(tx + s, ty + s, s, 0, Math.PI * 2)
      ctx.fill()
    }

    // Outstanding invoices as stacked plates on the pass edge
    const outstanding =
      rev && rev.outstandingBalance
        ? parseFloat(rev.outstandingBalance.replace(/[$,]/g, '')) || 0
        : 0
    const plateStack = Math.min(5, Math.ceil(outstanding / 1000))
    if (plateStack > 0) {
      for (let i = 0; i < plateStack; i++) {
        ctx.fillStyle = '#ef444440'
        ctx.fillRect(x + w - 8 * s, y + i * 2 * s, 6 * s, 1.5 * s)
      }
      ctx.fillStyle = '#ef444480'
      ctx.font = 1.5 * s + 'px monospace'
      ctx.textAlign = 'center'
      ctx.fillText('$' + Math.round(outstanding), x + w - 5 * s, y - s)
      ctx.textAlign = 'left'
      // Click invoices to open finance
      registerClickRegion(
        x + w - 8 * s,
        y,
        6 * s,
        plateStack * 2 * s,
        () => window.open('http://localhost:3100/finance', '_blank'),
        'Outstanding invoices - click to view'
      )
    }
    // Click dining tables to open clients
    registerClickRegion(
      x,
      y,
      w * 0.7,
      h,
      () => window.open('http://localhost:3100/clients', '_blank'),
      'Dining room - view clients'
    )
  }

  // ── Dashboard panels (right side) ──
  function drawDashboardPanels(panelX, panelY, panelW, panelH) {
    const s = P
    const pad = 3 * s

    roundRect(panelX, panelY, panelW, panelH, 3 * s, 'rgba(15,20,32,0.95)')
    ctx.strokeStyle = 'rgba(255,255,255,0.05)'
    ctx.lineWidth = 1
    ctx.beginPath()
    if (ctx.roundRect) ctx.roundRect(panelX, panelY, panelW, panelH, 3 * s)
    ctx.stroke()

    let y = panelY + pad

    // ── LIVE BUSINESS METRICS ──
    const metricsH = panelH * 0.14
    drawBusinessMetrics(panelX + pad, y, panelW - pad * 2, metricsH)
    y += metricsH + 2 * s

    // Divider
    ctx.strokeStyle = 'rgba(255,255,255,0.06)'
    ctx.beginPath()
    ctx.moveTo(panelX + pad, y)
    ctx.lineTo(panelX + panelW - pad, y)
    ctx.stroke()
    y += 2 * s

    // ── EVENT PIPELINE ──
    const pipeH = panelH * 0.2
    drawEventPipeline(panelX + pad, y, panelW - pad * 2, pipeH)
    y += pipeH + 2 * s

    ctx.strokeStyle = 'rgba(255,255,255,0.06)'
    ctx.beginPath()
    ctx.moveTo(panelX + pad, y)
    ctx.lineTo(panelX + panelW - pad, y)
    ctx.stroke()
    y += 2 * s

    // ── LIVE FEED ──
    const feedH = panelH * 0.22
    drawActivityFeed(panelX + pad, y, panelW - pad * 2, feedH)
    y += feedH + 2 * s

    ctx.strokeStyle = 'rgba(255,255,255,0.06)'
    ctx.beginPath()
    ctx.moveTo(panelX + pad, y)
    ctx.lineTo(panelX + panelW - pad, y)
    ctx.stroke()
    y += 2 * s

    // ── BRIGADE ──
    const teamH = panelH * 0.18
    drawBrigadeStatus(panelX + pad, y, panelW - pad * 2, teamH)
    y += teamH + 2 * s

    ctx.strokeStyle = 'rgba(255,255,255,0.06)'
    ctx.beginPath()
    ctx.moveTo(panelX + pad, y)
    ctx.lineTo(panelX + panelW - pad, y)
    ctx.stroke()
    y += 2 * s

    // ── CHEF LEVEL & ALERTS ──
    const alertH = panelH - (y - panelY) - pad
    drawChefLevelAndAlerts(panelX + pad, y, panelW - pad * 2, alertH)
  }

  // ── Business Metrics (top panel) ──
  function drawBusinessMetrics(x, y, w, h) {
    const s = P
    ctx.fillStyle = '#22c55e'
    ctx.font = 'bold ' + 2.5 * s + 'px Inter, monospace'
    ctx.textAlign = 'left'
    ctx.fillText('BUSINESS PULSE', x, y + 3 * s)

    if (!bizDataLoaded) {
      ctx.fillStyle = '#475569'
      ctx.font = 1.8 * s + 'px monospace'
      ctx.fillText('Loading...', x, y + 7 * s)
      return
    }

    const rev = bizData.revenue || {}
    const cols = [
      { label: 'Revenue', value: rev.totalRevenue || '$0', color: '#22c55e' },
      { label: 'Profit', value: rev.totalProfit || '$0', color: '#3b82f6' },
      { label: 'Events', value: String(bizData.eventsTotal || 0), color: '#e88f47' },
      { label: 'Clients', value: String(bizData.clients.total || 0), color: '#a855f7' },
    ]

    const colW = w / cols.length
    cols.forEach((col, i) => {
      const cx = x + i * colW
      ctx.fillStyle = col.color
      ctx.font = 'bold ' + 2.2 * s + 'px monospace'
      ctx.textAlign = 'center'
      ctx.fillText(col.value, cx + colW / 2, y + 7 * s)
      ctx.fillStyle = '#64748b'
      ctx.font = 1.5 * s + 'px monospace'
      ctx.fillText(col.label, cx + colW / 2, y + 9.5 * s)
    })
    ctx.textAlign = 'left'
  }

  // ── Event Pipeline (visual pipeline) ──
  function drawEventPipeline(x, y, w, h) {
    const s = P
    ctx.fillStyle = '#e88f47'
    ctx.font = 'bold ' + 2.5 * s + 'px Inter, monospace'
    ctx.textAlign = 'left'
    ctx.fillText('EVENT PIPELINE', x, y + 3 * s)

    const counts = bizData.events || {}
    const stages = [
      { key: 'draft', label: 'Draft', color: '#64748b' },
      { key: 'proposed', label: 'Proposed', color: '#eab308' },
      { key: 'accepted', label: 'Accepted', color: '#3b82f6' },
      { key: 'paid', label: 'Paid', color: '#22c55e' },
      { key: 'confirmed', label: 'Confirmed', color: '#a855f7' },
      { key: 'in_progress', label: 'Active', color: '#ef4444' },
      { key: 'completed', label: 'Done', color: '#22c55e' },
    ]

    const total = Object.values(counts).reduce((a, b) => a + b, 0) || 1
    let barX = x
    const barY = y + 5.5 * s
    const barH = 3 * s

    // Pipeline bar
    roundRect(x, barY, w, barH, s, 'rgba(255,255,255,0.04)')
    stages.forEach((stage) => {
      const count = counts[stage.key] || 0
      if (count > 0) {
        const segW = Math.max(2, (count / total) * w)
        roundRect(barX, barY, segW, barH, s, stage.color + '80')
        barX += segW
      }
    })

    // Labels
    let ly = barY + barH + 3 * s
    const labelW = w / stages.length
    stages.forEach((stage, i) => {
      const count = counts[stage.key] || 0
      const lx = x + i * labelW
      ctx.fillStyle = count > 0 ? stage.color : '#334155'
      ctx.font = 'bold ' + 2 * s + 'px monospace'
      ctx.textAlign = 'center'
      ctx.fillText(String(count), lx + labelW / 2, ly)
      ctx.fillStyle = '#475569'
      ctx.font = 1.3 * s + 'px monospace'
      ctx.fillText(stage.label, lx + labelW / 2, ly + 2 * s)
    })
    ctx.textAlign = 'left'

    // Upcoming events list
    const upcoming = bizData.upcoming || []
    if (upcoming.length > 0) {
      let ey = ly + 4 * s
      const maxShow = Math.min(upcoming.length, Math.floor((h - (ey - y)) / (2.5 * s)))
      for (let i = 0; i < maxShow; i++) {
        const ev = upcoming[i]
        const evY = ey + i * 2.5 * s
        const statusCol =
          ev.status === 'confirmed'
            ? '#22c55e'
            : ev.status === 'paid'
              ? '#3b82f6'
              : ev.status === 'accepted'
                ? '#eab308'
                : '#64748b'
        ctx.fillStyle = statusCol
        ctx.beginPath()
        ctx.arc(x + s, evY, s * 0.5, 0, Math.PI * 2)
        ctx.fill()
        ctx.fillStyle = '#e2e8f0'
        ctx.font = 1.6 * s + 'px monospace'
        ctx.fillText(ev.date + ' - ' + (ev.name || 'Event').slice(0, 20), x + 3 * s, evY + 0.5 * s)
        ctx.fillStyle = '#64748b'
        ctx.font = 1.4 * s + 'px monospace'
        ctx.textAlign = 'right'
        ctx.fillText(ev.client ? ev.client.slice(0, 12) : '', x + w, evY + 0.5 * s)
        ctx.textAlign = 'left'
      }
    }
  }

  // ── Activity Feed ──
  function drawActivityFeed(x, y, w, h) {
    const s = P
    ctx.fillStyle = '#3b82f6'
    ctx.font = 'bold ' + 2.5 * s + 'px Inter, monospace'
    ctx.textAlign = 'left'
    ctx.fillText('FILE CHANGES', x, y + 3 * s)

    const blink = Math.sin(tick * 0.08) > 0
    ctx.fillStyle = realActivityLoaded ? (blink ? '#22c55e' : '#22c55e60') : '#ef444440'
    ctx.beginPath()
    ctx.arc(x + w - 2 * s, y + 2 * s, s * 0.8, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = '#475569'
    ctx.font = 1.8 * s + 'px monospace'
    ctx.textAlign = 'right'
    ctx.fillText(realActivityLoaded ? 'live' : 'loading', x + w - 4 * s, y + 3 * s)
    ctx.textAlign = 'left'

    // Commit count badge
    if (bizData.activity.recentCommits > 0) {
      ctx.fillStyle = '#a855f7'
      ctx.font = 1.5 * s + 'px monospace'
      ctx.fillText(bizData.activity.recentCommits + ' commits/hr', x + 20 * s, y + 3 * s)
    }

    if (!realActivityLoaded || !realActivity.length) {
      ctx.fillStyle = '#475569'
      ctx.font = 1.8 * s + 'px monospace'
      ctx.fillText('Waiting for file changes...', x, y + 8 * s)
      return
    }

    let fy = y + 6 * s
    const lineH = 2.8 * s
    const maxLines = Math.floor((h - 7 * s) / lineH)

    realActivity.slice(0, maxLines).forEach((entry, i) => {
      const entryY = fy + i * lineH
      ctx.globalAlpha = Math.max(0.4, 1 - i * 0.06)
      ctx.fillStyle = '#475569'
      ctx.font = 1.8 * s + 'px monospace'
      ctx.fillText(entry.time, x, entryY)
      const isCreate = entry.action === 'created' || entry.action === 'rename'
      const isMod = entry.action === 'modified' || entry.action === 'change'
      ctx.fillStyle = isCreate ? '#22c55e' : isMod ? '#eab308' : '#ef4444'
      ctx.fillText(isCreate ? '+' : isMod ? '~' : '-', x + 10 * s, entryY)
      const parts = entry.file.replace(/\\/g, '/').split('/')
      const shortFile = parts.length > 2 ? parts.slice(-2).join('/') : entry.file
      const displayFile = shortFile.length > 32 ? '..' + shortFile.slice(-30) : shortFile
      ctx.fillStyle = '#e2e8f0'
      ctx.fillText(displayFile, x + 12.5 * s, entryY)
      ctx.globalAlpha = 1
    })
  }

  // ── Brigade Status ──
  function drawBrigadeStatus(x, y, w, h) {
    const s = P
    ctx.fillStyle = '#a855f7'
    ctx.font = 'bold ' + 2.5 * s + 'px Inter, monospace'
    ctx.textAlign = 'left'
    ctx.fillText('BRIGADE', x, y + 3 * s)

    const freeCount = AGENTS.filter((a) => a.cost === 'FREE').length
    ctx.fillStyle = '#475569'
    ctx.font = 2.0 * s + 'px monospace'
    ctx.fillText(AGENTS.length + ' cooks', x + 16 * s, y + 3 * s)
    ctx.fillStyle = '#22c55e80'
    ctx.fillText(freeCount + ' local', x + 28 * s, y + 3 * s)
    ctx.fillStyle = '#eab30880'
    ctx.fillText(AGENTS.length - freeCount + ' cloud', x + 40 * s, y + 3 * s)

    let cy = y + 5.5 * s
    const cardH = 4 * s

    agents.forEach((a) => {
      const cardY = cy
      cy += cardH

      // Status dot (green if services up, yellow if partial, red if down)
      const ollamaUp = bizData.agentStates.ollama
      const dotColor = a.cost === 'FREE' ? (ollamaUp ? '#22c55e' : '#ef4444') : '#22c55e'
      ctx.fillStyle = dotColor
      ctx.beginPath()
      ctx.arc(x + 1.5 * s, cardY + 1.2 * s, s * 0.6, 0, Math.PI * 2)
      ctx.fill()

      if (a.isBoss) {
        ctx.fillStyle = '#ffd700'
        ctx.font = 2.0 * s + 'px monospace'
        ctx.fillText('\u{1F451}', x + 3 * s, cardY + 1.8 * s)
      }

      ctx.fillStyle = a.color
      ctx.font = 'bold ' + 2.0 * s + 'px Inter, sans-serif'
      ctx.fillText(a.name, x + (a.isBoss ? 7 : 4) * s, cardY + 1.5 * s)
      ctx.fillStyle = '#94a3b8'
      ctx.font = 1.6 * s + 'px monospace'
      ctx.fillText(a.model, x + 18 * s, cardY + 1.5 * s)

      const cc = a.cost === 'FREE' ? '#22c55e' : a.cost === '$$' ? '#eab308' : '#ef4444'
      ctx.fillStyle = cc
      ctx.font = 'bold ' + 1.6 * s + 'px monospace'
      ctx.textAlign = 'right'
      ctx.fillText(a.cost === 'FREE' ? '$0' : a.cost, x + w, cardY + 1.5 * s)
      ctx.textAlign = 'left'
    })
  }

  // ── Chef Level & Alerts Panel ──
  function drawChefLevelAndAlerts(x, y, w, h) {
    const s = P
    const lvl = getChefLevel()

    // Chef level badge
    ctx.fillStyle = lvl.color
    ctx.font = 'bold ' + 2.5 * s + 'px Inter, monospace'
    ctx.textAlign = 'left'
    ctx.fillText('CHEF RANK: ' + lvl.title.toUpperCase(), x, y + 3 * s)

    // Stars
    if (lvl.stars > 0) {
      ctx.fillStyle = '#ffd700'
      ctx.font = 2 * s + 'px monospace'
      ctx.textAlign = 'right'
      ctx.fillText('\u2605'.repeat(lvl.stars), x + w, y + 3 * s)
      ctx.textAlign = 'left'
    }

    // XP bar (revenue progress to next level)
    const rev = bizData.revenue
    const dollars =
      rev && rev.totalRevenue ? parseFloat(rev.totalRevenue.replace(/[$,]/g, '')) || 0 : 0
    const thresholds = [0, 5000, 10000, 25000, 50000, 100000]
    const nextThreshold = thresholds.find((t) => t > dollars) || 200000
    const prevThreshold = thresholds.filter((t) => t <= dollars).pop() || 0
    const progress =
      nextThreshold > prevThreshold
        ? (dollars - prevThreshold) / (nextThreshold - prevThreshold)
        : 1

    const barY = y + 5.5 * s
    roundRect(x, barY, w, 2 * s, s, 'rgba(255,255,255,0.06)')
    if (progress > 0) {
      roundRect(x, barY, w * Math.min(1, progress), 2 * s, s, lvl.color + '60')
    }
    ctx.fillStyle = '#64748b'
    ctx.font = 1.3 * s + 'px monospace'
    ctx.textAlign = 'right'
    ctx.fillText('Next: $' + nextThreshold / 1000 + 'k', x + w, barY + 4 * s)
    ctx.textAlign = 'left'

    // Alerts
    let ay = barY + 6 * s
    const overdueCount = bizData.inquiries.overdue || 0
    const openInquiries = bizData.inquiries.open || 0

    if (overdueCount > 0) {
      const pulse = 0.5 + Math.sin(tick * 0.1) * 0.5
      ctx.fillStyle = `rgba(239,68,68,${pulse})`
      ctx.beginPath()
      ctx.arc(x + s, ay, s * 0.6, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = '#ef4444'
      ctx.font = 'bold ' + 1.6 * s + 'px monospace'
      ctx.fillText(
        overdueCount + ' OVERDUE INQUIR' + (overdueCount > 1 ? 'IES' : 'Y'),
        x + 3 * s,
        ay + 0.5 * s
      )
      ay += 3 * s
    }

    if (openInquiries > 0) {
      ctx.fillStyle = '#eab308'
      ctx.beginPath()
      ctx.arc(x + s, ay, s * 0.6, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = '#eab308'
      ctx.font = 1.6 * s + 'px monospace'
      ctx.fillText(openInquiries + ' open inquiries', x + 3 * s, ay + 0.5 * s)
      ay += 3 * s
    }

    if (!bizData.agentStates.ollama) {
      ctx.fillStyle = '#ef4444'
      ctx.beginPath()
      ctx.arc(x + s, ay, s * 0.6, 0, Math.PI * 2)
      ctx.fill()
      ctx.font = 1.6 * s + 'px monospace'
      ctx.fillText('Ollama OFFLINE', x + 3 * s, ay + 0.5 * s)
      ay += 3 * s
    }

    if (!bizData.agentStates.devServer) {
      ctx.fillStyle = '#eab308'
      ctx.beginPath()
      ctx.arc(x + s, ay, s * 0.6, 0, Math.PI * 2)
      ctx.fill()
      ctx.font = 1.6 * s + 'px monospace'
      ctx.fillText('Dev server not running', x + 3 * s, ay + 0.5 * s)
    }

    // Food cost % indicator
    const margin = rev && rev.avgMargin ? rev.avgMargin : ''
    if (margin) {
      ctx.fillStyle = '#64748b'
      ctx.font = 1.4 * s + 'px monospace'
      ctx.textAlign = 'right'
      ctx.fillText('Avg margin: ' + margin, x + w, ay + 0.5 * s)
      ctx.textAlign = 'left'
    }
  }

  // ── Notification rendering ──
  function drawNotifications(w, h) {
    const s = P
    notifications = notifications.filter((n) => n.age < n.maxAge)
    notifications.forEach((n, i) => {
      n.age++
      n.opacity = Math.max(0, 1 - n.age / n.maxAge)

      const ny = h * 0.15 + i * 6 * s
      const nx = w * 0.55 + 10 * s // right side

      ctx.globalAlpha = n.opacity

      if (n.type === 'inquiry') {
        // Delivery truck
        drawDeliveryTruck(nx - 20 * s, ny, Math.min(1, n.age / 60))
        ctx.fillStyle = '#e88f47'
        ctx.font = 'bold ' + 1.8 * s + 'px monospace'
        ctx.fillText(n.text, nx + 2 * s, ny + 3 * s)
      } else if (n.type === 'sla_breach') {
        // Red alert
        const pulse = 0.5 + Math.sin(tick * 0.15) * 0.5
        ctx.fillStyle = `rgba(239,68,68,${pulse * n.opacity})`
        ctx.beginPath()
        ctx.arc(nx - 2 * s, ny + s, 2 * s, 0, Math.PI * 2)
        ctx.fill()
        ctx.fillStyle = '#ef4444'
        ctx.font = 'bold ' + 1.8 * s + 'px monospace'
        ctx.fillText(n.text, nx + 3 * s, ny + 2 * s)
      } else if (n.type === 'payment') {
        ctx.fillStyle = '#22c55e'
        ctx.font = 'bold ' + 2 * s + 'px monospace'
        ctx.fillText('\u266A', nx - 2 * s, ny + 2 * s) // bell
        ctx.font = 1.8 * s + 'px monospace'
        ctx.fillText(n.text, nx + 3 * s, ny + 2 * s)
      }

      ctx.globalAlpha = 1
    })
  }

  // ── Check for new notifications based on data changes ──
  function checkNotifications() {
    if (!bizDataLoaded) return

    const currentInquiries = bizData.inquiries.open
    if (lastInquiryCount >= 0 && currentInquiries > lastInquiryCount) {
      pushNotification('inquiry', 'New inquiry received!')
      playBell()
    }
    lastInquiryCount = currentInquiries

    const currentOverdue = bizData.inquiries.overdue
    if (lastOverdueCount >= 0 && currentOverdue > lastOverdueCount) {
      pushNotification('sla_breach', 'SLA breach: inquiry overdue >24h')
      playAlarm()
    }
    lastOverdueCount = currentOverdue
  }

  // ── Staff members at stations ──
  function drawStaffMembers(kitchenW, kitchenH) {
    const staff = bizData.staff || []
    if (!staff.length) return
    const s = P
    const wallBottom = 30 * s
    const staffPositions = [
      { x: kitchenW * 0.15, y: wallBottom + 45 * s * 0.75 + 8 * s },
      { x: kitchenW * 0.85, y: wallBottom + 45 * s * 0.75 + 8 * s },
      { x: kitchenW * 0.15, y: wallBottom + 45 * s * 1.45 + 8 * s },
      { x: kitchenW * 0.85, y: wallBottom + 45 * s * 1.45 + 8 * s },
    ]
    staff.slice(0, 4).forEach((member, i) => {
      if (i >= staffPositions.length) return
      const pos = staffPositions[i]
      const col = ['#e06050', '#50a0e0', '#50e080', '#e0a050'][i]
      const ms = s * 0.6
      // Shadow
      ctx.fillStyle = 'rgba(0,0,0,0.1)'
      ctx.fillRect(pos.x - 2 * ms, pos.y + 5 * ms, 4 * ms, ms)
      // Body
      ctx.fillStyle = '#f0f0f0'
      ctx.fillRect(pos.x - 2 * ms, pos.y - 2 * ms, 4 * ms, 4 * ms)
      ctx.fillStyle = col
      ctx.fillRect(pos.x - 2 * ms, pos.y - 2 * ms, 4 * ms, ms)
      // Head
      ctx.fillStyle = '#ffcc88'
      ctx.fillRect(pos.x - ms, pos.y - 5 * ms, 2 * ms, 3 * ms)
      // Eyes
      ctx.fillStyle = '#222'
      ctx.fillRect(pos.x - 0.5 * ms, pos.y - 4 * ms, 0.4 * ms, 0.4 * ms)
      ctx.fillRect(pos.x + 0.3 * ms, pos.y - 4 * ms, 0.4 * ms, 0.4 * ms)
      // Hat
      ctx.fillStyle = '#fff'
      ctx.fillRect(pos.x - ms, pos.y - 6 * ms, 2 * ms, ms)
      // Legs
      ctx.fillStyle = '#2a2a3a'
      ctx.fillRect(pos.x - ms, pos.y + 2 * ms, ms, 3 * ms)
      ctx.fillRect(pos.x, pos.y + 2 * ms, ms, 3 * ms)
      // Name
      ctx.fillStyle = '#94a3b8'
      ctx.font = 1.2 * s + 'px monospace'
      ctx.textAlign = 'center'
      ctx.fillText((member.name || 'Staff').split(' ')[0].slice(0, 8), pos.x, pos.y + 8 * ms)
      // Role tag
      ctx.fillStyle = col + '80'
      ctx.font = 1 * s + 'px monospace'
      ctx.fillText((member.role || '').slice(0, 6), pos.x, pos.y + 10 * ms)
      // Status dot
      ctx.fillStyle = member.status === 'active' ? '#22c55e' : '#eab308'
      ctx.beginPath()
      ctx.arc(pos.x + 3 * ms, pos.y - 5 * ms, 0.5 * ms, 0, Math.PI * 2)
      ctx.fill()
      ctx.textAlign = 'left'
    })
  }

  // ── Remy concierge bubble ──
  function drawRemyBubble(kitchenW, kitchenH) {
    const s = P
    const wallBottom = 30 * s
    const rx = kitchenW * 0.5 + 22 * s
    const ry = wallBottom + 10 * s
    // Remy character (small)
    ctx.fillStyle = '#2563eb'
    ctx.fillRect(rx - s, ry - 3 * s, 2 * s, 4 * s)
    ctx.fillStyle = '#ffcc88'
    ctx.fillRect(rx - s, ry - 6 * s, 2 * s, 3 * s)
    ctx.fillStyle = '#222'
    ctx.fillRect(rx - 0.5 * s, ry - 5 * s, 0.4 * s, 0.4 * s)
    ctx.fillRect(rx + 0.3 * s, ry - 5 * s, 0.4 * s, 0.4 * s)
    // Beret
    ctx.fillStyle = '#1e40af'
    ctx.fillRect(rx - 1.5 * s, ry - 7 * s, 3 * s, s)
    ctx.fillRect(rx - s, ry - 8 * s, 2 * s, s)
    // Speech bubble when active
    const hasActivity = bizData.activity.recentFileChanges > 0 || bizData.activity.recentCommits > 0
    if (hasActivity) {
      remyBubbleAge++
      const bubbleTexts = ['Order up!', 'Behind!', 'Heard!', 'Fire it!', 'Corner!', 'Hot pan!']
      if (remyBubbleAge % 300 === 1) {
        remyBubbleText = bubbleTexts[Math.floor(Math.random() * bubbleTexts.length)]
      }
      if (remyBubbleText) {
        ctx.font = 1.5 * s + 'px monospace'
        const bw = ctx.measureText(remyBubbleText).width + 3 * s
        roundRect(rx - bw / 2, ry - 12 * s, bw, 3 * s, s, 'rgba(255,255,255,0.95)')
        ctx.fillStyle = '#1a1a2e'
        ctx.textAlign = 'center'
        ctx.fillText(remyBubbleText, rx, ry - 10 * s)
        ctx.textAlign = 'left'
        ctx.fillStyle = 'rgba(255,255,255,0.95)'
        ctx.beginPath()
        ctx.moveTo(rx - s, ry - 9 * s)
        ctx.lineTo(rx, ry - 8 * s)
        ctx.lineTo(rx + s, ry - 9 * s)
        ctx.fill()
      }
    } else {
      remyBubbleAge = 0
      if (tick % 90 < 45) {
        ctx.fillStyle = '#94a3b8'
        for (let d = 0; d < 3; d++) {
          ctx.beginPath()
          ctx.arc(rx - s + d * s, ry - 9 * s, 0.3 * s, 0, Math.PI * 2)
          ctx.fill()
        }
      }
    }
    ctx.fillStyle = '#2563eb'
    ctx.font = 'bold ' + 1.2 * s + 'px monospace'
    ctx.textAlign = 'center'
    ctx.fillText('REMY', rx, ry + 3 * s)
    ctx.textAlign = 'left'
    registerClickRegion(
      rx - 3 * s,
      ry - 12 * s,
      6 * s,
      16 * s,
      () => window.open('http://localhost:3100/dashboard', '_blank'),
      'Remy concierge'
    )
  }

  // ── Achievement toasts ──
  function drawAchievementToasts(w, h) {
    const s = P
    achievementToasts = achievementToasts.filter((t) => t.age < t.maxAge)
    achievementToasts.forEach((toast, i) => {
      toast.age++
      const fadeIn = Math.min(1, toast.age / 30)
      const fadeOut = Math.max(0, 1 - (toast.age - toast.maxAge + 60) / 60)
      ctx.globalAlpha = Math.min(fadeIn, fadeOut)
      const ty = 10 * s + i * 7 * s
      const tx = w * 0.5 - 20 * s
      roundRect(tx, ty, 40 * s, 5 * s, 1.5 * s, 'rgba(15,20,32,0.95)')
      ctx.strokeStyle = toast.color + '80'
      ctx.lineWidth = 2
      ctx.beginPath()
      if (ctx.roundRect) ctx.roundRect(tx, ty, 40 * s, 5 * s, 1.5 * s)
      ctx.stroke()
      if (toast.age < 60) {
        ctx.strokeStyle = toast.color + '30'
        ctx.beginPath()
        ctx.arc(tx + 20 * s, ty + 2.5 * s, toast.age * 0.5 * s, 0, Math.PI * 2)
        ctx.stroke()
      }
      ctx.font = 3 * s + 'px monospace'
      ctx.textAlign = 'center'
      ctx.fillStyle = '#fff'
      ctx.fillText(toast.icon, tx + 5 * s, ty + 3.8 * s)
      ctx.fillStyle = toast.color
      ctx.font = 'bold ' + 2.2 * s + 'px Inter, monospace'
      ctx.fillText(toast.text, tx + 23 * s, ty + 3.5 * s)
      ctx.textAlign = 'left'
      ctx.globalAlpha = 1
    })
  }

  // ── Kitchen expansion (more rooms at higher revenue) ──
  function drawKitchenExpansion(kitchenW, kitchenH) {
    const s = P
    const dollars = parseDollars(bizData)
    // $10k+ : Walk-in cooler door
    if (dollars >= 10000) {
      const wx = 2 * s,
        wy = 30 * s + 5 * s
      ctx.fillStyle = '#8898a8'
      ctx.fillRect(wx, wy, 10 * s, 18 * s)
      ctx.fillStyle = '#9aa8b8'
      ctx.fillRect(wx + s, wy + s, 8 * s, 16 * s)
      ctx.fillStyle = '#bbb'
      ctx.fillRect(wx + 7 * s, wy + 8 * s, s, 2 * s)
      ctx.fillStyle = '#22c55e80'
      ctx.font = 1.3 * s + 'px monospace'
      ctx.textAlign = 'center'
      ctx.fillText('WALK-IN', wx + 5 * s, wy - s)
      ctx.fillStyle = '#22c55e'
      ctx.font = 'bold ' + 1.2 * s + 'px monospace'
      ctx.fillText('38\u00b0F', wx + 5 * s, wy + 19.5 * s)
      ctx.textAlign = 'left'
    }
    // $25k+ : Pantry shelving
    if (dollars >= 25000) {
      const px = kitchenW - 14 * s,
        py = 30 * s + 5 * s
      ctx.fillStyle = '#6a5a4a'
      ctx.fillRect(px, py, 12 * s, 20 * s)
      for (let sh = 0; sh < 4; sh++) {
        ctx.fillStyle = '#7a6a5a'
        ctx.fillRect(px + s, py + s + sh * 5 * s, 10 * s, s)
        const colors = ['#ff6347', '#ffd700', '#228B22', '#daa520', '#8b4513']
        for (let it = 0; it < 3; it++) {
          ctx.fillStyle = colors[(sh * 3 + it) % colors.length]
          ctx.fillRect(px + 2 * s + it * 3 * s, py + sh * 5 * s, 2 * s, s)
        }
      }
      ctx.fillStyle = '#94a3b880'
      ctx.font = 1.3 * s + 'px monospace'
      ctx.textAlign = 'center'
      ctx.fillText('PANTRY', px + 6 * s, py - s)
      ctx.textAlign = 'left'
    }
    // $50k+ : Private dining booth
    if (dollars >= 50000) {
      const bx = kitchenW * 0.15,
        by = kitchenH * 0.82
      ctx.fillStyle = '#3a2520'
      ctx.fillRect(bx, by, 14 * s, 8 * s)
      ctx.fillStyle = '#5a3a2a'
      ctx.fillRect(bx + s, by + s, 12 * s, 2 * s)
      ctx.fillStyle = '#4a2a1a'
      ctx.fillRect(bx, by, 2 * s, 8 * s)
      ctx.fillRect(bx + 12 * s, by, 2 * s, 8 * s)
      ctx.fillStyle = '#ffd700'
      ctx.fillRect(bx + 6 * s, by - s, s, s)
      const flicker = 0.5 + Math.sin(tick * 0.15) * 0.3
      ctx.fillStyle = `rgba(255,200,50,${flicker})`
      ctx.fillRect(bx + 6 * s, by - 2 * s, s, s)
      ctx.fillStyle = '#daa52080'
      ctx.font = 1.1 * s + 'px monospace'
      ctx.textAlign = 'center'
      ctx.fillText('VIP', bx + 7 * s, by + 9.5 * s)
      ctx.textAlign = 'left'
    }
    // $100k+ : Chef's office
    if (dollars >= 100000) {
      const ox = kitchenW - 14 * s,
        oy = kitchenH * 0.7
      ctx.fillStyle = '#2a2535'
      ctx.fillRect(ox, oy, 12 * s, 10 * s)
      ctx.fillStyle = '#5a4a3a'
      ctx.fillRect(ox + 2 * s, oy + 3 * s, 8 * s, 4 * s)
      ctx.fillStyle = '#333'
      ctx.fillRect(ox + 4 * s, oy + s, 4 * s, 3 * s)
      ctx.fillStyle = '#3b82f640'
      ctx.fillRect(ox + 4.5 * s, oy + 1.5 * s, 3 * s, 2 * s)
      ctx.fillStyle = '#1a1a2e'
      ctx.fillRect(ox + 4 * s, oy + 6 * s, 4 * s, 3 * s)
      ctx.fillStyle = '#ffd70060'
      ctx.font = 1.1 * s + 'px monospace'
      ctx.textAlign = 'center'
      ctx.fillText('OFFICE', ox + 6 * s, oy - s)
      ctx.textAlign = 'left'
    }
  }

  // ── Weather overlay ──
  function drawWeatherOverlay(kitchenW, kitchenH) {
    const weather = bizData.weather
    if (!weather) return
    const s = P
    const cond = (weather.condition || '').toLowerCase()
    const winX = kitchenW * 0.02,
      winY = 4 * s,
      winW = 8 * s,
      winH = 12 * s
    // Window frame
    ctx.fillStyle = '#666'
    ctx.fillRect(winX, winY, winW, winH)
    ctx.fillStyle = '#88b4d8'
    ctx.fillRect(winX + 0.5 * s, winY + 0.5 * s, winW - s, winH - s)
    ctx.fillStyle = '#777'
    ctx.fillRect(winX + winW / 2 - 0.2 * s, winY, 0.4 * s, winH)
    ctx.fillRect(winX, winY + winH / 2 - 0.2 * s, winW, 0.4 * s)
    if (cond.includes('rain') || cond.includes('drizzle') || cond.includes('shower')) {
      ctx.fillStyle = 'rgba(100,150,255,0.6)'
      for (let r = 0; r < 8; r++) {
        const rx = winX + s + ((tick * 0.3 + r * 37) % (winW - 2 * s))
        const ry = winY + s + ((tick * 2 + r * 53) % (winH - 2 * s))
        ctx.fillRect(rx, ry, 0.3 * s, 1.2 * s)
      }
    } else if (cond.includes('snow') || cond.includes('blizzard') || cond.includes('sleet')) {
      ctx.fillStyle = 'rgba(255,255,255,0.8)'
      for (let f = 0; f < 6; f++) {
        const fx =
          winX + s + ((tick * 0.2 + f * 41 + Math.sin(tick * 0.01 + f) * 10) % (winW - 2 * s))
        const fy = winY + s + ((tick * 0.8 + f * 67) % (winH - 2 * s))
        ctx.beginPath()
        ctx.arc(fx, fy, 0.4 * s, 0, Math.PI * 2)
        ctx.fill()
      }
    } else if (cond.includes('cloud') || cond.includes('overcast') || cond.includes('fog')) {
      ctx.fillStyle = 'rgba(200,200,210,0.4)'
      const cx = winX + s + ((tick * 0.1) % (winW + 4 * s)) - 2 * s
      ctx.beginPath()
      ctx.arc(cx, winY + 3 * s, 1.5 * s, 0, Math.PI * 2)
      ctx.arc(cx + s, winY + 2.5 * s, 1.8 * s, 0, Math.PI * 2)
      ctx.arc(cx + 2 * s, winY + 3 * s, 1.5 * s, 0, Math.PI * 2)
      ctx.fill()
    } else if (cond.includes('sun') || cond.includes('clear')) {
      const glare = 0.1 + Math.sin(tick * 0.02) * 0.05
      ctx.fillStyle = `rgba(255,240,180,${glare})`
      ctx.fillRect(winX + 0.5 * s, winY + 0.5 * s, winW - s, winH - s)
      ctx.strokeStyle = 'rgba(255,220,100,0.15)'
      ctx.lineWidth = 0.5 * s
      for (let ray = 0; ray < 4; ray++) {
        const angle = tick * 0.003 + ray * 0.8
        ctx.beginPath()
        ctx.moveTo(winX + winW * 0.7, winY + winH * 0.3)
        ctx.lineTo(
          winX + winW * 0.7 + Math.cos(angle) * 6 * s,
          winY + winH * 0.3 + Math.sin(angle) * 6 * s
        )
        ctx.stroke()
      }
    }
    if (weather.temp) {
      ctx.fillStyle = '#94a3b8'
      ctx.font = 1.2 * s + 'px monospace'
      ctx.textAlign = 'center'
      ctx.fillText(weather.temp, winX + winW / 2, winY + winH + 2 * s)
      ctx.textAlign = 'left'
    }
  }

  // ── Inventory heatmap ──
  function drawInventoryHeatmap(x, y, w, h) {
    const ingredients = bizData.ingredients || []
    if (!ingredients.length) return
    const s = P
    const cols = 4
    const rows = Math.ceil(Math.min(ingredients.length, 12) / cols)
    const cellW = w / cols
    const cellH = Math.min(3 * s, h / rows)
    // Title
    ctx.fillStyle = '#64748b'
    ctx.font = 1 * s + 'px monospace'
    ctx.fillText('STOCK', x, y - s)
    ingredients.slice(0, 12).forEach((ing, i) => {
      const col = i % cols
      const row = Math.floor(i / cols)
      const ix = x + col * cellW
      const iy = y + row * cellH
      const qty = ing.quantity || 0
      const par = ing.par_level || 10
      const ratio = par > 0 ? qty / par : 1
      const color = ratio >= 1 ? '#22c55e40' : ratio >= 0.5 ? '#eab30840' : '#ef444440'
      ctx.fillStyle = color
      ctx.fillRect(ix, iy, cellW - 1, cellH - 1)
      ctx.fillStyle = '#e2e8f0'
      ctx.font = 0.9 * s + 'px monospace'
      ctx.textAlign = 'center'
      ctx.fillText((ing.name || '?').slice(0, 5), ix + cellW / 2, iy + cellH * 0.7)
      ctx.textAlign = 'left'
    })
  }

  // ── History scrubber ──
  function drawHistoryScrubber(x, y, w) {
    const history = bizData.history || []
    if (history.length < 2) return
    const s = P
    const barH = 2 * s
    roundRect(x, y, w, barH, s * 0.5, 'rgba(255,255,255,0.06)')
    const dotSpacing = w / (history.length + 1)
    history.forEach((snap, i) => {
      const dx = x + dotSpacing * (i + 1)
      const isActive = i === historyViewIndex
      ctx.fillStyle = isActive ? '#e88f47' : '#475569'
      ctx.beginPath()
      ctx.arc(dx, y + barH / 2, isActive ? s * 0.8 : s * 0.4, 0, Math.PI * 2)
      ctx.fill()
    })
    const liveActive = historyViewIndex === -1
    ctx.fillStyle = liveActive ? '#22c55e' : '#475569'
    ctx.beginPath()
    ctx.arc(x + w - s, y + barH / 2, s * 0.6, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = liveActive ? '#22c55e' : '#475569'
    ctx.font = 1.2 * s + 'px monospace'
    ctx.textAlign = 'right'
    ctx.fillText('LIVE', x + w - 2 * s, y + barH / 2 + 0.4 * s)
    ctx.textAlign = 'left'
    if (historyViewIndex >= 0 && historyViewIndex < history.length) {
      const snap = history[historyViewIndex]
      const time = new Date(snap.ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      ctx.fillStyle = '#e88f47'
      ctx.font = 1.4 * s + 'px monospace'
      ctx.fillText(
        'Viewing: ' + time + ' | Rev: ' + snap.revenue + ' | Events: ' + snap.eventsTotal,
        x,
        y - 1.5 * s
      )
    }
    history.forEach((snap, i) => {
      const dx = x + dotSpacing * (i + 1)
      registerClickRegion(
        dx - 2 * s,
        y - s,
        4 * s,
        barH + 2 * s,
        () => {
          historyViewIndex = i
        },
        'View ' + new Date(snap.ts).toLocaleTimeString()
      )
    })
    registerClickRegion(
      x + w - 4 * s,
      y - s,
      4 * s,
      barH + 2 * s,
      () => {
        historyViewIndex = -1
      },
      'Return to live view'
    )
  }

  // ── Agent class ──
  class KitchenAgent {
    constructor(def, slot) {
      Object.assign(this, def)
      this.slot = slot
      this.frame = Math.floor(Math.random() * 1000)
      this.atStation = true
      this.agentState = 'idle' // idle, working, stuck
    }

    getStationPosition(kitchenW, kitchenH) {
      const s = P
      const wallBottom = 30 * s
      const rowH = 45 * s
      const positions = [
        { x: kitchenW * 0.5, y: wallBottom + 6 * s, type: 'pass' },
        { x: kitchenW * 0.28, y: wallBottom + rowH * 0.75, type: 'stove' },
        { x: kitchenW * 0.72, y: wallBottom + rowH * 0.75, type: 'stove' },
        { x: kitchenW * 0.28, y: wallBottom + rowH * 1.45, type: 'cold' },
        { x: kitchenW * 0.72, y: wallBottom + rowH * 1.45, type: 'prep' },
      ]
      return positions[this.slot] || positions[0]
    }

    updateState() {
      // Determine agent state from real data
      const commits = bizData.activity.recentCommits || 0
      const fileChanges = bizData.activity.recentFileChanges || 0
      const ollamaUp = bizData.agentStates.ollama

      if (this.id === 'larry') {
        // Larry is working when there are recent commits (reviewing)
        this.agentState = commits > 0 ? 'working' : 'idle'
      } else if (this.id === 'sonnet') {
        // Sonnet works on complex tasks
        this.agentState = commits > 2 ? 'working' : 'idle'
      } else if (this.id === 'build') {
        // Build is working when files are actively changing
        this.agentState = fileChanges > 3 ? 'working' : fileChanges > 0 ? 'idle' : 'idle'
      } else if (this.id === 'qa') {
        // QA depends on Ollama
        this.agentState = !ollamaUp ? 'stuck' : fileChanges > 0 ? 'working' : 'idle'
      } else if (this.id === 'runner') {
        // Runner is always going if Ollama is up
        this.agentState = !ollamaUp ? 'stuck' : 'working'
      }
    }

    update(kitchenW, kitchenH) {
      this.frame++
      if (this.frame % 60 === 0) this.updateState()
    }

    draw(kitchenW, kitchenH) {
      const pos = this.getStationPosition(kitchenW, kitchenH)
      const s = P

      // Anti-fatigue mat
      ctx.fillStyle = 'rgba(40,40,50,0.5)'
      ctx.fillRect(pos.x - 18 * s, pos.y + 4 * s, 36 * s, 8 * s)

      // Station
      drawStation(pos.x, pos.y, this.color, this.frame, true, pos.type)

      // SLA smoke on the pass if overdue inquiries
      if (pos.type === 'pass' && bizData.inquiries.overdue > 0) {
        drawSmoke(pos.x - 5 * s, pos.y - 10 * s, bizData.inquiries.overdue)
      }

      // Character
      drawCharacter(
        pos.x,
        pos.y + 6 * s,
        this.color,
        true,
        this.frame,
        true,
        this.isBoss,
        this.agentState
      )

      // Status dot (colored by agent state)
      const dotColor =
        this.agentState === 'working'
          ? '#22c55e'
          : this.agentState === 'stuck'
            ? '#ef4444'
            : '#eab308'
      ctx.fillStyle = dotColor
      ctx.beginPath()
      ctx.arc(pos.x + 5 * s, pos.y - 4 * s - (this.isBoss ? 12 : 6) * s, 2 * s, 0, Math.PI * 2)
      ctx.fill()

      // Role bubble
      const bubbleText =
        this.agentState === 'stuck'
          ? 'OFFLINE'
          : this.agentState === 'working'
            ? this.role + ' (active)'
            : this.role
      ctx.font = 2.0 * s + 'px monospace'
      const tw = ctx.measureText(bubbleText).width
      const bx = pos.x - tw / 2 - 2 * s
      const by = pos.y - (this.isBoss ? 30 : 22) * s
      const bw = tw + 4 * s
      const bh = 4 * s

      roundRect(bx, by, bw, bh, s, 'rgba(15,20,32,0.9)')
      ctx.strokeStyle = (this.agentState === 'stuck' ? '#ef4444' : this.color) + '40'
      ctx.lineWidth = 1
      ctx.beginPath()
      if (ctx.roundRect) ctx.roundRect(bx, by, bw, bh, s)
      ctx.stroke()
      ctx.fillStyle = 'rgba(15,20,32,0.9)'
      ctx.fillRect(pos.x - s, by + bh, 2 * s, 1.5 * s)
      ctx.fillStyle = (this.agentState === 'stuck' ? '#ef4444' : this.color) + 'dd'
      ctx.textAlign = 'center'
      ctx.fillText(bubbleText, pos.x, by + 2.8 * s)
      ctx.textAlign = 'left'

      // Name plate (compact)
      const nameY = pos.y + 16 * s
      const plateH = this.isBoss ? 12 * s : 10 * s
      roundRect(pos.x - 20 * s, nameY, 40 * s, plateH, s, 'rgba(10,14,23,0.85)')

      ctx.textAlign = 'center'
      if (this.isBoss) {
        ctx.fillStyle = '#ffd700'
        ctx.font = 'bold ' + 2.0 * s + 'px monospace'
        ctx.fillText('\u2605 EXEC CHEF \u2605', pos.x, nameY + 3 * s)
        ctx.fillStyle = '#f1f5f9'
        ctx.font = 'bold ' + 2.2 * s + 'px Inter, sans-serif'
        ctx.fillText(this.name, pos.x, nameY + 6 * s)
        ctx.fillStyle = '#94a3b8'
        ctx.font = 1.5 * s + 'px Inter, sans-serif'
        ctx.fillText(this.kitchenRole.slice(0, 35), pos.x, nameY + 8.5 * s)
        const cc = '#ef4444'
        ctx.fillStyle = cc
        ctx.font = 'bold ' + 1.5 * s + 'px monospace'
        ctx.fillText('$$$ (Anthropic)', pos.x, nameY + 10.5 * s)
      } else {
        ctx.fillStyle = '#f1f5f9'
        ctx.font = 'bold ' + 2.2 * s + 'px Inter, sans-serif'
        ctx.fillText(this.name, pos.x, nameY + 3 * s)
        ctx.fillStyle = this.color
        ctx.font = 'bold ' + 1.8 * s + 'px monospace'
        ctx.fillText(this.role, pos.x, nameY + 5.5 * s)
        ctx.fillStyle = '#94a3b8'
        ctx.font = 1.5 * s + 'px Inter, sans-serif'
        ctx.fillText(this.kitchenRole.slice(0, 38), pos.x, nameY + 7.5 * s)
        const cc = this.cost === 'FREE' ? '#22c55e' : '#eab308'
        ctx.fillStyle = cc
        ctx.font = 'bold ' + 1.5 * s + 'px monospace'
        ctx.fillText(
          this.cost === 'FREE' ? 'FREE (Ollama)' : this.cost + ' (Anthropic)',
          pos.x,
          nameY + 9.5 * s
        )
      }
      ctx.textAlign = 'left'

      // Register click region for this agent
      // Granular click: open page relevant to this agent's role
      const agentPages = {
        larry: '/dashboard',
        sonnet: '/events',
        build: '/events',
        qa: '/settings',
        runner: '/inquiries',
      }
      const agentPage = agentPages[this.id] || '/'
      registerClickRegion(
        pos.x - 20 * s,
        pos.y - 20 * s,
        40 * s,
        50 * s,
        () => window.open('http://localhost:3100' + agentPage, '_blank'),
        this.name + ' - open ' + agentPage
      )
    }
  }

  // ── Init ──
  function initOffice() {
    canvas = document.getElementById('office-canvas')
    if (!canvas) return
    ctx = canvas.getContext('2d')
    agents = AGENTS.map((a, i) => new KitchenAgent(a, i))
  }

  // ── Main render ──
  function drawScene() {
    if (!canvas || !ctx) return
    const panel = canvas.parentElement
    const r = panel.getBoundingClientRect()
    const w = Math.floor(r.width)
    const h = Math.floor(r.height - 52)
    if (w <= 0 || h <= 0) return
    if (w !== lastW || h !== lastH) {
      canvas.width = w
      canvas.height = h
      lastW = w
      lastH = h
    }

    tick++
    clickRegions = [] // reset each frame
    const s = P

    const splitX = Math.floor(w * 0.55)
    const kitchenW = splitX
    const panelW = w - splitX

    // Check for notifications every 5 seconds
    if (tick % 300 === 0) checkNotifications()
    // Check achievements every 10 seconds
    if (tick % 600 === 0) checkAchievements()

    // ── Left: Kitchen ──
    drawKitchenFloor(kitchenW, h)
    drawKitchenWall(kitchenW, h)

    // Draw dining room at bottom of kitchen
    drawDiningRoom(0, h * 0.75, kitchenW, h * 0.2)

    // Kitchen expansion (extra rooms based on revenue)
    drawKitchenExpansion(kitchenW, h)

    // Weather overlay on window
    drawWeatherOverlay(kitchenW, h)

    // Staff members at stations
    drawStaffMembers(kitchenW, h)

    // Remy concierge near the pass
    drawRemyBubble(kitchenW, h)

    // Inventory heatmap in cold station area
    drawInventoryHeatmap(kitchenW * 0.08, h * 0.6, kitchenW * 0.15, 10 * P)

    // Update and draw agents (back to front)
    const drawOrder = [3, 4, 1, 2, 0]
    drawOrder.forEach((i) => {
      agents[i].update(kitchenW, h)
      agents[i].draw(kitchenW, h)
    })

    // ── Divider ──
    ctx.strokeStyle = 'rgba(255,255,255,0.08)'
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(splitX, 0)
    ctx.lineTo(splitX, h)
    ctx.stroke()

    // ── Right: Dashboard ──
    rect(splitX, 0, panelW, h, '#0c1018')
    drawDashboardPanels(splitX + 2 * s, 2 * s, panelW - 4 * s, h - 12 * s)

    // ── Notifications overlay ──
    drawNotifications(w, h)

    // ── Achievement toasts ──
    drawAchievementToasts(w, h)

    // ── Bottom HUD ──
    const barY = h - 8 * s
    rect(0, barY, w, 8 * s, 'rgba(10,14,23,0.92)')
    ctx.fillStyle = 'rgba(255,255,255,0.04)'
    ctx.fillRect(0, barY, w, 1)

    ctx.font = 2 * s + 'px monospace'
    ctx.textAlign = 'left'
    const freeCount = agents.filter((a) => a.cost === 'FREE').length
    ctx.fillStyle = '#475569'
    ctx.fillText('Brigade: ' + agents.length, 3 * s, barY + 3 * s)
    ctx.fillStyle = '#22c55e80'
    ctx.fillText(freeCount + ' Local', 20 * s, barY + 3 * s)
    ctx.fillStyle = '#eab30880'
    ctx.fillText(agents.length - freeCount + ' Cloud', 34 * s, barY + 3 * s)

    // Day phase indicator
    const dayPhase = getDayPhase()
    const phaseEmoji =
      dayPhase.phase === 'morning'
        ? '\u2600'
        : dayPhase.phase === 'day'
          ? '\u2600'
          : dayPhase.phase === 'golden'
            ? '\u{1F305}'
            : dayPhase.phase === 'evening'
              ? '\u{1F319}'
              : '\u{1F303}'
    ctx.fillStyle = '#64748b'
    ctx.fillText(phaseEmoji + ' ' + dayPhase.phase, 50 * s, barY + 3 * s)

    // Season
    const season = getSeason()
    ctx.fillText(season.charAt(0).toUpperCase() + season.slice(1), 66 * s, barY + 3 * s)

    // Sound toggle
    ctx.fillStyle = soundEnabled ? '#22c55e' : '#475569'
    ctx.fillText(soundEnabled ? '\u{1F50A}' : '\u{1F507}', 80 * s, barY + 3 * s)
    registerClickRegion(
      78 * s,
      barY,
      8 * s,
      8 * s,
      () => {
        soundEnabled = !soundEnabled
        if (soundEnabled && audioCtx && audioCtx.state === 'suspended') audioCtx.resume()
      },
      'Toggle sound'
    )

    // Chef level
    const lvl = getChefLevel()
    ctx.fillStyle = lvl.color
    ctx.font = 'bold ' + 2 * s + 'px monospace'
    ctx.fillText('Lv.' + lvl.level + ' ' + lvl.title, 3 * s, barY + 6.5 * s)

    // Weather in HUD
    if (bizData.weather) {
      ctx.fillStyle = '#64748b'
      ctx.font = 1.8 * s + 'px monospace'
      const wStr =
        (bizData.weather.temp || '') + ' ' + (bizData.weather.condition || '').slice(0, 12)
      ctx.fillText(wStr, 34 * s, barY + 6.5 * s)
    }

    // History scrubber
    drawHistoryScrubber(w * 0.35, barY + 7 * s, w * 0.3)

    // Clock
    ctx.textAlign = 'right'
    ctx.fillStyle = '#64748b'
    ctx.font = 2 * s + 'px monospace'
    const now = new Date()
    ctx.fillText(
      now.toLocaleTimeString() + '  ' + now.toLocaleDateString(),
      w - 3 * s,
      barY + 5 * s
    )
    ctx.textAlign = 'left'

    const clockEl = document.getElementById('office-clock')
    if (clockEl) clockEl.textContent = now.toLocaleTimeString()
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

  // Cook Kitchen is the default panel - start immediately
  startPixelOffice()

  // Click handler
  document.addEventListener('click', function (e) {
    if (!canvas) return
    const r = canvas.getBoundingClientRect()
    const mx = e.clientX - r.left,
      my = e.clientY - r.top
    for (const region of clickRegions) {
      if (
        mx >= region.x &&
        mx <= region.x + region.w &&
        my >= region.y &&
        my <= region.y + region.h
      ) {
        if (typeof region.action === 'function') region.action()
        break
      }
    }
  })

  // Tooltip on hover
  document.addEventListener('mousemove', function (e) {
    const tooltip = document.getElementById('office-tooltip')
    if (!tooltip || !canvas) return
    const r = canvas.getBoundingClientRect()
    const mx = e.clientX - r.left,
      my = e.clientY - r.top
    const kitchenW = Math.floor(r.width * 0.55)
    let found = null
    for (const a of agents) {
      const pos = a.getStationPosition(kitchenW, r.height - 52)
      const ax = pos.x
      const ay = pos.y
      if (Math.abs(mx - ax) < 50 && Math.abs(my - ay) < 60) {
        found = a
        break
      }
    }

    // Check clickable regions for cursor
    let overClickable = false
    for (const region of clickRegions) {
      if (
        mx >= region.x &&
        mx <= region.x + region.w &&
        my >= region.y &&
        my <= region.y + region.h
      ) {
        overClickable = true
        break
      }
    }
    canvas.style.cursor = overClickable ? 'pointer' : 'default'

    if (found) {
      const costLabel =
        found.cost === 'FREE' ? 'Local (Ollama) - $0/token' : 'Anthropic API - ' + found.cost
      const costColor = found.cost === 'FREE' ? '#22c55e' : '#eab308'
      const stateLabel =
        found.agentState === 'working'
          ? '\u{1F7E2} Active'
          : found.agentState === 'stuck'
            ? '\u{1F534} Offline'
            : '\u{1F7E1} Idle'
      tooltip.innerHTML =
        '<div style="font-weight:700;color:' +
        found.color +
        ';font-size:14px;margin-bottom:6px;">' +
        (found.isBoss ? '\u2605 ' : '') +
        found.name +
        ' <span style="color:#94a3b8;font-weight:400;font-size:11px;">(' +
        found.kitchenRole +
        ')</span></div>' +
        '<div style="color:#94a3b8;font-size:11px;margin-bottom:4px;">' +
        found.role +
        ' \u2022 ' +
        found.model +
        '</div>' +
        '<div style="color:#e2e8f0;font-size:12px;margin-bottom:4px;">' +
        stateLabel +
        '</div>' +
        '<div style="font-size:11px;color:' +
        costColor +
        ';">' +
        costLabel +
        '</div>'
      tooltip.style.display = 'block'
      tooltip.style.left = Math.min(e.clientX - r.left + 16, r.width - 260) + 'px'
      tooltip.style.top = Math.max(e.clientY - r.top - 80, 10) + 'px'
    } else {
      tooltip.style.display = 'none'
    }
  })
})()
