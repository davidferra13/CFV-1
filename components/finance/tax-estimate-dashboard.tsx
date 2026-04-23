'use client'

import { useState, useTransition } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  saveQuarterlyEstimate,
  recordQuarterlyPayment,
  type TaxYearSummary,
} from '@/lib/finance/tax-estimate-actions'
import { Calculator, DollarSign } from '@/components/ui/icons'
import { toast } from 'sonner'

type Props = {
  summary: TaxYearSummary
  currentYear: number
}

function formatCents(cents: number): string {
  return `$${(Math.abs(cents) / 100).toLocaleString('en-US', { minimumFractionDigits: 2 })}`
}

const QUARTER_LABELS = ['Q1 (Jan–Mar)', 'Q2 (Apr–May)', 'Q3 (Jun–Aug)', 'Q4 (Sep–Dec)']

export function TaxEstimateDashboard({ summary, currentYear }: Props) {
  const [isPending, startTransition] = useTransition()
  const [editingQuarter, setEditingQuarter] = useState<number | null>(null)
  const [payingQuarter, setPayingQuarter] = useState<number | null>(null)
  const [formData, setFormData] = useState({
    estimatedIncomeCents: 0,
    estimatedSeTaxCents: 0,
    estimatedFederalCents: 0,
    estimatedStateCents: 0,
  })
  const [paymentAmount, setPaymentAmount] = useState('')

  const safeHarborCents = Math.round(summary.totalOwedCents * 1.1) // 110% safe harbor

  function handleSaveEstimate(quarter: number) {
    startTransition(async () => {
      try {
        await saveQuarterlyEstimate({
          taxYear: currentYear,
          quarter,
          ...formData,
        })
        setEditingQuarter(null)
      } catch (err) {
        toast.error('Failed to save quarterly estimate')
      }
    })
  }

  function handleRecordPayment(quarter: number) {
    startTransition(async () => {
      try {
        await recordQuarterlyPayment({
          taxYear: currentYear,
          quarter,
          amountPaidCents: Math.round(parseFloat(paymentAmount) * 100),
        })
        setPayingQuarter(null)
        setPaymentAmount('')
      } catch (err) {
        toast.error('Failed to record quarterly payment')
      }
    })
  }

  return (
    <div className="space-y-6">
      {/* Year Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card>
          <CardContent className="py-3">
            <p className="text-xs text-stone-500">Estimated Revenue</p>
            <p className="text-xl font-semibold text-stone-900">
              {formatCents(summary.totalIncomeCents)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-3">
            <p className="text-xs text-stone-500">Total Tax Owed</p>
            <p className="text-xl font-semibold text-red-600">
              {formatCents(
                summary.totalSeTaxCents + summary.totalFederalCents + summary.totalStateCents
              )}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-3">
            <p className="text-xs text-stone-500">Total Paid</p>
            <p className="text-xl font-semibold text-emerald-600">
              {formatCents(summary.totalPaidCents)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-3">
            <p className="text-xs text-stone-500">Remaining</p>
            <p
              className={`text-xl font-semibold ${summary.totalOwedCents > 0 ? 'text-amber-600' : 'text-emerald-600'}`}
            >
              {formatCents(summary.totalOwedCents)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Safe Harbor */}
      {summary.totalPaidCents < safeHarborCents && summary.totalOwedCents > 0 && (
        <Card className="border-amber-200 bg-amber-950">
          <CardContent className="py-3">
            <div className="flex items-center gap-2">
              <Calculator className="h-4 w-4 text-amber-600" />
              <p className="text-sm text-amber-800">
                Safe harbor target: {formatCents(safeHarborCents)} - you need{' '}
                {formatCents(safeHarborCents - summary.totalPaidCents)} more to avoid underpayment
                penalties.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quarterly Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[1, 2, 3, 4].map((q) => {
          const quarter = summary.quarters.find((qd) => qd.quarter === q)
          const isPast = quarter?.dueDate ? new Date(quarter.dueDate) < new Date() : false
          const isPaid = (quarter?.amountPaidCents || 0) > 0

          return (
            <Card key={q}>
              <CardHeader className="py-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">{QUARTER_LABELS[q - 1]}</CardTitle>
                  {isPaid ? (
                    <Badge variant="success">Paid</Badge>
                  ) : isPast ? (
                    <Badge variant="error">Overdue</Badge>
                  ) : (
                    <Badge variant="default">Upcoming</Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="py-3 space-y-2">
                {quarter ? (
                  <>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <p className="text-stone-500">Income</p>
                        <p className="font-medium">{formatCents(quarter.estimatedIncomeCents)}</p>
                      </div>
                      <div>
                        <p className="text-stone-500">SE Tax</p>
                        <p className="font-medium">{formatCents(quarter.estimatedSeTaxCents)}</p>
                      </div>
                      <div>
                        <p className="text-stone-500">Federal</p>
                        <p className="font-medium">{formatCents(quarter.estimatedFederalCents)}</p>
                      </div>
                      <div>
                        <p className="text-stone-500">State</p>
                        <p className="font-medium">{formatCents(quarter.estimatedStateCents)}</p>
                      </div>
                    </div>
                    <div className="pt-2 border-t border-stone-100 flex items-center justify-between">
                      <div>
                        <p className="text-xs text-stone-500">Due: {quarter.dueDate}</p>
                        {quarter.amountPaidCents > 0 && (
                          <p className="text-xs text-emerald-600">
                            Paid: {formatCents(quarter.amountPaidCents)}
                          </p>
                        )}
                      </div>
                      <div className="flex gap-1">
                        <Button size="sm" variant="ghost" onClick={() => setEditingQuarter(q)}>
                          Edit
                        </Button>
                        {!isPaid && (
                          <Button size="sm" variant="secondary" onClick={() => setPayingQuarter(q)}>
                            <DollarSign className="h-3.5 w-3.5" />
                            Record Payment
                          </Button>
                        )}
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="text-center py-4">
                    <p className="text-sm text-stone-500 mb-2">No estimate yet</p>
                    <Button size="sm" variant="secondary" onClick={() => setEditingQuarter(q)}>
                      Add Estimate
                    </Button>
                  </div>
                )}

                {/* Edit Form */}
                {editingQuarter === q && (
                  <div className="pt-3 border-t border-stone-200 space-y-2">
                    <Input
                      label="Estimated Revenue ($)"
                      type="number"
                      min="0"
                      step="0.01"
                      value={(formData.estimatedIncomeCents / 100).toString()}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          estimatedIncomeCents: Math.round(parseFloat(e.target.value || '0') * 100),
                        })
                      }
                    />
                    <Input
                      label="SE Tax ($)"
                      type="number"
                      min="0"
                      step="0.01"
                      value={(formData.estimatedSeTaxCents / 100).toString()}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          estimatedSeTaxCents: Math.round(parseFloat(e.target.value || '0') * 100),
                        })
                      }
                    />
                    <Input
                      label="Federal ($)"
                      type="number"
                      min="0"
                      step="0.01"
                      value={(formData.estimatedFederalCents / 100).toString()}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          estimatedFederalCents: Math.round(
                            parseFloat(e.target.value || '0') * 100
                          ),
                        })
                      }
                    />
                    <Input
                      label="State ($)"
                      type="number"
                      min="0"
                      step="0.01"
                      value={(formData.estimatedStateCents / 100).toString()}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          estimatedStateCents: Math.round(parseFloat(e.target.value || '0') * 100),
                        })
                      }
                    />
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => handleSaveEstimate(q)} loading={isPending}>
                        Save
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setEditingQuarter(null)}>
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}

                {/* Payment Form */}
                {payingQuarter === q && (
                  <div className="pt-3 border-t border-stone-200 space-y-2">
                    <Input
                      label="Payment Amount ($)"
                      type="number"
                      min="0"
                      step="0.01"
                      value={paymentAmount}
                      onChange={(e) => setPaymentAmount(e.target.value)}
                    />
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => handleRecordPayment(q)} loading={isPending}>
                        Record
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setPayingQuarter(null)}>
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
