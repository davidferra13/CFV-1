'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import type { EventConflict } from '@/lib/events/conflict-detection'

type ConflictBadgeProps = {
  conflicts: EventConflict[]
  className?: string
}

export function ConflictBadge({ conflicts, className = '' }: ConflictBadgeProps) {
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  // Close dropdown on outside click
  useEffect(() => {
    if (!open) return
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  if (conflicts.length === 0) return null

  const sameDayCount = conflicts.filter((c) => c.type === 'same_day').length
  const backToBackCount = conflicts.filter((c) => c.type === 'back_to_back').length

  return (
    <div ref={containerRef} className={`relative inline-block ${className}`}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={`
          inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium
          ring-1 ring-inset bg-amber-950 text-amber-400 ring-amber-800
          cursor-pointer hover:brightness-110 transition-all
        `}
        title={`${conflicts.length} scheduling conflict${conflicts.length !== 1 ? 's' : ''}`}
      >
        <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
        {conflicts.length} conflict{conflicts.length !== 1 ? 's' : ''}
        <svg
          className={`w-3 h-3 transition-transform ${open ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div
          className={`
            absolute z-50 top-full right-0 mt-1.5 w-80 rounded-lg border
            border-stone-700 bg-stone-900 shadow-xl p-3
          `}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-amber-400">Scheduling Conflicts</span>
            <div className="flex gap-2 text-[10px] text-stone-500">
              {sameDayCount > 0 && <span>{sameDayCount} same-day</span>}
              {backToBackCount > 0 && <span>{backToBackCount} back-to-back</span>}
            </div>
          </div>

          <div className="space-y-2 max-h-64 overflow-y-auto">
            {conflicts.map((conflict, i) => (
              <div
                key={`${conflict.eventA.id}-${conflict.eventB.id}-${conflict.type}`}
                className={`
                  rounded-md border p-2
                  ${
                    conflict.type === 'same_day'
                      ? 'border-amber-800/50 bg-amber-950/30'
                      : 'border-stone-700/50 bg-stone-800/30'
                  }
                `}
              >
                <div className="flex items-center gap-1.5 mb-1.5">
                  <span
                    className={`
                      inline-block px-1.5 py-0.5 rounded text-[10px] font-medium
                      ${
                        conflict.type === 'same_day'
                          ? 'bg-amber-900 text-amber-300'
                          : 'bg-stone-700 text-stone-300'
                      }
                    `}
                  >
                    {conflict.type === 'same_day' ? 'Same Day' : 'Back-to-Back'}
                  </span>
                </div>

                <div className="flex items-center gap-1 text-xs">
                  <Link
                    href={`/events/${conflict.eventA.id}`}
                    className="text-brand-400 hover:text-brand-300 hover:underline truncate max-w-[130px]"
                    onClick={() => setOpen(false)}
                  >
                    {conflict.eventA.occasion || 'Untitled'}
                  </Link>
                  <span className="text-stone-600 shrink-0">&</span>
                  <Link
                    href={`/events/${conflict.eventB.id}`}
                    className="text-brand-400 hover:text-brand-300 hover:underline truncate max-w-[130px]"
                    onClick={() => setOpen(false)}
                  >
                    {conflict.eventB.occasion || 'Untitled'}
                  </Link>
                </div>

                <p className="text-[10px] text-stone-500 mt-1">{conflict.message}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
