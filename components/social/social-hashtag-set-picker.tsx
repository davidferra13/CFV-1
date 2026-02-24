'use client'

import { useState } from 'react'
import { ChevronDown, BookMarked } from 'lucide-react'
import type { SocialHashtagSet } from '@/lib/social/hashtag-actions'

type Props = {
  sets: SocialHashtagSet[]
  onInsert: (hashtags: string[]) => void
}

export function SocialHashtagSetPicker({ sets, onInsert }: Props) {
  const [open, setOpen] = useState(false)

  if (sets.length === 0) return null

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 text-xs text-stone-500 hover:text-stone-300 border border-stone-700 rounded px-2 py-1 bg-stone-900 hover:bg-stone-800 transition-colors"
      >
        <BookMarked className="w-3 h-3" />
        Insert hashtag set
        <ChevronDown className="w-3 h-3" />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-full mt-1 z-20 bg-stone-900 border border-stone-700 rounded-lg shadow-lg w-64 max-h-48 overflow-y-auto">
            {sets.map((set) => (
              <button
                key={set.id}
                type="button"
                className="w-full text-left px-3 py-2 text-sm hover:bg-stone-800 border-b border-stone-800 last:border-0"
                onClick={() => {
                  onInsert(set.hashtags)
                  setOpen(false)
                }}
              >
                <div className="font-medium text-stone-200">{set.set_name}</div>
                <div className="text-xs text-stone-400 mt-0.5 truncate">
                  {set.hashtags
                    .slice(0, 5)
                    .map((h) => `#${h}`)
                    .join(' ')}
                  {set.hashtags.length > 5 && ` +${set.hashtags.length - 5}`}
                </div>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
