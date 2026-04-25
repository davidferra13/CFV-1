'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import type { OpenTableListing } from '@/lib/hub/open-tables-actions'

interface OpenTablesGridProps {
  listings: OpenTableListing[]
}

export function OpenTablesGrid({ listings }: OpenTablesGridProps) {
  const [areaSearch, setAreaSearch] = useState('')
  const [selectedVibe, setSelectedVibe] = useState<string | null>(null)

  const vibeTags = useMemo(() => {
    const tags = new Set<string>()
    for (const listing of listings) {
      for (const tag of listing.displayVibe ?? []) {
        if (tag.trim()) tags.add(tag.trim())
      }
    }
    return Array.from(tags).sort((a, b) => a.localeCompare(b))
  }, [listings])

  const filteredListings = useMemo(() => {
    const areaTerm = areaSearch.trim().toLowerCase()

    return listings.filter((listing) => {
      const matchesArea = !areaTerm || (listing.displayArea ?? '').toLowerCase().includes(areaTerm)
      const matchesVibe = !selectedVibe || (listing.displayVibe ?? []).includes(selectedVibe)

      return matchesArea && matchesVibe
    })
  }, [areaSearch, listings, selectedVibe])

  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-stone-700/50 bg-stone-800/30 p-4">
        <label className="block text-xs font-semibold uppercase tracking-[0.14em] text-stone-400">
          Search by area
        </label>
        <input
          value={areaSearch}
          onChange={(event) => setAreaSearch(event.target.value)}
          placeholder="City or neighborhood"
          className="mt-2 w-full rounded-xl border border-stone-700 bg-stone-950 px-4 py-3 text-sm text-stone-100 outline-none transition-colors placeholder:text-stone-500 focus:border-amber-500"
        />

        {vibeTags.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setSelectedVibe(null)}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
                selectedVibe === null
                  ? 'bg-amber-500 text-stone-950'
                  : 'bg-stone-900 text-stone-300 hover:bg-stone-700'
              }`}
            >
              All vibes
            </button>
            {vibeTags.map((tag) => (
              <button
                key={tag}
                type="button"
                onClick={() => setSelectedVibe(tag)}
                className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
                  selectedVibe === tag
                    ? 'bg-amber-500 text-stone-950'
                    : 'bg-stone-900 text-stone-300 hover:bg-stone-700'
                }`}
              >
                {tag}
              </button>
            ))}
          </div>
        )}
      </div>

      {filteredListings.length === 0 ? (
        <div className="rounded-xl border border-stone-700/50 bg-stone-800/30 p-8 text-center text-sm text-stone-400">
          No open tables right now.
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {filteredListings.map((listing) => (
            <OpenTableCard key={listing.id} listing={listing} />
          ))}
        </div>
      )}
    </div>
  )
}

function OpenTableCard({ listing }: { listing: OpenTableListing }) {
  return (
    <div className="group flex flex-col rounded-xl border border-stone-700/50 bg-stone-800/30 p-4 transition-colors hover:border-stone-600 hover:bg-stone-800/60">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-stone-700 text-lg">
          {listing.emoji || '\u{1F37D}\uFE0F'}
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-sm font-semibold text-stone-200 group-hover:text-stone-100">
            {listing.name}
          </h3>
          {listing.displayArea && (
            <p className="mt-0.5 text-xs text-stone-400">{listing.displayArea}</p>
          )}
        </div>
      </div>

      {listing.displayVibe && listing.displayVibe.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1">
          {listing.displayVibe.slice(0, 4).map((tag) => (
            <span
              key={tag}
              className="rounded-full bg-amber-900/30 px-2 py-0.5 text-xs text-amber-400"
            >
              {tag}
            </span>
          ))}
          {listing.displayVibe.length > 4 && (
            <span className="rounded-full bg-stone-700/50 px-2 py-0.5 text-xs text-stone-500">
              +{listing.displayVibe.length - 4}
            </span>
          )}
        </div>
      )}

      {listing.dietaryTheme && listing.dietaryTheme.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {listing.dietaryTheme.slice(0, 4).map((tag) => (
            <span
              key={tag}
              className="rounded-full bg-emerald-950/50 px-2 py-0.5 text-xs text-emerald-300"
            >
              {tag}
            </span>
          ))}
          {listing.dietaryTheme.length > 4 && (
            <span className="rounded-full bg-stone-700/50 px-2 py-0.5 text-xs text-stone-500">
              +{listing.dietaryTheme.length - 4}
            </span>
          )}
        </div>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-stone-500">
        <span>{formatOpenSeats(listing.openSeats)}</span>
        <span className="text-stone-700">|</span>
        <span>
          {listing.memberCount} {listing.memberCount === 1 ? 'person' : 'people'} joined
        </span>
        {listing.closesAt && (
          <>
            <span className="text-stone-700">|</span>
            <span>Closes {formatDate(listing.closesAt)}</span>
          </>
        )}
      </div>

      <Link
        href={`/hub/join/${listing.groupToken}`}
        className="mt-4 inline-flex items-center justify-center rounded-xl border border-amber-500/50 bg-amber-500/10 px-4 py-2 text-sm font-semibold text-amber-300 transition-colors hover:border-amber-400 hover:bg-amber-500/20"
      >
        Request to join
      </Link>
    </div>
  )
}

function formatOpenSeats(openSeats: number | null): string {
  if (openSeats === null) return 'Open seats'
  return `${openSeats} ${openSeats === 1 ? 'seat' : 'seats'} open`
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  })
}
