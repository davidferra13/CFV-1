'use client'

import type { AuditChange } from '@/lib/audit-trail/surface-actions'

type ChangeDiffProps = {
  changes: AuditChange[]
  compact?: boolean
}

export function ChangeDiff({ changes, compact = false }: ChangeDiffProps) {
  if (changes.length === 0) return null

  if (compact) {
    return (
      <div className="flex flex-wrap gap-1.5 mt-1">
        {changes.slice(0, 3).map((change, i) => (
          <span
            key={`${change.field}-${i}`}
            className="text-xs px-1.5 py-0.5 rounded bg-stone-800 text-stone-400"
          >
            {change.field}
          </span>
        ))}
        {changes.length > 3 && (
          <span className="text-xs text-stone-500">
            +{changes.length - 3} more
          </span>
        )}
      </div>
    )
  }

  return (
    <div className="mt-2 overflow-hidden rounded border border-stone-800">
      <table className="w-full text-xs">
        <thead className="bg-stone-800/80">
          <tr>
            <th className="px-3 py-1.5 text-left text-stone-400 font-medium">Field</th>
            <th className="px-3 py-1.5 text-left text-stone-400 font-medium">Before</th>
            <th className="px-3 py-1.5 text-left text-stone-400 font-medium">After</th>
          </tr>
        </thead>
        <tbody>
          {changes.map((change, i) => (
            <tr
              key={`${change.field}-${i}`}
              className="border-t border-stone-800/50"
            >
              <td className="px-3 py-2 text-stone-300 font-medium">
                {change.field}
              </td>
              <td className="px-3 py-2">
                {change.oldValue ? (
                  <span className="text-red-400 bg-red-950/30 px-1.5 py-0.5 rounded">
                    {change.oldValue}
                  </span>
                ) : (
                  <span className="text-stone-600">(none)</span>
                )}
              </td>
              <td className="px-3 py-2">
                {change.newValue ? (
                  <span className="text-emerald-400 bg-emerald-950/30 px-1.5 py-0.5 rounded">
                    {change.newValue}
                  </span>
                ) : (
                  <span className="text-stone-600">(none)</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
