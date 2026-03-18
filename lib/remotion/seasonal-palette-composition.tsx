/**
 * SeasonalPaletteComposition - Remotion animation explaining seasonal palettes.
 *
 * Defines the jargon:
 *  1. Seasonal Palette - a season-specific collection of ingredients & ideas
 *  2. Micro-windows - narrow peak-season windows for specific ingredients
 *  3. Proven Wins - dishes that have been successfully served before
 *  4. Creative Thesis - your seasonal cooking philosophy
 */

import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion'

/* ─── Palette ─────────────────────────────────────────────────── */

const BRAND = {
  50: '#fef9f3',
  100: '#fcf0e0',
  200: '#f8ddc0',
  400: '#eda86b',
  500: '#e88f47',
  600: '#d47530',
}

const STONE = {
  50: '#fafaf9',
  100: '#f5f5f4',
  200: '#e7e5e3',
  400: '#a8a29e',
  500: '#78716c',
  600: '#57534e',
  700: '#44403c',
  900: '#1c1917',
}

/* ─── Terms ───────────────────────────────────────────────────── */

const TERMS = [
  {
    icon: '🎨',
    term: 'Seasonal Palette',
    definition: 'A curated collection of ingredients, ideas, and dishes for a specific season',
    example: 'e.g. "Summer 2026" - stone fruits, heirloom tomatoes, fresh herbs',
    color: '#dbeafe',
    borderColor: '#93c5fd',
    textColor: '#1e40af',
  },
  {
    icon: '⏱️',
    term: 'Micro-Window',
    definition: 'A narrow time frame (days or weeks) when a specific ingredient is at peak quality',
    example: 'e.g. Ramps: March 15 – April 10 / Morels: April 20 – May 15',
    color: '#d1fae5',
    borderColor: '#6ee7b7',
    textColor: '#065f46',
  },
  {
    icon: '🏆',
    term: 'Proven Win',
    definition: "A dish you've successfully served before - tested, refined, client-approved",
    example: 'e.g. "Seared Duck Breast" - served 12 times, 5-star feedback',
    color: '#fef3c7',
    borderColor: '#fcd34d',
    textColor: '#92400e',
  },
  {
    icon: '📐',
    term: 'Creative Thesis',
    definition: 'Your seasonal cooking philosophy - the thread that ties your menus together',
    example: 'e.g. "Hyper-local ingredients, minimal manipulation, maximum flavor"',
    color: '#fce7f3',
    borderColor: '#f9a8d4',
    textColor: '#9d174d',
  },
]

/* ─── Timing ──────────────────────────────────────────────────── */

const INTRO = 30
const TERM_DURATION = 75
const getTermStart = (i: number) => INTRO + i * TERM_DURATION

/* ─── Helpers ─────────────────────────────────────────────────── */

function useFadeIn(startFrame: number, dur = 12) {
  const frame = useCurrentFrame()
  return interpolate(frame, [startFrame, startFrame + dur], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  })
}

function useSpringVal(startFrame: number) {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  return spring({
    frame: Math.max(0, frame - startFrame),
    fps,
    config: { damping: 16, stiffness: 120 },
  })
}

/* ─── Term Card ───────────────────────────────────────────────── */

function TermCard({ term, progress }: { term: (typeof TERMS)[number]; progress: number }) {
  const opacity = interpolate(progress, [0, 0.4], [0, 1], { extrapolateRight: 'clamp' })
  const translateY = interpolate(progress, [0, 1], [20, 0])
  const scale = interpolate(progress, [0, 1], [0.96, 1])

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        opacity,
        transform: `translateY(${translateY}px) scale(${scale})`,
      }}
    >
      <div
        style={{
          width: 52,
          height: 52,
          borderRadius: 14,
          backgroundColor: term.color,
          border: `2px solid ${term.borderColor}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 26,
          marginBottom: 10,
        }}
      >
        {term.icon}
      </div>

      {/* Term name */}
      <div
        style={{
          fontSize: 20,
          fontWeight: 700,
          color: STONE[900],
          fontFamily: 'Inter, system-ui, sans-serif',
          marginBottom: 6,
        }}
      >
        {term.term}
      </div>

      {/* Definition */}
      <div
        style={{
          fontSize: 12,
          color: STONE[600],
          fontFamily: 'Inter, system-ui, sans-serif',
          textAlign: 'center' as const,
          maxWidth: 360,
          lineHeight: 1.5,
          marginBottom: 10,
        }}
      >
        {term.definition}
      </div>

      {/* Example */}
      <div
        style={{
          backgroundColor: term.color,
          border: `1px solid ${term.borderColor}`,
          borderRadius: 8,
          padding: '6px 14px',
          maxWidth: 360,
        }}
      >
        <div
          style={{
            fontSize: 10,
            color: term.textColor,
            fontFamily: 'Inter, system-ui, sans-serif',
            textAlign: 'center' as const,
            fontStyle: 'italic',
          }}
        >
          {term.example}
        </div>
      </div>
    </div>
  )
}

/* ─── Progress dots ───────────────────────────────────────────── */

function TermDots({ active, total }: { active: number; total: number }) {
  return (
    <div style={{ display: 'flex', gap: 6, justifyContent: 'center', marginBottom: 14 }}>
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          style={{
            width: i === active ? 20 : 8,
            height: 8,
            borderRadius: 4,
            backgroundColor: i <= active ? BRAND[500] : STONE[200],
          }}
        />
      ))}
    </div>
  )
}

/* ─── Main Composition ────────────────────────────────────────── */

export function SeasonalPaletteComposition() {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()

  const activeTerm = TERMS.reduce((active, _, i) => (frame >= getTermStart(i) ? i : active), 0)
  const termProgresses = TERMS.map((_, i) => useSpringVal(getTermStart(i)))

  const titleOpacity = useFadeIn(0)
  const titleY = interpolate(
    spring({ frame, fps, config: { damping: 18, stiffness: 100 } }),
    [0, 1],
    [10, 0]
  )

  return (
    <AbsoluteFill style={{ backgroundColor: 'white', fontFamily: 'Inter, system-ui, sans-serif' }}>
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: 3,
          background: `linear-gradient(90deg, ${BRAND[400]}, ${BRAND[500]}, ${BRAND[600]})`,
        }}
      />

      <div
        style={{ padding: '24px 28px', display: 'flex', flexDirection: 'column', height: '100%' }}
      >
        <div
          style={{
            textAlign: 'center' as const,
            marginBottom: 8,
            opacity: titleOpacity,
            transform: `translateY(${titleY}px)`,
          }}
        >
          <div
            style={{
              fontSize: 12,
              fontWeight: 600,
              color: BRAND[600],
              letterSpacing: '0.1em',
              textTransform: 'uppercase' as const,
              marginBottom: 4,
            }}
          >
            Repertoire
          </div>
          <div style={{ fontSize: 18, fontWeight: 700, color: STONE[900] }}>
            Seasonal palettes - your creative toolkit
          </div>
        </div>

        <TermDots active={activeTerm} total={TERMS.length} />

        <div style={{ position: 'relative', flex: 1 }}>
          {TERMS.map((term, i) => {
            const isVisible =
              i === activeTerm || (i === activeTerm - 1 && frame < getTermStart(activeTerm) + 12)
            if (!isVisible) return null

            const exitOpacity =
              i < activeTerm
                ? interpolate(frame, [getTermStart(i + 1), getTermStart(i + 1) + 12], [1, 0], {
                    extrapolateLeft: 'clamp',
                    extrapolateRight: 'clamp',
                  })
                : 1

            return (
              <div key={term.term} style={{ position: 'absolute', inset: 0, opacity: exitOpacity }}>
                <TermCard term={term} progress={termProgresses[i]} />
              </div>
            )
          })}
        </div>
      </div>
    </AbsoluteFill>
  )
}
