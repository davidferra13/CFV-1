/**
 * SettingsRoadmapComposition - Remotion animation showing settings priorities.
 *
 * Groups the 15+ settings sections into 3 priority tiers:
 *  1. Essential (do first) - Profile, Business Defaults, Stripe
 *  2. Important (do next) - Booking Page, Templates, Clients
 *  3. Optional (when ready) - Modules, Repertoire, Integrations
 *
 * Helps new chefs understand what to set up and in what order.
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
const BLUE = { bg: '#dbeafe', text: '#1e40af', border: '#93c5fd' }
const PURPLE = { bg: '#ede9fe', text: '#5b21b6', border: '#c4b5fd' }

/* ─── Priority Tiers ──────────────────────────────────────────── */

const TIERS = [
  {
    priority: '① Essential',
    subtitle: "Set these up first - your app won't work well without them",
    icon: '🔑',
    color: GREEN,
    items: [
      { icon: '👤', name: 'Profile & Branding', why: 'Your name, photo, and business info' },
      { icon: '⚙️', name: 'Business Defaults', why: 'Timezone, currency, service radius' },
      { icon: '💳', name: 'Stripe Connect', why: 'Required to accept payments' },
    ],
  },
  {
    priority: '② Important',
    subtitle: 'Set up before you start booking clients',
    icon: '📋',
    color: BLUE,
    items: [
      { icon: '📅', name: 'Booking Page', why: 'How clients find and inquire' },
      { icon: '✉️', name: 'Response Templates', why: 'Pre-written replies save hours' },
      { icon: '📊', name: 'Client Defaults', why: 'Default dietary, event type settings' },
    ],
  },
  {
    priority: '③ Optional',
    subtitle: "Customize when you're ready - skip if you're just getting started",
    icon: '✨',
    color: PURPLE,
    items: [
      { icon: '🧩', name: 'Modules', why: 'Show/hide nav sections' },
      { icon: '🎨', name: 'Seasonal Palettes', why: 'Ingredient planning by season' },
      { icon: '🔌', name: 'Integrations', why: 'Gmail sync, calendar, automations' },
    ],
  },
]

/* ─── Timing ──────────────────────────────────────────────────── */

const INTRO = 25
const TIER_DURATION = 105
const getTierStart = (i: number) => INTRO + i * TIER_DURATION

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

/* ─── Tier Card ───────────────────────────────────────────────── */

function TierCard({
  tier,
  progress,
  startFrame,
}: {
  tier: (typeof TIERS)[number]
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
      {/* Priority header */}
      <div
        style={{
          fontSize: 16,
          fontWeight: 700,
          color: tier.color.text,
          fontFamily: 'Inter, system-ui, sans-serif',
          marginBottom: 4,
        }}
      >
        {tier.icon} {tier.priority}
      </div>
      <div
        style={{
          fontSize: 10,
          color: STONE[500],
          fontFamily: 'Inter, system-ui, sans-serif',
          marginBottom: 14,
          textAlign: 'center' as const,
          maxWidth: 340,
        }}
      >
        {tier.subtitle}
      </div>

      {/* Settings items */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, width: 320 }}>
        {tier.items.map((item, j) => (
          <div
            key={item.name}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '6px 12px',
              borderRadius: 8,
              backgroundColor: tier.color.bg,
              border: `1px solid ${tier.color.border}`,
              ...useSlideUp(startFrame + 20 + j * 12),
            }}
          >
            <span style={{ fontSize: 16 }}>{item.icon}</span>
            <div>
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  color: STONE[900],
                  fontFamily: 'Inter, system-ui, sans-serif',
                }}
              >
                {item.name}
              </div>
              <div
                style={{
                  fontSize: 9,
                  color: tier.color.text,
                  fontFamily: 'Inter, system-ui, sans-serif',
                }}
              >
                {item.why}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ─── Priority indicator ──────────────────────────────────────── */

function PriorityBar({ active }: { active: number }) {
  return (
    <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginBottom: 14 }}>
      {TIERS.map((tier, i) => (
        <div
          key={tier.priority}
          style={{
            padding: '3px 10px',
            borderRadius: 5,
            backgroundColor: i === active ? tier.color.bg : STONE[50],
            border: `1.5px solid ${i === active ? tier.color.border : STONE[200]}`,
          }}
        >
          <span
            style={{
              fontSize: 9,
              fontWeight: 600,
              color: i === active ? tier.color.text : STONE[400],
              fontFamily: 'Inter, system-ui, sans-serif',
            }}
          >
            {tier.priority}
          </span>
        </div>
      ))}
    </div>
  )
}

/* ─── Main Composition ────────────────────────────────────────── */

export function SettingsRoadmapComposition() {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()

  const activeTier = TIERS.reduce((active, _, i) => (frame >= getTierStart(i) ? i : active), 0)
  const tierProgresses = TIERS.map((_, i) => useSpringVal(getTierStart(i)))

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
        style={{ padding: '22px 28px', display: 'flex', flexDirection: 'column', height: '100%' }}
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
            Settings Guide
          </div>
          <div style={{ fontSize: 18, fontWeight: 700, color: STONE[900] }}>
            What to set up - and in what order
          </div>
        </div>

        <PriorityBar active={activeTier} />

        <div style={{ position: 'relative', flex: 1 }}>
          {TIERS.map((tier, i) => {
            const isVisible =
              i === activeTier || (i === activeTier - 1 && frame < getTierStart(activeTier) + 12)
            if (!isVisible) return null

            const exitOpacity =
              i < activeTier
                ? interpolate(frame, [getTierStart(i + 1), getTierStart(i + 1) + 12], [1, 0], {
                    extrapolateLeft: 'clamp',
                    extrapolateRight: 'clamp',
                  })
                : 1

            return (
              <div
                key={tier.priority}
                style={{ position: 'absolute', inset: 0, opacity: exitOpacity }}
              >
                <TierCard tier={tier} progress={tierProgresses[i]} startFrame={getTierStart(i)} />
              </div>
            )
          })}
        </div>
      </div>
    </AbsoluteFill>
  )
}
