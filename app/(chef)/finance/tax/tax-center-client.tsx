'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { logMileage, type MileageInput } from '@/lib/tax/actions'
import { format } from 'date-fns'

type MileageData = {
  logs: Array<{
    id: string
    log_date: string
    from_address: string
    to_address: string
    miles: string | number
    purpose: string
    deduction_cents: number | null
    notes: string | null
  }>
  totalMiles: number
  totalDeductionCents: number
}

type QuarterEstimate = {
  quarter: number
  year: number
  grossIncomeCents: number
  netProfitCents: number
  totalEstimatedCents: number
  seTaxCents: number
  incomeTaxCents: number
}

type Props = {
  year: number
  mileage: MileageData
  quarterlyEstimates: QuarterEstimate[]
  exportReady: boolean
}

function formatDollars(cents: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(cents / 100)
}

const PURPOSES = [
  { value: 'shopping', label: 'Ingredient Shopping' },
  { value: 'event', label: 'Event Travel' },
  { value: 'meeting', label: 'Client Meeting' },
  { value: 'equipment', label: 'Equipment Pickup' },
  { value: 'admin', label: 'Admin/Office' },
  { value: 'other', label: 'Other' },
]

export function TaxCenterClient({ year, mileage, quarterlyEstimates, exportReady }: Props) {
  const router = useRouter()
  const [showMileageForm, setShowMileageForm] = useState(false)
  const [mileageForm, setMileageForm] = useState({
    log_date: format(new Date(), 'yyyy-MM-dd'),
    from_address: '',
    to_address: '',
    miles: '',
    purpose: 'event',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleLogMileage(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      await logMileage({
        log_date: mileageForm.log_date,
        from_address: mileageForm.from_address,
        to_address: mileageForm.to_address,
        miles: parseFloat(mileageForm.miles),
        purpose: mileageForm.purpose as MileageInput['purpose'],
      })
      setShowMileageForm(false)
      setMileageForm({
        log_date: format(new Date(), 'yyyy-MM-dd'),
        from_address: '',
        to_address: '',
        miles: '',
        purpose: 'event',
      })
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-5">
      {/* Disclaimer */}
      <div className="rounded-lg border border-amber-200 bg-amber-950 px-4 py-3 text-xs text-amber-800">
        Estimates are for planning purposes only. Consult a CPA before filing.
      </div>

      {/* Quarterly estimates */}
      {quarterlyEstimates.every((q) => q.grossIncomeCents === 0) && mileage.totalMiles === 0 && (
        <div className="rounded-lg border border-stone-700 bg-stone-800/50 p-4 text-center">
          <p className="text-sm text-stone-400">
            No income or mileage recorded for {year}. Estimates below will update as you record
            payments and expenses.
          </p>
        </div>
      )}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {quarterlyEstimates.map((q) => (
          <Card key={q.quarter}>
            <CardHeader className="pb-1">
              <CardTitle className="text-xs text-stone-500">
                Q{q.quarter} {year}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-lg font-bold text-stone-100">
                {formatDollars(q.totalEstimatedCents)}
              </p>
              <p className="text-xs text-stone-400 mt-1">
                SE: {formatDollars(q.seTaxCents)} + Income: {formatDollars(q.incomeTaxCents)}
              </p>
              <p className="text-xs text-stone-400">Net: {formatDollars(q.netProfitCents)}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Mileage summary */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-base">Mileage Log - {year}</CardTitle>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="secondary"
              onClick={() => setShowMileageForm(!showMileageForm)}
            >
              + Log Miles
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-lg bg-stone-800 p-3">
              <p className="text-xs text-stone-500">Total miles</p>
              <p className="text-xl font-bold text-stone-100">{mileage.totalMiles.toFixed(1)}</p>
            </div>
            <div className="rounded-lg bg-stone-800 p-3">
              <p className="text-xs text-stone-500">Mileage deduction</p>
              <p className="text-xl font-bold text-stone-100">
                {formatDollars(mileage.totalDeductionCents)}
              </p>
            </div>
          </div>

          {showMileageForm && (
            <form onSubmit={handleLogMileage} className="space-y-3 border-t pt-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-stone-400 mb-1">Date</label>
                  <Input
                    type="date"
                    value={mileageForm.log_date}
                    onChange={(e) => setMileageForm((p) => ({ ...p, log_date: e.target.value }))}
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-stone-400 mb-1">Purpose</label>
                  <select
                    value={mileageForm.purpose}
                    onChange={(e) => setMileageForm((p) => ({ ...p, purpose: e.target.value }))}
                    className="w-full rounded-lg border border-stone-600 px-3 py-2 text-sm"
                  >
                    {PURPOSES.map((p) => (
                      <option key={p.value} value={p.value}>
                        {p.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-stone-400 mb-1">From</label>
                  <Input
                    value={mileageForm.from_address}
                    onChange={(e) =>
                      setMileageForm((p) => ({ ...p, from_address: e.target.value }))
                    }
                    placeholder="Home / store"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-stone-400 mb-1">To</label>
                  <Input
                    value={mileageForm.to_address}
                    onChange={(e) => setMileageForm((p) => ({ ...p, to_address: e.target.value }))}
                    placeholder="Client address"
                    required
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-stone-400 mb-1">Miles</label>
                <Input
                  type="number"
                  min="0.1"
                  step="0.1"
                  value={mileageForm.miles}
                  onChange={(e) => setMileageForm((p) => ({ ...p, miles: e.target.value }))}
                  placeholder="12.4"
                  required
                />
              </div>
              {error && <p className="text-xs text-red-600">{error}</p>}
              <div className="flex gap-2">
                <Button type="submit" size="sm" disabled={loading}>
                  {loading ? 'Saving…' : 'Save'}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => setShowMileageForm(false)}
                >
                  Cancel
                </Button>
              </div>
            </form>
          )}

          {mileage.logs.length > 0 && (
            <div className="space-y-1 max-h-64 overflow-y-auto">
              {mileage.logs.map((log) => (
                <div
                  key={log.id}
                  className="flex items-center justify-between text-xs py-1 border-b border-stone-800 last:border-0"
                >
                  <div>
                    <span className="text-stone-300">
                      {log.log_date} · {log.from_address} → {log.to_address}
                    </span>
                  </div>
                  <div className="text-stone-500 flex-shrink-0 ml-2">
                    {Number(log.miles).toFixed(1)}mi · {formatDollars(log.deduction_cents ?? 0)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* CPA Export - routes to the canonical year-end export package */}
      <div className="flex justify-end">
        {exportReady ? (
          <a
            href={`/finance/year-end/export?year=${year}`}
            className="inline-flex items-center justify-center rounded-md border border-stone-600 bg-stone-900 px-4 py-2 text-sm text-stone-300 hover:bg-stone-800 transition-colors"
          >
            Download CPA Export
          </a>
        ) : (
          <span
            title="Resolve uncategorized expenses in the Year-End section before downloading"
            className="inline-flex items-center justify-center rounded-md border border-stone-800 bg-stone-950 px-4 py-2 text-sm text-stone-600 cursor-not-allowed"
          >
            Download CPA Export
          </span>
        )}
      </div>
    </div>
  )
}

// ─── Year select ─────────────────────────────────────────────────────────────
// Extracted as a client component so onChange can use router.push.
// The parent page is a server component and cannot hold event handlers.

export function TaxYearSelect({ currentYear }: { currentYear: number }) {
  const router = useRouter()
  return (
    <select
      defaultValue={currentYear}
      onChange={(e) => router.push(`?year=${e.target.value}`)}
      aria-label="Select tax year"
      className="rounded-lg border border-stone-600 px-3 py-2 text-sm"
    >
      {[2024, 2025, 2026].map((y) => (
        <option key={y} value={y}>
          {y}
        </option>
      ))}
    </select>
  )
}
