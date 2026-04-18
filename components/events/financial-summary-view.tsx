'use client'

// Event Financial Summary View Component
// Displays the complete financial picture for a single dinner.
// 7 sections per spec: Header, Revenue, Costs, Margins, Time, Mileage, Comparison.
// Not anxiety-inducing - neutral data presentation, no red/green grading on margins.

import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import type { EventFinancialSummaryData } from '@/lib/events/financial-summary-actions'
import { markFinancialClosed, updateMileage } from '@/lib/events/financial-summary-actions'
import { format } from 'date-fns'
import { formatCurrency } from '@/lib/utils/currency'

function formatMinutes(minutes: number | null): string {
  if (!minutes || minutes === 0) return '-'
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  if (h === 0) return `${m}m`
  if (m === 0) return `${h}h`
  return `${h}h ${m}m`
}

function DataRow({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="flex justify-between items-baseline py-2 border-b border-stone-800 last:border-0">
      <span className="text-sm text-stone-400">{label}</span>
      <div className="text-right">
        <span className="text-sm font-medium text-stone-100">{value}</span>
        {sub && <p className="text-xs text-stone-400">{sub}</p>}
      </div>
    </div>
  )
}

function SectionCard({
  title,
  badge,
  children,
}: {
  title: string
  badge?: string
  children: React.ReactNode
}) {
  return (
    <Card className="p-5">
      <div className="flex justify-between items-center mb-3">
        <h2 className="font-semibold text-stone-100">{title}</h2>
        {badge && (
          <span className="text-xs font-medium text-stone-500 bg-stone-800 rounded-full px-2 py-0.5">
            {badge}
          </span>
        )}
      </div>
      {children}
    </Card>
  )
}

type Props = {
  data: EventFinancialSummaryData
}

export function FinancialSummaryView({ data }: Props) {
  const { event, client, revenue, costs, margins, time, mileage, comparison, pendingItems } = data

  const [mileageInput, setMileageInput] = useState(mileage.miles ? String(mileage.miles) : '')
  const [mileageSaved, setMileageSaved] = useState(false)
  const [closing, setClosing] = useState(false)
  const [closed, setClosed] = useState(event.financialClosed)
  const [, startTransition] = useTransition()

  const isDraft = pendingItems.length > 0
  const statusLabel = isDraft ? `DRAFT - ${pendingItems.join(', ')}` : 'FINAL'

  const handleSaveMileage = () => {
    const miles = parseFloat(mileageInput)
    if (isNaN(miles) || miles < 0) return
    startTransition(async () => {
      try {
        await updateMileage(event.id, miles)
        setMileageSaved(true)
        setTimeout(() => setMileageSaved(false), 2000)
      } catch (err) {
        console.error('[non-blocking] Mileage update failed', err)
        toast.error('Failed to save mileage')
      }
    })
  }

  const handleMarkClosed = async () => {
    setClosing(true)
    try {
      await markFinancialClosed(event.id)
      setClosed(true)
    } catch (err) {
      console.error(err)
    } finally {
      setClosing(false)
    }
  }

  return (
    <div className="space-y-4">
      {/* ── Section 1: Header ── */}
      <Card className="p-5">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-xl font-bold text-stone-100">Event Financial Summary</h1>
            <p className="text-stone-500 text-sm mt-1">
              {client.displayName} &middot; {format(new Date(event.eventDate), 'MMMM d, yyyy')}{' '}
              &middot; {event.guestCount} guests
            </p>
          </div>
          <span
            className={`text-xs font-semibold px-3 py-1 rounded-full ${
              isDraft
                ? 'bg-amber-900 text-amber-800'
                : closed
                  ? 'bg-green-900 text-green-800'
                  : 'bg-stone-800 text-stone-300'
            }`}
          >
            {closed ? 'CLOSED' : statusLabel}
          </span>
        </div>
        {isDraft && (
          <div className="mt-3 text-xs text-amber-700 bg-amber-950 rounded px-3 py-2">
            Pending: {pendingItems.join(' · ')}. Financial closure requires all payments received
            and receipts reviewed.
          </div>
        )}
      </Card>

      {/* ── Section 2: Revenue ── */}
      <SectionCard title="Revenue">
        <DataRow label="Quoted price" value={formatCurrency(revenue.quotedPriceCents)} />
        <DataRow
          label="Service payment received"
          value={formatCurrency(revenue.basePaymentReceivedCents)}
        />
        <DataRow
          label="Tip / gratuity"
          value={revenue.tipCents > 0 ? formatCurrency(revenue.tipCents) : '-'}
        />
        <DataRow label="Total received" value={formatCurrency(revenue.totalReceivedCents)} />
        {revenue.varianceCents !== 0 && (
          <DataRow
            label="Variance"
            value={`${revenue.varianceCents > 0 ? '+' : ''}${formatCurrency(revenue.varianceCents)}`}
            sub={revenue.varianceCents > 0 ? 'overpayment / gratuity' : 'underpaid'}
          />
        )}
      </SectionCard>

      {/* ── Section 3: Costs ── */}
      <SectionCard
        title="Costs"
        badge={
          costs.projectedFoodCostCents
            ? `Projected: ${formatCurrency(costs.projectedFoodCostCents)}`
            : undefined
        }
      >
        <DataRow
          label="Grocery & ingredient spend"
          value={
            costs.actualGrocerySpendCents > 0
              ? formatCurrency(costs.actualGrocerySpendCents)
              : 'Pending'
          }
        />
        {costs.leftoverCreditInCents && costs.leftoverCreditInCents > 0 && (
          <DataRow
            label="Leftover credit received (from prior event)"
            value={`−${formatCurrency(costs.leftoverCreditInCents)}`}
            sub="ingredients carried in"
          />
        )}
        {costs.leftoverCreditOutCents && costs.leftoverCreditOutCents > 0 && (
          <DataRow
            label="Leftover carried to next event"
            value={`−${formatCurrency(costs.leftoverCreditOutCents)}`}
            sub="surplus applied forward"
          />
        )}
        <DataRow label="Net food cost" value={formatCurrency(costs.netFoodCostCents)} />
        {costs.additionalExpensesCents > 0 && (
          <DataRow
            label="Additional expenses (gas, etc.)"
            value={formatCurrency(costs.additionalExpensesCents)}
          />
        )}
        <DataRow label="Total cost" value={formatCurrency(costs.totalCostCents)} />
      </SectionCard>

      {/* ── Section 4: Margins ── */}
      <SectionCard title="Margins">
        <DataRow
          label="Food cost %"
          value={`${margins.foodCostPercent}%`}
          sub="target: under 30%"
        />
        <DataRow label="Gross profit" value={formatCurrency(margins.grossProfitCents)} />
        <DataRow label="Gross margin %" value={`${margins.grossMarginPercent}%`} />
        <DataRow
          label="Net profit (with tip)"
          value={formatCurrency(margins.netProfitWithTipCents)}
        />
      </SectionCard>

      {/* ── Section 5: Time Investment ── */}
      <SectionCard
        title="Time Investment"
        badge={time.totalMinutes ? formatMinutes(time.totalMinutes) + ' total' : 'Not logged'}
      >
        {time.totalMinutes ? (
          <>
            <DataRow label="Shopping" value={formatMinutes(time.shoppingMinutes)} />
            <DataRow label="Prep" value={formatMinutes(time.prepMinutes)} />
            <DataRow label="Travel" value={formatMinutes(time.travelMinutes)} />
            <DataRow label="Service" value={formatMinutes(time.serviceMinutes)} />
            <DataRow label="Reset & cleanup" value={formatMinutes(time.resetMinutes)} />
            {time.effectiveHourlyRateCents && (
              <div className="pt-3 border-t border-stone-800 mt-1">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-semibold text-stone-200">
                    Effective hourly rate
                  </span>
                  <span className="text-lg font-bold text-stone-100">
                    {formatCurrency(time.effectiveHourlyRateCents)}/hr
                  </span>
                </div>
              </div>
            )}
          </>
        ) : (
          <p className="text-sm text-stone-400">Log time on the event page to see hourly rate.</p>
        )}
      </SectionCard>

      {/* ── Section 6: Mileage ── */}
      <SectionCard
        title="Mileage"
        badge={`${formatCurrency(mileage.irsMileageRateCentsPerMile)}/mi IRS rate`}
      >
        <div className="flex gap-2 mb-3">
          <input
            type="number"
            value={mileageInput}
            onChange={(e) => setMileageInput(e.target.value)}
            placeholder="Miles driven (round trip)"
            className="flex-1 px-3 py-2 text-sm border border-stone-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
            min="0"
            step="0.1"
          />
          <Button
            size="sm"
            onClick={handleSaveMileage}
            variant={mileageSaved ? 'ghost' : 'secondary'}
          >
            {mileageSaved ? 'Saved' : 'Save'}
          </Button>
        </div>
        {mileage.miles && (
          <>
            <DataRow label="Miles driven" value={`${mileage.miles} mi`} />
            <DataRow
              label="IRS deduction value"
              value={
                mileage.deductionValueCents ? formatCurrency(mileage.deductionValueCents) : '-'
              }
              sub={`${mileage.miles} mi × ${formatCurrency(mileage.irsMileageRateCentsPerMile)}`}
            />
          </>
        )}
        {!mileage.miles && (
          <p className="text-xs text-stone-400">
            Enter total miles driven (home → stores → client → home).
          </p>
        )}
      </SectionCard>

      {/* ── Section 7: Historical Comparison ── */}
      {comparison && (
        <SectionCard title="vs. Your Average">
          <DataRow
            label="Food cost vs. your average"
            value={`${comparison.vsAverageFoodCostPercent !== null && comparison.vsAverageFoodCostPercent > 0 ? '+' : ''}${comparison.vsAverageFoodCostPercent}%`}
            sub={
              comparison.vsAverageFoodCostPercent !== null &&
              comparison.vsAverageFoodCostPercent > 0
                ? 'higher than average'
                : 'lower than average'
            }
          />
          <DataRow
            label="Margin vs. your average"
            value={`${comparison.vsAverageMarginPercent !== null && comparison.vsAverageMarginPercent > 0 ? '+' : ''}${comparison.vsAverageMarginPercent}%`}
            sub={
              comparison.vsAverageMarginPercent !== null && comparison.vsAverageMarginPercent > 0
                ? 'above average'
                : 'below average'
            }
          />
        </SectionCard>
      )}

      {/* ── Mark Financial Closed ── */}
      {!closed && !isDraft && (
        <Card className="p-5 border-green-200 bg-green-950">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h2 className="font-semibold text-green-900">
                Ready to close this event financially?
              </h2>
              <p className="text-sm text-green-700 mt-1">
                All payments received and receipts reviewed. Mark as financially closed.
              </p>
            </div>
            <Button
              onClick={handleMarkClosed}
              loading={closing}
              disabled={closing}
              className="bg-green-700 hover:bg-green-800 text-white shrink-0"
            >
              Mark Financially Closed
            </Button>
          </div>
        </Card>
      )}

      {closed && event.financialClosedAt && (
        <p className="text-center text-xs text-stone-400">
          Financially closed {format(new Date(event.financialClosedAt), 'MMMM d, yyyy')}
        </p>
      )}
    </div>
  )
}
