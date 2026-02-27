'use client'

import { useState, useMemo } from 'react'
import { CharityHourForm } from './charity-hour-form'
import { NonprofitSearch } from './nonprofit-search'
import { CharityHoursList } from './charity-hours-list'
import type { CharityHourEntry, CharityOrganization } from '@/lib/charity/hours-types'
import { ChevronDown } from 'lucide-react'

export function CharityHoursClient({
  entries,
  recentOrgs,
}: {
  entries: CharityHourEntry[]
  recentOrgs: CharityOrganization[]
}) {
  const [editEntry, setEditEntry] = useState<CharityHourEntry | null>(null)
  const [yearFilter, setYearFilter] = useState<string>('all')

  // Derive available years from entries
  const years = useMemo(() => {
    const set = new Set<string>()
    for (const e of entries) {
      set.add(e.serviceDate.slice(0, 4))
    }
    return Array.from(set).sort().reverse()
  }, [entries])

  // Filter entries by selected year
  const filteredEntries = useMemo(() => {
    if (yearFilter === 'all') return entries
    return entries.filter((e) => e.serviceDate.startsWith(yearFilter))
  }, [entries, yearFilter])

  return (
    <>
      {/* Log form */}
      <div id="charity-hour-form">
        <CharityHourForm
          recentOrgs={recentOrgs}
          editEntry={editEntry}
          onDone={() => setEditEntry(null)}
        />
      </div>

      {/* Find Charities browser */}
      <NonprofitSearch />

      {/* Year filter + Logged hours list */}
      {entries.length > 0 && years.length > 1 && (
        <div className="flex items-center gap-2">
          <span className="text-xs text-stone-500">Filter by year:</span>
          <div className="relative">
            <select
              value={yearFilter}
              onChange={(e) => setYearFilter(e.target.value)}
              aria-label="Filter hours by year"
              className="appearance-none rounded-lg bg-stone-800 border border-stone-700 px-3 py-1.5 text-sm text-stone-200 focus:outline-none focus:ring-2 focus:ring-brand-500 pr-7"
            >
              <option value="all">All time</option>
              {years.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-stone-500 pointer-events-none" />
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
    </>
  )
}
