'use client'

import { useState, useTransition } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { save941Summary, mark941Filed } from '@/lib/finance/payroll-actions'
import type { Payroll941Summary } from '@/lib/finance/payroll-actions'
import { QUARTER_LABELS, QUARTER_DUE_DATES } from '@/lib/finance/payroll-constants'
import { toast } from 'sonner'

function formatCurrency(cents: number): string {
  return `$${(cents / 100).toLocaleString('en-US', { minimumFractionDigits: 2 })}`
}

type Props = {
  taxYear: number
  summaries: Payroll941Summary[]
}

export function Form941Panel({ taxYear, summaries }: Props) {
  const [isPending, startTransition] = useTransition()
  const [filingQuarter, setFilingQuarter] = useState<number | null>(null)
  const [confirmationNumber, setConfirmationNumber] = useState('')
  const [notes, setNotes] = useState('')

  // Build map by quarter for quick lookup
  const summaryMap = new Map(summaries.map((s) => [s.quarter, s]))

  function handleRecompute(quarter: number) {
    startTransition(async () => {
      try {
        await save941Summary(taxYear, quarter)
      } catch (err) {
        toast.error('Failed to compute 941 summary')
      }
    })
  }

  function handleMarkFiled(quarter: number) {
    startTransition(async () => {
      try {
        await mark941Filed({
          taxYear,
          quarter,
          confirmationNumber: confirmationNumber || null,
          notes: notes || null,
        })
        setFilingQuarter(null)
        setConfirmationNumber('')
        setNotes('')
      } catch (err) {
        toast.error('Failed to mark 941 as filed')
      }
    })
  }

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-amber-200 bg-amber-950 px-4 py-3 text-sm text-amber-800">
        <strong>Reference only.</strong> File Form 941 via IRS-approved payroll software or with
        your payroll accountant. This tool tracks and computes the numbers for your records.
      </div>

      {[1, 2, 3, 4].map((quarter) => {
        const s = summaryMap.get(quarter)
        return (
          <Card key={quarter} className={s?.filed ? 'border-emerald-200' : ''}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">{QUARTER_LABELS[quarter]}</CardTitle>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-stone-400">Due: {QUARTER_DUE_DATES[quarter]}</span>
                  {s?.filed ? (
                    <Badge variant="success">Filed</Badge>
                  ) : s ? (
                    <Badge variant="warning">Not Filed</Badge>
                  ) : (
                    <Badge variant="default">Not Computed</Badge>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {s ? (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
                    <div>
                      <p className="text-xs text-stone-400">Total Wages</p>
                      <p className="font-medium">{formatCurrency(s.totalWagesCents)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-stone-400">Federal Tax Withheld</p>
                      <p className="font-medium">
                        {formatCurrency(s.federalIncomeTaxWithheldCents)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-stone-400">Employee SS + Medicare</p>
                      <p className="font-medium">
                        {formatCurrency(s.employeeSsTaxCents + s.employeeMedicareTaxCents)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-stone-400">Employer SS + Medicare</p>
                      <p className="font-medium">
                        {formatCurrency(s.employerSsTaxCents + s.employerMedicareTaxCents)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-stone-400">Total Taxes (Line 6)</p>
                      <p className="font-bold text-stone-100">
                        {formatCurrency(s.totalTaxesCents)}
                      </p>
                    </div>
                    {s.confirmationNumber && (
                      <div>
                        <p className="text-xs text-stone-400">Confirmation #</p>
                        <p className="font-mono text-xs text-stone-400">{s.confirmationNumber}</p>
                      </div>
                    )}
                  </div>

                  {!s.filed && (
                    <div className="flex gap-2 pt-2">
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => handleRecompute(quarter)}
                        loading={isPending}
                      >
                        Recompute
                      </Button>
                      {filingQuarter === quarter ? (
                        <div className="flex items-center gap-2">
                          <Input
                            value={confirmationNumber}
                            onChange={(e) => setConfirmationNumber(e.target.value)}
                            placeholder="Confirmation # (optional)"
                            className="w-48 text-xs"
                          />
                          <Button
                            size="sm"
                            onClick={() => handleMarkFiled(quarter)}
                            loading={isPending}
                          >
                            Confirm Filed
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => setFilingQuarter(null)}>
                            Cancel
                          </Button>
                        </div>
                      ) : (
                        <Button size="sm" onClick={() => setFilingQuarter(quarter)}>
                          Mark as Filed
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex items-center gap-4">
                  <p className="text-sm text-stone-500">No data computed yet for this quarter.</p>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => handleRecompute(quarter)}
                    loading={isPending}
                  >
                    Compute Now
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
