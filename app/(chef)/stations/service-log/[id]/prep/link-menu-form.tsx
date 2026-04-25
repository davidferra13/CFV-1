'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { linkMenuToServiceDay } from '@/lib/prep/prep-sheet-actions'

export function LinkMenuForm({
  serviceDayId,
  menus,
}: {
  serviceDayId: string
  menus: Array<{ id: string; name: string }>
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [selectedMenuId, setSelectedMenuId] = useState('')
  const [error, setError] = useState<string | null>(null)

  function handleLink() {
    if (!selectedMenuId) return
    setError(null)
    startTransition(async () => {
      try {
        const result = await linkMenuToServiceDay(serviceDayId, selectedMenuId)
        if (result.success) {
          setSelectedMenuId('')
          router.refresh()
        } else {
          setError(result.error || 'Failed to link menu')
        }
      } catch {
        setError('Unexpected error')
      }
    })
  }

  return (
    <div className="flex items-center gap-2">
      <select
        value={selectedMenuId}
        onChange={(e) => setSelectedMenuId(e.target.value)}
        className="bg-stone-800 border border-stone-700 text-stone-100 rounded-lg px-3 py-2 text-sm flex-1"
      >
        <option value="">Select a menu to link...</option>
        {menus.map((m) => (
          <option key={m.id} value={m.id}>
            {m.name}
          </option>
        ))}
      </select>
      <button
        onClick={handleLink}
        disabled={isPending || !selectedMenuId}
        className="rounded-lg bg-amber-600 text-white px-3 py-2 text-sm font-medium hover:bg-amber-500 transition-colors disabled:opacity-50"
      >
        {isPending ? 'Linking...' : 'Link'}
      </button>
      {error && <span className="text-red-400 text-xs">{error}</span>}
    </div>
  )
}
