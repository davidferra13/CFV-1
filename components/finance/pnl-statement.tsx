'use client'

import { useState, useTransition } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { formatCurrency } from '@/lib/utils/currency'
import {
  generatePnL,
  getPnLComparison,
  getPnLTrend,
  getCategoryDetails,
  exportPnLCSV,
  type PnLStatement as PnLStatementType,
  type PnLPeriod,
  type PnLComparison as PnLComparisonType,
  type PnLTrendPoint,
  type CategoryTransaction,
  type PnLLineItem,
} from '@/lib/finance/pnl-actions'

type Props = {
  initialStatement: PnLStatementType
  initialTrend: PnLTrendPoint[]
}

export function PnLStatement({ initialStatement, initialTrend }: Props) {
  const [statement, setStatement] = useState(initialStatement)
  const [trend, setTrend] = useState(initialTrend)
  const [comparison, setComparison] = useState<PnLComparisonType | null>(null)
  const [drillDown, setDrillDown] = useState<{
    label: string
    transactions: CategoryTransaction[]
  } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  // Period controls
  const [period, setPeriod] = useState<PnLPeriod>(initialStatement.period)
  const [year, setYear] = useState(initialStatement.year)
  const [month, setMonth] = useState(initialStatement.month ?? new Date().getMonth() + 1)
  const [quarter, setQuarter] = useState(initialStatement.quarter ?? 1)
  const [showCompare, setShowCompare] = useState(false)

  const currentYear = new Date().getFullYear()
  const yearOptions = Array.from({ length: 5 }, (_, i) => currentYear - i)

  function loadReport() {
    setError(null)
    setComparison(null)
    setDrillDown(null)
    startTransition(async () => {
      try {
        const pnl = await generatePnL(
          period,
          year,
          period === 'monthly' ? month : undefined,
          period === 'quarterly' ? quarter : undefined
        )
        setStatement(pnl)
        const t = await getPnLTrend(12)
        setTrend(t)
      } catch (err: any) {
        setError(err?.message || 'Failed to load P&L statement')
      }
    })
  }

  function handleCompare() {
    setError(null)
    setDrillDown(null)
    startTransition(async () => {
      try {
        const comp = await getPnLComparison(
          period,
          year,
          year - 1,
          period === 'monthly' ? month : undefined,
          period === 'quarterly' ? quarter : undefined
        )
        setComparison(comp)
        setShowCompare(true)
      } catch (err: any) {
        setError(err?.message || 'Failed to load comparison')
      }
    })
  }

  function handleDrillDown(label: string) {
    setError(null)
    startTransition(async () => {
      try {
        const transactions = await getCategoryDetails(
          label,
          period,
          year,
          period === 'monthly' ? month : undefined,
          period === 'quarterly' ? quarter : undefined
        )
        setDrillDown({ label, transactions })
      } catch (err: any) {
        setError(err?.message || 'Failed to load details')
      }
    })
  }

  function handleExportCSV() {
    startTransition(async () => {
      try {
        const csv = await exportPnLCSV(
          period,
          year,
          period === 'monthly' ? month : undefined,
          period === 'quarterly' ? quarter : undefined
        )
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
        const url = URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        link.download = `chefflow-pnl-${year}${period === 'monthly' ? `-${String(month).padStart(2, '0')}` : ''}${period === 'quarterly' ? `-Q${quarter}` : ''}.csv`
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        URL.revokeObjectURL(url)
      } catch (err: any) {
        setError(err?.message || 'Failed to export CSV')
      }
    })
  }

  function handlePrint() {
    window.print()
  }

  return (
    <div className="space-y-6">
      {/* Period Selector */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap items-end gap-3">
            <div>
              <label className="block text-xs text-stone-500 mb-1">Period</label>
              <select
                value={period}
                onChange={(e) => setPeriod(e.target.value as PnLPeriod)}
                className="rounded-md border border-stone-600 bg-stone-900 px-3 py-2 text-sm text-stone-300"
              >
                <option value="monthly">Monthly</option>
                <option value="quarterly">Quarterly</option>
                <option value="annual">Annual</option>
              </select>
            </div>

            <div>
              <label className="block text-xs text-stone-500 mb-1">Year</label>
              <select
                value={year}
                onChange={(e) => setYear(Number(e.target.value))}
                className="rounded-md border border-stone-600 bg-stone-900 px-3 py-2 text-sm text-stone-300"
              >
                {yearOptions.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>

            {period === 'monthly' && (
              <div>
                <label className="block text-xs text-stone-500 mb-1">Month</label>
                <select
                  value={month}
                  onChange={(e) => setMonth(Number(e.target.value))}
                  className="rounded-md border border-stone-600 bg-stone-900 px-3 py-2 text-sm text-stone-300"
                >
                  {Array.from({ length: 12 }, (_, i) => {
                    const d = new Date(year, i, 1)
                    return (
                      <option key={i + 1} value={i + 1}>
                        {d.toLocaleDateString('en-US', { month: 'long' })}
                      </option>
                    )
                  })}
                </select>
              </div>
            )}

            {period === 'quarterly' && (
              <div>
                <label className="block text-xs text-stone-500 mb-1">Quarter</label>
                <select
                  value={quarter}
                  onChange={(e) => setQuarter(Number(e.target.value))}
                  className="rounded-md border border-stone-600 bg-stone-900 px-3 py-2 text-sm text-stone-300"
                >
                  <option value={1}>Q1 (Jan - Mar)</option>
                  <option value={2}>Q2 (Apr - Jun)</option>
                  <option value={3}>Q3 (Jul - Sep)</option>
                  <option value={4}>Q4 (Oct - Dec)</option>
                </select>
              </div>
            )}

            <Button onClick={loadReport} disabled={isPending}>
              {isPending ? 'Loading...' : 'Run Report'}
            </Button>
            <Button variant="secondary" onClick={handleCompare} disabled={isPending}>
              Compare YoY
            </Button>
            <Button variant="ghost" onClick={handleExportCSV} disabled={isPending}>
              Export CSV
            </Button>
            <Button variant="ghost" onClick={handlePrint} disabled={isPending}>
              Print
            </Button>
          </div>
        </CardContent>
      </Card>

      {error && (
        <div className="rounded-lg border border-red-800 bg-red-900/20 p-4 text-sm text-red-400">
          {error}
        </div>
      )}

      {/* P&L Statement */}
      <Card className="print:shadow-none print:border-none">
        <CardHeader>
          <CardTitle className="text-xl">Profit &amp; Loss Statement</CardTitle>
          <p className="text-sm text-stone-500">
            {statement.startDate} to {statement.endDate}
          </p>
        </CardHeader>
        <CardContent>
          {showCompare && comparison ? (
            <ComparisonTable comparison={comparison} onDrillDown={handleDrillDown} />
          ) : (
            <StatementTable statement={statement} onDrillDown={handleDrillDown} />
          )}
        </CardContent>
      </Card>

      {/* Drill-Down Panel */}
      {drillDown && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">{drillDown.label} - Transactions</CardTitle>
              <Button variant="ghost" onClick={() => setDrillDown(null)}>
                Close
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {drillDown.transactions.length === 0 ? (
              <p className="text-sm text-stone-500">No transactions found for this category.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-stone-700 text-left text-stone-500">
                      <th className="py-2 pr-4">Date</th>
                      <th className="py-2 pr-4">Description</th>
                      <th className="py-2 pr-4">Vendor</th>
                      <th className="py-2 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {drillDown.transactions.map((tx) => (
                      <tr key={tx.id} className="border-b border-stone-800">
                        <td className="py-2 pr-4 text-stone-400">{tx.date}</td>
                        <td className="py-2 pr-4 text-stone-300">{tx.description}</td>
                        <td className="py-2 pr-4 text-stone-400">{tx.vendor || '-'}</td>
                        <td className="py-2 text-right text-stone-200">
                          {formatCurrency(tx.amountCents)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Monthly Trend Chart */}
      {trend.length > 0 && (
        <Card className="print:break-before-page">
          <CardHeader>
            <CardTitle className="text-lg">Monthly Net Income Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <TrendChart points={trend} />
          </CardContent>
        </Card>
      )}
    </div>
  )
}

// ─── Statement Table ────────────────────────────────────────────────────────

function StatementTable({
  statement,
  onDrillDown,
}: {
  statement: PnLStatementType
  onDrillDown: (label: string) => void
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-stone-700 text-left text-stone-500">
            <th className="py-2">Account</th>
            <th className="py-2 text-right">Amount</th>
            <th className="py-2 text-right">% of Revenue</th>
          </tr>
        </thead>
        <tbody>
          {/* Revenue */}
          <SectionHeader label="REVENUE" />
          {statement.revenue.items.map((item) => (
            <LineItemRow key={item.label} item={item} />
          ))}
          <TotalRow
            label="Total Revenue"
            amountCents={statement.revenue.totalCents}
            percent={100}
            tone="text-emerald-500"
          />

          <SpacerRow />

          {/* COGS */}
          <SectionHeader label="COST OF GOODS SOLD" />
          {statement.cogs.items.map((item) => (
            <LineItemRow
              key={item.label}
              item={item}
              clickable
              onClick={() => onDrillDown(item.label)}
            />
          ))}
          <TotalRow
            label="Total COGS"
            amountCents={statement.cogs.totalCents}
            percent={statement.cogs.totalPercentOfRevenue}
            tone="text-red-500"
          />

          <SpacerRow />

          {/* Gross Profit */}
          <TotalRow
            label="GROSS PROFIT"
            amountCents={statement.grossProfitCents}
            percent={statement.grossMarginPercent}
            tone={statement.grossProfitCents >= 0 ? 'text-emerald-500' : 'text-red-500'}
            bold
          />

          <SpacerRow />

          {/* Operating Expenses */}
          <SectionHeader label="OPERATING EXPENSES" />
          {statement.operatingExpenses.items.map((item) => (
            <LineItemRow
              key={item.label}
              item={item}
              clickable
              onClick={() => onDrillDown(item.label)}
            />
          ))}
          <TotalRow
            label="Total Operating Expenses"
            amountCents={statement.operatingExpenses.totalCents}
            percent={statement.operatingExpenses.totalPercentOfRevenue}
            tone="text-red-500"
          />

          <SpacerRow />

          {/* Net Income */}
          <tr className="border-t-2 border-stone-600">
            <td className="py-3 font-bold text-stone-100 text-base">NET INCOME</td>
            <td
              className={`py-3 text-right font-bold text-base ${
                statement.netIncomeCents >= 0 ? 'text-emerald-400' : 'text-red-400'
              }`}
            >
              {formatCurrency(statement.netIncomeCents)}
            </td>
            <td
              className={`py-3 text-right font-bold ${
                statement.netIncomeCents >= 0 ? 'text-emerald-400' : 'text-red-400'
              }`}
            >
              {statement.netMarginPercent}%
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  )
}

// ─── Comparison Table ───────────────────────────────────────────────────────

function ComparisonTable({
  comparison,
  onDrillDown,
}: {
  comparison: PnLComparisonType
  onDrillDown: (label: string) => void
}) {
  const { current, previous, changes } = comparison

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-stone-700 text-left text-stone-500">
            <th className="py-2">Account</th>
            <th className="py-2 text-right">{current.year}</th>
            <th className="py-2 text-right">{previous.year}</th>
            <th className="py-2 text-right">Change</th>
          </tr>
        </thead>
        <tbody>
          <ComparisonRow
            label="Total Revenue"
            currentCents={current.revenue.totalCents}
            previousCents={previous.revenue.totalCents}
            deltaCents={changes.revenueDeltaCents}
            deltaPercent={changes.revenueDeltaPercent}
          />
          <ComparisonRow
            label="Total COGS"
            currentCents={current.cogs.totalCents}
            previousCents={previous.cogs.totalCents}
            deltaCents={changes.cogsDeltaCents}
            deltaPercent={changes.cogsDeltaPercent}
            invertColor
          />
          <ComparisonRow
            label="Gross Profit"
            currentCents={current.grossProfitCents}
            previousCents={previous.grossProfitCents}
            deltaCents={changes.grossProfitDeltaCents}
            deltaPercent={changes.grossProfitDeltaPercent}
            bold
          />
          <ComparisonRow
            label="Operating Expenses"
            currentCents={current.operatingExpenses.totalCents}
            previousCents={previous.operatingExpenses.totalCents}
            deltaCents={changes.opexDeltaCents}
            deltaPercent={changes.opexDeltaPercent}
            invertColor
          />
          <tr className="border-t-2 border-stone-600">
            <td className="py-3 font-bold text-stone-100">Net Income</td>
            <td
              className={`py-3 text-right font-bold ${
                current.netIncomeCents >= 0 ? 'text-emerald-400' : 'text-red-400'
              }`}
            >
              {formatCurrency(current.netIncomeCents)}
            </td>
            <td
              className={`py-3 text-right font-bold ${
                previous.netIncomeCents >= 0 ? 'text-emerald-400' : 'text-red-400'
              }`}
            >
              {formatCurrency(previous.netIncomeCents)}
            </td>
            <td className="py-3 text-right">
              <DeltaBadge
                cents={changes.netIncomeDeltaCents}
                percent={changes.netIncomeDeltaPercent}
              />
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  )
}

// ─── Trend Chart (CSS bars) ─────────────────────────────────────────────────

function TrendChart({ points }: { points: PnLTrendPoint[] }) {
  const maxAbs = Math.max(
    ...points.map((p) => Math.abs(p.netIncomeCents)),
    1 // avoid div by zero
  )

  return (
    <div className="flex items-end gap-1.5" style={{ height: '160px' }}>
      {points.map((p) => {
        const isPositive = p.netIncomeCents >= 0
        const heightPct = Math.max((Math.abs(p.netIncomeCents) / maxAbs) * 100, 2)

        return (
          <div key={p.label} className="flex-1 flex flex-col items-center justify-end h-full">
            <div className="relative flex flex-col items-center justify-end flex-1 w-full">
              <div
                className={`w-full rounded-t-sm ${isPositive ? 'bg-emerald-600' : 'bg-red-600'}`}
                style={{ height: `${heightPct}%`, minHeight: '2px' }}
                title={`${p.label}: ${formatCurrency(p.netIncomeCents)}`}
              />
            </div>
            <span className="text-[10px] text-stone-500 mt-1 rotate-[-45deg] origin-top-left whitespace-nowrap">
              {p.label}
            </span>
          </div>
        )
      })}
    </div>
  )
}

// ─── Shared Sub-Components ──────────────────────────────────────────────────

function SectionHeader({ label }: { label: string }) {
  return (
    <tr>
      <td
        colSpan={3}
        className="pt-4 pb-1 text-xs font-semibold uppercase tracking-wider text-stone-500"
      >
        {label}
      </td>
    </tr>
  )
}

function LineItemRow({
  item,
  clickable,
  onClick,
}: {
  item: PnLLineItem
  clickable?: boolean
  onClick?: () => void
}) {
  return (
    <tr className="border-b border-stone-800/50">
      <td className="py-1.5 pl-4 text-stone-400">
        {clickable ? (
          <button
            onClick={onClick}
            className="text-left hover:text-stone-200 hover:underline transition-colors"
          >
            {item.label}
          </button>
        ) : (
          item.label
        )}
      </td>
      <td className="py-1.5 text-right text-stone-300">{formatCurrency(item.amountCents)}</td>
      <td className="py-1.5 text-right text-stone-500">{item.percentOfRevenue}%</td>
    </tr>
  )
}

function TotalRow({
  label,
  amountCents,
  percent,
  tone,
  bold,
}: {
  label: string
  amountCents: number
  percent: number
  tone?: string
  bold?: boolean
}) {
  return (
    <tr className="border-b border-stone-700">
      <td className={`py-2 ${bold ? 'font-bold text-stone-100' : 'font-semibold text-stone-300'}`}>
        {label}
      </td>
      <td
        className={`py-2 text-right ${bold ? 'font-bold' : 'font-semibold'} ${tone || 'text-stone-200'}`}
      >
        {formatCurrency(amountCents)}
      </td>
      <td className={`py-2 text-right ${tone || 'text-stone-400'}`}>{percent}%</td>
    </tr>
  )
}

function SpacerRow() {
  return (
    <tr>
      <td colSpan={3} className="py-1" />
    </tr>
  )
}

function ComparisonRow({
  label,
  currentCents,
  previousCents,
  deltaCents,
  deltaPercent,
  bold,
  invertColor,
}: {
  label: string
  currentCents: number
  previousCents: number
  deltaCents: number
  deltaPercent: number
  bold?: boolean
  invertColor?: boolean
}) {
  return (
    <tr className="border-b border-stone-800">
      <td className={`py-2 ${bold ? 'font-semibold text-stone-200' : 'text-stone-400'}`}>
        {label}
      </td>
      <td className="py-2 text-right text-stone-300">{formatCurrency(currentCents)}</td>
      <td className="py-2 text-right text-stone-400">{formatCurrency(previousCents)}</td>
      <td className="py-2 text-right">
        <DeltaBadge cents={deltaCents} percent={deltaPercent} invert={invertColor} />
      </td>
    </tr>
  )
}

function DeltaBadge({
  cents,
  percent,
  invert,
}: {
  cents: number
  percent: number
  invert?: boolean
}) {
  const isUp = cents > 0
  // For costs, going up is bad (red), going down is good (green)
  const isGood = invert ? !isUp : isUp

  if (cents === 0) {
    return <span className="text-stone-500 text-xs">--</span>
  }

  return (
    <span className={`text-xs ${isGood ? 'text-emerald-500' : 'text-red-500'}`}>
      {isUp ? '+' : ''}
      {formatCurrency(cents)} ({isUp ? '+' : ''}
      {percent}%)
    </span>
  )
}
