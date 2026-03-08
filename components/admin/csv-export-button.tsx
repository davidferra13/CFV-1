'use client'

import { useCallback } from 'react'

type CsvColumn<T> = {
  header: string
  accessor: (row: T) => string | number | null | undefined
}

export function CsvExportButton<T>({
  data,
  columns,
  filename,
}: {
  data: T[]
  columns: CsvColumn<T>[]
  filename: string
}) {
  const handleExport = useCallback(() => {
    if (data.length === 0) return

    const headers = columns.map((c) => c.header)
    const rows = data.map((row) =>
      columns.map((col) => {
        const val = col.accessor(row)
        if (val === null || val === undefined) return ''
        const str = String(val)
        // Escape quotes and wrap in quotes if contains comma, quote, or newline
        if (str.includes(',') || str.includes('"') || str.includes('\n')) {
          return `"${str.replace(/"/g, '""')}"`
        }
        return str
      })
    )

    const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${filename}-${new Date().toISOString().slice(0, 10)}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }, [data, columns, filename])

  return (
    <button
      onClick={handleExport}
      disabled={data.length === 0}
      className="text-xs bg-stone-800 hover:bg-stone-700 text-stone-300 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
    >
      Export CSV
    </button>
  )
}
