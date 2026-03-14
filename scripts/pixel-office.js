// ── Pixel Office ─────────────────────────────────────────────────
// Full isometric pixel-art office with furniture, agents at desks, animations
;(function () {
  const P = 4 // pixel scale (everything drawn in P-sized blocks)

  const AGENTS = [
    {
      id: 'main',
      name: 'Main (Opus)',
      role: 'Orchestrator',
      color: '#e88f47',
      model: 'Claude Opus 4.6',
      cost: '$$$',
      deskSlot: 0,
    },
    {
      id: 'sonnet',
      name: 'Sonnet',
      role: 'Senior Eng',
      color: '#3b82f6',
      model: 'Claude Sonnet 4.6',
      cost: '$$',
      deskSlot: 1,
    },
    {
      id: 'build',
      name: 'Build',
      role: 'Engineer',
      color: '#22c55e',
      model: 'qwen3-coder:30b',
      cost: 'FREE',
      deskSlot: 2,
    },
    {
      id: 'qa',
      name: 'QA',
      role: 'Quality',
      color: '#a855f7',
      model: 'qwen3:30b',
      cost: 'FREE',
      deskSlot: 3,
    },
    {
      id: 'runner',
      name: 'Runner',
      role: 'Tasks',
      color: '#eab308',
      model: 'qwen3:4b',
      cost: 'FREE',
      deskSlot: 4,
    },
  ]

  const ROLE_ACTIVITIES = {
    main: [
      'reading ROADMAP',
      'delegating task',
      'reviewing Build output',
      'checking PROGRESS',
      'architecture review',
      'assigning to Sonnet',
      'planning sprint',
      'reviewing QA report',
      'thinking...',
    ],
    sonnet: [
      'complex refactor',
      'debugging cross-file',
      'security review',
      'architecture analysis',
      'fixing auth logic',
      'reviewing RLS',
      'code review (escalated)',
      'deep thinking...',
    ],
    build: [
      'writing component',
      'implementing feature',
      'fixing bug',
      'writing migration',
      'building page',
      'server action',
      'fixing types',
      'creating API route',
      'coding...',
    ],
    qa: [
      'running tsc',
      'type checking',
      'reviewing PR',
      'testing endpoint',
      'error handling check',
      'hallucination scan',
      'regression test',
      'verifying fix',
    ],
    runner: [
      'updating docs',
      'running grep',
      'git commit',
      'formatting',
      'linting',
      'file search',
      'updating PROGRESS',
      'cleaning imports',
    ],
  }

  let officeRunning = false,
    officeRAF = null,
    agents = [],
    canvas,
    ctx
  let lastW = 0,
    lastH = 0,
    tick = 0

  // ── Pixel drawing helpers ──
  function px(x, y, w, h, col) {
    ctx.fillStyle = col
    ctx.fillRect(Math.round(x), Math.round(y), w || P, h || P)
  }

  function rect(x, y, w, h, col) {
    ctx.fillStyle = col
    ctx.fillRect(Math.round(x), Math.round(y), w, h)
  }

  // Draw a blocky pixel-art character
  function drawCharacter(cx, cy, color, sitting, frame, atDesk) {
    const s = P // scale
    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.2)'
    ctx.fillRect(cx - 3 * s, cy + (sitting ? 4 : 8) * s, 6 * s, 2 * s)

    // Legs (if sitting, shorter and bent)
    if (sitting) {
      ctx.fillStyle = color + 'aa'
      ctx.fillRect(cx - 2 * s, cy + 2 * s, 2 * s, 3 * s) // left leg
      ctx.fillRect(cx + 0 * s, cy + 2 * s, 2 * s, 3 * s) // right leg
    } else {
      const legBob = Math.sin(frame * 0.12) * s
      ctx.fillStyle = color + 'aa'
      ctx.fillRect(cx - 2 * s, cy + 2 * s, 2 * s, 5 * s + legBob)
      ctx.fillRect(cx + 0 * s, cy + 2 * s, 2 * s, 5 * s - legBob)
      // Shoes
      ctx.fillStyle = '#1a1a2e'
      ctx.fillRect(cx - 3 * s, cy + 7 * s + legBob, 3 * s, s)
      ctx.fillRect(cx + 0 * s, cy + 7 * s - legBob, 3 * s, s)
    }

    // Body (torso)
    ctx.fillStyle = color
    ctx.fillRect(cx - 3 * s, cy - 4 * s, 6 * s, 6 * s)
    // Shirt detail
    ctx.fillStyle = color + 'cc'
    ctx.fillRect(cx - s, cy - 3 * s, 2 * s, 4 * s)

    // Arms
    if (atDesk && sitting) {
      // Arms reaching forward to keyboard
      ctx.fillStyle = color + 'dd'
      ctx.fillRect(cx - 4 * s, cy - 2 * s, 2 * s, 2 * s) // left arm
      ctx.fillRect(cx + 2 * s, cy - 2 * s, 2 * s, 2 * s) // right arm
      // Forearms on desk
      const typeBob = Math.sin(frame * 0.2) * 0.5
      ctx.fillRect(cx - 5 * s, cy - 3 * s + typeBob, 2 * s, 2 * s)
      ctx.fillRect(cx + 3 * s, cy - 3 * s - typeBob, 2 * s, 2 * s)
    } else {
      // Arms at sides
      const armBob = sitting ? 0 : Math.sin(frame * 0.12) * s
      ctx.fillStyle = color + 'dd'
      ctx.fillRect(cx - 4 * s, cy - 3 * s, 2 * s, 4 * s + armBob)
      ctx.fillRect(cx + 2 * s, cy - 3 * s, 2 * s, 4 * s - armBob)
    }

    // Head
    ctx.fillStyle = '#ffcc88' // skin
    ctx.fillRect(cx - 2 * s, cy - 8 * s, 4 * s, 4 * s)
    // Hair (colored to match agent)
    ctx.fillStyle = color
    ctx.fillRect(cx - 2 * s, cy - 9 * s, 4 * s, 2 * s)
    ctx.fillRect(cx - 3 * s, cy - 8 * s, s, 2 * s) // side hair

    // Eyes
    ctx.fillStyle = '#222'
    ctx.fillRect(cx - s, cy - 7 * s, s, s)
    ctx.fillRect(cx + s, cy - 7 * s, s, s)
    // Eye blink
    if (frame % 180 > 175) {
      ctx.fillStyle = '#ffcc88'
      ctx.fillRect(cx - s, cy - 7 * s, s, s)
      ctx.fillRect(cx + s, cy - 7 * s, s, s)
    }

    // Mouth (tiny smile)
    ctx.fillStyle = '#cc8866'
    ctx.fillRect(cx - s, cy - 5 * s, 2 * s, s)
  }

  // Draw a desk with monitor, keyboard, coffee
  function drawDesk(dx, dy, agentColor, frame, hasAgent) {
    const s = P

    // Desk legs
    ctx.fillStyle = '#5c4a3a'
    ctx.fillRect(dx - 14 * s, dy + 2 * s, 2 * s, 6 * s)
    ctx.fillRect(dx + 12 * s, dy + 2 * s, 2 * s, 6 * s)

    // Desk surface
    ctx.fillStyle = '#8b7355'
    ctx.fillRect(dx - 15 * s, dy, 30 * s, 3 * s)
    // Desk edge highlight
    ctx.fillStyle = '#a08968'
    ctx.fillRect(dx - 15 * s, dy, 30 * s, s)

    // Monitor stand
    ctx.fillStyle = '#444'
    ctx.fillRect(dx - s, dy - 2 * s, 2 * s, 2 * s)
    ctx.fillRect(dx - 3 * s, dy - s, 6 * s, s)

    // Monitor frame
    ctx.fillStyle = '#333'
    ctx.fillRect(dx - 10 * s, dy - 12 * s, 20 * s, 10 * s)
    // Screen
    ctx.fillStyle = '#0d1117'
    ctx.fillRect(dx - 9 * s, dy - 11 * s, 18 * s, 8 * s)

    if (hasAgent) {
      // Screen content - code lines
      const lines = 5
      for (let i = 0; i < lines; i++) {
        const lineW = (4 + Math.sin(frame * 0.03 + i * 1.7) * 3) * s
        const indent = i === 1 || i === 3 ? 2 * s : 0
        ctx.fillStyle = agentColor + '70'
        ctx.fillRect(dx - 8 * s + indent, dy - 10 * s + i * s * 1.5, lineW, s)
      }
      // Cursor blink
      if (Math.floor(frame / 15) % 2 === 0) {
        const cursorLine = Math.floor(frame / 60) % lines
        const lineW = (4 + Math.sin(frame * 0.03 + cursorLine * 1.7) * 3) * s
        ctx.fillStyle = agentColor
        ctx.fillRect(dx - 8 * s + lineW + s, dy - 10 * s + cursorLine * s * 1.5, s, s)
      }
      // Monitor power LED
      ctx.fillStyle = '#22c55e'
      ctx.fillRect(dx + 8 * s, dy - 3 * s, s, s)
    } else {
      // Screen off / screensaver
      ctx.fillStyle = '#1a1a2e'
      ctx.fillRect(dx - 9 * s, dy - 11 * s, 18 * s, 8 * s)
      ctx.fillStyle = '#333'
      ctx.fillRect(dx + 8 * s, dy - 3 * s, s, s) // power LED dim
    }

    // Keyboard
    ctx.fillStyle = '#555'
    ctx.fillRect(dx - 6 * s, dy + s, 8 * s, 2 * s)
    ctx.fillStyle = '#666'
    for (let i = 0; i < 6; i++) {
      ctx.fillRect(dx - 5 * s + i * s * 1.2, dy + s, s * 0.8, s)
    }

    // Mouse
    ctx.fillStyle = '#666'
    ctx.fillRect(dx + 4 * s, dy + s, 2 * s, 2 * s)
    ctx.fillStyle = '#888'
    ctx.fillRect(dx + 4 * s, dy + s, 2 * s, s)

    // Coffee mug (right side of desk)
    ctx.fillStyle = '#ddd'
    ctx.fillRect(dx + 9 * s, dy - 2 * s, 3 * s, 3 * s)
    ctx.fillStyle = '#ccc'
    ctx.fillRect(dx + 12 * s, dy - s, s, 2 * s) // handle
    // Coffee
    ctx.fillStyle = '#6b4226'
    ctx.fillRect(dx + 9 * s, dy - s, 3 * s, s)
    // Steam (animated)
    if (frame % 60 < 40) {
      ctx.fillStyle = 'rgba(255,255,255,0.15)'
      ctx.fillRect(dx + 10 * s, dy - 3 * s - (frame % 20) * 0.3, s, s)
      ctx.fillRect(dx + 11 * s, dy - 4 * s - (frame % 25) * 0.2, s, s)
    }
  }

  // Draw office chair
  function drawChair(cx, cy, color) {
    const s = P
    // Chair base (star shape simplified)
    ctx.fillStyle = '#444'
    ctx.fillRect(cx - 3 * s, cy + 6 * s, 6 * s, s)
    ctx.fillRect(cx - s, cy + 5 * s, 2 * s, 2 * s) // center post
    // Wheels
    ctx.fillStyle = '#333'
    ctx.fillRect(cx - 4 * s, cy + 7 * s, 2 * s, s)
    ctx.fillRect(cx + 2 * s, cy + 7 * s, 2 * s, s)
    // Seat
    ctx.fillStyle = '#2a2a4a'
    ctx.fillRect(cx - 4 * s, cy + 2 * s, 8 * s, 3 * s)
    // Back
    ctx.fillStyle = '#2a2a4a'
    ctx.fillRect(cx - 3 * s, cy - 4 * s, 6 * s, 6 * s)
    // Back cushion accent
    ctx.fillStyle = color + '30'
    ctx.fillRect(cx - 2 * s, cy - 3 * s, 4 * s, 4 * s)
  }

  // Draw floor with tiles
  function drawFloor(w, h) {
    // Main floor
    rect(0, 0, w, h, '#1e1e3a')

    // Tile pattern
    const tileSize = P * 10
    for (let y = 0; y < h; y += tileSize) {
      for (let x = 0; x < w; x += tileSize) {
        const shade = (x / tileSize + y / tileSize) % 2 === 0 ? '#1c1c36' : '#202044'
        rect(x, y, tileSize, tileSize, shade)
        // Tile edge
        ctx.fillStyle = 'rgba(255,255,255,0.02)'
        ctx.fillRect(x, y, tileSize, 1)
        ctx.fillRect(x, y, 1, tileSize)
      }
    }
  }

  // Draw office decorations
  function drawOfficeDecor(w, h) {
    const s = P

    // ── Top wall ──
    rect(0, 0, w, 30 * s, '#161630')
    // Wall base trim
    rect(0, 29 * s, w, 2 * s, '#2a2a55')

    // Company sign on wall
    const signX = w / 2
    const signY = 10 * s
    rect(signX - 22 * s, signY, 44 * s, 14 * s, '#232350')
    rect(signX - 21 * s, signY + s, 42 * s, 12 * s, '#1a1a40')
    ctx.fillStyle = '#e88f47'
    ctx.font = 'bold ' + s * 3 + 'px monospace'
    ctx.textAlign = 'center'
    ctx.fillText('CHEFFLOW', signX, signY + 8 * s)
    ctx.fillStyle = '#e88f4780'
    ctx.font = s * 1.5 + 'px monospace'
    ctx.fillText('ENGINEERING HQ', signX, signY + 11 * s)

    // Clock on wall (right side)
    const clockX = w - 40 * s
    const clockY = 12 * s
    ctx.fillStyle = '#333'
    ctx.beginPath()
    ctx.arc(clockX, clockY, 6 * s, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = '#f1f5f9'
    ctx.beginPath()
    ctx.arc(clockX, clockY, 5 * s, 0, Math.PI * 2)
    ctx.fill()
    // Clock hands
    const now = new Date()
    const hourAngle =
      ((now.getHours() % 12) + now.getMinutes() / 60) * ((Math.PI * 2) / 12) - Math.PI / 2
    const minAngle = now.getMinutes() * ((Math.PI * 2) / 60) - Math.PI / 2
    ctx.strokeStyle = '#333'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(clockX, clockY)
    ctx.lineTo(clockX + Math.cos(hourAngle) * 3 * s, clockY + Math.sin(hourAngle) * 3 * s)
    ctx.stroke()
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(clockX, clockY)
    ctx.lineTo(clockX + Math.cos(minAngle) * 4 * s, clockY + Math.sin(minAngle) * 4 * s)
    ctx.stroke()

    // Whiteboard on wall (left side)
    const wbX = 30 * s
    const wbY = 6 * s
    rect(wbX, wbY, 35 * s, 20 * s, '#eee')
    rect(wbX + s, wbY + s, 33 * s, 18 * s, '#f8f8f8')
    // Whiteboard content
    ctx.fillStyle = '#e8894740'
    ctx.fillRect(wbX + 3 * s, wbY + 3 * s, 15 * s, s)
    ctx.fillRect(wbX + 3 * s, wbY + 5 * s, 20 * s, s)
    ctx.fillStyle = '#22c55e40'
    ctx.fillRect(wbX + 3 * s, wbY + 8 * s, 12 * s, s)
    ctx.fillRect(wbX + 3 * s, wbY + 10 * s, 18 * s, s)
    ctx.fillStyle = '#3b82f640'
    ctx.fillRect(wbX + 3 * s, wbY + 13 * s, 8 * s, s)
    // Whiteboard markers
    rect(wbX + 28 * s, wbY + 21 * s, 3 * s, s, '#ef4444')
    rect(wbX + 24 * s, wbY + 21 * s, 3 * s, s, '#22c55e')
    rect(wbX + 20 * s, wbY + 21 * s, 3 * s, s, '#3b82f6')

    // ── Plants ──
    // Plant 1 (left corner)
    drawPlant(15 * s, h - 30 * s)
    // Plant 2 (right corner)
    drawPlant(w - 25 * s, h - 25 * s)

    // ── Water cooler (right side) ──
    const wcX = w - 50 * s
    const wcY = 35 * s
    rect(wcX, wcY, 8 * s, 12 * s, '#ddd') // body
    rect(wcX + s, wcY + s, 6 * s, 4 * s, '#4488ff') // water
    rect(wcX + 2 * s, wcY + 6 * s, 4 * s, s, '#ccc') // tap
    rect(wcX + s, wcY + 12 * s, 6 * s, 3 * s, '#bbb') // base
    // Cup
    rect(wcX + 9 * s, wcY + 10 * s, 2 * s, 3 * s, '#fff')

    // ── Server rack (back right) ──
    const srX = w - 30 * s
    const srY = 34 * s
    rect(srX, srY, 12 * s, 20 * s, '#222')
    rect(srX + s, srY + s, 10 * s, 3 * s, '#333')
    rect(srX + s, srY + 5 * s, 10 * s, 3 * s, '#333')
    rect(srX + s, srY + 9 * s, 10 * s, 3 * s, '#333')
    rect(srX + s, srY + 13 * s, 10 * s, 3 * s, '#333')
    // Blinking LEDs
    const ledColors = ['#22c55e', '#22c55e', '#eab308', '#22c55e']
    ledColors.forEach((c, i) => {
      const blink = (tick + i * 7) % 40 < 35
      ctx.fillStyle = blink ? c : '#111'
      ctx.fillRect(srX + 2 * s, srY + 2 * s + i * 4 * s, s, s)
      ctx.fillStyle = blink ? c : '#111'
      ctx.fillRect(srX + 4 * s, srY + 2 * s + i * 4 * s, s, s)
    })
  }

  function drawPlant(px, py) {
    const s = P
    // Pot
    rect(px, py + 6 * s, 8 * s, 6 * s, '#8b5e3c')
    rect(px - s, py + 5 * s, 10 * s, 2 * s, '#9b6e4c')
    // Dirt
    rect(px + s, py + 5 * s, 6 * s, s, '#5a3a1a')
    // Leaves
    const sway = Math.sin(tick * 0.02) * s * 0.5
    ctx.fillStyle = '#22a855'
    ctx.fillRect(px + 2 * s + sway, py - 2 * s, 4 * s, 7 * s)
    ctx.fillRect(px - s + sway, py, 3 * s, 4 * s)
    ctx.fillRect(px + 5 * s + sway, py - s, 3 * s, 5 * s)
    ctx.fillStyle = '#33cc66'
    ctx.fillRect(px + 3 * s + sway, py - 3 * s, 2 * s, 3 * s)
    ctx.fillRect(px + sway, py + s, 2 * s, 2 * s)
    ctx.fillRect(px + 6 * s + sway, py, 2 * s, 2 * s)
  }

  // ── Agent class ──
  class PixelAgent {
    constructor(def, slot) {
      Object.assign(this, def)
      this.slot = slot
      this.activity = this.pickActivity()
      this.activityTimer = Math.random() * 300 + 100
      this.frame = Math.floor(Math.random() * 1000)
      this.atDesk = true
      this.walkTimer = Math.random() * 1200 + 600
      this.walkX = 0
      this.walkY = 0
      this.walkTargetX = 0
      this.walkTargetY = 0
      this.walkPhase = 'none' // none, leaving, wandering, returning
      this.statusEmoji = ''
      this.thoughtBubble = ''
      this.thoughtTimer = 0
    }

    pickActivity() {
      const pool = ROLE_ACTIVITIES[this.id] || []
      const act = pool[Math.floor(Math.random() * pool.length)] || 'working'
      // Set emoji based on activity
      if (act.includes('thinking') || act.includes('review') || act.includes('analysis'))
        this.statusEmoji = '\u{1F914}'
      else if (act.includes('fix') || act.includes('debug')) this.statusEmoji = '\u{1F527}'
      else if (
        act.includes('writing') ||
        act.includes('coding') ||
        act.includes('component') ||
        act.includes('feature')
      )
        this.statusEmoji = '\u{2328}'
      else if (act.includes('test') || act.includes('check') || act.includes('tsc'))
        this.statusEmoji = '\u{1F50D}'
      else if (act.includes('commit') || act.includes('git')) this.statusEmoji = '\u{1F4E6}'
      else if (act.includes('delegat') || act.includes('assign')) this.statusEmoji = '\u{1F4CB}'
      else this.statusEmoji = '\u{1F4BB}'
      return act
    }

    getDeskPosition(w, h) {
      const s = P
      const startY = 42 * s // below wall
      const rowHeight = 55 * s
      // Row 0: Main (center, front row, boss desk)
      // Row 1: Sonnet, Build, QA (three across)
      // Row 2: Runner (center)
      const positions = [
        { x: w * 0.5, y: startY + 10 * s }, // Main - front center (boss)
        { x: w * 0.2, y: startY + rowHeight }, // Sonnet - left
        { x: w * 0.5, y: startY + rowHeight }, // Build - center
        { x: w * 0.8, y: startY + rowHeight }, // QA - right
        { x: w * 0.5, y: startY + rowHeight * 1.7 }, // Runner - back center
      ]
      return positions[this.slot] || positions[0]
    }

    update(w, h) {
      this.frame++
      this.activityTimer--
      this.walkTimer--

      if (this.activityTimer <= 0) {
        this.activity = this.pickActivity()
        this.activityTimer = Math.random() * 400 + 200
        this.thoughtBubble = this.activity
        this.thoughtTimer = 90
      }

      if (this.thoughtTimer > 0) this.thoughtTimer--

      // Walk behavior
      if (this.walkPhase === 'none' && this.walkTimer <= 0 && this.atDesk) {
        this.walkPhase = 'leaving'
        this.atDesk = false
        const pos = this.getDeskPosition(w, h)
        this.walkX = pos.x
        this.walkY = pos.y + 10 * P
        // Pick random destination (water cooler, another desk, plant)
        const destinations = [
          { x: w - 50 * P, y: 45 * P }, // water cooler
          { x: w * 0.35, y: pos.y }, // nearby
          { x: 15 * P, y: h - 25 * P }, // plant
        ]
        const dest = destinations[Math.floor(Math.random() * destinations.length)]
        this.walkTargetX = dest.x
        this.walkTargetY = dest.y
        this.walkTimer = Math.random() * 1500 + 800
      }

      if (this.walkPhase === 'leaving') {
        this.walkX += (this.walkTargetX - this.walkX) * 0.03
        this.walkY += (this.walkTargetY - this.walkY) * 0.03
        if (
          Math.abs(this.walkX - this.walkTargetX) < 5 &&
          Math.abs(this.walkY - this.walkTargetY) < 5
        ) {
          this.walkPhase = 'wandering'
          setTimeout(
            () => {
              this.walkPhase = 'returning'
            },
            2000 + Math.random() * 2000
          )
        }
      }

      if (this.walkPhase === 'returning') {
        const pos = this.getDeskPosition(w, h)
        const targetY = pos.y + 10 * P
        this.walkX += (pos.x - this.walkX) * 0.04
        this.walkY += (targetY - this.walkY) * 0.04
        if (Math.abs(this.walkX - pos.x) < 3 && Math.abs(this.walkY - targetY) < 3) {
          this.walkPhase = 'none'
          this.atDesk = true
          this.walkTimer = Math.random() * 1500 + 800
        }
      }
    }

    draw(w, h) {
      const pos = this.getDeskPosition(w, h)
      const s = P

      // Draw chair (behind character if at desk)
      if (this.atDesk) {
        drawChair(pos.x, pos.y + 8 * s, this.color)
      }

      // Draw desk
      drawDesk(pos.x, pos.y, this.color, this.frame, this.atDesk)

      // Draw character
      if (this.atDesk) {
        drawCharacter(pos.x, pos.y + 4 * s, this.color, true, this.frame, true)
      } else if (this.walkPhase !== 'none') {
        drawCharacter(this.walkX, this.walkY, this.color, false, this.frame, false)
      }

      // ── Status indicator (green dot = at desk, yellow = walking) ──
      const charX = this.atDesk ? pos.x : this.walkX
      const charY = this.atDesk ? pos.y - 6 * s : this.walkY - 12 * s

      ctx.fillStyle = this.atDesk ? '#22c55e' : '#eab308'
      ctx.beginPath()
      ctx.arc(charX + 5 * s, charY - 4 * s, 2 * s, 0, Math.PI * 2)
      ctx.fill()

      // ── Thought bubble (when switching tasks) ──
      if (this.thoughtTimer > 0 && this.atDesk) {
        const bubbleAlpha = Math.min(1, this.thoughtTimer / 30)
        ctx.globalAlpha = bubbleAlpha
        // Bubble
        const bx = pos.x + 12 * s
        const by = pos.y - 18 * s
        rect(bx, by, ctx.measureText(this.thoughtBubble).width + 6 * s, 5 * s, 'rgba(30,30,60,0.9)')
        ctx.strokeStyle = this.color + '60'
        ctx.lineWidth = 1
        ctx.strokeRect(bx, by, ctx.measureText(this.thoughtBubble).width + 6 * s, 5 * s)
        // Bubble dots
        ctx.fillStyle = 'rgba(30,30,60,0.7)'
        ctx.fillRect(bx - 2 * s, by + 4 * s, 2 * s, 2 * s)
        ctx.fillRect(bx - 4 * s, by + 6 * s, s, s)
        // Text
        ctx.fillStyle = this.color
        ctx.font = 2 * s + 'px monospace'
        ctx.textAlign = 'left'
        ctx.fillText(this.thoughtBubble, bx + 2 * s, by + 3.5 * s)
        ctx.globalAlpha = 1
      }

      // ── Name plate under desk ──
      const nameY = pos.y + 18 * s
      // Background
      rect(pos.x - 16 * s, nameY, 32 * s, 14 * s, 'rgba(10,14,23,0.7)')
      // Name
      ctx.fillStyle = '#f1f5f9'
      ctx.font = 'bold ' + 2.5 * s + 'px Inter, sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText(this.name, pos.x, nameY + 4 * s)
      // Role
      ctx.fillStyle = this.color
      ctx.font = 2 * s + 'px Inter, sans-serif'
      ctx.fillText(this.role, pos.x, nameY + 7.5 * s)
      // Activity
      ctx.fillStyle = '#64748b'
      ctx.font = 1.5 * s + 'px monospace'
      const actTxt = this.statusEmoji + ' ' + this.activity
      ctx.fillText(
        actTxt.length > 30 ? actTxt.slice(0, 30) + '...' : actTxt,
        pos.x,
        nameY + 10.5 * s
      )
      // Cost badge
      const cc = this.cost === 'FREE' ? '#22c55e' : this.cost === '$$' ? '#eab308' : '#ef4444'
      ctx.font = 'bold ' + 1.8 * s + 'px monospace'
      const costTxt = this.cost === 'FREE' ? 'FREE (local)' : this.cost + ' (Anthropic)'
      const costW = ctx.measureText(costTxt).width + 4 * s
      rect(pos.x - costW / 2, nameY + 11.5 * s, costW, 3 * s, cc + '20')
      ctx.fillStyle = cc
      ctx.fillText(costTxt, pos.x, nameY + 13.5 * s)
    }
  }

  // ── Main render ──
  function initOffice() {
    canvas = document.getElementById('office-canvas')
    if (!canvas) return
    ctx = canvas.getContext('2d')
    agents = AGENTS.map((a, i) => new PixelAgent(a, i))
  }

  function drawScene() {
    if (!canvas || !ctx) return
    const panel = canvas.parentElement
    const rect2 = panel.getBoundingClientRect()
    const w = Math.floor(rect2.width)
    const h = Math.floor(rect2.height - 52) // minus header
    if (w <= 0 || h <= 0) return
    if (w !== lastW || h !== lastH) {
      canvas.width = w
      canvas.height = h
      lastW = w
      lastH = h
    }

    tick++

    // Floor
    drawFloor(w, h)

    // Office decorations (wall, furniture)
    drawOfficeDecor(w, h)

    // Hierarchy lines (subtle dotted from Main to others)
    const mainPos = agents[0].getDeskPosition(w, h)
    ctx.strokeStyle = 'rgba(232,143,71,0.1)'
    ctx.lineWidth = 1
    ctx.setLineDash([3, 6])
    agents.slice(1).forEach((a) => {
      const aPos = a.getDeskPosition(w, h)
      ctx.beginPath()
      ctx.moveTo(mainPos.x, mainPos.y + 20 * P)
      ctx.lineTo(aPos.x, aPos.y - 5 * P)
      ctx.stroke()
    })
    ctx.setLineDash([])

    // Update and draw agents (back to front for overlap)
    const drawOrder = [4, 1, 2, 3, 0] // runner, sonnet, build, qa, main
    drawOrder.forEach((i) => {
      agents[i].update(w, h)
      agents[i].draw(w, h)
    })

    // ── Bottom HUD bar ──
    const barY = h - 10 * P
    rect(0, barY, w, 10 * P, 'rgba(10,14,23,0.85)')
    ctx.fillStyle = 'rgba(255,255,255,0.05)'
    ctx.fillRect(0, barY, w, 1)

    const s = P
    ctx.font = 2.5 * s + 'px Inter, monospace'
    ctx.textAlign = 'left'

    // Agent count
    ctx.fillStyle = '#64748b'
    ctx.fillText('Team: ' + agents.length + ' agents', 4 * s, barY + 6 * s)

    // Free vs paid
    const freeCount = agents.filter((a) => a.cost === 'FREE').length
    ctx.fillStyle = '#22c55e'
    ctx.fillText(freeCount + ' FREE', 35 * s, barY + 6 * s)
    ctx.fillStyle = '#64748b'
    ctx.fillText('(Ollama)', 44 * s, barY + 6 * s)
    ctx.fillStyle = '#eab308'
    ctx.fillText(agents.length - freeCount + ' Paid', 58 * s, barY + 6 * s)
    ctx.fillStyle = '#64748b'
    ctx.fillText('(Anthropic)', 66 * s, barY + 6 * s)

    // Time
    ctx.textAlign = 'right'
    ctx.fillStyle = '#94a3b8'
    const now = new Date()
    ctx.fillText(
      now.toLocaleTimeString() + '  ' + now.toLocaleDateString(),
      w - 4 * s,
      barY + 6 * s
    )

    // Update header clock
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

  // Tooltip on hover
  document.addEventListener('mousemove', function (e) {
    const tooltip = document.getElementById('office-tooltip')
    if (!tooltip || !canvas) return
    const r = canvas.getBoundingClientRect()
    const mx = e.clientX - r.left,
      my = e.clientY - r.top
    let found = null
    for (const a of agents) {
      const pos = a.getDeskPosition(r.width, r.height - 52)
      const ax = a.atDesk ? pos.x : a.walkX
      const ay = a.atDesk ? pos.y : a.walkY
      if (Math.abs(mx - ax) < 40 && Math.abs(my - ay) < 50) {
        found = a
        break
      }
    }
    if (found) {
      const costLabel =
        found.cost === 'FREE' ? 'Local (Ollama) - $0/token' : 'Anthropic API - ' + found.cost
      const costColor = found.cost === 'FREE' ? '#22c55e' : '#eab308'
      tooltip.innerHTML =
        '<div style="font-weight:700;color:' +
        found.color +
        ';font-size:14px;margin-bottom:6px;">' +
        found.name +
        '</div>' +
        '<div style="color:#94a3b8;font-size:11px;margin-bottom:4px;">' +
        found.role +
        '</div>' +
        '<div style="color:#e2e8f0;font-size:12px;margin-bottom:6px;">' +
        found.model +
        '</div>' +
        '<div style="color:#e2e8f0;font-size:11px;margin-bottom:6px;border-top:1px solid rgba(255,255,255,0.1);padding-top:6px;">' +
        found.statusEmoji +
        ' ' +
        found.activity +
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
