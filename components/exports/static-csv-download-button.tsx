'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { buildCsvSafe } from '@/lib/security/csv-sanitize'

type CsvCell = string | number | null | undefined

type Props = {
  headers: string[]
  rows: CsvCell[][]
  filename: string
  label?: string
  loadingLabel?: string
  variant?: 'primary' | 'secondary' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
}

export function StaticCSVDownloadButton({
  headers,
  rows,
  filename,
  label = 'Export CSV',
  loadingLabel = 'Exporting...',
  variant = 'secondary',
  size = 'md',
}: Props) {
  const [exporting, setExporting] = useState(false)

  function triggerDownload(csv: string) {
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    window.URL.revokeObjectURL(url)
  }

  async function handleExport() {
    setExporting(true)
    try {
      triggerDownload(buildCsvSafe(headers, rows))
    } catch (error) {
      console.error('[StaticCSVDownloadButton] Export failed:', error)
      toast.error('Failed to export CSV')
    } finally {
      setExporting(false)
    }
  }

  return (
    <Button
      onClick={handleExport}
      disabled={exporting}
      variant={variant}
      size={size}
      className="min-h-[44px]"
    >
      {exporting ? loadingLabel : label}
    </Button>
  )
}
