'use client'

import { useState, useTransition } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { generateW2Summaries } from '@/lib/finance/payroll-actions'
import type { PayrollW2Summary } from '@/lib/finance/payroll-actions'
import { Download } from 'lucide-react'

function formatCurrency(cents: number): string {
  return `$${(cents / 100).toLocaleString('en-US', { minimumFractionDigits: 2 })}`
}

type Props = {
  taxYear: number
  summaries: PayrollW2Summary[]
}

export function W2Panel({ taxYear, summaries }: Props) {
  const [isPending, startTransition] = useTransition()

  function handleGenerate() {
    startTransition(async () => {
      await generateW2Summaries(taxYear)
    })
  }

  function handleExportCSV() {
    // Trigger a fetch of the CSV export action
    const rows = [
      '# W-2 Reference Data — NOT for filing. File W-2s via SSA-approved software.',
      `# Tax Year: ${taxYear}`,
      '',
      'Employee,Box 1 Wages,Box 2 Federal Tax,Box 3 SS Wages,Box 4 SS Tax,Box 5 Medicare Wages,Box 6 Medicare Tax,Box 17 State Tax',
      ...summaries.map((s) =>
        [
          `"${s.employeeName ?? s.employeeId}"`,
          (s.box1WagesCents / 100).toFixed(2),
          (s.box2FederalWithheldCents / 100).toFixed(2),
          (s.box3SsWagesCents / 100).toFixed(2),
          (s.box4SsWithheldCents / 100).toFixed(2),
          (s.box5MedicareWagesCents / 100).toFixed(2),
          (s.box6MedicareWithheldCents / 100).toFixed(2),
          (s.box17StateTaxCents / 100).toFixed(2),
        ].join(',')
      ),
    ].join('\n')

    const blob = new Blob([rows], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `w2-${taxYear}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-amber-200 bg-amber-950 px-4 py-3 text-sm text-amber-800">
        <strong>Reference only.</strong> W-2s must be filed with the Social Security Administration
        via IRS-approved software by January 31. Provide a copy to each employee by the same date.
        This tool computes the box values for your records.
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>W-2 Summaries — {taxYear}</CardTitle>
            <div className="flex gap-2">
              <Button size="sm" variant="secondary" onClick={handleGenerate} loading={isPending}>
                Regenerate
              </Button>
              {summaries.length > 0 && (
                <Button size="sm" variant="ghost" onClick={handleExportCSV}>
                  <Download className="h-4 w-4 mr-1.5" />
                  Export CSV
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {summaries.length === 0 ? (
            <p className="text-sm text-stone-400 px-6 py-8">
              No W-2 data yet. Click "Regenerate" to compute from payroll records.
            </p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-stone-700 bg-stone-800">
                  <th className="text-left px-6 py-3 text-xs font-medium text-stone-500 uppercase">
                    Employee
                  </th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-stone-500 uppercase">
                    Box 1 Wages
                  </th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-stone-500 uppercase">
                    Box 2 Fed Tax
                  </th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-stone-500 uppercase">
                    Box 4 SS Tax
                  </th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-stone-500 uppercase">
                    Box 6 Medicare
                  </th>
                  <th className="text-right px-6 py-3 text-xs font-medium text-stone-500 uppercase">
                    Box 17 State
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-800">
                {summaries.map((s) => (
                  <tr key={s.id} className="hover:bg-stone-800">
                    <td className="px-6 py-3 font-medium text-stone-100">
                      {s.employeeName ?? '—'}
                    </td>
                    <td className="px-4 py-3 text-right">{formatCurrency(s.box1WagesCents)}</td>
                    <td className="px-4 py-3 text-right text-stone-400">
                      {formatCurrency(s.box2FederalWithheldCents)}
                    </td>
                    <td className="px-4 py-3 text-right text-stone-400">
                      {formatCurrency(s.box4SsWithheldCents)}
                    </td>
                    <td className="px-4 py-3 text-right text-stone-400">
                      {formatCurrency(s.box6MedicareWithheldCents)}
                    </td>
                    <td className="px-6 py-3 text-right text-stone-400">
                      {formatCurrency(s.box17StateTaxCents)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-stone-700 bg-stone-800 font-bold">
                  <td className="px-6 py-3">Total</td>
                  <td className="px-4 py-3 text-right">
                    {formatCurrency(summaries.reduce((s, r) => s + r.box1WagesCents, 0))}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {formatCurrency(summaries.reduce((s, r) => s + r.box2FederalWithheldCents, 0))}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {formatCurrency(summaries.reduce((s, r) => s + r.box4SsWithheldCents, 0))}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {formatCurrency(summaries.reduce((s, r) => s + r.box6MedicareWithheldCents, 0))}
                  </td>
                  <td className="px-6 py-3 text-right">
                    {formatCurrency(summaries.reduce((s, r) => s + r.box17StateTaxCents, 0))}
                  </td>
                </tr>
              </tfoot>
            </table>
          )}
        </CardContent>
      </Card>

      <p className="text-xs text-stone-400">
        Generated:{' '}
        {summaries[0]?.generatedAt ? new Date(summaries[0].generatedAt).toLocaleDateString() : '—'}
      </p>
    </div>
  )
}
