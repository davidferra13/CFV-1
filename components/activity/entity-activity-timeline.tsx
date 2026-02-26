'use client'

import { useMemo } from 'react'
import { Download } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import type { EntityTimelineEntry, TimelineEntityType } from '@/lib/activity/entity-timeline'

type EntityActivityTimelineProps = {
  entityType: TimelineEntityType
  entityId: string
  entries: EntityTimelineEntry[]
}

function formatTimestamp(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return iso
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

export function EntityActivityTimeline({
  entityType,
  entityId,
  entries,
}: EntityActivityTimelineProps) {
  const exportName = useMemo(
    () => `${entityType}-${entityId}-activity-${new Date().toISOString().slice(0, 10)}.json`,
    [entityId, entityType]
  )

  const handleExport = () => {
    const blob = new Blob([JSON.stringify(entries, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = exportName
    anchor.click()
    URL.revokeObjectURL(url)
  }

  return (
    <Card className="p-6">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-xl font-semibold">Activity Timeline</h2>
        <Button type="button" variant="secondary" size="sm" onClick={handleExport}>
          <Download className="mr-1 h-3.5 w-3.5" />
          Export
        </Button>
      </div>

      {entries.length === 0 ? (
        <p className="text-sm text-stone-400">No timeline entries yet.</p>
      ) : (
        <div className="space-y-4">
          {entries.map((entry) => (
            <div key={entry.id} className="rounded-lg border border-stone-700 p-3">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span
                    className={`rounded px-2 py-0.5 text-xs font-medium ${
                      entry.source === 'transition'
                        ? 'bg-blue-950 text-blue-300'
                        : 'bg-stone-800 text-stone-300'
                    }`}
                  >
                    {entry.source === 'transition' ? 'Transition' : 'Mutation'}
                  </span>
                  <span
                    className={`rounded px-2 py-0.5 text-xs font-medium ${
                      entry.actorType === 'system'
                        ? 'bg-amber-950 text-amber-300'
                        : 'bg-emerald-950 text-emerald-300'
                    }`}
                  >
                    {entry.actorType === 'system' ? 'System' : entry.actorLabel}
                  </span>
                </div>
                <span className="text-xs text-stone-500">{formatTimestamp(entry.timestamp)}</span>
              </div>

              <p className="mt-2 text-sm text-stone-100">{entry.summary}</p>

              {entry.fieldDiffs.length > 0 && (
                <div className="mt-3 overflow-hidden rounded border border-stone-800">
                  <table className="w-full text-xs">
                    <thead className="bg-stone-800">
                      <tr>
                        <th className="px-2 py-1 text-left text-stone-400">Field</th>
                        <th className="px-2 py-1 text-left text-stone-400">Before</th>
                        <th className="px-2 py-1 text-left text-stone-400">After</th>
                      </tr>
                    </thead>
                    <tbody>
                      {entry.fieldDiffs.map((diff) => (
                        <tr key={`${entry.id}-${diff.field}`} className="border-t border-stone-800">
                          <td className="px-2 py-1.5 text-stone-300">{diff.field}</td>
                          <td className="px-2 py-1.5 text-amber-300">{diff.before}</td>
                          <td className="px-2 py-1.5 text-emerald-300">{diff.after}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </Card>
  )
}
