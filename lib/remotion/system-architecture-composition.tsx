/**
 * SystemArchitectureComposition - Remotion animation for the full ChefFlow stack.
 *
 * Animated schematic showing every piece of the system and how they connect:
 *   Phase 1: Your Desk (VS Code → Next.js → Ollama PC + Pi)
 *   Phase 2: The Internet (GitHub → Vercel → Supabase / Stripe / APIs)
 *   Phase 3: Full picture with data flow arrows
 *
 * Educational. Designed for someone who thinks visually.
 * 20 seconds total, looping.
 */

import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion'

/* ─── Brand / Palette ─────────────────────────────────────────── */

const BRAND = {
  50: '#fdf5ef',
  100: '#fae8d5',
  200: '#f5cda6',
  400: '#eda86b',
  500: '#e88f47',
  600: '#d47530',
}

const STONE = {
  900: '#1c1917',
  700: '#44403c',
  600: '#57534e',
  500: '#78716c',
  400: '#a8a29e',
  300: '#d6d3d1',
  200: '#e7e5e3',
  100: '#f5f5f4',
  50: '#fafaf9',
}

const BLUE = {
  50: '#eff6ff',
  100: '#dbeafe',
  200: '#bfdbfe',
  400: '#60a5fa',
  500: '#3b82f6',
  600: '#2563eb',
}

const GREEN = {
  50: '#ecfdf5',
  100: '#d1fae5',
  200: '#a7f3d0',
  400: '#34d399',
  500: '#10b981',
  600: '#059669',
}

const PURPLE = {
  50: '#faf5ff',
  100: '#f3e8ff',
  400: '#c084fc',
  500: '#a855f7',
}

const RED = {
  50: '#fef2f2',
  400: '#f87171',
  500: '#ef4444',
}

/* ─── Timing (frames @ 30fps) ─────────────────────────────────── */

// Phase 1: Local (your desk) - 0-240 (8 seconds)
const P1_START = 0
const P1_VSCODE = 15
const P1_NEXTJS = 45
const P1_OLLAMA_PC = 75
// P1_OLLAMA_PI removed (Pi retired 2026-03-17)
const P1_ARROWS_LOCAL = 130

// Phase 2: Cloud services - 240-420 (6 seconds)
const P2_START = 180
const P2_GITHUB = 195
const P2_VERCEL = 225
const P2_SUPABASE = 250
const P2_STRIPE = 270
const P2_APIS = 290

// Phase 3: Full picture + flow - 420-600 (6 seconds)
const P3_START = 330
const P3_ARROWS = 345
const P3_LABELS = 375
const P3_HOLD = 420

// Total: 600 frames = 20 seconds
const TOTAL_FRAMES = 600

/* ─── Helpers ─────────────────────────────────────────────────── */

function useFadeIn(startFrame: number, durationFrames = 20) {
  const frame = useCurrentFrame()
  return interpolate(frame, [startFrame, startFrame + durationFrames], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  })
}

function useSlideIn(
  startFrame: number,
  direction: 'up' | 'down' | 'left' | 'right' = 'up',
  distancePx = 20
) {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  const progress = spring({
    frame: Math.max(0, frame - startFrame),
    fps,
    config: { damping: 18, stiffness: 120 },
  })
  const offset = interpolate(progress, [0, 1], [distancePx, 0])
  const opacity = interpolate(frame, [startFrame, startFrame + 15], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  })

  const transforms: Record<string, string> = {
    up: `translateY(${offset}px)`,
    down: `translateY(${-offset}px)`,
    left: `translateX(${offset}px)`,
    right: `translateX(${-offset}px)`,
  }

  return { opacity, transform: transforms[direction] }
}

function usePulse(startFrame: number, cycleFrames = 60) {
  const frame = useCurrentFrame()
  if (frame < startFrame) return 1
  const t = ((frame - startFrame) % cycleFrames) / cycleFrames
  return 0.7 + 0.3 * Math.sin(t * Math.PI * 2)
}

/* ─── Sub-components ──────────────────────────────────────────── */

interface BoxProps {
  x: number
  y: number
  w: number
  h: number
  fill: string
  stroke: string
  icon: string
  title: string
  subtitle?: string
  style?: React.CSSProperties
}

function SystemBox({ x, y, w, h, fill, stroke, icon, title, subtitle, style }: BoxProps) {
  return (
    <div
      style={{
        position: 'absolute',
        left: x,
        top: y,
        width: w,
        height: h,
        backgroundColor: fill,
        border: `2px solid ${stroke}`,
        borderRadius: 10,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '6px 8px',
        ...style,
      }}
    >
      <span style={{ fontSize: 18, marginBottom: 2 }}>{icon}</span>
      <span
        style={{
          fontSize: 11,
          fontWeight: 700,
          color: STONE[900],
          fontFamily: 'Inter, system-ui, sans-serif',
          textAlign: 'center',
          lineHeight: 1.2,
        }}
      >
        {title}
      </span>
      {subtitle && (
        <span
          style={{
            fontSize: 9,
            color: STONE[500],
            fontFamily: 'Inter, system-ui, sans-serif',
            textAlign: 'center',
            marginTop: 1,
          }}
        >
          {subtitle}
        </span>
      )}
    </div>
  )
}

interface ArrowProps {
  x1: number
  y1: number
  x2: number
  y2: number
  color: string
  progress: number
  dashed?: boolean
  label?: string
  labelOffset?: { x: number; y: number }
}

function Arrow({ x1, y1, x2, y2, color, progress, dashed, label, labelOffset }: ArrowProps) {
  if (progress <= 0) return null
  const endX = x1 + (x2 - x1) * progress
  const endY = y1 + (y2 - y1) * progress
  const midX = (x1 + x2) / 2 + (labelOffset?.x ?? 0)
  const midY = (y1 + y2) / 2 + (labelOffset?.y ?? 0)

  return (
    <svg
      style={{
        position: 'absolute',
        left: 0,
        top: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
      }}
    >
      <line
        x1={x1}
        y1={y1}
        x2={endX}
        y2={endY}
        stroke={color}
        strokeWidth={2}
        strokeDasharray={dashed ? '6,4' : undefined}
        markerEnd={progress >= 0.95 ? `url(#arrow-${color.replace('#', '')})` : undefined}
      />
      <defs>
        <marker
          id={`arrow-${color.replace('#', '')}`}
          markerWidth="8"
          markerHeight="6"
          refX="7"
          refY="3"
          orient="auto"
        >
          <polygon points="0 0, 8 3, 0 6" fill={color} />
        </marker>
      </defs>
      {label && progress >= 0.8 && (
        <text
          x={midX}
          y={midY}
          textAnchor="middle"
          fill={STONE[500]}
          fontSize={8}
          fontFamily="Inter, system-ui, sans-serif"
          opacity={Math.min(1, (progress - 0.8) * 5)}
        >
          {label}
        </text>
      )}
    </svg>
  )
}

function ZoneBorder({
  x,
  y,
  w,
  h,
  label,
  color,
  opacity,
}: {
  x: number
  y: number
  w: number
  h: number
  label: string
  color: string
  opacity: number
}) {
  return (
    <div
      style={{
        position: 'absolute',
        left: x,
        top: y,
        width: w,
        height: h,
        border: `2px dashed ${color}`,
        borderRadius: 14,
        opacity,
      }}
    >
      <span
        style={{
          position: 'absolute',
          top: -10,
          left: 16,
          backgroundColor: 'white',
          padding: '0 8px',
          fontSize: 10,
          fontWeight: 700,
          color,
          fontFamily: 'Inter, system-ui, sans-serif',
          letterSpacing: '0.05em',
          textTransform: 'uppercase',
        }}
      >
        {label}
      </span>
    </div>
  )
}

function PulsingDot({
  x,
  y,
  color,
  size = 8,
  opacity = 1,
  pulse = 1,
}: {
  x: number
  y: number
  color: string
  size?: number
  opacity?: number
  pulse?: number
}) {
  return (
    <div
      style={{
        position: 'absolute',
        left: x - size / 2,
        top: y - size / 2,
        width: size,
        height: size,
        borderRadius: '50%',
        backgroundColor: color,
        opacity: opacity * pulse,
        boxShadow: `0 0 ${size}px ${color}40`,
      }}
    />
  )
}

/* ─── Main Composition ────────────────────────────────────────── */

export function SystemArchitectureComposition() {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()

  // Title
  const titleOpacity = useFadeIn(0, 20)
  const titleFadeOut = interpolate(frame, [P3_HOLD + 150, TOTAL_FRAMES], [1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  })

  // Phase 1: Local boxes
  const vscodeStyle = useSlideIn(P1_VSCODE, 'left')
  const nextjsStyle = useSlideIn(P1_NEXTJS, 'up')
  const ollamaPcStyle = useSlideIn(P1_OLLAMA_PC, 'up')
  // Pi Ollama removed (Pi retired 2026-03-17)

  // Phase 2: Cloud boxes
  const githubStyle = useSlideIn(P2_GITHUB, 'up')
  const vercelStyle = useSlideIn(P2_VERCEL, 'up')
  const supabaseStyle = useSlideIn(P2_SUPABASE, 'up')
  const stripeStyle = useSlideIn(P2_STRIPE, 'up')
  const apisStyle = useSlideIn(P2_APIS, 'up')

  // Zone borders
  const localZoneOpacity = useFadeIn(P1_START + 5, 30)
  const cloudZoneOpacity = useFadeIn(P2_START, 30)

  // Arrow progress (Phase 1 local)
  const arrowLocalProgress = interpolate(frame, [P1_ARROWS_LOCAL, P1_ARROWS_LOCAL + 40], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  })

  // Arrow progress (Phase 2 cloud)
  const arrowCloudProgress = interpolate(frame, [P2_APIS + 20, P2_APIS + 60], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  })

  // Arrow progress (Phase 3 cross-connections)
  const arrowCrossProgress = interpolate(frame, [P3_ARROWS, P3_ARROWS + 50], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  })

  // Pulsing dots for live connections
  const pcPulse = usePulse(P1_OLLAMA_PC + 20, 45)
  // piPulse removed (Pi retired)
  const dbPulse = usePulse(P2_SUPABASE + 20, 50)

  // Phase labels
  const labelOpacity = useFadeIn(P3_LABELS, 20)

  // ─── Layout constants ───────────────────────────────────────

  // Local zone (left half)
  const LZ = { x: 16, y: 40, w: 300, h: 340 }
  // Cloud zone (right half)
  const CZ = { x: 334, y: 40, w: 290, h: 340 }

  // Box positions - local
  const VSCODE = { x: 30, y: 70, w: 88, h: 68 }
  const CLAUDE = { x: 30, y: 155, w: 88, h: 68 }
  const NEXTJS = { x: 150, y: 105, w: 100, h: 80 }
  const PC_OLLAMA = { x: 150, y: 210, w: 100, h: 68 }
  // PI_OLLAMA removed (Pi retired 2026-03-17)
  const BROWSER = { x: 270, y: 70, w: 0, h: 0 } // Used for arrow targets

  // Box positions - cloud
  const GITHUB = { x: 350, y: 65, w: 88, h: 68 }
  const VERCEL = { x: 462, y: 65, w: 88, h: 68 }
  const SUPABASE = { x: 350, y: 160, w: 88, h: 74 }
  const STRIPE = { x: 462, y: 160, w: 88, h: 74 }
  const GMAIL = { x: 350, y: 260, w: 88, h: 62 }
  const GROCERY = { x: 462, y: 260, w: 88, h: 62 }

  return (
    <AbsoluteFill
      style={{
        backgroundColor: 'white',
        fontFamily: 'Inter, system-ui, sans-serif',
        overflow: 'hidden',
      }}
    >
      {/* ─── Title ─────────────────────────────────────────────── */}
      <div
        style={{
          position: 'absolute',
          top: 10,
          left: 0,
          right: 0,
          textAlign: 'center',
          opacity: titleOpacity * titleFadeOut,
        }}
      >
        <span
          style={{
            fontSize: 16,
            fontWeight: 800,
            color: STONE[900],
            fontFamily: "'DM Serif Display', Georgia, serif",
            letterSpacing: '-0.01em',
          }}
        >
          ChefFlow - Full System Architecture
        </span>
      </div>

      {/* ─── Zone Borders ──────────────────────────────────────── */}
      <ZoneBorder
        x={LZ.x}
        y={LZ.y}
        w={LZ.w}
        h={LZ.h}
        label="Your Desk (local network)"
        color={GREEN[500]}
        opacity={localZoneOpacity}
      />
      <ZoneBorder
        x={CZ.x}
        y={CZ.y}
        w={CZ.w}
        h={CZ.h}
        label="The Internet (cloud)"
        color={BLUE[500]}
        opacity={cloudZoneOpacity}
      />

      {/* ─── PHASE 1: Local Boxes ──────────────────────────────── */}

      <div style={vscodeStyle}>
        <SystemBox
          {...VSCODE}
          fill={PURPLE[50]}
          stroke={PURPLE[400]}
          icon="💻"
          title="VS Code"
          subtitle="You edit code"
        />
      </div>

      <div style={vscodeStyle}>
        <SystemBox
          {...CLAUDE}
          fill={BRAND[50]}
          stroke={BRAND[500]}
          icon="🤖"
          title="Claude Code"
          subtitle="I help build"
        />
      </div>

      <div style={nextjsStyle}>
        <SystemBox
          {...NEXTJS}
          fill={STONE[50]}
          stroke={STONE[400]}
          icon="⚡"
          title="Next.js"
          subtitle="localhost:3100"
        />
      </div>

      <div style={ollamaPcStyle}>
        <SystemBox
          {...PC_OLLAMA}
          fill={GREEN[50]}
          stroke={GREEN[500]}
          icon="🧠"
          title="PC Ollama"
          subtitle="qwen3-coder:30b"
        />
        <PulsingDot
          x={PC_OLLAMA.x + PC_OLLAMA.w - 4}
          y={PC_OLLAMA.y + 8}
          color={GREEN[500]}
          opacity={ollamaPcStyle.opacity as number}
          pulse={pcPulse}
        />
      </div>

      {/* Pi Ollama node removed (Pi retired 2026-03-17) */}

      {/* ─── PHASE 2: Cloud Boxes ──────────────────────────────── */}

      <div style={githubStyle}>
        <SystemBox
          {...GITHUB}
          fill={STONE[50]}
          stroke={STONE[300]}
          icon="🐙"
          title="GitHub"
          subtitle="Code backup"
        />
      </div>

      <div style={vercelStyle}>
        <SystemBox
          {...VERCEL}
          fill={STONE[50]}
          stroke={STONE[700]}
          icon="▲"
          title="Vercel"
          subtitle="app.cheflowhq.com"
        />
      </div>

      <div style={supabaseStyle}>
        <SystemBox
          {...SUPABASE}
          fill={GREEN[50]}
          stroke={GREEN[600]}
          icon="🗄️"
          title="Supabase"
          subtitle="Database + Auth"
        />
        <PulsingDot
          x={SUPABASE.x + SUPABASE.w - 4}
          y={SUPABASE.y + 8}
          color={GREEN[600]}
          opacity={supabaseStyle.opacity as number}
          pulse={dbPulse}
        />
      </div>

      <div style={stripeStyle}>
        <SystemBox
          {...STRIPE}
          fill={PURPLE[50]}
          stroke={PURPLE[500]}
          icon="💳"
          title="Stripe"
          subtitle="Payments"
        />
      </div>

      <div style={apisStyle}>
        <SystemBox
          {...GMAIL}
          fill={RED[50]}
          stroke={RED[400]}
          icon="📧"
          title="Gmail API"
          subtitle="Client emails"
        />
      </div>

      <div style={apisStyle}>
        <SystemBox
          {...GROCERY}
          fill={BRAND[50]}
          stroke={BRAND[400]}
          icon="🛒"
          title="Grocery APIs"
          subtitle="Pricing data"
        />
      </div>

      {/* ─── ARROWS: Local connections ─────────────────────────── */}

      {/* VS Code → Next.js */}
      <Arrow
        x1={VSCODE.x + VSCODE.w}
        y1={VSCODE.y + VSCODE.h / 2 + 15}
        x2={NEXTJS.x}
        y2={NEXTJS.y + NEXTJS.h / 2}
        color={PURPLE[400]}
        progress={arrowLocalProgress}
        label="code"
      />

      {/* Claude → Next.js */}
      <Arrow
        x1={CLAUDE.x + CLAUDE.w}
        y1={CLAUDE.y + CLAUDE.h / 2 - 5}
        x2={NEXTJS.x}
        y2={NEXTJS.y + NEXTJS.h / 2 + 10}
        color={BRAND[500]}
        progress={arrowLocalProgress}
        label="edits"
      />

      {/* Next.js → PC Ollama */}
      <Arrow
        x1={NEXTJS.x + NEXTJS.w / 2}
        y1={NEXTJS.y + NEXTJS.h}
        x2={PC_OLLAMA.x + PC_OLLAMA.w / 2}
        y2={PC_OLLAMA.y}
        color={GREEN[500]}
        progress={arrowLocalProgress}
        label="AI calls"
        labelOffset={{ x: 24, y: -4 }}
      />

      {/* PC Ollama standalone (Pi retired) */}
      {/* Arrow to Pi removed
        label="failover"
        labelOffset={{ x: 28, y: -4 }}
      />

      {/* ─── ARROWS: Cloud connections ─────────────────────────── */}

      {/* GitHub → Vercel */}
      <Arrow
        x1={GITHUB.x + GITHUB.w}
        y1={GITHUB.y + GITHUB.h / 2}
        x2={VERCEL.x}
        y2={VERCEL.y + VERCEL.h / 2}
        color={STONE[400]}
        progress={arrowCloudProgress}
        label="deploy"
      />

      {/* ─── ARROWS: Cross connections (Phase 3) ───────────────── */}

      {/* Next.js → Supabase (data) */}
      <Arrow
        x1={NEXTJS.x + NEXTJS.w}
        y1={NEXTJS.y + NEXTJS.h / 2 + 5}
        x2={SUPABASE.x}
        y2={SUPABASE.y + SUPABASE.h / 2}
        color={GREEN[600]}
        progress={arrowCrossProgress}
        label="data"
        labelOffset={{ x: 0, y: -8 }}
      />

      {/* Next.js → Stripe */}
      <Arrow
        x1={NEXTJS.x + NEXTJS.w + 10}
        y1={NEXTJS.y + NEXTJS.h - 5}
        x2={STRIPE.x}
        y2={STRIPE.y + STRIPE.h / 2}
        color={PURPLE[500]}
        progress={arrowCrossProgress}
        dashed
        label="payments"
        labelOffset={{ x: -10, y: -8 }}
      />

      {/* Git push: local → GitHub */}
      <Arrow
        x1={VSCODE.x + VSCODE.w / 2 + 10}
        y1={VSCODE.y}
        x2={GITHUB.x + GITHUB.w / 2}
        y2={GITHUB.y + GITHUB.h}
        color={STONE[300]}
        progress={arrowCrossProgress}
        dashed
        label="git push"
        labelOffset={{ x: 0, y: -30 }}
      />

      {/* Vercel → Supabase */}
      <Arrow
        x1={VERCEL.x + VERCEL.w / 2}
        y1={VERCEL.y + VERCEL.h}
        x2={SUPABASE.x + SUPABASE.w}
        y2={SUPABASE.y + 10}
        color={GREEN[600]}
        progress={arrowCloudProgress}
        dashed
        label="same DB"
        labelOffset={{ x: 12, y: -4 }}
      />

      {/* ─── Phase 3: Flow Labels ──────────────────────────────── */}

      {/* "Your browser" label */}
      <div
        style={{
          position: 'absolute',
          left: 267,
          top: 72,
          opacity: labelOpacity,
        }}
      >
        <div
          style={{
            width: 54,
            height: 50,
            borderRadius: 8,
            backgroundColor: BRAND[50],
            border: `2px solid ${BRAND[400]}`,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <span style={{ fontSize: 16 }}>🌐</span>
          <span style={{ fontSize: 8, fontWeight: 700, color: STONE[600] }}>Browser</span>
        </div>
      </div>

      {/* Arrow: Next.js → Browser */}
      <Arrow
        x1={NEXTJS.x + NEXTJS.w}
        y1={NEXTJS.y + 20}
        x2={267}
        y2={97}
        color={BRAND[500]}
        progress={arrowLocalProgress}
        label="pages"
        labelOffset={{ x: 0, y: -8 }}
      />

      {/* ─── Bottom Legend ─────────────────────────────────────── */}
      <div
        style={{
          position: 'absolute',
          bottom: 8,
          left: 0,
          right: 0,
          display: 'flex',
          justifyContent: 'center',
          gap: 20,
          opacity: labelOpacity,
        }}
      >
        <LegendItem color={GREEN[500]} label="Local / Private" />
        <LegendItem color={BLUE[500]} label="Cloud Services" />
        <LegendItem color={BRAND[500]} label="Your App" />
        <LegendItem color={STONE[300]} dashed label="Backup / Deploy" />
      </div>
    </AbsoluteFill>
  )
}

function LegendItem({ color, label, dashed }: { color: string; label: string; dashed?: boolean }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
      <svg width="20" height="4">
        <line
          x1="0"
          y1="2"
          x2="20"
          y2="2"
          stroke={color}
          strokeWidth={2}
          strokeDasharray={dashed ? '4,3' : undefined}
        />
      </svg>
      <span style={{ fontSize: 8, color: STONE[500], fontFamily: 'Inter, system-ui, sans-serif' }}>
        {label}
      </span>
    </div>
  )
}
