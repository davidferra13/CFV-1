'use client'

import { useState, type ReactNode } from 'react'
import { ExplorePanel } from './explore-panel'

type Props = {
  children: ReactNode
  mode: 'tips' | 'notes'
  myLabel?: string
}

export function KnowledgeTabs({ children, mode, myLabel = 'My Tips' }: Props) {
  const [tab, setTab] = useState<'mine' | 'explore'>('mine')

  return (
    <div>
      <div className="mb-4 flex border-b border-stone-700">
        <button
          type="button"
          onClick={() => setTab('mine')}
          className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
            tab === 'mine'
              ? 'border-amber-500 text-amber-300'
              : 'border-transparent text-stone-500 hover:text-stone-400'
          }`}
        >
          {myLabel}
        </button>
        <button
          type="button"
          onClick={() => setTab('explore')}
          className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
            tab === 'explore'
              ? 'border-amber-500 text-amber-300'
              : 'border-transparent text-stone-500 hover:text-stone-400'
          }`}
        >
          Explore
        </button>
      </div>

      {tab === 'mine' ? children : <ExplorePanel mode={mode} />}
    </div>
  )
}
