'use client'

/**
 * Animation Test Lab — admin-only page for triggering any holiday or
 * milestone animation on demand. Fully self-contained: does not touch
 * or interfere with the real HolidayOverlay / MilestoneOverlay components.
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import { OVERLAY_CONFIGS, EXTRA_HOLIDAYS, type AnimationType } from '@/lib/holidays/overlay-configs'
import { MILESTONE_DEFS, type MilestoneDef } from '@/lib/milestones/milestone-defs'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface PlayConfig {
  key: string
  label: string
  emoji: string
  type: AnimationType
  colors: string[]
  count: number
  durationMs: number
  isMilestone?: boolean
}

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
// CSS keyframes (at- prefix avoids collision with real overlay keyframes)
// ---------------------------------------------------------------------------

const KEYFRAMES = `
@keyframes at-fall {
  from { transform: translateY(-8vh) rotate(0deg); opacity: 1; }
  to   { transform: translateY(108vh) rotate(400deg); opacity: 0.7; }
}
@keyframes at-rise {
  0%   { transform: translateY(0) scale(1); opacity: 0; }
  10%  { opacity: 1; }
  90%  { opacity: 1; }
  100% { transform: translateY(-110vh) scale(0.6); opacity: 0; }
}
@keyframes at-burst {
  0%   { transform: translate(0, 0) scale(1.2); opacity: 1; }
  100% { transform: translate(var(--at-tx), var(--at-ty)) scale(0.1); opacity: 0; }
}
@keyframes at-walk {
  from { transform: translateX(-12vw); }
  to   { transform: translateX(112vw); }
}
@keyframes at-pulse {
  0%   { opacity: 0; }
  25%  { opacity: 1; }
  75%  { opacity: 1; }
  100% { opacity: 0; }
}
@keyframes at-sticker {
  0%   { transform: translate(-50%, -50%) scale(0) rotate(-15deg); opacity: 0; }
  35%  { transform: translate(-50%, -50%) scale(1.2) rotate(6deg);  opacity: 1; }
  55%  { transform: translate(-50%, -50%) scale(0.92) rotate(-3deg); opacity: 1; }
  70%  { transform: translate(-50%, -50%) scale(1) rotate(0deg); opacity: 1; }
  85%  { transform: translate(-50%, -50%) scale(1) rotate(0deg); opacity: 1; }
  100% { transform: translate(-50%, -50%) scale(1.05) rotate(0deg); opacity: 0; }
}
@keyframes at-april-error {
  0%   { transform: translate(-50%, -50%) scale(0); opacity: 0; }
  15%  { transform: translate(-50%, -50%) scale(1); opacity: 1; }
  45%  { transform: translate(-50%, -50%) scale(1); opacity: 1; }
  55%  { transform: translate(-50%, -50%) scale(0); opacity: 0; }
  100% { transform: translate(-50%, -50%) scale(0); opacity: 0; }
}
@keyframes at-april-joke {
  0%   { transform: translate(-50%, -50%) scale(0); opacity: 0; }
  10%  { transform: translate(-50%, -50%) scale(1.15); opacity: 1; }
  20%  { transform: translate(-50%, -50%) scale(0.95); opacity: 1; }
  30%  { transform: translate(-50%, -50%) scale(1); opacity: 1; }
  80%  { transform: translate(-50%, -50%) scale(1); opacity: 1; }
  100% { transform: translate(-50%, -50%) scale(1); opacity: 0; }
}
@keyframes at-label {
  0%   { transform: translateX(-50%) scale(0) translateY(20px); opacity: 0; }
  20%  { transform: translateX(-50%) scale(1.05) translateY(0); opacity: 1; }
  30%  { transform: translateX(-50%) scale(1) translateY(0); opacity: 1; }
  80%  { transform: translateX(-50%) scale(1) translateY(0); opacity: 1; }
  100% { transform: translateX(-50%) scale(0.95) translateY(-10px); opacity: 0; }
}
`

// ---------------------------------------------------------------------------
// Particle generator
// ---------------------------------------------------------------------------

function generateParticles(cfg: PlayConfig): Particle[] {
  return Array.from({ length: cfg.count }, (_, i) => {
    const angle = Math.random() * Math.PI * 2
    const distance = 150 + Math.random() * 350
    return {
      id: i,
      left: Math.random() * 100,
      top: 15 + Math.random() * 70,
      delay: Math.random() * 1.8,
      size: 14 + Math.random() * 14,
      color: cfg.colors[i % cfg.colors.length],
      tx: Math.cos(angle) * distance,
      ty: Math.sin(angle) * distance,
      duration: (cfg.durationMs / 1000) * (0.55 + Math.random() * 0.45),
    }
  })
}

// ---------------------------------------------------------------------------
// April Fools special renderer
// ---------------------------------------------------------------------------

function AprilFoolsLayer({ durationMs }: { durationMs: number }) {
  const errorDuration = (durationMs * 0.5) / 1000
  const jokeDuration = (durationMs * 0.6) / 1000
  const jokeDelay = (durationMs * 0.45) / 1000

  return (
    <>
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          background: '#1e1e1e',
          border: '2px solid #cc0000',
          borderRadius: '8px',
          padding: '20px 32px',
          textAlign: 'center',
          color: '#ffffff',
          fontFamily: 'monospace',
          fontSize: '18px',
          whiteSpace: 'nowrap',
          animationName: 'at-april-error',
          animationDuration: `${errorDuration}s`,
          animationTimingFunction: 'ease-out',
          animationFillMode: 'forwards',
          animationIterationCount: '1',
          userSelect: 'none',
          boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
        }}
      >
        <div style={{ color: '#cc0000', fontSize: '14px', marginBottom: '8px' }}>ERROR</div>
        Chef not found 😱
        <div style={{ color: '#888', fontSize: '12px', marginTop: '8px' }}>code: 404</div>
      </div>
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          fontSize: '64px',
          lineHeight: 1,
          textAlign: 'center',
          userSelect: 'none',
          animationName: 'at-april-joke',
          animationDuration: `${jokeDuration}s`,
          animationDelay: `${jokeDelay}s`,
          animationTimingFunction: 'ease-out',
          animationFillMode: 'forwards',
          animationIterationCount: '1',
        }}
      >
        🤡
        <div style={{ fontSize: '18px', color: '#ff4444', fontWeight: 700, marginTop: '8px' }}>
          April Fools!
        </div>
      </div>
    </>
  )
}

// ---------------------------------------------------------------------------
// Animation layer — keyed by parent so remounting = replay
// ---------------------------------------------------------------------------

function AnimLayer({ cfg, onDone }: { cfg: PlayConfig; onDone: () => void }) {
  const particles = useRef(generateParticles(cfg)).current

  // Auto-clear after animation completes
  useEffect(() => {
    const id = setTimeout(onDone, cfg.durationMs + 500)
    return () => clearTimeout(id)
  }, [cfg.durationMs, onDone])

  const walkers =
    cfg.type === 'walk'
      ? cfg.count === 1
        ? [{ top: 50, delay: 0 }]
        : particles.map((p) => ({ top: p.top, delay: p.delay * 0.5 }))
      : []

  return (
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
      {cfg.key === 'april_fools' ? (
        <AprilFoolsLayer durationMs={cfg.durationMs} />
      ) : cfg.type === 'falling' ? (
        particles.map((p) => (
          <span
            key={p.id}
            aria-hidden="true"
            style={{
              position: 'absolute',
              left: `${p.left}%`,
              top: '-5%',
              fontSize: `${p.size}px`,
              color: p.color,
              animationName: 'at-fall',
              animationDuration: `${p.duration}s`,
              animationDelay: `${p.delay}s`,
              animationTimingFunction: 'linear',
              animationFillMode: 'forwards',
              animationIterationCount: '1',
              userSelect: 'none',
              lineHeight: 1,
            }}
          >
            {cfg.emoji}
          </span>
        ))
      ) : cfg.type === 'rising' ? (
        particles.map((p) => (
          <span
            key={p.id}
            aria-hidden="true"
            style={{
              position: 'absolute',
              left: `${p.left}%`,
              bottom: '-5%',
              fontSize: `${p.size}px`,
              color: p.color,
              animationName: 'at-rise',
              animationDuration: `${p.duration}s`,
              animationDelay: `${p.delay}s`,
              animationTimingFunction: 'ease-out',
              animationFillMode: 'forwards',
              animationIterationCount: '1',
              userSelect: 'none',
              lineHeight: 1,
            }}
          >
            {cfg.emoji}
          </span>
        ))
      ) : cfg.type === 'burst' ? (
        particles.map((p) => (
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
                animationName: 'at-burst',
                animationDuration: `${p.duration}s`,
                animationDelay: `${p.delay * 0.4}s`,
                animationTimingFunction: 'ease-out',
                animationFillMode: 'forwards',
                animationIterationCount: '1',
                userSelect: 'none',
                lineHeight: 1,
                '--at-tx': `${p.tx}px`,
                '--at-ty': `${p.ty}px`,
              } as React.CSSProperties
            }
          >
            {cfg.emoji}
          </span>
        ))
      ) : cfg.type === 'walk' ? (
        walkers.map((w, i) => (
          <span
            key={i}
            aria-hidden="true"
            style={{
              position: 'absolute',
              top: `${w.top}%`,
              left: 0,
              fontSize: cfg.count === 1 ? '48px' : '28px',
              animationName: 'at-walk',
              animationDuration: `${(cfg.durationMs / 1000) * (0.85 + i * 0.08)}s`,
              animationDelay: `${w.delay}s`,
              animationTimingFunction: 'linear',
              animationFillMode: 'forwards',
              animationIterationCount: '1',
              userSelect: 'none',
              lineHeight: 1,
            }}
          >
            {cfg.emoji}
          </span>
        ))
      ) : cfg.type === 'pulse' ? (
        <div
          aria-hidden="true"
          style={{
            position: 'absolute',
            inset: 0,
            background:
              cfg.key === 'christmas_eve'
                ? 'radial-gradient(ellipse at center, transparent 30%, rgba(255,180,40,0.18) 100%)'
                : `radial-gradient(ellipse at center, transparent 30%, ${cfg.colors[0]}22 100%)`,
            animationName: 'at-pulse',
            animationDuration: `${cfg.durationMs / 1000}s`,
            animationTimingFunction: 'ease-in-out',
            animationFillMode: 'forwards',
            animationIterationCount: '1',
          }}
        />
      ) : cfg.type === 'sticker' ? (
        <div
          aria-hidden="true"
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            fontSize: '96px',
            lineHeight: 1,
            animationName: 'at-sticker',
            animationDuration: `${cfg.durationMs / 1000}s`,
            animationTimingFunction: 'ease-out',
            animationFillMode: 'forwards',
            animationIterationCount: '1',
            userSelect: 'none',
          }}
        >
          {cfg.emoji}
        </div>
      ) : null}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Milestone label banner (only shown for milestone animations)
// ---------------------------------------------------------------------------

function MilestoneLabelBanner({ cfg }: { cfg: PlayConfig }) {
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
        pointerEvents: 'none',
        animationName: 'at-label',
        animationDuration: `${cfg.durationMs / 1000}s`,
        animationDelay: '0.3s',
        animationTimingFunction: 'ease-out',
        animationFillMode: 'forwards',
        animationIterationCount: '1',
        userSelect: 'none',
      }}
    >
      {cfg.emoji} {cfg.label}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Holiday config list (OVERLAY_CONFIGS + EXTRA_HOLIDAYS, ordered)
// ---------------------------------------------------------------------------

const HOLIDAY_CONFIGS: PlayConfig[] = [
  ...Object.entries(OVERLAY_CONFIGS).map(([key, cfg]) => ({ key, ...cfg })),
  ...EXTRA_HOLIDAYS.map((h) => ({
    key: h.key,
    label: h.label,
    emoji: h.emoji,
    type: h.type,
    colors: h.colors,
    count: h.count,
    durationMs: h.durationMs,
  })),
]

function toPlayConfig(def: MilestoneDef): PlayConfig {
  return {
    key: def.id,
    label: def.label,
    emoji: def.emoji,
    type: def.type,
    colors: def.colors,
    count: def.count,
    durationMs: def.durationMs,
    isMilestone: true,
  }
}

const CLIENT_MILESTONES = MILESTONE_DEFS.filter((m) => m.clientThreshold !== undefined)
const EVENT_MILESTONES = MILESTONE_DEFS.filter((m) => m.eventThreshold !== undefined)
const REVENUE_MILESTONES = MILESTONE_DEFS.filter((m) => m.revenueThreshold !== undefined)
const BIRTHDAY_MILESTONES = MILESTONE_DEFS.filter((m) => m.businessYears !== undefined)

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function AnimationsTestPage() {
  const [active, setActive] = useState<PlayConfig | null>(null)
  const [playing, setPlaying] = useState(false)
  const [animKey, setAnimKey] = useState(0)

  const trigger = useCallback((cfg: PlayConfig) => {
    setActive(cfg)
    setAnimKey((k) => k + 1)
    setPlaying(true)
  }, [])

  const handleDone = useCallback(() => setPlaying(false), [])

  return (
    <div className="p-8 max-w-5xl space-y-10">
      <style dangerouslySetInnerHTML={{ __html: KEYFRAMES }} />

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Animation Test Lab</h1>
        <p className="text-slate-500 text-sm mt-1">
          Click any button to fire the animation full-screen. Click again mid-animation to restart.
        </p>
        {active && (
          <div className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 bg-slate-100 rounded-full text-sm font-medium text-slate-700">
            <span className={`w-2 h-2 rounded-full ${playing ? 'bg-green-500' : 'bg-slate-400'}`} />
            {playing ? 'Playing:' : 'Last played:'} {active.emoji} {active.label}
          </div>
        )}
      </div>

      {/* Holiday section */}
      <section>
        <h2 className="text-lg font-semibold text-slate-800 mb-3">
          Holidays{' '}
          <span className="text-slate-400 font-normal text-sm">({HOLIDAY_CONFIGS.length})</span>
        </h2>
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
          {HOLIDAY_CONFIGS.map((h) => (
            <button
              key={h.key}
              type="button"
              onClick={() => trigger(h)}
              className="flex items-center gap-2 px-3 py-2 bg-stone-900 border border-slate-200 rounded-lg text-sm text-left hover:bg-blue-950 hover:border-blue-300 transition-colors"
            >
              <span className="text-lg leading-none">{h.emoji}</span>
              <span className="text-slate-700 leading-tight">{h.label}</span>
            </button>
          ))}
        </div>
      </section>

      {/* Milestone section */}
      <section className="space-y-6">
        <h2 className="text-lg font-semibold text-slate-800">
          Milestones{' '}
          <span className="text-slate-400 font-normal text-sm">({MILESTONE_DEFS.length})</span>
        </h2>

        {[
          { label: 'Clients', items: CLIENT_MILESTONES },
          { label: 'Events', items: EVENT_MILESTONES },
          { label: 'Revenue', items: REVENUE_MILESTONES },
          { label: 'Business Birthdays', items: BIRTHDAY_MILESTONES },
        ].map(({ label, items }) => (
          <div key={label}>
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
              {label}
            </h3>
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
              {items.map((def) => (
                <button
                  key={def.id}
                  type="button"
                  onClick={() => trigger(toPlayConfig(def))}
                  className="flex items-center gap-2 px-3 py-2 bg-stone-900 border border-slate-200 rounded-lg text-sm text-left hover:bg-emerald-950 hover:border-emerald-300 transition-colors"
                >
                  <span className="text-lg leading-none">{def.emoji}</span>
                  <span className="text-slate-700 leading-tight">{def.label}</span>
                </button>
              ))}
            </div>
          </div>
        ))}
      </section>

      {/* Animation layer — remounted on each trigger via animKey */}
      {playing && active && <AnimLayer key={animKey} cfg={active} onDone={handleDone} />}

      {/* Milestone label banner — only for milestone animations */}
      {playing && active?.isMilestone && (
        <MilestoneLabelBanner key={`label-${animKey}`} cfg={active} />
      )}
    </div>
  )
}
