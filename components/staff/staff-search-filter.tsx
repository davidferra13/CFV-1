'use client'

import { useState, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

const ROLES = [
  { value: 'all', label: 'All Roles' },
  { value: 'sous_chef', label: 'Sous Chef' },
  { value: 'kitchen_assistant', label: 'Kitchen Assistant' },
  { value: 'service_staff', label: 'Service Staff' },
  { value: 'server', label: 'Server' },
  { value: 'bartender', label: 'Bartender' },
  { value: 'dishwasher', label: 'Dishwasher' },
  { value: 'other', label: 'Other' },
] as const

const STATUSES = [
  { value: 'all', label: 'All' },
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
] as const

type Props = {
  initialSearch?: string
  initialRole?: string
  initialStatus?: string
}

export function StaffSearchFilter({
  initialSearch = '',
  initialRole = 'all',
  initialStatus = 'active',
}: Props) {
  const router = useRouter()
  const [search, setSearch] = useState(initialSearch)
  const [role, setRole] = useState(initialRole)
  const [status, setStatus] = useState(initialStatus)

  const applyFilters = useCallback(
    (newSearch?: string, newRole?: string, newStatus?: string) => {
      const s = newSearch ?? search
      const r = newRole ?? role
      const st = newStatus ?? status
      const params = new URLSearchParams()
      if (s) params.set('q', s)
      if (r && r !== 'all') params.set('role', r)
      if (st && st !== 'active') params.set('status', st)
      const qs = params.toString()
      router.push(`/staff${qs ? `?${qs}` : ''}`)
    },
    [search, role, status, router]
  )

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
      <div className="flex-1">
        <Input
          placeholder="Search by name..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value)
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') applyFilters(search)
          }}
        />
      </div>
      <select
        value={role}
        onChange={(e) => {
          setRole(e.target.value)
          applyFilters(search, e.target.value, status)
        }}
        className="rounded-md border border-stone-700 bg-stone-900 px-3 py-2 text-sm text-stone-200"
      >
        {ROLES.map((r) => (
          <option key={r.value} value={r.value}>
            {r.label}
          </option>
        ))}
      </select>
      <select
        value={status}
        onChange={(e) => {
          setStatus(e.target.value)
          applyFilters(search, role, e.target.value)
        }}
        className="rounded-md border border-stone-700 bg-stone-900 px-3 py-2 text-sm text-stone-200"
      >
        {STATUSES.map((s) => (
          <option key={s.value} value={s.value}>
            {s.label}
          </option>
        ))}
      </select>
      <Button variant="secondary" onClick={() => applyFilters(search)}>
        Search
      </Button>
    </div>
  )
}
