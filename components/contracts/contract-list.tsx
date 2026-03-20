// Contract List - Client Component
// Renders the filterable list of all contracts for the chef portal.
// Uses server-fetched data passed as props.

'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { format } from 'date-fns'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ContractStatusBadge } from './contract-status-badge'
import type { ContractListItem, ContractStatus } from '@/lib/contracts/actions'

type StatusFilter = 'all' | ContractStatus

const STATUS_TABS: { value: StatusFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'draft', label: 'Draft' },
  { value: 'sent', label: 'Sent' },
  { value: 'viewed', label: 'Viewed' },
  { value: 'signed', label: 'Signed' },
  { value: 'voided', label: 'Voided' },
]

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '-'
  const parsed = new Date(dateStr)
  if (Number.isNaN(parsed.getTime())) return '-'
  return format(parsed, 'MMM d, yyyy')
}

export function ContractList({ contracts }: { contracts: ContractListItem[] }) {
  const [activeFilter, setActiveFilter] = useState<StatusFilter>('all')

  const filtered =
    activeFilter === 'all' ? contracts : contracts.filter((c) => c.status === activeFilter)

  const counts: Record<StatusFilter, number> = {
    all: contracts.length,
    draft: contracts.filter((c) => c.status === 'draft').length,
    sent: contracts.filter((c) => c.status === 'sent').length,
    viewed: contracts.filter((c) => c.status === 'viewed').length,
    signed: contracts.filter((c) => c.status === 'signed').length,
    voided: contracts.filter((c) => c.status === 'voided').length,
  }

  return (
    <div className="space-y-4">
      {/* Filter tabs */}
      <div className="flex flex-wrap gap-2">
        {STATUS_TABS.map((tab) => (
          <Button
            key={tab.value}
            variant={activeFilter === tab.value ? 'primary' : 'secondary'}
            size="sm"
            onClick={() => setActiveFilter(tab.value)}
          >
            {tab.label} ({counts[tab.value]})
          </Button>
        ))}
      </div>

      {/* Contract list */}
      {filtered.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-stone-400">
              {activeFilter === 'all'
                ? 'No contracts yet. Generate one from an event page.'
                : `No ${activeFilter} contracts.`}
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="divide-y divide-stone-800">
              {filtered.map((contract) => (
                <Link
                  key={contract.id}
                  href={`/contracts/${contract.id}`}
                  className="flex flex-col sm:flex-row sm:items-center gap-3 px-6 py-4 hover:bg-stone-800/40 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-stone-100 truncate">
                      {contract.event_occasion || 'Untitled Event'}
                    </p>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1">
                      <span className="text-xs text-stone-400">
                        {contract.client_name || 'No client'}
                      </span>
                      {contract.event_date && (
                        <span className="text-xs text-stone-500">
                          Event: {formatDate(contract.event_date)}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-4 sm:gap-6">
                    <div className="text-right hidden md:block">
                      <p className="text-xs text-stone-500">Created</p>
                      <p className="text-xs text-stone-300">{formatDate(contract.created_at)}</p>
                    </div>
                    {contract.sent_at && (
                      <div className="text-right hidden lg:block">
                        <p className="text-xs text-stone-500">Sent</p>
                        <p className="text-xs text-stone-300">{formatDate(contract.sent_at)}</p>
                      </div>
                    )}
                    {contract.signed_at && (
                      <div className="text-right hidden lg:block">
                        <p className="text-xs text-stone-500">Signed</p>
                        <p className="text-xs text-stone-300">{formatDate(contract.signed_at)}</p>
                      </div>
                    )}
                    <ContractStatusBadge status={contract.status} />
                  </div>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
