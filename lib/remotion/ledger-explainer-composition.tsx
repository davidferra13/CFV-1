/**
 * LedgerExplainerComposition - Remotion animation explaining the ledger-first financial model.
 *
 * Shows:
 *  1. Entries appearing one by one in an append-only ledger
 *  2. Running balance computing in real time
 *  3. Revenue vs expenses vs profit breakdown
 *
 * Helps chefs understand why balances are derived, not stored.
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

/* ─── Ledger entries ──────────────────────────────────────────── */

const ENTRIES = [
  { type: 'Deposit', amount: 1500, sign: '+', color: GREEN },
  { type: 'Add-on', amount: 300, sign: '+', color: GREEN },
  { type: 'Food Cost', amount: -650, sign: '−', color: RED },
  { type: 'Final Payment', amount: 3200, sign: '+', color: GREEN },
  { type: 'Staff Pay', amount: -400, sign: '−', color: RED },
  { type: 'Tip', amount: 250, sign: '+', color: GREEN },
]

const RUNNING_TOTALS = ENTRIES.reduce<number[]>((acc, entry) => {
  const prev = acc.length > 0 ? acc[acc.length - 1] : 0
  acc.push(prev + entry.amount)
  return acc
}, [])

/* ─── Timing ──────────────────────────────────────────────────── */

const INTRO = 25
const ENTRY_GAP = 40
const BREAKDOWN_START = INTRO + ENTRIES.length * ENTRY_GAP + 20
const getEntryStart = (i: number) => INTRO + i * ENTRY_GAP

/* ─── Helpers ─────────────────────────────────────────────────── */

function useFadeIn(startFrame: number, dur = 12) {
  const frame = useCurrentFrame()
  return interpolate(frame, [startFrame, startFrame + dur], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  })
}

function useSlideIn(startFrame: number) {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  const progress = spring({
    frame: Math.max(0, frame - startFrame),
    fps,
    config: { damping: 16, stiffness: 120 },
  })
  const translateX = interpolate(progress, [0, 1], [-20, 0])
  const opacity = interpolate(frame, [startFrame, startFrame + 10], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  })
  return { opacity, transform: `translateX(${translateX}px)` }
}

function formatDollars(cents: number) {
  const abs = Math.abs(cents)
  return `$${(abs / 100).toLocaleString('en-US', { minimumFractionDigits: 0 })}`
}

/* ─── Ledger Row ──────────────────────────────────────────────── */

function LedgerRow({
  entry,
  runningTotal,
  style,
}: {
  entry: (typeof ENTRIES)[number]
  runningTotal: number
  style: React.CSSProperties
}) {
  const isPositive = entry.amount > 0
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '5px 12px',
        borderRadius: 6,
        backgroundColor: isPositive ? GREEN.bg : RED.bg,
        border: `1px solid ${isPositive ? GREEN.border : RED.border}`,
        ...style,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span
          style={{
            fontSize: 10,
            fontWeight: 700,
            color: isPositive ? GREEN.text : RED.text,
            fontFamily: 'Inter, system-ui, sans-serif',
            width: 16,
            textAlign: 'center' as const,
          }}
        >
          {entry.sign}
        </span>
        <span
          style={{
            fontSize: 11,
            fontWeight: 600,
            color: STONE[700],
            fontFamily: 'Inter, system-ui, sans-serif',
          }}
        >
          {entry.type}
        </span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <span
          style={{
            fontSize: 11,
            fontWeight: 600,
            color: isPositive ? GREEN.text : RED.text,
            fontFamily: 'Inter, system-ui, sans-serif',
          }}
        >
          {entry.sign}
          {formatDollars(Math.abs(entry.amount) * 100)}
        </span>
        <span
          style={{
            fontSize: 10,
            color: STONE[500],
            fontFamily: 'Inter, system-ui, sans-serif',
            width: 50,
            textAlign: 'right' as const,
          }}
        >
          = {formatDollars(runningTotal * 100)}
        </span>
      </div>
    </div>
  )
}

/* ─── Main Composition ────────────────────────────────────────── */

export function LedgerExplainerComposition() {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()

  const titleOpacity = useFadeIn(0)
  const titleY = interpolate(
    spring({ frame, fps, config: { damping: 18, stiffness: 100 } }),
    [0, 1],
    [10, 0]
  )

  const visibleEntries = ENTRIES.reduce(
    (count, _, i) => (frame >= getEntryStart(i) ? i + 1 : count),
    0
  )

  const breakdownOpacity = useFadeIn(BREAKDOWN_START)

  // Final breakdown numbers
  const totalRevenue = ENTRIES.filter((e) => e.amount > 0).reduce((s, e) => s + e.amount, 0)
  const totalExpenses = Math.abs(
    ENTRIES.filter((e) => e.amount < 0).reduce((s, e) => s + e.amount, 0)
  )
  const netProfit = totalRevenue - totalExpenses

  return (
    <AbsoluteFill style={{ backgroundColor: 'white', fontFamily: 'Inter, system-ui, sans-serif' }}>
      {/* Brand gradient bar */}
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
        {/* Title */}
        <div
          style={{
            textAlign: 'center' as const,
            marginBottom: 12,
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
            How Your Money Works
          </div>
          <div style={{ fontSize: 18, fontWeight: 700, color: STONE[900] }}>
            Every dollar is tracked in an append-only ledger
          </div>
        </div>

        {/* Ledger entries */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 12 }}>
          {ENTRIES.slice(0, visibleEntries).map((entry, i) => (
            <LedgerRow
              key={entry.type}
              entry={entry}
              runningTotal={RUNNING_TOTALS[i]}
              style={useSlideIn(getEntryStart(i))}
            />
          ))}
        </div>

        {/* Breakdown */}
        <div
          style={{
            opacity: breakdownOpacity,
            borderTop: `1px solid ${STONE[200]}`,
            paddingTop: 10,
            display: 'flex',
            justifyContent: 'center',
            gap: 24,
          }}
        >
          <div style={{ textAlign: 'center' as const }}>
            <div style={{ fontSize: 10, color: STONE[500], marginBottom: 2 }}>Revenue</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: GREEN.text }}>
              {formatDollars(totalRevenue * 100)}
            </div>
          </div>
          <div style={{ textAlign: 'center' as const }}>
            <div style={{ fontSize: 10, color: STONE[500], marginBottom: 2 }}>Expenses</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: RED.text }}>
              {formatDollars(totalExpenses * 100)}
            </div>
          </div>
          <div style={{ textAlign: 'center' as const }}>
            <div style={{ fontSize: 10, color: STONE[500], marginBottom: 2 }}>Net Profit</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: BRAND[600] }}>
              {formatDollars(netProfit * 100)}
            </div>
          </div>
        </div>

        {/* Explainer note */}
        <div
          style={{
            textAlign: 'center' as const,
            marginTop: 8,
            opacity: breakdownOpacity,
          }}
        >
          <span style={{ fontSize: 9, color: STONE[400] }}>
            Balances are always computed from the ledger - never stored directly
          </span>
        </div>
      </div>
    </AbsoluteFill>
  )
}
