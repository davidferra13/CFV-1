// CSV Download Button
// Reusable client component that calls a server action and triggers browser download

'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'

type Props = {
  action: () => Promise<{ csv: string; filename: string }>
  label?: string
  loadingLabel?: string
  variant?: 'primary' | 'secondary' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
}

export function CSVDownloadButton({
  action,
  label = 'Export CSV',
  loadingLabel = 'Exporting...',
  variant = 'secondary',
  size = 'sm',
}: Props) {
  const [exporting, setExporting] = useState(false)

  const handleExport = async () => {
    setExporting(true)
    try {
      const { csv, filename } = await action()

      const blob = new Blob([csv], { type: 'text/csv' })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(url)
    } catch (err) {
      console.error('Export failed:', err)
      toast.error('Failed to export CSV')
    } finally {
      setExporting(false)
    }
  }

  return (
    <Button onClick={handleExport} disabled={exporting} variant={variant} size={size}>
      {exporting ? loadingLabel : label}
    </Button>
  )
}
