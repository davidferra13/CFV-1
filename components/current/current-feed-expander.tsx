'use client'

import { useState } from 'react'
import { CurrentUnitCard } from './current-unit-card'
import type { CurrentUnit } from '@/lib/current/types'

export function CurrentFeedExpander({
  units,
  startRank,
}: {
  units: CurrentUnit[]
  startRank: number
}) {
  const [expanded, setExpanded] = useState(false)

  if (units.length === 0) return null

  return (
    <>
      {expanded && (
        <div className="divide-y divide-stone-700/20">
          {units.map((unit, i) => (
            <CurrentUnitCard key={unit.id} unit={unit} rank={startRank + i} />
          ))}
        </div>
      )}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full py-2 text-xs text-stone-400 hover:text-stone-300 hover:bg-stone-800/50 transition-colors"
      >
        {expanded ? 'Show less' : `Show more (${units.length} items)`}
      </button>
    </>
  )
}
