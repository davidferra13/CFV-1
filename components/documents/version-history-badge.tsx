'use client'

import { useState, useRef, useEffect } from 'react'
import { format } from 'date-fns'

type VersionEntry = {
  id: string
  versionNumber: number
  generatedAt: string
}

type Props = {
  currentVersion: number
  totalVersions: number
  versions: VersionEntry[]
}

export function VersionHistoryBadge({ currentVersion, totalVersions, versions }: Props) {
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [open])

  if (totalVersions <= 1) return null

  const sorted = [...versions].sort((a, b) => b.versionNumber - a.versionNumber)

  return (
    <div ref={containerRef} className="relative inline-block">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-amber-900/40 text-amber-400 border border-amber-700/50 hover:bg-amber-900/60 transition-colors cursor-pointer"
      >
        v{currentVersion} ({totalVersions} versions)
      </button>
      {open && (
        <div className="absolute z-50 top-full mt-1 left-0 min-w-[220px] rounded-lg border border-stone-700 bg-stone-900 shadow-lg p-2 space-y-1">
          <p className="text-[10px] uppercase tracking-wide text-stone-500 px-1 mb-1">
            All versions
          </p>
          {sorted.map((v) => {
            const dateStr = (() => {
              const parsed = new Date(v.generatedAt)
              if (Number.isNaN(parsed.getTime())) return 'Unknown date'
              return format(parsed, 'MMM d, yyyy h:mm a')
            })()
            return (
              <a
                key={v.id}
                href={`/api/documents/snapshots/${v.id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between gap-2 rounded px-2 py-1.5 text-xs text-stone-300 hover:bg-stone-800 transition-colors"
              >
                <span className="font-medium">v{v.versionNumber}</span>
                <span className="text-stone-500 text-[10px]">{dateStr}</span>
              </a>
            )
          })}
        </div>
      )}
    </div>
  )
}
