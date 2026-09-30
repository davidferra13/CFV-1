'use client'

import Link from 'next/link'
import { useState } from 'react'
import { ChefHat, Info, X, MapPin } from '@/components/ui/icons'

type ChefDirectoryHeaderProps = {
  totalChefs: number
  acceptingChefs: number
  topCoverage: Array<{ label: string; count: number }>
}

export function ChefDirectoryHeader({
  totalChefs,
  acceptingChefs,
  topCoverage,
}: ChefDirectoryHeaderProps) {
  const [showInfo, setShowInfo] = useState(false)

  return (
    <div className="border-b border-stone-800 bg-stone-900">
      <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-5 sm:px-6 md:flex-row md:items-center md:justify-between lg:px-8">
        <div className="flex items-start gap-3">
          <ChefHat className="mt-0.5 h-7 w-7 shrink-0 text-brand-400" weight="fill" />
          <div>
            <h1 className="font-display text-2xl tracking-tight text-white">
              Browse private chefs
            </h1>
            <p className="mt-1 max-w-xl text-sm leading-6 text-stone-400">
              Search profiles by location and service, or send one request and let matched chefs
              respond to your event.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 self-stretch md:self-auto">
          <span className="hidden text-sm text-stone-400 sm:inline">
            {totalChefs} chef{totalChefs !== 1 ? 's' : ''} live
          </span>
          <Link
            href="/book"
            className="inline-flex min-h-10 flex-1 items-center justify-center rounded-xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-500 md:flex-none"
          >
            Start request
          </Link>
          <button
            type="button"
            onClick={() => setShowInfo(!showInfo)}
            className="rounded-lg p-1.5 text-stone-500 transition-colors hover:bg-stone-800 hover:text-stone-300"
            aria-label="Directory info"
          >
            <Info className="h-4 w-4" />
          </button>
        </div>
      </div>

      {showInfo && (
        <div className="border-t border-stone-800 bg-stone-950/60">
          <div className="mx-auto max-w-6xl px-4 py-4 sm:px-6 lg:px-8">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-3">
                <p className="text-sm text-stone-300">
                  <span className="font-semibold text-brand-300">{acceptingChefs}</span> of{' '}
                  {totalChefs} listed chefs are accepting inquiries.
                </p>
                {topCoverage.length > 0 && (
                  <div>
                    <p className="mb-2 text-xs font-medium uppercase tracking-wide text-stone-500">
                      Coverage
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {topCoverage.map((area) => (
                        <span
                          key={area.label}
                          className="inline-flex items-center gap-1.5 rounded-full border border-stone-700 bg-stone-900 px-2.5 py-1 text-xs text-stone-300"
                        >
                          <MapPin className="h-3 w-3 text-stone-500" />
                          {area.label}
                          {area.count > 1 ? ` (${area.count})` : ''}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              <button
                type="button"
                onClick={() => setShowInfo(false)}
                className="rounded-lg p-1 text-stone-500 hover:text-stone-300"
                aria-label="Close info panel"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
