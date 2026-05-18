'use client'

import { type ChangeEvent, useMemo, useState } from 'react'
import { Inbox, Search } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { ApprovalCard } from './approval-card'
import type { ApprovalRequest, AutonomyDomain } from './types'

type ApprovalFeedProps = {
  approvals: ApprovalRequest[]
  onApprove?: (approvalId: string, editedDraft?: string) => void
  onReject?: (approvalId: string, reason?: string) => void
  onEdit?: (approvalId: string, draftText: string) => void
  emptyMessage?: string
}

const domainOptions: { value: AutonomyDomain | 'all'; label: string }[] = [
  { value: 'all', label: 'All domains' },
  { value: 'communication', label: 'Communication' },
  { value: 'financial', label: 'Financial' },
  { value: 'logistics', label: 'Logistics' },
  { value: 'operations', label: 'Operations' },
]

export function ApprovalFeed({
  approvals,
  onApprove,
  onReject,
  onEdit,
  emptyMessage = 'No approvals are waiting.',
}: ApprovalFeedProps) {
  const [domain, setDomain] = useState<AutonomyDomain | 'all'>('all')
  const [query, setQuery] = useState('')

  const pendingCount = approvals.filter(
    (approval) => approval.status === undefined || approval.status === 'pending'
  ).length
  const filteredApprovals = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()
    return approvals.filter((approval) => {
      const matchesDomain = domain === 'all' || approval.domain === domain
      const haystack = [
        approval.title,
        approval.affectedName,
        approval.affectedDetail,
        approval.preview.summary,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
      const matchesQuery = !normalizedQuery || haystack.includes(normalizedQuery)
      return matchesDomain && matchesQuery
    })
  }, [approvals, domain, query])

  return (
    <section className="space-y-4" aria-label="Approval feed">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold text-stone-50">Approval gate</h2>
            <Badge variant={pendingCount > 0 ? 'warning' : 'success'}>{pendingCount} pending</Badge>
          </div>
          <p className="mt-1 text-sm text-stone-400">
            Review actions before ChefFlow executes them.
          </p>
        </div>

        <div className="grid gap-2 sm:w-[420px] sm:grid-cols-[1fr_180px]">
          <div className="relative">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-500"
              aria-hidden="true"
            />
            <Input
              aria-label="Search approvals"
              value={query}
              onChange={(event: ChangeEvent<HTMLInputElement>) => setQuery(event.target.value)}
              placeholder="Search approvals"
              className="pl-9"
            />
          </div>
          <Select
            aria-label="Filter approvals by domain"
            value={domain}
            onChange={(event: ChangeEvent<HTMLSelectElement>) =>
              setDomain(event.target.value as AutonomyDomain | 'all')
            }
            options={domainOptions}
          />
        </div>
      </div>

      {filteredApprovals.length > 0 ? (
        <div className="space-y-3">
          {filteredApprovals.map((approval) => (
            <ApprovalCard
              key={approval.id}
              approval={approval}
              onApprove={onApprove}
              onReject={onReject}
              onEdit={onEdit}
            />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center rounded-xl border border-stone-800 bg-stone-900/50 px-4 py-10 text-center">
          <Inbox className="h-8 w-8 text-stone-500" aria-hidden="true" />
          <p className="mt-3 text-sm font-medium text-stone-200">{emptyMessage}</p>
          <p className="mt-1 text-sm text-stone-500">
            Adjust filters if you expected to see an item.
          </p>
        </div>
      )}
    </section>
  )
}
