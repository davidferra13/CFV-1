/**
 * TierVsModuleComposition — Remotion animation explaining the difference between Tiers and Modules.
 *
 * Two concepts that look like one:
 *  - Tier (Free vs Pro) = what you CAN access (monetization)
 *  - Module (on/off) = what you SEE in nav (UX personalization)
 *
 * Shows them side by side to make the distinction clear.
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
const PURPLE = { bg: '#ede9fe', text: '#5b21b6', border: '#c4b5fd' }

/* ─── Timing ──────────────────────────────────────────────────── */

const PHASE_TIER_START = 25
const PHASE_MODULE_START = 165
const PHASE_COMBINED_START = 290

/* ─── Helpers ─────────────────────────────────────────────────── */

function useFadeIn(startFrame: number, dur = 15) {
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
  const opacity = interpolate(frame, [startFrame, startFrame + 12], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  })
  return { opacity, transform: `translateY(${translateY}px)` }
}

/* ─── Module Row ──────────────────────────────────────────────── */

function ModuleRow({
  name,
  icon,
  tier,
  visible,
  style,
}: {
  name: string
  icon: string
  tier: 'free' | 'pro'
  visible: boolean
  style?: React.CSSProperties
}) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '5px 10px',
        borderRadius: 6,
        backgroundColor: STONE[50],
        border: `1px solid ${STONE[200]}`,
        ...style,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={{ fontSize: 12 }}>{icon}</span>
        <span
          style={{
            fontSize: 10,
            fontWeight: 600,
            color: STONE[700],
            fontFamily: 'Inter, system-ui, sans-serif',
          }}
        >
          {name}
        </span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        {tier === 'pro' && (
          <span
            style={{
              fontSize: 8,
              fontWeight: 700,
              color: PURPLE.text,
              backgroundColor: PURPLE.bg,
              padding: '1px 5px',
              borderRadius: 3,
              fontFamily: 'Inter, system-ui, sans-serif',
              textTransform: 'uppercase' as const,
            }}
          >
            Pro
          </span>
        )}
        <div
          style={{
            width: 24,
            height: 14,
            borderRadius: 7,
            backgroundColor: visible ? GREEN.border : STONE[200],
            display: 'flex',
            alignItems: 'center',
            padding: 2,
          }}
        >
          <div
            style={{
              width: 10,
              height: 10,
              borderRadius: '50%',
              backgroundColor: 'white',
              transform: visible ? 'translateX(10px)' : 'translateX(0)',
            }}
          />
        </div>
      </div>
    </div>
  )
}

/* ─── Main Composition ────────────────────────────────────────── */

export function TierVsModuleComposition() {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()

  const titleOpacity = useFadeIn(0)
  const titleY = interpolate(
    spring({ frame, fps, config: { damping: 18, stiffness: 100 } }),
    [0, 1],
    [10, 0]
  )

  // Phase visibility
  const showTier = frame >= PHASE_TIER_START
  const showModule = frame >= PHASE_MODULE_START
  const showCombined = frame >= PHASE_COMBINED_START

  const tierFade = useFadeIn(PHASE_TIER_START)
  const tierFadeOut = showModule
    ? interpolate(frame, [PHASE_MODULE_START, PHASE_MODULE_START + 15], [1, 0], {
        extrapolateLeft: 'clamp',
        extrapolateRight: 'clamp',
      })
    : 1
  const moduleFade = useFadeIn(PHASE_MODULE_START)
  const moduleFadeOut = showCombined
    ? interpolate(frame, [PHASE_COMBINED_START, PHASE_COMBINED_START + 15], [1, 0], {
        extrapolateLeft: 'clamp',
        extrapolateRight: 'clamp',
      })
    : 1
  const combinedFade = useFadeIn(PHASE_COMBINED_START)

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
        style={{ padding: '22px 24px', display: 'flex', flexDirection: 'column', height: '100%' }}
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
            Tiers vs Modules
          </div>
          <div style={{ fontSize: 18, fontWeight: 700, color: STONE[900] }}>
            Two systems — one controls access, one controls visibility
          </div>
        </div>

        <div style={{ position: 'relative', flex: 1 }}>
          {/* Phase 1: Tier explanation */}
          {showTier && !showCombined && (
            <div
              style={{
                position: 'absolute',
                inset: 0,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 12,
                opacity: tierFade * tierFadeOut,
              }}
            >
              <div
                style={{
                  fontSize: 14,
                  fontWeight: 700,
                  color: GREEN.text,
                  fontFamily: 'Inter, system-ui, sans-serif',
                }}
              >
                🎫 Tier = What you CAN access
              </div>
              <div style={{ display: 'flex', gap: 16 }}>
                <div
                  style={{
                    ...useSlideUp(PHASE_TIER_START + 15),
                    padding: '12px 20px',
                    borderRadius: 8,
                    backgroundColor: GREEN.bg,
                    border: `2px solid ${GREEN.border}`,
                    textAlign: 'center' as const,
                  }}
                >
                  <div style={{ fontSize: 12, fontWeight: 700, color: GREEN.text }}>Free</div>
                  <div style={{ fontSize: 9, color: GREEN.text, marginTop: 4 }}>
                    Dashboard, Pipeline,{'\n'}Events, Clients, Finance
                  </div>
                </div>
                <div
                  style={{
                    ...useSlideUp(PHASE_TIER_START + 30),
                    padding: '12px 20px',
                    borderRadius: 8,
                    backgroundColor: PURPLE.bg,
                    border: `2px solid ${PURPLE.border}`,
                    textAlign: 'center' as const,
                  }}
                >
                  <div style={{ fontSize: 12, fontWeight: 700, color: PURPLE.text }}>Pro</div>
                  <div style={{ fontSize: 9, color: PURPLE.text, marginTop: 4 }}>
                    Everything in Free +{'\n'}Protection, More Tools
                  </div>
                </div>
              </div>
              <div
                style={{
                  fontSize: 10,
                  color: STONE[500],
                  ...useSlideUp(PHASE_TIER_START + 50),
                }}
              >
                Upgrade unlocks features — downgrade hides them
              </div>
            </div>
          )}

          {/* Phase 2: Module explanation */}
          {showModule && !showCombined && (
            <div
              style={{
                position: 'absolute',
                inset: 0,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                opacity: moduleFade * moduleFadeOut,
              }}
            >
              <div
                style={{
                  fontSize: 14,
                  fontWeight: 700,
                  color: BRAND[600],
                  fontFamily: 'Inter, system-ui, sans-serif',
                }}
              >
                👁️ Module = What you SEE in nav
              </div>
              <div style={{ width: 240, display: 'flex', flexDirection: 'column', gap: 3 }}>
                <ModuleRow
                  name="Dashboard"
                  icon="📊"
                  tier="free"
                  visible={true}
                  style={useSlideUp(PHASE_MODULE_START + 15)}
                />
                <ModuleRow
                  name="Events"
                  icon="📅"
                  tier="free"
                  visible={true}
                  style={useSlideUp(PHASE_MODULE_START + 25)}
                />
                <ModuleRow
                  name="Culinary"
                  icon="🍳"
                  tier="free"
                  visible={false}
                  style={useSlideUp(PHASE_MODULE_START + 35)}
                />
                <ModuleRow
                  name="Protection"
                  icon="🛡️"
                  tier="pro"
                  visible={true}
                  style={useSlideUp(PHASE_MODULE_START + 45)}
                />
              </div>
              <div
                style={{
                  fontSize: 10,
                  color: STONE[500],
                  textAlign: 'center' as const,
                  ...useSlideUp(PHASE_MODULE_START + 60),
                }}
              >
                Toggle modules to customize your sidebar.{'\n'}
                Hiding a module doesn&apos;t delete your data.
              </div>
            </div>
          )}

          {/* Phase 3: Combined view */}
          {showCombined && (
            <div
              style={{
                position: 'absolute',
                inset: 0,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 14,
                opacity: combinedFade,
              }}
            >
              <div style={{ display: 'flex', gap: 20 }}>
                <div
                  style={{
                    textAlign: 'center' as const,
                    padding: '10px 16px',
                    borderRadius: 8,
                    backgroundColor: GREEN.bg,
                    border: `1.5px solid ${GREEN.border}`,
                    ...useSlideUp(PHASE_COMBINED_START + 10),
                  }}
                >
                  <div style={{ fontSize: 20, marginBottom: 4 }}>🎫</div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: GREEN.text }}>Tier</div>
                  <div style={{ fontSize: 9, color: GREEN.text, marginTop: 2 }}>Can I use it?</div>
                </div>
                <div
                  style={{
                    textAlign: 'center' as const,
                    padding: '10px 16px',
                    borderRadius: 8,
                    backgroundColor: BRAND[50],
                    border: `1.5px solid ${BRAND[200]}`,
                    ...useSlideUp(PHASE_COMBINED_START + 20),
                  }}
                >
                  <div style={{ fontSize: 20, marginBottom: 4 }}>👁️</div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: BRAND[600] }}>Module</div>
                  <div style={{ fontSize: 9, color: BRAND[600], marginTop: 2 }}>Do I see it?</div>
                </div>
              </div>
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: STONE[700],
                  textAlign: 'center' as const,
                  ...useSlideUp(PHASE_COMBINED_START + 35),
                }}
              >
                Together: &quot;Can I use it?&quot; + &quot;Do I want to see it?&quot;
              </div>
            </div>
          )}
        </div>
      </div>
    </AbsoluteFill>
  )
}
