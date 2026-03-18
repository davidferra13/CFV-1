/**
 * MessagingGuideComposition - Remotion animation explaining the 4 messaging channels.
 *
 * Shows when to use each:
 *  1. Chat - real-time conversations with clients
 *  2. Inbox - emails, form submissions, bookings
 *  3. Event Messages - thread tied to a specific event
 *  4. Inquiry Messages - thread tied to an incoming inquiry
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

/* ─── Channels ────────────────────────────────────────────────── */

const CHANNELS = [
  {
    icon: '💬',
    name: 'Chat',
    when: 'Quick back-and-forth with a client',
    example: '"Hey, can we add 2 more guests?"',
    color: '#dbeafe',
    borderColor: '#93c5fd',
    textColor: '#1e40af',
  },
  {
    icon: '📥',
    name: 'Inbox',
    when: 'Emails, form submissions, bookings',
    example: 'Syncs with Gmail - all notifications land here',
    color: '#d1fae5',
    borderColor: '#6ee7b7',
    textColor: '#065f46',
  },
  {
    icon: '📅',
    name: 'Event Thread',
    when: 'Discussion tied to a specific event',
    example: '"Menu approved for the Johnson wedding"',
    color: '#fef3c7',
    borderColor: '#fcd34d',
    textColor: '#92400e',
  },
  {
    icon: '📬',
    name: 'Inquiry Thread',
    when: 'Responding to a new inquiry',
    example: '"Thanks for reaching out! Here\'s my availability..."',
    color: '#fce7f3',
    borderColor: '#f9a8d4',
    textColor: '#9d174d',
  },
]

/* ─── Timing ──────────────────────────────────────────────────── */

const INTRO = 25
const CHANNEL_DURATION = 75
const getChannelStart = (i: number) => INTRO + i * CHANNEL_DURATION

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

/* ─── Channel Indicator ───────────────────────────────────────── */

function ChannelTabs({ active }: { active: number }) {
  return (
    <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginBottom: 16 }}>
      {CHANNELS.map((ch, i) => {
        const isActive = i === active
        return (
          <div
            key={ch.name}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              padding: '4px 10px',
              borderRadius: 6,
              backgroundColor: isActive ? ch.color : STONE[50],
              border: `1.5px solid ${isActive ? ch.borderColor : STONE[200]}`,
            }}
          >
            <span style={{ fontSize: 12 }}>{ch.icon}</span>
            <span
              style={{
                fontSize: 9,
                fontWeight: 600,
                color: isActive ? ch.textColor : STONE[400],
                fontFamily: 'Inter, system-ui, sans-serif',
              }}
            >
              {ch.name}
            </span>
          </div>
        )
      })}
    </div>
  )
}

/* ─── Channel Detail ──────────────────────────────────────────── */

function ChannelDetail({
  channel,
  progress,
}: {
  channel: (typeof CHANNELS)[number]
  progress: number
}) {
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
          width: 56,
          height: 56,
          borderRadius: 14,
          backgroundColor: channel.color,
          border: `2px solid ${channel.borderColor}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 28,
          marginBottom: 12,
        }}
      >
        {channel.icon}
      </div>
      <div
        style={{
          fontSize: 20,
          fontWeight: 700,
          color: STONE[900],
          fontFamily: 'Inter, system-ui, sans-serif',
          marginBottom: 6,
        }}
      >
        {channel.name}
      </div>
      <div
        style={{
          fontSize: 13,
          fontWeight: 600,
          color: channel.textColor,
          fontFamily: 'Inter, system-ui, sans-serif',
          marginBottom: 10,
        }}
      >
        {channel.when}
      </div>
      {/* Example message bubble */}
      <div
        style={{
          backgroundColor: channel.color,
          border: `1px solid ${channel.borderColor}`,
          borderRadius: 10,
          padding: '8px 16px',
          maxWidth: 340,
        }}
      >
        <div
          style={{
            fontSize: 11,
            color: channel.textColor,
            fontFamily: 'Inter, system-ui, sans-serif',
            fontStyle: 'italic',
            textAlign: 'center' as const,
          }}
        >
          {channel.example}
        </div>
      </div>
    </div>
  )
}

/* ─── Main Composition ────────────────────────────────────────── */

export function MessagingGuideComposition() {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()

  const activeChannel = CHANNELS.reduce(
    (active, _, i) => (frame >= getChannelStart(i) ? i : active),
    0
  )
  const channelProgresses = CHANNELS.map((_, i) => useSpringVal(getChannelStart(i)))

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
            Messaging
          </div>
          <div style={{ fontSize: 20, fontWeight: 700, color: STONE[900] }}>
            Four channels - here&apos;s when to use each
          </div>
        </div>

        <ChannelTabs active={activeChannel} />

        <div style={{ position: 'relative', flex: 1 }}>
          {CHANNELS.map((channel, i) => {
            const isVisible =
              i === activeChannel ||
              (i === activeChannel - 1 && frame < getChannelStart(activeChannel) + 12)
            if (!isVisible) return null

            const exitOpacity =
              i < activeChannel
                ? interpolate(
                    frame,
                    [getChannelStart(i + 1), getChannelStart(i + 1) + 12],
                    [1, 0],
                    {
                      extrapolateLeft: 'clamp',
                      extrapolateRight: 'clamp',
                    }
                  )
                : 1

            return (
              <div
                key={channel.name}
                style={{ position: 'absolute', inset: 0, opacity: exitOpacity }}
              >
                <ChannelDetail channel={channel} progress={channelProgresses[i]} />
              </div>
            )
          })}
        </div>
      </div>
    </AbsoluteFill>
  )
}
