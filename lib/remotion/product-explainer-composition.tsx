/**
 * ProductExplainerComposition - Remotion animation for the landing page.
 *
 * Shows the ChefFlow workflow in 4 steps:
 *  1. Inquiry arrives
 *  2. Event gets created
 *  3. Quote is sent to client
 *  4. Payment lands
 *
 * Clean, professional, on-brand (terracotta palette). No gimmicks.
 */

import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion'

/* ─── Brand Palette ───────────────────────────────────────────── */

const BRAND = {
  50: '#fef9f3',
  100: '#fcf0e0',
  200: '#f8ddc0',
  300: '#f3c596',
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

/* ─── Step definitions ────────────────────────────────────────── */

const STEPS = [
  {
    icon: '📬',
    label: 'Inquiry',
    title: 'A client reaches out',
    description: 'Inquiry captured with all the details - date, guests, dietary needs.',
  },
  {
    icon: '📅',
    label: 'Event',
    title: 'Plan the event',
    description: 'Build your menu, set pricing, and organize prep in one place.',
  },
  {
    icon: '📄',
    label: 'Quote',
    title: 'Send the proposal',
    description: 'Client gets a professional link - review, approve, done.',
  },
  {
    icon: '💳',
    label: 'Payment',
    title: 'Collect payment',
    description: 'Stripe-powered invoicing. Payment lands, you start cooking.',
  },
]

/* ─── Timing ──────────────────────────────────────────────────── */

// 4 steps, each gets ~75 frames (2.5s @ 30fps)
// Total: 360 frames = 12 seconds (with a brief hold at the end)
const STEP_DURATION = 75
const STEP_OVERLAP = 10 // Frames of overlap between steps

function getStepStart(index: number): number {
  return 30 + index * (STEP_DURATION - STEP_OVERLAP)
}

/* ─── Helpers ─────────────────────────────────────────────────── */

function useSpring(startFrame: number) {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  return spring({
    frame: Math.max(0, frame - startFrame),
    fps,
    config: { damping: 16, stiffness: 120 },
  })
}

/* ─── Progress Bar ────────────────────────────────────────────── */

function ProgressTimeline({ activeStep }: { activeStep: number }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 0,
        marginBottom: 32,
      }}
    >
      {STEPS.map((step, i) => {
        const isActive = i <= activeStep
        const isCurrent = i === activeStep
        return (
          <div key={step.label} style={{ display: 'flex', alignItems: 'center' }}>
            {/* Step node */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: '50%',
                  backgroundColor: isActive ? BRAND[500] : STONE[200],
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 16,
                  transition: 'background-color 0.4s ease',
                  boxShadow: isCurrent ? `0 0 0 4px ${BRAND[200]}` : 'none',
                }}
              >
                {step.icon}
              </div>
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 600,
                  color: isActive ? BRAND[700] : STONE[400],
                  fontFamily: 'Inter, system-ui, sans-serif',
                  letterSpacing: '0.05em',
                  textTransform: 'uppercase' as const,
                }}
              >
                {step.label}
              </span>
            </div>

            {/* Connector line */}
            {i < STEPS.length - 1 && (
              <div
                style={{
                  width: 48,
                  height: 2,
                  backgroundColor: i < activeStep ? BRAND[400] : STONE[200],
                  marginLeft: 4,
                  marginRight: 4,
                  marginBottom: 22,
                  borderRadius: 1,
                  transition: 'background-color 0.4s ease',
                }}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}

/* ─── Step Card ───────────────────────────────────────────────── */

function StepCard({ step, progress }: { step: (typeof STEPS)[number]; progress: number }) {
  const opacity = interpolate(progress, [0, 0.4], [0, 1], {
    extrapolateRight: 'clamp',
  })
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
          width: 56,
          height: 56,
          borderRadius: 14,
          backgroundColor: BRAND[50],
          border: `1.5px solid ${BRAND[200]}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 28,
          marginBottom: 16,
        }}
      >
        {step.icon}
      </div>
      <div
        style={{
          fontSize: 20,
          fontWeight: 700,
          color: STONE[900],
          fontFamily: 'Inter, system-ui, sans-serif',
          marginBottom: 8,
        }}
      >
        {step.title}
      </div>
      <div
        style={{
          fontSize: 14,
          color: STONE[600],
          fontFamily: 'Inter, system-ui, sans-serif',
          textAlign: 'center' as const,
          maxWidth: 340,
          lineHeight: 1.5,
        }}
      >
        {step.description}
      </div>
    </div>
  )
}

/* ─── Main Composition ────────────────────────────────────────── */

export function ProductExplainerComposition() {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()

  // Which step is currently active?
  const activeStep = STEPS.reduce((active, _, i) => {
    const stepStart = getStepStart(i)
    return frame >= stepStart ? i : active
  }, 0)

  // Step progress (spring-based)
  const stepProgresses = STEPS.map((_, i) => useSpring(getStepStart(i)))

  // Title fade-in
  const titleOpacity = interpolate(frame, [0, 20], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  })
  const titleY = interpolate(
    spring({ frame, fps, config: { damping: 18, stiffness: 100 } }),
    [0, 1],
    [10, 0]
  )

  return (
    <AbsoluteFill
      style={{
        backgroundColor: 'white',
        fontFamily: 'Inter, system-ui, sans-serif',
      }}
    >
      {/* Subtle brand gradient at top */}
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
        style={{ padding: '28px 32px', display: 'flex', flexDirection: 'column', height: '100%' }}
      >
        {/* Title */}
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
              fontSize: 13,
              fontWeight: 600,
              color: BRAND[600],
              letterSpacing: '0.1em',
              textTransform: 'uppercase' as const,
              marginBottom: 6,
            }}
          >
            How It Works
          </div>
          <div style={{ fontSize: 24, fontWeight: 700, color: STONE[900] }}>
            From inquiry to payout in one flow
          </div>
        </div>

        {/* Progress timeline */}
        <ProgressTimeline activeStep={activeStep} />

        {/* Step cards (stacked, only active visible) */}
        <div style={{ position: 'relative', flex: 1 }}>
          {STEPS.map((step, i) => {
            // Only render current and previous step for smooth transition
            const isVisible =
              i === activeStep || (i === activeStep - 1 && frame < getStepStart(activeStep) + 15)
            if (!isVisible) return null

            const exitOpacity =
              i < activeStep
                ? interpolate(frame, [getStepStart(i + 1), getStepStart(i + 1) + 15], [1, 0], {
                    extrapolateLeft: 'clamp',
                    extrapolateRight: 'clamp',
                  })
                : 1

            return (
              <div
                key={step.label}
                style={{ position: 'absolute', inset: 0, opacity: exitOpacity }}
              >
                <StepCard step={step} progress={stepProgresses[i]} />
              </div>
            )
          })}
        </div>
      </div>
    </AbsoluteFill>
  )
}
