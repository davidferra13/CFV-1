'use client'

import { useState } from 'react'
import type { AgreementItem, ItemCategory, ItemAssignment } from '@/lib/hub/agreement-types'
import { CATEGORY_LABELS, ASSIGNMENT_LABELS } from '@/lib/hub/agreement-types'

interface AgreementChecklistSectionProps {
  category: ItemCategory
  items: AgreementItem[]
  onAssignmentChange: (itemId: string, assignment: ItemAssignment) => void
  onNotesChange: (itemId: string, notes: string) => void
  onStatusChange?: (itemId: string, status: AgreementItem['status']) => void
  readOnly?: boolean
  showStatus?: boolean
}

const ASSIGNMENT_OPTIONS: ItemAssignment[] = ['chef', 'venue', 'shared', 'na']

export function AgreementChecklistSection({
  category,
  items,
  onAssignmentChange,
  onNotesChange,
  onStatusChange,
  readOnly,
  showStatus,
}: AgreementChecklistSectionProps) {
  const [expandedNotes, setExpandedNotes] = useState<Set<string>>(new Set())

  const toggleNotes = (itemId: string) => {
    setExpandedNotes((prev) => {
      const next = new Set(prev)
      if (next.has(itemId)) next.delete(itemId)
      else next.add(itemId)
      return next
    })
  }

  return (
    <div className="space-y-1">
      <h3 className="mb-2 text-sm font-semibold text-stone-200">{CATEGORY_LABELS[category]}</h3>

      {items.map((item) => (
        <div
          key={item.id}
          className={`rounded-lg border px-3 py-2 ${
            item.addedAfterSigning
              ? 'border-amber-700/50 bg-amber-900/10'
              : 'border-stone-700/50 bg-stone-800/30'
          }`}
        >
          <div className="flex items-center justify-between gap-2">
            {/* Status checkbox (execution mode) */}
            {showStatus && onStatusChange && (
              <button
                onClick={() =>
                  !readOnly &&
                  onStatusChange(item.id, item.status === 'done' ? 'not_started' : 'done')
                }
                className={`h-4 w-4 shrink-0 rounded border ${
                  item.status === 'done'
                    ? 'border-green-500 bg-green-500'
                    : 'border-stone-600 bg-stone-800'
                }`}
              />
            )}

            {/* Title */}
            <span
              className={`flex-1 text-sm ${
                item.status === 'done' ? 'text-stone-500 line-through' : 'text-stone-200'
              }`}
            >
              {item.title}
              {item.addedAfterSigning && (
                <span className="ml-2 text-xs text-amber-400">(added after signing)</span>
              )}
            </span>

            {/* Assignment toggle */}
            <div className="flex gap-1">
              {ASSIGNMENT_OPTIONS.map((opt) => (
                <button
                  key={opt}
                  onClick={() => !readOnly && onAssignmentChange(item.id, opt)}
                  disabled={readOnly}
                  className={`rounded px-2 py-0.5 text-xs transition-colors ${
                    item.assignment === opt
                      ? opt === 'chef'
                        ? 'bg-blue-500/20 text-blue-300'
                        : opt === 'venue'
                          ? 'bg-green-500/20 text-green-300'
                          : opt === 'shared'
                            ? 'bg-purple-500/20 text-purple-300'
                            : 'bg-stone-600/30 text-stone-500'
                      : 'text-stone-500 hover:bg-stone-700/50'
                  } ${readOnly ? 'cursor-not-allowed' : ''}`}
                >
                  {ASSIGNMENT_LABELS[opt]}
                </button>
              ))}
            </div>

            {/* Notes toggle */}
            <button
              onClick={() => toggleNotes(item.id)}
              className="text-stone-500 hover:text-stone-300"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                />
              </svg>
            </button>
          </div>

          {/* Expandable notes */}
          {expandedNotes.has(item.id) && (
            <textarea
              value={item.notes || ''}
              onChange={(e) => !readOnly && onNotesChange(item.id, e.target.value)}
              placeholder="Add notes (equipment details, specific instructions, etc.)"
              disabled={readOnly}
              className="mt-2 w-full rounded border border-stone-700 bg-stone-900/50 px-2 py-1.5 text-xs text-stone-300 placeholder-stone-600"
              rows={2}
            />
          )}
        </div>
      ))}
    </div>
  )
}
