'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { submitRaffleEntry } from '@/lib/raffle/actions'

/* ── constants ──────────────────────────────────────────────── */
const GRID = 16
const CELL = 24
const SIZE = GRID * CELL // 384px
const INITIAL_SPEED = 150
const SPEED_STEP = 5
const MIN_SPEED = 60

type Dir = 'UP' | 'DOWN' | 'LEFT' | 'RIGHT'
type Pos = { x: number; y: number }

const FOODS = ['🍅', '🧅', '🥩', '🌶️', '🧄', '🥕', '🍋', '🧀', '🥦', '🍗', '🥚', '🫒', '🍄', '🌽']

function randomPos(exclude: Pos[]): Pos {
  let p: Pos
  do {
    p = { x: Math.floor(Math.random() * GRID), y: Math.floor(Math.random() * GRID) }
  } while (exclude.some((e) => e.x === p.x && e.y === p.y))
  return p
}

type Props = {
  roundId: string
  onClose: () => void
  onEntryEarned: (totalEntries: number, alias: string) => void
}

export function RaffleGameModal({ roundId, onClose, onEntryEarned }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [score, setScore] = useState(0)
  const [gameOver, setGameOver] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const hasSubmittedRef = useRef(false)

  const stateRef = useRef({
    snake: [
      { x: 8, y: 8 },
      { x: 7, y: 8 },
      { x: 6, y: 8 },
    ] as Pos[],
    dir: 'RIGHT' as Dir,
    nextDir: 'RIGHT' as Dir,
    food: { pos: { x: 12, y: 8 }, emoji: '🍅' },
    score: 0,
    eaten: 0,
    speed: INITIAL_SPEED,
    running: true,
  })

  // Submit score as raffle entry on game over
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

  const reset = useCallback(() => {
    const s = stateRef.current
    s.snake = [
      { x: 8, y: 8 },
      { x: 7, y: 8 },
      { x: 6, y: 8 },
    ]
    s.dir = 'RIGHT'
    s.nextDir = 'RIGHT'
    s.score = 0
    s.eaten = 0
    s.speed = INITIAL_SPEED
    s.running = true
    s.food = { pos: randomPos(s.snake), emoji: FOODS[Math.floor(Math.random() * FOODS.length)] }
    setScore(0)
    setGameOver(false)
  }, [])

  // Keyboard controls
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
        return
      }
      const s = stateRef.current
      if (e.code === 'Space' && !s.running && !submitted) {
        e.preventDefault()
        reset()
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
      const nd = map[e.code]
      if (!nd) return
      e.preventDefault()
      const opp: Record<Dir, Dir> = { UP: 'DOWN', DOWN: 'UP', LEFT: 'RIGHT', RIGHT: 'LEFT' }
      if (opp[nd] !== s.dir) s.nextDir = nd
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [reset, onClose, submitted])

  // Touch controls
  const touchStartRef = useRef<{ x: number; y: number } | null>(null)
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const onTouchStart = (e: TouchEvent) => {
      e.preventDefault()
      const t = e.touches[0]
      touchStartRef.current = { x: t.clientX, y: t.clientY }
    }

    const onTouchEnd = (e: TouchEvent) => {
      e.preventDefault()
      const s = stateRef.current
      const start = touchStartRef.current
      if (!start) return

      const t = e.changedTouches[0]
      const dx = t.clientX - start.x
      const dy = t.clientY - start.y

      if (!s.running && !submitted) {
        reset()
        touchStartRef.current = null
        return
      }

      if (Math.abs(dx) < 15 && Math.abs(dy) < 15) {
        touchStartRef.current = null
        return
      }

      const opp: Record<Dir, Dir> = { UP: 'DOWN', DOWN: 'UP', LEFT: 'RIGHT', RIGHT: 'LEFT' }
      let nd: Dir
      if (Math.abs(dx) > Math.abs(dy)) {
        nd = dx > 0 ? 'RIGHT' : 'LEFT'
      } else {
        nd = dy > 0 ? 'DOWN' : 'UP'
      }
      if (opp[nd] !== s.dir) s.nextDir = nd
      touchStartRef.current = null
    }

    canvas.addEventListener('touchstart', onTouchStart, { passive: false })
    canvas.addEventListener('touchend', onTouchEnd, { passive: false })
    return () => {
      canvas.removeEventListener('touchstart', onTouchStart)
      canvas.removeEventListener('touchend', onTouchEnd)
    }
  }, [reset, submitted])

  // Game loop
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!
    let timer: ReturnType<typeof setTimeout>

    function tick() {
      const s = stateRef.current
      if (!s.running) return

      s.dir = s.nextDir
      const head = { ...s.snake[0] }
      if (s.dir === 'UP') head.y--
      if (s.dir === 'DOWN') head.y++
      if (s.dir === 'LEFT') head.x--
      if (s.dir === 'RIGHT') head.x++

      // Collision
      if (
        head.x < 0 ||
        head.x >= GRID ||
        head.y < 0 ||
        head.y >= GRID ||
        s.snake.some((seg) => seg.x === head.x && seg.y === head.y)
      ) {
        s.running = false
        setGameOver(true)
        setScore(s.score)
        draw()

        // Auto-submit entry if score > 0
        if (s.score > 0) {
          handleSubmitEntry(s.score)
        }
        return
      }

      s.snake.unshift(head)

      // Eat food?
      if (head.x === s.food.pos.x && head.y === s.food.pos.y) {
        s.score += 10
        s.eaten++
        setScore(s.score)

        if (s.eaten % 5 === 0) {
          s.speed = Math.max(MIN_SPEED, s.speed - SPEED_STEP)
        }

        s.food = {
          pos: randomPos(s.snake),
          emoji: FOODS[Math.floor(Math.random() * FOODS.length)],
        }
      } else {
        s.snake.pop()
      }

      draw()
      timer = setTimeout(tick, s.speed)
    }

    function draw() {
      const s = stateRef.current

      // Background
      ctx.fillStyle = '#1a1a2e'
      ctx.fillRect(0, 0, SIZE, SIZE)

      // Grid
      ctx.strokeStyle = '#ffffff08'
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

      // Food
      ctx.font = `${CELL - 4}px serif`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(s.food.emoji, s.food.pos.x * CELL + CELL / 2, s.food.pos.y * CELL + CELL / 2)

      // Snake
      s.snake.forEach((seg, i) => {
        if (i === 0) {
          ctx.fillStyle = '#e88f47'
          ctx.beginPath()
          ctx.roundRect(seg.x * CELL + 1, seg.y * CELL + 1, CELL - 2, CELL - 2, 6)
          ctx.fill()
          ctx.fillStyle = '#fff'
          const ex = seg.x * CELL + CELL / 2
          const ey = seg.y * CELL + CELL / 2
          ctx.beginPath()
          ctx.arc(ex - 3, ey - 3, 2, 0, Math.PI * 2)
          ctx.arc(ex + 3, ey - 3, 2, 0, Math.PI * 2)
          ctx.fill()
        } else {
          const alpha = 1 - (i / s.snake.length) * 0.6
          ctx.fillStyle = `rgba(232, 143, 71, ${alpha})`
          ctx.beginPath()
          ctx.roundRect(seg.x * CELL + 2, seg.y * CELL + 2, CELL - 4, CELL - 4, 4)
          ctx.fill()
        }
      })

      // Game over overlay
      if (!s.running) {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)'
        ctx.fillRect(0, 0, SIZE, SIZE)
        ctx.fillStyle = '#e88f47'
        ctx.font = 'bold 28px sans-serif'
        ctx.textAlign = 'center'
        ctx.fillText('Game Over!', SIZE / 2, SIZE / 2 - 20)
        ctx.fillStyle = '#fff'
        ctx.font = '18px sans-serif'
        ctx.fillText(`Score: ${s.score}`, SIZE / 2, SIZE / 2 + 12)
      }
    }

    tick()
    return () => clearTimeout(timer)
  }, [gameOver, handleSubmitEntry])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
      <div className="relative w-full max-w-md rounded-2xl border border-stone-700 bg-stone-900 p-4 shadow-2xl">
        {/* Header */}
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

        {/* Score */}
        <div className="mb-2 text-center text-lg font-bold text-stone-100">
          Score: <span className="text-brand-500">{score}</span>
        </div>

        {/* Canvas */}
        <div className="flex justify-center">
          <canvas
            ref={canvasRef}
            width={SIZE}
            height={SIZE}
            className="rounded-lg border-2 border-stone-700"
            style={{ maxWidth: '100%', aspectRatio: '1 / 1', touchAction: 'none' }}
          />
        </div>

        {/* Status bar */}
        <div className="mt-3 text-center text-sm">
          {!gameOver && (
            <p className="text-stone-400">Swipe or arrow keys to move. Collect food!</p>
          )}
          {gameOver && submitting && (
            <p className="text-brand-400 animate-pulse">Submitting your entry...</p>
          )}
          {gameOver && submitted && (
            <p className="text-emerald-400 font-medium">Raffle entry earned! Score: {score}</p>
          )}
          {gameOver && submitError && <p className="text-red-400">{submitError}</p>}
          {gameOver && score === 0 && !submitting && !submitted && (
            <p className="text-stone-400">Score at least 10 points to earn a raffle entry.</p>
          )}
        </div>

        {/* Action buttons */}
        {gameOver && (
          <div className="mt-3 flex gap-2 justify-center">
            {!submitted && !submitting && score > 0 && submitError && (
              <button
                onClick={() => {
                  hasSubmittedRef.current = false
                  handleSubmitEntry(score)
                }}
                className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
              >
                Retry Submit
              </button>
            )}
            <button
              onClick={onClose}
              className="rounded-lg bg-stone-700 px-4 py-2 text-sm font-medium text-stone-200 hover:bg-stone-600"
            >
              {submitted ? 'Done' : 'Close'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
