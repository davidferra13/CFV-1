'use client'

import Link from 'next/link'
import { useCallback, useEffect, useRef, useState } from 'react'
import {
  type Dir,
  collidesWithBody,
  nextHeadPosition,
  positionsEqual,
  queueDirection,
  randomOpenPosition,
} from '@/lib/games/snake-utils'

const GRID = 20
const CELL = 24
const SIZE = GRID * CELL
const HIGH_SCORE_KEY = 'chefflow-snake-hi'
const BASE_FOOD_POINTS = 10
const BONUS_FOOD_POINTS = 35
const RECIPE_BONUS = 50
const MOBILE_BREAKPOINT_PX = 900

type GamePhase = 'ready' | 'running' | 'paused' | 'over'
type DifficultyKey = 'prep' | 'service' | 'rush'
type FoodKind = 'normal' | 'bonus'
type ControlMode = 'swipe' | 'tap-turn'
type SnakeSkin = 'classic' | 'hotdog'
type Pos = { x: number; y: number }

const TOPPING_MUSTARD = 1
const TOPPING_KETCHUP = 2
const TOPPING_RELISH = 4
const TOPPING_ONION = 8

const HOTDOG_TOPPING_POOL = [
  0,
  TOPPING_MUSTARD,
  TOPPING_KETCHUP,
  TOPPING_RELISH,
  TOPPING_ONION,
  TOPPING_MUSTARD | TOPPING_KETCHUP,
  TOPPING_MUSTARD | TOPPING_RELISH,
  TOPPING_KETCHUP | TOPPING_ONION,
  TOPPING_MUSTARD | TOPPING_KETCHUP | TOPPING_RELISH,
]

const HOTDOG_COLORS = {
  bunTop: '#f2d39c',
  bunBottom: '#deb879',
  bunEdge: '#b98955',
  bunEdgeHead: '#9f6b3d',
  sausage: '#9a4b33',
  sausageEdge: '#6e2f1d',
  mustard: '#f4c514',
  ketchup: '#c32922',
  relish: '#4e9f3d',
  onion: '#f0ecdf',
}

const COMFORT_THEME = {
  bgStart: '#121826',
  bgEnd: '#1c2330',
  grid: '#ffffff05',
  bonusGlow: 'rgba(251, 191, 36, 0.14)',
  recipeFlashOpacity: 0.08,
  overlay: 'rgba(0, 0, 0, 0.62)',
  toneDownOverlay: 'rgba(12, 18, 30, 0.12)',
  classicHead: '#d08a58',
  classicEye: '#f4f0e8',
}

const FOODS = [
  'Ã°Å¸Ââ€¦',
  'Ã°Å¸Â§â€¦',
  'Ã°Å¸Â¥Â©',
  'Ã°Å¸Å’Â¶Ã¯Â¸Â',
  'Ã°Å¸Â§â€ž',
  'Ã°Å¸Â¥â€¢',
  'Ã°Å¸Ââ€¹',
  'Ã°Å¸Â§â‚¬',
  'Ã°Å¸Â¥Â¦',
  'Ã°Å¸Ââ€”',
  'Ã°Å¸Â¥Å¡',
  'Ã°Å¸Â«â€™',
  'Ã°Å¸Ââ€ž',
  'Ã°Å¸Å’Â½',
]

const DIFFICULTY: Record<
  DifficultyKey,
  {
    label: string
    startSpeed: number
    speedStep: number
    minSpeed: number
    bonusWindowMs: number
    neededBias: number
  }
> = {
  prep: {
    label: 'Prep',
    startSpeed: 260,
    speedStep: 3,
    minSpeed: 130,
    bonusWindowMs: 8200,
    neededBias: 0.65,
  },
  service: {
    label: 'Service',
    startSpeed: 225,
    speedStep: 4,
    minSpeed: 108,
    bonusWindowMs: 7600,
    neededBias: 0.7,
  },
  rush: {
    label: 'Rush',
    startSpeed: 190,
    speedStep: 5,
    minSpeed: 92,
    bonusWindowMs: 6800,
    neededBias: 0.8,
  },
}

const RECIPES: { name: string; ingredients: string[] }[] = [
  { name: 'Steak Dinner', ingredients: ['Ã°Å¸Â¥Â©', 'Ã°Å¸Â§â€¦', 'Ã°Å¸Â¥â€¢'] },
  { name: 'Caprese Salad', ingredients: ['Ã°Å¸Ââ€¦', 'Ã°Å¸Â§â‚¬', 'Ã°Å¸Â«â€™'] },
  { name: 'Stir Fry', ingredients: ['Ã°Å¸Å’Â¶Ã¯Â¸Â', 'Ã°Å¸Â¥Â¦', 'Ã°Å¸Â§â€ž'] },
  { name: 'Chicken Soup', ingredients: ['Ã°Å¸Ââ€”', 'Ã°Å¸Â¥â€¢', 'Ã°Å¸Â§â€¦', 'Ã°Å¸Â§â€ž'] },
  { name: 'Omelette', ingredients: ['Ã°Å¸Â¥Å¡', 'Ã°Å¸Â§â‚¬', 'Ã°Å¸Ââ€ž'] },
  { name: 'Pasta Primavera', ingredients: ['Ã°Å¸Ââ€¦', 'Ã°Å¸Â§â€ž', 'Ã°Å¸Â¥Â¦', 'Ã°Å¸Â«â€™'] },
  { name: 'Corn Chowder', ingredients: ['Ã°Å¸Å’Â½', 'Ã°Å¸Â§â€¦', 'Ã°Å¸Â§â‚¬'] },
  { name: 'Lemon Chicken', ingredients: ['Ã°Å¸Ââ€”', 'Ã°Å¸Ââ€¹', 'Ã°Å¸Â§â€ž'] },
  { name: 'Mushroom Risotto', ingredients: ['Ã°Å¸Ââ€ž', 'Ã°Å¸Â§â€¦', 'Ã°Å¸Â§â‚¬', 'Ã°Å¸Â¥Å¡'] },
  { name: 'Spicy Tacos', ingredients: ['Ã°Å¸Â¥Â©', 'Ã°Å¸Å’Â¶Ã¯Â¸Â', 'Ã°Å¸Â§â€¦', 'Ã°Å¸Ââ€¦'] },
]

type SnakeFood = {
  pos: Pos
  emoji: string
  kind: FoodKind
  expiresAt: number | null
}

type HotdogCrashFx = {
  origin: Pos
  startedAt: number
  seed: number
}

type EngineState = {
  snake: Pos[]
  segmentToppings: number[]
  dir: Dir
  queue: Dir[]
  food: SnakeFood
  skin: SnakeSkin
  score: number
  eaten: number
  speed: number
  phase: GamePhase
  recipe: (typeof RECIPES)[number]
  collected: string[]
  recipeFlash: number
  recipesCompleted: number
  combo: number
  bestCombo: number
  lastEatAt: number
  difficulty: DifficultyKey
  crashFx: HotdogCrashFx | null
}

function pickRecipe(last?: string): (typeof RECIPES)[number] {
  const pool = RECIPES.filter((r) => r.name !== last)
  return pool[Math.floor(Math.random() * pool.length)]
}

function countEmoji(list: string[], emoji: string): number {
  return list.filter((entry) => entry === emoji).length
}

function getNeededIngredients(recipe: (typeof RECIPES)[number], collected: string[]): string[] {
  return recipe.ingredients.filter((ingredient) => {
    const required = countEmoji(recipe.ingredients, ingredient)
    const owned = countEmoji(collected, ingredient)
    return owned < required
  })
}

function hasCompletedRecipe(recipe: (typeof RECIPES)[number], collected: string[]): boolean {
  return recipe.ingredients.every(
    (ingredient) => countEmoji(collected, ingredient) >= countEmoji(recipe.ingredients, ingredient)
  )
}

function vibrate(ms: number) {
  if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
    navigator.vibrate(ms)
  }
}

function getRelativeTurn(current: Dir, side: 'LEFT' | 'RIGHT'): Dir {
  if (current === 'UP') return side === 'LEFT' ? 'LEFT' : 'RIGHT'
  if (current === 'DOWN') return side === 'LEFT' ? 'RIGHT' : 'LEFT'
  if (current === 'LEFT') return side === 'LEFT' ? 'DOWN' : 'UP'
  return side === 'LEFT' ? 'UP' : 'DOWN'
}

function getBoardSizePx(viewportWidth: number, viewportHeight: number): number {
  const widthBudget = viewportWidth - 24
  const heightBudget = viewportHeight * 0.56
  return Math.max(280, Math.min(SIZE, Math.floor(Math.min(widthBudget, heightBudget))))
}

function randomToppingBits(): number {
  return HOTDOG_TOPPING_POOL[Math.floor(Math.random() * HOTDOG_TOPPING_POOL.length)]
}

function seedToppings(length: number): number[] {
  const toppings: number[] = []
  for (let i = 0; i < length; i++) {
    toppings.push(randomToppingBits())
  }
  return toppings
}

function hasConnection(segment: Pos, other: Pos | undefined, dx: number, dy: number): boolean {
  if (!other) return false
  return other.x === segment.x + dx && other.y === segment.y + dy
}

function drawHotdogToppings(ctx: CanvasRenderingContext2D, x: number, y: number, toppings: number) {
  if (toppings & TOPPING_MUSTARD) {
    ctx.strokeStyle = HOTDOG_COLORS.mustard
    ctx.lineWidth = 1.6
    ctx.beginPath()
    ctx.moveTo(x + 5, y + 9)
    ctx.lineTo(x + 8, y + 11)
    ctx.lineTo(x + 12, y + 9)
    ctx.lineTo(x + 16, y + 11)
    ctx.lineTo(x + 19, y + 9)
    ctx.stroke()
  }

  if (toppings & TOPPING_KETCHUP) {
    ctx.strokeStyle = HOTDOG_COLORS.ketchup
    ctx.lineWidth = 1.4
    ctx.beginPath()
    ctx.moveTo(x + 5, y + 13)
    ctx.lineTo(x + 9, y + 11)
    ctx.lineTo(x + 13, y + 13)
    ctx.lineTo(x + 17, y + 11)
    ctx.lineTo(x + 19, y + 13)
    ctx.stroke()
  }

  if (toppings & TOPPING_RELISH) {
    ctx.fillStyle = HOTDOG_COLORS.relish
    ctx.fillRect(x + 8, y + 8, 2, 2)
    ctx.fillRect(x + 12, y + 12, 2, 2)
    ctx.fillRect(x + 16, y + 9, 2, 2)
  }

  if (toppings & TOPPING_ONION) {
    ctx.fillStyle = HOTDOG_COLORS.onion
    ctx.fillRect(x + 7, y + 12, 1.6, 1.6)
    ctx.fillRect(x + 10, y + 9, 1.6, 1.6)
    ctx.fillRect(x + 14, y + 12, 1.6, 1.6)
    ctx.fillRect(x + 17, y + 10, 1.6, 1.6)
  }
}

function drawHotdogSegment(
  ctx: CanvasRenderingContext2D,
  segment: Pos,
  previous: Pos | undefined,
  next: Pos | undefined,
  toppings: number,
  isHead: boolean
) {
  const x = segment.x * CELL
  const y = segment.y * CELL
  const baseX = x + 2
  const baseY = y + 2
  const baseW = CELL - 4
  const baseH = CELL - 4

  const connectUp = hasConnection(segment, previous, 0, -1) || hasConnection(segment, next, 0, -1)
  const connectDown = hasConnection(segment, previous, 0, 1) || hasConnection(segment, next, 0, 1)
  const connectLeft = hasConnection(segment, previous, -1, 0) || hasConnection(segment, next, -1, 0)
  const connectRight = hasConnection(segment, previous, 1, 0) || hasConnection(segment, next, 1, 0)

  ctx.fillStyle = HOTDOG_COLORS.bunTop
  ctx.beginPath()
  ctx.roundRect(baseX, baseY, baseW, baseH, 5)
  ctx.fill()

  ctx.fillStyle = HOTDOG_COLORS.bunBottom
  ctx.beginPath()
  ctx.roundRect(baseX, y + CELL * 0.5, baseW, CELL * 0.38, 4)
  ctx.fill()

  if (connectUp) {
    ctx.fillStyle = HOTDOG_COLORS.bunTop
    ctx.fillRect(x + CELL * 0.22, y, CELL * 0.56, CELL * 0.54)
    ctx.fillStyle = HOTDOG_COLORS.bunBottom
    ctx.fillRect(x + CELL * 0.22, y + CELL * 0.22, CELL * 0.56, CELL * 0.28)
  }
  if (connectDown) {
    ctx.fillStyle = HOTDOG_COLORS.bunTop
    ctx.fillRect(x + CELL * 0.22, y + CELL * 0.46, CELL * 0.56, CELL * 0.54)
    ctx.fillStyle = HOTDOG_COLORS.bunBottom
    ctx.fillRect(x + CELL * 0.22, y + CELL * 0.58, CELL * 0.56, CELL * 0.32)
  }
  if (connectLeft) {
    ctx.fillStyle = HOTDOG_COLORS.bunTop
    ctx.fillRect(x, y + CELL * 0.2, CELL * 0.54, CELL * 0.6)
    ctx.fillStyle = HOTDOG_COLORS.bunBottom
    ctx.fillRect(x, y + CELL * 0.54, CELL * 0.54, CELL * 0.26)
  }
  if (connectRight) {
    ctx.fillStyle = HOTDOG_COLORS.bunTop
    ctx.fillRect(x + CELL * 0.46, y + CELL * 0.2, CELL * 0.54, CELL * 0.6)
    ctx.fillStyle = HOTDOG_COLORS.bunBottom
    ctx.fillRect(x + CELL * 0.46, y + CELL * 0.54, CELL * 0.54, CELL * 0.26)
  }

  ctx.fillStyle = HOTDOG_COLORS.sausage
  ctx.beginPath()
  ctx.roundRect(x + CELL * 0.24, y + CELL * 0.34, CELL * 0.52, CELL * 0.32, 4)
  ctx.fill()

  if (connectUp) {
    ctx.fillRect(x + CELL * 0.34, y, CELL * 0.32, CELL * 0.44)
  }
  if (connectDown) {
    ctx.fillRect(x + CELL * 0.34, y + CELL * 0.56, CELL * 0.32, CELL * 0.44)
  }
  if (connectLeft) {
    ctx.fillRect(x, y + CELL * 0.38, CELL * 0.44, CELL * 0.24)
  }
  if (connectRight) {
    ctx.fillRect(x + CELL * 0.56, y + CELL * 0.38, CELL * 0.44, CELL * 0.24)
  }

  ctx.strokeStyle = HOTDOG_COLORS.sausageEdge
  ctx.lineWidth = 0.8
  ctx.strokeRect(x + CELL * 0.24, y + CELL * 0.34, CELL * 0.52, CELL * 0.32)

  drawHotdogToppings(ctx, x, y, toppings)

  ctx.strokeStyle = isHead ? HOTDOG_COLORS.bunEdgeHead : HOTDOG_COLORS.bunEdge
  ctx.lineWidth = isHead ? 1.8 : 1.2
  ctx.beginPath()
  ctx.roundRect(baseX, baseY, baseW, baseH, 5)
  ctx.stroke()

  if (isHead) {
    ctx.strokeStyle = 'rgba(255, 248, 230, 0.55)'
    ctx.lineWidth = 1.1
    ctx.beginPath()
    ctx.moveTo(x + 6, y + 5)
    ctx.lineTo(x + CELL - 7, y + 5)
    ctx.stroke()
  }
}

function drawHotdogCrashEffect(ctx: CanvasRenderingContext2D, crashFx: HotdogCrashFx) {
  const progress = Math.min(1, (performance.now() - crashFx.startedAt) / 650)
  const centerX = crashFx.origin.x * CELL + CELL / 2
  const centerY = crashFx.origin.y * CELL + CELL / 2
  const split = progress * 10

  ctx.fillStyle = 'rgba(242, 211, 156, 0.9)'
  ctx.beginPath()
  ctx.ellipse(centerX - split, centerY, 7, 4, -0.18, 0, Math.PI * 2)
  ctx.ellipse(centerX + split, centerY, 7, 4, 0.18, 0, Math.PI * 2)
  ctx.fill()

  for (let i = 0; i < 8; i++) {
    const angle = ((crashFx.seed + i * 47) % 360) * (Math.PI / 180)
    const distance = 4 + progress * (8 + (i % 3) * 2)
    const px = centerX + Math.cos(angle) * distance
    const py = centerY + Math.sin(angle) * distance
    if (i % 3 === 0) ctx.fillStyle = HOTDOG_COLORS.mustard
    else if (i % 3 === 1) ctx.fillStyle = HOTDOG_COLORS.ketchup
    else ctx.fillStyle = HOTDOG_COLORS.relish
    ctx.fillRect(px - 1, py - 1, 2, 2)
  }
}

function createInitialState(difficulty: DifficultyKey, skin: SnakeSkin): EngineState {
  const recipe = pickRecipe()
  const snake = [
    { x: 10, y: 10 },
    { x: 9, y: 10 },
    { x: 8, y: 10 },
  ]
  return {
    snake,
    segmentToppings: seedToppings(snake.length),
    dir: 'RIGHT',
    queue: [],
    food: {
      pos: randomOpenPosition(GRID, snake),
      emoji: FOODS[0],
      kind: 'normal',
      expiresAt: null,
    },
    skin,
    score: 0,
    eaten: 0,
    speed: DIFFICULTY[difficulty].startSpeed,
    phase: 'ready',
    recipe,
    collected: [],
    recipeFlash: 0,
    recipesCompleted: 0,
    combo: 0,
    bestCombo: 0,
    lastEatAt: 0,
    difficulty,
    crashFx: null,
  }
}

function pickIngredientEmoji(state: EngineState): string {
  const settings = DIFFICULTY[state.difficulty]
  const needed = getNeededIngredients(state.recipe, state.collected)
  if (needed.length > 0 && Math.random() <= settings.neededBias) {
    return needed[Math.floor(Math.random() * needed.length)]
  }
  return FOODS[Math.floor(Math.random() * FOODS.length)]
}

function spawnFood(state: EngineState, _now: number): SnakeFood {
  const pos = randomOpenPosition(GRID, state.snake)

  return {
    pos,
    kind: 'normal',
    emoji: pickIngredientEmoji(state),
    expiresAt: null,
  }
}

export default function SnakeGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const touchAreaRef = useRef<HTMLDivElement>(null)
  const stateRef = useRef<EngineState>(createInitialState('prep', 'classic'))
  const touchStartRef = useRef<{ x: number; y: number } | null>(null)
  const flashTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const [difficulty, setDifficulty] = useState<DifficultyKey>('prep')
  const [controlMode, setControlMode] = useState<ControlMode>('tap-turn')
  const [skin, setSkin] = useState<SnakeSkin>('classic')
  const [comfortVisuals, setComfortVisuals] = useState(true)
  const [isMobile, setIsMobile] = useState(false)
  const [boardSizePx, setBoardSizePx] = useState(SIZE)
  const [phase, setPhase] = useState<GamePhase>('ready')
  const [score, setScore] = useState(0)
  const [highScore, setHighScore] = useState(0)
  const [recipeName, setRecipeName] = useState(stateRef.current.recipe.name)
  const [recipeIngredients, setRecipeIngredients] = useState(stateRef.current.recipe.ingredients)
  const [collected, setCollected] = useState<string[]>([])
  const [recipesCompleted, setRecipesCompleted] = useState(0)
  const [combo, setCombo] = useState(0)
  const [flash, setFlash] = useState('')

  const syncHud = useCallback((state: EngineState) => {
    setPhase(state.phase)
    setSkin(state.skin)
    setScore(state.score)
    setRecipeName(state.recipe.name)
    setRecipeIngredients([...state.recipe.ingredients])
    setCollected([...state.collected])
    setRecipesCompleted(state.recipesCompleted)
    setCombo(state.combo)
  }, [])

  const pushFlash = useCallback((message: string, durationMs = 1200) => {
    if (flashTimerRef.current) {
      clearTimeout(flashTimerRef.current)
      flashTimerRef.current = null
    }
    setFlash(message)
    flashTimerRef.current = setTimeout(() => {
      setFlash('')
      flashTimerRef.current = null
    }, durationMs)
  }, [])

  const prepareState = useCallback(
    (nextDifficulty: DifficultyKey, nextPhase: GamePhase) => {
      const next = createInitialState(nextDifficulty, stateRef.current.skin)
      next.phase = nextPhase
      next.food = spawnFood(next, performance.now())
      stateRef.current = next
      syncHud(next)
    },
    [syncHud]
  )

  const startGame = useCallback(() => {
    prepareState(stateRef.current.difficulty, 'running')
    setFlash('')
  }, [prepareState])

  const pauseGame = useCallback(
    (showMessage = false) => {
      const state = stateRef.current
      if (state.phase !== 'running') return
      state.phase = 'paused'
      setPhase('paused')
      if (showMessage) pushFlash('Paused in background')
    },
    [pushFlash]
  )

  const resumeGame = useCallback(() => {
    const state = stateRef.current
    if (state.phase !== 'paused') return
    state.phase = 'running'
    setPhase('running')
    setFlash('')
  }, [])

  const queueTurn = useCallback((next: Dir) => {
    const state = stateRef.current
    state.queue = queueDirection(state.queue, next, state.dir, 2)
  }, [])

  useEffect(() => {
    const updateViewport = () => {
      const mobile = window.innerWidth < MOBILE_BREAKPOINT_PX
      setIsMobile(mobile)
      setBoardSizePx(getBoardSizePx(window.innerWidth, window.innerHeight))
      setControlMode((current) => {
        if (!mobile) return 'swipe'
        return current
      })
    }

    updateViewport()
    window.addEventListener('resize', updateViewport)
    window.addEventListener('orientationchange', updateViewport)
    return () => {
      window.removeEventListener('resize', updateViewport)
      window.removeEventListener('orientationchange', updateViewport)
    }
  }, [])

  useEffect(() => {
    const saved = Number(localStorage.getItem(HIGH_SCORE_KEY) || '0')
    if (Number.isFinite(saved) && saved > 0) {
      setHighScore(saved)
    }
    prepareState('prep', 'ready')
    return () => {
      if (flashTimerRef.current) clearTimeout(flashTimerRef.current)
    }
  }, [prepareState])

  const updateHighScore = useCallback((nextScore: number) => {
    const saved = Number(localStorage.getItem(HIGH_SCORE_KEY) || '0')
    if (nextScore > saved) {
      localStorage.setItem(HIGH_SCORE_KEY, String(nextScore))
      setHighScore(nextScore)
    }
  }, [])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const state = stateRef.current

      if (e.code === 'KeyR') {
        e.preventDefault()
        startGame()
        return
      }

      if (e.code === 'Space' || e.code === 'Enter') {
        e.preventDefault()
        if (state.phase === 'paused') {
          resumeGame()
          return
        }
        if (state.phase === 'ready' || state.phase === 'over') {
          startGame()
        }
        return
      }

      if (e.code === 'KeyP') {
        e.preventDefault()
        if (state.phase === 'running') {
          pauseGame()
        } else if (state.phase === 'paused') {
          resumeGame()
        }
        return
      }

      if (e.code === 'KeyH') {
        e.preventDefault()
        const nextSkin: SnakeSkin = state.skin === 'classic' ? 'hotdog' : 'classic'
        state.skin = nextSkin
        setSkin(nextSkin)
        if (nextSkin === 'hotdog' && state.segmentToppings.length !== state.snake.length) {
          state.segmentToppings = seedToppings(state.snake.length)
        }
        pushFlash(nextSkin === 'hotdog' ? 'HotDog Snake enabled' : 'Classic snake enabled', 1000)
        return
      }

      if (e.code === 'KeyV') {
        e.preventDefault()
        setComfortVisuals((current) => !current)
        return
      }

      const map: Record<string, Dir> = {
        ArrowUp: 'UP',
        ArrowDown: 'DOWN',
        ArrowLeft: 'LEFT',
        ArrowRight: 'RIGHT',
        KeyW: 'UP',
        KeyS: 'DOWN',
        KeyA: 'LEFT',
        KeyD: 'RIGHT',
      }
      const nextDirection = map[e.code]
      if (!nextDirection) return
      e.preventDefault()
      if (state.phase === 'ready') {
        startGame()
        const runningState = stateRef.current
        runningState.queue = queueDirection(runningState.queue, nextDirection, runningState.dir, 2)
        return
      }
      if (state.phase === 'running') {
        queueTurn(nextDirection)
      }
    }

    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [pauseGame, pushFlash, queueTurn, resumeGame, startGame])

  useEffect(() => {
    const touchArea = touchAreaRef.current
    if (!touchArea) return

    const onTouchStart = (e: TouchEvent) => {
      e.preventDefault()
      const t = e.touches[0]
      touchStartRef.current = { x: t.clientX, y: t.clientY }
    }

    const onTouchMove = (e: TouchEvent) => {
      e.preventDefault()
    }

    const onTouchEnd = (e: TouchEvent) => {
      e.preventDefault()
      const state = stateRef.current
      const start = touchStartRef.current
      if (!start) return

      const t = e.changedTouches[0]
      const dx = t.clientX - start.x
      const dy = t.clientY - start.y
      const absDx = Math.abs(dx)
      const absDy = Math.abs(dy)

      if (state.phase === 'ready' || state.phase === 'over') {
        startGame()
        touchStartRef.current = null
        return
      }

      if (state.phase !== 'running') {
        touchStartRef.current = null
        return
      }

      if (controlMode === 'tap-turn' && absDx < 24 && absDy < 24) {
        const rect = touchArea.getBoundingClientRect()
        const side = t.clientX < rect.left + rect.width / 2 ? 'LEFT' : 'RIGHT'
        const nextDirection = getRelativeTurn(state.dir, side)
        state.queue = queueDirection(state.queue, nextDirection, state.dir, 2)
        touchStartRef.current = null
        return
      }

      if (absDx < 15 && absDy < 15) {
        touchStartRef.current = null
        return
      }

      let nextDirection: Dir
      if (absDx > absDy) {
        nextDirection = dx > 0 ? 'RIGHT' : 'LEFT'
      } else {
        nextDirection = dy > 0 ? 'DOWN' : 'UP'
      }

      state.queue = queueDirection(state.queue, nextDirection, state.dir, 2)
      touchStartRef.current = null
    }

    touchArea.addEventListener('touchstart', onTouchStart, { passive: false })
    touchArea.addEventListener('touchmove', onTouchMove, { passive: false })
    touchArea.addEventListener('touchend', onTouchEnd, { passive: false })
    return () => {
      touchArea.removeEventListener('touchstart', onTouchStart)
      touchArea.removeEventListener('touchmove', onTouchMove)
      touchArea.removeEventListener('touchend', onTouchEnd)
    }
  }, [controlMode, startGame])

  useEffect(() => {
    const onVisibilityChange = () => {
      if (document.visibilityState !== 'visible') {
        pauseGame(true)
      }
    }

    document.addEventListener('visibilitychange', onVisibilityChange)
    return () => document.removeEventListener('visibilitychange', onVisibilityChange)
  }, [pauseGame])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let raf = 0
    let previousFrameAt = 0
    let accumulator = 0

    function gameOver(state: EngineState) {
      state.phase = 'over'
      if (state.skin === 'hotdog') {
        state.crashFx = {
          origin: { x: state.snake[0].x, y: state.snake[0].y },
          startedAt: performance.now(),
          seed: Math.floor(Math.random() * 10000),
        }
      }
      setPhase('over')
      updateHighScore(state.score)
      pushFlash('Game over. Press Space or Start.')
      vibrate(100)
    }

    function update(now: number) {
      const state = stateRef.current
      if (state.phase !== 'running') return

      if (state.segmentToppings.length !== state.snake.length) {
        state.segmentToppings = seedToppings(state.snake.length)
      }

      if (state.food.kind === 'bonus' && state.food.expiresAt && now >= state.food.expiresAt) {
        state.food = spawnFood({ ...state, eaten: state.eaten + 1 }, now)
      }

      if (state.queue.length > 0) {
        state.dir = state.queue.shift() || state.dir
      }

      const nextHead = nextHeadPosition(state.snake[0], state.dir)
      const willGrow = positionsEqual(nextHead, state.food.pos)

      if (nextHead.x < 0 || nextHead.x >= GRID || nextHead.y < 0 || nextHead.y >= GRID) {
        gameOver(state)
        return
      }

      if (collidesWithBody(state.snake, nextHead, willGrow)) {
        gameOver(state)
        return
      }

      state.snake.unshift(nextHead)
      state.segmentToppings.unshift(state.segmentToppings[0] ?? randomToppingBits())

      if (!willGrow) {
        state.snake.pop()
        state.segmentToppings.pop()
        if (state.combo > 0) {
          state.combo = Math.max(0, state.combo - 1)
          setCombo(state.combo)
        }
      } else {
        const elapsedSinceLastEat = now - state.lastEatAt
        state.combo = elapsedSinceLastEat <= 2600 ? state.combo + 1 : 1
        state.bestCombo = Math.max(state.bestCombo, state.combo)
        state.lastEatAt = now
        state.eaten++

        const comboBonus = state.combo >= 3 ? Math.min(25, (state.combo - 2) * 5) : 0
        const foodPoints = state.food.kind === 'bonus' ? BONUS_FOOD_POINTS : BASE_FOOD_POINTS
        state.score += foodPoints + comboBonus
        setScore(state.score)
        setCombo(state.combo)

        if (state.food.kind === 'bonus') {
          pushFlash(`Rush bonus +${foodPoints + comboBonus}`, 1000)
          vibrate(20)
        } else {
          const eatenEmoji = state.food.emoji
          const needed = getNeededIngredients(state.recipe, state.collected)
          if (needed.includes(eatenEmoji)) {
            state.collected.push(eatenEmoji)
            setCollected([...state.collected])
          }

          if (hasCompletedRecipe(state.recipe, state.collected)) {
            state.score += RECIPE_BONUS
            state.recipesCompleted++
            state.recipeFlash = 10
            state.combo += 1
            setScore(state.score)
            setRecipesCompleted(state.recipesCompleted)
            setCombo(state.combo)
            pushFlash(`${state.recipe.name} complete +${RECIPE_BONUS}`, 1400)
            const nextRecipe = pickRecipe(state.recipe.name)
            state.recipe = nextRecipe
            state.collected = []
            setRecipeName(nextRecipe.name)
            setRecipeIngredients([...nextRecipe.ingredients])
            setCollected([])
            vibrate(40)
          }
        }

        if (state.eaten % 6 === 0) {
          const settings = DIFFICULTY[state.difficulty]
          state.speed = Math.max(settings.minSpeed, state.speed - settings.speedStep)
        }

        if (state.segmentToppings.length > 0) {
          state.segmentToppings[state.segmentToppings.length - 1] = randomToppingBits()
        }

        state.food = spawnFood(state, now)
      }

      if (state.recipeFlash > 0) state.recipeFlash--
    }

    function draw() {
      if (!ctx) return
      const state = stateRef.current

      const gradient = ctx.createLinearGradient(0, 0, SIZE, SIZE)
      gradient.addColorStop(0, comfortVisuals ? COMFORT_THEME.bgStart : '#0f172a')
      gradient.addColorStop(1, comfortVisuals ? COMFORT_THEME.bgEnd : '#1f2937')
      ctx.fillStyle = gradient
      ctx.fillRect(0, 0, SIZE, SIZE)

      ctx.strokeStyle = comfortVisuals ? COMFORT_THEME.grid : '#ffffff08'
      ctx.lineWidth = 0.5
      for (let i = 0; i <= GRID; i++) {
        ctx.beginPath()
        ctx.moveTo(i * CELL, 0)
        ctx.lineTo(i * CELL, SIZE)
        ctx.stroke()

        ctx.beginPath()
        ctx.moveTo(0, i * CELL)
        ctx.lineTo(SIZE, i * CELL)
        ctx.stroke()
      }

      if (state.food.kind === 'bonus') {
        ctx.fillStyle = comfortVisuals ? COMFORT_THEME.bonusGlow : 'rgba(251, 191, 36, 0.25)'
        ctx.beginPath()
        ctx.arc(
          state.food.pos.x * CELL + CELL / 2,
          state.food.pos.y * CELL + CELL / 2,
          CELL / 2,
          0,
          Math.PI * 2
        )
        ctx.fill()
      }

      ctx.font = `${CELL - 4}px "Segoe UI Emoji", serif`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(
        state.food.emoji,
        state.food.pos.x * CELL + CELL / 2,
        state.food.pos.y * CELL + CELL / 2
      )

      if (state.skin === 'classic') {
        state.snake.forEach((segment, i) => {
          if (i === 0) {
            ctx.fillStyle = comfortVisuals ? COMFORT_THEME.classicHead : '#e88f47'
            ctx.beginPath()
            ctx.roundRect(segment.x * CELL + 1, segment.y * CELL + 1, CELL - 2, CELL - 2, 6)
            ctx.fill()

            const centerX = segment.x * CELL + CELL / 2
            const centerY = segment.y * CELL + CELL / 2
            const eyeShiftX = state.dir === 'LEFT' ? -3 : state.dir === 'RIGHT' ? 3 : 0
            const eyeShiftY = state.dir === 'UP' ? -3 : state.dir === 'DOWN' ? 3 : 0

            ctx.fillStyle = comfortVisuals ? COMFORT_THEME.classicEye : '#fff'
            ctx.beginPath()
            ctx.arc(centerX - 4 + eyeShiftX, centerY - 3 + eyeShiftY, 1.8, 0, Math.PI * 2)
            ctx.arc(centerX + 4 + eyeShiftX, centerY - 3 + eyeShiftY, 1.8, 0, Math.PI * 2)
            ctx.fill()
          } else {
            const alpha = 1 - (i / state.snake.length) * 0.65
            const bodyAlpha = Math.max(comfortVisuals ? 0.18 : 0.22, alpha)
            ctx.fillStyle = `rgba(232, 143, 71, ${bodyAlpha})`
            ctx.beginPath()
            ctx.roundRect(segment.x * CELL + 2, segment.y * CELL + 2, CELL - 4, CELL - 4, 4)
            ctx.fill()
          }
        })
      } else {
        for (let i = 0; i < state.snake.length; i++) {
          const segment = state.snake[i]
          drawHotdogSegment(
            ctx,
            segment,
            state.snake[i - 1],
            state.snake[i + 1],
            state.segmentToppings[i] ?? 0,
            i === 0
          )
        }
        if (state.phase === 'over' && state.crashFx && !comfortVisuals) {
          drawHotdogCrashEffect(ctx, state.crashFx)
        }
      }

      if (comfortVisuals) {
        ctx.fillStyle = COMFORT_THEME.toneDownOverlay
        ctx.fillRect(0, 0, SIZE, SIZE)
      }

      if (state.recipeFlash > 0) {
        const flashMaxOpacity = comfortVisuals ? COMFORT_THEME.recipeFlashOpacity : 0.22
        ctx.fillStyle = `rgba(249, 115, 22, ${(state.recipeFlash / 10) * flashMaxOpacity})`
        ctx.fillRect(0, 0, SIZE, SIZE)
      }

      if (state.phase === 'ready' || state.phase === 'paused' || state.phase === 'over') {
        ctx.fillStyle = comfortVisuals ? COMFORT_THEME.overlay : 'rgba(0, 0, 0, 0.7)'
        ctx.fillRect(0, 0, SIZE, SIZE)
        ctx.textAlign = 'center'

        if (state.phase === 'ready') {
          ctx.fillStyle = '#f97316'
          ctx.font = 'bold 30px system-ui'
          ctx.fillText('Chef Snake', SIZE / 2, SIZE / 2 - 28)
          ctx.fillStyle = '#e5e7eb'
          ctx.font = '14px system-ui'
          ctx.fillText(
            'Collect recipe ingredients, then cook under pressure.',
            SIZE / 2,
            SIZE / 2 + 4
          )
          ctx.fillText('Press Space or Start to begin.', SIZE / 2, SIZE / 2 + 28)
        }

        if (state.phase === 'paused') {
          ctx.fillStyle = '#f97316'
          ctx.font = 'bold 30px system-ui'
          ctx.fillText('Paused', SIZE / 2, SIZE / 2 - 22)
          ctx.fillStyle = '#e5e7eb'
          ctx.font = '14px system-ui'
          ctx.fillText('Press Space or Resume.', SIZE / 2, SIZE / 2 + 18)
        }

        if (state.phase === 'over') {
          ctx.fillStyle = '#f97316'
          ctx.font = 'bold 30px system-ui'
          ctx.fillText('Game Over', SIZE / 2, SIZE / 2 - 30)
          ctx.fillStyle = '#f3f4f6'
          ctx.font = '20px system-ui'
          ctx.fillText(`Score: ${state.score}`, SIZE / 2, SIZE / 2 + 5)
          ctx.font = '14px system-ui'
          ctx.fillStyle = '#9ca3af'
          ctx.fillText('Press Space or Start to run it back.', SIZE / 2, SIZE / 2 + 34)
        }
      }
    }

    function frame(timestamp: number) {
      if (!previousFrameAt) {
        previousFrameAt = timestamp
      }
      const elapsed = Math.min(120, timestamp - previousFrameAt)
      previousFrameAt = timestamp

      const state = stateRef.current
      if (state.phase === 'running') {
        accumulator += elapsed
        while (accumulator >= state.speed && state.phase === 'running') {
          update(timestamp)
          accumulator -= state.speed
        }
      }

      draw()
      raf = requestAnimationFrame(frame)
    }

    raf = requestAnimationFrame(frame)
    return () => cancelAnimationFrame(raf)
  }, [comfortVisuals, pushFlash, updateHighScore])

  const onDirectionButton = (direction: Dir) => {
    const state = stateRef.current
    if (state.phase === 'ready') {
      startGame()
      const runningState = stateRef.current
      runningState.queue = queueDirection(runningState.queue, direction, runningState.dir, 2)
      return
    }
    if (state.phase === 'running') {
      queueTurn(direction)
    }
  }

  const onPrimaryAction = () => {
    const state = stateRef.current
    if (state.phase === 'paused') {
      resumeGame()
      return
    }
    if (state.phase === 'ready' || state.phase === 'over') {
      startGame()
    }
  }

  const onPauseToggle = () => {
    const state = stateRef.current
    if (state.phase === 'running') {
      pauseGame()
    } else if (state.phase === 'paused') {
      resumeGame()
    }
  }

  const onDifficultyChange = (next: DifficultyKey) => {
    if (stateRef.current.phase === 'running') return
    setDifficulty(next)
    prepareState(next, 'ready')
  }

  const onSkinChange = (nextSkin: SnakeSkin) => {
    const state = stateRef.current
    state.skin = nextSkin
    state.crashFx = null
    if (nextSkin === 'hotdog' && state.segmentToppings.length !== state.snake.length) {
      state.segmentToppings = seedToppings(state.snake.length)
    }
    setSkin(nextSkin)
  }

  return (
    <div
      className="mx-auto max-w-xl select-none px-4 py-4 sm:py-6"
      style={{ overscrollBehavior: 'contain' }}
    >
      <div className="mb-4 flex items-center justify-between">
        <Link href="/games" className="text-sm text-muted-foreground hover:text-foreground">
          &larr; Back to Arcade
        </Link>
        <div className="text-sm text-muted-foreground">
          High Score: <span className="font-bold text-brand-500">{highScore}</span>
        </div>
      </div>

      <h1 className="mb-4 text-center text-2xl font-bold">Chef Snake</h1>

      <div className="mb-3 flex flex-wrap items-center justify-center gap-2">
        {(Object.keys(DIFFICULTY) as DifficultyKey[]).map((key) => (
          <button
            key={key}
            onClick={() => onDifficultyChange(key)}
            disabled={phase === 'running'}
            className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
              difficulty === key
                ? 'border-brand-500 bg-brand-500/20 text-brand-500'
                : 'border-border text-muted-foreground hover:text-foreground'
            } ${phase === 'running' ? 'cursor-not-allowed opacity-40' : ''}`}
          >
            {DIFFICULTY[key].label}
          </button>
        ))}
      </div>

      <div className="mb-3 rounded-lg border bg-card/90 p-3 text-center">
        <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Current Recipe: <span className="text-foreground">{recipeName}</span>
          {recipesCompleted > 0 && (
            <span className="ml-2 text-brand-500">({recipesCompleted} completed)</span>
          )}
        </div>
        <div className="mt-2 flex items-center justify-center gap-2 text-2xl">
          {recipeIngredients.map((ingredient, i) => {
            const collectedCount = countEmoji(collected, ingredient)
            const requiredBefore = countEmoji(recipeIngredients.slice(0, i), ingredient)
            const isCollected = collectedCount > requiredBefore
            return (
              <span
                key={`${ingredient}-${i}`}
                className={`transition-all ${isCollected ? 'scale-110 opacity-100' : 'opacity-30 grayscale'}`}
              >
                {ingredient}
              </span>
            )
          })}
        </div>
        {flash && (
          <div
            className={`mt-1 text-sm font-bold text-brand-500 ${
              comfortVisuals ? '' : 'animate-pulse'
            }`}
          >
            {flash}
          </div>
        )}
      </div>

      <div className="mb-3 text-center text-lg font-bold">
        Score: <span className="text-brand-500">{score}</span>
        {combo > 1 && (
          <span className="ml-2 text-sm font-medium text-amber-400">Combo x{combo}</span>
        )}
      </div>

      <div
        ref={touchAreaRef}
        className="rounded-xl border border-border/50 bg-card/40 p-2"
        style={{ touchAction: 'none', overscrollBehavior: 'contain' }}
      >
        <div className="flex justify-center">
          <canvas
            ref={canvasRef}
            width={SIZE}
            height={SIZE}
            className="rounded-lg border-2 border-border"
            style={{
              width: boardSizePx,
              height: boardSizePx,
              maxWidth: '100%',
              aspectRatio: '1 / 1',
            }}
          />
        </div>
      </div>

      <div className="mt-3 flex flex-wrap justify-center gap-2">
        <button
          onClick={onPrimaryAction}
          className="min-h-11 rounded-md border border-brand-500/50 bg-brand-500/20 px-4 py-2 text-xs font-semibold text-brand-500"
        >
          {phase === 'paused' ? 'Resume' : phase === 'running' ? 'Running' : 'Start'}
        </button>
        <button
          onClick={onPauseToggle}
          className="min-h-11 rounded-md border border-border px-4 py-2 text-xs font-semibold text-muted-foreground"
        >
          {phase === 'paused' ? 'Unpause' : 'Pause'}
        </button>
        <button
          onClick={startGame}
          className="min-h-11 rounded-md border border-border px-4 py-2 text-xs font-semibold text-muted-foreground"
        >
          Restart
        </button>
      </div>

      <div className="mt-3 flex items-center justify-center gap-2">
        <button
          onClick={() => setControlMode('tap-turn')}
          className={`min-h-10 rounded-full border px-4 py-1.5 text-xs font-semibold ${
            controlMode === 'tap-turn'
              ? 'border-brand-500 bg-brand-500/20 text-brand-500'
              : 'border-border text-muted-foreground'
          }`}
        >
          Tap Turn
        </button>
        <button
          onClick={() => setControlMode('swipe')}
          className={`min-h-10 rounded-full border px-4 py-1.5 text-xs font-semibold ${
            controlMode === 'swipe'
              ? 'border-brand-500 bg-brand-500/20 text-brand-500'
              : 'border-border text-muted-foreground'
          }`}
        >
          Swipe
        </button>
      </div>

      <div className="mt-3 flex items-center justify-center gap-2">
        <button
          onClick={() => onSkinChange('classic')}
          className={`min-h-10 rounded-full border px-4 py-1.5 text-xs font-semibold ${
            skin === 'classic'
              ? 'border-brand-500 bg-brand-500/20 text-brand-500'
              : 'border-border text-muted-foreground'
          }`}
        >
          Classic Skin
        </button>
        <button
          onClick={() => onSkinChange('hotdog')}
          className={`min-h-10 rounded-full border px-4 py-1.5 text-xs font-semibold ${
            skin === 'hotdog'
              ? 'border-brand-500 bg-brand-500/20 text-brand-500'
              : 'border-border text-muted-foreground'
          }`}
        >
          HotDog Skin
        </button>
      </div>

      <div className="mt-3 flex items-center justify-center gap-2">
        <button
          onClick={() => setComfortVisuals(true)}
          className={`min-h-10 rounded-full border px-4 py-1.5 text-xs font-semibold ${
            comfortVisuals
              ? 'border-brand-500 bg-brand-500/20 text-brand-500'
              : 'border-border text-muted-foreground'
          }`}
        >
          Comfort Visuals
        </button>
        <button
          onClick={() => setComfortVisuals(false)}
          className={`min-h-10 rounded-full border px-4 py-1.5 text-xs font-semibold ${
            !comfortVisuals
              ? 'border-brand-500 bg-brand-500/20 text-brand-500'
              : 'border-border text-muted-foreground'
          }`}
        >
          Vivid Visuals
        </button>
      </div>

      <div className="sticky bottom-0 z-20 mt-3 rounded-2xl border border-border/60 bg-card/95 p-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] backdrop-blur">
        <div className="mx-auto grid w-full max-w-xs grid-cols-3 gap-3">
          <button
            onClick={() => onDirectionButton('UP')}
            className="col-start-2 flex min-h-14 items-center justify-center rounded-xl border border-border text-base font-bold text-muted-foreground"
            aria-label="Move up"
          >
            Ã¢â€ â€˜
          </button>
          <button
            onClick={() => onDirectionButton('LEFT')}
            className="flex min-h-14 items-center justify-center rounded-xl border border-border text-base font-bold text-muted-foreground"
            aria-label="Move left"
          >
            Ã¢â€ Â
          </button>
          <button
            onClick={() => onDirectionButton('DOWN')}
            className="flex min-h-14 items-center justify-center rounded-xl border border-border text-base font-bold text-muted-foreground"
            aria-label="Move down"
          >
            Ã¢â€ â€œ
          </button>
          <button
            onClick={() => onDirectionButton('RIGHT')}
            className="flex min-h-14 items-center justify-center rounded-xl border border-border text-base font-bold text-muted-foreground"
            aria-label="Move right"
          >
            Ã¢â€ â€™
          </button>
        </div>
      </div>

      <div className="mt-3 text-center text-xs text-muted-foreground">
        {controlMode === 'tap-turn'
          ? 'Tap left/right half of the board to turn relative to direction.'
          : 'Swipe anywhere in the board area to turn.'}{' '}
        Arrow/WASD also work. Press H to switch skin, V for comfort visuals.{' '}
        {isMobile ? 'Mobile mode active.' : 'Desktop mode active.'}
      </div>
    </div>
  )
}
