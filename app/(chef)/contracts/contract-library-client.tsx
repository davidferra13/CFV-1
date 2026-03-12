// Contract Library Client Component
// Displays contract list with status filters and status badges.
'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import type { ContractListItem } from '@/lib/contracts/actions'
import { format, parseISO } from 'date-fns'

type Props = {
  contracts: ContractListItem[]
}

const STATUS_FILTERS = [
  { value: 'all', label: 'All' },
  { value: 'draft', label: 'Draft' },
  { value: 'sent', label: 'Sent' },
  { value: 'viewed', label: 'Viewed' },
  { value: 'signed', label: 'Signed' },
  { value: 'voided', label: 'Voided' },
] as const

function statusBadgeVariant(status: string): 'default' | 'success' | 'warning' | 'error' | 'info' {
  switch (status) {
    case 'signed':
      return 'success'
    case 'sent':
      return 'info'
    case 'viewed':
      return 'warning'
    case 'voided':
      return 'error'
    default:
      return 'default'
  }
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '-'
  try {
    return format(parseISO(dateStr), 'MMM d, yyyy')
  } catch {
    return dateStr
  }
}

export function ContractLibraryClient({ contracts }: Props) {
  const [filter, setFilter] = useState('all')

  const filtered = filter === 'all' ? contracts : contracts.filter((c) => c.status === filter)

  // Status counts
  const counts = contracts.reduce(
    (acc, c) => {
      acc[c.status] = (acc[c.status] || 0) + 1
      return acc
    },
    {} as Record<string, number>
  )

  return (
    <div className="space-y-4">
      {/* Filter tabs */}
      <div className="flex gap-1.5 border-b border-stone-700 pb-2">
        {STATUS_FILTERS.map((f) => {
          const count = f.value === 'all' ? contracts.length : counts[f.value] || 0
          return (
            <button
              key={f.value}
              onClick={() => setFilter(f.value)}
              className={`px-3 py-1.5 text-sm rounded-t transition-colors ${
                filter === f.value
                  ? 'bg-stone-700 text-stone-100 font-medium'
                  : 'text-stone-400 hover:text-stone-200'
              }`}
            >
              {f.label}
              {count > 0 && <span className="ml-1.5 text-xs text-stone-500">({count})</span>}
            </button>
          )
        })}
      </div>

      {/* Contract list */}
      {filtered.length === 0 ? (
        <Card className="p-8 text-center">
          <p className="text-stone-400">
            {filter === 'all'
              ? 'No contracts yet. Generate one from an event detail page.'
              : `No ${filter} contracts.`}
          </p>
        </Card>
      ) : (
        <div className="space-y-2">
          {filtered.map((contract) => (
            <Link key={contract.id} href={`/events/${contract.event_id}`}>
              <Card className="p-4 hover:bg-stone-800/50 transition-colors cursor-pointer">
                <div className="flex items-center justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-stone-100 truncate">
                        {contract.client_name}
                      </span>
                      <Badge variant={statusBadgeVariant(contract.status)}>{contract.status}</Badge>
                    </div>
                    <p className="text-sm text-stone-400 mt-0.5">
                      {contract.event_occasion} - {formatDate(contract.event_date)}
                    </p>
                  </div>
                  <div className="text-right text-xs text-stone-500 shrink-0 ml-4">
                    {contract.signed_at ? (
                      <p>Signed {formatDate(contract.signed_at)}</p>
                    ) : contract.viewed_at ? (
                      <p>Viewed {formatDate(contract.viewed_at)}</p>
                    ) : contract.sent_at ? (
                      <p>Sent {formatDate(contract.sent_at)}</p>
                    ) : (
                      <p>Created {formatDate(contract.created_at)}</p>
                    )}
                  </div>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
