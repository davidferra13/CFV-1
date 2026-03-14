'use client'

/**
 * MilestoneOverlay
 *
 * Celebrates chef business milestones with the same CSS animation system
 * as HolidayOverlay. Detects crossed thresholds via a lightweight server
 * action and tracks shown milestones in localStorage.
 *
 * Mounted in app/(chef)/layout.tsx — chef-only, never shown to clients.
 * Non-invasive: pointer-events-none on animation layer, replayable.
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import { useIsDemoMode } from '@/lib/demo-mode'
import { getChefMilestoneStats, type ChefMilestoneStats } from '@/lib/milestones/stats-action'
import { MILESTONE_DEFS, type MilestoneDef } from '@/lib/milestones/milestone-defs'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const SEEN_KEY = 'cf_milestones_seen'
const QUEUE_GAP_MS = 2800

// ---------------------------------------------------------------------------
// Particle type (mirrors holiday-overlay.tsx)
// ---------------------------------------------------------------------------

interface Particle {
  id: number
  left: number
  top: number
  delay: number
  size: number
  color: string
  tx: number
  ty: number
  duration: number
}

// ---------------------------------------------------------------------------
// Milestone detection helpers
// ---------------------------------------------------------------------------

function businessYearsOnToday(createdAt: string): number {
  const created = new Date(createdAt)
  const today = new Date()
  // Only count if today is the exact anniversary (same month + day)
  if (today.getMonth() !== created.getMonth() || today.getDate() !== created.getDate()) return 0
  return today.getFullYear() - created.getFullYear()
}

function isMilestoneCrossed(def: MilestoneDef, stats: ChefMilestoneStats): boolean {
  if (def.clientThreshold !== undefined) return stats.clientCount >= def.clientThreshold
  if (def.eventThreshold !== undefined) return stats.completedEventCount >= def.eventThreshold
  if (def.revenueThreshold !== undefined) return stats.lifetimeRevenueCents >= def.revenueThreshold
  if (def.businessYears !== undefined) {
    return businessYearsOnToday(stats.chefCreatedAt) === def.businessYears
  }
  return false
}

function getSeenIds(): string[] {
  try {
    return JSON.parse(localStorage.getItem(SEEN_KEY) ?? '[]')
  } catch {
    return []
  }
}

function markSeen(id: string): void {
  try {
    const seen = getSeenIds()
    if (!seen.includes(id)) {
      localStorage.setItem(SEEN_KEY, JSON.stringify([...seen, id]))
    }
  } catch {
    // localStorage unavailable — ignore
  }
}

// ---------------------------------------------------------------------------
// Particle generator
// ---------------------------------------------------------------------------

function generateParticles(def: MilestoneDef): Particle[] {
  return Array.from({ length: def.count }, (_, i) => {
    const angle = Math.random() * Math.PI * 2
    const distance = 150 + Math.random() * 350
    return {
      id: i,
      left: Math.random() * 100,
      top: 15 + Math.random() * 70,
      delay: Math.random() * 1.8,
      size: 14 + Math.random() * 16,
      color: def.colors[i % def.colors.length],
      tx: Math.cos(angle) * distance,
      ty: Math.sin(angle) * distance,
      duration: (def.durationMs / 1000) * (0.55 + Math.random() * 0.45),
    }
  })
}

// ---------------------------------------------------------------------------
// CSS keyframes (same system as holiday-overlay, prefixed hol- for reuse)
// ---------------------------------------------------------------------------

const MILESTONE_KEYFRAMES = `
@keyframes ms-fall {
  from { transform: translateY(-8vh) rotate(0deg); opacity: 1; }
  to   { transform: translateY(108vh) rotate(400deg); opacity: 0.7; }
}
@keyframes ms-rise {
  0%   { transform: translateY(0) scale(1); opacity: 0; }
  10%  { opacity: 1; }
  90%  { opacity: 1; }
  100% { transform: translateY(-110vh) scale(0.6); opacity: 0; }
}
@keyframes ms-burst {
  0%   { transform: translate(0, 0) scale(1.2); opacity: 1; }
  100% { transform: translate(var(--ms-tx), var(--ms-ty)) scale(0.1); opacity: 0; }
}
@keyframes ms-walk {
  from { transform: translateX(-12vw); }
  to   { transform: translateX(112vw); }
}
@keyframes ms-sticker {
  0%   { transform: translate(-50%, -50%) scale(0) rotate(-15deg); opacity: 0; }
  35%  { transform: translate(-50%, -50%) scale(1.2) rotate(6deg);  opacity: 1; }
  55%  { transform: translate(-50%, -50%) scale(0.92) rotate(-3deg); opacity: 1; }
  70%  { transform: translate(-50%, -50%) scale(1) rotate(0deg); opacity: 1; }
  85%  { transform: translate(-50%, -50%) scale(1) rotate(0deg); opacity: 1; }
  100% { transform: translate(-50%, -50%) scale(1.05) rotate(0deg); opacity: 0; }
}
@keyframes ms-label {
  0%   { transform: translateX(-50%) scale(0) translateY(20px); opacity: 0; }
  20%  { transform: translateX(-50%) scale(1.05) translateY(0); opacity: 1; }
  30%  { transform: translateX(-50%) scale(1) translateY(0); opacity: 1; }
  80%  { transform: translateX(-50%) scale(1) translateY(0); opacity: 1; }
  100% { transform: translateX(-50%) scale(0.95) translateY(-10px); opacity: 0; }
}
`

// ---------------------------------------------------------------------------
// Animation sub-renderers
// ---------------------------------------------------------------------------

function BurstParticles({ particles, def }: { particles: Particle[]; def: MilestoneDef }) {
  return (
    <>
      {particles.map((p) => (
        <span
          key={p.id}
          aria-hidden="true"
          style={
            {
              position: 'absolute',
              top: '50%',
              left: '50%',
              fontSize: `${p.size}px`,
              color: p.color,
              animationName: 'ms-burst',
              animationDuration: `${p.duration}s`,
              animationDelay: `${p.delay * 0.4}s`,
              animationTimingFunction: 'ease-out',
              animationFillMode: 'forwards',
              animationIterationCount: '1',
              userSelect: 'none',
              lineHeight: 1,
              '--ms-tx': `${p.tx}px`,
              '--ms-ty': `${p.ty}px`,
            } as React.CSSProperties
          }
        >
          {def.emoji}
        </span>
      ))}
    </>
  )
}

function RisingParticles({ particles, def }: { particles: Particle[]; def: MilestoneDef }) {
  return (
    <>
      {particles.map((p) => (
        <span
          key={p.id}
          aria-hidden="true"
          style={{
            position: 'absolute',
            left: `${p.left}%`,
            bottom: '-5%',
            fontSize: `${p.size}px`,
            color: p.color,
            animationName: 'ms-rise',
            animationDuration: `${p.duration}s`,
            animationDelay: `${p.delay}s`,
            animationTimingFunction: 'ease-out',
            animationFillMode: 'forwards',
            animationIterationCount: '1',
            userSelect: 'none',
            lineHeight: 1,
          }}
        >
          {def.emoji}
        </span>
      ))}
    </>
  )
}

function WalkEmoji({ def }: { def: MilestoneDef }) {
  return (
    <span
      aria-hidden="true"
      style={{
        position: 'absolute',
        top: '50%',
        left: 0,
        fontSize: '48px',
        animationName: 'ms-walk',
        animationDuration: `${def.durationMs / 1000}s`,
        animationDelay: '0s',
        animationTimingFunction: 'linear',
        animationFillMode: 'forwards',
        animationIterationCount: '1',
        userSelect: 'none',
        lineHeight: 1,
      }}
    >
      {def.emoji}
    </span>
  )
}

function StickerEmoji({ def }: { def: MilestoneDef }) {
  return (
    <div
      aria-hidden="true"
      style={{
        position: 'absolute',
        top: '40%',
        left: '50%',
        fontSize: '96px',
        lineHeight: 1,
        animationName: 'ms-sticker',
        animationDuration: `${def.durationMs / 1000}s`,
        animationTimingFunction: 'ease-out',
        animationFillMode: 'forwards',
        animationIterationCount: '1',
        userSelect: 'none',
      }}
    >
      {def.emoji}
    </div>
  )
}

// Label banner — appears below the animation for all milestone types
function MilestoneLabel({ def }: { def: MilestoneDef }) {
  return (
    <div
      aria-hidden="true"
      style={{
        position: 'fixed',
        bottom: '28%',
        left: '50%',
        zIndex: 10000,
        background: 'rgba(255,255,255,0.97)',
        borderRadius: '999px',
        padding: '10px 28px',
        fontWeight: 800,
        fontSize: '20px',
        letterSpacing: '-0.01em',
        color: '#1c1917',
        boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
        whiteSpace: 'nowrap',
        animationName: 'ms-label',
        animationDuration: `${def.durationMs / 1000}s`,
        animationDelay: '0.3s',
        animationTimingFunction: 'ease-out',
        animationFillMode: 'forwards',
        animationIterationCount: '1',
        userSelect: 'none',
      }}
    >
      {def.emoji} {def.label}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Animation layer — keyed so replay remounts it
// ---------------------------------------------------------------------------

function MilestoneAnimLayer({ def, onDone }: { def: MilestoneDef; onDone: () => void }) {
  const particles = useRef(generateParticles(def)).current

  useEffect(() => {
    const id = setTimeout(onDone, def.durationMs + 500)
    return () => clearTimeout(id)
  }, [def.durationMs, onDone])

  return (
    <>
      {/* Animation canvas — pointer-events-none */}
      <div
        aria-hidden="true"
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 9999,
          pointerEvents: 'none',
          overflow: 'hidden',
        }}
      >
        {def.type === 'burst' && <BurstParticles particles={particles} def={def} />}
        {def.type === 'rising' && <RisingParticles particles={particles} def={def} />}
        {def.type === 'walk' && <WalkEmoji def={def} />}
        {def.type === 'sticker' && <StickerEmoji def={def} />}
      </div>

      {/* Label banner — also pointer-events-none */}
      <div style={{ pointerEvents: 'none' }}>
        <MilestoneLabel def={def} />
      </div>
    </>
  )
}

// ---------------------------------------------------------------------------
// Public export
// ---------------------------------------------------------------------------

export function MilestoneOverlay() {
  const isDemo = useIsDemoMode()
  const [queue, setQueue] = useState<MilestoneDef[]>([])
  const [current, setCurrent] = useState<MilestoneDef | null>(null)
  const [animKey, setAnimKey] = useState(0)
  const [lastShown, setLastShown] = useState<MilestoneDef | null>(null)
  const [playing, setPlaying] = useState(false)
  const queueRef = useRef<MilestoneDef[]>([])

  // Fetch stats and compute queue on mount
  useEffect(() => {
    if (isDemo) return
    let cancelled = false

    async function init() {
      const stats = await getChefMilestoneStats()
      if (cancelled || !stats) return

      const seen = getSeenIds()
      const pending = MILESTONE_DEFS.filter(
        (def) => isMilestoneCrossed(def, stats) && !seen.includes(def.id)
      )

      if (pending.length === 0) return

      queueRef.current = pending.slice(1) // remainder after first
      setQueue(pending.slice(1))
      setCurrent(pending[0])
      setLastShown(pending[0])
      setPlaying(true)
    }

    init()
    return () => {
      cancelled = true
    }
  }, [])

  const handleDone = useCallback(() => {
    if (!current) return
    markSeen(current.id)
    setPlaying(false)

    // Advance queue after a brief gap
    if (queueRef.current.length > 0) {
      const next = queueRef.current[0]
      queueRef.current = queueRef.current.slice(1)
      setQueue((q) => q.slice(1))
      setTimeout(() => {
        setCurrent(next)
        setLastShown(next)
        setAnimKey((k) => k + 1)
        setPlaying(true)
      }, QUEUE_GAP_MS)
    }
  }, [current])

  const replay = useCallback(() => {
    if (!lastShown) return
    setCurrent(lastShown)
    setAnimKey((k) => k + 1)
    setPlaying(true)
  }, [lastShown])

  if (!lastShown) return null

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: MILESTONE_KEYFRAMES }} />

      {playing && current && <MilestoneAnimLayer key={animKey} def={current} onDone={handleDone} />}

      {/* Replay button — always interactive */}
      <button
        onClick={replay}
        title={`Replay: ${lastShown.label}`}
        aria-label={`Replay ${lastShown.label} animation`}
        style={{
          position: 'fixed',
          bottom: '4.5rem', // slightly above holiday replay button if both present
          right: '1rem',
          zIndex: 9998,
          width: '40px',
          height: '40px',
          borderRadius: '50%',
          background: 'rgba(255,255,255,0.92)',
          border: '1px solid rgba(0,0,0,0.12)',
          boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '20px',
          cursor: 'pointer',
          transition: 'transform 0.15s ease, box-shadow 0.15s ease',
          lineHeight: 1,
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'scale(1.12)'
          e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.2)'
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'scale(1)'
          e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.15)'
        }}
      >
        {lastShown.emoji}
      </button>
    </>
  )
}
