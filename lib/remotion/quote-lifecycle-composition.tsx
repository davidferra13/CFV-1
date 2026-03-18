/**
 * QuoteLifecycleComposition - Remotion animation showing the quote lifecycle.
 *
 * States: draft → sent → [accepted, rejected, expired]
 * Also explains deposits (percentage vs flat amount) and expiration.
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

const GREEN = { bg: '#d1fae5', text: '#065f46', border: '#6ee7b7' }
const RED = { bg: '#fee2e2', text: '#991b1b', border: '#fca5a5' }
const AMBER = { bg: '#fef3c7', text: '#92400e', border: '#fcd34d' }
const BLUE = { bg: '#dbeafe', text: '#1e40af', border: '#93c5fd' }

/* ─── Phases ──────────────────────────────────────────────────── */

// Phase 1: Draft (created)
// Phase 2: Sent (waiting for client)
// Phase 3: Three possible outcomes
// Phase 4: Deposit explanation

const PHASE = {
  DRAFT: 20,
  SENT: 90,
  OUTCOMES: 170,
  DEPOSIT: 270,
}

/* ─── Helpers ─────────────────────────────────────────────────── */

function useFadeIn(startFrame: number, dur = 12) {
  const frame = useCurrentFrame()
  return interpolate(frame, [startFrame, startFrame + dur], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  })
}

function useSlideUp(startFrame: number) {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  const progress = spring({
    frame: Math.max(0, frame - startFrame),
    fps,
    config: { damping: 16, stiffness: 120 },
  })
  const translateY = interpolate(progress, [0, 1], [14, 0])
  const opacity = interpolate(frame, [startFrame, startFrame + 10], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  })
  return { opacity, transform: `translateY(${translateY}px)` }
}

/* ─── Status Badge ────────────────────────────────────────────── */

function StatusBadge({
  label,
  color,
  icon,
  style,
}: {
  label: string
  color: { bg: string; text: string; border: string }
  icon: string
  style?: React.CSSProperties
}) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 4,
        ...style,
      }}
    >
      <div
        style={{
          width: 40,
          height: 40,
          borderRadius: 10,
          backgroundColor: color.bg,
          border: `2px solid ${color.border}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 20,
        }}
      >
        {icon}
      </div>
      <span
        style={{
          fontSize: 10,
          fontWeight: 600,
          color: color.text,
          fontFamily: 'Inter, system-ui, sans-serif',
        }}
      >
        {label}
      </span>
    </div>
  )
}

/* ─── Main Composition ────────────────────────────────────────── */

export function QuoteLifecycleComposition() {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()

  const titleOpacity = useFadeIn(0)
  const titleY = interpolate(
    spring({ frame, fps, config: { damping: 18, stiffness: 100 } }),
    [0, 1],
    [10, 0]
  )

  const showDraft = frame >= PHASE.DRAFT
  const showSent = frame >= PHASE.SENT
  const showOutcomes = frame >= PHASE.OUTCOMES
  const showDeposit = frame >= PHASE.DEPOSIT

  // Fade transitions
  const draftOp =
    useFadeIn(PHASE.DRAFT) *
    (showSent
      ? interpolate(frame, [PHASE.SENT, PHASE.SENT + 12], [1, 0], {
          extrapolateLeft: 'clamp',
          extrapolateRight: 'clamp',
        })
      : 1)
  const sentOp = showSent
    ? useFadeIn(PHASE.SENT) *
      (showOutcomes
        ? interpolate(frame, [PHASE.OUTCOMES, PHASE.OUTCOMES + 12], [1, 0], {
            extrapolateLeft: 'clamp',
            extrapolateRight: 'clamp',
          })
        : 1)
    : 0
  const outcomesOp = showOutcomes
    ? useFadeIn(PHASE.OUTCOMES) *
      (showDeposit
        ? interpolate(frame, [PHASE.DEPOSIT, PHASE.DEPOSIT + 12], [1, 0], {
            extrapolateLeft: 'clamp',
            extrapolateRight: 'clamp',
          })
        : 1)
    : 0
  const depositOp = showDeposit ? useFadeIn(PHASE.DEPOSIT) : 0

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
        style={{ padding: '22px 28px', display: 'flex', flexDirection: 'column', height: '100%' }}
      >
        <div
          style={{
            textAlign: 'center' as const,
            marginBottom: 14,
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
            Quote Lifecycle
          </div>
          <div style={{ fontSize: 18, fontWeight: 700, color: STONE[900] }}>
            From draft to decision
          </div>
        </div>

        <div style={{ position: 'relative', flex: 1 }}>
          {/* Phase 1: Draft */}
          {showDraft && draftOp > 0 && (
            <div
              style={{
                position: 'absolute',
                inset: 0,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 12,
                opacity: draftOp,
              }}
            >
              <StatusBadge
                label="Draft"
                color={STONE as never}
                icon="📝"
                style={useSlideUp(PHASE.DRAFT)}
              />
              <div
                style={{
                  fontSize: 13,
                  color: STONE[600],
                  textAlign: 'center' as const,
                  ...useSlideUp(PHASE.DRAFT + 15),
                }}
              >
                Build your quote - set the price, add line items,{'\n'}and choose deposit
                requirements
              </div>
              <div
                style={{
                  fontSize: 10,
                  color: STONE[400],
                  ...useSlideUp(PHASE.DRAFT + 30),
                }}
              >
                Only you can see this. Client hasn&apos;t received anything yet.
              </div>
            </div>
          )}

          {/* Phase 2: Sent */}
          {showSent && sentOp > 0 && (
            <div
              style={{
                position: 'absolute',
                inset: 0,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 12,
                opacity: sentOp,
              }}
            >
              <StatusBadge label="Sent" color={BLUE} icon="📤" style={useSlideUp(PHASE.SENT)} />
              <div
                style={{
                  fontSize: 13,
                  color: STONE[600],
                  textAlign: 'center' as const,
                  ...useSlideUp(PHASE.SENT + 15),
                }}
              >
                Client receives a professional link to review.{'\n'}
                They can accept, decline, or let it expire.
              </div>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  backgroundColor: AMBER.bg,
                  border: `1px solid ${AMBER.border}`,
                  borderRadius: 6,
                  padding: '4px 12px',
                  ...useSlideUp(PHASE.SENT + 30),
                }}
              >
                <span style={{ fontSize: 12 }}>⏰</span>
                <span style={{ fontSize: 10, color: AMBER.text, fontWeight: 500 }}>
                  Quotes expire after your set deadline
                </span>
              </div>
            </div>
          )}

          {/* Phase 3: Three outcomes */}
          {showOutcomes && outcomesOp > 0 && (
            <div
              style={{
                position: 'absolute',
                inset: 0,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 16,
                opacity: outcomesOp,
              }}
            >
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: STONE[600],
                  ...useSlideUp(PHASE.OUTCOMES),
                }}
              >
                Three possible outcomes:
              </div>
              <div style={{ display: 'flex', gap: 20 }}>
                <StatusBadge
                  label="Accepted"
                  color={GREEN}
                  icon="✅"
                  style={useSlideUp(PHASE.OUTCOMES + 10)}
                />
                <StatusBadge
                  label="Declined"
                  color={RED}
                  icon="✕"
                  style={useSlideUp(PHASE.OUTCOMES + 20)}
                />
                <StatusBadge
                  label="Expired"
                  color={AMBER}
                  icon="⏰"
                  style={useSlideUp(PHASE.OUTCOMES + 30)}
                />
              </div>
              <div
                style={{
                  fontSize: 10,
                  color: STONE[500],
                  textAlign: 'center' as const,
                  ...useSlideUp(PHASE.OUTCOMES + 45),
                }}
              >
                Expired quotes can be revised and re-sent.{'\n'}
                Accepted quotes move to the payment stage.
              </div>
            </div>
          )}

          {/* Phase 4: Deposit explanation */}
          {showDeposit && depositOp > 0 && (
            <div
              style={{
                position: 'absolute',
                inset: 0,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 10,
                opacity: depositOp,
              }}
            >
              <div
                style={{
                  fontSize: 14,
                  fontWeight: 700,
                  color: STONE[900],
                  ...useSlideUp(PHASE.DEPOSIT),
                }}
              >
                💵 Deposit Options
              </div>
              <div style={{ display: 'flex', gap: 16 }}>
                <div
                  style={{
                    padding: '10px 16px',
                    borderRadius: 8,
                    backgroundColor: GREEN.bg,
                    border: `1.5px solid ${GREEN.border}`,
                    textAlign: 'center' as const,
                    ...useSlideUp(PHASE.DEPOSIT + 12),
                  }}
                >
                  <div style={{ fontSize: 11, fontWeight: 700, color: GREEN.text }}>Percentage</div>
                  <div
                    style={{ fontSize: 18, fontWeight: 700, color: GREEN.text, margin: '4px 0' }}
                  >
                    25%
                  </div>
                  <div style={{ fontSize: 9, color: GREEN.text }}>of quoted price</div>
                </div>
                <div
                  style={{
                    padding: '10px 16px',
                    borderRadius: 8,
                    backgroundColor: BLUE.bg,
                    border: `1.5px solid ${BLUE.border}`,
                    textAlign: 'center' as const,
                    ...useSlideUp(PHASE.DEPOSIT + 24),
                  }}
                >
                  <div style={{ fontSize: 11, fontWeight: 700, color: BLUE.text }}>
                    Fixed Amount
                  </div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: BLUE.text, margin: '4px 0' }}>
                    $500
                  </div>
                  <div style={{ fontSize: 9, color: BLUE.text }}>regardless of total</div>
                </div>
              </div>
              <div
                style={{
                  fontSize: 10,
                  color: STONE[500],
                  textAlign: 'center' as const,
                  ...useSlideUp(PHASE.DEPOSIT + 40),
                }}
              >
                Set your preferred deposit type per quote.{'\n'}
                Remaining balance is due before the event.
              </div>
            </div>
          )}
        </div>
      </div>
    </AbsoluteFill>
  )
}
