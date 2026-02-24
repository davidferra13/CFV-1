'use client'

import { useState, useTransition } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  export1099NECToCSV,
  type Form1099NEC,
  type FilingSummary,
} from '@/lib/finance/1099-actions'
import { AlertTriangle, Download, FileText, CheckCircle } from 'lucide-react'

type Props = {
  reports: Form1099NEC[]
  summary: FilingSummary
  taxYear: number
}

function formatCents(cents: number): string {
  return `$${(cents / 100).toLocaleString('en-US', { minimumFractionDigits: 2 })}`
}

export function Form1099NecPanel({ reports, summary, taxYear }: Props) {
  const [isPending, startTransition] = useTransition()

  function handleExportCSV() {
    startTransition(async () => {
      const csv = await export1099NECToCSV(taxYear)
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `1099-nec-${taxYear}.csv`
      a.click()
      URL.revokeObjectURL(url)
    })
  }

  return (
    <div className="space-y-6">
      {/* Disclaimer */}
      <Card className="border-blue-200 bg-blue-950">
        <CardContent className="py-3">
          <p className="text-sm text-blue-800 font-medium">Reference Report Only</p>
          <p className="text-xs text-blue-700 mt-1">
            This report is for tracking and accountant reference only. 1099-NEC forms must be filed
            with the IRS using IRS-approved software or through your accountant. Recipient copies
            are due by January 31; IRS filing deadline varies.
          </p>
        </CardContent>
      </Card>

      {/* Summary Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card>
          <CardContent className="py-3">
            <p className="text-xs text-stone-500">Total Contractors</p>
            <p className="text-2xl font-semibold text-stone-100">{summary.totalContractors}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-3">
            <p className="text-xs text-stone-500">Require 1099</p>
            <p className="text-2xl font-semibold text-amber-600">{summary.requiresFilingCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-3">
            <p className="text-xs text-stone-500">Missing W-9</p>
            <p
              className={`text-2xl font-semibold ${summary.missingW9Count > 0 ? 'text-red-600' : 'text-emerald-600'}`}
            >
              {summary.missingW9Count}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-3">
            <p className="text-xs text-stone-500">Total NEC Paid</p>
            <p className="text-2xl font-semibold text-stone-100">
              {formatCents(summary.totalNecCents)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Missing W-9 Alert */}
      {summary.missingW9Count > 0 && (
        <Card className="border-red-200 bg-red-950">
          <CardContent className="py-3">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-red-600 mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-medium text-red-800">
                  {summary.missingW9Count} contractor{summary.missingW9Count !== 1 ? 's' : ''}{' '}
                  require a 1099 but have no W-9 on file.
                </p>
                <p className="text-xs text-red-700 mt-1">
                  Go to{' '}
                  <a href="/finance/contractors" className="underline">
                    1099 Contractors
                  </a>{' '}
                  to collect W-9 information before filing.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Export */}
      <div className="flex justify-end">
        <Button
          size="sm"
          onClick={handleExportCSV}
          loading={isPending}
          disabled={reports.length === 0}
        >
          <Download className="h-4 w-4" />
          Export CSV
        </Button>
      </div>

      {/* Contractor Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-stone-400" />
            {taxYear} 1099-NEC Summary
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-stone-700">
                <th className="text-left px-6 py-3 text-xs font-medium text-stone-500 uppercase">
                  Recipient
                </th>
                <th className="text-left px-6 py-3 text-xs font-medium text-stone-500 uppercase">
                  Address
                </th>
                <th className="text-left px-6 py-3 text-xs font-medium text-stone-500 uppercase">
                  TIN
                </th>
                <th className="text-right px-6 py-3 text-xs font-medium text-stone-500 uppercase">
                  Box 1 NEC
                </th>
                <th className="text-center px-6 py-3 text-xs font-medium text-stone-500 uppercase">
                  Filing
                </th>
                <th className="text-center px-6 py-3 text-xs font-medium text-stone-500 uppercase">
                  W-9
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-800">
              {reports.map((r) => (
                <tr key={r.staffMemberId}>
                  <td className="px-6 py-3">
                    <p className="font-medium text-stone-100">{r.recipientName}</p>
                    {r.recipientBusinessName && (
                      <p className="text-xs text-stone-500">{r.recipientBusinessName}</p>
                    )}
                    <p className="text-xs text-stone-400">
                      {r.paymentCount} payment{r.paymentCount !== 1 ? 's' : ''}
                    </p>
                  </td>
                  <td className="px-6 py-3 text-stone-400 text-xs max-w-xs truncate">
                    {r.recipientAddress}
                  </td>
                  <td className="px-6 py-3 font-mono text-xs text-stone-400">
                    {r.recipientTinDisplay}
                    {r.recipientTinType && (
                      <span className="ml-1 font-sans text-stone-400">
                        ({r.recipientTinType.toUpperCase()})
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-3 text-right font-medium text-stone-100">
                    {formatCents(r.box1NecCents)}
                  </td>
                  <td className="px-6 py-3 text-center">
                    {r.requiresFiling ? (
                      <Badge variant="warning">Required</Badge>
                    ) : (
                      <Badge variant="default">Under $600</Badge>
                    )}
                  </td>
                  <td className="px-6 py-3 text-center">
                    {r.w9OnFile ? (
                      <CheckCircle className="h-4 w-4 text-emerald-500 mx-auto" />
                    ) : r.requiresFiling ? (
                      <AlertTriangle className="h-4 w-4 text-red-500 mx-auto" />
                    ) : (
                      <span className="text-stone-300">—</span>
                    )}
                  </td>
                </tr>
              ))}
              {reports.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-stone-400 text-sm">
                    No contractor payments found for {taxYear}.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <p className="text-xs text-stone-400 text-center">
        IRS Form 1099-NEC — Box 1 (Nonemployee Compensation). Contractors paid $600 or more in a
        calendar year. This is a reference report only — consult your accountant or use IRS-approved
        software to file.
      </p>
    </div>
  )
}
