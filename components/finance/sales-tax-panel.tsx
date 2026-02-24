'use client'

import { useState, useTransition } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  recordSalesTaxRemittance,
  markEventSalesTaxRemitted,
} from '@/lib/finance/sales-tax-actions'
import type { SalesTaxSummary, SalesTaxRemittance } from '@/lib/finance/sales-tax-actions'
import { bpsToPercent } from '@/lib/finance/sales-tax-constants'
import { CheckCircle, AlertTriangle, DollarSign } from 'lucide-react'

function formatCurrency(cents: number): string {
  return `$${(cents / 100).toLocaleString('en-US', { minimumFractionDigits: 2 })}`
}

type UnremittedEvent = {
  eventId: string
  taxCollectedCents: number
  taxRateBps: number
  taxableAmountCents: number
  remittancePeriod: string | null
}

type Props = {
  summary: SalesTaxSummary
  unremittedEvents: UnremittedEvent[]
  remittances: SalesTaxRemittance[]
}

export function SalesTaxPanel({ summary, unremittedEvents, remittances }: Props) {
  const [isPending, startTransition] = useTransition()
  const [showRemitForm, setShowRemitForm] = useState(false)
  const [remitForm, setRemitForm] = useState({
    period: '',
    periodStart: '',
    periodEnd: '',
    amountRemittedCents: 0,
    remittedAt: new Date().toISOString().split('T')[0],
    confirmationNumber: '',
    notes: '',
  })
  const [markingEventId, setMarkingEventId] = useState<string | null>(null)
  const [markPeriod, setMarkPeriod] = useState('')

  function handleRecordRemittance() {
    startTransition(async () => {
      await recordSalesTaxRemittance({
        period: remitForm.period,
        periodStart: remitForm.periodStart,
        periodEnd: remitForm.periodEnd,
        amountRemittedCents: Math.round(remitForm.amountRemittedCents * 100),
        remittedAt: remitForm.remittedAt,
        confirmationNumber: remitForm.confirmationNumber || null,
        notes: remitForm.notes || null,
      })
      setShowRemitForm(false)
      setRemitForm({
        period: '',
        periodStart: '',
        periodEnd: '',
        amountRemittedCents: 0,
        remittedAt: new Date().toISOString().split('T')[0],
        confirmationNumber: '',
        notes: '',
      })
    })
  }

  function handleMarkRemitted(eventId: string) {
    if (!markPeriod) return
    startTransition(async () => {
      await markEventSalesTaxRemitted({ eventId, remittancePeriod: markPeriod })
      setMarkingEventId(null)
      setMarkPeriod('')
    })
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-stone-500 uppercase font-medium">Total Collected</p>
            <p className="text-2xl font-bold text-stone-100 mt-1">
              {formatCurrency(summary.collectedCents)}
            </p>
            <p className="text-xs text-stone-400 mt-1">{summary.eventCount} events</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-stone-500 uppercase font-medium">Remitted</p>
            <p className="text-2xl font-bold text-emerald-700 mt-1">
              {formatCurrency(summary.remittedCents)}
            </p>
            <p className="text-xs text-stone-400 mt-1">{summary.remittedEventCount} events</p>
          </CardContent>
        </Card>
        <Card className={summary.outstandingCents > 0 ? 'border-amber-200 bg-amber-950' : ''}>
          <CardContent className="pt-4">
            <p className="text-xs text-stone-500 uppercase font-medium">Outstanding</p>
            <p
              className={`text-2xl font-bold mt-1 ${summary.outstandingCents > 0 ? 'text-amber-700' : 'text-stone-400'}`}
            >
              {formatCurrency(summary.outstandingCents)}
            </p>
            <p className="text-xs text-stone-400 mt-1">{summary.pendingEventCount} pending</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-stone-500 uppercase font-medium">Exempt</p>
            <p className="text-2xl font-bold text-stone-400 mt-1">{summary.exemptEventCount}</p>
            <p className="text-xs text-stone-400 mt-1">events exempt</p>
          </CardContent>
        </Card>
      </div>

      {/* Outstanding Collections */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            Outstanding Collections
          </CardTitle>
        </CardHeader>
        <CardContent>
          {unremittedEvents.length === 0 ? (
            <div className="flex items-center gap-2 text-sm text-emerald-700 bg-emerald-950 rounded-lg px-4 py-3">
              <CheckCircle className="h-4 w-4" />
              All collected sales tax has been remitted.
            </div>
          ) : (
            <div className="space-y-3">
              {unremittedEvents.map((ev) => (
                <div
                  key={ev.eventId}
                  className="flex items-center justify-between py-3 border-b border-stone-800 last:border-0"
                >
                  <div>
                    <p className="text-sm font-medium text-stone-200">
                      Event{' '}
                      <span className="font-mono text-xs text-stone-500">
                        {ev.eventId.slice(0, 8)}…
                      </span>
                    </p>
                    <p className="text-xs text-stone-500">
                      Taxable: {formatCurrency(ev.taxableAmountCents)} @{' '}
                      {bpsToPercent(ev.taxRateBps)}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-semibold text-amber-700">
                      {formatCurrency(ev.taxCollectedCents)}
                    </span>
                    {markingEventId === ev.eventId ? (
                      <div className="flex items-center gap-2">
                        <Input
                          value={markPeriod}
                          onChange={(e) => setMarkPeriod(e.target.value)}
                          placeholder="e.g. Q2 2026"
                          className="w-28 text-xs"
                        />
                        <Button
                          size="sm"
                          onClick={() => handleMarkRemitted(ev.eventId)}
                          loading={isPending}
                        >
                          Confirm
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => setMarkingEventId(null)}>
                          Cancel
                        </Button>
                      </div>
                    ) : (
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => {
                          setMarkingEventId(ev.eventId)
                          setMarkPeriod('')
                        }}
                      >
                        Mark Remitted
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Remittance History */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-stone-400" />
              Remittance History
            </CardTitle>
            <Button size="sm" onClick={() => setShowRemitForm((v) => !v)}>
              + Record Remittance
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {showRemitForm && (
            <div className="mb-6 p-4 rounded-lg border border-stone-700 bg-stone-800 space-y-4">
              <p className="text-sm font-medium text-stone-300">Record Tax Remittance</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Period Label (e.g. Q2 2026)"
                  value={remitForm.period}
                  onChange={(e) => setRemitForm({ ...remitForm, period: e.target.value })}
                />
                <Input
                  label="Amount Remitted ($)"
                  type="number"
                  min="0"
                  step="0.01"
                  value={remitForm.amountRemittedCents === 0 ? '' : remitForm.amountRemittedCents}
                  onChange={(e) =>
                    setRemitForm({
                      ...remitForm,
                      amountRemittedCents: parseFloat(e.target.value) || 0,
                    })
                  }
                />
                <Input
                  label="Period Start"
                  type="date"
                  value={remitForm.periodStart}
                  onChange={(e) => setRemitForm({ ...remitForm, periodStart: e.target.value })}
                />
                <Input
                  label="Period End"
                  type="date"
                  value={remitForm.periodEnd}
                  onChange={(e) => setRemitForm({ ...remitForm, periodEnd: e.target.value })}
                />
                <Input
                  label="Date Remitted"
                  type="date"
                  value={remitForm.remittedAt}
                  onChange={(e) => setRemitForm({ ...remitForm, remittedAt: e.target.value })}
                />
                <Input
                  label="Confirmation Number (optional)"
                  value={remitForm.confirmationNumber}
                  onChange={(e) =>
                    setRemitForm({ ...remitForm, confirmationNumber: e.target.value })
                  }
                />
              </div>
              <Input
                label="Notes (optional)"
                value={remitForm.notes}
                onChange={(e) => setRemitForm({ ...remitForm, notes: e.target.value })}
              />
              <div className="flex gap-2">
                <Button size="sm" onClick={handleRecordRemittance} loading={isPending}>
                  Save Remittance
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setShowRemitForm(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          )}

          {remittances.length === 0 ? (
            <p className="text-sm text-stone-400 py-4">No remittances recorded yet.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-stone-700">
                  <th className="text-left px-0 py-2 text-xs font-medium text-stone-500 uppercase">
                    Period
                  </th>
                  <th className="text-left px-4 py-2 text-xs font-medium text-stone-500 uppercase">
                    Dates
                  </th>
                  <th className="text-right px-0 py-2 text-xs font-medium text-stone-500 uppercase">
                    Amount
                  </th>
                  <th className="text-left px-4 py-2 text-xs font-medium text-stone-500 uppercase">
                    Confirmation
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-800">
                {remittances.map((r) => (
                  <tr key={r.id}>
                    <td className="py-3 font-medium text-stone-100">
                      {r.period}
                      <span className="block text-xs text-stone-500 font-normal">
                        Remitted {r.remittedAt}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-stone-400 text-xs">
                      {r.periodStart} → {r.periodEnd}
                    </td>
                    <td className="py-3 text-right font-semibold text-stone-100">
                      {formatCurrency(r.amountRemittedCents)}
                    </td>
                    <td className="px-4 py-3 text-stone-500 font-mono text-xs">
                      {r.confirmationNumber || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
