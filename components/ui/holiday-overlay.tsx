'use client'

/**
 * HolidayOverlay
 *
 * Detects the current date, finds a matching holiday, and plays a brief,
 * non-invasive CSS animation overlay. Fully pointer-events-none on the
 * animation layer so it never blocks UI interaction.
 *
 * A small replay button persists in the bottom-right corner all day.
 * No sound. No localStorage. Replayable on demand.
 *
 * Covers all 30 holidays on the ChefFlow holiday list.
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import { HOLIDAYS } from '@/lib/holidays/constants'
import { getHolidayDate } from '@/lib/holidays/upcoming'
import {
  OVERLAY_CONFIGS,
  EXTRA_HOLIDAYS,
  type HolidayOverlayConfig,
} from '@/lib/holidays/overlay-configs'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ActiveConfig extends HolidayOverlayConfig {
  key: string
}

interface Particle {
  id: number
  left: number // 0-100 (% of viewport width)
  top: number // 0-100 (% of viewport height, used for walk rows)
  delay: number // animation-delay in seconds
  size: number // font-size in px
  color: string
  tx: number // burst x-displacement in px
  ty: number // burst y-displacement in px
  duration: number // animation-duration in seconds
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
}

function generateParticles(config: ActiveConfig): Particle[] {
  return Array.from({ length: config.count }, (_, i) => {
    const angle = Math.random() * Math.PI * 2
    const distance = 150 + Math.random() * 350
    return {
      id: i,
      left: Math.random() * 100,
      top: 15 + Math.random() * 70,
      delay: Math.random() * 1.8,
      size: 14 + Math.random() * 14,
      color: config.colors[i % config.colors.length],
      tx: Math.cos(angle) * distance,
      ty: Math.sin(angle) * distance,
      duration: (config.durationMs / 1000) * (0.55 + Math.random() * 0.45),
    }
  })
}

function detectTodayHoliday(): ActiveConfig | null {
  const today = new Date()
  const year = today.getFullYear()

  // Check holidays defined in lib/holidays/constants.ts
  for (const holiday of HOLIDAYS) {
    const date = getHolidayDate(holiday, year)
    if (date && isSameDay(date, today)) {
      const cfg = OVERLAY_CONFIGS[holiday.key]
      if (cfg) return { key: holiday.key, ...cfg }
    }
  }

  // Check extra holidays (not in constants.ts)
  for (const extra of EXTRA_HOLIDAYS) {
    const date = extra.getDate(year)
    if (isSameDay(date, today)) {
      const { getDate: _, ...rest } = extra
      return rest
    }
  }

  return null
}

// ---------------------------------------------------------------------------
// CSS keyframes (injected once, scoped by class prefix)
// ---------------------------------------------------------------------------

const CSS_KEYFRAMES = `
@keyframes hol-fall {
  from { transform: translateY(-8vh) rotate(0deg); opacity: 1; }
  to   { transform: translateY(108vh) rotate(400deg); opacity: 0.7; }
}
@keyframes hol-rise {
  0%   { transform: translateY(0) scale(1); opacity: 0; }
  10%  { opacity: 1; }
  90%  { opacity: 1; }
  100% { transform: translateY(-110vh) scale(0.6); opacity: 0; }
}
@keyframes hol-burst {
  0%   { transform: translate(0, 0) scale(1.2); opacity: 1; }
  100% { transform: translate(var(--hol-tx), var(--hol-ty)) scale(0.1); opacity: 0; }
}
@keyframes hol-walk {
  from { transform: translateX(-12vw); }
  to   { transform: translateX(112vw); }
}
@keyframes hol-pulse {
  0%   { opacity: 0; }
  25%  { opacity: 1; }
  75%  { opacity: 1; }
  100% { opacity: 0; }
}
@keyframes hol-sticker {
  0%   { transform: translate(-50%, -50%) scale(0) rotate(-15deg); opacity: 0; }
  35%  { transform: translate(-50%, -50%) scale(1.2) rotate(6deg);  opacity: 1; }
  55%  { transform: translate(-50%, -50%) scale(0.92) rotate(-3deg); opacity: 1; }
  70%  { transform: translate(-50%, -50%) scale(1) rotate(0deg); opacity: 1; }
  85%  { transform: translate(-50%, -50%) scale(1) rotate(0deg); opacity: 1; }
  100% { transform: translate(-50%, -50%) scale(1.05) rotate(0deg); opacity: 0; }
}
@keyframes hol-april-error {
  0%   { transform: translate(-50%, -50%) scale(0); opacity: 0; }
  15%  { transform: translate(-50%, -50%) scale(1); opacity: 1; }
  45%  { transform: translate(-50%, -50%) scale(1); opacity: 1; }
  55%  { transform: translate(-50%, -50%) scale(0); opacity: 0; }
  100% { transform: translate(-50%, -50%) scale(0); opacity: 0; }
}
@keyframes hol-april-joke {
  0%   { transform: translate(-50%, -50%) scale(0); opacity: 0; }
  10%  { transform: translate(-50%, -50%) scale(1.15); opacity: 1; }
  20%  { transform: translate(-50%, -50%) scale(0.95); opacity: 1; }
  30%  { transform: translate(-50%, -50%) scale(1); opacity: 1; }
  80%  { transform: translate(-50%, -50%) scale(1); opacity: 1; }
  100% { transform: translate(-50%, -50%) scale(1); opacity: 0; }
}
`

// ---------------------------------------------------------------------------
// Animation sub-renderers
// ---------------------------------------------------------------------------

function FallingParticles({ particles, config }: { particles: Particle[]; config: ActiveConfig }) {
  return (
    <>
      {particles.map((p) => (
        <span
          key={p.id}
          aria-hidden="true"
          style={{
            position: 'absolute',
            left: `${p.left}%`,
            top: '-5%',
            fontSize: `${p.size}px`,
            color: p.color,
            animationName: 'hol-fall',
            animationDuration: `${p.duration}s`,
            animationDelay: `${p.delay}s`,
            animationTimingFunction: 'linear',
            animationFillMode: 'forwards',
            animationIterationCount: '1',
            userSelect: 'none',
            lineHeight: 1,
          }}
        >
          {config.emoji}
        </span>
      ))}
    </>
  )
}

function RisingParticles({ particles, config }: { particles: Particle[]; config: ActiveConfig }) {
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
            animationName: 'hol-rise',
            animationDuration: `${p.duration}s`,
            animationDelay: `${p.delay}s`,
            animationTimingFunction: 'ease-out',
            animationFillMode: 'forwards',
            animationIterationCount: '1',
            userSelect: 'none',
            lineHeight: 1,
          }}
        >
          {config.emoji}
        </span>
      ))}
    </>
  )
}

function BurstParticles({ particles, config }: { particles: Particle[]; config: ActiveConfig }) {
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
              animationName: 'hol-burst',
              animationDuration: `${p.duration}s`,
              animationDelay: `${p.delay * 0.4}s`,
              animationTimingFunction: 'ease-out',
              animationFillMode: 'forwards',
              animationIterationCount: '1',
              userSelect: 'none',
              lineHeight: 1,
              '--hol-tx': `${p.tx}px`,
              '--hol-ty': `${p.ty}px`,
            } as React.CSSProperties
          }
        >
          {config.emoji}
        </span>
      ))}
    </>
  )
}

function WalkEmoji({ particles, config }: { particles: Particle[]; config: ActiveConfig }) {
  // count > 1 = multiple emojis walking at different vertical positions (Easter eggs)
  const walkers =
    config.count === 1
      ? [{ top: 50, delay: 0 }]
      : particles.map((p) => ({ top: p.top, delay: p.delay * 0.5 }))
  const baseDuration = config.durationMs / 1000

  return (
    <>
      {walkers.map((w, i) => (
        <span
          key={i}
          aria-hidden="true"
          style={{
            position: 'absolute',
            top: `${w.top}%`,
            left: 0,
            fontSize: config.count === 1 ? '48px' : '28px',
            animationName: 'hol-walk',
            animationDuration: `${baseDuration * (0.85 + i * 0.08)}s`,
            animationDelay: `${w.delay}s`,
            animationTimingFunction: 'linear',
            animationFillMode: 'forwards',
            animationIterationCount: '1',
            userSelect: 'none',
            lineHeight: 1,
          }}
        >
          {config.emoji}
        </span>
      ))}
    </>
  )
}

function PulseOverlay({ config }: { config: ActiveConfig }) {
  const isWarm = config.key === 'christmas_eve'
  return (
    <div
      aria-hidden="true"
      style={{
        position: 'absolute',
        inset: 0,
        background: isWarm
          ? 'radial-gradient(ellipse at center, transparent 30%, rgba(255,180,40,0.18) 100%)'
          : `radial-gradient(ellipse at center, transparent 30%, ${config.colors[0]}22 100%)`,
        animationName: 'hol-pulse',
        animationDuration: `${config.durationMs / 1000}s`,
        animationTimingFunction: 'ease-in-out',
        animationFillMode: 'forwards',
        animationIterationCount: '1',
      }}
    />
  )
}

function StickerEmoji({ config }: { config: ActiveConfig }) {
  return (
    <div
      aria-hidden="true"
      style={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        fontSize: '96px',
        lineHeight: 1,
        animationName: 'hol-sticker',
        animationDuration: `${config.durationMs / 1000}s`,
        animationTimingFunction: 'ease-out',
        animationFillMode: 'forwards',
        animationIterationCount: '1',
        userSelect: 'none',
      }}
    >
      {config.emoji}
    </div>
  )
}

function AprilFoolsOverlay({ durationMs }: { durationMs: number }) {
  const errorDuration = (durationMs * 0.5) / 1000
  const jokeDuration = (durationMs * 0.6) / 1000
  const jokeDelay = (durationMs * 0.45) / 1000

  return (
    <>
      {/* Fake error */}
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
          animationName: 'hol-april-error',
          animationDuration: `${errorDuration}s`,
          animationTimingFunction: 'ease-out',
          animationFillMode: 'forwards',
          animationIterationCount: '1',
          userSelect: 'none',
          boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
        }}
      >
        <div style={{ color: '#cc0000', fontSize: '14px', marginBottom: '8px' }}>ERROR</div>
        Chef not found!
        <div style={{ color: '#888', fontSize: '12px', marginTop: '8px' }}>code: 404</div>
      </div>

      {/* Punchline */}
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
          animationName: 'hol-april-joke',
          animationDuration: `${jokeDuration}s`,
          animationDelay: `${jokeDelay}s`,
          animationTimingFunction: 'ease-out',
          animationFillMode: 'forwards',
          animationIterationCount: '1',
        }}
      >
        Gotcha!
        <div style={{ fontSize: '18px', color: '#ff4444', fontWeight: 700, marginTop: '8px' }}>
          April Fools!
        </div>
      </div>
    </>
  )
}

// ---------------------------------------------------------------------------
// Animation layer - rendered as a keyed component so replay remounts it
// ---------------------------------------------------------------------------

function AnimationLayer({ config, onDone }: { config: ActiveConfig; onDone: () => void }) {
  // Particles generated once on mount (client-only, no SSR risk)
  const particles = useRef(generateParticles(config)).current

  useEffect(() => {
    const id = setTimeout(onDone, config.durationMs + 400)
    return () => clearTimeout(id)
  }, [config.durationMs, onDone])

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
      {config.key === 'april_fools' ? (
        <AprilFoolsOverlay durationMs={config.durationMs} />
      ) : config.type === 'falling' ? (
        <FallingParticles particles={particles} config={config} />
      ) : config.type === 'rising' ? (
        <RisingParticles particles={particles} config={config} />
      ) : config.type === 'burst' ? (
        <BurstParticles particles={particles} config={config} />
      ) : config.type === 'walk' ? (
        <WalkEmoji particles={particles} config={config} />
      ) : config.type === 'pulse' ? (
        <PulseOverlay config={config} />
      ) : config.type === 'sticker' ? (
        <StickerEmoji config={config} />
      ) : null}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Public export
// ---------------------------------------------------------------------------

export function HolidayOverlay() {
  const [config, setConfig] = useState<ActiveConfig | null>(null)
  const [playing, setPlaying] = useState(false)
  const [animKey, setAnimKey] = useState(0)

  useEffect(() => {
    const detected = detectTodayHoliday()
    if (detected) {
      setConfig(detected)
      setPlaying(true)
    }
  }, [])

  const handleDone = useCallback(() => setPlaying(false), [])

  const replay = useCallback(() => {
    setAnimKey((k) => k + 1)
    setPlaying(true)
  }, [])

  if (!config) return null

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: CSS_KEYFRAMES }} />

      {playing && <AnimationLayer key={animKey} config={config} onDone={handleDone} />}

      {/* Replay button - always interactive, never covered by animation layer */}
      <button
        onClick={replay}
        title={`Replay ${config.label}`}
        aria-label={`Replay ${config.label} animation`}
        style={{
          position: 'fixed',
          bottom: '1rem',
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
        {config.emoji}
      </button>
    </>
  )
}
