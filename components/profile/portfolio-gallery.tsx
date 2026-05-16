'use client'

import { useState } from 'react'
import Image from 'next/image'
import type { PortfolioEntry } from '@/lib/profile/portfolio-actions'

const GUEST_COUNT_LABELS: Record<string, string> = {
  intimate: '2-4 guests',
  small: '5-8 guests',
  medium: '9-15 guests',
  large: '16-30 guests',
  xl: '30+ guests',
}

function PortfolioEntryCard({ entry }: { entry: PortfolioEntry }) {
  const coverPhoto = entry.photos[0]
  const dateLabel = entry.eventDate
    ? new Date(`${entry.eventDate}T00:00:00`).toLocaleDateString('en-US', {
        month: 'long',
        year: 'numeric',
      })
    : null

  return (
    <div className="rounded-xl border border-stone-700/50 bg-stone-800/30 overflow-hidden">
      {coverPhoto && (
        <div className="relative aspect-[16/10] w-full">
          <Image
            src={coverPhoto.url}
            alt={coverPhoto.caption || entry.title}
            fill
            className="object-cover"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          />
        </div>
      )}
      <div className="p-4">
        <h3 className="font-semibold text-stone-100 text-sm">{entry.title}</h3>

        <div className="flex flex-wrap items-center gap-2 mt-1.5">
          {entry.occasionType && (
            <span className="text-xs text-stone-400">{entry.occasionType}</span>
          )}
          {entry.guestCountRange && (
            <span className="text-xs text-stone-500">
              {GUEST_COUNT_LABELS[entry.guestCountRange] || entry.guestCountRange}
            </span>
          )}
          {dateLabel && <span className="text-xs text-stone-500">{dateLabel}</span>}
        </div>

        {entry.description && (
          <p className="text-xs text-stone-400 mt-2 line-clamp-2">{entry.description}</p>
        )}

        {entry.menuHighlights.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-2">
            {entry.menuHighlights.slice(0, 4).map((dish, i) => (
              <span
                key={i}
                className="inline-block px-2 py-0.5 rounded-full text-xxs bg-stone-700/50 text-stone-300 border border-stone-600/50"
              >
                {dish}
              </span>
            ))}
            {entry.menuHighlights.length > 4 && (
              <span className="text-xxs text-stone-500">
                +{entry.menuHighlights.length - 4} more
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

const INITIAL_COUNT = 4

export function PortfolioGallery({ entries }: { entries: PortfolioEntry[] }) {
  const [showAll, setShowAll] = useState(false)

  if (entries.length === 0) return null

  const visible = showAll ? entries : entries.slice(0, INITIAL_COUNT)

  return (
    <section className="mt-10">
      <h2 className="text-lg font-bold text-stone-100 mb-4">Portfolio</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {visible.map((entry) => (
          <PortfolioEntryCard key={entry.id} entry={entry} />
        ))}
      </div>
      {entries.length > INITIAL_COUNT && !showAll && (
        <button
          type="button"
          onClick={() => setShowAll(true)}
          className="mt-4 text-sm text-brand-500 hover:text-brand-400 font-medium"
        >
          See all {entries.length} portfolio entries
        </button>
      )}
    </section>
  )
}
