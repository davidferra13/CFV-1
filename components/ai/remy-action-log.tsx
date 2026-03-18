'use client'

import { useState, useEffect, useCallback } from 'react'
import { getActionLog } from '@/lib/ai/remy-local-storage'
import type { ActionLogEntry } from '@/lib/ai/remy-types'
import { Activity, CheckCircle, XCircle } from '@/components/ui/icons'

interface RemyActionLogProps {
  onSelectConversation: (id: string) => void
}

export function RemyActionLog({ onSelectConversation }: RemyActionLogProps) {
  const [entries, setEntries] = useState<ActionLogEntry[]>([])
  const [loading, setLoading] = useState(true)

  const loadEntries = useCallback(async () => {
    try {
      const data = await getActionLog(200)
      setEntries(data)
    } catch {
      setEntries([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadEntries()
  }, [loadEntries])

  // Group entries by date
  const grouped = groupByDate(entries)

  if (loading) {
    return <div className="text-center py-8 text-gray-500 text-sm">Loading...</div>
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-white/10">
        <Activity className="w-4 h-4 text-gray-400" />
        <span className="text-sm font-medium text-gray-200">Action Log</span>
        <span className="text-xxs text-gray-500 ml-auto">{entries.length} actions</span>
      </div>

      {/* Scrollable List */}
      <div className="flex-1 overflow-y-auto px-1 py-1">
        {entries.length === 0 && (
          <div className="text-center py-8 text-gray-500 text-sm">
            No actions yet. Ask Remy to do something!
          </div>
        )}

        {grouped.map(({ label, entries: dayEntries }) => (
          <div key={label} className="mb-3">
            <div className="px-2 py-1 text-xxs font-semibold uppercase tracking-wider text-gray-500 sticky top-0 bg-[var(--bg-secondary,#1a1a2e)]">
              {label}
            </div>
            {dayEntries.map((entry) => (
              <button
                key={entry.id}
                onClick={() => onSelectConversation(entry.conversationId)}
                className="w-full text-left px-3 py-1.5 rounded-lg hover:bg-white/5 transition-colors flex items-center gap-2 group"
              >
                {entry.status === 'success' ? (
                  <CheckCircle className="w-3.5 h-3.5 text-green-400 shrink-0" />
                ) : (
                  <XCircle className="w-3.5 h-3.5 text-red-400 shrink-0" />
                )}
                <span className="font-mono text-xs text-gray-300 truncate flex-1">
                  {entry.action}
                </span>
                <span className="text-xxs text-gray-500 shrink-0">
                  {new Date(entry.createdAt).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
                {entry.duration > 0 && (
                  <span className="text-xxs text-gray-600 shrink-0">{entry.duration}ms</span>
                )}
              </button>
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}

function groupByDate(entries: ActionLogEntry[]): { label: string; entries: ActionLogEntry[] }[] {
  const groups = new Map<string, ActionLogEntry[]>()

  for (const entry of entries) {
    const date = new Date(entry.createdAt)
    const today = new Date()
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)

    let label: string
    if (date.toDateString() === today.toDateString()) {
      label = 'Today'
    } else if (date.toDateString() === yesterday.toDateString()) {
      label = 'Yesterday'
    } else {
      label = date.toLocaleDateString(undefined, {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
      })
    }

    if (!groups.has(label)) groups.set(label, [])
    groups.get(label)!.push(entry)
  }

  return [...groups.entries()].map(([label, entries]) => ({ label, entries }))
}
