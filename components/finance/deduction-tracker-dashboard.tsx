'use client'

import { useEffect, useState, useTransition } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { getDeductionSummary, type DeductionSummary } from '@/lib/finance/deduction-tracker'
import { formatCurrency } from '@/lib/utils/currency'
import { toast } from 'sonner'

export function DeductionTrackerDashboard() {
  const currentYear = new Date().getFullYear()
  const [year, setYear] = useState(currentYear)
  const [summary, setSummary] = useState<DeductionSummary | null>(null)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function loadData(y: number) {
    startTransition(async () => {
      try {
        const data = await getDeductionSummary(y)
        setSummary(data)
        setError(null)
      } catch {
        setError('Failed to load deduction data')
        setSummary(null)
      }
    })
  }

  useEffect(() => {
    loadData(year)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function handleYear(y: number) {
    setYear(y)
    loadData(y)
  }

  async function handleDownloadPDF() {
    startTransition(async () => {
      try {
        const { generateTaxSummaryPDF } = await import('@/lib/finance/tax-summary-pdf')
        const result = await generateTaxSummaryPDF(year)
        const bytes = Uint8Array.from(atob(result.base64), (c) => c.charCodeAt(0))
        const blob = new Blob([bytes], { type: 'application/pdf' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = result.filename
        a.click()
        URL.revokeObjectURL(url)
        toast.success('Tax summary downloaded')
      } catch {
        toast.error('Failed to generate tax summary PDF')
      }
    })
  }

  return (
    <div className="space-y-6">
      {/* Year Selector + PDF Download */}
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          {[currentYear - 1, currentYear].map((y) => (
            <Button
              key={y}
              size="sm"
              variant={year === y ? 'primary' : 'secondary'}
              onClick={() => handleYear(y)}
              disabled={isPending}
            >
              {y}
            </Button>
          ))}
        </div>
        <Button
          size="sm"
          variant="secondary"
          onClick={handleDownloadPDF}
          disabled={isPending || !summary}
        >
          Download Tax Summary PDF
        </Button>
      </div>

      {error && (
        <Card>
          <CardContent className="py-6">
            <p className="text-sm text-red-400">{error}</p>
          </CardContent>
        </Card>
      )}

      {summary && (
        <>
          {/* Total Deductions Card */}
          <Card>
            <CardContent className="py-4">
              <p className="text-xs text-stone-500">Total Deductions ({year})</p>
              <p className="text-3xl font-bold text-emerald-400">
                {formatCurrency(summary.totalDeductionsCents)}
              </p>
            </CardContent>
          </Card>

          {/* Deduction Sources */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <Card>
              <CardContent className="py-3">
                <p className="text-xs text-stone-500">Expenses</p>
                <p className="text-lg font-semibold text-stone-100">
                  {formatCurrency(summary.categories.reduce((s, c) => s + c.amountCents, 0))}
                </p>
                <p className="text-xs text-stone-600">
                  {summary.categories.reduce((s, c) => s + c.count, 0)} entries
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="py-3">
                <p className="text-xs text-stone-500">Mileage</p>
                <p className="text-lg font-semibold text-stone-100">
                  {formatCurrency(summary.mileageDeductionCents)}
                </p>
                <p className="text-xs text-stone-600">
                  {summary.totalMiles.toLocaleString()} mi / {summary.mileageTrips} trips
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="py-3">
                <p className="text-xs text-stone-500">Home Office</p>
                <p className="text-lg font-semibold text-stone-100">
                  {formatCurrency(summary.homeOfficeDeductionCents)}
                </p>
                <p className="text-xs text-stone-600">{summary.homeOfficeMethod ?? 'Not set up'}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="py-3">
                <p className="text-xs text-stone-500">Depreciation</p>
                <p className="text-lg font-semibold text-stone-100">
                  {formatCurrency(summary.depreciationDeductionCents)}
                </p>
                <p className="text-xs text-stone-600">
                  {summary.depreciationAssets} asset{summary.depreciationAssets !== 1 ? 's' : ''}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Expense Categories Table */}
          {summary.categories.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm text-stone-300">
                  Expense Categories (IRS Schedule C)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {summary.categories.map((cat) => (
                    <div
                      key={cat.category}
                      className="flex items-center justify-between rounded-lg border border-stone-800 px-4 py-2"
                    >
                      <div>
                        <p className="text-sm text-stone-100">{cat.label}</p>
                        <p className="text-xs text-stone-600">
                          {cat.irsCategoryCode} - {cat.count} entries
                        </p>
                      </div>
                      <p className="text-sm font-semibold text-stone-100">
                        {formatCurrency(cat.amountCents)}
                      </p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Disclaimer */}
          <Card className="border-amber-800 bg-amber-950/30">
            <CardContent className="py-3">
              <p className="text-xs text-amber-300">
                This is for informational purposes only. ChefFlow does not provide tax advice.
                Consult a qualified CPA or tax professional before filing.
              </p>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
