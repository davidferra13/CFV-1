'use client'

import { useState, useTransition } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'
import {
  type TaxPrepSummary,
  type ScheduleCLineItem,
  type QuarterlyEstimateRow,
  updateQuarterlyPayment,
  assignExpenseToTaxLine,
} from '@/lib/finance/tax-prep-actions'
import { SCHEDULE_C_LINES } from '@/lib/finance/tax-prep-constants'

type Props = {
  summary: TaxPrepSummary
  onYearChange: (year: number) => void
}

function formatCents(cents: number): string {
  const abs = Math.abs(cents)
  const formatted = (abs / 100).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
  return cents < 0 ? `-$${formatted}` : `$${formatted}`
}

const STATUS_BADGE: Record<
  string,
  { variant: 'default' | 'success' | 'warning' | 'error'; label: string }
> = {
  upcoming: { variant: 'default', label: 'Upcoming' },
  due: { variant: 'warning', label: 'Due Soon' },
  paid: { variant: 'success', label: 'Paid' },
  overdue: { variant: 'error', label: 'Overdue' },
}

const QUARTER_LABELS: Record<number, string> = {
  1: 'Q1 (Jan - Mar)',
  2: 'Q2 (Apr - Jun)',
  3: 'Q3 (Jul - Sep)',
  4: 'Q4 (Oct - Dec)',
}

export function TaxPrepDashboard({ summary, onYearChange }: Props) {
  const [isPending, startTransition] = useTransition()
  const [payingId, setPayingId] = useState<string | null>(null)
  const [paymentAmount, setPaymentAmount] = useState('')
  const [showAddExpense, setShowAddExpense] = useState(false)
  const [newExpense, setNewExpense] = useState({
    description: '',
    line: 'line_22',
    amount: '',
    quarter: '',
  })

  const currentYear = new Date().getFullYear()
  const yearOptions = Array.from({ length: 5 }, (_, i) => currentYear - 2 + i)

  function handleRecordPayment(estimateId: string) {
    const cents = Math.round(parseFloat(paymentAmount) * 100)
    if (isNaN(cents) || cents <= 0) {
      toast.error('Enter a valid payment amount')
      return
    }
    startTransition(async () => {
      try {
        await updateQuarterlyPayment({
          estimateId,
          paidCents: cents,
        })
        setPayingId(null)
        setPaymentAmount('')
        toast.success('Payment recorded')
      } catch (err) {
        toast.error('Failed to record payment')
      }
    })
  }

  function handleAddExpense() {
    const cents = Math.round(parseFloat(newExpense.amount) * 100)
    if (!newExpense.description.trim() || isNaN(cents) || cents <= 0) {
      toast.error('Fill in description and a valid amount')
      return
    }
    startTransition(async () => {
      try {
        await assignExpenseToTaxLine({
          expenseDescription: newExpense.description,
          scheduleCLine: newExpense.line,
          amountCents: cents,
          taxYear: summary.year,
          quarter: newExpense.quarter ? parseInt(newExpense.quarter) : null,
          source: 'manual',
        })
        setShowAddExpense(false)
        setNewExpense({ description: '', line: 'line_22', amount: '', quarter: '' })
        toast.success('Expense categorized')
      } catch (err) {
        toast.error('Failed to categorize expense')
      }
    })
  }

  return (
    <div className="space-y-6">
      {/* Year Selector */}
      <div className="flex items-center gap-3">
        <label className="text-sm font-medium text-stone-400">Tax Year</label>
        <select
          className="rounded-md border border-stone-700 bg-stone-800 px-3 py-1.5 text-sm text-stone-200"
          value={summary.year}
          onChange={(e) => onYearChange(parseInt(e.target.value))}
        >
          {yearOptions.map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </select>
      </div>

      {/* Revenue Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card>
          <CardContent className="py-3">
            <p className="text-xs text-stone-500">Gross Revenue</p>
            <p className="text-xl font-semibold text-stone-100">
              {formatCents(summary.totalRevenueCents)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-3">
            <p className="text-xs text-stone-500">Tips</p>
            <p className="text-xl font-semibold text-stone-100">
              {formatCents(summary.totalTipsCents)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-3">
            <p className="text-xs text-stone-500">Total Deductions</p>
            <p className="text-xl font-semibold text-emerald-400">
              {formatCents(summary.scheduleCBreakdown.totalDeductibleCents)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-3">
            <p className="text-xs text-stone-500">Taxable Income (est.)</p>
            <p className="text-xl font-semibold text-amber-400">
              {formatCents(summary.estimatedTaxableIncomeCents)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Schedule C Breakdown */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg text-stone-100">Schedule C Breakdown</CardTitle>
            <Button variant="ghost" size="sm" onClick={() => setShowAddExpense(!showAddExpense)}>
              {showAddExpense ? 'Cancel' : '+ Add Expense'}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {showAddExpense && (
            <div className="mb-4 rounded-lg border border-stone-700 bg-stone-800/50 p-4 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-stone-400">Description</label>
                  <Input
                    value={newExpense.description}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setNewExpense({ ...newExpense, description: e.target.value })
                    }
                    placeholder="e.g. Kitchen supplies from Amazon"
                    className="mt-1"
                  />
                </div>
                <div>
                  <label className="text-xs text-stone-400">Amount ($)</label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={newExpense.amount}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setNewExpense({ ...newExpense, amount: e.target.value })
                    }
                    placeholder="0.00"
                    className="mt-1"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-stone-400">Schedule C Line</label>
                  <select
                    className="mt-1 w-full rounded-md border border-stone-700 bg-stone-800 px-3 py-2 text-sm text-stone-200"
                    value={newExpense.line}
                    onChange={(e) => setNewExpense({ ...newExpense, line: e.target.value })}
                  >
                    {Object.entries(SCHEDULE_C_LINES).map(([key, info]) => (
                      <option key={key} value={key}>
                        {info.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-stone-400">Quarter (optional)</label>
                  <select
                    className="mt-1 w-full rounded-md border border-stone-700 bg-stone-800 px-3 py-2 text-sm text-stone-200"
                    value={newExpense.quarter}
                    onChange={(e) => setNewExpense({ ...newExpense, quarter: e.target.value })}
                  >
                    <option value="">All Year</option>
                    <option value="1">Q1</option>
                    <option value="2">Q2</option>
                    <option value="3">Q3</option>
                    <option value="4">Q4</option>
                  </select>
                </div>
              </div>
              <Button size="sm" onClick={handleAddExpense} loading={isPending}>
                {isPending ? 'Saving...' : 'Save Expense'}
              </Button>
            </div>
          )}

          {summary.scheduleCBreakdown.lines.length === 0 ? (
            <p className="text-sm text-stone-500 py-4 text-center">
              No categorized expenses for {summary.year}. Add expenses or they will be auto-mapped
              from your expense records.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-stone-700 text-stone-400">
                    <th className="text-left py-2 pr-4 font-medium">Line</th>
                    <th className="text-left py-2 pr-4 font-medium hidden sm:table-cell">
                      Description
                    </th>
                    <th className="text-right py-2 pr-4 font-medium">Total</th>
                    <th className="text-right py-2 pr-4 font-medium">Deductible</th>
                    <th className="text-right py-2 font-medium">Items</th>
                  </tr>
                </thead>
                <tbody>
                  {summary.scheduleCBreakdown.lines.map((line) => (
                    <tr key={line.line} className="border-b border-stone-800">
                      <td className="py-2 pr-4 text-stone-200">{line.label}</td>
                      <td className="py-2 pr-4 text-stone-500 hidden sm:table-cell">
                        {line.description}
                      </td>
                      <td className="py-2 pr-4 text-right text-stone-300">
                        {formatCents(line.totalCents)}
                      </td>
                      <td className="py-2 pr-4 text-right text-emerald-400">
                        {formatCents(line.deductibleCents)}
                        {line.deductiblePct < 100 && (
                          <span className="text-xs text-stone-500 ml-1">
                            ({line.deductiblePct}%)
                          </span>
                        )}
                      </td>
                      <td className="py-2 text-right text-stone-500">{line.itemCount}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t border-stone-600 font-semibold">
                    <td className="py-2 pr-4 text-stone-200">Total</td>
                    <td className="hidden sm:table-cell" />
                    <td className="py-2 pr-4 text-right text-stone-200">
                      {formatCents(summary.scheduleCBreakdown.totalExpenseCents)}
                    </td>
                    <td className="py-2 pr-4 text-right text-emerald-400">
                      {formatCents(summary.scheduleCBreakdown.totalDeductibleCents)}
                    </td>
                    <td />
                  </tr>
                </tfoot>
              </table>
            </div>
          )}

          {summary.scheduleCBreakdown.mileageDeductionCents > 0 && (
            <p className="mt-2 text-xs text-stone-500">
              Includes {formatCents(summary.scheduleCBreakdown.mileageDeductionCents)} mileage
              deduction (Line 9).
            </p>
          )}
        </CardContent>
      </Card>

      {/* Quarterly Estimated Tax Payments */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg text-stone-100">Quarterly Estimated Payments</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {summary.quarterlyEstimates.map((est) => {
            const badge = STATUS_BADGE[est.status]
            return (
              <div
                key={est.id}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 rounded-lg border border-stone-700 p-3"
              >
                <div className="flex items-center gap-3">
                  <div>
                    <p className="font-medium text-stone-200">{QUARTER_LABELS[est.quarter]}</p>
                    <p className="text-xs text-stone-500">Due: {est.dueDate}</p>
                  </div>
                  <Badge variant={badge.variant}>{badge.label}</Badge>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="text-xs text-stone-500">Estimated</p>
                    <p className="text-sm font-medium text-stone-300">
                      {est.estimatedTaxCents > 0 ? formatCents(est.estimatedTaxCents) : 'Not set'}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-stone-500">Paid</p>
                    <p className="text-sm font-medium text-emerald-400">
                      {formatCents(est.paidCents)}
                    </p>
                  </div>
                  {est.status !== 'paid' && (
                    <>
                      {payingId === est.id ? (
                        <div className="flex items-center gap-2">
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            value={paymentAmount}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                              setPaymentAmount(e.target.value)
                            }
                            placeholder="0.00"
                            className="w-24"
                          />
                          <Button
                            size="sm"
                            onClick={() => handleRecordPayment(est.id)}
                            loading={isPending}
                          >
                            Save
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setPayingId(null)
                              setPaymentAmount('')
                            }}
                          >
                            Cancel
                          </Button>
                        </div>
                      ) : (
                        <Button size="sm" variant="ghost" onClick={() => setPayingId(est.id)}>
                          Record Payment
                        </Button>
                      )}
                    </>
                  )}
                </div>
              </div>
            )
          })}
        </CardContent>
      </Card>

      {/* 1099-NEC Summary */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg text-stone-100">1099-NEC Contractor Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <p className="text-xs text-stone-500">Total Contractors</p>
              <p className="text-xl font-semibold text-stone-200">{summary.contractorCount}</p>
            </div>
            <div>
              <p className="text-xs text-stone-500">Total Paid</p>
              <p className="text-xl font-semibold text-stone-200">
                {formatCents(summary.contractorTotalCents)}
              </p>
            </div>
            <div>
              <p className="text-xs text-stone-500">Need 1099-NEC</p>
              <p className="text-xl font-semibold text-amber-400">{summary.needs1099Count}</p>
              <p className="text-xs text-stone-500">($600+ threshold)</p>
            </div>
          </div>
          {summary.needs1099Count > 0 && (
            <p className="mt-3 text-xs text-stone-500">
              You must file a 1099-NEC for each contractor paid $600 or more during the tax year.
              Forms are due January 31 of the following year.
            </p>
          )}
          {summary.contractorCount === 0 && (
            <p className="text-sm text-stone-500 py-2">
              No contractor payments recorded for {summary.year}. Track payments via the Contractor
              Payments page.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
