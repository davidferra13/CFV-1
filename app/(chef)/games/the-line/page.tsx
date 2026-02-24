'use client'

import Link from 'next/link'
import { useCallback, useEffect, useRef, useState } from 'react'
import { getLineGameData, type EventForGame } from '@/lib/games/line-actions'

/* ── constants ──────────────────────────────────────────────── */
const W = 480
const H = 640
const FPS = 60

// Layout regions (y-coordinates)
const RAIL_Y = 0
const RAIL_H = 90
const STATIONS_Y = 110
const STATIONS_H = 360
const PLATE_Y = 490
const PLATE_H = 60

// Station layout (2x2 grid)
const STATION_W = 200
const STATION_H = 160
const STATION_GAP = 20
const STATION_X_LEFT = W / 2 - STATION_W - STATION_GAP / 2
const STATION_X_RIGHT = W / 2 + STATION_GAP / 2

type Station = 'grill' | 'saute' | 'prep' | 'oven'
type CookPhase = 'raw' | 'cooking' | 'perfect' | 'overcooked' | 'burnt'
type RushLevel = 'soft_open' | 'dinner' | 'rush' | 'slammed' | 'weeded'
type GamePhase = 'menu' | 'playing' | 'game_over'

type DishDef = {
  name: string
  emoji: string
  station: Station
  cookFrames: number
  perfectStart: number
  perfectEnd: number
}

type TicketItem = DishDef & { id: number; assigned: boolean; plated: boolean; burnt: boolean }
type Ticket = {
  id: number
  items: TicketItem[]
  x: number
  targetX: number
  age: number
  served: boolean
  flyOut: number
}
type ActiveCook = { item: TicketItem; ticketId: number; progress: number; phase: CookPhase }
type FlyingItem = {
  emoji: string
  fromX: number
  fromY: number
  toX: number
  toY: number
  progress: number
  duration: number
}
type Particle = {
  x: number
  y: number
  vx: number
  vy: number
  life: number
  maxLife: number
  emoji: string
  scale: number
}
type ScorePopup = { x: number; y: number; text: string; color: string; life: number }
type RemyCallout = { text: string; life: number; maxLife: number }
type SteamWisp = { x: number; y: number; vy: number; opacity: number; size: number }
type PlatedItem = { emoji: string; x: number; life: number }

/* ── dish pool ──────────────────────────────────────────────── */
const DISH_POOL: DishDef[] = [
  // Grill (4s cook = 240 frames)
  {
    name: 'Ribeye',
    emoji: '🥩',
    station: 'grill',
    cookFrames: 240,
    perfectStart: 156,
    perfectEnd: 246,
  },
  {
    name: 'Chicken',
    emoji: '🍗',
    station: 'grill',
    cookFrames: 240,
    perfectStart: 156,
    perfectEnd: 246,
  },
  {
    name: 'Salmon',
    emoji: '🐟',
    station: 'grill',
    cookFrames: 240,
    perfectStart: 156,
    perfectEnd: 246,
  },
  {
    name: 'Lamb Chop',
    emoji: '🍖',
    station: 'grill',
    cookFrames: 240,
    perfectStart: 156,
    perfectEnd: 246,
  },
  // Sauté (3s = 180 frames)
  {
    name: 'Risotto',
    emoji: '🍚',
    station: 'saute',
    cookFrames: 180,
    perfectStart: 117,
    perfectEnd: 185,
  },
  {
    name: 'Pasta',
    emoji: '🍝',
    station: 'saute',
    cookFrames: 180,
    perfectStart: 117,
    perfectEnd: 185,
  },
  {
    name: 'Stir Fry',
    emoji: '🥘',
    station: 'saute',
    cookFrames: 180,
    perfectStart: 117,
    perfectEnd: 185,
  },
  {
    name: 'Béarnaise',
    emoji: '🫕',
    station: 'saute',
    cookFrames: 180,
    perfectStart: 117,
    perfectEnd: 185,
  },
  // Prep (2s = 120 frames)
  {
    name: 'Caesar',
    emoji: '🥗',
    station: 'prep',
    cookFrames: 120,
    perfectStart: 78,
    perfectEnd: 123,
  },
  {
    name: 'Bruschetta',
    emoji: '🫓',
    station: 'prep',
    cookFrames: 120,
    perfectStart: 78,
    perfectEnd: 123,
  },
  {
    name: 'Ceviche',
    emoji: '🍤',
    station: 'prep',
    cookFrames: 120,
    perfectStart: 78,
    perfectEnd: 123,
  },
  {
    name: 'Charcuterie',
    emoji: '🧀',
    station: 'prep',
    cookFrames: 120,
    perfectStart: 78,
    perfectEnd: 123,
  },
  // Oven (5s = 300 frames)
  {
    name: 'Sourdough',
    emoji: '🍞',
    station: 'oven',
    cookFrames: 300,
    perfectStart: 195,
    perfectEnd: 308,
  },
  {
    name: 'Crème Brûlée',
    emoji: '🍮',
    station: 'oven',
    cookFrames: 300,
    perfectStart: 195,
    perfectEnd: 308,
  },
  {
    name: 'Root Veg',
    emoji: '🥕',
    station: 'oven',
    cookFrames: 300,
    perfectStart: 195,
    perfectEnd: 308,
  },
  {
    name: 'Tart Tatin',
    emoji: '🥧',
    station: 'oven',
    cookFrames: 300,
    perfectStart: 195,
    perfectEnd: 308,
  },
]

const STATIONS_META: { key: Station; label: string; emoji: string; col: number; row: number }[] = [
  { key: 'grill', label: 'GRILL', emoji: '🔥', col: 0, row: 0 },
  { key: 'saute', label: 'SAUTÉ', emoji: '🍳', col: 1, row: 0 },
  { key: 'prep', label: 'PREP', emoji: '🔪', col: 0, row: 1 },
  { key: 'oven', label: 'OVEN', emoji: '♨️', col: 1, row: 1 },
]

/* ── Remy callouts ──────────────────────────────────────────── */
const REMY = {
  orderIn: ['Order in!', 'Ordering!', 'New ticket, chef!', 'Fire this one!', 'Table needs food!'],
  perfect: ['HEARD! Beautiful.', 'Money.', "That's how it's done.", 'Textbook.', "Chef's kiss."],
  good: ['Solid.', 'Plated.', 'Good enough. Send it.', 'On the pass.'],
  overcooked: ['Little dark on that one.', "It'll pass... barely.", 'Pushing it, chef.'],
  undercooked: ["That's raw, chef. Send it back.", 'Not yet — back on.', 'Needs more time.'],
  burnt: ['86 that.', 'Burnt. Shake it off.', 'Gone. Move on.', 'Smoke alarm incoming.'],
  streak3: ["You're on fire! 🔥", 'Three in a row!', 'Keep that energy!'],
  streak5: ['FIVE STRAIGHT. Yes, Chef!', 'Dialed in!', 'Machine mode!'],
  streak8: ["UNSTOPPABLE. Don't stop now.", 'Eight deep. LEGENDARY.'],
  rushUp: ['Behind! Pace is picking up.', 'Tickets are stacking!', "It's getting real now."],
  pending2: ['Two on the rail.', "Let's move, chef."],
  pending4: ["We're getting weeded!", 'HEARD?! Pick it up!', 'The rail is FULL!'],
  ticketServed: ['Table served. Next!', "That's a send.", 'Window! Next ticket.'],
  overflow: ['Kitchen is overwhelmed!', "We're buried. Service over."],
}

const RUSH_LEVELS: {
  level: RushLevel
  label: string
  minScore: number
  ticketInterval: number
  minItems: number
  maxItems: number
  windowMult: number
}[] = [
  {
    level: 'soft_open',
    label: 'Soft Open',
    minScore: 0,
    ticketInterval: 360,
    minItems: 2,
    maxItems: 2,
    windowMult: 1.0,
  },
  {
    level: 'dinner',
    label: 'Dinner',
    minScore: 300,
    ticketInterval: 270,
    minItems: 2,
    maxItems: 3,
    windowMult: 0.87,
  },
  {
    level: 'rush',
    label: 'Rush',
    minScore: 800,
    ticketInterval: 210,
    minItems: 3,
    maxItems: 3,
    windowMult: 0.73,
  },
  {
    level: 'slammed',
    label: 'Slammed',
    minScore: 1500,
    ticketInterval: 150,
    minItems: 3,
    maxItems: 4,
    windowMult: 0.6,
  },
  {
    level: 'weeded',
    label: 'Weeded',
    minScore: 2500,
    ticketInterval: 120,
    minItems: 4,
    maxItems: 4,
    windowMult: 0.47,
  },
]

const RATINGS: { min: number; title: string; line: string }[] = [
  { min: 2001, title: 'Chef de Cuisine', line: "The line is yours. I'll be at the bar." },
  { min: 1001, title: 'Sous Chef', line: "I'd trust you running the pass. Almost." },
  { min: 501, title: 'Line Cook', line: "You can hold your station. I'd work next to you." },
  { min: 201, title: 'Prep Cook', line: 'You can handle a knife. Now handle the heat.' },
  { min: 0, title: 'Dishwasher', line: "Everyone starts on dish. Let's run it again." },
]

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}
function lerp(a: number, b: number, t: number) {
  return a + (b - a) * Math.min(1, Math.max(0, t))
}
function easeOut(t: number) {
  return 1 - Math.pow(1 - t, 3)
}

/* ── station positions helper ──────────────────────────────── */
function stationRect(st: { col: number; row: number }) {
  const x = st.col === 0 ? STATION_X_LEFT : STATION_X_RIGHT
  const y = STATIONS_Y + st.row * (STATION_H + STATION_GAP)
  return { x, y, w: STATION_W, h: STATION_H }
}

/* ── main component ─────────────────────────────────────────── */
export default function TheLineGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [score, setScore] = useState(0)
  const [strikes, setStrikes] = useState(0)
  const [rushLabel, setRushLabel] = useState('Soft Open')
  const [gamePhase, setGamePhase] = useState<GamePhase>('menu')
  const [highScore, setHighScore] = useState(0)
  const [prepEvents, setPrepEvents] = useState<EventForGame[]>([])
  const [loadingPrep, setLoadingPrep] = useState(true)

  // Load high score + prep data
  useEffect(() => {
    const saved = localStorage.getItem('chefflow-line-hi')
    if (saved) setHighScore(Number(saved))
    getLineGameData()
      .then(({ events }) => {
        setPrepEvents(events)
        setLoadingPrep(false)
      })
      .catch(() => setLoadingPrep(false))
  }, [])

  const stateRef = useRef({
    // game state
    running: false,
    frameCount: 0,
    score: 0,
    strikes: 0,
    streak: 0,
    bestStreak: 0,
    rushLevel: 0,
    nextItemId: 1,
    nextTicketId: 1,
    ticketTimer: 0,

    // entities
    tickets: [] as Ticket[],
    stations: { grill: null, saute: null, prep: null, oven: null } as Record<
      Station,
      ActiveCook | null
    >,
    flyingItems: [] as FlyingItem[],
    particles: [] as Particle[],
    scorePopups: [] as ScorePopup[],
    remyCallout: null as RemyCallout | null,
    steamWisps: [] as SteamWisp[],
    platedItems: [] as PlatedItem[],

    // dish pool (can be customized for prep mode)
    dishPool: DISH_POOL,
    windowMult: 1.0,

    // station glow intensity (0-1, pulses when cooking)
    stationGlow: { grill: 0, saute: 0, prep: 0, oven: 0 } as Record<Station, number>,

    // prep mode info
    prepEventName: null as string | null,
  })

  const showRemy = useCallback((category: keyof typeof REMY) => {
    const text = pick(REMY[category])
    stateRef.current.remyCallout = { text, life: 120, maxLife: 120 }
  }, [])

  const addParticles = useCallback(
    (x: number, y: number, emoji: string, count: number, speed: number) => {
      const s = stateRef.current
      for (let i = 0; i < count; i++) {
        const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.5
        s.particles.push({
          x,
          y,
          vx: Math.cos(angle) * speed * (0.5 + Math.random()),
          vy: Math.sin(angle) * speed * (0.5 + Math.random()),
          life: 30 + Math.random() * 20,
          maxLife: 50,
          emoji,
          scale: 0.6 + Math.random() * 0.6,
        })
      }
    },
    []
  )

  const addScorePopup = useCallback((x: number, y: number, text: string, color: string) => {
    stateRef.current.scorePopups.push({ x, y, text, color, life: 60 })
  }, [])

  const getRushConfig = useCallback(() => {
    return RUSH_LEVELS[stateRef.current.rushLevel]
  }, [])

  const spawnTicket = useCallback(() => {
    const s = stateRef.current
    const rush = RUSH_LEVELS[s.rushLevel]
    const numItems = rush.minItems + Math.floor(Math.random() * (rush.maxItems - rush.minItems + 1))

    // Pick items ensuring variety of stations when possible
    const usedStations = new Set<Station>()
    const items: TicketItem[] = []
    const pool = [...s.dishPool]

    for (let i = 0; i < numItems; i++) {
      // Prefer unused stations first
      let candidates = pool.filter((d) => !usedStations.has(d.station))
      if (candidates.length === 0) candidates = pool
      const dish = pick(candidates)
      const id = s.nextItemId++

      // Apply window multiplier to scale difficulty
      const wm = s.windowMult * rush.windowMult
      const perfectDuration = (dish.perfectEnd - dish.perfectStart) * wm
      const perfectStart = dish.perfectStart
      const perfectEnd = Math.round(perfectStart + perfectDuration)

      items.push({
        ...dish,
        perfectStart,
        perfectEnd,
        id,
        assigned: false,
        plated: false,
        burnt: false,
      })
      usedStations.add(dish.station)
    }

    const ticketId = s.nextTicketId++
    const targetX = 10 + s.tickets.filter((t) => !t.served).length * 110
    s.tickets.push({
      id: ticketId,
      items,
      x: W + 20,
      targetX,
      age: 0,
      served: false,
      flyOut: 0,
    })

    showRemy('orderIn')
  }, [showRemy])

  const startGame = useCallback((eventItems?: EventForGame['items']) => {
    const s = stateRef.current
    s.running = true
    s.frameCount = 0
    s.score = 0
    s.strikes = 0
    s.streak = 0
    s.bestStreak = 0
    s.rushLevel = 0
    s.nextItemId = 1
    s.nextTicketId = 1
    s.ticketTimer = 180 // 3s before first ticket
    s.tickets = []
    s.stations = { grill: null, saute: null, prep: null, oven: null }
    s.flyingItems = []
    s.particles = []
    s.scorePopups = []
    s.remyCallout = null
    s.steamWisps = []
    s.platedItems = []
    s.stationGlow = { grill: 0, saute: 0, prep: 0, oven: 0 }
    s.windowMult = 1.0
    s.prepEventName = null

    // Set up dish pool
    if (eventItems && eventItems.length >= 2) {
      // Prep mode — use chef's own dishes, backfill if needed
      const customPool: DishDef[] = eventItems.map((item) => {
        const baseDish = DISH_POOL.find((d) => d.station === item.station) ?? DISH_POOL[0]
        return {
          name: item.name,
          emoji: item.emoji,
          station: item.station,
          cookFrames: baseDish.cookFrames,
          perfectStart: baseDish.perfectStart,
          perfectEnd: baseDish.perfectEnd,
        }
      })
      // Backfill to at least 8 items for variety
      while (customPool.length < 8) {
        customPool.push(pick(DISH_POOL))
      }
      s.dishPool = customPool
    } else {
      s.dishPool = DISH_POOL
    }

    setScore(0)
    setStrikes(0)
    setRushLabel('Soft Open')
    setGamePhase('playing')
  }, [])

  const handlePull = useCallback(
    (station: Station) => {
      const s = stateRef.current
      const cook = s.stations[station]
      if (!cook) return

      const { progress, item } = cook
      const meta = STATIONS_META.find((m) => m.key === station)!
      const rect = stationRect(meta)
      const cx = rect.x + rect.w / 2
      const cy = rect.y + rect.h / 2

      if (progress < item.perfectStart) {
        // Undercooked — send it back
        s.stations[station] = null
        showRemy('undercooked')
        addScorePopup(cx, cy, 'RAW!', '#fbbf24')
        // Item goes back to unassigned
        const ticket = s.tickets.find((t) => t.id === cook.ticketId)
        if (ticket) {
          const ti = ticket.items.find((i) => i.id === item.id)
          if (ti) ti.assigned = false
        }
        s.streak = 0
      } else if (progress >= item.perfectStart && progress <= item.perfectEnd) {
        // Perfect or good
        const mid = (item.perfectStart + item.perfectEnd) / 2
        const dist = Math.abs(progress - mid)
        const halfWindow = (item.perfectEnd - item.perfectStart) / 2
        const isPerfect = dist < halfWindow * 0.4

        s.stations[station] = null
        const ticket = s.tickets.find((t) => t.id === cook.ticketId)

        if (isPerfect) {
          s.score += 100
          s.streak++
          if (s.streak > s.bestStreak) s.bestStreak = s.streak
          addScorePopup(cx, cy - 20, '+100 PERFECT!', '#e88f47')
          addParticles(cx, cy, '✨', 6, 3)
          if (s.streak === 3) showRemy('streak3')
          else if (s.streak === 5) showRemy('streak5')
          else if (s.streak === 8) showRemy('streak8')
          else showRemy('perfect')
        } else {
          s.score += 50
          s.streak++
          if (s.streak > s.bestStreak) s.bestStreak = s.streak
          addScorePopup(cx, cy - 20, '+50', '#ffffff')
          addParticles(cx, cy, '🍽️', 3, 2)
          showRemy('good')
        }

        // Mark item as plated
        if (ticket) {
          const ti = ticket.items.find((i) => i.id === item.id)
          if (ti) ti.plated = true

          // Add to plating zone
          s.platedItems.push({ emoji: item.emoji, x: W / 2 - 60 + Math.random() * 120, life: 90 })

          // Check if ticket is complete
          const allPlated = ticket.items.every((i) => i.plated || i.burnt)
          if (allPlated) {
            const perfectCount = ticket.items.filter((i) => i.plated && !i.burnt).length
            const ticketBonus = 50
            const allPerfectMult = perfectCount === ticket.items.length ? 2 : 1
            const bonus = ticketBonus * allPerfectMult
            s.score += bonus
            addScorePopup(ticket.x + 50, RAIL_Y + 40, `+${bonus} SERVED!`, '#4ade80')
            addParticles(ticket.x + 50, RAIL_Y + 40, '🎉', 8, 4)
            ticket.served = true
            ticket.flyOut = 1
            showRemy('ticketServed')
          }
        }

        setScore(s.score)

        // Check rush level advancement
        for (let i = RUSH_LEVELS.length - 1; i >= 0; i--) {
          if (s.score >= RUSH_LEVELS[i].minScore && i > s.rushLevel) {
            s.rushLevel = i
            setRushLabel(RUSH_LEVELS[i].label)
            showRemy('rushUp')
            addParticles(W / 2, H / 2, '🔥', 10, 5)
            break
          }
        }
      } else if (progress > item.perfectEnd) {
        // Overcooked
        s.stations[station] = null
        s.score += 25
        s.streak = 0
        addScorePopup(cx, cy - 20, '+25 overcooked', '#fb923c')
        showRemy('overcooked')
        setScore(s.score)

        const ticket = s.tickets.find((t) => t.id === cook.ticketId)
        if (ticket) {
          const ti = ticket.items.find((i) => i.id === item.id)
          if (ti) ti.plated = true
          s.platedItems.push({ emoji: item.emoji, x: W / 2 - 60 + Math.random() * 120, life: 90 })

          const allDone = ticket.items.every((i) => i.plated || i.burnt)
          if (allDone) {
            ticket.served = true
            ticket.flyOut = 1
            s.score += 50
            setScore(s.score)
          }
        }
      }
    },
    [showRemy, addParticles, addScorePopup]
  )

  const handleTicketItemTap = useCallback((ticket: Ticket, item: TicketItem) => {
    const s = stateRef.current
    if (item.assigned || item.plated || item.burnt) return
    if (s.stations[item.station] !== null) return // station occupied

    item.assigned = true

    // Fly animation
    const meta = STATIONS_META.find((m) => m.key === item.station)!
    const rect = stationRect(meta)
    s.flyingItems.push({
      emoji: item.emoji,
      fromX: ticket.x + 10,
      fromY: RAIL_Y + 30,
      toX: rect.x + rect.w / 2,
      toY: rect.y + rect.h / 2,
      progress: 0,
      duration: 20,
    })

    // After fly animation completes, assign to station
    setTimeout(
      () => {
        if (!s.running) return
        s.stations[item.station] = {
          item,
          ticketId: ticket.id,
          progress: 0,
          phase: 'cooking',
        }
      },
      20 * (1000 / 60)
    )
  }, [])

  // Canvas click/touch handler
  const handleCanvasInteraction = useCallback(
    (clientX: number, clientY: number) => {
      const canvas = canvasRef.current
      if (!canvas) return
      const s = stateRef.current
      if (!s.running) return

      const rect = canvas.getBoundingClientRect()
      const scaleX = W / rect.width
      const scaleY = H / rect.height
      const x = (clientX - rect.left) * scaleX
      const y = (clientY - rect.top) * scaleY

      // Check station taps (pull items)
      for (const meta of STATIONS_META) {
        const sr = stationRect(meta)
        if (x >= sr.x && x <= sr.x + sr.w && y >= sr.y && y <= sr.y + sr.h) {
          if (s.stations[meta.key]) {
            handlePull(meta.key)
            return
          }
        }
      }

      // Check ticket item taps (assign to station)
      for (const ticket of s.tickets) {
        if (ticket.served) continue
        const tx = ticket.x
        if (x >= tx && x <= tx + 100 && y >= RAIL_Y && y <= RAIL_Y + RAIL_H) {
          // Find first unassigned item
          const unassigned = ticket.items.find(
            (i) => !i.assigned && !i.plated && !i.burnt && s.stations[i.station] === null
          )
          if (unassigned) {
            handleTicketItemTap(ticket, unassigned)
            return
          }
        }
      }
    },
    [handlePull, handleTicketItemTap]
  )

  // Game loop
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    if (gamePhase !== 'playing') return
    const ctx = canvas.getContext('2d')!
    let raf: number

    function loop() {
      const s = stateRef.current
      if (!s.running) {
        draw()
        return
      }
      s.frameCount++

      // ─── Ticket spawning ───
      s.ticketTimer--
      if (s.ticketTimer <= 0) {
        const rush = RUSH_LEVELS[s.rushLevel]
        s.ticketTimer = rush.ticketInterval
        spawnTicket()
      }

      // ─── Update tickets (slide animation) ───
      let pendingCount = 0
      for (const ticket of s.tickets) {
        if (ticket.served) {
          ticket.flyOut += 0.05
          ticket.x = lerp(ticket.x, ticket.x, 1) // keep position during flyout
          continue
        }
        ticket.age++
        ticket.x = lerp(ticket.x, ticket.targetX, 0.12)
        pendingCount++
      }
      // Reposition active tickets
      let idx = 0
      for (const ticket of s.tickets) {
        if (!ticket.served) {
          ticket.targetX = 10 + idx * 110
          idx++
        }
      }
      // Remove fully served tickets
      s.tickets = s.tickets.filter((t) => !t.served || t.flyOut < 1)

      // ─── Check ticket overflow ───
      if (pendingCount >= 5) {
        s.running = false
        showRemy('overflow')
        endGame()
        draw()
        return
      }
      if (pendingCount >= 4) {
        if (s.frameCount % 120 === 0) showRemy('pending4')
      } else if (pendingCount >= 2) {
        if (s.frameCount % 180 === 0) showRemy('pending2')
      }

      // ─── Update cooking stations ───
      for (const key of ['grill', 'saute', 'prep', 'oven'] as Station[]) {
        const cook = s.stations[key]
        if (cook) {
          cook.progress++

          // Update phase
          if (cook.progress < cook.item.perfectStart) {
            cook.phase = 'cooking'
          } else if (cook.progress <= cook.item.perfectEnd) {
            cook.phase = 'perfect'
          } else if (cook.progress <= cook.item.perfectEnd + 60) {
            cook.phase = 'overcooked'
          } else {
            cook.phase = 'burnt'
          }

          // Station glow
          if (cook.phase === 'perfect') {
            s.stationGlow[key] = 0.6 + Math.sin(s.frameCount * 0.15) * 0.3
          } else if (cook.phase === 'overcooked') {
            s.stationGlow[key] = 0.3
          } else if (cook.phase === 'cooking') {
            s.stationGlow[key] = 0.15
          }

          // Auto-burn
          if (cook.phase === 'burnt') {
            s.stations[key] = null
            s.strikes++
            s.streak = 0
            setStrikes(s.strikes)

            const meta = STATIONS_META.find((m) => m.key === key)!
            const rect = stationRect(meta)
            addParticles(rect.x + rect.w / 2, rect.y + rect.h / 2, '💨', 5, 3)
            addScorePopup(
              rect.x + rect.w / 2,
              rect.y + rect.h / 2,
              `STRIKE ${s.strikes}!`,
              '#ef4444'
            )
            showRemy('burnt')

            // Mark item as burnt
            const ticket = s.tickets.find((t) => t.id === cook.ticketId)
            if (ticket) {
              const ti = ticket.items.find((i) => i.id === cook.item.id)
              if (ti) ti.burnt = true

              // Check if all items done (even if some burnt)
              const allDone = ticket.items.every((i) => i.plated || i.burnt)
              if (allDone) {
                ticket.served = true
                ticket.flyOut = 1
              }
            }

            if (s.strikes >= 3) {
              s.running = false
              endGame()
              draw()
              return
            }
          }
        } else {
          s.stationGlow[key] = lerp(s.stationGlow[key], 0, 0.05)
        }
      }

      // ─── Update flying items ───
      s.flyingItems = s.flyingItems.filter((f) => {
        f.progress += 1 / f.duration
        return f.progress < 1
      })

      // ─── Update particles ───
      s.particles = s.particles.filter((p) => {
        p.x += p.vx
        p.y += p.vy
        p.vy += 0.05 // gravity
        p.life--
        return p.life > 0
      })

      // ─── Update score popups ───
      s.scorePopups = s.scorePopups.filter((p) => {
        p.y -= 0.8
        p.life--
        return p.life > 0
      })

      // ─── Update Remy callout ───
      if (s.remyCallout) {
        s.remyCallout.life--
        if (s.remyCallout.life <= 0) s.remyCallout = null
      }

      // ─── Update steam wisps ───
      if (s.frameCount % 30 === 0) {
        for (const key of ['grill', 'saute', 'prep', 'oven'] as Station[]) {
          if (s.stations[key]) {
            const meta = STATIONS_META.find((m) => m.key === key)!
            const rect = stationRect(meta)
            s.steamWisps.push({
              x: rect.x + 30 + Math.random() * (rect.w - 60),
              y: rect.y + 20,
              vy: -0.3 - Math.random() * 0.3,
              opacity: 0.15 + Math.random() * 0.15,
              size: 8 + Math.random() * 8,
            })
          }
        }
      }
      s.steamWisps = s.steamWisps.filter((w) => {
        w.y += w.vy
        w.x += Math.sin(s.frameCount * 0.02 + w.x) * 0.3
        w.opacity -= 0.002
        return w.opacity > 0
      })

      // ─── Update plated items ───
      s.platedItems = s.platedItems.filter((p) => {
        p.life--
        return p.life > 0
      })

      draw()
      raf = requestAnimationFrame(loop)
    }

    function endGame() {
      const s = stateRef.current
      if (s.score > Number(localStorage.getItem('chefflow-line-hi') || '0')) {
        localStorage.setItem('chefflow-line-hi', String(s.score))
        setHighScore(s.score)
      }
      setScore(s.score)
      setGamePhase('game_over')
    }

    function draw() {
      const s = stateRef.current

      // ─── Background ───
      ctx.fillStyle = '#1a1a2e'
      ctx.fillRect(0, 0, W, H)

      // Kitchen tile pattern
      ctx.strokeStyle = '#ffffff06'
      ctx.lineWidth = 0.5
      for (let gx = 0; gx < W; gx += 40) {
        ctx.beginPath()
        ctx.moveTo(gx, 0)
        ctx.lineTo(gx, H)
        ctx.stroke()
      }
      for (let gy = 0; gy < H; gy += 40) {
        ctx.beginPath()
        ctx.moveTo(0, gy)
        ctx.lineTo(W, gy)
        ctx.stroke()
      }

      // ─── Steam wisps ───
      for (const w of s.steamWisps) {
        ctx.globalAlpha = w.opacity
        ctx.fillStyle = '#ffffff'
        ctx.beginPath()
        ctx.arc(w.x, w.y, w.size, 0, Math.PI * 2)
        ctx.fill()
      }
      ctx.globalAlpha = 1

      // ─── Ticket rail ───
      // Rail background
      ctx.fillStyle = '#16162a'
      ctx.fillRect(0, RAIL_Y, W, RAIL_H)
      ctx.strokeStyle = '#e88f4730'
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(0, RAIL_H)
      ctx.lineTo(W, RAIL_H)
      ctx.stroke()

      // Rail label
      ctx.fillStyle = '#e88f4780'
      ctx.font = 'bold 10px sans-serif'
      ctx.textAlign = 'left'
      ctx.textBaseline = 'top'
      ctx.fillText('ORDER RAIL', 8, 4)

      // Draw tickets
      for (const ticket of s.tickets) {
        const tx = ticket.x
        const alpha = ticket.served ? Math.max(0, 1 - ticket.flyOut) : 1
        const ty = ticket.served ? RAIL_Y + 15 - ticket.flyOut * 50 : RAIL_Y + 15

        ctx.globalAlpha = alpha
        // Ticket card background
        ctx.fillStyle = '#2a2a4a'
        ctx.beginPath()
        ctx.roundRect(tx, ty, 100, RAIL_H - 25, 8)
        ctx.fill()
        ctx.strokeStyle = '#e88f4740'
        ctx.lineWidth = 1
        ctx.stroke()

        // Ticket items
        ctx.font = '18px serif'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        const itemsPerRow = Math.min(ticket.items.length, 4)
        const spacing = 90 / Math.max(itemsPerRow, 1)
        for (let i = 0; i < ticket.items.length; i++) {
          const item = ticket.items[i]
          const ix = tx + 10 + (i % itemsPerRow) * spacing + spacing / 2
          const iy = ty + (ticket.items.length > 2 ? 22 : 32)

          if (item.plated) {
            ctx.globalAlpha = alpha * 0.3
            ctx.fillText('✅', ix, iy)
          } else if (item.burnt) {
            ctx.globalAlpha = alpha * 0.3
            ctx.fillText('💨', ix, iy)
          } else if (item.assigned) {
            ctx.globalAlpha = alpha * 0.5
            ctx.fillText(item.emoji, ix, iy)
          } else {
            ctx.globalAlpha = alpha
            ctx.fillText(item.emoji, ix, iy)
            // Pulsing border on unassigned items
            if (s.stations[item.station] === null) {
              const pulse = 0.3 + Math.sin(s.frameCount * 0.08) * 0.2
              ctx.strokeStyle = `rgba(232, 143, 71, ${pulse})`
              ctx.lineWidth = 1.5
              ctx.beginPath()
              ctx.arc(ix, iy, 14, 0, Math.PI * 2)
              ctx.stroke()
            }
          }
        }
        ctx.globalAlpha = 1

        // Ticket number
        ctx.fillStyle = '#aaa'
        ctx.font = '9px sans-serif'
        ctx.textAlign = 'center'
        ctx.fillText(`#${ticket.id}`, tx + 50, ty + RAIL_H - 30)
      }
      ctx.globalAlpha = 1

      // ─── Stations ───
      for (const meta of STATIONS_META) {
        const rect = stationRect(meta)
        const cook = s.stations[meta.key]

        // Station glow
        const glow = s.stationGlow[meta.key]
        if (glow > 0) {
          const gradient = ctx.createRadialGradient(
            rect.x + rect.w / 2,
            rect.y + rect.h / 2,
            10,
            rect.x + rect.w / 2,
            rect.y + rect.h / 2,
            rect.w * 0.7
          )
          let glowColor = '#e88f47'
          if (cook?.phase === 'perfect') glowColor = '#4ade80'
          else if (cook?.phase === 'overcooked') glowColor = '#fb923c'
          else if (cook?.phase === 'burnt') glowColor = '#ef4444'
          gradient.addColorStop(
            0,
            glowColor +
              Math.round(glow * 40)
                .toString(16)
                .padStart(2, '0')
          )
          gradient.addColorStop(1, 'transparent')
          ctx.fillStyle = gradient
          ctx.fillRect(rect.x - 20, rect.y - 20, rect.w + 40, rect.h + 40)
        }

        // Station background
        ctx.fillStyle = '#1e1e3a'
        ctx.beginPath()
        ctx.roundRect(rect.x, rect.y, rect.w, rect.h, 12)
        ctx.fill()

        // Station border
        let borderColor = '#ffffff15'
        if (cook?.phase === 'perfect') borderColor = '#4ade8080'
        else if (cook?.phase === 'overcooked') borderColor = '#fb923c80'
        else if (cook?.phase === 'burnt') borderColor = '#ef444480'
        ctx.strokeStyle = borderColor
        ctx.lineWidth = 2
        ctx.beginPath()
        ctx.roundRect(rect.x, rect.y, rect.w, rect.h, 12)
        ctx.stroke()

        // Station label
        ctx.fillStyle = '#ffffff60'
        ctx.font = 'bold 11px sans-serif'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'top'
        ctx.fillText(`${meta.emoji} ${meta.label}`, rect.x + rect.w / 2, rect.y + 8)

        if (cook) {
          const cx = rect.x + rect.w / 2
          const cy = rect.y + rect.h / 2 + 10

          // Cook ring (circular timer)
          const ringRadius = 35
          const totalCookTime = cook.item.cookFrames + 60 // include overcooked buffer
          const pct = cook.progress / totalCookTime

          // Background ring
          ctx.strokeStyle = '#ffffff15'
          ctx.lineWidth = 6
          ctx.beginPath()
          ctx.arc(cx, cy, ringRadius, 0, Math.PI * 2)
          ctx.stroke()

          // Progress ring
          let ringColor = '#6b7280' // gray
          if (cook.phase === 'cooking')
            ringColor = '#fbbf24' // yellow
          else if (cook.phase === 'perfect')
            ringColor = '#4ade80' // green
          else if (cook.phase === 'overcooked')
            ringColor = '#fb923c' // orange
          else if (cook.phase === 'burnt') ringColor = '#ef4444' // red

          ctx.strokeStyle = ringColor
          ctx.lineWidth = 6
          ctx.lineCap = 'round'
          ctx.beginPath()
          ctx.arc(cx, cy, ringRadius, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * pct)
          ctx.stroke()
          ctx.lineCap = 'butt'

          // Pulsing glow on perfect
          if (cook.phase === 'perfect') {
            const pulseAlpha = 0.2 + Math.sin(s.frameCount * 0.2) * 0.15
            ctx.strokeStyle = `rgba(74, 222, 128, ${pulseAlpha})`
            ctx.lineWidth = 12
            ctx.beginPath()
            ctx.arc(cx, cy, ringRadius, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * pct)
            ctx.stroke()
          }

          // Red flash on overcooked
          if (cook.phase === 'overcooked' && s.frameCount % 20 < 10) {
            ctx.strokeStyle = '#ef444440'
            ctx.lineWidth = 10
            ctx.beginPath()
            ctx.arc(cx, cy, ringRadius, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * pct)
            ctx.stroke()
          }

          // Food emoji in center
          ctx.font = '28px serif'
          ctx.textAlign = 'center'
          ctx.textBaseline = 'middle'
          // Shake on overcooked/burnt
          let shakeX = 0,
            shakeY = 0
          if (cook.phase === 'overcooked') {
            shakeX = (Math.random() - 0.5) * 3
            shakeY = (Math.random() - 0.5) * 3
          }
          ctx.fillText(cook.item.emoji, cx + shakeX, cy + shakeY)

          // Item name below
          ctx.fillStyle = '#ffffff80'
          ctx.font = '10px sans-serif'
          ctx.fillText(cook.item.name, cx, cy + ringRadius + 14)

          // Phase label
          if (cook.phase === 'perfect') {
            ctx.fillStyle = '#4ade80'
            ctx.font = 'bold 10px sans-serif'
            ctx.fillText('PULL NOW!', cx, rect.y + rect.h - 10)
          }
        } else {
          // Empty station
          ctx.fillStyle = '#ffffff15'
          ctx.font = '32px serif'
          ctx.textAlign = 'center'
          ctx.textBaseline = 'middle'
          ctx.fillText(meta.emoji, rect.x + rect.w / 2, rect.y + rect.h / 2 + 10)
          ctx.fillStyle = '#ffffff20'
          ctx.font = '10px sans-serif'
          ctx.fillText('empty', rect.x + rect.w / 2, rect.y + rect.h / 2 + 35)
        }
      }

      // ─── Plating zone ───
      ctx.fillStyle = '#16162a'
      ctx.fillRect(0, PLATE_Y, W, PLATE_H)
      ctx.strokeStyle = '#e88f4720'
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(0, PLATE_Y)
      ctx.lineTo(W, PLATE_Y)
      ctx.stroke()

      ctx.fillStyle = '#e88f4740'
      ctx.font = 'bold 10px sans-serif'
      ctx.textAlign = 'left'
      ctx.textBaseline = 'top'
      ctx.fillText('🍽️ PLATING', 8, PLATE_Y + 4)

      // Draw plated items
      for (const p of s.platedItems) {
        const alpha = Math.min(1, p.life / 30)
        ctx.globalAlpha = alpha
        ctx.font = '24px serif'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText(p.emoji, p.x, PLATE_Y + 35)
      }
      ctx.globalAlpha = 1

      // ─── Flying items ───
      for (const f of s.flyingItems) {
        const t = easeOut(f.progress)
        const x = lerp(f.fromX, f.toX, t)
        // Arc path — y goes up then down
        const baseY = lerp(f.fromY, f.toY, t)
        const arcHeight = -60 * Math.sin(f.progress * Math.PI)
        const y = baseY + arcHeight

        ctx.font = '22px serif'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText(f.emoji, x, y)
      }

      // ─── Particles ───
      for (const p of s.particles) {
        ctx.globalAlpha = p.life / p.maxLife
        ctx.font = `${Math.round(14 * p.scale)}px serif`
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText(p.emoji, p.x, p.y)
      }
      ctx.globalAlpha = 1

      // ─── Score popups ───
      for (const p of s.scorePopups) {
        const alpha = Math.min(1, p.life / 20)
        const scale = 0.7 + (1 - p.life / 60) * 0.3
        ctx.globalAlpha = alpha
        ctx.fillStyle = p.color
        ctx.font = `bold ${Math.round(14 * scale)}px sans-serif`
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText(p.text, p.x, p.y)
      }
      ctx.globalAlpha = 1

      // ─── Streak fire ───
      if (s.streak >= 3) {
        const fireScale = Math.min(2, 1 + (s.streak - 3) * 0.15)
        ctx.font = `${Math.round(20 * fireScale)}px serif`
        ctx.textAlign = 'right'
        ctx.textBaseline = 'bottom'
        ctx.fillText('🔥', W - 10, H - 10)
        ctx.fillStyle = '#fbbf24'
        ctx.font = 'bold 12px sans-serif'
        ctx.fillText(`×${s.streak}`, W - 35, H - 14)
      }

      // ─── Remy callout ───
      if (s.remyCallout) {
        const rc = s.remyCallout
        const slideIn = Math.min(1, (rc.maxLife - rc.life) / 15)
        const slideOut = Math.min(1, rc.life / 15)
        const alpha = Math.min(slideIn, slideOut)
        const offsetX = (1 - slideIn) * -200

        ctx.globalAlpha = alpha * 0.85
        ctx.fillStyle = '#1a1a3e'
        const boxW = Math.min(280, ctx.measureText(rc.text).width + 60)
        const boxX = 10 + offsetX
        const boxY = H - 80
        ctx.beginPath()
        ctx.roundRect(boxX, boxY, boxW, 32, 8)
        ctx.fill()
        ctx.strokeStyle = '#e88f4760'
        ctx.lineWidth = 1
        ctx.stroke()

        ctx.globalAlpha = alpha
        ctx.fillStyle = '#e88f47'
        ctx.font = 'bold 11px sans-serif'
        ctx.textAlign = 'left'
        ctx.textBaseline = 'middle'
        ctx.fillText('🧑‍🍳', boxX + 8, boxY + 16)
        ctx.fillStyle = '#ffffff'
        ctx.font = '12px sans-serif'
        ctx.fillText(rc.text, boxX + 28, boxY + 16)
      }
      ctx.globalAlpha = 1

      // ─── HUD overlay (bottom bar) ───
      ctx.fillStyle = '#0a0a1ecc'
      ctx.fillRect(0, H - 40, W, 40)
      ctx.strokeStyle = '#e88f4730'
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(0, H - 40)
      ctx.lineTo(W, H - 40)
      ctx.stroke()

      ctx.font = 'bold 12px sans-serif'
      ctx.textBaseline = 'middle'
      const hudY = H - 20

      // Score
      ctx.textAlign = 'left'
      ctx.fillStyle = '#e88f47'
      ctx.fillText(`Score: ${s.score}`, 12, hudY)

      // Rush level
      ctx.textAlign = 'center'
      const rushText = RUSH_LEVELS[s.rushLevel].label
      ctx.fillStyle = '#ffffff80'
      ctx.fillText(rushText, W / 2, hudY)

      // Strikes
      ctx.textAlign = 'right'
      ctx.fillStyle = '#ef4444'
      ctx.fillText('❌'.repeat(s.strikes) + '⬜'.repeat(3 - s.strikes), W - 12, hudY)

      // ─── Game over overlay ───
      if (!s.running) {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.8)'
        ctx.fillRect(0, 0, W, H)

        const rating = RATINGS.find((r) => s.score >= r.min) ?? RATINGS[RATINGS.length - 1]

        ctx.fillStyle = '#e88f47'
        ctx.font = 'bold 32px sans-serif'
        ctx.textAlign = 'center'
        ctx.fillText('Kitchen Closed', W / 2, H / 2 - 100)

        ctx.fillStyle = '#ffffff'
        ctx.font = 'bold 20px sans-serif'
        ctx.fillText(`Score: ${s.score}`, W / 2, H / 2 - 55)

        ctx.fillStyle = '#e88f47'
        ctx.font = 'bold 18px sans-serif'
        ctx.fillText(rating.title, W / 2, H / 2 - 20)

        ctx.fillStyle = '#ffffffcc'
        ctx.font = '14px sans-serif'
        // Word wrap Remy's line
        const words = rating.line.split(' ')
        let lineText = ''
        let lineY = H / 2 + 15
        for (const word of words) {
          const test = lineText + (lineText ? ' ' : '') + word
          if (ctx.measureText(test).width > W - 80) {
            ctx.fillText(lineText, W / 2, lineY)
            lineText = word
            lineY += 20
          } else {
            lineText = test
          }
        }
        if (lineText) ctx.fillText(lineText, W / 2, lineY)

        // Stats
        ctx.fillStyle = '#ffffff80'
        ctx.font = '12px sans-serif'
        ctx.fillText(
          `Best Streak: ${s.bestStreak}  •  Tickets Served: ${s.tickets.filter((t) => t.served).length}`,
          W / 2,
          lineY + 40
        )

        if (s.prepEventName) {
          ctx.fillStyle = '#e88f4780'
          ctx.font = '11px sans-serif'
          ctx.fillText(`Practicing: ${s.prepEventName}`, W / 2, lineY + 60)
        }

        // Restart prompt
        ctx.fillStyle = '#aaa'
        ctx.font = '13px sans-serif'
        ctx.fillText('Tap or press SPACE to play again', W / 2, H / 2 + 130)
      }
    }

    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [gamePhase, spawnTicket, showRemy, addParticles, addScorePopup])

  // Click/touch handlers on canvas
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const onClick = (e: MouseEvent) => {
      if (gamePhase === 'game_over') {
        startGame()
        return
      }
      handleCanvasInteraction(e.clientX, e.clientY)
    }

    const onTouch = (e: TouchEvent) => {
      e.preventDefault()
      if (gamePhase === 'game_over') {
        startGame()
        return
      }
      if (e.touches.length > 0) {
        handleCanvasInteraction(e.touches[0].clientX, e.touches[0].clientY)
      }
    }

    canvas.addEventListener('click', onClick)
    canvas.addEventListener('touchstart', onTouch, { passive: false })
    return () => {
      canvas.removeEventListener('click', onClick)
      canvas.removeEventListener('touchstart', onTouch)
    }
  }, [gamePhase, handleCanvasInteraction, startGame])

  // Keyboard handler
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        e.preventDefault()
        if (gamePhase === 'game_over') {
          startGame()
        }
      }
      // Keyboard shortcuts for stations (1-4)
      if (gamePhase === 'playing') {
        const s = stateRef.current
        if (e.code === 'Digit1' || e.code === 'KeyQ') handlePull('grill')
        if (e.code === 'Digit2' || e.code === 'KeyW') handlePull('saute')
        if (e.code === 'Digit3' || e.code === 'KeyA') handlePull('prep')
        if (e.code === 'Digit4' || e.code === 'KeyS') handlePull('oven')

        // Auto-assign next available item with E key
        if (e.code === 'KeyE') {
          for (const ticket of s.tickets) {
            if (ticket.served) continue
            const unassigned = ticket.items.find(
              (i) => !i.assigned && !i.plated && !i.burnt && s.stations[i.station] === null
            )
            if (unassigned) {
              handleTicketItemTap(ticket, unassigned)
              break
            }
          }
        }
      }
    }

    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [gamePhase, handlePull, handleTicketItemTap, startGame])

  // ─── Menu Screen (start) ───
  if (gamePhase === 'menu') {
    return (
      <div className="mx-auto max-w-xl px-4 py-6">
        <div className="mb-4 flex items-center justify-between">
          <Link href="/games" className="text-sm text-muted-foreground hover:text-foreground">
            &larr; Back to Arcade
          </Link>
          <div className="text-sm text-muted-foreground">
            High Score: <span className="font-bold text-brand-500">{highScore}</span>
          </div>
        </div>

        <div className="mt-8 text-center">
          <div className="mb-3 text-6xl">🔥</div>
          <h1 className="mb-2 text-3xl font-bold">The Line</h1>
          <p className="mx-auto mb-8 max-w-sm text-sm text-muted-foreground">
            Tickets are coming in. Manage your stations, pull at the right time, and survive the
            dinner rush. Remy&apos;s calling expo.
          </p>

          <div className="mx-auto max-w-xs space-y-3">
            <button
              onClick={() => startGame()}
              className="w-full rounded-xl bg-brand-9500 px-6 py-4 text-lg font-bold text-white transition-all hover:bg-brand-600 hover:scale-[1.02] active:scale-[0.98]"
            >
              🔥 Rush Mode
            </button>

            {/* Prep mode events — easter egg */}
            {!loadingPrep &&
              prepEvents.map((event) => (
                <button
                  key={event.id}
                  onClick={() => {
                    stateRef.current.prepEventName = `${event.name} — ${event.date}`
                    startGame(event.items)
                  }}
                  className="w-full rounded-xl border border-border bg-card px-6 py-3 text-sm font-medium text-foreground transition-all hover:border-brand-500/50 hover:bg-card/80"
                >
                  <span className="mr-2">📋</span>
                  {event.name} — {event.date}
                  <span className="ml-2 text-xs text-muted-foreground">
                    {event.guestCount} guests • {event.items.length} dishes
                  </span>
                </button>
              ))}
          </div>

          <div className="mt-8 space-y-1 text-xs text-muted-foreground">
            <p>
              <strong>Tap</strong> ticket items to send them to stations
            </p>
            <p>
              <strong>Tap</strong> stations to pull when the ring turns green
            </p>
            <p>
              Keyboard: <strong>Q/W/A/S</strong> pull stations • <strong>E</strong> auto-assign •{' '}
              <strong>1-4</strong> pull stations
            </p>
          </div>
        </div>
      </div>
    )
  }

  // ─── Game Screen (playing + game_over) ───
  return (
    <div className="mx-auto max-w-xl px-4 py-6">
      <div className="mb-4 flex items-center justify-between">
        <Link href="/games" className="text-sm text-muted-foreground hover:text-foreground">
          &larr; Back to Arcade
        </Link>
        <div className="text-sm text-muted-foreground">
          High Score: <span className="font-bold text-brand-500">{highScore}</span>
        </div>
      </div>

      <h1 className="mb-3 text-center text-2xl font-bold">The Line</h1>

      {/* HUD */}
      <div className="mb-3 flex items-center justify-between rounded-lg border bg-card px-4 py-2">
        <div className="text-sm">
          Score: <span className="font-bold text-brand-500">{score}</span>
        </div>
        <div className="text-sm">
          <span className="font-medium text-muted-foreground">{rushLabel}</span>
        </div>
        <div className="text-sm">
          Strikes:{' '}
          <span className="font-bold text-red-400">
            {'❌'.repeat(strikes)}
            {'⬜'.repeat(Math.max(0, 3 - strikes))}
          </span>
        </div>
      </div>

      {/* Canvas */}
      <div className="flex justify-center">
        <canvas
          ref={canvasRef}
          width={W}
          height={H}
          className="rounded-lg border-2 border-border"
          style={{ maxWidth: '100%', touchAction: 'none' }}
        />
      </div>

      <div className="mt-3 text-center text-xs text-muted-foreground">
        Tap items → stations. Tap stations to pull when green. Q/W/A/S to pull · E to auto-assign.
      </div>
    </div>
  )
}
