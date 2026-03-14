'use client'

import { useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { Input } from '@/components/ui/input'
import { formatCurrency } from '@/lib/utils/currency'
import { format } from 'date-fns'
import { toast } from 'sonner'
import { Tables } from '@/types/database'
import { ClientHealthBadge } from '@/components/clients/health-score-badge'
import type { ClientHealthScore } from '@/lib/clients/health-score'
import type { ChurnRiskClient } from '@/lib/intelligence/churn-prevention-triggers'
import { usePersistentViewState } from '@/lib/view-state/use-persistent-view-state'
import { Badge } from '@/components/ui/badge'
import { BulkSelectTable, type BulkAction } from '@/components/ui/bulk-select-table'
import { bulkArchiveClients } from '@/lib/clients/bulk-actions'

type ClientWithStats = Tables<'clients'> & {
  totalEvents: number
  totalSpentCents: number
}

const TIER_COLORS: Record<string, string> = {
  bronze: 'bg-amber-900/40 text-amber-300 border-amber-700/50',
  silver: 'bg-stone-600/40 text-stone-200 border-stone-500/50',
  gold: 'bg-yellow-900/40 text-yellow-300 border-yellow-600/50',
  platinum: 'bg-indigo-900/40 text-indigo-300 border-indigo-600/50',
}

const CHURN_COLORS: Record<string, string> = {
  critical: 'text-red-400',
  high: 'text-orange-400',
  moderate: 'text-amber-400',
}

interface ClientsTableProps {
  clients: ClientWithStats[]
  healthMap?: Map<string, ClientHealthScore>
  churnMap?: Map<string, ChurnRiskClient>
}

export function ClientsTable({ clients, healthMap, churnMap }: ClientsTableProps) {
  const router = useRouter()
  const { state, setState } = usePersistentViewState('clients.list', {
    strategy: 'url',
    defaults: {
      search: '',
      sortBy: 'created' as 'name' | 'created' | 'spent',
      sortOrder: 'desc' as 'asc' | 'desc',
    },
  })
  const { search, sortBy, sortOrder } = state

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
      setState({ sortOrder: sortOrder === 'asc' ? 'desc' : 'asc' })
    } else {
      setState({ sortBy: field, sortOrder: 'desc' })
    }
  }

  function SortIcon({ field }: { field: 'name' | 'created' | 'spent' }) {
    if (sortBy !== field) {
      return <span className="text-stone-400 ml-1">↕</span>
    }
    return <span className="ml-1">{sortOrder === 'asc' ? '↑' : '↓'}</span>
  }

  const bulkActions: BulkAction[] = [
    {
      label: 'Archive',
      variant: 'danger',
      confirmMessage:
        'This will archive the selected clients. Archived clients can be restored later.',
      onClick: async (selectedIds) => {
        try {
          const result = await bulkArchiveClients(selectedIds)
          toast.success(`Archived ${result.count} client${result.count === 1 ? '' : 's'}`)
        } catch (err) {
          toast.error('Failed to archive clients')
        }
      },
    },
  ]

  return (
    <div className="space-y-4">
      {/* Search */}
      <Input
        type="search"
        placeholder="Search by name or email..."
        value={search}
        onChange={(e) => setState({ search: e.target.value })}
      />

      {/* Table with bulk selection */}
      {filteredAndSortedClients.length === 0 ? (
        <div className="text-center text-stone-500 py-8">No clients found matching your search</div>
      ) : (
        <BulkSelectTable
          items={filteredAndSortedClients}
          bulkActions={bulkActions}
          renderHeader={() => (
            <>
              <th className="px-4 py-3 text-left text-xs font-medium text-stone-400 uppercase tracking-wider">
                <button
                  onClick={() => toggleSort('name')}
                  className="flex items-center hover:text-stone-100"
                >
                  Name
                  <SortIcon field="name" />
                </button>
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-stone-400 uppercase tracking-wider">
                Health
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-stone-400 uppercase tracking-wider">
                Loyalty
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-stone-400 uppercase tracking-wider">
                Email
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-stone-400 uppercase tracking-wider">
                Phone
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-stone-400 uppercase tracking-wider">
                Total Events
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-stone-400 uppercase tracking-wider">
                <button
                  onClick={() => toggleSort('spent')}
                  className="flex items-center hover:text-stone-100 ml-auto"
                >
                  Total Spent
                  <SortIcon field="spent" />
                </button>
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-stone-400 uppercase tracking-wider">
                <button
                  onClick={() => toggleSort('created')}
                  className="flex items-center hover:text-stone-100"
                >
                  Created
                  <SortIcon field="created" />
                </button>
              </th>
            </>
          )}
          renderRow={(client) => (
            <>
              <td
                className="px-4 py-3 font-medium cursor-pointer text-brand-600 hover:text-brand-300 hover:underline"
                onClick={() => router.push(`/clients/${client.id}`)}
              >
                {client.full_name}
              </td>
              <td className="px-4 py-3">
                <div className="flex items-center gap-1.5">
                  {(() => {
                    const h = healthMap?.get(client.id)
                    return h ? <ClientHealthBadge score={h.score} tier={h.tier} /> : null
                  })()}
                  {(() => {
                    const churn = churnMap?.get(client.id)
                    if (!churn || churn.riskLevel === 'low') return null
                    return (
                      <span
                        className={`text-xs font-medium ${CHURN_COLORS[churn.riskLevel] || 'text-amber-400'}`}
                        title={`Churn risk: ${churn.riskScore}/100 — ${churn.suggestedAction}`}
                      >
                        {churn.riskLevel === 'critical' ? '⚠' : '↓'}
                      </span>
                    )
                  })()}
                </div>
              </td>
              <td className="px-4 py-3">
                {(client as any).loyalty_tier ? (
                  <Badge
                    variant="default"
                    className={`text-xs capitalize ${TIER_COLORS[(client as any).loyalty_tier] ?? ''}`}
                  >
                    {(client as any).loyalty_tier}
                  </Badge>
                ) : null}
              </td>
              <td className="px-4 py-3 text-stone-400">{client.email}</td>
              <td className="px-4 py-3 text-stone-400">{client.phone || '-'}</td>
              <td className="px-4 py-3 text-right">{client.totalEvents}</td>
              <td className="px-4 py-3 text-right font-medium">
                {formatCurrency(client.totalSpentCents)}
              </td>
              <td className="px-4 py-3 text-stone-400">
                {format(new Date(client.created_at), 'PP')}
              </td>
            </>
          )}
        />
      )}

      <p className="text-sm text-stone-500 text-center">
        Showing {filteredAndSortedClients.length} of {clients.length} clients
      </p>
    </div>
  )
}
