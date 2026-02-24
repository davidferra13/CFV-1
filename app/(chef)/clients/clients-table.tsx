'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table'
import { Input } from '@/components/ui/input'
import { formatCurrency } from '@/lib/utils/currency'
import { format } from 'date-fns'
import Link from 'next/link'
import { Tables } from '@/types/database'
import { ClientHealthBadge } from '@/components/clients/health-score-badge'
import type { ClientHealthScore } from '@/lib/clients/health-score'

type ClientWithStats = Tables<'clients'> & {
  totalEvents: number
  totalSpentCents: number
}

interface ClientsTableProps {
  clients: ClientWithStats[]
  healthMap?: Map<string, ClientHealthScore>
}

export function ClientsTable({ clients, healthMap }: ClientsTableProps) {
  const router = useRouter()
  const [search, setSearch] = useState('')
  const [sortBy, setSortBy] = useState<'name' | 'created' | 'spent'>('created')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')

  // Filter and sort clients
  const filteredAndSortedClients = useMemo(() => {
    // Filter by search
    let filtered = clients.filter((client) => {
      const searchLower = search.toLowerCase()
      return (
        client.full_name.toLowerCase().includes(searchLower) ||
        client.email.toLowerCase().includes(searchLower)
      )
    })

    // Sort
    filtered.sort((a, b) => {
      let aValue: any, bValue: any

      switch (sortBy) {
        case 'name':
          aValue = a.full_name.toLowerCase()
          bValue = b.full_name.toLowerCase()
          break
        case 'created':
          aValue = new Date(a.created_at).getTime()
          bValue = new Date(b.created_at).getTime()
          break
        case 'spent':
          aValue = a.totalSpentCents
          bValue = b.totalSpentCents
          break
      }

      if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1
      if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1
      return 0
    })

    return filtered
  }, [clients, search, sortBy, sortOrder])

  function toggleSort(field: 'name' | 'created' | 'spent') {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSortBy(field)
      setSortOrder('desc')
    }
  }

  function SortIcon({ field }: { field: 'name' | 'created' | 'spent' }) {
    if (sortBy !== field) {
      return <span className="text-stone-400 ml-1">↕</span>
    }
    return <span className="ml-1">{sortOrder === 'asc' ? '↑' : '↓'}</span>
  }

  return (
    <div className="space-y-4">
      {/* Search */}
      <Input
        type="search"
        placeholder="Search by name or email..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      {/* Table */}
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>
              <button
                onClick={() => toggleSort('name')}
                className="flex items-center hover:text-stone-100"
              >
                Name
                <SortIcon field="name" />
              </button>
            </TableHead>
            <TableHead>Health</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Phone</TableHead>
            <TableHead className="text-right">Total Events</TableHead>
            <TableHead className="text-right">
              <button
                onClick={() => toggleSort('spent')}
                className="flex items-center hover:text-stone-100 ml-auto"
              >
                Total Spent
                <SortIcon field="spent" />
              </button>
            </TableHead>
            <TableHead>
              <button
                onClick={() => toggleSort('created')}
                className="flex items-center hover:text-stone-100"
              >
                Created
                <SortIcon field="created" />
              </button>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filteredAndSortedClients.length === 0 ? (
            <TableRow>
              <TableCell colSpan={7} className="text-center text-stone-500 py-8">
                No clients found matching your search
              </TableCell>
            </TableRow>
          ) : (
            filteredAndSortedClients.map((client) => (
              <TableRow
                key={client.id}
                className="cursor-pointer"
                onClick={() => router.push(`/clients/${client.id}`)}
              >
                <TableCell className="font-medium">{client.full_name}</TableCell>
                <TableCell>
                  {(() => {
                    const h = healthMap?.get(client.id)
                    return h ? <ClientHealthBadge score={h.score} tier={h.tier} /> : null
                  })()}
                </TableCell>
                <TableCell className="text-stone-400">{client.email}</TableCell>
                <TableCell className="text-stone-400">{client.phone || '-'}</TableCell>
                <TableCell className="text-right">{client.totalEvents}</TableCell>
                <TableCell className="text-right font-medium">
                  {formatCurrency(client.totalSpentCents)}
                </TableCell>
                <TableCell className="text-stone-400">
                  {format(new Date(client.created_at), 'PP')}
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>

      <p className="text-sm text-stone-500 text-center">
        Showing {filteredAndSortedClients.length} of {clients.length} clients
      </p>
    </div>
  )
}
