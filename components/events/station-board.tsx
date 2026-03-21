'use client'

// Station Board - Visual board showing collaborators assigned to kitchen stations.
// Used on multi-chef event detail pages.

import { useEffect, useState, useTransition } from 'react'
import { Badge } from '@/components/ui/badge'
import { getEventCollaboratorsWithStations } from '@/lib/collaboration/settlement-actions'

interface StationBoardProps {
  eventId: string
  className?: string
}

export function StationBoard({ eventId, className = '' }: StationBoardProps) {
  const [isPending, startTransition] = useTransition()
  const [data, setData] = useState<Awaited<
    ReturnType<typeof getEventCollaboratorsWithStations>
  > | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    startTransition(async () => {
      try {
        const result = await getEventCollaboratorsWithStations(eventId)
        setData(result)
      } catch (err) {
        console.error('[StationBoard] Load failed:', err)
        setError('Could not load station assignments')
      }
    })
  }, [eventId])

  if (error) {
    return (
      <div className={`rounded-lg border border-red-500/30 bg-red-500/10 p-3 ${className}`}>
        <p className="text-xs text-red-300">{error}</p>
      </div>
    )
  }

  if (isPending && !data) {
    return (
      <div className={`rounded-lg border border-stone-700 bg-stone-800/50 p-4 ${className}`}>
        <div className="animate-pulse space-y-2">
          <div className="h-4 bg-stone-700 rounded w-1/3" />
          <div className="h-12 bg-stone-700 rounded" />
          <div className="h-12 bg-stone-700 rounded" />
        </div>
      </div>
    )
  }

  if (!data) return null

  const stationNames = Object.keys(data.stations)
  const hasStations = stationNames.length > 0
  const hasUnassigned = data.unassigned.length > 0

  if (!hasStations && !hasUnassigned) return null

  // Station color palette
  const stationColors = [
    'border-brand-500/30 bg-brand-500/5',
    'border-purple-500/30 bg-purple-500/5',
    'border-emerald-500/30 bg-emerald-500/5',
    'border-amber-500/30 bg-amber-500/5',
    'border-rose-500/30 bg-rose-500/5',
    'border-brand-500/30 bg-brand-500/5',
  ]

  return (
    <div className={`space-y-3 ${className}`}>
      <h3 className="text-sm font-medium text-stone-200">Kitchen Stations</h3>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {stationNames.map((station, i) => (
          <div
            key={station}
            className={`rounded-lg border p-3 ${stationColors[i % stationColors.length]}`}
          >
            <h4 className="text-xs font-medium text-stone-300 uppercase tracking-wider mb-2">
              {station}
            </h4>
            <div className="space-y-1.5">
              {data.stations[station].map((person) => (
                <div key={person.chefId} className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-stone-700 flex items-center justify-center text-xxs text-stone-300 font-medium">
                    {person.chefName.charAt(0).toUpperCase()}
                  </div>
                  <span className="text-xs text-stone-300">{person.chefName}</span>
                  <Badge variant="default">{person.role.replace(/_/g, ' ')}</Badge>
                </div>
              ))}
            </div>
          </div>
        ))}

        {/* Unassigned */}
        {hasUnassigned && (
          <div className="rounded-lg border border-stone-700 bg-stone-800/30 p-3">
            <h4 className="text-xs font-medium text-stone-500 uppercase tracking-wider mb-2">
              Unassigned
            </h4>
            <div className="space-y-1.5">
              {data.unassigned.map((person) => (
                <div key={person.chefId} className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-stone-700 flex items-center justify-center text-xxs text-stone-300 font-medium">
                    {person.chefName.charAt(0).toUpperCase()}
                  </div>
                  <span className="text-xs text-stone-400">{person.chefName}</span>
                  <Badge variant="default">{person.role.replace(/_/g, ' ')}</Badge>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
