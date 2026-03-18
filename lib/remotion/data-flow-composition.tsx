/**
 * DataFlowComposition - Remotion animation for the Remy privacy data flow.
 *
 * Shows two paths sequentially:
 *  1. "Other AI Apps" - data leaves the user, goes to remote servers, leaks to third parties (red)
 *  2. "ChefFlow + Remy" - data stays inside ChefFlow's boundary (green)
 *
 * Educational, not decorative. Helps users understand the privacy architecture.
 */

import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion'

/* ─── Brand / Palette ─────────────────────────────────────────── */

const RED = {
  bg: '#fef2f2',
  border: '#fca5a5',
  fill: '#fee2e2',
  stroke: '#f87171',
  arrow: '#ef4444',
  textDark: '#991b1b',
  textMid: '#dc2626',
  textLight: '#ef4444',
  bulletBg: '#fca5a5',
  panelBg: '#fef2f2',
  panelBorder: '#fecaca',
}

const GREEN = {
  bg: '#ecfdf5',
  border: '#6ee7b7',
  fill: '#d1fae5',
  stroke: '#34d399',
  arrow: '#10b981',
  textDark: '#064e3b',
  textMid: '#059669',
  textLight: '#10b981',
  bulletBg: '#6ee7b7',
  panelBg: '#ecfdf5',
  panelBorder: '#a7f3d0',
  lockBg: '#a7f3d0',
}

const STONE = {
  900: '#1c1917',
  600: '#57534e',
  500: '#78716c',
  200: '#e7e5e3',
  50: '#fafaf9',
}

/* ─── Timing (in frames @ 30fps) ─────────────────────────────── */

const PHASE_1_START = 0 // "Other AI Apps" begins
const PHASE_1_END = 150 // Pause on red side
const PHASE_2_START = 165 // "ChefFlow" begins
const PHASE_2_END = 330 // Pause on green side
// Total: 360 frames = 12 seconds

/* ─── Helpers ─────────────────────────────────────────────────── */

function useFadeIn(startFrame: number, durationFrames = 15) {
  const frame = useCurrentFrame()
  return interpolate(frame, [startFrame, startFrame + durationFrames], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  })
}

function useSlideUp(startFrame: number, distancePx = 12, durationFrames = 18) {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  const progress = spring({
    frame: frame - startFrame,
    fps,
    config: { damping: 18, stiffness: 120 },
  })
  const translateY = interpolate(progress, [0, 1], [distancePx, 0])
  const opacity = interpolate(frame, [startFrame, startFrame + durationFrames], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  })
  return { opacity, transform: `translateY(${translateY}px)` }
}

function useGrow(startFrame: number) {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  const progress = spring({
    frame: frame - startFrame,
    fps,
    config: { damping: 14, stiffness: 100 },
  })
  return interpolate(progress, [0, 1], [0, 1])
}

/* ─── Sub-components ──────────────────────────────────────────── */

function SectionTitle({ text, sub, opacity }: { text: string; sub: string; opacity: number }) {
  return (
    <div style={{ textAlign: 'center', marginBottom: 24, opacity }}>
      <div
        style={{
          fontSize: 22,
          fontWeight: 700,
          color: STONE[900],
          fontFamily: 'Inter, system-ui, sans-serif',
        }}
      >
        {text}
      </div>
      <div
        style={{
          fontSize: 13,
          color: STONE[500],
          marginTop: 4,
          fontFamily: 'Inter, system-ui, sans-serif',
        }}
      >
        {sub}
      </div>
    </div>
  )
}

function Box({
  x,
  y,
  w,
  h,
  fill,
  stroke,
  title,
  subtitle,
  titleColor,
  subColor,
  opacity,
}: {
  x: number
  y: number
  w: number
  h: number
  fill: string
  stroke: string
  title: string
  subtitle: string
  titleColor: string
  subColor: string
  opacity: number
}) {
  return (
    <g opacity={opacity}>
      <rect x={x} y={y} width={w} height={h} rx={8} fill={fill} stroke={stroke} strokeWidth={1.5} />
      <text
        x={x + w / 2}
        y={y + h * 0.38}
        textAnchor="middle"
        fill={titleColor}
        fontSize={11}
        fontWeight={600}
        fontFamily="Inter, system-ui, sans-serif"
      >
        {title}
      </text>
      <text
        x={x + w / 2}
        y={y + h * 0.68}
        textAnchor="middle"
        fill={subColor}
        fontSize={9}
        fontFamily="Inter, system-ui, sans-serif"
      >
        {subtitle}
      </text>
    </g>
  )
}

function AnimatedArrow({
  x1,
  y1,
  x2,
  y2,
  color,
  progress,
  markerId,
}: {
  x1: number
  y1: number
  x2: number
  y2: number
  color: string
  progress: number
  markerId: string
}) {
  const currentX = interpolate(progress, [0, 1], [x1, x2])
  const currentY = interpolate(progress, [0, 1], [y1, y2])
  if (progress <= 0) return null
  return (
    <line
      x1={x1}
      y1={y1}
      x2={currentX}
      y2={currentY}
      stroke={color}
      strokeWidth={2}
      markerEnd={progress > 0.8 ? `url(#${markerId})` : undefined}
    />
  )
}

function BulletPoint({
  y,
  text,
  bgColor,
  textColor,
  icon,
  style,
}: {
  y: number
  text: string
  bgColor: string
  textColor: string
  icon: string
  style: React.CSSProperties
}) {
  return (
    <g transform={`translate(10, ${y})`} style={style}>
      <circle cx={8} cy={8} r={8} fill={bgColor} />
      <text
        x={8}
        y={12}
        textAnchor="middle"
        fill={textColor}
        fontSize={10}
        fontWeight={700}
        fontFamily="Inter, system-ui, sans-serif"
      >
        {icon}
      </text>
      <text x={22} y={12} fill={textColor} fontSize={9} fontFamily="Inter, system-ui, sans-serif">
        {text}
      </text>
    </g>
  )
}

/* ─── Phase 1: Other AI Apps (Red) ────────────────────────────── */

function RedSide() {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()

  // Element timings (staggered appearance)
  const userBoxOpacity = useFadeIn(PHASE_1_START + 10)
  const arrowDownProgress = useGrow(PHASE_1_START + 30)
  const serverBoxOpacity = useFadeIn(PHASE_1_START + 50)
  const arrowRightProgress = useGrow(PHASE_1_START + 70)
  const thirdPartyOpacity = useFadeIn(PHASE_1_START + 85)
  const bullet1Style = useSlideUp(PHASE_1_START + 100)
  const bullet2Style = useSlideUp(PHASE_1_START + 112)
  const bullet3Style = useSlideUp(PHASE_1_START + 124)

  // Phase visibility - fade out when transitioning to green
  const phaseOpacity = interpolate(frame, [PHASE_1_END, PHASE_1_END + 15], [1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  })

  return (
    <div style={{ opacity: phaseOpacity }}>
      {/* Panel header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          marginBottom: 16,
          opacity: useFadeIn(PHASE_1_START + 5),
        }}
      >
        <div
          style={{
            width: 32,
            height: 32,
            borderRadius: '50%',
            backgroundColor: '#fee2e2',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 14,
          }}
        >
          ☁️
        </div>
        <div>
          <div
            style={{
              fontSize: 14,
              fontWeight: 600,
              color: RED.textDark,
              fontFamily: 'Inter, system-ui, sans-serif',
            }}
          >
            Other AI Apps
          </div>
          <div
            style={{ fontSize: 11, color: RED.textMid, fontFamily: 'Inter, system-ui, sans-serif' }}
          >
            Your data gets sent to third parties
          </div>
        </div>
      </div>

      {/* SVG diagram */}
      <svg viewBox="0 0 280 220" style={{ width: '100%' }}>
        <defs>
          <marker id="arrowRed" markerWidth={8} markerHeight={6} refX={8} refY={3} orient="auto">
            <path d="M0,0 L8,3 L0,6 Z" fill={RED.arrow} />
          </marker>
        </defs>

        <Box
          x={10}
          y={10}
          w={120}
          h={50}
          fill={RED.bg}
          stroke={RED.border}
          title="You"
          subtitle="Client names, budgets..."
          titleColor={RED.textDark}
          subColor={RED.textLight}
          opacity={userBoxOpacity}
        />

        <g opacity={userBoxOpacity}>
          <text
            x={105}
            y={80}
            fill={RED.textMid}
            fontSize={8}
            fontWeight={500}
            fontFamily="Inter, system-ui, sans-serif"
          >
            SENT TO
          </text>
        </g>

        <AnimatedArrow
          x1={70}
          y1={60}
          x2={70}
          y2={90}
          color={RED.arrow}
          progress={arrowDownProgress}
          markerId="arrowRed"
        />

        <Box
          x={10}
          y={90}
          w={120}
          h={50}
          fill={RED.fill}
          stroke={RED.stroke}
          title="Their Servers"
          subtitle="OpenAI, Google, etc."
          titleColor={RED.textDark}
          subColor={RED.textLight}
          opacity={serverBoxOpacity}
        />

        <AnimatedArrow
          x1={130}
          y1={115}
          x2={160}
          y2={115}
          color={RED.arrow}
          progress={arrowRightProgress}
          markerId="arrowRed"
        />

        <Box
          x={160}
          y={90}
          w={110}
          h={50}
          fill={RED.fill}
          stroke={RED.stroke}
          title="Third Parties"
          subtitle="Training, ads, leaks"
          titleColor={RED.textDark}
          subColor={RED.textLight}
          opacity={thirdPartyOpacity}
        />

        <BulletPoint
          y={155}
          text="Data stored on remote servers"
          bgColor={RED.bulletBg}
          textColor={RED.textDark}
          icon="!"
          style={bullet1Style}
        />
        <BulletPoint
          y={175}
          text="May be used to train their AI"
          bgColor={RED.bulletBg}
          textColor={RED.textDark}
          icon="!"
          style={bullet2Style}
        />
        <BulletPoint
          y={195}
          text="You can't truly delete it"
          bgColor={RED.bulletBg}
          textColor={RED.textDark}
          icon="!"
          style={bullet3Style}
        />
      </svg>
    </div>
  )
}

/* ─── Phase 2: ChefFlow + Remy (Green) ────────────────────────── */

function GreenSide() {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()

  // Phase visibility - fade in when red fades out
  const phaseOpacity = interpolate(frame, [PHASE_2_START, PHASE_2_START + 15], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  })

  // Element timings (staggered)
  const boundaryOpacity = useFadeIn(PHASE_2_START + 10)
  const dataBoxOpacity = useFadeIn(PHASE_2_START + 30)
  const arrowProgress = useGrow(PHASE_2_START + 45)
  const remyBoxOpacity = useFadeIn(PHASE_2_START + 55)
  const lockOpacity = useFadeIn(PHASE_2_START + 75)
  const bullet1Style = useSlideUp(PHASE_2_START + 95)
  const bullet2Style = useSlideUp(PHASE_2_START + 107)
  const bullet3Style = useSlideUp(PHASE_2_START + 119)

  if (frame < PHASE_2_START) return null

  return (
    <div style={{ opacity: phaseOpacity }}>
      {/* Panel header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          marginBottom: 16,
          opacity: useFadeIn(PHASE_2_START + 5),
        }}
      >
        <div
          style={{
            width: 32,
            height: 32,
            borderRadius: '50%',
            backgroundColor: '#d1fae5',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 14,
          }}
        >
          🛡️
        </div>
        <div>
          <div
            style={{
              fontSize: 14,
              fontWeight: 600,
              color: GREEN.textDark,
              fontFamily: 'Inter, system-ui, sans-serif',
            }}
          >
            ChefFlow + Remy
          </div>
          <div
            style={{
              fontSize: 11,
              color: GREEN.textMid,
              fontFamily: 'Inter, system-ui, sans-serif',
            }}
          >
            Your data never leaves ChefFlow
          </div>
        </div>
      </div>

      {/* SVG diagram */}
      <svg viewBox="0 0 280 220" style={{ width: '100%' }}>
        <defs>
          <marker id="arrowGreen" markerWidth={8} markerHeight={6} refX={8} refY={3} orient="auto">
            <path d="M0,0 L8,3 L0,6 Z" fill={GREEN.arrow} />
          </marker>
          <marker id="arrowGreenR" markerWidth={8} markerHeight={6} refX={0} refY={3} orient="auto">
            <path d="M8,0 L0,3 L8,6 Z" fill={GREEN.arrow} />
          </marker>
        </defs>

        {/* Boundary */}
        <rect
          x={10}
          y={10}
          width={260}
          height={130}
          rx={10}
          fill={GREEN.bg}
          stroke={GREEN.border}
          strokeWidth={2}
          strokeDasharray="6,3"
          opacity={boundaryOpacity}
        />
        <text
          x={140}
          y={30}
          textAnchor="middle"
          fill={GREEN.textDark}
          fontSize={11}
          fontWeight={600}
          fontFamily="Inter, system-ui, sans-serif"
          opacity={boundaryOpacity}
        >
          ChefFlow (everything stays here)
        </text>

        <Box
          x={25}
          y={42}
          w={105}
          h={40}
          fill={GREEN.fill}
          stroke={GREEN.stroke}
          title="Your Data"
          subtitle="Clients, menus, finances"
          titleColor={GREEN.textDark}
          subColor={GREEN.textMid}
          opacity={dataBoxOpacity}
        />

        {/* Bidirectional arrow */}
        <AnimatedArrow
          x1={130}
          y1={62}
          x2={150}
          y2={62}
          color={GREEN.arrow}
          progress={arrowProgress}
          markerId="arrowGreen"
        />
        {arrowProgress > 0.5 && (
          <line
            x1={150}
            y1={62}
            x2={interpolate(arrowProgress, [0.5, 1], [150, 130])}
            y2={62}
            stroke={GREEN.arrow}
            strokeWidth={2}
            markerEnd={arrowProgress > 0.9 ? 'url(#arrowGreenR)' : undefined}
          />
        )}

        <Box
          x={150}
          y={42}
          w={105}
          h={40}
          fill={GREEN.fill}
          stroke={GREEN.stroke}
          title="Remy (Private AI)"
          subtitle="ChefFlow's own servers"
          titleColor={GREEN.textDark}
          subColor={GREEN.textMid}
          opacity={remyBoxOpacity}
        />

        {/* Lock badge */}
        <g opacity={lockOpacity}>
          <rect
            x={100}
            y={92}
            width={80}
            height={35}
            rx={6}
            fill={GREEN.lockBg}
            stroke={GREEN.stroke}
            strokeWidth={1}
          />
          <text
            x={140}
            y={108}
            textAnchor="middle"
            fill={GREEN.textDark}
            fontSize={9}
            fontWeight={700}
            fontFamily="Inter, system-ui, sans-serif"
          >
            No Third-Party
          </text>
          <text
            x={140}
            y={120}
            textAnchor="middle"
            fill={GREEN.textMid}
            fontSize={8}
            fontFamily="Inter, system-ui, sans-serif"
          >
            AI Services Used
          </text>
        </g>

        <BulletPoint
          y={155}
          text="AI runs on ChefFlow's own servers"
          bgColor={GREEN.bulletBg}
          textColor={GREEN.textDark}
          icon="✓"
          style={bullet1Style}
        />
        <BulletPoint
          y={175}
          text="Zero data sent to any company"
          bgColor={GREEN.bulletBg}
          textColor={GREEN.textDark}
          icon="✓"
          style={bullet2Style}
        />
        <BulletPoint
          y={195}
          text="Delete anytime - it's truly gone"
          bgColor={GREEN.bulletBg}
          textColor={GREEN.textDark}
          icon="✓"
          style={bullet3Style}
        />
      </svg>
    </div>
  )
}

/* ─── Main Composition ────────────────────────────────────────── */

export function DataFlowComposition() {
  const frame = useCurrentFrame()
  const titleOpacity = useFadeIn(0)

  return (
    <AbsoluteFill
      style={{
        backgroundColor: 'white',
        padding: 24,
        fontFamily: 'Inter, system-ui, sans-serif',
      }}
    >
      <SectionTitle
        text="Where Does Your Data Go?"
        sub="See exactly how ChefFlow handles your data compared to other AI services."
        opacity={titleOpacity}
      />

      <div style={{ position: 'relative', flex: 1 }}>
        <div
          style={{
            position: 'absolute',
            inset: 0,
            borderRadius: 12,
            border: `2px solid ${frame < PHASE_2_START ? RED.panelBorder : GREEN.panelBorder}`,
            backgroundColor: frame < PHASE_2_START ? RED.panelBg : GREEN.panelBg,
            padding: 20,
            transition: 'background-color 0.5s, border-color 0.5s',
          }}
        >
          <RedSide />
          <div style={{ position: 'absolute', inset: 0, padding: 20 }}>
            <GreenSide />
          </div>
        </div>
      </div>
    </AbsoluteFill>
  )
}
