'use client'

import { useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { exportProspectsToCSV } from '@/lib/prospecting/pipeline-actions'
import { Download, Loader2 } from '@/components/ui/icons'
import { toast } from 'sonner'

export function ExportCSVButton() {
  const [isPending, startTransition] = useTransition()

  function handleExport() {
    startTransition(async () => {
      try {
        const csvContent = await exportProspectsToCSV()
        if (!csvContent) return

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
        const url = URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        link.download = `prospects-${((_prd) => `${_prd.getFullYear()}-${String(_prd.getMonth() + 1).padStart(2, '0')}-${String(_prd.getDate()).padStart(2, '0')}`)(new Date())}.csv`
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        URL.revokeObjectURL(url)
      } catch {
        toast.error('Failed to export CSV')
      }
    })
  }

  return (
    <Button variant="secondary" size="sm" onClick={handleExport} disabled={isPending}>
      {isPending ? (
        <>
          <Loader2 className="h-4 w-4 mr-1 animate-spin" />
          Exporting...
        </>
      ) : (
        <>
          <Download className="h-4 w-4 mr-1" />
          Export CSV
        </>
      )}
    </Button>
  )
}
