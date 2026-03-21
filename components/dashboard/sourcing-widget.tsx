'use client'

import { useEffect, useState, useTransition } from 'react'
import Link from 'next/link'
import {
  getSourcingScorecard,
  getSourcingStats,
  type Scorecard,
} from '@/lib/sustainability/sourcing-actions'

const GRADE_BG: Record<string, string> = {
  A: 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400',
  B: 'bg-brand-50 text-brand-700 dark:bg-brand-900/20 dark:text-brand-400',
  C: 'bg-yellow-50 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-400',
  D: 'bg-orange-50 text-orange-700 dark:bg-orange-900/20 dark:text-orange-400',
  F: 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400',
}

export function SourcingWidget() {
  const [scorecard, setScorecard] = useState<Scorecard | null>(null)
  const [localPercent, setLocalPercent] = useState(0)
  const [totalEntries, setTotalEntries] = useState(0)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  useEffect(() => {
    startTransition(async () => {
      try {
        const [sc, stats] = await Promise.all([getSourcingScorecard(), getSourcingStats()])
        setScorecard(sc)
        setLocalPercent(stats.localPercent)
        setTotalEntries(stats.totalEntries)
      } catch (err) {
        setLoadError(err instanceof Error ? err.message : 'Failed to load')
      }
    })
  }, [])

  if (loadError) {
    return (
      <div className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-800">
        <div className="text-xs text-red-500">Could not load sourcing data</div>
      </div>
    )
  }

  if (isPending || !scorecard) {
    return <div className="h-28 animate-pulse rounded-lg bg-zinc-100 dark:bg-zinc-800" />
  }

  if (totalEntries === 0) {
    return (
      <Link
        href="/culinary/sourcing"
        className="block rounded-lg border border-dashed border-zinc-300 bg-white p-4 text-center transition hover:border-green-400 dark:border-zinc-600 dark:bg-zinc-800"
      >
        <div className="text-sm font-medium text-zinc-600 dark:text-zinc-400">Quality Sourcing</div>
        <div className="mt-1 text-xs text-zinc-400 dark:text-zinc-500">
          Start tracking where your ingredients come from
        </div>
      </Link>
    )
  }

  return (
    <Link
      href="/culinary/sourcing"
      className="block rounded-lg border border-zinc-200 bg-white p-4 transition hover:shadow-sm dark:border-zinc-700 dark:bg-zinc-800"
    >
      <div className="flex items-center justify-between">
        <div>
          <div className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
            Quality Sourcing
          </div>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
              {localPercent}% Local
            </span>
            <span className="text-xs text-zinc-500">{totalEntries} entries</span>
          </div>
        </div>
        <div
          className={`flex h-12 w-12 items-center justify-center rounded-lg text-xl font-black ${GRADE_BG[scorecard.grade]}`}
        >
          {scorecard.grade}
        </div>
      </div>
    </Link>
  )
}
