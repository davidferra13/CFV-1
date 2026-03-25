'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { submitRaffleEntry } from '@/lib/raffle/actions'
// Snake utility types and functions (inlined from removed lib/games/snake-utils)
type Dir = 'UP' | 'DOWN' | 'LEFT' | 'RIGHT'

const OPPOSITE: Record<Dir, Dir> = { UP: 'DOWN', DOWN: 'UP', LEFT: 'RIGHT', RIGHT: 'LEFT' }

function positionsEqual(a: Pos, b: Pos): boolean {
  return a.x === b.x && a.y === b.y
}

function queueDirection(queue: Dir[], requested: Dir, current: Dir, maxBuffered = 2): Dir[] {
  const anchor = queue[queue.length - 1] ?? current
  if (requested === anchor || OPPOSITE[requested] === anchor || queue.length >= maxBuffered)
    return queue
  return [...queue, requested]
}

function nextHeadPosition(head: Pos, dir: Dir): Pos {
  if (dir === 'UP') return { x: head.x, y: head.y - 1 }
  if (dir === 'DOWN') return { x: head.x, y: head.y + 1 }
  if (dir === 'LEFT') return { x: head.x - 1, y: head.y }
  return { x: head.x + 1, y: head.y }
}

function collidesWithBody(snake: Pos[], nextHead: Pos, willGrow: boolean): boolean {
  const body = willGrow ? snake : snake.slice(0, -1)
  return body.some((segment) => positionsEqual(segment, nextHead))
}

function randomOpenPosition(grid: number, blocked: Pos[]): Pos {
  const blockedSet = new Set(blocked.map((p) => `${p.x}:${p.y}`))
  for (let i = 0; i < 200; i++) {
    const candidate = { x: Math.floor(Math.random() * grid), y: Math.floor(Math.random() * grid) }
    if (!blockedSet.has(`${candidate.x}:${candidate.y}`)) return candidate
  }
  for (let y = 0; y < grid; y++) {
    for (let x = 0; x < grid; x++) {
      if (!blockedSet.has(`${x}:${y}`)) return { x, y }
    }
  }
  throw new Error('No open positions available')
}

const GRID = 16
const CELL = 24
const SIZE = GRID * CELL
const INITIAL_SPEED = 230
const SPEED_STEP = 3
const MIN_SPEED = 118
const FOOD_POINTS = 10
const MOBILE_BREAKPOINT_PX = 900

type Pos = { x: number; y: number }
type GamePhase = 'running' | 'paused' | 'over'
type ControlMode = 'swipe' | 'tap-turn'

const FOOD_TOMATO = '\u{1F345}'
const FOOD_ONION = '\u{1F9C5}'
const FOOD_MEAT = '\u{1F969}'
const FOOD_PEPPER = '\u{1F336}\u{FE0F}'
const FOOD_GARLIC = '\u{1F9C4}'
const FOOD_CARROT = '\u{1F955}'
const FOOD_LEMON = '\u{1F34B}'
const FOOD_CHEESE = '\u{1F9C0}'
const FOOD_BROCCOLI = '\u{1F966}'
const FOOD_CHICKEN = '\u{1F357}'
const FOOD_EGG = '\u{1F95A}'
const FOOD_BELL_PEPPER = '\u{1FAD1}'
const FOOD_MUSHROOM = '\u{1F344}'
const FOOD_CORN = '\u{1F33D}'

const FOODS = [
  FOOD_TOMATO,
  FOOD_ONION,
  FOOD_MEAT,
  FOOD_PEPPER,
  FOOD_GARLIC,
  FOOD_CARROT,
  FOOD_LEMON,
  FOOD_CHEESE,
  FOOD_BROCCOLI,
  FOOD_CHICKEN,
  FOOD_EGG,
  FOOD_BELL_PEPPER,
  FOOD_MUSHROOM,
  FOOD_CORN,
]

type Props = {
  roundId: string
  onClose: () => void
  onEntryEarned: (totalEntries: number, alias: string) => void
}

type GameState = {
  snake: Pos[]
  dir: Dir
  queue: Dir[]
  food: { pos: Pos; emoji: string }
  score: number
  eaten: number
  speed: number
  phase: GamePhase
}

function createInitialState(): GameState {
  const snake = [
    { x: 8, y: 8 },
    { x: 7, y: 8 },
    { x: 6, y: 8 },
  ]
  return {
    snake,
    dir: 'RIGHT',
    queue: [],
    food: {
      pos: randomOpenPosition(GRID, snake),
      emoji: FOODS[Math.floor(Math.random() * FOODS.length)],
    },
    score: 0,
    eaten: 0,
    speed: INITIAL_SPEED,
    phase: 'running',
  }
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
  const widthBudget = viewportWidth - 64
  const heightBudget = viewportHeight - 360
  return Math.max(240, Math.min(SIZE, Math.floor(Math.min(widthBudget, heightBudget))))
}

export function RaffleGameModal({ roundId, onClose, onEntryEarned }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const touchAreaRef = useRef<HTMLDivElement>(null)
  const stateRef = useRef<GameState>(createInitialState())
  const hasSubmittedRef = useRef(false)
  const touchStartRef = useRef<{ x: number; y: number } | null>(null)

  const [controlMode, setControlMode] = useState<ControlMode>('tap-turn')
  const [isMobile, setIsMobile] = useState(false)
  const [boardSizePx, setBoardSizePx] = useState(SIZE)
  const [score, setScore] = useState(0)
  const [phase, setPhase] = useState<GamePhase>('running')
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const handleSubmitEntry = useCallback(
    async (finalScore: number) => {
      if (hasSubmittedRef.current) return
      hasSubmittedRef.current = true
      setSubmitting(true)
      setSubmitError(null)

      try {
        const result = await submitRaffleEntry(roundId, finalScore)
        if (result.success) {
          setSubmitted(true)
          onEntryEarned(result.totalEntries || 0, result.alias || '')
        } else {
          setSubmitError(result.error || 'Failed to submit entry.')
        }
      } catch {
        setSubmitError('Something went wrong. Please try again.')
      } finally {
        setSubmitting(false)
      }
    },
    [roundId, onEntryEarned]
  )

  const resetGame = useCallback(() => {
    if (submitted) return
    stateRef.current = createInitialState()
    setScore(0)
    setPhase('running')
    setSubmitError(null)
    hasSubmittedRef.current = false
  }, [submitted])

  const queueTurn = useCallback((next: Dir) => {
    const state = stateRef.current
    if (state.phase !== 'running') return
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
    const onKeyDown = (e: KeyboardEvent) => {
      const state = stateRef.current
      if (e.key === 'Escape') {
        onClose()
        return
      }

      if (e.code === 'Space') {
        e.preventDefault()
        if (state.phase === 'paused') {
          state.phase = 'running'
          setPhase('running')
          return
        }
        if (state.phase === 'over' && !submitted) {
          resetGame()
        }
        return
      }

      if (e.code === 'KeyP' && state.phase !== 'over') {
        e.preventDefault()
        state.phase = state.phase === 'running' ? 'paused' : 'running'
        setPhase(state.phase)
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
      queueTurn(nextDirection)
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [onClose, queueTurn, resetGame, submitted])

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

      if (state.phase === 'over' && !submitted) {
        resetGame()
        touchStartRef.current = null
        return
      }

      if (state.phase !== 'running') {
        touchStartRef.current = null
        return
      }

      const t = e.changedTouches[0]
      const dx = t.clientX - start.x
      const dy = t.clientY - start.y
      const absDx = Math.abs(dx)
      const absDy = Math.abs(dy)
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

      const nextDirection: Dir =
        absDx > absDy ? (dx > 0 ? 'RIGHT' : 'LEFT') : dy > 0 ? 'DOWN' : 'UP'

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
  }, [controlMode, resetGame, submitted])

  useEffect(() => {
    const onVisibilityChange = () => {
      const state = stateRef.current
      if (document.visibilityState !== 'visible' && state.phase === 'running') {
        state.phase = 'paused'
        setPhase('paused')
      }
    }

    document.addEventListener('visibilitychange', onVisibilityChange)
    return () => document.removeEventListener('visibilitychange', onVisibilityChange)
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let raf = 0
    let previousFrameAt = 0
    let accumulator = 0

    function gameOver(state: GameState) {
      state.phase = 'over'
      setPhase('over')
      setScore(state.score)
      vibrate(80)

      if (state.score > 0) {
        handleSubmitEntry(state.score)
      }
    }

    function update() {
      const state = stateRef.current
      if (state.phase !== 'running') return

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

      if (!willGrow) {
        state.snake.pop()
        return
      }

      state.score += FOOD_POINTS
      state.eaten++
      setScore(state.score)
      vibrate(12)

      if (state.eaten % 7 === 0) {
        state.speed = Math.max(MIN_SPEED, state.speed - SPEED_STEP)
      }

      state.food = {
        pos: randomOpenPosition(GRID, state.snake),
        emoji: FOODS[Math.floor(Math.random() * FOODS.length)],
      }
    }

    function draw() {
      if (!ctx) return
      const state = stateRef.current

      const gradient = ctx.createLinearGradient(0, 0, SIZE, SIZE)
      gradient.addColorStop(0, '#111827')
      gradient.addColorStop(1, '#1f2937')
      ctx.fillStyle = gradient
      ctx.fillRect(0, 0, SIZE, SIZE)

      ctx.strokeStyle = '#ffffff0a'
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

      ctx.font = `${CELL - 4}px "Segoe UI Emoji", serif`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(
        state.food.emoji,
        state.food.pos.x * CELL + CELL / 2,
        state.food.pos.y * CELL + CELL / 2
      )

      state.snake.forEach((segment, i) => {
        if (i === 0) {
          ctx.fillStyle = '#e88f47'
          ctx.beginPath()
          ctx.roundRect(segment.x * CELL + 1, segment.y * CELL + 1, CELL - 2, CELL - 2, 6)
          ctx.fill()
        } else {
          const alpha = 1 - (i / state.snake.length) * 0.65
          ctx.fillStyle = `rgba(232, 143, 71, ${Math.max(0.25, alpha)})`
          ctx.beginPath()
          ctx.roundRect(segment.x * CELL + 2, segment.y * CELL + 2, CELL - 4, CELL - 4, 4)
          ctx.fill()
        }
      })

      if (state.phase === 'paused' || state.phase === 'over') {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)'
        ctx.fillRect(0, 0, SIZE, SIZE)
        ctx.textAlign = 'center'

        if (state.phase === 'paused') {
          ctx.fillStyle = '#f97316'
          ctx.font = 'bold 28px system-ui'
          ctx.fillText('Paused', SIZE / 2, SIZE / 2 - 12)
          ctx.fillStyle = '#e5e7eb'
          ctx.font = '14px system-ui'
          ctx.fillText('Press Space or Resume', SIZE / 2, SIZE / 2 + 18)
        }

        if (state.phase === 'over') {
          ctx.fillStyle = '#f97316'
          ctx.font = 'bold 28px system-ui'
          ctx.fillText('Game Over', SIZE / 2, SIZE / 2 - 20)
          ctx.fillStyle = '#f3f4f6'
          ctx.font = '18px system-ui'
          ctx.fillText(`Score: ${state.score}`, SIZE / 2, SIZE / 2 + 10)
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
          update()
          accumulator -= state.speed
        }
      }

      draw()
      raf = requestAnimationFrame(frame)
    }

    raf = requestAnimationFrame(frame)
    return () => cancelAnimationFrame(raf)
  }, [handleSubmitEntry])

  const onPauseToggle = () => {
    const state = stateRef.current
    if (state.phase === 'over') return
    state.phase = state.phase === 'running' ? 'paused' : 'running'
    setPhase(state.phase)
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-3"
      style={{ overscrollBehavior: 'contain' }}
    >
      <div className="relative w-full max-w-md rounded-2xl border border-stone-700 bg-stone-900 p-3 shadow-2xl sm:p-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-bold text-stone-100">Raffle Snake</h2>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-stone-400 hover:bg-stone-800 hover:text-stone-200"
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="mb-2 text-center text-lg font-bold text-stone-100">
          Score: <span className="text-brand-500">{score}</span>
        </div>

        <div
          ref={touchAreaRef}
          className="rounded-xl border border-stone-700/70 bg-stone-950/30 p-2"
          style={{ touchAction: 'none', overscrollBehavior: 'contain' }}
        >
          <div className="flex justify-center">
            <canvas
              ref={canvasRef}
              width={SIZE}
              height={SIZE}
              className="rounded-lg border-2 border-stone-700"
              style={{
                width: boardSizePx,
                height: boardSizePx,
                maxWidth: '100%',
                aspectRatio: '1 / 1',
              }}
            />
          </div>
        </div>

        <div className="mt-3 flex items-center justify-center gap-2">
          <button
            onClick={() => setControlMode('tap-turn')}
            className={`min-h-10 rounded-full border px-4 py-1.5 text-xs font-semibold ${
              controlMode === 'tap-turn'
                ? 'border-brand-500 bg-brand-500/20 text-brand-400'
                : 'border-stone-700 text-stone-300'
            }`}
          >
            Tap Turn
          </button>
          <button
            onClick={() => setControlMode('swipe')}
            className={`min-h-10 rounded-full border px-4 py-1.5 text-xs font-semibold ${
              controlMode === 'swipe'
                ? 'border-brand-500 bg-brand-500/20 text-brand-400'
                : 'border-stone-700 text-stone-300'
            }`}
          >
            Swipe
          </button>
        </div>

        <div className="mx-auto mt-3 grid w-full max-w-xs grid-cols-3 gap-3 rounded-2xl border border-stone-700/70 bg-stone-950/40 p-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
          <button
            onClick={() => queueTurn('UP')}
            className="col-start-2 flex min-h-14 items-center justify-center rounded-xl border border-stone-700 text-base font-bold text-stone-200"
          >
            {'\u2191'}
          </button>
          <button
            onClick={() => queueTurn('LEFT')}
            className="flex min-h-14 items-center justify-center rounded-xl border border-stone-700 text-base font-bold text-stone-200"
          >
            {'\u2190'}
          </button>
          <button
            onClick={() => queueTurn('DOWN')}
            className="flex min-h-14 items-center justify-center rounded-xl border border-stone-700 text-base font-bold text-stone-200"
          >
            {'\u2193'}
          </button>
          <button
            onClick={() => queueTurn('RIGHT')}
            className="flex min-h-14 items-center justify-center rounded-xl border border-stone-700 text-base font-bold text-stone-200"
          >
            {'\u2192'}
          </button>
        </div>

        <div className="mt-3 text-center text-sm">
          {phase === 'running' && (
            <p className="text-stone-400">
              {controlMode === 'tap-turn'
                ? 'Tap left or right half of the board to turn.'
                : 'Swipe in the board area to turn.'}{' '}
              {isMobile ? 'Mobile mode active.' : 'Desktop mode active.'}
            </p>
          )}
          {phase === 'paused' && <p className="text-amber-400">Paused</p>}
          {phase === 'over' && submitting && (
            <p className="animate-pulse text-brand-400">Submitting your entry...</p>
          )}
          {phase === 'over' && submitted && (
            <p className="font-medium text-emerald-400">Raffle entry earned! Score: {score}</p>
          )}
          {phase === 'over' && submitError && <p className="text-red-400">{submitError}</p>}
          {phase === 'over' && score === 0 && !submitting && !submitted && (
            <p className="text-stone-400">Score at least 10 points to earn a raffle entry.</p>
          )}
        </div>

        <div className="mt-3 flex justify-center gap-2">
          {phase !== 'over' && (
            <button
              onClick={onPauseToggle}
              className="min-h-11 rounded-lg bg-stone-700 px-4 py-2 text-sm font-medium text-stone-200 hover:bg-stone-600"
            >
              {phase === 'paused' ? 'Resume' : 'Pause'}
            </button>
          )}

          {phase === 'over' && !submitted && !submitting && (
            <button
              onClick={resetGame}
              className="min-h-11 rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
            >
              Play Again
            </button>
          )}

          {phase === 'over' && !submitted && !submitting && score > 0 && submitError && (
            <button
              onClick={() => {
                hasSubmittedRef.current = false
                handleSubmitEntry(score)
              }}
              className="min-h-11 rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
            >
              Retry Submit
            </button>
          )}

          <button
            onClick={onClose}
            className="min-h-11 rounded-lg bg-stone-700 px-4 py-2 text-sm font-medium text-stone-200 hover:bg-stone-600"
          >
            {submitted ? 'Done' : 'Close'}
          </button>
        </div>
      </div>
    </div>
  )
}
