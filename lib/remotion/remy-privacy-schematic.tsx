/**
 * RemyPrivacySchematic - Remotion composition showing exactly how Remy's
 * data flow works. 6 scenes, ~55 seconds at 30fps.
 *
 * Scene 1: "You talk to Remy" - chef types a message
 * Scene 2: "Remy processes it privately" - message travels to Pi, comes back
 * Scene 3: "Your answer comes back" - closed loop visible
 * Scene 4: "What doesn't happen" - blocked paths to external services
 * Scene 5: "Where your conversation lives" - browser-local storage
 * Scene 6: "The bottom line" - summary
 */

import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion'

/* ─── Brand Palette ──────────────────────────────────────────────── */

const BRAND = {
  50: '#fdf4ec',
  100: '#fbe5d0',
  400: '#eda86b',
  500: '#e88f47',
  600: '#d47530',
}

const GREEN = {
  50: '#ecfdf5',
  100: '#d1fae5',
  300: '#6ee7b7',
  500: '#10b981',
  700: '#047857',
  800: '#064e3b',
}

const RED = {
  50: '#fef2f2',
  100: '#fee2e2',
  300: '#fca5a5',
  500: '#ef4444',
  700: '#b91c1c',
}

const STONE = {
  50: '#fafaf9',
  100: '#f5f5f4',
  200: '#e7e5e3',
  400: '#a8a29e',
  500: '#78716c',
  700: '#44403c',
  800: '#292524',
  900: '#1c1917',
}

const FONT = 'Inter, system-ui, sans-serif'
const FONT_DISPLAY = '"DM Serif Display", Georgia, serif'

/* ─── Scene Timing (frames @ 30fps) ──────────────────────────────── */

const S1_START = 0 // Scene 1: You talk to Remy (0-5s)
const S2_START = 150 // Scene 2: Remy processes privately (5-15s)
const S3_START = 450 // Scene 3: Answer comes back (15-22s)
const S4_START = 660 // Scene 4: What doesn't happen (22-35s)
const S5_START = 1050 // Scene 5: Where conversation lives (35-45s)
const S6_START = 1350 // Scene 6: The bottom line (45-55s)
const TOTAL = 1650 // 55 seconds

/* ─── Helpers ────────────────────────────────────────────────────── */

function useFade(startFrame: number, duration = 15) {
  const frame = useCurrentFrame()
  return interpolate(frame, [startFrame, startFrame + duration], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  })
}

function useFadeOut(startFrame: number, duration = 15) {
  const frame = useCurrentFrame()
  return interpolate(frame, [startFrame, startFrame + duration], [1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  })
}

function useSpring(startFrame: number) {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  return spring({
    frame: frame - startFrame,
    fps,
    config: { damping: 18, stiffness: 120 },
  })
}

function useSlideIn(startFrame: number, from: 'left' | 'right' | 'bottom' = 'bottom', dist = 20) {
  const progress = useSpring(startFrame)
  const opacity = useFade(startFrame, 12)
  const axis = from === 'bottom' ? 'Y' : 'X'
  const sign = from === 'left' ? -1 : 1
  const offset = interpolate(progress, [0, 1], [dist * sign, 0])
  return { opacity, transform: `translate${axis}(${offset}px)` }
}

/* ─── Scene Components ───────────────────────────────────────────── */

function Scene1() {
  const frame = useCurrentFrame()
  if (frame >= S2_START) return null
  const fadeOut = useFadeOut(S2_START - 20)

  const titleStyle = useSlideIn(S1_START + 10)
  const chatStyle = useSlideIn(S1_START + 40)
  const bubbleStyle = useSlideIn(S1_START + 70)

  return (
    <div style={{ opacity: fadeOut, position: 'absolute', inset: 0, padding: 40 }}>
      {/* Title */}
      <div style={{ textAlign: 'center', marginBottom: 32, ...titleStyle }}>
        <div style={{ fontSize: 28, fontWeight: 700, color: STONE[900], fontFamily: FONT_DISPLAY }}>
          You talk to Remy
        </div>
        <div style={{ fontSize: 14, color: STONE[500], marginTop: 6, fontFamily: FONT }}>
          Just like messaging a colleague
        </div>
      </div>

      {/* Chat mockup */}
      <div style={{ maxWidth: 360, margin: '0 auto', ...chatStyle }}>
        <div
          style={{
            background: STONE[100],
            borderRadius: 16,
            padding: 20,
            border: `1px solid ${STONE[200]}`,
          }}
        >
          {/* Remy header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                background: BRAND[100],
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 18,
              }}
            >
              🧑‍🍳
            </div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: STONE[900], fontFamily: FONT }}>
                Remy
              </div>
              <div style={{ fontSize: 10, color: GREEN[500], fontFamily: FONT }}>Private AI</div>
            </div>
          </div>

          {/* User message bubble */}
          <div style={{ ...bubbleStyle }}>
            <div
              style={{
                background: BRAND[500],
                color: 'white',
                borderRadius: 14,
                borderBottomRightRadius: 4,
                padding: '10px 14px',
                fontSize: 13,
                fontFamily: FONT,
                marginLeft: 40,
                lineHeight: 1.5,
              }}
            >
              Help me plan a menu for Saturday&apos;s dinner party - 8 guests, two with nut
              allergies
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function Scene2() {
  const frame = useCurrentFrame()
  if (frame < S2_START || frame >= S3_START) return null
  const fadeIn = useFade(S2_START)
  const fadeOut = useFadeOut(S3_START - 20)

  const titleStyle = useSlideIn(S2_START + 10)
  const diagramFade = useFade(S2_START + 30)

  // Animated packet going to Pi
  const packetProgress = interpolate(frame, [S2_START + 60, S2_START + 120], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  })

  // Pi "thinking" pulse
  const piPulse = Math.sin((frame - S2_START) * 0.15) * 0.15 + 1

  return (
    <div
      style={{ opacity: Math.min(fadeIn, fadeOut), position: 'absolute', inset: 0, padding: 40 }}
    >
      <div style={{ textAlign: 'center', marginBottom: 32, ...titleStyle }}>
        <div style={{ fontSize: 28, fontWeight: 700, color: STONE[900], fontFamily: FONT_DISPLAY }}>
          Remy processes it privately
        </div>
        <div style={{ fontSize: 14, color: STONE[500], marginTop: 6, fontFamily: FONT }}>
          On ChefFlow&apos;s own infrastructure - not in the cloud
        </div>
      </div>

      {/* Data flow diagram */}
      <div style={{ opacity: diagramFade }}>
        <svg
          viewBox="0 0 500 220"
          style={{ width: '100%', maxWidth: 480, margin: '0 auto', display: 'block' }}
        >
          {/* ChefFlow boundary */}
          <rect
            x="10"
            y="10"
            width="480"
            height="160"
            rx="14"
            fill={GREEN[50]}
            stroke={GREEN[300]}
            strokeWidth="2"
            strokeDasharray="8,4"
          />
          <text
            x="250"
            y="32"
            textAnchor="middle"
            fill={GREEN[800]}
            fontSize="12"
            fontWeight="600"
            fontFamily={FONT}
          >
            ChefFlow (everything stays here)
          </text>

          {/* Chef box */}
          <rect
            x="30"
            y="60"
            width="140"
            height="56"
            rx="10"
            fill="white"
            stroke={STONE[200]}
            strokeWidth="1.5"
          />
          <text
            x="100"
            y="83"
            textAnchor="middle"
            fill={STONE[900]}
            fontSize="12"
            fontWeight="600"
            fontFamily={FONT}
          >
            Your Browser
          </text>
          <text
            x="100"
            y="100"
            textAnchor="middle"
            fill={STONE[500]}
            fontSize="9"
            fontFamily={FONT}
          >
            Message typed here
          </text>

          {/* Pi box */}
          <rect
            x="330"
            y="60"
            width="140"
            height="56"
            rx="10"
            fill={GREEN[100]}
            stroke={GREEN[300]}
            strokeWidth="1.5"
            style={{ transform: `scale(${piPulse})`, transformOrigin: '400px 88px' }}
          />
          <text
            x="400"
            y="83"
            textAnchor="middle"
            fill={GREEN[800]}
            fontSize="12"
            fontWeight="600"
            fontFamily={FONT}
          >
            Remy (Ollama)
          </text>
          <text
            x="400"
            y="100"
            textAnchor="middle"
            fill={GREEN[700]}
            fontSize="9"
            fontFamily={FONT}
          >
            Private AI server
          </text>

          {/* Animated packet */}
          {packetProgress > 0 && packetProgress < 1 && (
            <circle
              cx={interpolate(packetProgress, [0, 1], [170, 330])}
              cy="88"
              r="6"
              fill={BRAND[500]}
            />
          )}

          {/* Arrow */}
          <line
            x1="170"
            y1="82"
            x2="330"
            y2="82"
            stroke={GREEN[500]}
            strokeWidth="2"
            markerEnd="url(#pArrow)"
          />
          <text
            x="250"
            y="75"
            textAnchor="middle"
            fill={GREEN[700]}
            fontSize="9"
            fontWeight="500"
            fontFamily={FONT}
          >
            request
          </text>

          {/* Labels below */}
          <text
            x="100"
            y="140"
            textAnchor="middle"
            fill={GREEN[700]}
            fontSize="10"
            fontWeight="600"
            fontFamily={FONT}
          >
            ✓ History stays here
          </text>
          <text
            x="400"
            y="140"
            textAnchor="middle"
            fill={GREEN[700]}
            fontSize="10"
            fontWeight="600"
            fontFamily={FONT}
          >
            ✓ No data stored
          </text>

          {/* Summary */}
          <text
            x="250"
            y="195"
            textAnchor="middle"
            fill={STONE[700]}
            fontSize="12"
            fontWeight="600"
            fontFamily={FONT}
          >
            Processed locally. Never sent to cloud AI.
          </text>

          <defs>
            <marker id="pArrow" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
              <path d="M0,0 L8,3 L0,6 Z" fill={GREEN[500]} />
            </marker>
          </defs>
        </svg>
      </div>
    </div>
  )
}

function Scene3() {
  const frame = useCurrentFrame()
  if (frame < S3_START || frame >= S4_START) return null
  const fadeIn = useFade(S3_START)
  const fadeOut = useFadeOut(S4_START - 20)

  const titleStyle = useSlideIn(S3_START + 10)
  const diagramFade = useFade(S3_START + 30)

  // Response packet going back
  const responseProgress = interpolate(frame, [S3_START + 50, S3_START + 110], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  })

  return (
    <div
      style={{ opacity: Math.min(fadeIn, fadeOut), position: 'absolute', inset: 0, padding: 40 }}
    >
      <div style={{ textAlign: 'center', marginBottom: 32, ...titleStyle }}>
        <div style={{ fontSize: 28, fontWeight: 700, color: STONE[900], fontFamily: FONT_DISPLAY }}>
          Your answer comes back
        </div>
        <div style={{ fontSize: 14, color: STONE[500], marginTop: 6, fontFamily: FONT }}>
          A closed loop - the data never leaves
        </div>
      </div>

      <div style={{ opacity: diagramFade }}>
        <svg
          viewBox="0 0 500 200"
          style={{ width: '100%', maxWidth: 480, margin: '0 auto', display: 'block' }}
        >
          {/* Boundary */}
          <rect
            x="10"
            y="10"
            width="480"
            height="130"
            rx="14"
            fill={GREEN[50]}
            stroke={GREEN[300]}
            strokeWidth="2"
            strokeDasharray="8,4"
          />

          {/* Chef box */}
          <rect
            x="30"
            y="40"
            width="140"
            height="56"
            rx="10"
            fill="white"
            stroke={STONE[200]}
            strokeWidth="1.5"
          />
          <text
            x="100"
            y="63"
            textAnchor="middle"
            fill={STONE[900]}
            fontSize="12"
            fontWeight="600"
            fontFamily={FONT}
          >
            Your Browser
          </text>
          <text x="100" y="80" textAnchor="middle" fill={STONE[500]} fontSize="9" fontFamily={FONT}>
            Response appears here
          </text>

          {/* Pi box */}
          <rect
            x="330"
            y="40"
            width="140"
            height="56"
            rx="10"
            fill={GREEN[100]}
            stroke={GREEN[300]}
            strokeWidth="1.5"
          />
          <text
            x="400"
            y="63"
            textAnchor="middle"
            fill={GREEN[800]}
            fontSize="12"
            fontWeight="600"
            fontFamily={FONT}
          >
            Remy (Ollama)
          </text>
          <text x="400" y="80" textAnchor="middle" fill={GREEN[700]} fontSize="9" fontFamily={FONT}>
            Private AI server
          </text>

          {/* Bidirectional arrows (closed loop) */}
          <line
            x1="170"
            y1="62"
            x2="330"
            y2="62"
            stroke={GREEN[500]}
            strokeWidth="2"
            markerEnd="url(#pArrow3)"
          />
          <line
            x1="330"
            y1="74"
            x2="170"
            y2="74"
            stroke={GREEN[500]}
            strokeWidth="2"
            markerEnd="url(#pArrow3L)"
          />
          <text x="250" y="57" textAnchor="middle" fill={GREEN[700]} fontSize="8" fontFamily={FONT}>
            request →
          </text>
          <text x="250" y="88" textAnchor="middle" fill={GREEN[700]} fontSize="8" fontFamily={FONT}>
            ← response
          </text>

          {/* Response packet */}
          {responseProgress > 0 && responseProgress < 1 && (
            <circle
              cx={interpolate(responseProgress, [0, 1], [330, 170])}
              cy="74"
              r="6"
              fill={GREEN[500]}
            />
          )}

          {/* Closed loop label */}
          <text
            x="250"
            y="120"
            textAnchor="middle"
            fill={GREEN[800]}
            fontSize="11"
            fontWeight="700"
            fontFamily={FONT}
          >
            🔒 Closed loop - nothing exits ChefFlow
          </text>

          <text
            x="250"
            y="175"
            textAnchor="middle"
            fill={STONE[700]}
            fontSize="12"
            fontWeight="600"
            fontFamily={FONT}
          >
            The conversation stays between you and Remy.
          </text>

          <defs>
            <marker id="pArrow3" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
              <path d="M0,0 L8,3 L0,6 Z" fill={GREEN[500]} />
            </marker>
            <marker id="pArrow3L" markerWidth="8" markerHeight="6" refX="0" refY="3" orient="auto">
              <path d="M8,0 L0,3 L8,6 Z" fill={GREEN[500]} />
            </marker>
          </defs>
        </svg>
      </div>
    </div>
  )
}

function Scene4() {
  const frame = useCurrentFrame()
  if (frame < S4_START || frame >= S5_START) return null
  const fadeIn = useFade(S4_START)
  const fadeOut = useFadeOut(S5_START - 20)

  const titleStyle = useSlideIn(S4_START + 10)

  // Staggered blocked paths
  const block1 = useFade(S4_START + 60, 20)
  const block2 = useFade(S4_START + 90, 20)
  const block3 = useFade(S4_START + 120, 20)
  const block4 = useFade(S4_START + 150, 20)
  const summaryStyle = useSlideIn(S4_START + 200)

  return (
    <div
      style={{ opacity: Math.min(fadeIn, fadeOut), position: 'absolute', inset: 0, padding: 40 }}
    >
      <div style={{ textAlign: 'center', marginBottom: 24, ...titleStyle }}>
        <div style={{ fontSize: 28, fontWeight: 700, color: STONE[900], fontFamily: FONT_DISPLAY }}>
          What doesn&apos;t happen
        </div>
        <div style={{ fontSize: 14, color: STONE[500], marginTop: 6, fontFamily: FONT }}>
          Your conversations are never sent to these services
        </div>
      </div>

      {/* Blocked services grid */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 16,
          justifyContent: 'center',
          marginBottom: 24,
        }}
      >
        {[
          { name: 'OpenAI', opacity: block1 },
          { name: 'Google AI', opacity: block2 },
          { name: 'ChefFlow Servers', opacity: block3 },
          { name: 'Third Parties', opacity: block4 },
        ].map((svc) => (
          <div
            key={svc.name}
            style={{
              opacity: svc.opacity,
              background: RED[50],
              border: `2px solid ${RED[300]}`,
              borderRadius: 12,
              padding: '14px 24px',
              textAlign: 'center',
              minWidth: 140,
            }}
          >
            <div style={{ fontSize: 24, marginBottom: 4 }}>✕</div>
            <div style={{ fontSize: 13, fontWeight: 600, color: RED[700], fontFamily: FONT }}>
              {svc.name}
            </div>
            <div style={{ fontSize: 10, color: RED[500], fontFamily: FONT, marginTop: 2 }}>
              Never receives your data
            </div>
          </div>
        ))}
      </div>

      {/* Summary */}
      <div
        style={{
          textAlign: 'center',
          ...summaryStyle,
          background: GREEN[50],
          border: `1px solid ${GREEN[300]}`,
          borderRadius: 12,
          padding: '12px 20px',
          maxWidth: 400,
          margin: '0 auto',
        }}
      >
        <div style={{ fontSize: 13, fontWeight: 600, color: GREEN[800], fontFamily: FONT }}>
          No conversation data sent to any cloud AI service. Ever.
        </div>
      </div>
    </div>
  )
}

function Scene5() {
  const frame = useCurrentFrame()
  if (frame < S5_START || frame >= S6_START) return null
  const fadeIn = useFade(S5_START)
  const fadeOut = useFadeOut(S6_START - 20)

  const titleStyle = useSlideIn(S5_START + 10)
  const deviceStyle = useSlideIn(S5_START + 40)
  const labelStyle = useSlideIn(S5_START + 80)

  return (
    <div
      style={{ opacity: Math.min(fadeIn, fadeOut), position: 'absolute', inset: 0, padding: 40 }}
    >
      <div style={{ textAlign: 'center', marginBottom: 32, ...titleStyle }}>
        <div style={{ fontSize: 28, fontWeight: 700, color: STONE[900], fontFamily: FONT_DISPLAY }}>
          Where your conversation lives
        </div>
        <div style={{ fontSize: 14, color: STONE[500], marginTop: 6, fontFamily: FONT }}>
          On your device. Not on our servers.
        </div>
      </div>

      {/* Device mockup */}
      <div style={{ textAlign: 'center', ...deviceStyle }}>
        <div
          style={{
            display: 'inline-block',
            background: STONE[100],
            borderRadius: 20,
            padding: '24px 32px',
            border: `2px solid ${STONE[200]}`,
          }}
        >
          {/* Screen */}
          <div
            style={{
              background: 'white',
              borderRadius: 12,
              padding: 16,
              width: 280,
              textAlign: 'left',
              border: `1px solid ${STONE[200]}`,
            }}
          >
            <div
              style={{
                fontSize: 11,
                fontWeight: 600,
                color: STONE[700],
                fontFamily: FONT,
                marginBottom: 8,
              }}
            >
              🗂️ Your Browser - IndexedDB
            </div>
            <div style={{ fontSize: 10, color: STONE[500], fontFamily: FONT, lineHeight: 1.6 }}>
              📝 Menu planning - 5 messages{'\n'}
              📝 Event prep - 3 messages{'\n'}
              📝 Client follow-up - 2 messages
            </div>
          </div>

          <div style={{ fontSize: 10, color: STONE[400], fontFamily: FONT, marginTop: 10 }}>
            Your Device
          </div>
        </div>
      </div>

      {/* Labels */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          gap: 24,
          marginTop: 24,
          ...labelStyle,
        }}
      >
        {['✓ Stays on your device', '✓ Clear anytime', '✓ Not on our servers'].map((txt) => (
          <div
            key={txt}
            style={{
              fontSize: 12,
              fontWeight: 600,
              color: GREEN[700],
              fontFamily: FONT,
            }}
          >
            {txt}
          </div>
        ))}
      </div>
    </div>
  )
}

function Scene6() {
  const frame = useCurrentFrame()
  if (frame < S6_START) return null
  const fadeIn = useFade(S6_START, 20)

  const line1 = useSlideIn(S6_START + 20)
  const line2 = useSlideIn(S6_START + 50)
  const line3 = useSlideIn(S6_START + 80)
  const logoStyle = useSlideIn(S6_START + 120)

  return (
    <div
      style={{
        opacity: fadeIn,
        position: 'absolute',
        inset: 0,
        padding: 40,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <div style={{ maxWidth: 420, textAlign: 'center' }}>
        <div style={{ marginBottom: 16, ...line1 }}>
          <div
            style={{ fontSize: 24, fontWeight: 700, color: STONE[900], fontFamily: FONT_DISPLAY }}
          >
            We can&apos;t read your conversations.
          </div>
        </div>
        <div style={{ marginBottom: 8, ...line2 }}>
          <div style={{ fontSize: 16, color: STONE[500], fontFamily: FONT }}>
            Not because we promised not to.
          </div>
        </div>
        <div style={{ marginBottom: 40, ...line3 }}>
          <div style={{ fontSize: 16, fontWeight: 600, color: GREEN[700], fontFamily: FONT }}>
            Because they&apos;re not on our servers.
          </div>
        </div>

        {/* ChefFlow logo area */}
        <div style={{ ...logoStyle }}>
          <div
            style={{
              fontSize: 28,
              fontWeight: 700,
              color: BRAND[500],
              fontFamily: FONT_DISPLAY,
              marginBottom: 4,
            }}
          >
            ChefFlow
          </div>
          <div style={{ fontSize: 12, color: STONE[400], fontFamily: FONT, letterSpacing: 2 }}>
            OPS FOR ARTISTS
          </div>
        </div>
      </div>
    </div>
  )
}

/* ─── Main Composition ───────────────────────────────────────────── */

export function RemyPrivacySchematic() {
  return (
    <AbsoluteFill
      style={{
        backgroundColor: 'white',
        fontFamily: FONT,
      }}
    >
      <Scene1 />
      <Scene2 />
      <Scene3 />
      <Scene4 />
      <Scene5 />
      <Scene6 />
    </AbsoluteFill>
  )
}
