'use client'

// Availability Checklist
// Lets the chef track which platforms they have updated after a new booking.
// State persists in localStorage so it survives page refreshes.
// The chef resets the list when they start a new blocking session.

import { useEffect, useState } from 'react'
import { ExternalLink, Check } from '@/components/ui/icons'

interface Platform {
  key: string
  label: string
  url: string
  note: string
}

interface AvailabilityChecklistProps {
  platforms: Platform[]
}

const STORAGE_KEY = 'cf_availability_checklist'

export function AvailabilityChecklist({ platforms }: AvailabilityChecklistProps) {
  const [checked, setChecked] = useState<Record<string, boolean>>({})
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) setChecked(JSON.parse(stored))
    } catch {
      // ignore
    }
    setMounted(true)
  }, [])

  const toggle = (key: string) => {
    setChecked((prev) => {
      const next = { ...prev, [key]: !prev[key] }
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
      } catch {
        // ignore
      }
      return next
    })
  }

  const resetAll = () => {
    setChecked({})
    try {
      localStorage.removeItem(STORAGE_KEY)
    } catch {
      // ignore
    }
  }

  const doneCount = Object.values(checked).filter(Boolean).length

  if (!mounted) {
    return <div className="h-32 animate-pulse rounded-lg bg-stone-900" />
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-stone-400">
          {doneCount} of {platforms.length} platforms updated
        </p>
        {doneCount > 0 && (
          <button
            onClick={resetAll}
            className="text-xs text-stone-500 underline underline-offset-2 hover:text-stone-300"
          >
            Reset checklist
          </button>
        )}
      </div>

      <div className="space-y-2">
        {platforms.map((platform) => {
          const isDone = checked[platform.key] ?? false
          return (
            <div
              key={platform.key}
              className={`flex items-center justify-between rounded-lg border px-4 py-3 transition-colors ${
                isDone
                  ? 'border-emerald-800/60 bg-emerald-950/30'
                  : 'border-stone-800 bg-stone-900/60'
              }`}
            >
              <div className="flex items-center gap-3">
                <button
                  onClick={() => toggle(platform.key)}
                  className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border transition-colors ${
                    isDone
                      ? 'border-emerald-500 bg-emerald-600 text-white'
                      : 'border-stone-600 bg-stone-800 hover:border-stone-400'
                  }`}
                  aria-label={isDone ? `Uncheck ${platform.label}` : `Check ${platform.label}`}
                >
                  {isDone && <Check className="h-3 w-3" />}
                </button>
                <div>
                  <p
                    className={`font-medium ${isDone ? 'text-stone-400 line-through' : 'text-stone-100'}`}
                  >
                    {platform.label}
                  </p>
                  <p className="text-xs text-stone-500">{platform.note}</p>
                </div>
              </div>
              <a
                href={platform.url}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => {
                  // Auto-check after clicking the link
                  if (!checked[platform.key]) toggle(platform.key)
                }}
                className="inline-flex items-center gap-1.5 rounded-lg border border-stone-700 bg-stone-900 px-3 py-1.5 text-sm font-medium text-stone-200 transition-colors hover:border-stone-600 hover:bg-stone-800"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                Open
              </a>
            </div>
          )
        })}
      </div>

      {doneCount === platforms.length && platforms.length > 0 && (
        <div className="rounded-lg border border-emerald-800/50 bg-emerald-950/40 px-4 py-3 text-sm text-emerald-300">
          All platforms updated. You are fully in sync.
        </div>
      )}
    </div>
  )
}
