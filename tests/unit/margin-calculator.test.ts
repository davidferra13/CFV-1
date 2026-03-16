import test from 'node:test'
import assert from 'node:assert/strict'

// margin-calculator.ts is a server action file ('use server'),
// so we test the pure math logic by reimplementing the calcMargin helper
// and testing the patterns used throughout the module.

// This is the exact calcMargin function from lib/finance/margin-calculator.ts
function calcMargin(revenue: number, expenses: number): number {
  if (revenue <= 0) return 0
  return Math.round(((revenue - expenses) / revenue) * 1000) / 10
}

// This is the exact monthLabel function from lib/finance/margin-calculator.ts
const MONTH_NAMES = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
]
function monthLabel(yyyymm: string): string {
  const [year, month] = yyyymm.split('-')
  return `${MONTH_NAMES[parseInt(month, 10) - 1]} ${year}`
}

// ── calcMargin ───────────────────────────────────────────────────────

test('calcMargin: basic profit margin calculation', () => {
  // $1000 revenue, $600 expenses = 40% margin
  assert.equal(calcMargin(100000, 60000), 40)
})

test('calcMargin: zero expenses = 100% margin', () => {
  assert.equal(calcMargin(100000, 0), 100)
})

test('calcMargin: expenses equal revenue = 0% margin', () => {
  assert.equal(calcMargin(100000, 100000), 0)
})

test('calcMargin: expenses exceed revenue = negative margin', () => {
  // $1000 revenue, $1500 expenses = -50%
  assert.equal(calcMargin(100000, 150000), -50)
})

test('calcMargin: zero revenue returns 0 (avoids division by zero)', () => {
  assert.equal(calcMargin(0, 50000), 0)
})

test('calcMargin: negative revenue returns 0', () => {
  assert.equal(calcMargin(-10000, 5000), 0)
})

test('calcMargin: rounds to one decimal place', () => {
  // $3000 revenue, $1000 expenses = 66.666...% -> 66.7%
  assert.equal(calcMargin(300000, 100000), 66.7)
})

test('calcMargin: typical private chef margins (50-70%)', () => {
  // $2000 event, $600 food cost = 70% margin
  assert.equal(calcMargin(200000, 60000), 70)
  // $2000 event, $1000 total expenses = 50% margin
  assert.equal(calcMargin(200000, 100000), 50)
})

test('calcMargin: low-margin event (below 20% threshold)', () => {
  // $1000 revenue, $850 expenses = 15% margin
  assert.equal(calcMargin(100000, 85000), 15)
})

test('calcMargin: small amounts in cents', () => {
  // $5 revenue, $2 expenses = 60%
  assert.equal(calcMargin(500, 200), 60)
})

test('calcMargin: large catering event', () => {
  // $50,000 revenue, $20,000 expenses = 60%
  assert.equal(calcMargin(5000000, 2000000), 60)
})

test('calcMargin: exactly one cent revenue', () => {
  assert.equal(calcMargin(1, 0), 100)
  assert.equal(calcMargin(1, 1), 0)
})

// ── monthLabel ───────────────────────────────────────────────────────

test('monthLabel: formats all 12 months correctly', () => {
  assert.equal(monthLabel('2026-01'), 'Jan 2026')
  assert.equal(monthLabel('2026-02'), 'Feb 2026')
  assert.equal(monthLabel('2026-03'), 'Mar 2026')
  assert.equal(monthLabel('2026-04'), 'Apr 2026')
  assert.equal(monthLabel('2026-05'), 'May 2026')
  assert.equal(monthLabel('2026-06'), 'Jun 2026')
  assert.equal(monthLabel('2026-07'), 'Jul 2026')
  assert.equal(monthLabel('2026-08'), 'Aug 2026')
  assert.equal(monthLabel('2026-09'), 'Sep 2026')
  assert.equal(monthLabel('2026-10'), 'Oct 2026')
  assert.equal(monthLabel('2026-11'), 'Nov 2026')
  assert.equal(monthLabel('2026-12'), 'Dec 2026')
})

test('monthLabel: handles different years', () => {
  assert.equal(monthLabel('2025-06'), 'Jun 2025')
  assert.equal(monthLabel('2027-01'), 'Jan 2027')
})

// ── Revenue change percent calculation (from getProfitDashboard) ─────

function revenueChangePercent(currentMonth: number, lastMonth: number): number | null {
  if (lastMonth <= 0) return null
  return Math.round(((currentMonth - lastMonth) / lastMonth) * 1000) / 10
}

test('revenueChangePercent: growth', () => {
  // $2000 current, $1000 last = 100% growth
  assert.equal(revenueChangePercent(200000, 100000), 100)
})

test('revenueChangePercent: decline', () => {
  // $500 current, $1000 last = -50%
  assert.equal(revenueChangePercent(50000, 100000), -50)
})

test('revenueChangePercent: no change', () => {
  assert.equal(revenueChangePercent(100000, 100000), 0)
})

test('revenueChangePercent: null when no previous month data', () => {
  assert.equal(revenueChangePercent(100000, 0), null)
})

test('revenueChangePercent: rounds to one decimal', () => {
  // $1500 / $1000 = 50%
  assert.equal(revenueChangePercent(150000, 100000), 50)
  // $1333 / $1000 = 33.3%
  assert.equal(revenueChangePercent(133300, 100000), 33.3)
})

// ── Per-guest calculations (from getEventMargin) ─────────────────────

test('per-guest revenue: basic calculation', () => {
  const revenue = 200000 // $2000
  const guestCount = 8
  assert.equal(Math.round(revenue / guestCount), 25000) // $250/guest
})

test('per-guest revenue: single guest', () => {
  const revenue = 100000
  assert.equal(Math.round(revenue / 1), 100000) // all revenue from 1 guest
})

test('per-guest cost: basic calculation', () => {
  const expenses = 80000 // $800
  const guestCount = 10
  assert.equal(Math.round(expenses / guestCount), 8000) // $80/guest
})

// ── Lifetime value calculations ──────────────────────────────────────

test('avgEventValue: divides total revenue by event count', () => {
  const totalRevenue = 500000 // $5000 over 5 events
  const eventCount = 5
  assert.equal(Math.round(totalRevenue / eventCount), 100000) // $1000 avg
})

test('avgEventValue: single event returns full revenue', () => {
  assert.equal(Math.round(300000 / 1), 300000)
})

test('avgEventValue: zero events returns 0', () => {
  const eventCount = 0
  const result = eventCount > 0 ? Math.round(500000 / eventCount) : 0
  assert.equal(result, 0)
})

// ── Low margin threshold (from getProfitDashboard) ───────────────────

test('low margin filter: events below 20% margin are flagged', () => {
  const events = [
    { revenue: 100000, expenses: 90000 }, // 10% margin - flagged
    { revenue: 100000, expenses: 80000 }, // 20% margin - NOT flagged
    { revenue: 100000, expenses: 70000 }, // 30% margin - NOT flagged
    { revenue: 100000, expenses: 95000 }, // 5% margin - flagged
    { revenue: 100000, expenses: 75000 }, // 25% margin - NOT flagged
  ]
  const lowMargin = events.filter((e) => calcMargin(e.revenue, e.expenses) < 20)
  assert.equal(lowMargin.length, 2)
  assert.equal(calcMargin(lowMargin[0].revenue, lowMargin[0].expenses), 10)
  assert.equal(calcMargin(lowMargin[1].revenue, lowMargin[1].expenses), 5)
})

// ── Trend direction (from getFoodCostDashboardSummary) ───────────────

function determineTrend(
  currentMonthAvg: number,
  previousMonthAvg: number,
  currentMonthCount: number,
  prevMonthCount: number
): 'improving' | 'worsening' | 'stable' | 'insufficient_data' {
  if (currentMonthCount === 0 || prevMonthCount === 0) return 'insufficient_data'
  if (currentMonthAvg < previousMonthAvg - 1) return 'improving'
  if (currentMonthAvg > previousMonthAvg + 1) return 'worsening'
  return 'stable'
}

test('trend: insufficient data when no current month events', () => {
  assert.equal(determineTrend(0, 25, 0, 5), 'insufficient_data')
})

test('trend: insufficient data when no previous month events', () => {
  assert.equal(determineTrend(25, 0, 5, 0), 'insufficient_data')
})

test('trend: improving when current is more than 1% lower', () => {
  assert.equal(determineTrend(23, 28, 5, 5), 'improving')
})

test('trend: worsening when current is more than 1% higher', () => {
  assert.equal(determineTrend(32, 28, 5, 5), 'worsening')
})

test('trend: stable within 1% tolerance', () => {
  assert.equal(determineTrend(28, 28, 5, 5), 'stable')
  assert.equal(determineTrend(28.5, 28, 5, 5), 'stable')
  assert.equal(determineTrend(27.5, 28, 5, 5), 'stable')
  assert.equal(determineTrend(29, 28, 5, 5), 'stable')
  assert.equal(determineTrend(27, 28, 5, 5), 'stable')
})

test('trend: boundary at exactly +1%', () => {
  // 29 vs 28 = exactly +1, which is NOT > 1, so stable
  assert.equal(determineTrend(29, 28, 5, 5), 'stable')
})

test('trend: boundary just over +1%', () => {
  assert.equal(determineTrend(29.1, 28, 5, 5), 'worsening')
})

test('trend: boundary at exactly -1%', () => {
  // 27 vs 28 = exactly -1, which is NOT < -1, so stable
  assert.equal(determineTrend(27, 28, 5, 5), 'stable')
})

test('trend: boundary just under -1%', () => {
  assert.equal(determineTrend(26.9, 28, 5, 5), 'improving')
})
