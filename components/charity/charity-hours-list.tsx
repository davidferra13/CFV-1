'use client'

import { useState, useTransition } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { NonprofitBadge } from './nonprofit-badge'
import { deleteCharityHours } from '@/lib/charity/hours-actions'
import type { CharityHourEntry } from '@/lib/charity/hours-types'
import { Trash2, Pencil, Download } from '@/components/ui/icons'
import { toast } from 'sonner'

function formatDate(dateStr: string): string {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export function CharityHoursList({
  entries,
  onEdit,
}: {
  entries: CharityHourEntry[]
  onEdit?: (entry: CharityHourEntry) => void
}) {
  const [pending, startTransition] = useTransition()
  const [deletingId, setDeletingId] = useState<string | null>(null)

  function handleDelete(entry: CharityHourEntry) {
    if (
      !confirm(
        `Delete ${entry.hours}h at ${entry.organizationName} on ${formatDate(entry.serviceDate)}?`
      )
    ) {
      return
    }
    setDeletingId(entry.id)
    startTransition(async () => {
      try {
        await deleteCharityHours(entry.id)
        toast.success('Entry deleted')
      } catch (err) {
        toast.error('Failed to delete entry')
      } finally {
        setDeletingId(null)
      }
    })
  }

  function handleExportCsv() {
    const header = 'Date,Organization,Address,EIN,501(c) Verified,Hours,Notes'
    const rows = entries.map((e) => {
      const esc = (s: string | null) => {
        if (!s) return ''
        // Escape double quotes and wrap in quotes if contains comma/quote/newline
        const escaped = s.replace(/"/g, '""')
        return /[,"\n\r]/.test(s) ? `"${escaped}"` : escaped
      }
      return [
        e.serviceDate,
        esc(e.organizationName),
        esc(e.organizationAddress),
        e.ein ?? '',
        e.isVerified501c ? 'Yes' : 'No',
        e.hours,
        esc(e.notes),
      ].join(',')
    })
    const csv = [header, ...rows].join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `charity-hours-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
    toast.success('CSV exported')
  }

  if (entries.length === 0) {
    return (
      <Card className="p-10 text-center">
        <p className="text-lg font-medium text-stone-400">No hours logged yet</p>
        <p className="text-sm text-stone-500 mt-2">
          Log your first volunteer hours using the form above.
        </p>
      </Card>
    )
  }

  return (
    <Card className="overflow-hidden">
      <div className="px-5 py-4 border-b border-stone-800 flex items-center justify-between">
        <h2 className="text-sm font-medium text-stone-300">Your Logged Hours ({entries.length})</h2>
        <button
          type="button"
          onClick={handleExportCsv}
          className="inline-flex items-center gap-1.5 text-xs text-stone-500 hover:text-stone-300 transition-colors"
          title="Export to CSV"
        >
          <Download className="w-3.5 h-3.5" />
          Export CSV
        </button>
      </div>
      <div className="divide-y divide-stone-800">
        {entries.map((entry) => (
          <div
            key={entry.id}
            className="flex items-center justify-between px-5 py-3 hover:bg-stone-800/30 transition-colors"
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-stone-200 truncate">
                  {entry.organizationName}
                </span>
                <NonprofitBadge verified={entry.isVerified501c} />
              </div>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-xs text-stone-500">{formatDate(entry.serviceDate)}</span>
                {entry.organizationAddress && (
                  <span className="text-xs text-stone-600 truncate">
                    · {entry.organizationAddress}
                  </span>
                )}
              </div>
              {entry.notes && (
                <p className="text-xs text-stone-500 mt-1 line-clamp-1">{entry.notes}</p>
              )}
            </div>
            <div className="flex items-center gap-3 ml-4 flex-shrink-0">
              <span className="text-sm font-medium text-stone-200 tabular-nums">
                {entry.hours}h
              </span>
              <div className="flex items-center gap-1">
                {onEdit && (
                  <button
                    onClick={() => onEdit(entry)}
                    className="p-1.5 rounded hover:bg-stone-700 text-stone-500 hover:text-stone-300 transition-colors"
                    title="Edit"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                )}
                <button
                  onClick={() => handleDelete(entry)}
                  disabled={pending && deletingId === entry.id}
                  className="p-1.5 rounded hover:bg-stone-700 text-stone-500 hover:text-red-400 transition-colors disabled:opacity-50"
                  title="Delete"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </Card>
  )
}
