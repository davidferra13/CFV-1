'use client'

import { useState, useMemo, memo } from 'react'
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { formatCurrency } from '@/lib/utils/currency'
import { format } from 'date-fns'
import Link from 'next/link'
import type { Tables } from '@/types/database'
import { isDemoClient } from '@/lib/onboarding/demo-data-utils'
import { CalendarPlus, MessageCircle, ExternalLink } from '@/components/ui/icons'
import { TIER_LABELS, TIER_COLORS } from '@/lib/clients/health-score-utils'
import type { ClientHealthTier } from '@/lib/clients/health-score'

type ClientWithStats = Tables<'clients'> & {
  totalEvents: number
  totalSpentCents: number
  lastEventDate?: string | null
  healthTier?: string
  healthScore?: number
}

interface ClientsTableProps {
  clients: ClientWithStats[]
}

export function ClientsTable({ clients }: ClientsTableProps) {
  const [search, setSearch] = useState('')
  const [sortBy, setSortBy] = useState<'name' | 'created' | 'spent' | 'health'>('created')
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
        case 'health':
          aValue = a.healthScore ?? 0
          bValue = b.healthScore ?? 0
          break
      }

      if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1
      if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1
      return 0
    })

    return filtered
  }, [clients, search, sortBy, sortOrder])

  function toggleSort(field: 'name' | 'created' | 'spent' | 'health') {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSortBy(field)
      setSortOrder('desc')
    }
  }

  function SortIcon({ field }: { field: 'name' | 'created' | 'spent' | 'health' }) {
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
                className="flex items-center hover:text-stone-900"
              >
                Name
                <SortIcon field="name" />
              </button>
            </TableHead>
            <TableHead>Email</TableHead>
            <TableHead>
              <button
                onClick={() => toggleSort('health')}
                className="flex items-center hover:text-stone-900"
              >
                Health
                <SortIcon field="health" />
              </button>
            </TableHead>
            <TableHead className="text-right">Total Events</TableHead>
            <TableHead className="text-right">
              <button
                onClick={() => toggleSort('spent')}
                className="flex items-center hover:text-stone-900 ml-auto"
              >
                Total Spent
                <SortIcon field="spent" />
              </button>
            </TableHead>
            <TableHead>Last Event</TableHead>
            <TableHead>
              <button
                onClick={() => toggleSort('created')}
                className="flex items-center hover:text-stone-900"
              >
                Created
                <SortIcon field="created" />
              </button>
            </TableHead>
            <TableHead className="text-right w-24">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filteredAndSortedClients.length === 0 ? (
            <TableRow>
              <TableCell colSpan={8} className="text-center text-stone-500 py-8">
                No clients found matching your search
              </TableCell>
            </TableRow>
          ) : (
            filteredAndSortedClients.map((client) => (
              <ClientTableRow key={client.id} client={client} />
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

const ClientTableRow = memo(function ClientTableRow({ client }: { client: ClientWithStats }) {
  const healthTier = (client.healthTier ?? 'new') as ClientHealthTier
  const tierLabel = TIER_LABELS[healthTier] ?? 'New'
  const tierColor = TIER_COLORS[healthTier] ?? 'bg-brand-100 text-brand-800'

  // Compute "last event" display
  let lastEventDisplay = 'Never'
  if (client.lastEventDate) {
    const days = Math.floor(
      (Date.now() - new Date(client.lastEventDate).getTime()) / (1000 * 60 * 60 * 24)
    )
    if (days === 0) lastEventDisplay = 'Today'
    else if (days === 1) lastEventDisplay = '1d ago'
    else if (days < 30) lastEventDisplay = `${days}d ago`
    else if (days < 365) lastEventDisplay = `${Math.floor(days / 30)}mo ago`
    else lastEventDisplay = `${Math.floor(days / 365)}y ago`
  }

  return (
    <TableRow
      className="cursor-pointer group"
      onClick={() => (window.location.href = `/clients/${client.id}`)}
    >
      <TableCell className="font-medium">
        <div className="flex items-center gap-2">
          {(client as any).avatar_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={(client as any).avatar_url}
              alt=""
              className="h-8 w-8 rounded-full object-cover flex-shrink-0"
            />
          ) : (
            <div className="h-8 w-8 rounded-full bg-stone-800 flex items-center justify-center flex-shrink-0 text-xs font-semibold text-stone-500">
              {client.full_name?.charAt(0)?.toUpperCase() || '?'}
            </div>
          )}
          <span>
            {client.full_name}
            {isDemoClient(client) && (
              <Badge variant="info" className="ml-2 text-xxs px-1.5 py-0">
                Sample
              </Badge>
            )}
          </span>
        </div>
      </TableCell>
      <TableCell className="text-stone-600">{client.email}</TableCell>
      <TableCell>
        <span
          className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${tierColor}`}
        >
          {tierLabel}
        </span>
      </TableCell>
      <TableCell className="text-right">{client.totalEvents}</TableCell>
      <TableCell className="text-right font-medium">
        {formatCurrency(client.totalSpentCents)}
      </TableCell>
      <TableCell className="text-stone-600 text-sm">{lastEventDisplay}</TableCell>
      <TableCell className="text-stone-600">{format(new Date(client.created_at), 'PP')}</TableCell>
      <TableCell className="text-right">
        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <Link
            href={`/events/new?client_id=${client.id}`}
            onClick={(e) => e.stopPropagation()}
            className="p-1.5 rounded hover:bg-stone-100 text-stone-400 hover:text-stone-700 transition-colors"
            title="Create event"
          >
            <CalendarPlus className="h-4 w-4" />
          </Link>
          <Link
            href={`/clients/${client.id}#communication`}
            onClick={(e) => e.stopPropagation()}
            className="p-1.5 rounded hover:bg-stone-100 text-stone-400 hover:text-stone-700 transition-colors"
            title="Send message"
          >
            <MessageCircle className="h-4 w-4" />
          </Link>
          <Link
            href={`/clients/${client.id}`}
            onClick={(e) => e.stopPropagation()}
            className="p-1.5 rounded hover:bg-stone-100 text-stone-400 hover:text-stone-700 transition-colors"
            title="View profile"
          >
            <ExternalLink className="h-4 w-4" />
          </Link>
        </div>
      </TableCell>
    </TableRow>
  )
})
