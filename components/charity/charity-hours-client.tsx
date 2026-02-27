'use client'

import { useState } from 'react'
import { CharityHourForm } from './charity-hour-form'
import { NonprofitSearch } from './nonprofit-search'
import { CharityHoursList } from './charity-hours-list'
import type { CharityHourEntry, CharityOrganization } from '@/lib/charity/hours-types'

export function CharityHoursClient({
  entries,
  recentOrgs,
}: {
  entries: CharityHourEntry[]
  recentOrgs: CharityOrganization[]
}) {
  const [editEntry, setEditEntry] = useState<CharityHourEntry | null>(null)

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

      {/* Logged hours list */}
      <CharityHoursList
        entries={entries}
        onEdit={(entry) => {
          setEditEntry(entry)
          document.getElementById('charity-hour-form')?.scrollIntoView({ behavior: 'smooth' })
        }}
      />
    </>
  )
}
