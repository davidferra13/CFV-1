/**
 * ClientJourneyComposition - Remotion animation showing the client's perspective.
 *
 * What clients see at each step:
 *  1. "Pending Review" - proposal arrives
 *  2. "Payment Due" - client accepted, now pay
 *  3. "Confirmed" - payment received, event locked
 *  4. "Event Day" - service happening
 *  5. "Complete" - done, leave a review
 *
 * Bridges the gap between internal status names and what clients actually experience.
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

/* ─── Steps ───────────────────────────────────────────────────── */

const STEPS = [
  {
    icon: '📩',
    clientSees: 'Pending Review',
    internalStatus: 'proposed',
    whatToDo: 'Review the proposal - date, menu, and price',
    action: 'Accept Proposal →',
  },
  {
    icon: '💳',
    clientSees: 'Payment Due',
    internalStatus: 'accepted',
    whatToDo: 'Deposit or full payment required to lock in your event',
    action: 'Complete Payment →',
  },
  {
    icon: '✅',
    clientSees: 'Confirmed',
    internalStatus: 'confirmed',
    whatToDo: 'Your event is locked in - the chef is prepping',
    action: 'View event details',
  },
  {
    icon: '👨‍🍳',
    clientSees: 'In Progress',
    internalStatus: 'in_progress',
    whatToDo: 'Your chef is on-site and cooking',
    action: 'Sit back and enjoy',
  },
  {
    icon: '🎉',
    clientSees: 'Complete',
    internalStatus: 'completed',
    whatToDo: 'Event finished - view your invoice and leave a review',
    action: 'View invoice',
  },
]

/* ─── Timing ──────────────────────────────────────────────────── */

const INTRO = 25
const STEP_DURATION = 58
const getStepStart = (i: number) => INTRO + i * STEP_DURATION

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

/* ─── Step Card ───────────────────────────────────────────────── */

function ClientStepCard({ step, progress }: { step: (typeof STEPS)[number]; progress: number }) {
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
          backgroundColor: BRAND[50],
          border: `1.5px solid ${BRAND[200]}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 26,
          marginBottom: 12,
        }}
      >
        {step.icon}
      </div>

      {/* Client sees label */}
      <div
        style={{
          fontSize: 18,
          fontWeight: 700,
          color: STONE[900],
          fontFamily: 'Inter, system-ui, sans-serif',
          marginBottom: 4,
        }}
      >
        You see: &quot;{step.clientSees}&quot;
      </div>

      {/* Internal status */}
      <div
        style={{
          fontSize: 10,
          color: STONE[400],
          fontFamily: 'Inter, system-ui, sans-serif',
          marginBottom: 10,
        }}
      >
        (internal: {step.internalStatus})
      </div>

      {/* What to do */}
      <div
        style={{
          fontSize: 12,
          color: STONE[600],
          fontFamily: 'Inter, system-ui, sans-serif',
          textAlign: 'center' as const,
          maxWidth: 320,
          marginBottom: 12,
          lineHeight: 1.4,
        }}
      >
        {step.whatToDo}
      </div>

      {/* Action button mock */}
      <div
        style={{
          fontSize: 11,
          fontWeight: 600,
          color: 'white',
          backgroundColor: BRAND[500],
          padding: '6px 16px',
          borderRadius: 6,
          fontFamily: 'Inter, system-ui, sans-serif',
        }}
      >
        {step.action}
      </div>
    </div>
  )
}

/* ─── Progress dots ───────────────────────────────────────────── */

function ProgressDots({ active, total }: { active: number; total: number }) {
  return (
    <div style={{ display: 'flex', gap: 6, justifyContent: 'center', marginBottom: 16 }}>
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          style={{
            width: i === active ? 20 : 8,
            height: 8,
            borderRadius: 4,
            backgroundColor: i <= active ? BRAND[500] : STONE[200],
            transition: 'all 0.3s ease',
          }}
        />
      ))}
    </div>
  )
}

/* ─── Main Composition ────────────────────────────────────────── */

export function ClientJourneyComposition() {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()

  const activeStep = STEPS.reduce((active, _, i) => (frame >= getStepStart(i) ? i : active), 0)
  const stepProgresses = STEPS.map((_, i) => useSpring(getStepStart(i)))

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
            Client View
          </div>
          <div style={{ fontSize: 20, fontWeight: 700, color: STONE[900] }}>
            What your clients see at each step
          </div>
        </div>

        <ProgressDots active={activeStep} total={STEPS.length} />

        <div style={{ position: 'relative', flex: 1 }}>
          {STEPS.map((step, i) => {
            const isVisible =
              i === activeStep || (i === activeStep - 1 && frame < getStepStart(activeStep) + 12)
            if (!isVisible) return null

            const exitOpacity =
              i < activeStep
                ? interpolate(frame, [getStepStart(i + 1), getStepStart(i + 1) + 12], [1, 0], {
                    extrapolateLeft: 'clamp',
                    extrapolateRight: 'clamp',
                  })
                : 1

            return (
              <div
                key={step.clientSees}
                style={{ position: 'absolute', inset: 0, opacity: exitOpacity }}
              >
                <ClientStepCard step={step} progress={stepProgresses[i]} />
              </div>
            )
          })}
        </div>
      </div>
    </AbsoluteFill>
  )
}
