// Commerce Export Menu — CSV download buttons for sales, payments, refunds, tax
'use client'

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { Download } from '@/components/ui/icons'
import {
  exportSalesCsv,
  exportPaymentsCsv,
  exportRefundsCsv,
  exportTaxSummaryCsv,
  exportReconciliationCsv,
  exportShiftSessionsCsv,
} from '@/lib/commerce/export-actions'

type ExportType = 'sales' | 'payments' | 'refunds' | 'tax' | 'reconciliation' | 'shifts'

function downloadCsv(content: string, filename: string) {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}

export function ExportMenu({ from, to }: { from: string; to: string }) {
  const [isPending, startTransition] = useTransition()
  const [activeExport, setActiveExport] = useState<ExportType | null>(null)

  const handleExport = (type: ExportType) => {
    setActiveExport(type)
    startTransition(async () => {
      try {
        let csv: string
        let filename: string

        switch (type) {
          case 'sales':
            csv = await exportSalesCsv(from, to)
            filename = `chefflow-sales-${from}-to-${to}.csv`
            break
          case 'payments':
            csv = await exportPaymentsCsv(from, to)
            filename = `chefflow-payments-${from}-to-${to}.csv`
            break
          case 'refunds':
            csv = await exportRefundsCsv(from, to)
            filename = `chefflow-refunds-${from}-to-${to}.csv`
            break
          case 'tax':
            csv = await exportTaxSummaryCsv(from, to)
            filename = `chefflow-tax-summary-${from}-to-${to}.csv`
            break
          case 'reconciliation':
            csv = await exportReconciliationCsv(from, to)
            filename = `chefflow-reconciliation-${from}-to-${to}.csv`
            break
          case 'shifts':
            csv = await exportShiftSessionsCsv(from, to)
            filename = `chefflow-shifts-${from}-to-${to}.csv`
            break
        }

        downloadCsv(csv, filename)
      } catch (err) {
        console.error('Export failed:', err)
      } finally {
        setActiveExport(null)
      }
    })
  }

  return (
    <div className="flex flex-wrap gap-2">
      {(['sales', 'payments', 'refunds', 'tax', 'reconciliation', 'shifts'] as ExportType[]).map(
        (type) => (
          <Button
            key={type}
            variant="ghost"
            size="sm"
            onClick={() => handleExport(type)}
            disabled={isPending}
          >
            <Download className="w-3.5 h-3.5 mr-1.5" />
            {isPending && activeExport === type
              ? 'Exporting...'
              : `${type.charAt(0).toUpperCase() + type.slice(1)} CSV`}
          </Button>
        )
      )}
    </div>
  )
}
