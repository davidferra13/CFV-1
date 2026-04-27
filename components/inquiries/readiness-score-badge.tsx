'use client'

import { useState } from 'react'
import type { ReadinessScore } from '@/lib/inquiries/types'

const LEVEL_STYLES = {
  ready: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300',
  almost: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300',
  partial: 'bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300',
  minimal: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300',
} as const

export function ReadinessScoreBadge({ score }: { score: ReadinessScore }) {
  const [showPopover, setShowPopover] = useState(false)

  return (
    <span className="relative inline-block">
      <button
        type="button"
        className={`inline-flex items-center rounded-full px-1.5 py-0.5 text-xxs font-medium ${LEVEL_STYLES[score.level]}`}
        onMouseEnter={() => setShowPopover(true)}
        onMouseLeave={() => setShowPopover(false)}
        onClick={(e) => {
          e.preventDefault()
          e.stopPropagation()
          setShowPopover((prev) => !prev)
        }}
        title={`Data readiness: ${score.percent}%`}
      >
        {score.percent}%
      </button>

      {showPopover && (
        <div
          className="absolute left-0 top-full z-50 mt-1 w-56 rounded-lg border border-border bg-card p-3 shadow-lg"
          onMouseEnter={() => setShowPopover(true)}
          onMouseLeave={() => setShowPopover(false)}
        >
          <p className="text-xs font-medium text-foreground mb-2">
            Data Readiness: {score.score}/{score.total}
          </p>

          {score.filled.length > 0 && (
            <div className="mb-2">
              <p className="text-xxs text-muted-foreground uppercase tracking-wide mb-1">Filled</p>
              {score.filled.map((f) => (
                <div key={f} className="flex items-center gap-1.5 text-xs text-foreground">
                  <svg
                    className="h-3 w-3 text-emerald-500 shrink-0"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                  {f}
                </div>
              ))}
            </div>
          )}

          {score.missing.length > 0 && (
            <div>
              <p className="text-xxs text-muted-foreground uppercase tracking-wide mb-1">Missing</p>
              {score.missing.map((m) => (
                <div key={m} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <svg
                    className="h-3 w-3 text-red-400 shrink-0"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                  {m}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </span>
  )
}
