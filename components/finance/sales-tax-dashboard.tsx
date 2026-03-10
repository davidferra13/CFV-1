'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { formatCurrency } from '@/lib/utils/currency'
import { toast } from 'sonner'
import {
  createTaxJurisdiction,
  updateTaxJurisdiction,
  deleteTaxJurisdiction,
  generateFilingSummary,
  markFiled,
  markPaid,
  type TaxJurisdiction,
  type TaxFiling,
  type TaxStats,
} from '@/lib/finance/sales-tax-jurisdiction-actions'

// ── Jurisdiction Form ──────────────────────────────────────────────────────

function JurisdictionForm({ onClose }: { onClose: () => void }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [name, setName] = useState('')
  const [ratePercent, setRatePercent] = useState('')
  const [type, setType] = useState<'state' | 'county' | 'city' | 'district'>('state')
  const [frequency, setFrequency] = useState<'monthly' | 'quarterly' | 'annual'>('monthly')
  const [nextFiling, setNextFiling] = useState('')

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const rate = parseFloat(ratePercent)
    if (!name.trim() || isNaN(rate) || rate < 0) {
      toast.error('Enter a valid name and rate')
      return
    }

    startTransition(async () => {
      try {
        await createTaxJurisdiction({
          name: name.trim(),
          ratePercent: rate,
          jurisdictionType: type,
          filingFrequency: frequency,
          nextFilingDate: nextFiling || undefined,
        })
        toast.success('Jurisdiction added')
        onClose()
        router.refresh()
      } catch (err: any) {
        toast.error(err?.message || 'Failed to add jurisdiction')
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-stone-300 mb-1">Name</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full px-3 py-2 bg-stone-800 border border-stone-700 rounded-lg text-stone-100 text-sm"
          placeholder='e.g., "Texas State" or "Austin City"'
          required
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-stone-300 mb-1">Rate (%)</label>
          <input
            type="number"
            step="0.01"
            min="0"
            value={ratePercent}
            onChange={(e) => setRatePercent(e.target.value)}
            className="w-full px-3 py-2 bg-stone-800 border border-stone-700 rounded-lg text-stone-100 text-sm"
            placeholder="6.25"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-stone-300 mb-1">Type</label>
          <select
            value={type}
            onChange={(e) => setType(e.target.value as any)}
            className="w-full px-3 py-2 bg-stone-800 border border-stone-700 rounded-lg text-stone-100 text-sm"
          >
            <option value="state">State</option>
            <option value="county">County</option>
            <option value="city">City</option>
            <option value="district">District</option>
          </select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-stone-300 mb-1">Filing Frequency</label>
          <select
            value={frequency}
            onChange={(e) => setFrequency(e.target.value as any)}
            className="w-full px-3 py-2 bg-stone-800 border border-stone-700 rounded-lg text-stone-100 text-sm"
          >
            <option value="monthly">Monthly</option>
            <option value="quarterly">Quarterly</option>
            <option value="annual">Annual</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-stone-300 mb-1">Next Filing Date</label>
          <input
            type="date"
            value={nextFiling}
            onChange={(e) => setNextFiling(e.target.value)}
            className="w-full px-3 py-2 bg-stone-800 border border-stone-700 rounded-lg text-stone-100 text-sm"
          />
        </div>
      </div>
      <div className="flex justify-end gap-3 pt-2">
        <Button type="button" variant="ghost" onClick={onClose}>
          Cancel
        </Button>
        <Button type="submit" variant="primary" disabled={pending}>
          {pending ? 'Adding...' : 'Add Jurisdiction'}
        </Button>
      </div>
    </form>
  )
}

// ── Filing Generator ───────────────────────────────────────────────────────

function FilingGenerator({ onClose }: { onClose: () => void }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [periodStart, setPeriodStart] = useState('')
  const [periodEnd, setPeriodEnd] = useState('')
  const [notes, setNotes] = useState('')

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!periodStart || !periodEnd) {
      toast.error('Select the filing period')
      return
    }

    startTransition(async () => {
      try {
        const filing = await generateFilingSummary(periodStart, periodEnd, notes || undefined)
        toast.success(
          `Filing generated: ${formatCurrency(filing.totalTaxCents)} tax on ${formatCurrency(filing.totalTaxableCents)} taxable`
        )
        onClose()
        router.refresh()
      } catch (err: any) {
        toast.error(err?.message || 'Failed to generate filing')
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-stone-300 mb-1">Period Start</label>
          <input
            type="date"
            value={periodStart}
            onChange={(e) => setPeriodStart(e.target.value)}
            className="w-full px-3 py-2 bg-stone-800 border border-stone-700 rounded-lg text-stone-100 text-sm"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-stone-300 mb-1">Period End</label>
          <input
            type="date"
            value={periodEnd}
            onChange={(e) => setPeriodEnd(e.target.value)}
            className="w-full px-3 py-2 bg-stone-800 border border-stone-700 rounded-lg text-stone-100 text-sm"
            required
          />
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-stone-300 mb-1">Notes</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          className="w-full px-3 py-2 bg-stone-800 border border-stone-700 rounded-lg text-stone-100 text-sm"
        />
      </div>
      <div className="flex justify-end gap-3 pt-2">
        <Button type="button" variant="ghost" onClick={onClose}>
          Cancel
        </Button>
        <Button type="submit" variant="primary" disabled={pending}>
          {pending ? 'Generating...' : 'Generate Filing'}
        </Button>
      </div>
    </form>
  )
}

// ── Main Component ─────────────────────────────────────────────────────────

export function SalesTaxDashboard({
  initialStats,
  initialJurisdictions,
  initialFilings,
  upcomingDeadlines,
}: {
  initialStats: TaxStats
  initialJurisdictions: TaxJurisdiction[]
  initialFilings: TaxFiling[]
  upcomingDeadlines: TaxJurisdiction[]
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [showJurisdictionForm, setShowJurisdictionForm] = useState(false)
  const [showFilingForm, setShowFilingForm] = useState(false)

  function handleFilingAction(filingId: string, action: 'filed' | 'paid') {
    startTransition(async () => {
      try {
        if (action === 'filed') {
          await markFiled(filingId)
          toast.success('Filing marked as filed')
        } else {
          await markPaid(filingId)
          toast.success('Filing marked as paid')
        }
        router.refresh()
      } catch (err: any) {
        toast.error(err?.message || 'Failed to update filing')
      }
    })
  }

  function handleDeactivateJurisdiction(id: string) {
    startTransition(async () => {
      try {
        await deleteTaxJurisdiction(id)
        toast.success('Jurisdiction deactivated')
        router.refresh()
      } catch (err: any) {
        toast.error(err?.message || 'Failed to deactivate')
      }
    })
  }

  function handleToggleJurisdiction(jurisdiction: TaxJurisdiction) {
    startTransition(async () => {
      try {
        await updateTaxJurisdiction(jurisdiction.id, { isActive: !jurisdiction.isActive })
        toast.success(jurisdiction.isActive ? 'Jurisdiction deactivated' : 'Jurisdiction activated')
        router.refresh()
      } catch (err: any) {
        toast.error(err?.message || 'Failed to update jurisdiction')
      }
    })
  }

  const filingStatusVariant = (status: string) => {
    switch (status) {
      case 'pending':
        return 'warning'
      case 'filed':
        return 'info'
      case 'paid':
        return 'success'
      default:
        return 'default'
    }
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-5">
            <div className="text-2xl font-bold text-stone-100">
              {formatCurrency(initialStats.currentLiabilityCents)}
            </div>
            <div className="text-sm text-stone-500 mt-0.5">Current Liability</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <div className="text-2xl font-bold text-stone-100">
              {formatCurrency(initialStats.thisMonthCollectedCents)}
            </div>
            <div className="text-sm text-stone-500 mt-0.5">This Month Collected</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <div className="text-2xl font-bold text-stone-100">
              {initialStats.combinedRatePercent.toFixed(2)}%
            </div>
            <div className="text-sm text-stone-500 mt-0.5">Combined Rate</div>
          </CardContent>
        </Card>
      </div>

      {/* Upcoming Filing Deadlines */}
      {upcomingDeadlines.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Upcoming Filing Deadlines</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {upcomingDeadlines.map((j) => {
                const daysUntil = j.nextFilingDate
                  ? Math.ceil(
                      (new Date(j.nextFilingDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
                    )
                  : null
                return (
                  <div
                    key={j.id}
                    className="flex items-center justify-between py-2 border-b border-stone-800"
                  >
                    <div>
                      <span className="text-sm text-stone-200">{j.name}</span>
                      <span className="text-xs text-stone-500 ml-2 capitalize">
                        ({j.filingFrequency})
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-stone-400">
                        {j.nextFilingDate
                          ? new Date(j.nextFilingDate).toLocaleDateString()
                          : 'Not set'}
                      </span>
                      {daysUntil !== null && daysUntil <= 14 && (
                        <Badge variant={daysUntil <= 7 ? 'error' : 'warning'}>
                          {daysUntil <= 0 ? 'Overdue' : `${daysUntil}d`}
                        </Badge>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Jurisdictions */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Tax Jurisdictions</CardTitle>
          <Button variant="primary" onClick={() => setShowJurisdictionForm(true)}>
            + Add Jurisdiction
          </Button>
        </CardHeader>
        <CardContent>
          {initialJurisdictions.length === 0 ? (
            <p className="text-sm text-stone-500 py-6 text-center">
              No jurisdictions configured. Add your state, county, and city tax rates above.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-stone-700">
                    <th className="text-left py-3 pr-4 font-medium text-stone-500 text-xs uppercase tracking-wide">
                      Name
                    </th>
                    <th className="text-left py-3 pr-4 font-medium text-stone-500 text-xs uppercase tracking-wide">
                      Type
                    </th>
                    <th className="text-left py-3 pr-4 font-medium text-stone-500 text-xs uppercase tracking-wide">
                      Rate
                    </th>
                    <th className="text-left py-3 pr-4 font-medium text-stone-500 text-xs uppercase tracking-wide">
                      Filing
                    </th>
                    <th className="text-left py-3 pr-4 font-medium text-stone-500 text-xs uppercase tracking-wide">
                      Status
                    </th>
                    <th className="text-right py-3 font-medium text-stone-500 text-xs uppercase tracking-wide">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {initialJurisdictions.map((j) => (
                    <tr key={j.id} className="border-b border-stone-800 hover:bg-stone-800/50">
                      <td className="py-3 pr-4 text-stone-200">{j.name}</td>
                      <td className="py-3 pr-4 text-stone-400 capitalize text-xs">
                        {j.jurisdictionType}
                      </td>
                      <td className="py-3 pr-4 text-stone-200">{j.ratePercent}%</td>
                      <td className="py-3 pr-4 text-stone-400 capitalize text-xs">
                        {j.filingFrequency}
                      </td>
                      <td className="py-3 pr-4">
                        <Badge variant={j.isActive ? 'success' : 'default'}>
                          {j.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                      </td>
                      <td className="py-3 text-right">
                        <button
                          onClick={() => handleToggleJurisdiction(j)}
                          disabled={pending}
                          className="text-xs text-stone-400 hover:text-stone-200 font-medium"
                        >
                          {j.isActive ? 'Deactivate' : 'Activate'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Filing History */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Filing History</CardTitle>
          <Button variant="secondary" onClick={() => setShowFilingForm(true)}>
            Generate Filing
          </Button>
        </CardHeader>
        <CardContent>
          {initialFilings.length === 0 ? (
            <p className="text-sm text-stone-500 py-6 text-center">
              No filings yet. Generate a filing for a period to get started.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-stone-700">
                    <th className="text-left py-3 pr-4 font-medium text-stone-500 text-xs uppercase tracking-wide">
                      Period
                    </th>
                    <th className="text-left py-3 pr-4 font-medium text-stone-500 text-xs uppercase tracking-wide">
                      Taxable Sales
                    </th>
                    <th className="text-left py-3 pr-4 font-medium text-stone-500 text-xs uppercase tracking-wide">
                      Tax Collected
                    </th>
                    <th className="text-left py-3 pr-4 font-medium text-stone-500 text-xs uppercase tracking-wide">
                      Status
                    </th>
                    <th className="text-right py-3 font-medium text-stone-500 text-xs uppercase tracking-wide">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {initialFilings.map((f) => (
                    <tr key={f.id} className="border-b border-stone-800 hover:bg-stone-800/50">
                      <td className="py-3 pr-4 text-stone-200 text-xs whitespace-nowrap">
                        {new Date(f.periodStart).toLocaleDateString()} -{' '}
                        {new Date(f.periodEnd).toLocaleDateString()}
                      </td>
                      <td className="py-3 pr-4 text-stone-300">
                        {formatCurrency(f.totalTaxableCents)}
                      </td>
                      <td className="py-3 pr-4 text-stone-300">
                        {formatCurrency(f.totalTaxCents)}
                      </td>
                      <td className="py-3 pr-4">
                        <Badge variant={filingStatusVariant(f.status) as any}>{f.status}</Badge>
                      </td>
                      <td className="py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {f.status === 'pending' && (
                            <button
                              onClick={() => handleFilingAction(f.id, 'filed')}
                              disabled={pending}
                              className="text-xs text-brand-600 hover:text-brand-400 font-medium"
                            >
                              Mark Filed
                            </button>
                          )}
                          {f.status === 'filed' && (
                            <button
                              onClick={() => handleFilingAction(f.id, 'paid')}
                              disabled={pending}
                              className="text-xs text-green-600 hover:text-green-400 font-medium"
                            >
                              Mark Paid
                            </button>
                          )}
                          {f.status === 'paid' && (
                            <span className="text-xs text-stone-500">Complete</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modals */}
      {showJurisdictionForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div className="bg-stone-900 rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-stone-700">
              <h2 className="text-lg font-semibold text-stone-100">Add Tax Jurisdiction</h2>
              <button
                onClick={() => setShowJurisdictionForm(false)}
                className="text-stone-400 hover:text-stone-200"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
            <div className="px-6 py-5">
              <JurisdictionForm onClose={() => setShowJurisdictionForm(false)} />
            </div>
          </div>
        </div>
      )}

      {showFilingForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div className="bg-stone-900 rounded-xl shadow-xl w-full max-w-lg">
            <div className="flex items-center justify-between px-6 py-4 border-b border-stone-700">
              <h2 className="text-lg font-semibold text-stone-100">Generate Filing Summary</h2>
              <button
                onClick={() => setShowFilingForm(false)}
                className="text-stone-400 hover:text-stone-200"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
            <div className="px-6 py-5">
              <FilingGenerator onClose={() => setShowFilingForm(false)} />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
