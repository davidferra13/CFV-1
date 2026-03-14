// ── Pixel Kitchen V2+ ────────────────────────────────────────────
// Full restaurant visualization with real pixel art assets.
// Assets: Kenney (CC0), OpenGameArt (CC0/CC-BY), ENDESGA 64 palette
// Blueprint: docs/pixel-kitchen-blueprint.md
;(function () {
  const P = 4 // pixel scale (smaller for more detail)

  // ── ENDESGA 64 Color Palette (upgraded from basic palette) ──
  // Source: https://lospec.com/palette-list/endesga-64 (free to use)
  const C = {
    // Metals and steel (from ENDESGA grays)
    steel: '#b4b4b4',
    steelDark: '#5d5d5d',
    chrome: '#c7cfdd',
    // Flames (ENDESGA warm spectrum)
    flameBlue: '#0069aa',
    flameOrange: '#ed7614',
    flameYellow: '#ffc825',
    pilot: '#0c2e44',
    flameTip: '#ffeb57',
    flameCore: '#ff5000',
    flameGlow: '#ffa214',
    // Wood (ENDESGA brown range)
    woodLight: '#bf6f4a',
    woodDark: '#5d2c28',
    // Food (ENDESGA natural tones)
    foodGreen: '#5ac54f',
    foodRed: '#ea323c',
    foodGold: '#edab50',
    // Status indicators (ENDESGA vivid)
    statusGreen: '#5ac54f',
    statusYellow: '#ffc825',
    statusRed: '#ea323c',
    tempGreen: '#5ac54f',
    tempYellow: '#edab50',
    tempRed: '#ff5000',
    // Architecture (ENDESGA darks)
    tileFloor: '#e69c69',
    wallWhite: '#f9e6cf',
    ceilingGray: '#858585',
    // Effects (ENDESGA range)
    steam: '#c7cfdd',
    smoke: '#5d5d5d',
    water: '#0098dc',
    ice: '#94fdff',
    // Chef colors (ENDESGA skin + whites)
    coatWhite: '#f9e6cf',
    coatBlack: '#1b1b1b',
    apronWhite: '#f6ca9f',
    skin: '#e69c69',
    skinDark: '#bf6f4a',
    // Lighting (ENDESGA warm accents)
    heatLamp: '#ffa214',
    neonGlow: '#f5555d',
    candleGlow: '#f6ca9f',
    screenGlow: '#5ac54f',
    // UI (ENDESGA deep darks)
    panelBg: '#0e071b',
    panelBorder: '#1a1932',
    // Environments (ENDESGA slate + wood)
    kitchenWall: '#2a2f4e',
    diningWall: '#391f21',
    diningFloor: '#5d2c28',
    // Extended palette (new from ENDESGA 64)
    gold: '#edab50',
    amber: '#ed7614',
    cream: '#f9e6cf',
    peach: '#f6ca9f',
    midnight: '#1a1932',
    void: '#0e071b',
    wine: '#391f21',
    teal: '#134c4c',
    navy: '#00396d',
    skyBlue: '#00cdf9',
    cyan: '#0cf1ff',
    lime: '#d3fc7e',
    lightGreen: '#99e65f',
    darkGreen: '#1e6f50',
    purple: '#7a09fa',
    magenta: '#db3ffd',
    rose: '#c85086',
    salmon: '#f68187',
    coral: '#f5555d',
    crimson: '#c42430',
    maroon: '#571c27',
  }

  // ── Sprite Loading System ──
  // Loads real pixel art assets from downloaded packs
  const ASSET_BASE = '/assets/'
  const sprites = {} // loaded Image objects keyed by name
  let spritesLoaded = false
  let spriteLoadCount = 0
  let spriteLoadTotal = 0

  // Sprite atlas for Kenney food tiles (18x18 tiles in a 16x7 grid, 1px spacing)
  const FOOD_TILE = { w: 18, h: 18, gap: 1, cols: 16, rows: 7 }
  // Kenney UI spritesheet (16x16 tiles, 2px margin)
  const UI_TILE = { w: 16, h: 16, margin: 2 }

  // Food tile name mappings (Kenney Pixel Platformer Food Expansion)
  // These map kitchen concepts to specific tile indices
  const FOOD_TILES = {
    apple: 0,
    banana: 1,
    cherry: 2,
    grape: 3,
    lemon: 4,
    orange: 5,
    pear: 6,
    strawberry: 7,
    watermelon: 8,
    pineapple: 9,
    carrot: 16,
    corn: 17,
    pepper: 18,
    tomato: 19,
    broccoli: 20,
    mushroom: 21,
    eggplant: 22,
    onion: 23,
    bread: 32,
    cheese: 33,
    egg: 34,
    meat: 35,
    fish: 36,
    cake: 48,
    pie: 49,
    donut: 50,
    cookie: 51,
    icecream: 52,
    burger: 64,
    hotdog: 65,
    pizza: 66,
    taco: 67,
    sushi: 68,
    drink: 80,
    coffee: 81,
    juice: 82,
    wine: 83,
    beer: 84,
    plate: 96,
    bowl: 97,
    pot: 98,
    pan: 99,
    knife: 100,
    fork: 101,
  }

  // LPC Flame frames: 12 frames of 16x24 fire animation
  const FLAME_FRAMES = 12

  function loadSprite(name, src) {
    spriteLoadTotal++
    const img = new Image()
    img.onload = () => {
      sprites[name] = img
      spriteLoadCount++
      if (spriteLoadCount >= spriteLoadTotal) spritesLoaded = true
    }
    img.onerror = () => {
      console.warn('[PixelKitchen] Failed to load sprite:', name, src)
      spriteLoadCount++
      if (spriteLoadCount >= spriteLoadTotal) spritesLoaded = true
    }
    img.src = src
  }

  // Load all sprite assets
  function initSprites() {
    // Food tilemap (Kenney - CC0)
    loadSprite('foodTilemap', ASSET_BASE + 'sprites/food/Tilemap/tilemap.png')
    loadSprite('foodPreview', ASSET_BASE + 'sprites/food/Preview.png')

    // Individual food tiles for specific uses
    const foodTiles = [
      0, 1, 2, 3, 4, 5, 6, 7, 16, 17, 18, 19, 32, 33, 34, 35, 48, 49, 64, 65, 66, 96, 97, 98, 99,
    ]
    foodTiles.forEach((i) => {
      const name = 'food_' + String(i).padStart(4, '0')
      loadSprite(
        name,
        ASSET_BASE + 'sprites/food/Tiles/tile_' + String(i).padStart(4, '0') + '.png'
      )
    })

    // Extra food pack (InkMammoth - GPL 2.0, attribution: InkMammoth)
    loadSprite(
      'foodExtra',
      ASSET_BASE +
        'sprites/food-extra/Food%20Pack%201%20-%20InkMammoth%20PW/Food%20Pack%20Sprite%20Sheet%20InkMammoth%20.png'
    )

    // UI panels (Kenney - CC0)
    loadSprite('panelBrown', ASSET_BASE + 'ui/9-Slice/Ancient/brown.png')
    loadSprite('panelBrownInlay', ASSET_BASE + 'ui/9-Slice/Ancient/brown_inlay.png')
    loadSprite('panelTan', ASSET_BASE + 'ui/9-Slice/Ancient/tan.png')
    loadSprite('panelTanInlay', ASSET_BASE + 'ui/9-Slice/Ancient/tan_inlay.png')
    loadSprite('panelGrey', ASSET_BASE + 'ui/9-Slice/Ancient/grey.png')
    loadSprite('panelGreyInlay', ASSET_BASE + 'ui/9-Slice/Ancient/grey_inlay.png')
    loadSprite('panelWhite', ASSET_BASE + 'ui/9-Slice/Ancient/white.png')
    loadSprite('panelWhiteInlay', ASSET_BASE + 'ui/9-Slice/Ancient/white_inlay.png')
    // Colored panels
    loadSprite('panelGreen', ASSET_BASE + 'ui/9-Slice/Colored/green.png')
    loadSprite('panelRed', ASSET_BASE + 'ui/9-Slice/Colored/red.png')
    loadSprite('panelBlue', ASSET_BASE + 'ui/9-Slice/Colored/blue.png')
    loadSprite('panelYellow', ASSET_BASE + 'ui/9-Slice/Colored/yellow.png')
    // Space panel
    loadSprite('panelSpace', ASSET_BASE + 'ui/9-Slice/space.png')
    loadSprite('panelSpaceInlay', ASSET_BASE + 'ui/9-Slice/space_inlay.png')
    // Full UI spritesheet
    loadSprite('uiSheet', ASSET_BASE + 'ui/Spritesheet/UIpackSheet_transparent.png')

    // Flame animation frames (LPC - CC-BY 3.0, credit: Sharm)
    for (let i = 1; i <= FLAME_FRAMES; i++) {
      loadSprite('flame_' + i, ASSET_BASE + 'effects/flames/' + String(i).padStart(2, '0') + '.png')
    }

    // Kenney particle effects (CC0)
    const particles = [
      'fire_01',
      'fire_02',
      'flame_01',
      'flame_02',
      'flame_03',
      'flame_04',
      'flame_05',
      'flame_06',
      'smoke_01',
      'smoke_02',
      'smoke_03',
      'smoke_04',
      'smoke_05',
      'smoke_06',
      'smoke_07',
      'smoke_08',
      'smoke_09',
      'smoke_10',
      'circle_01',
      'circle_02',
      'circle_03',
      'circle_04',
      'circle_05',
      'light_01',
      'light_02',
      'light_03',
      'flare_01',
      'star_01',
      'star_02',
      'star_03',
    ]
    particles.forEach((p) => {
      loadSprite('particle_' + p, ASSET_BASE + 'effects/PNG%20(Transparent)/' + p + '.png')
    })
  }

  // Draw a food tile from the Kenney tilemap
  function drawFoodTile(tileIdx, dx, dy, scale) {
    const tm = sprites.foodTilemap
    if (!tm) return false
    scale = scale || 1
    const col = tileIdx % FOOD_TILE.cols
    const row = Math.floor(tileIdx / FOOD_TILE.cols)
    const sx = col * (FOOD_TILE.w + FOOD_TILE.gap)
    const sy = row * (FOOD_TILE.h + FOOD_TILE.gap)
    ctx.imageSmoothingEnabled = false // crisp pixel art
    ctx.drawImage(
      tm,
      sx,
      sy,
      FOOD_TILE.w,
      FOOD_TILE.h,
      dx,
      dy,
      FOOD_TILE.w * scale,
      FOOD_TILE.h * scale
    )
    ctx.imageSmoothingEnabled = true
    return true
  }

  // Draw a sprite with pixel-perfect rendering
  function drawSprite(name, dx, dy, dw, dh) {
    const img = sprites[name]
    if (!img) return false
    ctx.imageSmoothingEnabled = false
    if (dw && dh) {
      ctx.drawImage(img, dx, dy, dw, dh)
    } else {
      ctx.drawImage(img, dx, dy)
    }
    ctx.imageSmoothingEnabled = true
    return true
  }

  // Draw a 9-slice panel (pixel art UI frame)
  function draw9Slice(name, dx, dy, dw, dh) {
    const img = sprites[name]
    if (!img) {
      roundRect(dx, dy, dw, dh, 4, C.panelBg)
      return false
    }
    const sw = img.width,
      sh = img.height
    const border = Math.floor(Math.min(sw, sh) / 3) // auto-detect border size
    const b = border
    ctx.imageSmoothingEnabled = false
    // Corners
    ctx.drawImage(img, 0, 0, b, b, dx, dy, b, b) // TL
    ctx.drawImage(img, sw - b, 0, b, b, dx + dw - b, dy, b, b) // TR
    ctx.drawImage(img, 0, sh - b, b, b, dx, dy + dh - b, b, b) // BL
    ctx.drawImage(img, sw - b, sh - b, b, b, dx + dw - b, dy + dh - b, b, b) // BR
    // Edges
    ctx.drawImage(img, b, 0, sw - 2 * b, b, dx + b, dy, dw - 2 * b, b) // Top
    ctx.drawImage(img, b, sh - b, sw - 2 * b, b, dx + b, dy + dh - b, dw - 2 * b, b) // Bottom
    ctx.drawImage(img, 0, b, b, sh - 2 * b, dx, dy + b, b, dh - 2 * b) // Left
    ctx.drawImage(img, sw - b, b, b, sh - 2 * b, dx + dw - b, dy + b, b, dh - 2 * b) // Right
    // Center
    ctx.drawImage(img, b, b, sw - 2 * b, sh - 2 * b, dx + b, dy + b, dw - 2 * b, dh - 2 * b)
    ctx.imageSmoothingEnabled = true
    return true
  }

  // Draw animated flame from LPC sprite frames
  function drawFlameSprite(dx, dy, scale, speed) {
    scale = scale || 1
    speed = speed || 0.1
    const frameIdx = (Math.floor(tick * speed) % FLAME_FRAMES) + 1
    const name = 'flame_' + frameIdx
    return drawSprite(name, dx, dy, 16 * scale, 24 * scale)
  }

  // Draw particle effect with tinting
  function drawParticle(name, dx, dy, size, alpha) {
    const img = sprites['particle_' + name]
    if (!img) return false
    ctx.globalAlpha = alpha || 0.5
    ctx.imageSmoothingEnabled = false
    ctx.drawImage(img, dx, dy, size || 16, size || 16)
    ctx.imageSmoothingEnabled = true
    ctx.globalAlpha = 1
    return true
  }

  // ── Speech Bubble (shows what each character is doing) ──
  function drawSpeechBubble(x, y, lines, color) {
    if (!lines || !lines.length) return
    const padding = 6
    const lineH = 10
    const maxW = lines.reduce((max, l) => Math.max(max, ctx.measureText ? l.length * 5.5 : 60), 0)
    const bw = Math.max(maxW + padding * 2, 50)
    const bh = lines.length * lineH + padding * 2
    const bx = x - bw / 2
    const by = y - bh - 12

    // Bubble background
    roundRect(bx, by, bw, bh, 4, 'rgba(10,10,30,0.85)')
    // Bubble border (colored accent)
    ctx.strokeStyle = color || C.chrome
    ctx.lineWidth = 1.5
    ctx.beginPath()
    ctx.roundRect(bx, by, bw, bh, 4)
    ctx.stroke()
    // Tail triangle pointing down
    ctx.fillStyle = 'rgba(10,10,30,0.85)'
    ctx.beginPath()
    ctx.moveTo(x - 5, by + bh)
    ctx.lineTo(x + 5, by + bh)
    ctx.lineTo(x, by + bh + 8)
    ctx.closePath()
    ctx.fill()
    // Tail border
    ctx.strokeStyle = color || C.chrome
    ctx.beginPath()
    ctx.moveTo(x - 5, by + bh)
    ctx.lineTo(x, by + bh + 8)
    ctx.lineTo(x + 5, by + bh)
    ctx.stroke()

    // Text lines
    for (let i = 0; i < lines.length; i++) {
      text(
        lines[i],
        x,
        by + padding + 7 + i * lineH,
        i === 0 ? color || C.cream : C.chrome,
        8,
        'center'
      )
    }
  }

  // ── Activity feed data (polled separately for recent file changes) ──
  let activityFeed = []
  let activityTickerOffset = 0
  async function pollActivityFeed() {
    try {
      const resp = await fetch('/api/activity/summary')
      if (!resp.ok) return
      const data = await resp.json()
      if (data.recent) {
        activityFeed = data.recent.slice(0, 10).map((r) => {
          const file = r.file.replace(/\.tmp\.\d+\.\d+$/, '')
          const short = file.split('/').slice(-2).join('/')
          return { type: r.type, file: short, time: r.time }
        })
      }
    } catch {
      /* retry */
    }
  }
  pollActivityFeed()
  setInterval(pollActivityFeed, 10000)

  // ── Generate speech bubble text from live data ──
  function getHeadChefBubble() {
    const infr = bizData.infrastructure
    if (!infr || !infr.ollama) return ['Checking...']
    if (!infr.ollama.online) return ['OFFLINE', 'Start Ollama!']
    const models = infr.ollama.models || []
    // Show most relevant model (qwen3 preferred)
    const main = models.find((m) => m.startsWith('qwen3:')) || models[0] || ''
    return [models.length + ' models ready', main]
  }
  // Line cook bubble removed: Dev/Beta/Prod are stove burners (equipment), not chef characters
  function getExpoBubble() {
    const act = bizData.activity
    if (!act) return ['Watching...']
    const lines = [act.recentFileChanges + ' file changes']
    if (activityFeed.length > 0) {
      lines.push(activityFeed[0].file)
    }
    return lines
  }
  // ── OpenClaw agent bubble helpers ──
  function getOpenClawStatus() {
    const ocUp = bizData.agentStates?.openclawGateway || false
    return { online: ocUp }
  }

  // Initialize sprite loading immediately
  initSprites()

  // ── Live business data (polled from /api/pixel/data) ──
  let bizData = {
    events: {},
    eventsTotal: 0,
    revenue: {},
    inquiries: { open: 0, overdue: 0, overdueList: [] },
    clients: { total: 0 },
    upcoming: [],
    agentStates: { ollama: false, devServer: false, betaServer: false, openclawGateway: false },
    activity: { recentCommits: 0, recentFileChanges: 0 },
    staff: [],
    weather: null,
    ingredients: [],
    history: [],
    infrastructure: null,
  }
  let bizDataLoaded = false
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
  setInterval(pollBizData, 15000)

  // ── Achievement system ──
  let achievementToasts = []
  let checkedMilestones = new Set()
  try {
    const saved = localStorage.getItem('pk2-milestones')
    if (saved) checkedMilestones = new Set(JSON.parse(saved))
  } catch {}

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
      id: 'event-1',
      test: (d) => (d.events.completed || 0) >= 1,
      text: 'First Event!',
      icon: '\u2705',
      color: '#22c55e',
    },
    {
      id: 'event-5',
      test: (d) => (d.events.completed || 0) >= 5,
      text: '5 Events!',
      icon: '\u{1F3C6}',
      color: '#22c55e',
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
      text: '$50K!',
      icon: '\u{1F48E}',
      color: '#f59e0b',
    },
    {
      id: 'rev-100k',
      test: (d) => parseDollars(d) >= 100000,
      text: 'GRAND CHEF!',
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
      text: 'Kitchen Open!',
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
      } catch {}
    })
  }

  // ── Activity feed ──
  let realActivity = []
  async function pollRealActivity() {
    try {
      const resp = await fetch('/api/activity/summary')
      if (!resp.ok) return
      const data = await resp.json()
      if (data.recent && data.recent.length) {
        realActivity = data.recent.slice(0, 20).map((e) => ({
          file: e.file || e.path || 'unknown',
          time: e.time
            ? new Date(e.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            : '',
          action: e.action || 'modified',
        }))
      }
    } catch {}
  }
  pollRealActivity()
  setInterval(pollRealActivity, 10000)

  // ── Notification queue ──
  let notifications = []
  let lastInquiryCount = -1,
    lastOverdueCount = -1
  function pushNotification(type, text) {
    notifications.push({ type, text, x: 0, y: 0, opacity: 1, age: 0, maxAge: 300 })
    if (notifications.length > 5) notifications.shift()
  }

  // ── Sound system ──
  let soundEnabled = false
  const audioCtx = typeof AudioContext !== 'undefined' ? new AudioContext() : null
  function playTone(freq, dur, vol) {
    if (!soundEnabled || !audioCtx) return
    try {
      const o = audioCtx.createOscillator(),
        g = audioCtx.createGain()
      o.connect(g)
      g.connect(audioCtx.destination)
      o.frequency.value = freq
      o.type = 'sine'
      g.gain.value = vol || 0.05
      o.start()
      g.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + (dur || 0.15))
      o.stop(audioCtx.currentTime + (dur || 0.15))
    } catch {}
  }
  function playSizzle() {
    playTone(200 + Math.random() * 100, 0.08, 0.02)
  }
  function playBell() {
    playTone(1200, 0.3, 0.06)
    playTone(1600, 0.2, 0.04)
  }
  function playAlarm() {
    playTone(440, 0.15, 0.05)
    setTimeout(() => playTone(520, 0.15, 0.05), 180)
  }

  // ── Day/night ──
  function getDayPhase() {
    const h = new Date().getHours()
    if (h >= 6 && h < 10) return { phase: 'morning', tint: 'rgba(255,200,100,0.04)' }
    if (h >= 10 && h < 16) return { phase: 'day', tint: 'rgba(255,255,255,0)' }
    if (h >= 16 && h < 19) return { phase: 'golden', tint: 'rgba(255,160,60,0.06)' }
    if (h >= 19 && h < 22) return { phase: 'evening', tint: 'rgba(30,30,80,0.08)' }
    return { phase: 'night', tint: 'rgba(10,10,50,0.15)' }
  }

  // ── Click regions ──
  let clickRegions = []
  function registerClickRegion(x, y, w, h, action, label) {
    // Transform coordinates if inside a drawScaled context
    if (_scaleCtx) {
      const s = _scaleCtx.scale
      x = _scaleCtx.x + x * s
      y = _scaleCtx.y + y * s
      w = w * s
      h = h * s
    }
    clickRegions.push({ x, y, w, h, action, label })
  }

  // ── State ──
  let officeRunning = false,
    officeRAF = null,
    canvas,
    ctx
  let lastW = 0,
    lastH = 0,
    tick = 0
  let hoveredRegion = null
  let tooltipData = null // { x, y, title, lines, color }

  // ── Drawing helpers ──
  function rect(x, y, w, h, col) {
    ctx.fillStyle = col
    ctx.fillRect(Math.round(x), Math.round(y), w, h)
  }

  // Scale helper: draws a function at (x,y) with scale multiplier
  // The drawFn receives (0,0) as origin - all internal offsets are auto-scaled
  // Also patches registerClickRegion to transform coordinates
  let _scaleCtx = null // current scale context for click region transform
  function drawScaled(x, y, scale, drawFn) {
    const prev = _scaleCtx
    _scaleCtx = { x, y, scale }
    ctx.save()
    ctx.translate(x, y)
    ctx.scale(scale, scale)
    drawFn(0, 0)
    ctx.restore()
    _scaleCtx = prev
  }
  const _origRegisterClickRegion = null // set below
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
  function text(str, x, y, color, size, align) {
    ctx.fillStyle = color || '#fff'
    ctx.font = (size || 10) + 'px monospace'
    ctx.textAlign = align || 'left'
    ctx.fillText(str, Math.round(x), Math.round(y))
  }
  function line(x1, y1, x2, y2, col, width) {
    ctx.strokeStyle = col
    ctx.lineWidth = width || 1
    ctx.beginPath()
    ctx.moveTo(Math.round(x1), Math.round(y1))
    ctx.lineTo(Math.round(x2), Math.round(y2))
    ctx.stroke()
  }

  // ── Infrastructure helpers ──
  function infra() {
    return bizData.infrastructure || {}
  }
  function isUp(key) {
    const i = infra()
    if (!i[key]) return false
    if (typeof i[key] === 'object')
      return i[key].online || i[key].running || i[key].connected || false
    return !!i[key]
  }

  // ══════════════════════════════════════════════════════════════════
  // ZONE RENDERING - THE RESTAURANT SCENE
  // ══════════════════════════════════════════════════════════════════

  // ── Layout constants (computed per frame from canvas size) ──
  let Z = {} // zone rects, computed in drawScene

  function computeZones(w, h) {
    const wallH = h * 0.08 // top wall (smaller to give dining more room)
    const kitchenH = h * 0.28 // kitchen zone (smaller)
    const passH = h * 0.04 // the pass
    const diningH = h * 0.5 // dining room (HUGE - agents need to be visible)
    const hudH = h * 0.1 // bottom HUD
    Z = {
      wall: { x: 0, y: 0, w, h: wallH },
      kitchen: { x: 0, y: wallH, w, h: kitchenH },
      pass: { x: 0, y: wallH + kitchenH, w, h: passH },
      dining: { x: 0, y: wallH + kitchenH + passH, w, h: diningH },
      hud: { x: 0, y: h - hudH, w, h: hudH },
    }
  }

  // ═══════════════════════════════════════════════════════════
  // WALL ZONE - Hood vent, signage, shelves
  // ═══════════════════════════════════════════════════════════
  function drawWallZone() {
    const z = Z.wall
    // Dark kitchen wall
    rect(z.x, z.y, z.w, z.h, C.kitchenWall)
    // Hood vent (Cloudflare Tunnel)
    const ventW = z.w * 0.6,
      ventH = z.h * 0.3
    const ventX = z.w * 0.05,
      ventY = z.y + z.h * 0.1
    const tunnelUp = bizData.agentStates.betaServer || isUp('cloudflare')
    rect(ventX, ventY, ventW, ventH, tunnelUp ? '#555' : '#333')
    rect(ventX + 2, ventY + 2, ventW - 4, ventH - 4, tunnelUp ? '#666' : '#3a3a3a')
    // Vent slats
    for (let i = 0; i < 6; i++) {
      const sx = ventX + 6 + (i * (ventW - 12)) / 6
      rect(sx, ventY + 4, (ventW - 12) / 7, ventH - 8, tunnelUp ? '#777' : '#444')
    }
    // Vent label
    text(
      'HOOD VENT',
      ventX + ventW / 2,
      ventY + ventH + 12,
      tunnelUp ? '#8a8' : '#664',
      9,
      'center'
    )
    text(
      tunnelUp ? 'Tunnel OK' : 'OFFLINE',
      ventX + ventW / 2,
      ventY + ventH + 22,
      tunnelUp ? C.statusGreen : C.statusRed,
      8,
      'center'
    )
    // Smoke animation when vent is working (Kenney smoke particles)
    if (tunnelUp && tick % 8 < 4) {
      for (let i = 0; i < 3; i++) {
        const smokeX = ventX + 10 + Math.sin(tick * 0.03 + i * 2) * 20 + i * ventW * 0.25
        const smokeY = ventY - 6 - (tick % 30) * 0.3
        const smokeNames = ['smoke_01', 'smoke_03', 'smoke_05']
        if (!drawParticle(smokeNames[i], smokeX - 4, smokeY - 4, 12, 0.12)) {
          ctx.fillStyle = 'rgba(199,207,221,0.15)'
          ctx.fillRect(smokeX, smokeY, 4, 3)
        }
      }
    }
    registerClickRegion(
      ventX,
      ventY,
      ventW,
      ventH + 24,
      () => {
        tooltipData = {
          title: 'Cloudflare Tunnel',
          color: tunnelUp ? C.statusGreen : C.statusRed,
          lines: [tunnelUp ? 'Connected' : 'Disconnected', 'beta.cheflowhq.com -> localhost:3200'],
        }
      },
      'Hood Vent'
    )

    // Cookbook on shelf (Gemini)
    const bookX = z.w * 0.72,
      bookY = z.y + z.h * 0.2
    rect(bookX, bookY, 24, 30, '#8B4513')
    rect(bookX + 2, bookY + 2, 20, 26, '#D2691E')
    text('G', bookX + 12, bookY + 18, '#fff', 10, 'center')
    text('Cookbook', bookX + 12, bookY + 42, '#aaa', 8, 'center')
    registerClickRegion(
      bookX,
      bookY,
      24,
      44,
      () => {
        tooltipData = {
          title: 'Google Gemini',
          color: '#D2691E',
          lines: ['Non-private AI tasks only', 'Generic techniques, kitchen specs'],
        }
      },
      'Cookbook'
    )

    // Neon "OPEN" sign (DNS)
    const signX = z.w * 0.85,
      signY = z.y + z.h * 0.15
    const dnsUp = true // DNS is almost always up
    ctx.fillStyle = dnsUp ? C.neonGlow : '#442'
    ctx.font = 'bold 14px monospace'
    ctx.textAlign = 'center'
    // Glow effect
    if (dnsUp) {
      ctx.shadowColor = C.neonGlow
      ctx.shadowBlur = 8
      ctx.fillText('OPEN', signX, signY + 14)
      ctx.shadowBlur = 0
    } else {
      ctx.fillText('CLOSED', signX, signY + 14)
    }
    ctx.textAlign = 'left'
    text('cheflowhq.com', signX, signY + 26, '#777', 7, 'center')

    // Timer board (cron jobs) - row of small squares above pass
    const timerX = z.w * 0.35,
      timerY = z.y + z.h * 0.15
    text('TIMERS', timerX, timerY - 2, '#777', 7, 'left')
    const timerColors = ['#4a4', '#4a4', '#4a4', '#aa4', '#aa4', '#a84', '#888'] // 5m, 5m, 5m, 15m, 30m, 1h, daily
    for (let i = 0; i < 7; i++) {
      const tx = timerX + i * 14
      // Timer ticking animation
      const phase = (tick + i * 90) % 360
      const bright = phase < 20 // flash when "firing"
      rect(tx, timerY + 2, 10, 10, bright ? '#fff' : timerColors[i])
      rect(tx + 1, timerY + 3, 8, 8, bright ? timerColors[i] : '#222')
      // Clock hand
      const angle = (tick * 0.02 + i) % (Math.PI * 2)
      const cx = tx + 5,
        cy = timerY + 7
      line(
        cx,
        cy,
        cx + Math.cos(angle) * 3,
        cy + Math.sin(angle) * 3,
        bright ? '#fff' : timerColors[i],
        1
      )
    }
    registerClickRegion(
      timerX,
      timerY - 4,
      100,
      20,
      () => {
        tooltipData = {
          title: 'Cron Jobs (30+)',
          color: '#aa4',
          lines: [
            '5min: Gmail, integrations, social',
            '15min: Automations, copilot',
            '1hr: RSVP, campaigns, Remy',
            'Daily: Reports, cleanup, lifecycle',
          ],
        }
      },
      'Timers'
    )

    // ── AI PROVIDER SHELF (wall-mounted rack of cloud providers) ──
    const shelfX = z.w * 0.35,
      shelfY = z.y + z.h * 0.55
    // Shelf (metal bracket)
    rect(shelfX, shelfY, z.w * 0.55, 2, C.steel)
    rect(shelfX, shelfY + 2, 2, 6, C.steelDark)
    rect(shelfX + z.w * 0.55 - 2, shelfY + 2, 2, 6, C.steelDark)

    const providers = [
      { label: 'Groq', color: C.skyBlue },
      { label: 'Cerebras', color: C.cyan },
      { label: 'Mistral', color: C.purple },
      { label: 'SambaNova', color: C.lime },
      { label: 'GitHub', color: '#888' },
      { label: 'Workers', color: C.amber },
    ]
    const provSpacing = (z.w * 0.55) / providers.length
    providers.forEach((prov, i) => {
      const px = shelfX + 4 + i * provSpacing
      const py = shelfY - 18

      // Each provider gets a unique kitchen equipment shape
      if (prov.label === 'Groq') {
        // Speed rack (tall wire rack, fast cooling)
        rect(px, py + 2, 14, 16, '#333')
        for (let r = 0; r < 4; r++) rect(px + 1, py + 3 + r * 4, 12, 1, prov.color)
        rect(px, py + 2, 1, 16, C.steel)
        rect(px + 13, py + 2, 1, 16, C.steel)
      } else if (prov.label === 'Cerebras') {
        // Microwave (box with spinning plate)
        rect(px, py + 2, 16, 14, prov.color)
        rect(px + 1, py + 3, 10, 10, '#111') // door window
        // Spinning plate inside
        const plateAngle = tick * 0.04
        const cpx = px + 6,
          cpy = py + 8
        ctx.fillStyle = '#444'
        ctx.beginPath()
        ctx.arc(cpx, cpy, 3, 0, Math.PI * 2)
        ctx.fill()
        rect(px + 12, py + 4, 3, 3, '#ddd') // buttons
        rect(px + 12, py + 8, 3, 3, '#ddd')
      } else if (prov.label === 'Mistral') {
        // Magnetic knife strip with 3 knives
        rect(px, py + 6, 16, 3, '#555') // strip
        for (let k = 0; k < 3; k++) {
          rect(px + 2 + k * 5, py + 2, 2, 5, C.steel) // blade
          rect(px + 2 + k * 5, py + 7, 2, 4, prov.color) // handle
        }
      } else if (prov.label === 'SambaNova') {
        // Food processor / blender
        rect(px + 3, py + 2, 8, 4, '#ddd') // lid
        rect(px + 2, py + 6, 10, 10, prov.color) // jar body
        rect(px + 4, py + 8, 6, 6, 'rgba(0,0,0,0.2)') // contents
        rect(px + 4, py + 16, 6, 2, C.steelDark) // base
      } else if (prov.label === 'GitHub') {
        // Recipe binder / book
        rect(px + 1, py + 2, 12, 16, '#444') // cover
        rect(px + 2, py + 3, 10, 14, '#555') // pages
        rect(px + 1, py + 2, 2, 16, '#333') // spine
        // Octocat silhouette (tiny)
        rect(px + 5, py + 6, 4, 4, '#fff')
        rect(px + 4, py + 5, 2, 2, '#fff')
        rect(px + 8, py + 5, 2, 2, '#fff')
      } else if (prov.label === 'Workers') {
        // Takeout container (edge = portable)
        rect(px + 1, py + 4, 12, 10, prov.color)
        rect(px + 2, py + 5, 10, 8, 'rgba(0,0,0,0.2)')
        // Wire handle
        ctx.strokeStyle = C.steel
        ctx.lineWidth = 1
        ctx.beginPath()
        ctx.arc(px + 7, py + 2, 5, Math.PI, Math.PI * 2)
        ctx.stroke()
      }

      // Name below shelf
      text(prov.label, px + 7, shelfY + 14, '#999', 6, 'center')

      registerClickRegion(
        px,
        py,
        16,
        32,
        () => {
          const descriptions = {
            Groq: [
              'Speed Rack (ultra-fast inference)',
              '~800 tok/s, free tier',
              'Llama 3.1 8B + 3.3 70B',
            ],
            Cerebras: [
              'Microwave (wafer-scale speed)',
              '~2000 tok/s, free tier',
              'Llama 3.1 8B, 3.3 70B, Scout',
            ],
            Mistral: [
              'Knife Set (precision tools)',
              'Free tier, Codestral for code',
              'Small, Medium, Large + Code',
            ],
            SambaNova: [
              'Food Processor (reasoning)',
              'Free tier cloud inference',
              'Llama 3.1 8B, 3.3 70B, DeepSeek R1',
            ],
            GitHub: [
              'Recipe Binder (code reference)',
              'Free via GitHub Models',
              'GPT-4.1-mini, GPT-4.1, Llama',
            ],
            Workers: [
              'Food Truck (edge inference)',
              'Cloudflare Workers AI, free',
              'Llama 3.1 8B at the edge',
            ],
          }
          tooltipData = {
            title: prov.label + ' AI',
            color: prov.color,
            lines: descriptions[prov.label] || ['Cloud AI provider'],
          }
        },
        prov.label
      )
    })

    // ── FOOD TRUCK outside window (Workers AI visual) ──
    const truckX = z.w * 0.88,
      truckY = z.y + z.h * 0.35
    rect(truckX, truckY, 26, 16, C.amber)
    rect(truckX + 2, truckY + 2, 10, 8, '#fff') // serving window
    rect(truckX + 16, truckY + 10, 8, 8, '#333') // wheel
    rect(truckX + 2, truckY + 10, 8, 8, '#333') // wheel
    text('CF', truckX + 13, truckY + 9, C.amber, 7, 'center')
    text('Edge', truckX + 13, truckY + 28, '#888', 7, 'center')

    registerClickRegion(
      truckX,
      truckY,
      28,
      30,
      () => {
        tooltipData = {
          title: 'Food Truck (Workers AI)',
          color: C.amber,
          lines: [
            'Cloudflare edge inference',
            '@cf/meta/llama-3.1-8b-instruct',
            'Serves requests at the edge, not in the kitchen',
          ],
        }
      },
      'Food Truck'
    )
  }

  // ═══════════════════════════════════════════════════════════
  // KITCHEN ZONE - Stove line, walk-in, chef, dish pit, fryer
  // ═══════════════════════════════════════════════════════════
  function drawKitchenZone() {
    const z = Z.kitchen
    // Kitchen floor tiles
    ctx.fillStyle = '#3a3a42'
    ctx.fillRect(z.x, z.y, z.w, z.h)
    // Subtle tile grid
    ctx.strokeStyle = 'rgba(255,255,255,0.03)'
    ctx.lineWidth = 1
    for (let gx = z.x; gx < z.x + z.w; gx += 20) {
      ctx.beginPath()
      ctx.moveTo(gx, z.y)
      ctx.lineTo(gx, z.y + z.h)
      ctx.stroke()
    }
    for (let gy = z.y; gy < z.y + z.h; gy += 20) {
      ctx.beginPath()
      ctx.moveTo(z.x, gy)
      ctx.lineTo(z.x + z.w, gy)
      ctx.stroke()
    }

    // ── STOVE LINE (left side) ──
    const stoveX = z.w * 0.03
    const stoveY = z.y + z.h * 0.08
    const stoveW = z.w * 0.45
    const stoveH = z.h * 0.55
    drawStoveLine(stoveX, stoveY, stoveW, stoveH)

    // ── WALK-IN COOLER (right side) ──
    const coolerX = z.w * 0.62
    const coolerY = z.y + z.h * 0.05
    const coolerW = z.w * 0.2
    const coolerH = z.h * 0.65
    drawWalkInCooler(coolerX, coolerY, coolerW, coolerH)

    // ── HEAD CHEF (Ollama) ── scaled 2x
    const chefX = z.w * 0.35
    const chefY = z.y + z.h * 0.15
    drawScaled(chefX, chefY, 2.0, (ox, oy) => drawHeadChef(ox, oy))
    // Head Chef speech bubble (drawn outside drawScaled for correct positioning)
    drawSpeechBubble(chefX, chefY - 25, getHeadChefBubble(), C.statusGreen)

    // ── DISH PIT (far right) ──
    const pitX = z.w * 0.85
    const pitY = z.y + z.h * 0.1
    const pitW = z.w * 0.13
    const pitH = z.h * 0.55
    drawDishPit(pitX, pitY, pitW, pitH)

    // ── DEEP FRYER (Stripe) ──
    const fryX = z.w * 0.5
    const fryY = z.y + z.h * 0.08
    drawDeepFryer(fryX, fryY)

    // ── TICKET PRINTER ──
    const tktX = z.w * 0.48
    const tktY = z.y + z.h * 0.65
    drawTicketPrinter(tktX, tktY)

    // ── DELIVERY DOOR (OpenClaw, bottom-left) ──
    const doorX = z.x + 4
    const doorY = z.y + z.h * 0.65
    drawDeliveryDoor(doorX, doorY)

    // ── PREP STATION (TypeScript) ──
    const prepX = z.w * 0.5
    const prepY = z.y + z.h * 0.45
    drawPrepStation(prepX, prepY)

    // Dev/Beta/Prod are EQUIPMENT (stove burners), not chefs.
    // Git is EQUIPMENT (dish pit). Only agents get chef characters.

    // ── OPENCLAW BRIGADE (5 tiny characters near delivery door) ──
    const ocUp = isUp('openclawGateway')
    const brigadeX = z.x + 32
    const brigadeY = z.y + z.h * 0.42
    drawOpenClawBrigade(brigadeX, brigadeY, ocUp)

    // ── AI DISPATCH TICKET WHEEL (between kitchen and pass) ──
    const wheelX = z.w * 0.58
    const wheelY = z.y + z.h * 0.68
    drawDispatchWheel(wheelX, wheelY)

    // ── CLAUDE CODE PORTRAIT (framed on wall, watching over everything) ──
    const portraitX = z.w * 0.55
    const portraitY = z.y + z.h * 0.02
    drawClaudeCodePortrait(portraitX, portraitY)
  }

  // ── STOVE LINE (3 burners: Dev, Beta, Prod) ──
  function drawStoveLine(sx, sy, sw, sh) {
    const s = P
    // Stove body (stainless steel)
    roundRect(sx, sy, sw, sh, 4, C.steel)
    roundRect(sx + 2, sy + 2, sw - 4, sh - 4, 3, C.steelDark)
    // Control knobs at bottom
    for (let i = 0; i < 3; i++) {
      const kx = sx + 12 + i * (sw / 3)
      rect(kx, sy + sh - 10, 8, 8, '#555')
      rect(kx + 2, sy + sh - 8, 4, 4, '#888')
    }

    const burnerW = sw / 3 - 8
    const burners = [
      {
        label: 'DEV',
        sub: ':3100',
        up: bizData.agentStates.devServer,
        key: 'devServer',
        color: C.flameOrange,
      },
      {
        label: 'BETA',
        sub: ':3200',
        up: bizData.agentStates.betaServer,
        key: 'betaServer',
        color: '#FF4400',
      },
      {
        label: 'PROD',
        sub: 'Vercel',
        up: isUp('production'),
        key: 'production',
        color: C.heatLamp,
      },
    ]

    burners.forEach((b, i) => {
      const bx = sx + 6 + i * (sw / 3)
      const by = sy + 8
      const bw = burnerW
      const bh = sh * 0.65

      // Burner grate
      rect(bx, by, bw, bh, '#444')
      rect(bx + 2, by + 2, bw - 4, bh - 4, '#333')
      // Grate lines
      for (let g = 0; g < 4; g++) {
        rect(bx + 4, by + 6 + (g * (bh - 12)) / 4, bw - 8, 2, '#555')
      }

      if (b.up) {
        // REAL SPRITE FLAMES (LPC flame animation + Kenney particles)
        const flameCount = 5
        let usedSprites = false
        for (let f = 0; f < flameCount; f++) {
          const fx = bx + 4 + f * ((bw - 8) / flameCount)
          const fy = by + bh - 22
          // Try LPC flame sprite animation (each flame offset by different tick)
          const frameIdx = Math.floor((tick * 0.12 + f * 3) % FLAME_FRAMES) + 1
          const flameName = 'flame_' + frameIdx
          if (sprites[flameName]) {
            ctx.imageSmoothingEnabled = false
            ctx.drawImage(sprites[flameName], fx - 1, fy, 8, 18)
            ctx.imageSmoothingEnabled = true
            usedSprites = true
          }
        }
        // Fallback to procedural if sprites haven't loaded yet
        if (!usedSprites) {
          for (let f = 0; f < flameCount; f++) {
            const fx = bx + 4 + f * ((bw - 8) / flameCount)
            const fh = 6 + Math.sin(tick * 0.15 + f * 1.5) * 3
            const fy = by + bh - 4 - fh
            rect(fx, fy + fh * 0.5, 4, fh * 0.5, C.flameBlue)
            rect(fx + 1, fy, 3, fh * 0.5, b.color)
            if (Math.sin(tick * 0.1 + f) > 0.5) rect(fx + 1, fy - 2, 2, 3, C.flameYellow)
          }
        }
        // Steam from pan (use Kenney smoke particles)
        if (tick % 12 < 6) {
          const steamX = bx + bw / 2 - 4
          const steamY = by - 12 - (tick % 20) * 0.5
          if (!drawParticle('smoke_01', steamX, steamY, 10, 0.15)) {
            ctx.fillStyle = 'rgba(200,210,220,0.15)'
            ctx.fillRect(steamX + 2, steamY, 4, 6)
          }
        }
        // Pan on burner
        rect(bx + 4, by + 4, bw - 8, 6, C.steelDark)
        rect(bx + 6, by + 6, bw - 12, 3, C.steel)
        // Glow under pan from flames
        ctx.fillStyle = 'rgba(255,120,20,0.08)'
        ctx.fillRect(bx + 2, by + bh - 4, bw - 4, 4)
      } else {
        // Dark burner, pilot light only (use ENDESGA navy)
        rect(bx + bw / 2 - 1, by + bh - 6, 3, 3, C.pilot)
      }

      // Label
      const labelColor = b.up ? C.statusGreen : C.statusRed
      text(b.label, bx + bw / 2, by + bh + 14, labelColor, 9, 'center')
      text(b.sub, bx + bw / 2, by + bh + 24, '#777', 7, 'center')

      // Status dot
      rect(bx + bw / 2 - 2, by + bh + 27, 5, 5, b.up ? C.statusGreen : C.statusRed)

      registerClickRegion(
        bx,
        by,
        bw,
        bh + 34,
        () => {
          tooltipData = {
            title: b.label + ' Server',
            color: labelColor,
            lines: [
              b.up ? 'ONLINE' : 'OFFLINE',
              b.key === 'devServer'
                ? 'localhost:3100 (Next.js dev)'
                : b.key === 'betaServer'
                  ? 'localhost:3200 (Cloudflare Tunnel)'
                  : 'app.cheflowhq.com (Vercel)',
            ],
          }
        },
        b.label
      )
    })

    // Stove label
    text('STOVE LINE', sx + sw / 2, sy + sh + 8, '#888', 8, 'center')
  }

  // ── WALK-IN COOLER (Supabase) ──
  function drawWalkInCooler(cx, cy, cw, ch) {
    const infr = infra()
    const sbUp = isUp('supabase')
    const latency = infr.supabase ? infr.supabase.latency || infr.supabase.responseTime || 0 : 0

    // Cooler body
    roundRect(cx, cy, cw, ch, 4, sbUp ? '#556' : '#433')
    roundRect(cx + 3, cy + 3, cw - 6, ch - 6, 3, sbUp ? '#334' : '#322')

    // Door handle (chrome)
    rect(cx + cw - 10, cy + ch * 0.4, 6, 20, C.chrome)

    // Interior visible through "window"
    const winX = cx + 8,
      winY = cy + 8,
      winW = cw - 20,
      winH = ch * 0.6
    rect(winX, winY, winW, winH, sbUp ? '#224' : '#211')

    // Shelves with real food sprites (Kenney CC0)
    if (sbUp) {
      // Food items for each shelf: fruits, veggies, proteins
      const shelfFoods = [
        [0, 2, 5], // apple, cherry, orange
        [16, 18, 19], // carrot, pepper, tomato
        [33, 35, 34], // cheese, meat, egg
      ]
      for (let shelf = 0; shelf < 3; shelf++) {
        const shelfY = winY + 4 + shelf * (winH / 3)
        rect(winX + 2, shelfY + winH / 3 - 3, winW - 4, 2, '#424c6e') // shelf line (ENDESGA slate)
        // Real food sprites on shelves
        for (let c = 0; c < 3; c++) {
          const contX = winX + 4 + c * (winW / 3 - 2)
          const tileIdx = shelfFoods[shelf][c]
          if (!drawFoodTile(tileIdx, contX, shelfY + winH / 3 - 15, 0.6)) {
            // Fallback: colored containers
            const contH = 8 + (c % 2) * 4
            rect(
              contX,
              shelfY + winH / 3 - 3 - contH,
              winW / 3 - 6,
              contH,
              ['#424c6e', '#1e6f50', '#3b1443'][shelf]
            )
            rect(contX, shelfY + winH / 3 - 3 - contH, winW / 3 - 6, 2, C.cream)
          }
        }
      }
    } else {
      // Condensation / sweating when down
      for (let d = 0; d < 8; d++) {
        const dx = winX + 4 + Math.random() * (winW - 8)
        const dy = winY + 4 + Math.random() * (winH - 8)
        ctx.fillStyle = 'rgba(100,150,255,0.3)'
        ctx.fillRect(dx, dy, 2, 3)
      }
    }

    // Temperature display
    let tempStr, tempColor
    if (!sbUp) {
      tempStr = 'ERR'
      tempColor = C.tempRed
    } else if (latency < 100) {
      tempStr = '34F'
      tempColor = C.tempGreen
    } else if (latency < 500) {
      tempStr = '38F'
      tempColor = C.tempGreen
    } else if (latency < 1000) {
      tempStr = '42F'
      tempColor = C.tempYellow
    } else {
      tempStr = '50F'
      tempColor = C.tempRed
    }

    // Digital display
    const dispX = cx + 6,
      dispY = cy + ch * 0.7
    rect(dispX, dispY, 36, 18, '#111')
    rect(dispX + 1, dispY + 1, 34, 16, '#000')
    // Flashing when error
    if (!sbUp && tick % 30 < 15) tempColor = '#000'
    text(tempStr, dispX + 18, dispY + 13, tempColor, 11, 'center')

    // Compressor animation (bottom)
    const compY = cy + ch * 0.85
    if (sbUp) {
      // Humming animation
      const compOff = Math.sin(tick * 0.1) * 1
      rect(cx + 4, compY + compOff, cw - 8, 8, '#445')
      rect(cx + 6, compY + 2 + compOff, cw - 12, 4, '#334')
    }

    // Label
    text('WALK-IN', cx + cw / 2, cy + ch + 10, sbUp ? '#8a8' : '#a66', 9, 'center')
    text('Supabase', cx + cw / 2, cy + ch + 20, '#777', 7, 'center')

    // Temp sensor LED (Realtime)
    const ledX = cx + cw - 14,
      ledY = cy + 12
    const realtimeUp = sbUp // approximate
    rect(ledX, ledY, 6, 6, '#222')
    if (realtimeUp) {
      rect(ledX + 1, ledY + 1, 4, 4, tick % 40 < 20 ? C.statusGreen : '#060')
    }

    registerClickRegion(
      cx,
      cy,
      cw,
      ch + 22,
      () => {
        tooltipData = {
          title: 'Supabase (Walk-In Cooler)',
          color: sbUp ? C.statusGreen : C.statusRed,
          lines: [
            sbUp ? 'Connected' : 'DISCONNECTED',
            'Latency: ' + (latency || '?') + 'ms',
            'Temp: ' + tempStr,
            'Auth, Storage, Realtime, RLS',
          ],
        }
      },
      'Walk-In'
    )
  }

  // ── HEAD CHEF (Ollama) ──
  function drawHeadChef(x, y) {
    const up = bizData.agentStates.ollama
    const s = P

    if (up) {
      // Enhanced chef sprite with ENDESGA 64 palette
      const bob = Math.sin(tick * 0.04) * 2 // breathing
      const chop = tick % 120 < 60 // alternating tasting/chopping

      // Shadow (soft, larger)
      ctx.fillStyle = 'rgba(0,0,0,0.25)'
      ctx.beginPath()
      ctx.ellipse(x, y + 30 + bob, 10, 3, 0, 0, Math.PI * 2)
      ctx.fill()

      // Shoes (dark brown)
      rect(x - 5, y + 26 + bob, 4, 4, C.wine)
      rect(x + 1, y + 26 + bob, 4, 4, C.wine)

      // Legs (dark pants, checkered pattern hint)
      rect(x - 4, y + 22 + bob, 3, 5, '#272727')
      rect(x + 1, y + 22 + bob, 3, 5, '#272727')
      // Tiny checker pattern on pants
      if (tick % 2 === 0) {
        rect(x - 3, y + 23 + bob, 1, 1, '#3d3d3d')
        rect(x + 2, y + 24 + bob, 1, 1, '#3d3d3d')
      }

      // Body (white chef coat, ENDESGA cream)
      rect(x - 7, y + 8 + bob, 14, 14, C.coatWhite)
      // Double-breasted buttons (2 rows)
      for (let btn = 0; btn < 3; btn++) {
        rect(x - 2, y + 10 + btn * 4 + bob, 1, 1, C.chrome)
        rect(x + 1, y + 10 + btn * 4 + bob, 1, 1, C.chrome)
      }
      // Apron (peach tone, slightly different from coat)
      rect(x - 5, y + 12 + bob, 10, 10, C.peach)
      // Apron strings
      rect(x - 6, y + 12 + bob, 1, 3, C.peach)
      rect(x + 5, y + 12 + bob, 1, 3, C.peach)

      // Head (warm skin tone)
      rect(x - 4, y + 2 + bob, 8, 8, C.skin)
      // Mouth (subtle smile)
      rect(x - 1, y + 7 + bob, 3, 1, C.skinDark)
      // Eyes (animated blink every ~4 seconds)
      const blink = tick % 240 < 6
      if (blink) {
        rect(x - 2, y + 5 + bob, 2, 1, '#1b1b1b')
        rect(x + 2, y + 5 + bob, 2, 1, '#1b1b1b')
      } else {
        rect(x - 2, y + 4 + bob, 2, 2, '#1b1b1b')
        rect(x + 2, y + 4 + bob, 2, 2, '#1b1b1b')
        // Eye highlights
        rect(x - 1, y + 4 + bob, 1, 1, C.cream)
        rect(x + 3, y + 4 + bob, 1, 1, C.cream)
      }

      // Toque (tall chef hat with poof, ENDESGA whites)
      rect(x - 5, y - 2 + bob, 10, 4, C.cream) // hat brim
      rect(x - 4, y - 6 + bob, 8, 5, '#ffffff') // hat body
      rect(x - 3, y - 10 + bob, 6, 5, '#ffffff') // hat top poof
      // Hat detail lines
      rect(x - 3, y - 6 + bob, 1, 4, C.cream)
      rect(x + 2, y - 6 + bob, 1, 4, C.cream)

      // Arms
      rect(x - 10, y + 9 + bob, 3, 11, C.coatWhite)
      rect(x + 7, y + 9 + bob, 3, 11, C.coatWhite)
      // Hands (skin)
      rect(x - 10, y + 19 + bob, 3, 3, C.skin)
      rect(x + 7, y + 19 + bob, 3, 3, C.skin)

      // Tasting spoon / knife (alternating animation)
      if (chop) {
        // Tasting spoon
        rect(x + 10, y + 12 + bob, 2, 10, C.steel)
        rect(x + 9, y + 10 + bob, 4, 3, C.chrome)
      } else {
        // Chef knife
        rect(x + 10, y + 14 + bob, 1, 8, C.steel)
        rect(x + 10, y + 12 + bob, 2, 3, C.woodLight) // handle
      }

      // Thought bubble when processing (improved with particle glow)
      if (tick % 180 < 60) {
        // Small thought dots
        ctx.fillStyle = 'rgba(249,230,207,0.6)'
        ctx.beginPath()
        ctx.arc(x + 14, y - 8 + bob, 2, 0, Math.PI * 2)
        ctx.fill()
        ctx.fillStyle = 'rgba(249,230,207,0.75)'
        ctx.beginPath()
        ctx.arc(x + 18, y - 14 + bob, 3, 0, Math.PI * 2)
        ctx.fill()
        // Thought cloud (try 9-slice panel, fallback to rounded rect)
        if (!draw9Slice('panelWhite', x + 12, y - 30 + bob, 34, 16)) {
          roundRect(x + 12, y - 30 + bob, 34, 16, 4, 'rgba(249,230,207,0.92)')
        }
        text('...', x + 29, y - 20 + bob, C.steelDark, 9, 'center')
      }
    } else {
      // Chef absent - empty station with hanging apron
      rect(x, y, 2, 8, C.steelDark)
      rect(x - 4, y + 8, 10, 14, C.peach) // apron
      rect(x - 3, y + 8, 8, 2, C.cream) // apron top fold
      // "CHEF OUT" sign (use red panel if available)
      if (!draw9Slice('panelRed', x - 18, y + 26, 40, 16)) {
        roundRect(x - 18, y + 26, 40, 16, 2, C.crimson)
      }
      text('CHEF OUT', x + 2, y + 38, C.cream, 8, 'center')
    }

    text('Ollama', x, y + 46, up ? '#8a8' : '#a66', 8, 'center')

    registerClickRegion(
      x - 16,
      y - 10,
      50,
      60,
      () => {
        const models = up ? 'qwen3:4b, qwen3:8b, qwen3:30b' : 'N/A'
        tooltipData = {
          title: 'Ollama (Head Chef)',
          color: up ? C.statusGreen : C.statusRed,
          lines: [
            up ? 'ONLINE' : 'OFFLINE',
            'Models: ' + models,
            'Local inference only',
            'Private data stays local',
          ],
        }
      },
      'Head Chef'
    )
  }

  // ── DISH PIT (Git) ──
  function drawDishPit(px, py, pw, ph) {
    const infr = infra()
    const gitInfo = infr.git || {}
    const dirty = gitInfo.dirtyFiles || 0
    const branch = gitInfo.branch || '?'

    // Dish machine body
    roundRect(px, py, pw, ph * 0.6, 3, C.steel)
    roundRect(px + 2, py + 2, pw - 4, ph * 0.6 - 4, 2, '#555')

    // Machine door
    rect(px + 4, py + 6, pw - 8, ph * 0.35, '#444')

    // Status light on machine
    const isClean = dirty === 0
    rect(px + pw - 10, py + 4, 6, 6, isClean ? C.statusGreen : C.statusYellow)

    // Steam when running (clean) - use Kenney smoke particles
    if (isClean && tick % 16 < 8) {
      const steamY = py - 6 - (tick % 20) * 0.5
      if (!drawParticle('smoke_03', px + pw / 2 - 4, steamY, 10, 0.12)) {
        ctx.fillStyle = 'rgba(199,207,221,0.15)'
        ctx.fillRect(px + pw / 2, steamY + 2, 4, 6)
      }
    }

    // Dirty dishes pile (based on dirty file count)
    const pileY = py + ph * 0.62
    if (dirty > 0) {
      const pileH = Math.min(dirty * 3, ph * 0.3)
      // Bus tub
      rect(px + 2, pileY, pw - 4, pileH, '#666')
      // Dish stack
      for (let d = 0; d < Math.min(dirty, 8); d++) {
        rect(px + 4 + (d % 3) * 6, pileY + 2 + d * 2, 12, 3, '#aaa')
      }
      text(dirty + '', px + pw / 2, pileY + pileH + 10, C.statusYellow, 9, 'center')
    }

    text('DISH PIT', px + pw / 2, py + ph - 8, '#888', 8, 'center')
    text(branch, px + pw / 2, py + ph + 2, '#6a6', 7, 'center')

    registerClickRegion(
      px,
      py,
      pw,
      ph,
      () => {
        tooltipData = {
          title: 'Git (Dish Pit)',
          color: isClean ? C.statusGreen : C.statusYellow,
          lines: [
            'Branch: ' + branch,
            'Dirty files: ' + dirty,
            isClean ? 'Clean!' : dirty + ' files uncommitted',
          ],
        }
      },
      'Dish Pit'
    )
  }

  // ── DEEP FRYER (Stripe) ──
  function drawDeepFryer(fx, fy) {
    const w = 28,
      h = 36
    // Fryer body (ENDESGA steel)
    roundRect(fx, fy, w, h, 2, C.steel)
    rect(fx + 3, fy + 3, w - 6, h * 0.6, C.gold) // golden oil

    // Oil shimmer animation (enhanced with particle bubbles)
    if (tick % 6 < 3) {
      ctx.fillStyle = 'rgba(255,235,87,0.25)' // ENDESGA bright yellow
      ctx.fillRect(fx + 5, fy + 5 + Math.sin(tick * 0.1) * 2, w - 10, 2)
    }
    // Oil bubble particles
    if (tick % 10 < 5) {
      const bubbleX = fx + 6 + Math.sin(tick * 0.2) * (w - 14)
      const bubbleY = fy + 6 + Math.cos(tick * 0.15) * 4
      drawParticle('circle_01', bubbleX, bubbleY, 4, 0.15)
    }

    // Basket handle (chrome)
    rect(fx + w / 2 - 1, fy - 4, 3, 8, C.chrome)
    // Basket wire
    rect(fx + 4, fy + h * 0.5, w - 8, 1, C.chrome)

    // $ sign on basket (ENDESGA gold)
    text('$', fx + w / 2, fy + h * 0.4, C.amber, 10, 'center')

    text('FRYER', fx + w / 2, fy + h + 10, C.steelDark, 7, 'center')
    text('Stripe', fx + w / 2, fy + h + 19, C.gold, 7, 'center')

    registerClickRegion(
      fx,
      fy,
      w,
      h + 20,
      () => {
        tooltipData = {
          title: 'Stripe (Deep Fryer)',
          color: C.foodGold,
          lines: [
            'Payment processing',
            'Webhooks, checkout sessions',
            'Handles the hot oil of money',
          ],
        }
      },
      'Fryer'
    )
  }

  // ── TICKET PRINTER (HTTP Requests) ──
  function drawTicketPrinter(tx, ty) {
    const w = 20,
      h = 24
    rect(tx, ty, w, h, '#ddd') // printer body
    rect(tx + 2, ty + 2, w - 4, h - 4, '#ccc')

    // Paper coming out
    const fileChanges = bizData.activity.recentFileChanges || 0
    const busy = fileChanges > 5
    const paperLen = busy ? 18 : 8
    rect(tx + 4, ty - paperLen, w - 8, paperLen, '#fff')
    // Text on paper
    for (let l = 0; l < Math.min(paperLen / 4, 4); l++) {
      rect(tx + 5, ty - paperLen + 2 + l * 4, w - 12, 1, '#aaa')
    }
    // Status light
    rect(tx + w - 4, ty + 2, 3, 3, busy ? C.statusYellow : C.statusGreen)

    text('TICKETS', tx + w / 2, ty + h + 8, '#888', 7, 'center')

    registerClickRegion(
      tx,
      ty - paperLen,
      w,
      h + paperLen + 10,
      () => {
        tooltipData = {
          title: 'HTTP Requests (Ticket Printer)',
          color: busy ? C.statusYellow : C.statusGreen,
          lines: [
            'Recent file changes: ' + fileChanges,
            'Commits: ' + (bizData.activity.recentCommits || 0),
            busy ? 'Busy!' : 'Normal',
          ],
        }
      },
      'Tickets'
    )
  }

  // ── DELIVERY DOOR (OpenClaw) ──
  function drawDeliveryDoor(dx, dy) {
    const w = 24,
      h = 30
    const ocUp = isUp('openclawGateway')

    // Door frame
    rect(dx, dy, w, h, '#555')
    rect(dx + 2, dy + 2, w - 4, h - 4, ocUp ? '#663' : '#433')

    // Door handle
    rect(dx + w - 6, dy + h / 2, 4, 4, C.chrome)

    // Light above door
    rect(dx + w / 2 - 3, dy - 4, 6, 4, ocUp ? C.statusGreen : C.statusRed)

    // If open, show hand truck
    if (ocUp) {
      rect(dx + 8, dy + h - 10, 3, 10, '#888')
      rect(dx + 6, dy + h - 12, 7, 3, '#888')
    }

    text('DOCK', dx + w / 2, dy + h + 8, '#777', 7, 'center')
    text('OpenClaw', dx + w / 2, dy + h + 17, ocUp ? '#8a8' : '#a66', 6, 'center')

    registerClickRegion(
      dx,
      dy,
      w,
      h + 18,
      () => {
        tooltipData = {
          title: 'OpenClaw Pi Gateway',
          color: ocUp ? C.statusGreen : C.statusRed,
          lines: [
            ocUp ? 'Connected' : 'Unreachable',
            '10.0.0.177:18789',
            'Raspberry Pi, always-on',
          ],
        }
      },
      'Delivery Door'
    )
  }

  // ── PREP STATION (TypeScript) ──
  function drawPrepStation(px, py) {
    const w = 32,
      h = 18
    // Prep table
    rect(px, py, w, h, C.steel)
    rect(px + 1, py + 1, w - 2, h - 2, '#777')

    // Cutting board
    rect(px + 3, py + 3, 12, 8, C.woodLight)

    // Containers (mise en place)
    rect(px + 18, py + 2, 5, 6, '#468')
    rect(px + 24, py + 2, 5, 6, '#486')

    text('PREP', px + w / 2, py + h + 8, '#888', 7, 'center')
    text('TypeScript', px + w / 2, py + h + 17, '#4a8', 6, 'center')

    registerClickRegion(
      px,
      py,
      w,
      h + 18,
      () => {
        tooltipData = {
          title: 'TypeScript (Prep Station)',
          color: '#4a8',
          lines: [
            'Type checking = mise en place',
            'tsc --noEmit --skipLibCheck',
            'Everything prepped before service',
          ],
        }
      },
      'Prep'
    )
  }

  // ── EXPO CHEF (Mission Control - the orchestrator at the pass) ──
  function drawExpoChef(x, y) {
    // Mission Control is always "running" if this page is visible
    const up = true
    const bob = Math.sin(tick * 0.035 + 1) * 1.5

    if (up) {
      // Shadow
      ctx.fillStyle = 'rgba(0,0,0,0.2)'
      ctx.beginPath()
      ctx.ellipse(x, y + 28 + bob, 8, 2.5, 0, 0, Math.PI * 2)
      ctx.fill()

      // Shoes
      rect(x - 4, y + 24 + bob, 3, 3, C.wine)
      rect(x + 1, y + 24 + bob, 3, 3, C.wine)
      // Legs (black pants)
      rect(x - 3, y + 20 + bob, 3, 5, '#1b1b1b')
      rect(x + 1, y + 20 + bob, 3, 5, '#1b1b1b')
      // Body (BLACK chef coat - expo wears black)
      rect(x - 6, y + 8 + bob, 12, 12, '#272727')
      // Apron (dark gray)
      rect(x - 4, y + 10 + bob, 8, 10, '#3d3d3d')
      // Head
      rect(x - 3, y + 2 + bob, 6, 7, C.skin)
      // Eyes
      rect(x - 1, y + 4 + bob, 1, 2, '#131313')
      rect(x + 2, y + 4 + bob, 1, 2, '#131313')
      // Bandana (not a toque - expo chef look)
      rect(x - 4, y + bob, 8, 3, C.crimson)
      rect(x - 3, y - 1 + bob, 6, 2, C.crimson)
      // Arms
      rect(x - 8, y + 9 + bob, 2, 9, '#272727')
      rect(x + 6, y + 9 + bob, 2, 9, '#272727')
      // Hands
      rect(x - 8, y + 17 + bob, 2, 2, C.skin)
      rect(x + 6, y + 17 + bob, 2, 2, C.skin)
      // Towel over shoulder (expo trademark)
      rect(x + 5, y + 8 + bob, 3, 6, C.cream)
      // Ticket in hand (reading orders)
      if (tick % 200 < 100) {
        rect(x - 10, y + 12 + bob, 6, 8, '#fff')
        for (let tl = 0; tl < 3; tl++) rect(x - 9, y + 13 + tl * 2 + bob, 4, 1, '#aaa')
      }
    }

    text('EXPO', x, y + 32 + bob, C.chrome, 7, 'center')

    registerClickRegion(
      x - 10,
      y - 4,
      24,
      40,
      () => {
        tooltipData = {
          title: 'Expo Chef (Mission Control)',
          color: C.crimson,
          lines: [
            'Orchestrates service',
            'Reads tickets, calls orders',
            'Quality gate before guests',
          ],
        }
      },
      'Expo Chef'
    )
  }

  // drawLineCook removed: servers are equipment (burners), not chefs

  // ── BIG EXPO CHEF (doubled-size, at the pass) ──
  function drawBigExpo(x, y) {
    const s = 3
    const up = true // MC always running if page is visible
    const bob = Math.sin(tick * 0.035 + 1) * 2

    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.3)'
    ctx.beginPath()
    ctx.ellipse(x, y + 20 * s + bob, 10 * s, 3 * s, 0, 0, Math.PI * 2)
    ctx.fill()

    // Shoes
    rect(x - 4 * s, y + 17 * s + bob, 3 * s, 3 * s, C.wine)
    rect(x + 1 * s, y + 17 * s + bob, 3 * s, 3 * s, C.wine)

    // Legs (black pants)
    rect(x - 3 * s, y + 13 * s + bob, 3 * s, 5 * s, '#1b1b1b')
    rect(x + 1 * s, y + 13 * s + bob, 3 * s, 5 * s, '#1b1b1b')

    // Body (BLACK chef coat)
    rect(x - 6 * s, y + 4 * s + bob, 12 * s, 10 * s, '#272727')

    // Apron (dark gray)
    rect(x - 4 * s, y + 5 * s + bob, 8 * s, 9 * s, '#3d3d3d')

    // Head
    rect(x - 3 * s, y - 1 * s + bob, 6 * s, 6 * s, C.skin)

    // Eyes
    rect(x - 1 * s, y + 1 * s + bob, 1 * s, 2 * s, '#131313')
    rect(x + 1 * s, y + 1 * s + bob, 1 * s, 2 * s, '#131313')

    // Bandana (red, not a toque)
    rect(x - 4 * s, y - 3 * s + bob, 8 * s, 3 * s, C.crimson)

    // Arms
    rect(x - 8 * s, y + 5 * s + bob, 2 * s, 8 * s, '#272727')
    rect(x + 6 * s, y + 5 * s + bob, 2 * s, 8 * s, '#272727')

    // Hands
    rect(x - 8 * s, y + 12 * s + bob, 2 * s, 2 * s, C.skin)
    rect(x + 6 * s, y + 12 * s + bob, 2 * s, 2 * s, C.skin)

    // Towel over shoulder (expo signature)
    rect(x + 5 * s, y + 4 * s + bob, 3 * s, 5 * s, C.cream)

    // Ticket in hand
    if (tick % 200 < 100) {
      rect(x - 10 * s, y + 8 * s + bob, 5 * s, 7 * s, '#fff')
      for (let tl = 0; tl < 3; tl++)
        rect(x - 9 * s, y + 9 * s + tl * 2 * s + bob, 3 * s, 1 * s, '#aaa')
    }

    // Name plate
    rect(x - 14 * s, y + 22 * s, 28 * s, 7 * s, 'rgba(0,0,0,0.6)')
    text('EXPO', x, y + 27 * s, C.crimson, 10, 'center')

    registerClickRegion(
      x - 10 * s,
      y - 4 * s,
      20 * s,
      28 * s,
      () => {
        tooltipData = {
          title: 'Expo Chef (Mission Control)',
          color: C.crimson,
          lines: [
            'Orchestrates service',
            'Reads tickets, calls orders',
            'Quality gate before guests',
          ],
        }
      },
      'Expo Chef'
    )
  }

  // drawBigCook removed: servers are equipment (burners), not chefs

  // ── OPENCLAW BRIGADE (5 agents near the delivery door - bigger, readable) ──
  function drawOpenClawBrigade(bx, by, online) {
    // Brigade title (bigger)
    text('OPENCLAW BRIGADE', bx + 60, by - 12, online ? '#8a8' : '#664', 11, 'center')

    const agents = [
      { name: 'main', color: C.crimson, role: 'Opus', icon: '\u2605' },
      { name: 'sonnet', color: C.skyBlue, role: 'Sonnet', icon: '\u270E' },
      { name: 'build', color: C.lime, role: 'Build', icon: '\u2713' },
      { name: 'qa', color: C.gold, role: 'QA', icon: '?' },
      { name: 'runner', color: C.salmon, role: 'Run', icon: '>' },
    ]

    agents.forEach((agent, i) => {
      const ax = bx + i * 32
      const ay = by
      const working = online && (tick + i * 60) % 300 < 200
      const s = 2 // scale (was 1, now 2x)
      const bob = working ? Math.sin(tick * 0.06 + i * 1.2) * 1.5 : 0

      // Shadow
      ctx.fillStyle = 'rgba(0,0,0,0.25)'
      ctx.beginPath()
      ctx.ellipse(ax, ay + 12 * s + bob, 4 * s, 1.5 * s, 0, 0, Math.PI * 2)
      ctx.fill()

      // Legs
      rect(ax - 2 * s, ay + 9 * s + bob, 2 * s, 3 * s, '#333')
      rect(ax + 1 * s, ay + 9 * s + bob, 2 * s, 3 * s, '#333')
      // Body
      rect(ax - 3 * s, ay + 3 * s + bob, 7 * s, 7 * s, online ? agent.color : '#444')
      // Head
      rect(ax - 2 * s, ay - 1 * s + bob, 5 * s, 4 * s, online ? C.skin : '#666')
      // Eyes
      rect(ax - 1 * s, ay + bob, 1 * s, 1 * s, '#131313')
      rect(ax + 1 * s, ay + bob, 1 * s, 1 * s, '#131313')
      // Hat
      if (agent.name === 'main') {
        rect(ax - 2 * s, ay - 4 * s + bob, 5 * s, 3 * s, '#fff')
        rect(ax - 1 * s, ay - 6 * s + bob, 3 * s, 2 * s, '#fff')
      } else {
        rect(ax - 3 * s, ay - 2 * s + bob, 7 * s, 1.5 * s, agent.color)
      }
      // Arms
      rect(ax - 5 * s, ay + 4 * s + bob, 2 * s, 5 * s, online ? agent.color : '#444')
      rect(ax + 4 * s, ay + 4 * s + bob, 2 * s, 5 * s, online ? agent.color : '#444')

      // Activity indicator
      if (working && online) {
        if (tick % 20 < 10) rect(ax - 1 * s, ay - 7 * s + bob, 2 * s, 2 * s, C.flameYellow)
      } else if (!online) {
        text('x', ax, ay + 2 + bob, '#a66', 8, 'center')
      }

      // Name below (bigger)
      text(agent.name, ax, ay + 14 * s, online ? agent.color : '#555', 9, 'center')
    })

    // Click region for whole brigade
    registerClickRegion(
      bx - 8,
      by - 14,
      170,
      50,
      () => {
        tooltipData = {
          title: 'OpenClaw Brigade (Pi)',
          color: online ? C.statusGreen : C.statusRed,
          lines: [
            online ? 'Gateway: ONLINE' : 'Gateway: OFFLINE',
            'main (Opus 4.6): Orchestrator',
            'sonnet (Sonnet 4.6): Senior engineer',
            'build (Groq 70B): Build validator',
            'qa (Groq 70B): Quality assurance',
            'runner (Groq 8B): Task runner',
          ],
        }
      },
      'OpenClaw Brigade'
    )
  }

  // ── AI DISPATCH TICKET WHEEL (routes tasks to right model) ──
  function drawDispatchWheel(wx, wy) {
    const r = 12
    // Wheel base (circular ticket carousel)
    ctx.strokeStyle = C.steel
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.arc(wx, wy, r, 0, Math.PI * 2)
    ctx.stroke()

    // Center hub
    rect(wx - 3, wy - 3, 6, 6, C.steelDark)

    // Spinning tickets (4 slots, rotating)
    const angle = tick * 0.02
    for (let i = 0; i < 4; i++) {
      const a = angle + (i * Math.PI) / 2
      const tx = wx + Math.cos(a) * (r - 4)
      const ty = wy + Math.sin(a) * (r - 4)
      rect(tx - 2, ty - 1, 4, 3, '#fff')
    }

    // Label
    text('DISPATCH', wx, wy + r + 8, '#888', 6, 'center')
    text('Router', wx, wy + r + 16, C.teal, 5, 'center')

    registerClickRegion(
      wx - r,
      wy - r,
      r * 2,
      r * 2 + 18,
      () => {
        tooltipData = {
          title: 'AI Dispatch (Ticket Wheel)',
          color: C.teal,
          lines: [
            'Routes tasks to the right model',
            'Privacy gate: PII stays local (Ollama)',
            'Cloud-safe tasks go to cheapest provider',
            'Classifier + cost tracker + fallback chain',
          ],
        }
      },
      'Dispatch'
    )
  }

  // ── CLAUDE CODE PORTRAIT (framed photo on wall - the boss watching) ──
  function drawClaudeCodePortrait(px, py) {
    const w = 20,
      h = 24
    // Frame (gold, ornate)
    rect(px - 2, py - 2, w + 4, h + 4, C.gold)
    rect(px - 1, py - 1, w + 2, h + 2, C.woodDark)
    // Photo background
    rect(px, py, w, h, '#1a1932')
    // Simple face silhouette (glowing eyes watching the kitchen)
    rect(px + 6, py + 6, 8, 10, '#2a2f4e') // head shape
    // Glowing eyes (subtle pulse)
    const eyeGlow = 0.6 + Math.sin(tick * 0.03) * 0.3
    ctx.fillStyle = 'rgba(90,197,79,' + eyeGlow + ')'
    ctx.fillRect(px + 8, py + 10, 2, 2)
    ctx.fillRect(px + 12, py + 10, 2, 2)
    // Nameplate under portrait
    rect(px - 1, py + h + 2, w + 2, 8, C.gold)
    text('CC', px + w / 2, py + h + 9, '#1b1b1b', 6, 'center')

    registerClickRegion(
      px - 2,
      py - 2,
      w + 4,
      h + 14,
      () => {
        tooltipData = {
          title: 'Claude Code (Lead Engineer)',
          color: C.statusGreen,
          lines: [
            'Rank 1. The boss of all code.',
            'Anthropic subscription (OAuth)',
            'Reviews everything. Decides everything.',
            'The one watching right now.',
          ],
        }
      },
      'Claude Code'
    )
  }

  // ═══════════════════════════════════════════════════════════
  // THE PASS - Production boundary
  // ═══════════════════════════════════════════════════════════
  function drawPassZone() {
    const z = Z.pass
    // Pass shelf (stainless steel)
    rect(z.x, z.y, z.w, z.h, C.steel)
    rect(z.x, z.y + 1, z.w, z.h - 2, '#666')

    // Heat lamps (amber glow) - Vercel/CDN with Kenney light particles
    const prodUp = isUp('production')
    const lampCount = 5
    for (let i = 0; i < lampCount; i++) {
      const lx = z.x + (z.w / lampCount) * i + z.w / lampCount / 2
      // Lamp housing (ENDESGA steel)
      rect(lx - 6, z.y - 4, 12, 5, C.steelDark)
      // Glow (try Kenney light particle, fallback to canvas glow)
      if (prodUp) {
        const glowAlpha = 0.25 + Math.sin(tick * 0.02 + i) * 0.08
        if (!drawParticle('light_01', lx - 10, z.y - 2, 20, glowAlpha)) {
          ctx.fillStyle = 'rgba(255,162,20,' + glowAlpha + ')'
          ctx.beginPath()
          ctx.arc(lx, z.y + z.h * 0.4, 14, 0, Math.PI * 2)
          ctx.fill()
        }
      }
      // Bulb (ENDESGA amber)
      rect(lx - 2, z.y, 4, 4, prodUp ? C.heatLamp : C.steelDark)
    }

    // Plates on pass with REAL food sprites (Kenney CC0)
    const activeEvents = bizData.eventsTotal || 0
    const plateCount = Math.min(activeEvents, 8)
    // Different food tile indices for variety on each plate
    const plateFoods = [0, 2, 5, 7, 19, 33, 35, 66] // apple, cherry, orange, strawberry, tomato, cheese, meat, pizza
    for (let p = 0; p < plateCount; p++) {
      const plateX = z.x + 20 + (p * (z.w - 40)) / 8
      const plateY = z.y + z.h * 0.3
      // Plate (white circle-ish)
      rect(plateX, plateY, 16, 5, C.cream)
      rect(plateX + 1, plateY + 1, 14, 3, '#f9e6cf')
      // Real food tile on plate
      const tileIdx = plateFoods[p % plateFoods.length]
      if (!drawFoodTile(tileIdx, plateX + 1, plateY - 12, 0.75)) {
        // Fallback procedural food
        rect(plateX + 4, plateY - 3, 6, 3, C.foodGreen)
      }
      // Heat lamp glow on plate
      if (prodUp) {
        ctx.fillStyle = 'rgba(255,176,64,0.1)'
        ctx.fillRect(plateX - 1, plateY - 14, 18, 20)
      }
    }

    // ── EXPO CHEF (Mission Control) at the pass ──
    drawBigExpo(z.x + 80, z.y - 75)
    drawSpeechBubble(z.x + 80, z.y - 90, getExpoBubble(), C.crimson)

    // ── Activity ticker (scrolling recent file changes) ──
    if (activityFeed.length > 0) {
      activityTickerOffset = (activityTickerOffset + 0.5) % (activityFeed.length * 200)
      const tickerY = z.y + z.h * 0.5
      // Ticker background strip
      ctx.save()
      ctx.beginPath()
      ctx.rect(z.x + 120, tickerY - 6, z.w - 240, 14)
      ctx.clip()
      for (let i = 0; i < activityFeed.length; i++) {
        const item = activityFeed[i]
        const tx = z.x + z.w - activityTickerOffset + i * 200
        const icon = item.type === 'rename' ? '>' : '*'
        text(icon + ' ' + item.file, tx, tickerY + 4, C.chrome, 7, 'left')
      }
      ctx.restore()
    }

    // Pass label
    text('THE PASS', z.w / 2, z.y + z.h - 3, '#aaa', 8, 'center')
    if (prodUp) {
      text('app.cheflowhq.com', z.w * 0.85, z.y + z.h - 3, C.statusGreen, 7, 'center')
    } else {
      text('PRODUCTION DOWN', z.w * 0.85, z.y + z.h - 3, C.statusRed, 7, 'center')
    }

    registerClickRegion(
      z.x,
      z.y,
      z.w,
      z.h,
      () => {
        tooltipData = {
          title: 'The Pass (Production)',
          color: prodUp ? C.statusGreen : C.statusRed,
          lines: [
            prodUp ? 'LIVE' : 'DOWN',
            'app.cheflowhq.com',
            'Vercel, CDN, Edge',
            plateCount + ' plates on pass',
          ],
        }
      },
      'The Pass'
    )
  }

  // ═══════════════════════════════════════════════════════════
  // DINING ROOM - Tables, host stand, bar, register
  // ═══════════════════════════════════════════════════════════
  function drawDiningZone() {
    const z = Z.dining
    // Dining room floor (warm wood)
    rect(z.x, z.y, z.w, z.h, C.diningFloor)
    // Wood grain pattern
    ctx.strokeStyle = 'rgba(0,0,0,0.05)'
    for (let gx = z.x; gx < z.x + z.w; gx += 30) {
      ctx.beginPath()
      ctx.moveTo(gx, z.y)
      ctx.lineTo(gx, z.y + z.h)
      ctx.stroke()
    }
    // Wall strip at top
    rect(z.x, z.y, z.w, 4, C.diningWall)

    // ══════════════════════════════════════════════════
    // OPENCLAW COMMAND CENTER (the MAIN event - 85% of dining zone)
    // 5 HUGE agents with live activity feeds beside each
    // ══════════════════════════════════════════════════
    drawOpenClawCommandCenter(z.x + 4, z.y + 8, z.w * 0.85, z.h - 16)

    // ── Compact sidebar items (right edge) ──
    const sideX = z.x + z.w * 0.87
    drawHostStand(sideX, z.y + 10)
    drawCashRegister(sideX, z.y + z.h * 0.35)
    drawBar(sideX, z.y + z.h * 0.65, z.w * 0.12, z.h * 0.3)

    // ── FRONT DOOR (Google OAuth) ──
    drawFrontDoor(z.x + z.w - 24, z.y + z.h * 0.4)

    // ── Smoke Detector (Sentry) + Camera (PostHog) on ceiling ──
    // Smoke detector
    rect(z.w * 0.3, z.y + 2, 8, 4, '#ddd')
    rect(z.w * 0.3 + 3, z.y + 1, 2, 2, C.statusGreen) // LED
    // Camera
    rect(z.w * 0.5, z.y + 1, 10, 5, '#333')
    rect(z.w * 0.5 + 8, z.y + 2, 4, 3, '#222') // lens
    if (tick % 60 < 30) rect(z.w * 0.5 + 9, z.y + 3, 2, 1, '#f00') // recording LED

    registerClickRegion(
      z.w * 0.3,
      z.y,
      12,
      8,
      () => {
        tooltipData = {
          title: 'Sentry (Smoke Detector)',
          color: C.statusGreen,
          lines: ['Error tracking', 'Catches problems before fires'],
        }
      },
      'Sentry'
    )
    registerClickRegion(
      z.w * 0.5,
      z.y,
      14,
      8,
      () => {
        tooltipData = {
          title: 'PostHog (Camera)',
          color: '#888',
          lines: ['Product analytics', 'Watching everything, recording'],
        }
      },
      'PostHog'
    )

    // Remy and Gustav removed: they're app features, not infrastructure agents.
    // Only agents get chef characters in the pixel kitchen.

    // ── GMAIL MAILBOX (wall-mounted mail slot) ──
    drawGmailMailbox(z.x + z.w - 50, z.y + z.h * 0.15)

    // ── REDIS SPEED RAIL (under the bar) ──
    drawRedisSpeedRail(z.x + z.w * 0.78, z.y + z.h - 16, z.w * 0.2)

    // ── CLOUDINARY PHOTO WALL (framed photos on dining wall) ──
    drawPhotoWall(z.x + z.w * 0.38, z.y + 2)
  }

  // ── HOST STAND (Inquiries) ──
  function drawHostStand(hx, hy) {
    const openInq = bizData.inquiries.open || 0
    const overdue = bizData.inquiries.overdue || 0

    // Podium
    rect(hx, hy, 22, 30, C.woodDark)
    rect(hx + 2, hy + 2, 18, 12, C.woodLight)

    // Reservation book
    rect(hx + 4, hy + 4, 14, 8, '#ddd')
    rect(hx + 5, hy + 5, 12, 6, '#fff')
    // Lines in book
    for (let l = 0; l < 3; l++) rect(hx + 6, hy + 6 + l * 2, 10, 1, '#aaa')

    // People waiting (inquiry count) - enhanced with ENDESGA colors
    const guestCount = Math.min(openInq, 5)
    const guestColors = [C.crimson, C.darkGreen, C.navy, C.rose, C.teal]
    for (let g = 0; g < guestCount; g++) {
      const gx = hx + 28 + g * 10
      const gy = hy + 4
      // Guest body (shirt color)
      rect(gx, gy + 6, 6, 10, guestColors[g])
      // Guest head
      rect(gx + 1, gy, 4, 5, C.skin)
      // Hair (varied dark tones)
      rect(gx + 1, gy, 4, 2, ['#391f21', '#1b1b1b', '#5d2c28', '#272727', '#1a1932'][g])
      // Eyes
      rect(gx + 1, gy + 3, 1, 1, '#131313')
      rect(gx + 3, gy + 3, 1, 1, '#131313')
    }

    // Overdue badge
    if (overdue > 0) {
      roundRect(hx, hy + 32, 22, 12, 3, C.statusRed)
      text(overdue + ' late', hx + 11, hy + 42, '#fff', 7, 'center')
    }

    text('HOST', hx + 11, hy + (overdue > 0 ? 50 : 46), '#aaa', 7, 'center')
    text(openInq + ' waiting', hx + 11, hy + (overdue > 0 ? 58 : 54), '#888', 6, 'center')

    // Phone (Gmail sync)
    rect(hx + 24, hy + 22, 8, 12, '#333')
    rect(hx + 25, hy + 23, 6, 10, '#444')

    registerClickRegion(
      hx,
      hy,
      60,
      60,
      () => {
        tooltipData = {
          title: 'Host Stand (Inquiries)',
          color: overdue > 0 ? C.statusRed : C.statusGreen,
          lines: ['Open: ' + openInq, 'Overdue: ' + overdue, 'Phone = Gmail GOLDMINE sync'],
        }
      },
      'Host Stand'
    )
  }

  // ── DINING TABLES (Events) ──
  function drawDiningTables(tx, ty, tw, th) {
    const events = bizData.events || {}
    const total = bizData.eventsTotal || 0

    // Draw table grid
    const cols = 4,
      rows = 3
    const tableW = tw / cols - 4
    const tableH = th / rows - 4

    let tableIdx = 0
    const states = [
      'draft',
      'proposed',
      'accepted',
      'paid',
      'confirmed',
      'in_progress',
      'completed',
    ]
    const stateColors = {
      draft: C.steelDark,
      proposed: C.gold,
      accepted: C.darkGreen,
      paid: C.teal,
      confirmed: C.navy,
      in_progress: C.amber,
      completed: C.statusGreen,
    }

    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        if (tableIdx >= 12) break
        const x = tx + col * (tw / cols) + 2
        const y = ty + row * (th / rows) + 2

        // Determine table state
        let tableState = null
        let accumulated = 0
        for (const st of states) {
          accumulated += events[st] || 0
          if (tableIdx < accumulated) {
            tableState = st
            break
          }
        }

        if (tableState) {
          // Set table with tablecloth (ENDESGA colors)
          rect(x, y, tableW, tableH, stateColors[tableState] || C.steelDark)
          rect(x + 1, y + 1, tableW - 2, tableH - 2, C.wine)
          // Candle (with flicker)
          rect(x + tableW / 2 - 1, y + 2, 2, 4, C.cream)
          const candleFlicker = Math.sin(tick * 0.2 + tableIdx) > 0
          rect(x + tableW / 2 - 1, y + 1, 2, 2, candleFlicker ? C.flameYellow : C.flameGlow)
          // Candle glow
          if (candleFlicker) {
            ctx.fillStyle = 'rgba(255,200,37,0.06)'
            ctx.beginPath()
            ctx.arc(x + tableW / 2, y + 2, 6, 0, Math.PI * 2)
            ctx.fill()
          }
          // Place settings (ENDESGA silver)
          rect(x + 3, y + tableH - 5, 4, 2, C.chrome)
          rect(x + tableW - 7, y + tableH - 5, 4, 2, C.chrome)
          // Food on in_progress tables (real sprites!)
          if (tableState === 'in_progress' && tableW >= 16) {
            const foodIdx = [0, 5, 19, 35, 66][tableIdx % 5]
            drawFoodTile(foodIdx, x + tableW / 2 - 5, y + 4, 0.5)
          }
          // State label
          text(
            tableState.substring(0, 4),
            x + tableW / 2,
            y + tableH + 6,
            stateColors[tableState],
            6,
            'center'
          )
        } else {
          // Empty table (ENDESGA dark wood)
          rect(x, y, tableW, tableH, C.diningWall)
          rect(x + 1, y + 1, tableW - 2, tableH - 2, C.wine)
        }
        tableIdx++
      }
    }

    text(total + ' events', tx + tw / 2, ty + th + 8, '#aaa', 8, 'center')

    registerClickRegion(
      tx,
      ty,
      tw,
      th + 12,
      () => {
        const stateList = states.map((s) => s + ': ' + (events[s] || 0)).join(', ')
        tooltipData = {
          title: 'Dining Tables (Events)',
          color: '#4a6',
          lines: ['Total: ' + total, stateList],
        }
      },
      'Tables'
    )
  }

  // ── CASH REGISTER (Revenue) ──
  function drawCashRegister(rx, ry) {
    const rev = bizData.revenue || {}
    const dollars = parseDollars(bizData)
    const profit = rev.totalProfit
      ? parseFloat(String(rev.totalProfit).replace(/[$,]/g, '')) || 0
      : 0

    // Register body
    rect(rx, ry, 36, 28, '#444')
    roundRect(rx + 1, ry + 1, 34, 14, 2, '#111')

    // Screen (green digits on black)
    const displayStr = '$' + Math.floor(dollars).toLocaleString()
    text(displayStr, rx + 18, ry + 12, C.screenGlow, 10, 'center')

    // Keys
    for (let kr = 0; kr < 2; kr++) {
      for (let kc = 0; kc < 4; kc++) {
        rect(rx + 4 + kc * 8, ry + 17 + kr * 5, 6, 4, '#666')
      }
    }

    // Cash drawer
    rect(rx, ry + 28, 36, 6, '#555')
    rect(rx + 2, ry + 29, 32, 4, '#444')

    text('REVENUE', rx + 18, ry + 42, '#aaa', 7, 'center')

    registerClickRegion(
      rx,
      ry,
      36,
      44,
      () => {
        tooltipData = {
          title: 'Cash Register (Revenue)',
          color: C.screenGlow,
          lines: [
            'Revenue: $' + Math.floor(dollars).toLocaleString(),
            'Profit: $' + Math.floor(profit).toLocaleString(),
            'Clients: ' + (bizData.clients.total || 0),
          ],
        }
      },
      'Register'
    )
  }

  // ── BAR (External Services) ──
  function drawBar(bx, by, bw, bh) {
    // Bar counter
    rect(bx, by, bw, bh, C.woodDark)
    rect(bx + 2, by + 2, bw - 4, bh - 4, '#2a1a10')
    // Bar top
    rect(bx, by, bw, 4, C.woodLight)

    // Cocktail shaker (Resend)
    rect(bx + 4, by + 8, 6, 12, C.steel)
    rect(bx + 5, by + 6, 4, 3, C.chrome) // cap
    text('Email', bx + 7, by + 24, '#888', 6, 'center')

    // Bottles (various services)
    const bottles = [
      { color: '#a44', label: 'Tw' }, // Twilio
      { color: '#4a4', label: 'Ps' }, // PostHog
      { color: '#44a', label: 'Se' }, // Sentry
    ]
    bottles.forEach((b, i) => {
      const btlX = bx + 14 + i * 10
      rect(btlX, by + 6, 6, 16, b.color)
      rect(btlX + 1, by + 4, 4, 3, '#ddd') // bottle neck
      text(b.label, btlX + 3, by + 26, '#888', 5, 'center')
    })

    // Draft tap (API endpoints)
    rect(bx + bw - 10, by + 4, 4, 10, C.chrome)
    rect(bx + bw - 12, by + 2, 8, 4, '#888')

    text('BAR', bx + bw / 2, by + bh - 4, '#888', 7, 'center')

    registerClickRegion(
      bx,
      by,
      bw,
      bh,
      () => {
        tooltipData = {
          title: 'Bar (External Services)',
          color: C.woodLight,
          lines: [
            'Resend (cocktail shaker)',
            'Twilio, PostHog, Sentry (bottles)',
            'Each service semi-independent',
          ],
        }
      },
      'Bar'
    )
  }

  // ── FRONT DOOR (Google OAuth) ──
  function drawFrontDoor(dx, dy) {
    const w = 18,
      h = 28
    // Door frame
    rect(dx, dy, w, h, '#664')
    // Door panels
    rect(dx + 2, dy + 2, w - 4, h * 0.4, '#885')
    rect(dx + 2, dy + h * 0.45, w - 4, h * 0.4, '#885')
    // Handle
    rect(dx + w - 5, dy + h / 2, 3, 4, C.chrome)
    // Welcome mat
    rect(dx - 2, dy + h, w + 4, 4, '#484')

    text('DOOR', dx + w / 2, dy + h + 12, '#777', 6, 'center')

    registerClickRegion(
      dx,
      dy,
      w,
      h + 14,
      () => {
        tooltipData = {
          title: 'Front Door (Google OAuth)',
          color: '#886',
          lines: [
            'Main entrance for guests',
            'Google sign-in, email/password',
            'Session management via Supabase Auth',
          ],
        }
      },
      'Front Door'
    )
  }

  // ══════════════════════════════════════════════════════════════
  // OPENCLAW COMMAND CENTER - The main visual. 5 big agents
  // with live activity feed next to each one.
  // ══════════════════════════════════════════════════════════════
  // Agent activity log (populated from OpenClaw panel polling or simulated from bizData)
  let agentActivityLog = {
    main: [],
    sonnet: [],
    build: [],
    qa: [],
    runner: [],
  }

  // Poll OpenClaw activity log from MC server endpoint
  async function pollAgentActivity() {
    try {
      const resp = await fetch('/api/openclaw/status')
      if (!resp.ok) throw new Error('not ok')
      const data = await resp.json()
      if (data.agents) {
        Object.keys(data.agents).forEach((name) => {
          if (agentActivityLog[name] !== undefined) {
            const log = (data.agents[name].log || []).slice(0, 5)
            agentActivityLog[name] = log.length > 0 ? log : data.online ? ['Idle'] : ['OFFLINE']
          }
        })
      }
      if (!data.online) {
        Object.keys(agentActivityLog).forEach((k) => {
          agentActivityLog[k] = ['OFFLINE']
        })
      }
    } catch {
      // Endpoint unreachable; use bizData as fallback
      const ocUp = bizData.agentStates?.openclawGateway || false
      Object.keys(agentActivityLog).forEach((k) => {
        agentActivityLog[k] = ocUp ? ['Waiting for tasks...'] : ['OFFLINE']
      })
    }
  }
  pollAgentActivity()
  setInterval(pollAgentActivity, 8000)

  function drawOpenClawCommandCenter(cx, cy, cw, ch) {
    const ocUp = isUp('openclawGateway')

    // Command center background panel (full dark backdrop)
    roundRect(cx, cy, cw, ch, 6, 'rgba(10,5,20,0.85)')
    // Thick border, glowing when online
    ctx.strokeStyle = ocUp ? 'rgba(90,197,79,0.5)' : 'rgba(234,50,60,0.5)'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.roundRect(cx, cy, cw, ch, 6)
    ctx.stroke()

    // Title bar (big, readable)
    const titleH = 22
    rect(cx + 1, cy + 1, cw - 2, titleH, 'rgba(42,47,78,0.9)')
    const statusDot = ocUp ? C.statusGreen : C.statusRed
    rect(cx + 10, cy + 7, 10, 10, statusDot)
    text('OPENCLAW COMMAND CENTER', cx + 28, cy + 16, ocUp ? C.cream : '#a66', 14, 'left')
    text(
      ocUp ? 'ONLINE  10.0.0.177' : 'GATEWAY OFFLINE',
      cx + cw - 12,
      cy + 16,
      ocUp ? C.statusGreen : C.statusRed,
      12,
      'right'
    )

    // 5 agent rows - BIG characters, BIG text, BIG activity feed
    const agents = [
      { name: 'main', role: 'Orchestrator', model: 'Opus 4.6', color: C.crimson, hat: 'toque' },
      {
        name: 'sonnet',
        role: 'Sr. Engineer',
        model: 'Sonnet 4.6',
        color: C.skyBlue,
        hat: 'bandana',
      },
      { name: 'build', role: 'Build Check', model: 'Groq 70B', color: C.lime, hat: 'bandana' },
      { name: 'qa', role: 'QA Tester', model: 'Groq 70B', color: C.gold, hat: 'bandana' },
      { name: 'runner', role: 'Task Runner', model: 'Groq 8B', color: C.salmon, hat: 'bandana' },
    ]

    const contentTop = cy + titleH + 6
    const contentH = ch - titleH - 10
    const rowH = contentH / agents.length
    const charAreaW = 60 // space for the big character

    agents.forEach((agent, i) => {
      const ry = contentTop + i * rowH
      const working = ocUp && (tick + i * 60) % 300 < 200

      // Row separator (visible line between agents)
      if (i > 0) {
        ctx.strokeStyle = 'rgba(255,255,255,0.12)'
        ctx.lineWidth = 1
        ctx.beginPath()
        ctx.moveTo(cx + 8, ry)
        ctx.lineTo(cx + cw - 8, ry)
        ctx.stroke()
      }

      // Row highlight on hover-style (alternating subtle bg)
      if (i % 2 === 0) {
        roundRect(cx + 2, ry + 1, cw - 4, rowH - 2, 3, 'rgba(255,255,255,0.02)')
      }

      // ── BIG status dot (left edge) ──
      const dotColor = !ocUp ? C.statusRed : working ? C.statusGreen : C.statusYellow
      rect(cx + 8, ry + rowH / 2 - 5, 8, 8, dotColor)
      // Glow effect when active
      if (working && ocUp) {
        ctx.fillStyle = dotColor === C.statusGreen ? 'rgba(90,197,79,0.15)' : 'rgba(234,179,8,0.15)'
        ctx.beginPath()
        ctx.arc(cx + 12, ry + rowH / 2 - 1, 10, 0, Math.PI * 2)
        ctx.fill()
      }

      // ── Agent character (scaled 4x - HUGE, immediately visible) ──
      const charX = cx + 38
      const charCenterY = ry + rowH / 2
      const bob = working ? Math.sin(tick * 0.05 + i * 1.5) * 2 : 0
      const s = 4 // BIG scale

      // Shadow
      ctx.fillStyle = 'rgba(0,0,0,0.3)'
      ctx.beginPath()
      ctx.ellipse(charX, charCenterY + (10 * s) / 2 + bob, 4 * s, 1.5 * s, 0, 0, Math.PI * 2)
      ctx.fill()

      // Legs
      rect(charX - 2 * s, charCenterY + 5 * s + bob, 2 * s, 3 * s, '#333')
      rect(charX + 1 * s, charCenterY + 5 * s + bob, 2 * s, 3 * s, '#333')
      // Body (colored apron - BIG)
      rect(charX - 3 * s, charCenterY - 1 * s + bob, 7 * s, 7 * s, ocUp ? agent.color : '#444')
      // Head
      rect(charX - 2 * s, charCenterY - 5 * s + bob, 5 * s, 4 * s, ocUp ? C.skin : '#666')
      // Eyes (visible!)
      rect(charX - 1 * s, charCenterY - 4 * s + bob, 2 * s, 2 * s, '#131313')
      rect(charX + 1 * s, charCenterY - 4 * s + bob, 2 * s, 2 * s, '#131313')
      // Hat
      if (agent.hat === 'toque') {
        rect(charX - 2 * s, charCenterY - 8 * s + bob, 5 * s, 3 * s, '#fff')
        rect(charX - 1 * s, charCenterY - 10 * s + bob, 3 * s, 3 * s, '#fff')
      } else {
        rect(charX - 3 * s, charCenterY - 6 * s + bob, 7 * s, 2 * s, agent.color)
      }
      // Arms
      rect(charX - 5 * s, charCenterY + bob, 2 * s, 5 * s, ocUp ? agent.color : '#444')
      rect(charX + 5 * s, charCenterY + bob, 2 * s, 5 * s, ocUp ? agent.color : '#444')

      // Activity spark when working (BIG spark)
      if (working && ocUp) {
        if (tick % 20 < 10)
          rect(charX - 1 * s, charCenterY - 11 * s + bob, 3 * s, 3 * s, C.flameYellow)
      }

      // ── Agent info text (BIG, readable at a glance) ──
      const infoX = cx + charAreaW + 20
      const nameY = ry + 16
      // Agent name - HUGE and colored
      text(agent.name.toUpperCase(), infoX, nameY, agent.color, 16, 'left')
      // Role and model on the same line, right of name
      text(
        agent.role + '  |  ' + agent.model,
        infoX + agent.name.length * 11 + 10,
        nameY,
        '#777',
        11,
        'left'
      )

      // ── Live activity feed (BIG text, the whole point) ──
      const log = agentActivityLog[agent.name] || []
      const feedX = infoX
      const feedY = nameY + 6
      const feedLineH = 14

      if (log.length > 0) {
        log.forEach((entry, j) => {
          if (j >= 4) return // max 4 visible lines
          const entryText = typeof entry === 'string' ? entry : entry.text || entry.message || ''
          const lineY = feedY + j * feedLineH
          // Truncate to fit panel width
          const maxLen = Math.floor((cw - charAreaW - 40) / 6.5)
          const display =
            entryText.length > maxLen ? entryText.substring(0, maxLen - 2) + '..' : entryText
          // First line bright, rest dimmer
          const lineColor = j === 0 ? (ocUp ? '#e0e0e0' : '#666') : j === 1 ? '#999' : '#666'
          text((j === 0 ? '\u25B6 ' : '  ') + display, feedX, lineY + 12, lineColor, 11, 'left')
        })
      } else {
        text(
          ocUp ? '\u25B6 Waiting for tasks...' : '\u25B6 OFFLINE',
          feedX,
          feedY + 12,
          ocUp ? '#888' : '#664444',
          11,
          'left'
        )
      }

      // Click region per agent (full row)
      registerClickRegion(
        cx,
        ry,
        cw,
        rowH,
        () => {
          tooltipData = {
            title: agent.name.toUpperCase() + ' (' + agent.model + ')',
            color: agent.color,
            lines: [
              agent.role,
              ocUp ? 'ONLINE' : 'OFFLINE',
              ...(log.length > 0
                ? log.slice(0, 5).map((e) => (typeof e === 'string' ? e : e.text || ''))
                : ['No activity']),
            ],
          }
        },
        agent.name
      )
    })
  }

  // Remy and Gustav functions removed: app features, not infrastructure agents

  // ── GMAIL MAILBOX (wall-mounted mail slot) ──
  function drawGmailMailbox(mx, my) {
    const w = 16,
      h = 12
    // Mailbox body
    rect(mx, my, w, h, '#c42430') // Gmail red
    rect(mx + 2, my + 2, w - 4, h - 4, '#e55')
    // Mail slot
    rect(mx + 3, my + 4, w - 6, 2, '#333')
    // Envelope poking out
    if (tick % 200 < 120) {
      rect(mx + 5, my + 1, 6, 4, '#fff')
      rect(mx + 6, my + 2, 4, 1, '#ddd') // fold line
    }
    // Flag (up = syncing)
    const syncing = tick % 300 < 150
    if (syncing) {
      rect(mx + w, my, 2, 8, '#888')
      rect(mx + w, my, 4, 3, C.statusGreen)
    }

    text('Gmail', mx + w / 2, my + h + 8, '#c42430', 6, 'center')

    registerClickRegion(
      mx,
      my,
      w + 4,
      h + 10,
      () => {
        tooltipData = {
          title: 'Gmail Sync (Mailbox)',
          color: '#c42430',
          lines: [
            'GOLDMINE email intelligence',
            'Incoming inquiries from email',
            'Deterministic extraction + lead scoring',
            'Thread replies enrich parent inquiry',
          ],
        }
      },
      'Gmail'
    )
  }

  // ── REDIS SPEED RAIL (bartender quick-access under the bar) ──
  function drawRedisSpeedRail(rx, ry, rw) {
    // Metal rail under bar counter
    rect(rx, ry, rw, 3, C.steel)
    rect(rx + 1, ry + 1, rw - 2, 1, C.chrome)

    // Small bottles on the rail (cached values)
    const bottleCount = 6
    for (let i = 0; i < bottleCount; i++) {
      const bx = rx + 4 + i * (rw / bottleCount)
      const colors = [C.skyBlue, C.lime, C.amber, C.rose, C.teal, C.purple]
      rect(bx, ry - 6, 4, 6, colors[i])
      rect(bx + 1, ry - 8, 2, 3, '#ddd') // bottle cap
    }

    text('Redis', rx + rw / 2, ry + 8, '#a44', 5, 'center')

    registerClickRegion(
      rx,
      ry - 10,
      rw,
      20,
      () => {
        tooltipData = {
          title: 'Upstash Redis (Speed Rail)',
          color: '#a44',
          lines: [
            "Bartender's speed rail: instant access",
            'Session cache, rate limiting, queues',
            'Quick-grab bottles for fast service',
          ],
        }
      },
      'Redis'
    )
  }

  // ── CLOUDINARY PHOTO WALL (framed food photos on dining wall) ──
  function drawPhotoWall(px, py) {
    // 3 small framed "photos" on the wall
    for (let i = 0; i < 3; i++) {
      const fx = px + i * 22
      // Frame
      rect(fx, py, 18, 14, C.gold)
      rect(fx + 1, py + 1, 16, 12, '#2a2f4e')
      // "Photo" content (food tile if loaded, colored square if not)
      const photoTiles = [66, 35, 48] // pizza, meat, cake
      if (!drawFoodTile(photoTiles[i], fx + 2, py + 2, 0.7)) {
        rect(fx + 2, py + 2, 14, 10, ['#644', '#464', '#446'][i])
      }
    }

    text('Photos', px + 33, py + 20, '#888', 5, 'center')

    registerClickRegion(
      px,
      py,
      66,
      22,
      () => {
        tooltipData = {
          title: 'Cloudinary (Photo Wall)',
          color: C.gold,
          lines: [
            'Image hosting & optimization',
            'Menu photos, event photos, avatars',
            'CDN delivery, auto-format, resize',
          ],
        }
      },
      'Photos'
    )
  }

  // ═══════════════════════════════════════════════════════════
  // HUD BAR - Status summary at bottom
  // ═══════════════════════════════════════════════════════════
  function drawHUD() {
    const z = Z.hud
    // HUD background (try pixel art space panel, fallback to solid)
    if (!draw9Slice('panelSpace', z.x, z.y, z.w, z.h)) {
      rect(z.x, z.y, z.w, z.h, C.panelBg)
      rect(z.x, z.y, z.w, 1, C.panelBorder)
    }

    const pad = 8
    let hx = z.x + pad
    const hy = z.y + 14

    // Service status dots
    const services = [
      { label: 'Dev', up: bizData.agentStates.devServer },
      { label: 'Beta', up: bizData.agentStates.betaServer },
      { label: 'Prod', up: isUp('production') },
      { label: 'Ollama', up: bizData.agentStates.ollama },
      { label: 'Supabase', up: isUp('supabase') },
      { label: 'OpenClaw', up: isUp('openclawGateway') },
    ]
    services.forEach((s) => {
      rect(hx, hy - 4, 6, 6, s.up ? C.statusGreen : C.statusRed)
      text(s.label, hx + 9, hy + 1, s.up ? '#ccc' : '#888', 9)
      hx += ctx.measureText(s.label).width + 18
    })

    // Revenue in HUD
    const dollars = parseDollars(bizData)
    text('$' + Math.floor(dollars).toLocaleString(), z.w * 0.45, hy + 1, C.screenGlow, 11)

    // Events count
    text(bizData.eventsTotal + ' events', z.w * 0.55, hy + 1, '#aaa', 9)

    // Inquiries
    const inqColor = bizData.inquiries.overdue > 0 ? C.statusRed : C.statusGreen
    text(bizData.inquiries.open + ' inquiries', z.w * 0.65, hy + 1, inqColor, 9)

    // Day phase + time
    const phase = getDayPhase()
    const now = new Date()
    text(phase.phase, z.w * 0.78, hy + 1, '#888', 9)
    text(now.toLocaleTimeString(), z.w * 0.88, hy + 1, '#aaa', 9)

    // Sound toggle
    const sndX = z.w - 30,
      sndY = hy - 6
    roundRect(sndX, sndY, 22, 14, 3, soundEnabled ? '#264' : '#333')
    text(
      soundEnabled ? 'SND' : 'MUTE',
      sndX + 11,
      sndY + 10,
      soundEnabled ? '#8f8' : '#888',
      7,
      'center'
    )
    registerClickRegion(
      sndX,
      sndY,
      22,
      14,
      () => {
        soundEnabled = !soundEnabled
        if (soundEnabled && audioCtx && audioCtx.state === 'suspended') audioCtx.resume()
      },
      'Sound'
    )

    // Second row: recent activity
    const hy2 = hy + 18
    if (realActivity.length > 0) {
      const recent = realActivity.slice(0, 5)
      recent.forEach((a, i) => {
        const ax = z.x + pad + i * (z.w / 5)
        const shortFile = a.file.split('/').pop()
        text(shortFile, ax, hy2, '#777', 7)
        text(a.time, ax, hy2 + 10, '#555', 6)
      })
    }

    // Weather (if available)
    if (bizData.weather) {
      const wx = z.w * 0.78,
        wy = hy2
      text(bizData.weather.condition || '', wx, wy, '#888', 8)
      text(bizData.weather.temp || '', wx + 40, wy, '#aaa', 8)
    }

    // Clock element update
    const clockEl = document.getElementById('office-clock')
    if (clockEl) clockEl.textContent = now.toLocaleTimeString()
  }

  // ═══════════════════════════════════════════════════════════
  // OVERLAYS - Achievements, notifications, tooltips
  // ═══════════════════════════════════════════════════════════
  function drawOverlays(w, h) {
    // Achievement toasts (with pixel art panels)
    achievementToasts = achievementToasts.filter((t) => t.age < t.maxAge)
    achievementToasts.forEach((t, i) => {
      t.age++
      const opacity = t.age < 30 ? t.age / 30 : t.age > t.maxAge - 60 ? (t.maxAge - t.age) / 60 : 1
      const ty = 20 + i * 40
      ctx.globalAlpha = opacity
      // Try gold/tan pixel art panel for achievements
      if (!draw9Slice('panelBrown', w - 200, ty, 190, 32)) {
        roundRect(w - 200, ty, 190, 32, 6, C.midnight)
        roundRect(w - 199, ty + 1, 188, 30, 5, 'rgba(255,255,255,0.05)')
      }
      text(t.icon + ' ' + t.text, w - 190, ty + 20, t.color, 11)
      ctx.globalAlpha = 1
    })

    // Notifications
    notifications = notifications.filter((n) => n.age < n.maxAge)
    notifications.forEach((n, i) => {
      n.age++
      const opacity = n.age < 20 ? n.age / 20 : n.age > n.maxAge - 40 ? (n.maxAge - n.age) / 40 : 1
      const ny = h - 120 - i * 30
      ctx.globalAlpha = opacity
      const bg = n.type === 'alert' ? 'rgba(200,50,50,0.9)' : 'rgba(30,30,50,0.9)'
      roundRect(w - 220, ny, 210, 24, 4, bg)
      text(n.text, w - 210, ny + 16, '#fff', 9)
      ctx.globalAlpha = 1
    })

    // Tooltip (rendered last, on top of everything - with pixel art panel)
    if (tooltipData) {
      const tt = tooltipData
      const tw = 200,
        th = 16 + tt.lines.length * 14
      let ttx = Math.min(lastMouseX + 16, w - tw - 10)
      let tty = Math.max(lastMouseY - th - 10, 10)
      if (ttx < 10) ttx = 10
      // Try pixel art panel for tooltip
      if (!draw9Slice('panelSpaceInlay', ttx, tty, tw, th)) {
        roundRect(ttx, tty, tw, th, 4, 'rgba(14,7,27,0.95)')
      }
      line(ttx, tty + 16, ttx + tw, tty + 16, 'rgba(255,255,255,0.08)', 1)
      text(tt.title, ttx + 8, tty + 12, tt.color || C.cream, 10)
      tt.lines.forEach((l, i) => {
        text(l, ttx + 8, tty + 28 + i * 14, C.chrome, 8)
      })
    }
  }

  // Check for new inquiries / SLA breaches
  function checkNotifications() {
    if (!bizDataLoaded) return
    const inq = bizData.inquiries.open || 0
    const over = bizData.inquiries.overdue || 0
    if (lastInquiryCount >= 0 && inq > lastInquiryCount) {
      pushNotification('info', 'New inquiry! (' + inq + ' open)')
      playBell()
    }
    if (lastOverdueCount >= 0 && over > lastOverdueCount) {
      pushNotification('alert', 'SLA breach! ' + over + ' overdue')
      playAlarm()
    }
    lastInquiryCount = inq
    lastOverdueCount = over
  }

  // ═══════════════════════════════════════════════════════════
  // MAIN SCENE
  // ═══════════════════════════════════════════════════════════
  let lastMouseX = 0,
    lastMouseY = 0

  function drawScene() {
    if (!canvas || !ctx) return
    const parent = canvas.parentElement
    if (!parent) return
    const r = parent.getBoundingClientRect()
    const w = Math.floor(r.width)
    const h = Math.floor(r.height - 32)
    if (w !== lastW || h !== lastH) {
      canvas.width = w
      canvas.height = h
      lastW = w
      lastH = h
    }

    tick++
    clickRegions = []
    tooltipData = null

    // Compute zone layout
    computeZones(w, h)

    // Clear (ENDESGA void)
    rect(0, 0, w, h, C.void)

    // Sprite loading progress (shown while assets download)
    if (!spritesLoaded && spriteLoadTotal > 0) {
      const pct = spriteLoadCount / spriteLoadTotal
      const barW = w * 0.4,
        barH = 8,
        barX = (w - barW) / 2,
        barY = h * 0.48
      text('Loading pixel art assets...', w / 2, barY - 10, C.cream, 10, 'center')
      rect(barX, barY, barW, barH, C.midnight)
      rect(barX + 1, barY + 1, (barW - 2) * pct, barH - 2, C.statusGreen)
      text(
        spriteLoadCount + '/' + spriteLoadTotal,
        w / 2,
        barY + barH + 12,
        C.steelDark,
        8,
        'center'
      )
    }

    // Draw zones (back to front)
    drawWallZone()
    drawKitchenZone()
    drawPassZone()
    drawDiningZone()
    drawHUD()

    // Day/night tint overlay
    const phase = getDayPhase()
    if (phase.tint !== 'rgba(255,255,255,0)') {
      rect(0, 0, w, h, phase.tint)
    }

    // Overlays (always on top)
    drawOverlays(w, h)

    // Periodic checks
    if (tick % 600 === 0) checkAchievements()
    if (tick % 300 === 0) checkNotifications()

    // Occasional sizzle sound when dev server is running
    if (soundEnabled && bizData.agentStates.devServer && tick % 180 === 0) playSizzle()
  }

  // ═══════════════════════════════════════════════════════════
  // INIT + LOOP
  // ═══════════════════════════════════════════════════════════
  function initOffice() {
    canvas = document.getElementById('office-canvas')
    if (!canvas) return
    ctx = canvas.getContext('2d')
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
    lastMouseX = mx
    lastMouseY = my
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

  // Mousemove for hover tooltips and cursor
  document.addEventListener('mousemove', function (e) {
    if (!canvas) return
    const r = canvas.getBoundingClientRect()
    lastMouseX = e.clientX - r.left
    lastMouseY = e.clientY - r.top

    let overClickable = false
    for (const region of clickRegions) {
      if (
        lastMouseX >= region.x &&
        lastMouseX <= region.x + region.w &&
        lastMouseY >= region.y &&
        lastMouseY <= region.y + region.h
      ) {
        overClickable = true
        break
      }
    }
    canvas.style.cursor = overClickable ? 'pointer' : 'default'

    // Hide old HTML tooltip
    const tooltip = document.getElementById('office-tooltip')
    if (tooltip) tooltip.style.display = 'none'
  })
})()
