'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Download } from '@/components/ui/icons'
import { tableToCsv, downloadCsv, statsToCsv } from '@/lib/utils/csv-export'

type CsvExportButtonProps = {
  filename: string
  /** Label shown on the button (defaults to "Export CSV") */
  label?: string
} & (
  | { headers: string[]; rows: (string | number)[][]; stats?: never }
  | { stats: Record<string, string | number>[]; headers?: never; rows?: never }
)

export function CsvExportButton(props: CsvExportButtonProps) {
  const [exporting, setExporting] = useState(false)

  const handleExport = () => {
    setExporting(true)
    try {
      const csv = props.stats ? statsToCsv(props.stats) : tableToCsv(props.headers!, props.rows!)
      downloadCsv(csv, props.filename)
    } finally {
      setTimeout(() => setExporting(false), 600)
    }
  }

  return (
    <Button variant="ghost" size="sm" onClick={handleExport} disabled={exporting}>
      <Download className="w-3.5 h-3.5 mr-1.5" />
      {exporting ? 'Exporting...' : (props.label ?? 'Export CSV')}
    </Button>
  )
}
