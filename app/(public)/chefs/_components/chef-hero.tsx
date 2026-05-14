'use client'

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
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-3">
          <ChefHat className="h-7 w-7 text-brand-400" weight="fill" />
          <h1 className="font-display text-2xl tracking-tight text-white">Find a Chef</h1>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-sm text-stone-400">
            {totalChefs} chef{totalChefs !== 1 ? 's' : ''} live
          </span>
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
