'use client'

import Link from 'next/link'
import { useCallback, useEffect, useRef, useState } from 'react'

/* ── constants ──────────────────────────────────────────────── */
const W = 480
const H = 600
const PLAYER_W = 36
const PLAYER_H = 36
const BULLET_W = 4
const BULLET_H = 12
const ENEMY_SIZE = 28
const POWERUP_SIZE = 20

type Bullet = { x: number; y: number; dx: number }
type Enemy = { x: number; y: number; emoji: string; hp: number; diving: boolean; diveSpeed: number }
type PowerUp = { x: number; y: number; type: 'spread' | 'rapid'; emoji: string; vy: number }
type Particle = { x: number; y: number; vx: number; vy: number; life: number; emoji: string }

const ENEMY_EMOJIS = ['🍅', '🌶️', '🧅', '🥦', '🍆', '🌽', '🥕', '🍄']
const WAVE_MSG = [
  '',
  'Mise en place!',
  'Order up!',
  'Behind!',
  'Hot pan!',
  'Yes, Chef!',
  'Fire!',
  'Corner!',
  'All day!',
]

export default function GalagaGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [score, setScore] = useState(0)
  const [wave, setWave] = useState(1)
  const [lives, setLives] = useState(3)
  const [gameOver, setGameOver] = useState(false)
  const [highScore, setHighScore] = useState(0)
  const [waveMsg, setWaveMsg] = useState('')
  const [powerUpLabel, setPowerUpLabel] = useState('')

  const stateRef = useRef({
    playerX: W / 2 - PLAYER_W / 2,
    bullets: [] as Bullet[],
    enemies: [] as Enemy[],
    powerUps: [] as PowerUp[],
    particles: [] as Particle[],
    keys: new Set<string>(),
    score: 0,
    wave: 1,
    lives: 3,
    running: true,
    shootCooldown: 0,
    powerUp: null as 'spread' | 'rapid' | null,
    powerUpTimer: 0,
    waveDelay: 0,
    enemyDir: 1,
    enemySpeed: 0.5,
    frameCount: 0,
    invincible: 0,
  })

  useEffect(() => {
    const saved = localStorage.getItem('chefflow-galaga-hi')
    if (saved) setHighScore(Number(saved))
  }, [])

  const spawnWave = useCallback((waveNum: number) => {
    const s = stateRef.current
    const rows = Math.min(2 + Math.floor(waveNum / 2), 5)
    const cols = Math.min(4 + waveNum, 10)
    s.enemies = []
    const startX = (W - cols * (ENEMY_SIZE + 10)) / 2
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        s.enemies.push({
          x: startX + c * (ENEMY_SIZE + 10),
          y: 40 + r * (ENEMY_SIZE + 8),
          emoji: ENEMY_EMOJIS[(r + c) % ENEMY_EMOJIS.length],
          hp: 1 + Math.floor(waveNum / 4),
          diving: false,
          diveSpeed: 0,
        })
      }
    }
    s.enemyDir = 1
    s.enemySpeed = 0.5 + waveNum * 0.15
  }, [])

  const reset = useCallback(() => {
    const s = stateRef.current
    s.playerX = W / 2 - PLAYER_W / 2
    s.bullets = []
    s.powerUps = []
    s.particles = []
    s.keys.clear()
    s.score = 0
    s.wave = 1
    s.lives = 3
    s.running = true
    s.shootCooldown = 0
    s.powerUp = null
    s.powerUpTimer = 0
    s.waveDelay = 60
    s.frameCount = 0
    s.invincible = 0
    setScore(0)
    setWave(1)
    setLives(3)
    setGameOver(false)
    setPowerUpLabel('')
    setWaveMsg(WAVE_MSG[1] || 'Wave 1!')
    spawnWave(1)
    setTimeout(() => setWaveMsg(''), 1500)
  }, [spawnWave])

  // keyboard
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !stateRef.current.running) {
        e.preventDefault()
        reset()
        return
      }
      stateRef.current.keys.add(e.code)
      if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Space'].includes(e.code)) {
        e.preventDefault()
      }
    }
    const up = (e: KeyboardEvent) => stateRef.current.keys.delete(e.code)
    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    return () => {
      window.removeEventListener('keydown', down)
      window.removeEventListener('keyup', up)
    }
  }, [reset])

  // touch controls (drag to move, tap to shoot, tap to restart)
  const touchRef = useRef<{ id: number; lastX: number; moved: boolean } | null>(null)
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const onTouchStart = (e: TouchEvent) => {
      e.preventDefault()
      const s = stateRef.current

      // Game over - tap to restart
      if (!s.running) {
        reset()
        return
      }

      const t = e.touches[0]
      touchRef.current = { id: t.identifier, lastX: t.clientX, moved: false }

      // Start auto-shooting while touching
      s.keys.add('Space')
    }

    const onTouchMove = (e: TouchEvent) => {
      e.preventDefault()
      const tr = touchRef.current
      if (!tr) return

      for (let i = 0; i < e.touches.length; i++) {
        const t = e.touches[i]
        if (t.identifier === tr.id) {
          const dx = t.clientX - tr.lastX
          // Scale the drag movement to canvas coordinates
          const rect = canvas.getBoundingClientRect()
          const scale = W / rect.width
          const s = stateRef.current
          s.playerX = Math.max(0, Math.min(W - PLAYER_W, s.playerX + dx * scale))
          tr.lastX = t.clientX
          tr.moved = true
          break
        }
      }
    }

    const onTouchEnd = (e: TouchEvent) => {
      e.preventDefault()
      const s = stateRef.current
      // Stop auto-shooting
      s.keys.delete('Space')
      touchRef.current = null
    }

    canvas.addEventListener('touchstart', onTouchStart, { passive: false })
    canvas.addEventListener('touchmove', onTouchMove, { passive: false })
    canvas.addEventListener('touchend', onTouchEnd, { passive: false })
    canvas.addEventListener('touchcancel', onTouchEnd, { passive: false })
    return () => {
      canvas.removeEventListener('touchstart', onTouchStart)
      canvas.removeEventListener('touchmove', onTouchMove)
      canvas.removeEventListener('touchend', onTouchEnd)
      canvas.removeEventListener('touchcancel', onTouchEnd)
    }
  }, [reset])

  // game loop
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!
    let raf: number

    // initial spawn
    const s = stateRef.current
    if (s.enemies.length === 0 && s.running) {
      spawnWave(1)
      s.waveDelay = 60
    }

    function loop() {
      const s = stateRef.current
      if (!s.running) {
        draw()
        return
      }
      s.frameCount++

      // wave delay
      if (s.waveDelay > 0) {
        s.waveDelay--
        draw()
        raf = requestAnimationFrame(loop)
        return
      }

      // player movement
      const speed = 5
      if (s.keys.has('ArrowLeft') || s.keys.has('KeyA')) s.playerX = Math.max(0, s.playerX - speed)
      if (s.keys.has('ArrowRight') || s.keys.has('KeyD'))
        s.playerX = Math.min(W - PLAYER_W, s.playerX + speed)

      // shooting
      if (s.shootCooldown > 0) s.shootCooldown--
      const shootRate = s.powerUp === 'rapid' ? 4 : 12
      if (s.keys.has('Space') && s.shootCooldown <= 0) {
        const cx = s.playerX + PLAYER_W / 2
        if (s.powerUp === 'spread') {
          s.bullets.push({ x: cx - BULLET_W / 2, y: H - 50, dx: -2 })
          s.bullets.push({ x: cx - BULLET_W / 2, y: H - 50, dx: 0 })
          s.bullets.push({ x: cx - BULLET_W / 2, y: H - 50, dx: 2 })
        } else {
          s.bullets.push({ x: cx - BULLET_W / 2, y: H - 50, dx: 0 })
        }
        s.shootCooldown = shootRate
      }

      // power-up timer
      if (s.powerUpTimer > 0) {
        s.powerUpTimer--
        if (s.powerUpTimer === 0) {
          s.powerUp = null
          setPowerUpLabel('')
        }
      }

      // invincibility timer
      if (s.invincible > 0) s.invincible--

      // update bullets
      s.bullets = s.bullets.filter((b) => {
        b.y -= 8
        b.x += b.dx
        return b.y > -BULLET_H && b.x > -10 && b.x < W + 10
      })

      // update enemies (formation movement)
      let minX = W,
        maxX = 0
      s.enemies.forEach((e) => {
        if (!e.diving) {
          minX = Math.min(minX, e.x)
          maxX = Math.max(maxX, e.x + ENEMY_SIZE)
        }
      })
      if (maxX >= W - 5) s.enemyDir = -1
      if (minX <= 5) s.enemyDir = 1
      s.enemies.forEach((e) => {
        if (!e.diving) {
          e.x += s.enemySpeed * s.enemyDir
        } else {
          e.y += e.diveSpeed
          e.x += Math.sin(s.frameCount * 0.05 + e.x) * 2
        }
      })

      // random dive
      if (s.frameCount % 90 === 0 && s.enemies.length > 0) {
        const nonDiving = s.enemies.filter((e) => !e.diving)
        if (nonDiving.length > 0) {
          const diver = nonDiving[Math.floor(Math.random() * nonDiving.length)]
          diver.diving = true
          diver.diveSpeed = 2.5 + s.wave * 0.3
        }
      }

      // bullet-enemy collision
      s.bullets = s.bullets.filter((b) => {
        let hit = false
        s.enemies = s.enemies.filter((e) => {
          if (
            b.x < e.x + ENEMY_SIZE &&
            b.x + BULLET_W > e.x &&
            b.y < e.y + ENEMY_SIZE &&
            b.y + BULLET_H > e.y
          ) {
            e.hp--
            hit = true
            if (e.hp <= 0) {
              s.score += e.diving ? 20 : 10
              setScore(s.score)
              // particles
              for (let i = 0; i < 4; i++) {
                s.particles.push({
                  x: e.x + ENEMY_SIZE / 2,
                  y: e.y + ENEMY_SIZE / 2,
                  vx: (Math.random() - 0.5) * 4,
                  vy: (Math.random() - 0.5) * 4,
                  life: 20,
                  emoji: e.emoji,
                })
              }
              // power-up drop (15% chance)
              if (Math.random() < 0.15) {
                const type = Math.random() < 0.5 ? 'spread' : 'rapid'
                s.powerUps.push({
                  x: e.x + ENEMY_SIZE / 2 - POWERUP_SIZE / 2,
                  y: e.y,
                  type,
                  emoji: type === 'spread' ? '🔪' : '🥄',
                  vy: 2,
                })
              }
              return false // remove enemy
            }
            return true
          }
          return true
        })
        return !hit
      })

      // update power-ups
      s.powerUps = s.powerUps.filter((p) => {
        p.y += p.vy
        if (p.y > H) return false
        // collect
        if (
          p.x < s.playerX + PLAYER_W &&
          p.x + POWERUP_SIZE > s.playerX &&
          p.y < H - 30 + PLAYER_H &&
          p.y + POWERUP_SIZE > H - 30
        ) {
          s.powerUp = p.type
          s.powerUpTimer = 300 // 5 seconds at 60fps
          setPowerUpLabel(p.type === 'spread' ? '🔪 Spread Shot!' : '🥄 Rapid Fire!')
          setTimeout(() => setPowerUpLabel(''), 2000)
          return false
        }
        return true
      })

      // update particles
      s.particles = s.particles.filter((p) => {
        p.x += p.vx
        p.y += p.vy
        p.life--
        return p.life > 0
      })

      // enemy-player collision
      if (s.invincible <= 0) {
        const playerHit = s.enemies.some(
          (e) =>
            (e.diving || e.y > H - 80) &&
            e.x < s.playerX + PLAYER_W &&
            e.x + ENEMY_SIZE > s.playerX &&
            e.y < H - 30 + PLAYER_H &&
            e.y + ENEMY_SIZE > H - 30
        )
        // also remove enemies that passed below screen
        s.enemies = s.enemies.filter((e) => {
          if (e.diving && e.y > H + 20) return false
          return true
        })

        if (playerHit) {
          s.lives--
          s.invincible = 90 // 1.5s invincibility
          setLives(s.lives)
          if (s.lives <= 0) {
            s.running = false
            if (s.score > Number(localStorage.getItem('chefflow-galaga-hi') || '0')) {
              localStorage.setItem('chefflow-galaga-hi', String(s.score))
              setHighScore(s.score)
            }
            setGameOver(true)
          }
        }
      }

      // remove off-screen diving enemies
      s.enemies = s.enemies.filter((e) => !(e.diving && e.y > H + 30))

      // wave clear?
      if (s.enemies.length === 0 && s.waveDelay <= 0) {
        s.wave++
        setWave(s.wave)
        const msg = WAVE_MSG[s.wave] || `Wave ${s.wave}!`
        setWaveMsg(msg)
        setTimeout(() => setWaveMsg(''), 1500)
        spawnWave(s.wave)
        s.waveDelay = 60
      }

      draw()
      raf = requestAnimationFrame(loop)
    }

    function draw() {
      const s = stateRef.current

      // background - space kitchen
      ctx.fillStyle = '#1a1a2e'
      ctx.fillRect(0, 0, W, H)

      // stars
      ctx.fillStyle = '#ffffff15'
      for (let i = 0; i < 30; i++) {
        const sx = (i * 97 + s.frameCount * 0.1 * ((i % 3) + 1)) % W
        const sy = (i * 53) % H
        ctx.fillRect(sx, sy, 1.5, 1.5)
      }

      // particles
      s.particles.forEach((p) => {
        ctx.globalAlpha = p.life / 20
        ctx.font = `${12}px serif`
        ctx.textAlign = 'center'
        ctx.fillText(p.emoji, p.x, p.y)
      })
      ctx.globalAlpha = 1

      // enemies
      ctx.font = `${ENEMY_SIZE - 2}px serif`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      s.enemies.forEach((e) => {
        ctx.fillText(e.emoji, e.x + ENEMY_SIZE / 2, e.y + ENEMY_SIZE / 2)
        // hp bar for tough enemies
        if (e.hp > 1) {
          ctx.fillStyle = '#e88f47'
          ctx.fillRect(
            e.x,
            e.y + ENEMY_SIZE + 2,
            ENEMY_SIZE * (e.hp / (1 + Math.floor(s.wave / 4))),
            2
          )
        }
      })

      // power-ups
      ctx.font = `${POWERUP_SIZE}px serif`
      s.powerUps.forEach((p) => {
        ctx.fillText(p.emoji, p.x + POWERUP_SIZE / 2, p.y + POWERUP_SIZE / 2)
      })

      // bullets
      ctx.fillStyle = '#e88f47'
      s.bullets.forEach((b) => {
        ctx.beginPath()
        ctx.roundRect(b.x, b.y, BULLET_W, BULLET_H, 2)
        ctx.fill()
      })

      // player
      const playerY = H - 45
      if (s.invincible > 0 && s.frameCount % 6 < 3) {
        // blink
      } else {
        ctx.font = `${PLAYER_W}px serif`
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText('🍳', s.playerX + PLAYER_W / 2, playerY + PLAYER_H / 2)
      }

      // active power-up indicator
      if (s.powerUp && s.powerUpTimer > 0) {
        ctx.fillStyle = s.powerUp === 'spread' ? '#4ade80' : '#60a5fa'
        ctx.fillRect(s.playerX, playerY + PLAYER_H + 4, PLAYER_W * (s.powerUpTimer / 300), 3)
      }

      // wave message
      if (s.waveDelay > 0) {
        ctx.fillStyle = '#e88f47'
        ctx.font = 'bold 28px sans-serif'
        ctx.textAlign = 'center'
        ctx.fillText(`Wave ${s.wave}`, W / 2, H / 2 - 10)
        const msg = WAVE_MSG[s.wave] || "Let's go!"
        ctx.font = '16px sans-serif'
        ctx.fillStyle = '#aaa'
        ctx.fillText(msg, W / 2, H / 2 + 20)
      }

      // game over
      if (!s.running) {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.75)'
        ctx.fillRect(0, 0, W, H)
        ctx.fillStyle = '#e88f47'
        ctx.font = 'bold 36px sans-serif'
        ctx.textAlign = 'center'
        ctx.fillText('Kitchen Closed!', W / 2, H / 2 - 40)
        ctx.fillStyle = '#fff'
        ctx.font = '22px sans-serif'
        ctx.fillText(`Score: ${s.score}`, W / 2, H / 2 + 5)
        ctx.fillText(`Waves: ${s.wave - 1}`, W / 2, H / 2 + 35)
        ctx.font = '14px sans-serif'
        ctx.fillStyle = '#aaa'
        ctx.fillText('SPACE or tap to restart', W / 2, H / 2 + 70)
      }
    }

    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [gameOver, spawnWave])

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

      <h1 className="mb-4 text-center text-2xl font-bold">Food Galaga</h1>

      {/* HUD */}
      <div className="mb-3 flex items-center justify-between rounded-lg border bg-card px-4 py-2">
        <div className="text-sm">
          Wave: <span className="font-bold text-brand-500">{wave}</span>
        </div>
        <div className="text-sm">
          Score: <span className="font-bold text-brand-500">{score}</span>
        </div>
        <div className="text-sm">
          Lives: <span className="font-bold text-red-400">{'❤️'.repeat(Math.max(0, lives))}</span>
        </div>
      </div>

      {/* Power-up / wave message */}
      {(waveMsg || powerUpLabel) && (
        <div className="mb-2 text-center text-sm font-bold text-brand-500 animate-pulse">
          {waveMsg || powerUpLabel}
        </div>
      )}

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

      <div className="mt-4 text-center text-xs text-muted-foreground">
        Drag to move &middot; Tap to shoot &middot; Arrow keys / A+D / SPACE also work
      </div>
    </div>
  )
}
