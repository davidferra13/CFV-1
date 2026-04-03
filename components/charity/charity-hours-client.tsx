'use client'

import { useMemo, useState } from 'react'
import { ChevronDown } from '@/components/ui/icons'
import { CharityHourForm } from './charity-hour-form'
import { CharityHoursList } from './charity-hours-list'
import { NonprofitSearch } from './nonprofit-search'
import type { CharityHourEntry, CharityOrganization } from '@/lib/charity/hours-types'

export function CharityHoursClient({
  entries,
  recentOrgs,
}: {
  entries: CharityHourEntry[]
  recentOrgs: CharityOrganization[]
}) {
  const [editEntry, setEditEntry] = useState<CharityHourEntry | null>(null)
  const [yearFilter, setYearFilter] = useState<string>('all')

  const years = useMemo(() => {
    const set = new Set<string>()
    for (const entry of entries) set.add(entry.serviceDate.slice(0, 4))
    return Array.from(set).sort().reverse()
  }, [entries])

  const filteredEntries = useMemo(() => {
    if (yearFilter === 'all') return entries
    return entries.filter((entry) => entry.serviceDate.startsWith(yearFilter))
  }, [entries, yearFilter])

  return (
    <div className="space-y-5">
      <div id="charity-hour-form">
        <CharityHourForm
          recentOrgs={recentOrgs}
          editEntry={editEntry}
          onDone={() => setEditEntry(null)}
        />
      </div>

      <details className="rounded-xl border border-stone-700 bg-stone-900/60">
        <summary className="cursor-pointer list-none px-5 py-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-stone-200">Explore verified organizations</p>
              <p className="mt-1 text-xs text-stone-500">
                Optional. Use this when you want to source a nonprofit before you log work.
              </p>
            </div>
            <ChevronDown className="h-4 w-4 text-stone-500" />
          </div>
        </summary>
        <div className="border-t border-stone-800 px-5 pb-5 pt-4">
          <NonprofitSearch />
        </div>
      </details>

      {entries.length > 0 && years.length > 1 && (
        <div className="flex items-center gap-2">
          <span className="text-xs text-stone-500">Filter by year:</span>
          <div className="relative">
            <select
              value={yearFilter}
              onChange={(event) => setYearFilter(event.target.value)}
              aria-label="Filter volunteer entries by year"
              className="appearance-none rounded-lg border border-stone-700 bg-stone-800 px-3 py-1.5 pr-7 text-sm text-stone-200 focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              <option value="all">All time</option>
              {years.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-stone-500" />
          </div>
        </div>
      )}

      <CharityHoursList
        entries={filteredEntries}
        onEdit={(entry) => {
          setEditEntry(entry)
          document.getElementById('charity-hour-form')?.scrollIntoView({ behavior: 'smooth' })
        }}
      />
    </div>
  )
}
