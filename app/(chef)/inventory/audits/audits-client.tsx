'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

const STATUS_COLORS: Record<string, 'default' | 'success' | 'warning' | 'error' | 'info'> = {
  draft: 'default',
  in_progress: 'info',
  pending_review: 'warning',
  finalized: 'success',
}

function formatLabel(s: string) {
  return s.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

function formatCents(cents: number | null) {
  if (cents == null) return '-'
  const abs = Math.abs(cents)
  const sign = cents < 0 ? '-' : cents > 0 ? '+' : ''
  return `${sign}$${(abs / 100).toFixed(2)}`
}

type Props = { initialAudits: any[] }

export function AuditsClient({ initialAudits }: Props) {
  const [statusFilter, setStatusFilter] = useState('')

  const filtered = statusFilter
    ? initialAudits.filter((a) => a.status === statusFilter)
    : initialAudits

  return (
    <div className="space-y-4">
      <div className="flex gap-2 flex-wrap">
        {['', 'draft', 'in_progress', 'pending_review', 'finalized'].map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
              statusFilter === s
                ? 'bg-brand-600 text-white'
                : 'bg-stone-800 text-stone-400 hover:text-stone-200'
            }`}
          >
            {s ? formatLabel(s) : 'All'}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <Card className="p-8 text-center">
          <p className="text-stone-500 text-sm">
            No audits found. Create your first physical count audit to verify stock levels.
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {filtered.map((audit: any) => (
            <Link key={audit.id} href={`/inventory/audits/${audit.id}`}>
              <Card className="p-4 hover:shadow-md transition-shadow cursor-pointer h-full">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold text-stone-100">
                      {formatLabel(audit.auditType)} Audit
                    </h3>
                    <p className="text-sm text-stone-400 mt-0.5">
                      {audit.auditDate ? new Date(audit.auditDate).toLocaleDateString() : 'No date'}
                    </p>
                  </div>
                  <Badge variant={STATUS_COLORS[audit.status] ?? 'default'}>
                    {formatLabel(audit.status)}
                  </Badge>
                </div>
                <div className="flex gap-4 mt-3 text-sm text-stone-500">
                  <span>{audit.totalItemsCounted ?? 0} items counted</span>
                  {audit.itemsWithVariance > 0 && (
                    <span className="text-yellow-400">{audit.itemsWithVariance} variances</span>
                  )}
                  {audit.totalVarianceCents != null && audit.totalVarianceCents !== 0 && (
                    <span>{formatCents(audit.totalVarianceCents)}</span>
                  )}
                </div>
                {audit.notes && (
                  <p className="text-xs text-stone-500 mt-2 truncate">{audit.notes}</p>
                )}
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
