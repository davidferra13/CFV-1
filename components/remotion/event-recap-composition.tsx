// Remotion composition for a post-event recap video.
// Self-contained: no @/ aliases, no external ChefFlow deps.
// Renders a 15-second 1080x1080 recap card suitable for sharing.

import React from 'react'
import {
  AbsoluteFill,
  Sequence,
  useCurrentFrame,
  interpolate,
  spring,
  useVideoConfig,
} from 'remotion'

export type EventRecapProps = {
  occasion: string
  eventDate: string
  guestCount: number
  menuItems: string[]
  totalPaidDisplay: string
  chefName?: string
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function fadeIn(frame: number, from: number, duration = 20): number {
  return interpolate(frame, [from, from + duration], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  })
}

function slideUp(frame: number, from: number, fps: number, distance = 30): number {
  const progress = spring({ frame: frame - from, fps, config: { damping: 18, stiffness: 80 } })
  return interpolate(progress, [0, 1], [distance, 0])
}

// ─── Stage components ────────────────────────────────────────────────────────

function TitleStage({ occasion }: { occasion: string }) {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  return (
    <AbsoluteFill
      style={{
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        padding: '0 80px',
        gap: 16,
      }}
    >
      {/* Brand dot */}
      <div
        style={{
          width: 10,
          height: 10,
          borderRadius: '50%',
          background: '#f97316',
          opacity: fadeIn(frame, 0),
          marginBottom: 24,
        }}
      />
      <p
        style={{
          color: '#a8a29e',
          fontSize: 20,
          letterSpacing: 6,
          textTransform: 'uppercase',
          fontFamily: 'system-ui, sans-serif',
          fontWeight: 500,
          opacity: fadeIn(frame, 8),
          margin: 0,
        }}
      >
        Event Recap
      </p>
      <h1
        style={{
          color: '#fafaf9',
          fontSize: Math.min(96, 1800 / Math.max(occasion.length, 1)),
          fontFamily: 'Georgia, serif',
          fontWeight: 700,
          textAlign: 'center',
          lineHeight: 1.1,
          margin: 0,
          opacity: fadeIn(frame, 18),
          transform: `translateY(${slideUp(frame, 10, fps)}px)`,
        }}
      >
        {occasion}
      </h1>
    </AbsoluteFill>
  )
}

function InfoStage({ eventDate, guestCount }: { eventDate: string; guestCount: number }) {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()

  const items = [
    { label: 'Date', value: eventDate },
    { label: 'Guests', value: String(guestCount) },
  ]

  return (
    <AbsoluteFill
      style={{
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 48,
        padding: '0 80px',
      }}
    >
      {items.map((item, i) => (
        <div
          key={item.label}
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 8,
            opacity: fadeIn(frame, i * 12),
            transform: `translateY(${slideUp(frame, i * 10, fps)}px)`,
          }}
        >
          <p
            style={{
              color: '#a8a29e',
              fontSize: 16,
              letterSpacing: 4,
              textTransform: 'uppercase',
              fontFamily: 'system-ui, sans-serif',
              fontWeight: 500,
              margin: 0,
            }}
          >
            {item.label}
          </p>
          <p
            style={{
              color: '#fafaf9',
              fontSize: 48,
              fontFamily: 'Georgia, serif',
              fontWeight: 700,
              margin: 0,
              textAlign: 'center',
            }}
          >
            {item.value}
          </p>
        </div>
      ))}
    </AbsoluteFill>
  )
}

function MenuStage({ menuItems }: { menuItems: string[] }) {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  const capped = menuItems.slice(0, 5)

  return (
    <AbsoluteFill
      style={{
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'flex-start',
        padding: '0 100px',
        gap: 0,
      }}
    >
      <p
        style={{
          color: '#a8a29e',
          fontSize: 16,
          letterSpacing: 4,
          textTransform: 'uppercase',
          fontFamily: 'system-ui, sans-serif',
          fontWeight: 500,
          margin: '0 0 32px 0',
          opacity: fadeIn(frame, 0),
        }}
      >
        Menu
      </p>
      {capped.map((item, i) => {
        const stagger = i * 15
        return (
          <div
            key={i}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 20,
              marginBottom: 28,
              opacity: fadeIn(frame, stagger),
              transform: `translateX(${interpolate(frame, [stagger, stagger + 20], [-24, 0], {
                extrapolateLeft: 'clamp',
                extrapolateRight: 'clamp',
              })}px)`,
            }}
          >
            <div
              style={{
                width: 6,
                height: 6,
                borderRadius: '50%',
                background: '#f97316',
                flexShrink: 0,
              }}
            />
            <p
              style={{
                color: '#fafaf9',
                fontSize: 36,
                fontFamily: 'Georgia, serif',
                fontWeight: 400,
                margin: 0,
                lineHeight: 1.2,
              }}
            >
              {item}
            </p>
          </div>
        )
      })}
    </AbsoluteFill>
  )
}

function SummaryStage({
  totalPaidDisplay,
  chefName,
}: {
  totalPaidDisplay: string
  chefName?: string
}) {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()

  return (
    <AbsoluteFill
      style={{
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 20,
      }}
    >
      <p
        style={{
          color: '#a8a29e',
          fontSize: 16,
          letterSpacing: 4,
          textTransform: 'uppercase',
          fontFamily: 'system-ui, sans-serif',
          fontWeight: 500,
          margin: 0,
          opacity: fadeIn(frame, 0),
        }}
      >
        Total
      </p>
      <p
        style={{
          color: '#f97316',
          fontSize: 96,
          fontFamily: 'Georgia, serif',
          fontWeight: 700,
          margin: 0,
          opacity: fadeIn(frame, 10),
          transform: `translateY(${slideUp(frame, 5, fps)}px)`,
        }}
      >
        {totalPaidDisplay}
      </p>
      <div
        style={{
          width: 48,
          height: 2,
          background: '#44403c',
          margin: '8px 0',
          opacity: fadeIn(frame, 20),
        }}
      />
      <p
        style={{
          color: '#78716c',
          fontSize: 20,
          fontFamily: 'system-ui, sans-serif',
          fontWeight: 400,
          margin: 0,
          letterSpacing: 2,
          opacity: fadeIn(frame, 28),
        }}
      >
        {chefName ? `by ${chefName}` : 'ChefFlow'}
      </p>
    </AbsoluteFill>
  )
}

// ─── Root composition ────────────────────────────────────────────────────────

export function EventRecapComposition({
  occasion,
  eventDate,
  guestCount,
  menuItems,
  totalPaidDisplay,
  chefName,
}: EventRecapProps) {
  const frame = useCurrentFrame()

  // Global fade out at end
  const globalOpacity = interpolate(frame, [420, 450], [1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  })

  return (
    <AbsoluteFill
      style={{
        background: '#1c1917',
        opacity: globalOpacity,
      }}
    >
      {/* Title stage: 0-120 */}
      <Sequence from={0} durationInFrames={120}>
        <TitleStage occasion={occasion} />
      </Sequence>

      {/* Info stage: 120-210 */}
      <Sequence from={120} durationInFrames={90}>
        <InfoStage eventDate={eventDate} guestCount={guestCount} />
      </Sequence>

      {/* Menu stage: 210-360 (only if there are items) */}
      {menuItems.length > 0 && (
        <Sequence from={210} durationInFrames={150}>
          <MenuStage menuItems={menuItems} />
        </Sequence>
      )}

      {/* Summary stage: 360-420 */}
      <Sequence from={360} durationInFrames={60}>
        <SummaryStage totalPaidDisplay={totalPaidDisplay} chefName={chefName} />
      </Sequence>
    </AbsoluteFill>
  )
}
