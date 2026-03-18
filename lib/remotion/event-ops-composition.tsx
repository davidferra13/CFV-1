/**
 * EventOpsComposition - Remotion animation explaining event operations features.
 *
 * Covers the 4 operational areas:
 *  1. Staff Assignments - who's working, hours, pay
 *  2. Temperature Logs - food safety compliance
 *  3. Contingency Plans - what-if scenarios
 *  4. Menu Modifications - what changed from the plan
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

/* ─── Ops Features ────────────────────────────────────────────── */

const FEATURES = [
  {
    icon: '👥',
    name: 'Staff Assignments',
    description: 'Assign team members, set hours, and track pay',
    details: [
      '📋 Scheduled vs actual hours',
      '💰 Pay auto-calculates from hourly rate',
      '✅ Mark staff as paid after the event',
    ],
    color: '#dbeafe',
    borderColor: '#93c5fd',
    textColor: '#1e40af',
  },
  {
    icon: '🌡️',
    name: 'Temperature Logs',
    description: 'FDA food safety compliance tracking',
    details: [
      '📊 Five phases: Receiving, Cold Hold, Hot Hold, Cooling, Reheat',
      '⚠️ Auto-flags temperatures outside safe zones',
      '📝 Create records for health inspections',
    ],
    color: '#fee2e2',
    borderColor: '#fca5a5',
    textColor: '#991b1b',
  },
  {
    icon: '🛟',
    name: 'Contingency Plans',
    description: 'Prepare for what-if scenarios before they happen',
    details: [
      '📌 Equipment failure, no-show, dietary emergency',
      '📞 Link backup contacts to specific scenarios',
      '📝 Write mitigation steps in advance',
    ],
    color: '#fef3c7',
    borderColor: '#fcd34d',
    textColor: '#92400e',
  },
  {
    icon: '🔄',
    name: 'Menu Modifications',
    description: 'Track what changed on service day vs the plan',
    details: [
      '🔀 Substituted - swapped one ingredient for another',
      '➕ Added - served something not on the original menu',
      '❌ Not Served - item was planned but not made',
    ],
    color: '#d1fae5',
    borderColor: '#6ee7b7',
    textColor: '#065f46',
  },
]

/* ─── Timing ──────────────────────────────────────────────────── */

const INTRO = 25
const FEATURE_DURATION = 75
const getFeatureStart = (i: number) => INTRO + i * FEATURE_DURATION

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

function useSlideUp(startFrame: number) {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  const progress = spring({
    frame: Math.max(0, frame - startFrame),
    fps,
    config: { damping: 16, stiffness: 120 },
  })
  const translateY = interpolate(progress, [0, 1], [10, 0])
  const opacity = interpolate(frame, [startFrame, startFrame + 10], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  })
  return { opacity, transform: `translateY(${translateY}px)` }
}

/* ─── Feature Card ────────────────────────────────────────────── */

function FeatureCard({
  feature,
  progress,
  startFrame,
}: {
  feature: (typeof FEATURES)[number]
  progress: number
  startFrame: number
}) {
  const opacity = interpolate(progress, [0, 0.4], [0, 1], { extrapolateRight: 'clamp' })
  const translateY = interpolate(progress, [0, 1], [20, 0])

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
          width: 48,
          height: 48,
          borderRadius: 12,
          backgroundColor: feature.color,
          border: `2px solid ${feature.borderColor}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 24,
          marginBottom: 8,
        }}
      >
        {feature.icon}
      </div>
      <div
        style={{
          fontSize: 17,
          fontWeight: 700,
          color: STONE[900],
          fontFamily: 'Inter, system-ui, sans-serif',
          marginBottom: 4,
        }}
      >
        {feature.name}
      </div>
      <div
        style={{
          fontSize: 11,
          color: STONE[500],
          fontFamily: 'Inter, system-ui, sans-serif',
          marginBottom: 12,
        }}
      >
        {feature.description}
      </div>

      {/* Details list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, maxWidth: 340 }}>
        {feature.details.map((detail, j) => (
          <div
            key={detail}
            style={{
              fontSize: 10,
              color: feature.textColor,
              fontFamily: 'Inter, system-ui, sans-serif',
              backgroundColor: feature.color,
              padding: '4px 10px',
              borderRadius: 5,
              border: `1px solid ${feature.borderColor}`,
              ...useSlideUp(startFrame + 15 + j * 10),
            }}
          >
            {detail}
          </div>
        ))}
      </div>
    </div>
  )
}

/* ─── Tab indicator ───────────────────────────────────────────── */

function OpsTabs({ active }: { active: number }) {
  return (
    <div style={{ display: 'flex', gap: 6, justifyContent: 'center', marginBottom: 14 }}>
      {FEATURES.map((f, i) => (
        <div
          key={f.name}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            padding: '3px 8px',
            borderRadius: 5,
            backgroundColor: i === active ? f.color : STONE[50],
            border: `1px solid ${i === active ? f.borderColor : STONE[200]}`,
          }}
        >
          <span style={{ fontSize: 11 }}>{f.icon}</span>
          <span
            style={{
              fontSize: 8,
              fontWeight: 600,
              color: i === active ? f.textColor : STONE[400],
              fontFamily: 'Inter, system-ui, sans-serif',
            }}
          >
            {f.name}
          </span>
        </div>
      ))}
    </div>
  )
}

/* ─── Main Composition ────────────────────────────────────────── */

export function EventOpsComposition() {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()

  const activeFeature = FEATURES.reduce(
    (active, _, i) => (frame >= getFeatureStart(i) ? i : active),
    0
  )
  const featureProgresses = FEATURES.map((_, i) => useSpringVal(getFeatureStart(i)))

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
        style={{ padding: '22px 24px', display: 'flex', flexDirection: 'column', height: '100%' }}
      >
        <div
          style={{
            textAlign: 'center' as const,
            marginBottom: 10,
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
            Event Operations
          </div>
          <div style={{ fontSize: 18, fontWeight: 700, color: STONE[900] }}>
            Everything that happens on service day
          </div>
        </div>

        <OpsTabs active={activeFeature} />

        <div style={{ position: 'relative', flex: 1 }}>
          {FEATURES.map((feature, i) => {
            const isVisible =
              i === activeFeature ||
              (i === activeFeature - 1 && frame < getFeatureStart(activeFeature) + 12)
            if (!isVisible) return null

            const exitOpacity =
              i < activeFeature
                ? interpolate(
                    frame,
                    [getFeatureStart(i + 1), getFeatureStart(i + 1) + 12],
                    [1, 0],
                    {
                      extrapolateLeft: 'clamp',
                      extrapolateRight: 'clamp',
                    }
                  )
                : 1

            return (
              <div
                key={feature.name}
                style={{ position: 'absolute', inset: 0, opacity: exitOpacity }}
              >
                <FeatureCard
                  feature={feature}
                  progress={featureProgresses[i]}
                  startFrame={getFeatureStart(i)}
                />
              </div>
            )
          })}
        </div>
      </div>
    </AbsoluteFill>
  )
}
