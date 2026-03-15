'use client'

import { type CurrentLocationResult } from '@/lib/scheduling/seasonal-availability-actions'

// Color mapping by common season keywords
const SEASON_COLORS: Record<string, { bg: string; text: string; dot: string }> = {
  summer: { bg: 'bg-amber-50', text: 'text-amber-700', dot: 'bg-amber-500' },
  winter: { bg: 'bg-sky-50', text: 'text-sky-700', dot: 'bg-sky-500' },
  spring: { bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-500' },
  fall: { bg: 'bg-orange-50', text: 'text-orange-700', dot: 'bg-orange-500' },
  autumn: { bg: 'bg-orange-50', text: 'text-orange-700', dot: 'bg-orange-500' },
  ski: { bg: 'bg-sky-50', text: 'text-sky-700', dot: 'bg-sky-500' },
  beach: { bg: 'bg-cyan-50', text: 'text-cyan-700', dot: 'bg-cyan-500' },
}

const DEFAULT_COLOR = { bg: 'bg-stone-50', text: 'text-stone-700', dot: 'bg-stone-500' }

function getSeasonColor(seasonName: string | null) {
  if (!seasonName) return DEFAULT_COLOR
  const lower = seasonName.toLowerCase()
  for (const [keyword, color] of Object.entries(SEASON_COLORS)) {
    if (lower.includes(keyword)) return color
  }
  return DEFAULT_COLOR
}

type Props = {
  location: CurrentLocationResult
  className?: string
}

export function CurrentLocationBadge({ location, className = '' }: Props) {
  if (!location.location) {
    return (
      <div
        className={`inline-flex items-center gap-1.5 rounded-full border border-stone-200 bg-stone-50 px-3 py-1 text-xs text-stone-500 ${className}`}
      >
        <span className="h-2 w-2 rounded-full bg-stone-300" />
        No season set
      </div>
    )
  }

  const color = getSeasonColor(location.season_name)

  return (
    <div
      className={`inline-flex items-center gap-1.5 rounded-full border border-stone-200 ${color.bg} px-3 py-1 text-xs ${color.text} ${className}`}
    >
      <span className={`h-2 w-2 rounded-full ${color.dot}`} />
      <span className="font-medium">{location.location}</span>
      {location.season_name && <span className="text-stone-400">({location.season_name})</span>}
      {!location.is_available && <span className="text-red-500 font-medium ml-1">Unavailable</span>}
      {location.travel_radius_miles && (
        <span className="text-stone-400 ml-1">{location.travel_radius_miles}mi</span>
      )}
    </div>
  )
}
