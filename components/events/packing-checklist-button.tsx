'use client'

import { useState, useTransition } from 'react'
import {
  generatePackingChecklist,
  getEventChecklist,
  type PackingChecklist,
  type PackingChecklistItem,
} from '@/lib/equipment/packing-actions'
import PackingChecklistView from '@/components/equipment/packing-checklist'

interface PackingChecklistButtonProps {
  eventId: string
  existingChecklist?: (PackingChecklist & { items: PackingChecklistItem[] }) | null
}

export default function PackingChecklistButton({ eventId, existingChecklist }: PackingChecklistButtonProps) {
  const [checklist, setChecklist] = useState<(PackingChecklist & { items: PackingChecklistItem[] }) | null>(
    existingChecklist ?? null
  )
  const [showChecklist, setShowChecklist] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const packedCount = checklist?.items.filter((i) => i.is_packed).length ?? 0
  const totalCount = checklist?.items.length ?? 0

  const handleGenerateOrOpen = () => {
    if (checklist) {
      setShowChecklist(!showChecklist)
      return
    }

    setError(null)
    startTransition(async () => {
      try {
        const result = await generatePackingChecklist(eventId)
        setChecklist(result)
        setShowChecklist(true)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to generate checklist')
      }
    })
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <button
          onClick={handleGenerateOrOpen}
          disabled={isPending}
          className="inline-flex items-center gap-2 rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
          </svg>
          {isPending
            ? 'Generating...'
            : checklist
              ? (showChecklist ? 'Hide Packing List' : 'Show Packing List')
              : 'Generate Packing List'
          }
        </button>

        {checklist && totalCount > 0 && (
          <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
            packedCount === totalCount
              ? 'bg-green-100 text-green-800'
              : packedCount > 0
                ? 'bg-orange-100 text-orange-800'
                : 'bg-gray-100 text-gray-700'
          }`}>
            {packedCount}/{totalCount} packed
          </span>
        )}
      </div>

      {error && (
        <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</div>
      )}

      {showChecklist && checklist && (
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <PackingChecklistView checklist={checklist} showReturnColumn />
        </div>
      )}
    </div>
  )
}
