'use client'

import Link from 'next/link'
import { useCallback, useEffect, useRef, useState } from 'react'

/* ── constants ──────────────────────────────────────────────── */
const GRID = 20
const CELL = 24
const SIZE = GRID * CELL // 480px
const INITIAL_SPEED = 140 // ms per tick
const SPEED_STEP = 5 // ms faster every 5 foods
const MIN_SPEED = 50

type Dir = 'UP' | 'DOWN' | 'LEFT' | 'RIGHT'
type Pos = { x: number; y: number }

const FOODS = ['🍅', '🧅', '🥩', '🌶️', '🧄', '🥕', '🍋', '🧀', '🥦', '🍗', '🥚', '🫒', '🍄', '🌽']

const RECIPES: { name: string; ingredients: string[] }[] = [
  { name: 'Steak Dinner', ingredients: ['🥩', '🧅', '🥕'] },
  { name: 'Caprese Salad', ingredients: ['🍅', '🧀', '🫒'] },
  { name: 'Stir Fry', ingredients: ['🌶️', '🥦', '🧄'] },
  { name: 'Chicken Soup', ingredients: ['🍗', '🥕', '🧅', '🧄'] },
  { name: 'Omelette', ingredients: ['🥚', '🧀', '🍄'] },
  { name: 'Pasta Primavera', ingredients: ['🍅', '🧄', '🥦', '🫒'] },
  { name: 'Corn Chowder', ingredients: ['🌽', '🧅', '🧀'] },
  { name: 'Lemon Chicken', ingredients: ['🍗', '🍋', '🧄'] },
  { name: 'Mushroom Risotto', ingredients: ['🍄', '🧅', '🧀', '🥚'] },
  { name: 'Spicy Tacos', ingredients: ['🥩', '🌶️', '🧅', '🍅'] },
]

function randomPos(exclude: Pos[]): Pos {
  let p: Pos
  do {
    p = { x: Math.floor(Math.random() * GRID), y: Math.floor(Math.random() * GRID) }
  } while (exclude.some((e) => e.x === p.x && e.y === p.y))
  return p
}

function pickRecipe(last?: string): (typeof RECIPES)[number] {
  const pool = RECIPES.filter((r) => r.name !== last)
  return pool[Math.floor(Math.random() * pool.length)]
}

export default function SnakeGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const stateRef = useRef({
    snake: [
      { x: 10, y: 10 },
      { x: 9, y: 10 },
      { x: 8, y: 10 },
    ] as Pos[],
    dir: 'RIGHT' as Dir,
    nextDir: 'RIGHT' as Dir,
    food: { pos: { x: 15, y: 10 }, emoji: '🍅' },
    score: 0,
    eaten: 0,
    speed: INITIAL_SPEED,
    running: true,
    recipe: RECIPES[0],
    collected: [] as string[],
    recipeFlash: 0,
    recipesCompleted: 0,
  })
  const [score, setScore] = useState(0)
  const [gameOver, setGameOver] = useState(false)
  const [highScore, setHighScore] = useState(0)
  const [recipeName, setRecipeName] = useState(RECIPES[0].name)
  const [recipeIngredients, setRecipeIngredients] = useState(RECIPES[0].ingredients)
  const [collected, setCollected] = useState<string[]>([])
  const [recipesCompleted, setRecipesCompleted] = useState(0)
  const [flash, setFlash] = useState('')

  // load high score
  useEffect(() => {
    const saved = localStorage.getItem('chefflow-snake-hi')
    if (saved) setHighScore(Number(saved))
  }, [])

  const reset = useCallback(() => {
    const recipe = pickRecipe()
    const s = stateRef.current
    s.snake = [
      { x: 10, y: 10 },
      { x: 9, y: 10 },
      { x: 8, y: 10 },
    ]
    s.dir = 'RIGHT'
    s.nextDir = 'RIGHT'
    s.score = 0
    s.eaten = 0
    s.speed = INITIAL_SPEED
    s.running = true
    s.recipe = recipe
    s.collected = []
    s.recipeFlash = 0
    s.recipesCompleted = 0
    s.food = { pos: randomPos(s.snake), emoji: FOODS[Math.floor(Math.random() * FOODS.length)] }
    setScore(0)
    setGameOver(false)
    setRecipeName(recipe.name)
    setRecipeIngredients([...recipe.ingredients])
    setCollected([])
    setRecipesCompleted(0)
    setFlash('')
  }, [])

  // keyboard
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const s = stateRef.current
      if (e.code === 'Space' && !s.running) {
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
  }, [reset])

  // touch controls (swipe to change direction, tap to restart)
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
      const absDx = Math.abs(dx)
      const absDy = Math.abs(dy)

      // If game over, any tap restarts
      if (!s.running) {
        reset()
        touchStartRef.current = null
        return
      }

      // Need a minimum swipe distance (15px) to register as a direction change
      if (absDx < 15 && absDy < 15) {
        touchStartRef.current = null
        return
      }

      const opp: Record<Dir, Dir> = { UP: 'DOWN', DOWN: 'UP', LEFT: 'RIGHT', RIGHT: 'LEFT' }
      let nd: Dir
      if (absDx > absDy) {
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
  }, [reset])

  // game loop
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

      // collision check
      if (
        head.x < 0 ||
        head.x >= GRID ||
        head.y < 0 ||
        head.y >= GRID ||
        s.snake.some((seg) => seg.x === head.x && seg.y === head.y)
      ) {
        s.running = false
        // save high score
        if (s.score > Number(localStorage.getItem('chefflow-snake-hi') || '0')) {
          localStorage.setItem('chefflow-snake-hi', String(s.score))
          setHighScore(s.score)
        }
        setGameOver(true)
        draw()
        return
      }

      s.snake.unshift(head)

      // eat food?
      if (head.x === s.food.pos.x && head.y === s.food.pos.y) {
        const eatenEmoji = s.food.emoji
        s.score += 10
        s.eaten++

        // recipe tracking
        const needed = s.recipe.ingredients.filter(
          (ing) =>
            !s.collected.includes(ing) ||
            s.collected.filter((c) => c === ing).length <
              s.recipe.ingredients.filter((i) => i === ing).length
        )
        if (needed.includes(eatenEmoji)) {
          s.collected.push(eatenEmoji)
        }

        // check recipe complete
        const allCollected = s.recipe.ingredients.every((ing) => {
          const need = s.recipe.ingredients.filter((i) => i === ing).length
          const have = s.collected.filter((c) => c === ing).length
          return have >= need
        })

        if (allCollected) {
          s.score += 50
          s.recipesCompleted++
          s.recipeFlash = 8 // flash for 8 frames
          setFlash(`${s.recipe.name} Complete! +50`)
          setRecipesCompleted(s.recipesCompleted)
          const newRecipe = pickRecipe(s.recipe.name)
          s.recipe = newRecipe
          s.collected = []
          setRecipeIngredients([...newRecipe.ingredients])
          setRecipeName(newRecipe.name)
          setCollected([])
          setTimeout(() => setFlash(''), 1500)
        } else {
          setCollected([...s.collected])
        }

        setScore(s.score)

        // speed up
        if (s.eaten % 5 === 0) {
          s.speed = Math.max(MIN_SPEED, s.speed - SPEED_STEP)
        }

        // new food
        s.food = {
          pos: randomPos(s.snake),
          emoji: FOODS[Math.floor(Math.random() * FOODS.length)],
        }
      } else {
        s.snake.pop()
      }

      if (s.recipeFlash > 0) s.recipeFlash--

      draw()
      timer = setTimeout(tick, s.speed)
    }

    function draw() {
      const s = stateRef.current

      // background
      ctx.fillStyle = '#1a1a2e'
      ctx.fillRect(0, 0, SIZE, SIZE)

      // grid lines (subtle)
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

      // food
      ctx.font = `${CELL - 4}px serif`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(s.food.emoji, s.food.pos.x * CELL + CELL / 2, s.food.pos.y * CELL + CELL / 2)

      // snake
      s.snake.forEach((seg, i) => {
        if (i === 0) {
          // head
          ctx.fillStyle = '#e88f47'
          ctx.beginPath()
          ctx.roundRect(seg.x * CELL + 1, seg.y * CELL + 1, CELL - 2, CELL - 2, 6)
          ctx.fill()
          // eyes
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

      // recipe flash
      if (s.recipeFlash > 0) {
        ctx.fillStyle = `rgba(232, 143, 71, ${(s.recipeFlash / 8) * 0.3})`
        ctx.fillRect(0, 0, SIZE, SIZE)
      }

      // game over overlay
      if (!s.running) {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)'
        ctx.fillRect(0, 0, SIZE, SIZE)
        ctx.fillStyle = '#e88f47'
        ctx.font = 'bold 32px sans-serif'
        ctx.textAlign = 'center'
        ctx.fillText('Game Over!', SIZE / 2, SIZE / 2 - 30)
        ctx.fillStyle = '#fff'
        ctx.font = '20px sans-serif'
        ctx.fillText(`Score: ${s.score}`, SIZE / 2, SIZE / 2 + 10)
        ctx.font = '14px sans-serif'
        ctx.fillStyle = '#aaa'
        ctx.fillText('SPACE or tap to restart', SIZE / 2, SIZE / 2 + 45)
      }
    }

    tick()
    return () => clearTimeout(timer)
  }, [gameOver]) // re-run loop on reset

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

      <h1 className="mb-4 text-center text-2xl font-bold">Chef Snake</h1>

      {/* Recipe card */}
      <div className="mb-3 rounded-lg border bg-card p-3 text-center">
        <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Current Recipe: <span className="text-foreground">{recipeName}</span>
          {recipesCompleted > 0 && (
            <span className="ml-2 text-brand-500">({recipesCompleted} completed)</span>
          )}
        </div>
        <div className="mt-2 flex items-center justify-center gap-2 text-2xl">
          {recipeIngredients.map((ing, i) => {
            const isCollected =
              collected.filter((c) => c === ing).length >
              recipeIngredients.slice(0, i).filter((r) => r === ing && collected.includes(r)).length
                ? true
                : collected.includes(ing)
            return (
              <span
                key={i}
                className={`transition-all ${isCollected ? 'scale-110 opacity-100' : 'opacity-30 grayscale'}`}
              >
                {ing}
              </span>
            )
          })}
        </div>
        {flash && (
          <div className="mt-1 animate-pulse text-sm font-bold text-brand-500">{flash}</div>
        )}
      </div>

      {/* Score */}
      <div className="mb-3 text-center text-lg font-bold">
        Score: <span className="text-brand-500">{score}</span>
      </div>

      {/* Canvas */}
      <div className="flex justify-center">
        <canvas
          ref={canvasRef}
          width={SIZE}
          height={SIZE}
          className="rounded-lg border-2 border-border"
          style={{ maxWidth: '100%', aspectRatio: '1 / 1', touchAction: 'none' }}
        />
      </div>

      <div className="mt-4 text-center text-xs text-muted-foreground">
        Swipe or Arrow keys to move &middot; Collect ingredients to complete recipes &middot; +50
        bonus per recipe
      </div>
    </div>
  )
}
