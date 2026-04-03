'use client'

import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { deleteCharityHours } from '@/lib/charity/hours-actions'
import type { CharityHourEntry } from '@/lib/charity/hours-types'
import { Download, ExternalLink, Pencil, Trash2 } from '@/components/ui/icons'
import { NonprofitBadge } from './nonprofit-badge'

function formatDate(dateStr: string): string {
  return new Date(`${dateStr}T00:00:00`).toLocaleDateString('en-US', {
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
        toast.success('Volunteer entry deleted.')
      } catch {
        toast.error('Failed to delete entry.')
      } finally {
        setDeletingId(null)
      }
    })
  }

  function handleExportCsv() {
    const header = 'Date,Organization,Address,Website,EIN,501(c) Verified,Hours,Notes'
    const rows = entries.map((entry) => {
      const escapeCell = (value: string | null) => {
        if (!value) return ''
        const escaped = value.replace(/"/g, '""')
        return /[,"\n\r]/.test(value) ? `"${escaped}"` : escaped
      }

      return [
        entry.serviceDate,
        escapeCell(entry.organizationName),
        escapeCell(entry.organizationAddress),
        escapeCell(entry.organizationWebsiteUrl),
        entry.ein ?? '',
        entry.isVerified501c ? 'Yes' : 'No',
        entry.hours,
        escapeCell(entry.notes),
      ].join(',')
    })

    const csv = [header, ...rows].join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `community-impact-hours-${new Date().toISOString().slice(0, 10)}.csv`
    anchor.click()
    URL.revokeObjectURL(url)
    toast.success('CSV exported.')
  }

  if (entries.length === 0) {
    return (
      <Card className="p-10 text-center">
        <p className="text-lg font-medium text-stone-400">No volunteer entries yet</p>
        <p className="mt-2 text-sm text-stone-500">
          Log your first shift, pantry run, or community event using the form above.
        </p>
      </Card>
    )
  }

  return (
    <Card className="overflow-hidden">
      <div className="flex items-center justify-between border-b border-stone-800 px-5 py-4">
        <div>
          <h2 className="text-sm font-medium text-stone-300">Volunteer log ({entries.length})</h2>
          <p className="mt-1 text-xs text-stone-500">
            Structured entries keep organization links and proof attached to each record.
          </p>
        </div>
        <Button type="button" variant="ghost" onClick={handleExportCsv} className="gap-1.5 text-xs">
          <Download className="h-3.5 w-3.5" />
          Export CSV
        </Button>
      </div>

      <div className="divide-y divide-stone-800">
        {entries.map((entry) => (
          <div
            key={entry.id}
            className="flex items-start justify-between gap-4 px-5 py-4 transition-colors hover:bg-stone-800/30"
          >
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="truncate text-sm font-medium text-stone-200">
                  {entry.organizationName}
                </span>
                <NonprofitBadge verified={entry.isVerified501c} />
              </div>

              <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-stone-500">
                <span>{formatDate(entry.serviceDate)}</span>
                {entry.organizationAddress && <span>{entry.organizationAddress}</span>}
              </div>

              {(entry.links.websiteUrl || entry.links.mapsUrl || entry.links.verificationUrl) && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {entry.links.websiteUrl && (
                    <a
                      href={entry.links.websiteUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 rounded-full border border-stone-700 px-2.5 py-1 text-[11px] text-stone-300 transition-colors hover:border-stone-600 hover:text-stone-100"
                    >
                      Website <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                  {entry.links.mapsUrl && (
                    <a
                      href={entry.links.mapsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 rounded-full border border-stone-700 px-2.5 py-1 text-[11px] text-stone-300 transition-colors hover:border-stone-600 hover:text-stone-100"
                    >
                      Maps <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                  {entry.links.verificationUrl && (
                    <a
                      href={entry.links.verificationUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 rounded-full border border-stone-700 px-2.5 py-1 text-[11px] text-stone-300 transition-colors hover:border-stone-600 hover:text-stone-100"
                    >
                      Verification <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                </div>
              )}

              {entry.notes && (
                <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-stone-500">
                  {entry.notes}
                </p>
              )}
            </div>

            <div className="ml-2 flex flex-shrink-0 items-center gap-3">
              <span className="text-sm font-medium tabular-nums text-stone-200">
                {entry.hours}h
              </span>
              <div className="flex items-center gap-1">
                {onEdit && (
                  <button
                    type="button"
                    onClick={() => onEdit(entry)}
                    className="rounded p-1.5 text-stone-500 transition-colors hover:bg-stone-700 hover:text-stone-300"
                    title="Edit"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => handleDelete(entry)}
                  disabled={pending && deletingId === entry.id}
                  className="rounded p-1.5 text-stone-500 transition-colors hover:bg-stone-700 hover:text-red-400 disabled:opacity-50"
                  title="Delete"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </Card>
  )
}
