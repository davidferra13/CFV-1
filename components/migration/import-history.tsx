'use client'

import { useEffect, useState, useTransition } from 'react'
import { getImportHistory, type ImportHistoryEntry } from '@/lib/migration/csv-import-actions'

export default function ImportHistory() {
  const [history, setHistory] = useState<ImportHistoryEntry[]>([])
  const [isPending, startTransition] = useTransition()
  const [loadError, setLoadError] = useState('')

  useEffect(() => {
    startTransition(async () => {
      try {
        const data = await getImportHistory()
        setHistory(data)
      } catch (err) {
        setLoadError(
          err instanceof Error ? err.message : 'Failed to load import history'
        )
      }
    })
  }, [])

  if (loadError) {
    return (
      <div className="rounded-md bg-red-50 border border-red-200 p-3 text-sm text-red-700">
        {loadError}
      </div>
    )
  }

  if (isPending) {
    return <div className="text-sm text-gray-500">Loading import history...</div>
  }

  if (history.length === 0) {
    return (
      <div className="text-sm text-gray-500 py-4 text-center">
        No imports yet. Use the CSV Import tool above to get started.
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="border-b bg-gray-50">
            <th className="text-left p-2 font-medium">Date</th>
            <th className="text-left p-2 font-medium">Type</th>
            <th className="text-right p-2 font-medium">Imported</th>
            <th className="text-right p-2 font-medium">Skipped</th>
            <th className="text-right p-2 font-medium">Errors</th>
          </tr>
        </thead>
        <tbody>
          {history.map((entry) => (
            <tr key={entry.id} className="border-b">
              <td className="p-2 text-xs text-gray-600">
                {new Date(entry.created_at).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </td>
              <td className="p-2">
                <span className="inline-block rounded bg-gray-100 px-2 py-0.5 text-xs font-medium capitalize">
                  {entry.import_type}
                </span>
              </td>
              <td className="p-2 text-right text-green-700 font-medium">
                {entry.imported_count}
              </td>
              <td className="p-2 text-right text-amber-600">
                {entry.skipped_count}
              </td>
              <td className="p-2 text-right text-red-600">
                {entry.error_count}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
