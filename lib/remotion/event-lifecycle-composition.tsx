/**
 * EventLifecycleComposition — Remotion animation showing the 8-state event lifecycle.
 *
 * Animates each state as a node in a flowing timeline:
 *  draft → proposed → accepted → paid → confirmed → in_progress → completed
 *                                                                  └ cancelled
 *
 * Shows what triggers each transition (manual click, automatic webhook, etc.)
 */

import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion'

/* ─── Brand Palette ───────────────────────────────────────────── */

const BRAND = {
  50: '#fef9f3',
  100: '#fcf0e0',
  200: '#f8ddc0',
  400: '#eda86b',
  500: '#e88f47',
  600: '#d47530',
  700: '#b15c26',
}

const STONE = {
  50: '#fafaf9',
  100: '#f5f5f4',
  200: '#e7e5e3',
  300: '#d6d3d1',
  400: '#a8a29e',
  500: '#78716c',
  600: '#57534e',
  700: '#44403c',
  800: '#292524',
  900: '#1c1917',
}

const GREEN = { bg: '#d1fae5', text: '#065f46', border: '#6ee7b7' }
const BLUE = { bg: '#dbeafe', text: '#1e40af', border: '#93c5fd' }
const AMBER = { bg: '#fef3c7', text: '#92400e', border: '#fcd34d' }
const RED = { bg: '#fee2e2', text: '#991b1b', border: '#fca5a5' }

/* ─── State definitions ───────────────────────────────────────── */

const STATES = [
  {
    label: 'Draft',
    icon: '📝',
    friendly: 'Planning',
    trigger: 'You create the event',
    color: STONE,
  },
  {
    label: 'Proposed',
    icon: '📤',
    friendly: 'Sent to Client',
    trigger: 'You click "Send Proposal"',
    color: BLUE,
  },
  {
    label: 'Accepted',
    icon: '✅',
    friendly: 'Client Agreed',
    trigger: 'Client clicks "Accept"',
    color: GREEN,
  },
  {
    label: 'Paid',
    icon: '💳',
    friendly: 'Payment Received',
    trigger: 'Stripe webhook (automatic)',
    color: GREEN,
  },
  {
    label: 'Confirmed',
    icon: '🔒',
    friendly: 'Locked In',
    trigger: 'You click "Confirm Event"',
    color: BRAND,
  },
  {
    label: 'In Progress',
    icon: '👨‍🍳',
    friendly: 'Service Day',
    trigger: 'You click "Start Service"',
    color: AMBER,
  },
  {
    label: 'Completed',
    icon: '🎉',
    friendly: 'All Done',
    trigger: 'You click "Mark Complete"',
    color: GREEN,
  },
]

/* ─── Timing ──────────────────────────────────────────────────── */

const INTRO_DURATION = 30
const STATE_DURATION = 40
const getStateStart = (i: number) => INTRO_DURATION + i * STATE_DURATION

/* ─── Helpers ─────────────────────────────────────────────────── */

function useFadeIn(startFrame: number, dur = 12) {
  const frame = useCurrentFrame()
  return interpolate(frame, [startFrame, startFrame + dur], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  })
}

function useSpring(startFrame: number) {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  return spring({
    frame: Math.max(0, frame - startFrame),
    fps,
    config: { damping: 16, stiffness: 120 },
  })
}

/* ─── State Node ──────────────────────────────────────────────── */

function StateNode({
  state,
  index,
  isActive,
  isCurrent,
}: {
  state: (typeof STATES)[number]
  index: number
  isActive: boolean
  isCurrent: boolean
}) {
  const bgColor = isActive
    ? typeof state.color.bg === 'string'
      ? state.color.bg
      : state.color[100] || BRAND[100]
    : STONE[100]
  const borderColor = isActive
    ? typeof state.color.border === 'string'
      ? state.color.border
      : state.color[400] || BRAND[400]
    : STONE[200]

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 3,
      }}
    >
      <div
        style={{
          width: 38,
          height: 38,
          borderRadius: 10,
          backgroundColor: bgColor,
          border: `2px solid ${borderColor}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 18,
          boxShadow: isCurrent ? `0 0 0 3px ${BRAND[200]}` : 'none',
        }}
      >
        {state.icon}
      </div>
      <span
        style={{
          fontSize: 8,
          fontWeight: 600,
          color: isActive ? STONE[800] : STONE[400],
          fontFamily: 'Inter, system-ui, sans-serif',
          textTransform: 'uppercase' as const,
          letterSpacing: '0.04em',
          textAlign: 'center' as const,
          maxWidth: 60,
          lineHeight: 1.2,
        }}
      >
        {state.label}
      </span>
    </div>
  )
}

/* ─── Detail Card ─────────────────────────────────────────────── */

function DetailCard({ state, progress }: { state: (typeof STATES)[number]; progress: number }) {
  const opacity = interpolate(progress, [0, 0.4], [0, 1], { extrapolateRight: 'clamp' })
  const translateY = interpolate(progress, [0, 1], [16, 0])

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
        transform: `translateY(${translateY}px)`,
      }}
    >
      <div
        style={{
          fontSize: 18,
          fontWeight: 700,
          color: STONE[900],
          fontFamily: 'Inter, system-ui, sans-serif',
          marginBottom: 6,
        }}
      >
        {state.friendly}
      </div>
      <div
        style={{
          fontSize: 12,
          color: STONE[500],
          fontFamily: 'Inter, system-ui, sans-serif',
          marginBottom: 14,
        }}
      >
        Status: &quot;{state.label}&quot;
      </div>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          backgroundColor: BRAND[50],
          border: `1px solid ${BRAND[200]}`,
          borderRadius: 8,
          padding: '8px 16px',
        }}
      >
        <span style={{ fontSize: 14 }}>⚡</span>
        <span
          style={{
            fontSize: 12,
            color: STONE[700],
            fontFamily: 'Inter, system-ui, sans-serif',
            fontWeight: 500,
          }}
        >
          {state.trigger}
        </span>
      </div>
    </div>
  )
}

/* ─── Main Composition ────────────────────────────────────────── */

export function EventLifecycleComposition() {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()

  const activeStep = STATES.reduce((active, _, i) => (frame >= getStateStart(i) ? i : active), 0)
  const stepProgresses = STATES.map((_, i) => useSpring(getStateStart(i)))

  const titleOpacity = useFadeIn(0)
  const titleY = interpolate(
    spring({ frame, fps, config: { damping: 18, stiffness: 100 } }),
    [0, 1],
    [10, 0]
  )

  return (
    <AbsoluteFill style={{ backgroundColor: 'white', fontFamily: 'Inter, system-ui, sans-serif' }}>
      {/* Brand gradient bar */}
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
        {/* Title */}
        <div
          style={{
            textAlign: 'center' as const,
            marginBottom: 16,
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
            Event Lifecycle
          </div>
          <div style={{ fontSize: 20, fontWeight: 700, color: STONE[900] }}>
            Every event follows this path
          </div>
        </div>

        {/* Timeline row */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 0,
            marginBottom: 16,
          }}
        >
          {STATES.map((state, i) => (
            <div key={state.label} style={{ display: 'flex', alignItems: 'center' }}>
              <StateNode
                state={state}
                index={i}
                isActive={i <= activeStep}
                isCurrent={i === activeStep}
              />
              {i < STATES.length - 1 && (
                <div
                  style={{
                    width: 20,
                    height: 2,
                    backgroundColor: i < activeStep ? BRAND[400] : STONE[200],
                    marginLeft: 3,
                    marginRight: 3,
                    marginBottom: 16,
                    borderRadius: 1,
                  }}
                />
              )}
            </div>
          ))}
        </div>

        {/* Detail card */}
        <div style={{ position: 'relative', flex: 1 }}>
          {STATES.map((state, i) => {
            const isVisible =
              i === activeStep || (i === activeStep - 1 && frame < getStateStart(activeStep) + 12)
            if (!isVisible) return null

            const exitOpacity =
              i < activeStep
                ? interpolate(frame, [getStateStart(i + 1), getStateStart(i + 1) + 12], [1, 0], {
                    extrapolateLeft: 'clamp',
                    extrapolateRight: 'clamp',
                  })
                : 1

            return (
              <div
                key={state.label}
                style={{ position: 'absolute', inset: 0, opacity: exitOpacity }}
              >
                <DetailCard state={state} progress={stepProgresses[i]} />
              </div>
            )
          })}
        </div>

        {/* Cancelled note */}
        <div
          style={{
            textAlign: 'center' as const,
            opacity: useFadeIn(INTRO_DURATION + 20),
            marginTop: 4,
          }}
        >
          <span
            style={{
              fontSize: 10,
              color: STONE[400],
              fontFamily: 'Inter, system-ui, sans-serif',
            }}
          >
            Events can be cancelled at any stage before completion
          </span>
        </div>
      </div>
    </AbsoluteFill>
  )
}
