'use client'

// 86 Banner - Shows all currently 86'd items across ALL stations
// Prominent red banner displayed at the top of the stations page.

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { unmark86 } from '@/lib/stations/clipboard-actions'

type EightySixedItem = {
  id: string
  eighty_sixed_at: string | null
  stations?: {
    id: string
    name: string
  }
  station_components?: {
    id: string
    name: string
    unit: string
  }
}

type Props = {
  items: EightySixedItem[]
}

export function EightySixBanner({ items }: Props) {
  const router = useRouter()
  const [restoring, setRestoring] = useState<string | null>(null)

  async function handleUnmark(entryId: string) {
    setRestoring(entryId)
    try {
      await unmark86(entryId)
      router.refresh()
    } catch (err) {
      console.error('[EightySixBanner] Unmark error:', err)
    } finally {
      setRestoring(null)
    }
  }

  if (items.length === 0) return null

  return (
    <div className="rounded-lg border-2 border-red-800 bg-red-950/40 px-4 py-3">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-red-400 font-bold text-sm uppercase tracking-wider">86'd Items</span>
        <span className="text-red-500/70 text-xs">
          ({items.length} item{items.length !== 1 ? 's' : ''} unavailable)
        </span>
      </div>
      <div className="flex flex-wrap gap-2">
        {items.map((item) => (
          <div
            key={item.id}
            className="flex items-center gap-2 bg-red-900/40 rounded-lg px-3 py-1.5"
          >
            <span className="text-sm text-red-200 font-medium">
              {item.station_components?.name ?? 'Unknown'}
            </span>
            {item.stations?.name && (
              <span className="text-xs text-red-400/70">@ {item.stations.name}</span>
            )}
            {item.eighty_sixed_at && (
              <span className="text-xs text-red-500/60">
                since{' '}
                {new Date(item.eighty_sixed_at).toLocaleTimeString('en-US', {
                  hour: 'numeric',
                  minute: '2-digit',
                  hour12: true,
                })}
              </span>
            )}
            <button
              onClick={() => handleUnmark(item.id)}
              disabled={restoring === item.id}
              className="text-xs text-red-300 hover:text-white bg-red-800/60 hover:bg-red-700 rounded px-2 py-0.5 transition-colors disabled:opacity-50"
            >
              {restoring === item.id ? '...' : 'Restore'}
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
