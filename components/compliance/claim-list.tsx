'use client'

import { useEffect, useState, useTransition } from 'react'
import {
  getClaims,
  type InsuranceClaim,
  type ClaimStatus,
  type ClaimType,
} from '@/lib/compliance/claim-actions'

const STATUS_COLORS: Record<ClaimStatus, string> = {
  documenting: 'bg-gray-100 text-gray-700',
  filed: 'bg-brand-100 text-brand-700',
  under_review: 'bg-yellow-100 text-yellow-700',
  approved: 'bg-green-100 text-green-700',
  denied: 'bg-red-100 text-red-700',
  settled: 'bg-purple-100 text-purple-700',
}

const STATUS_LABELS: Record<ClaimStatus, string> = {
  documenting: 'Documenting',
  filed: 'Filed',
  under_review: 'Under Review',
  approved: 'Approved',
  denied: 'Denied',
  settled: 'Settled',
}

const TYPE_LABELS: Record<ClaimType, string> = {
  property_damage: 'Property Damage',
  bodily_injury: 'Bodily Injury',
  food_illness: 'Food Illness',
  equipment_loss: 'Equipment Loss',
  vehicle: 'Vehicle',
  other: 'Other',
}

interface ClaimListProps {
  onSelect?: (claim: InsuranceClaim) => void
  onCreateNew?: () => void
}

export function ClaimList({ onSelect, onCreateNew }: ClaimListProps) {
  const [claims, setClaims] = useState<InsuranceClaim[]>([])
  const [statusFilter, setStatusFilter] = useState<ClaimStatus | ''>('')
  const [typeFilter, setTypeFilter] = useState<ClaimType | ''>('')
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadClaims()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter, typeFilter])

  function loadClaims() {
    setError(null)
    startTransition(async () => {
      try {
        const filters: { status?: ClaimStatus; type?: ClaimType } = {}
        if (statusFilter) filters.status = statusFilter
        if (typeFilter) filters.type = typeFilter
        const data = await getClaims(filters)
        setClaims(data)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load claims')
        setClaims([])
      }
    })
  }

  function formatCurrency(cents: number | null) {
    if (cents === null || cents === undefined) return '-'
    return `$${(cents / 100).toLocaleString('en-US', { minimumFractionDigits: 2 })}`
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as ClaimStatus | '')}
          className="rounded-md border border-gray-300 px-3 py-1.5 text-sm"
        >
          <option value="">All Statuses</option>
          {(Object.keys(STATUS_LABELS) as ClaimStatus[]).map((s) => (
            <option key={s} value={s}>
              {STATUS_LABELS[s]}
            </option>
          ))}
        </select>

        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value as ClaimType | '')}
          className="rounded-md border border-gray-300 px-3 py-1.5 text-sm"
        >
          <option value="">All Types</option>
          {(Object.keys(TYPE_LABELS) as ClaimType[]).map((t) => (
            <option key={t} value={t}>
              {TYPE_LABELS[t]}
            </option>
          ))}
        </select>

        {onCreateNew && (
          <button
            onClick={onCreateNew}
            className="ml-auto rounded-md bg-black px-4 py-1.5 text-sm font-medium text-white hover:bg-gray-800"
          >
            New Claim
          </button>
        )}
      </div>

      {/* Error */}
      {error && <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</div>}

      {/* Loading */}
      {isPending && <div className="py-8 text-center text-sm text-gray-500">Loading claims...</div>}

      {/* Empty */}
      {!isPending && !error && claims.length === 0 && (
        <div className="py-8 text-center text-sm text-gray-500">
          No claims found. {onCreateNew && 'Click "New Claim" to document an incident.'}
        </div>
      )}

      {/* Table */}
      {!isPending && claims.length > 0 && (
        <div className="overflow-x-auto rounded-lg border border-gray-200">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                  Type
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                  Incident Date
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                  Description
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                  Amount
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {claims.map((claim) => (
                <tr
                  key={claim.id}
                  onClick={() => onSelect?.(claim)}
                  className={onSelect ? 'cursor-pointer hover:bg-gray-50' : ''}
                >
                  <td className="whitespace-nowrap px-4 py-3 text-sm">
                    {TYPE_LABELS[claim.claim_type]}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-600">
                    {new Date(claim.incident_date).toLocaleDateString()}
                  </td>
                  <td className="max-w-xs truncate px-4 py-3 text-sm text-gray-600">
                    {claim.description}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm font-medium">
                    {formatCurrency(claim.amount_cents)}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm">
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[claim.status]}`}
                    >
                      {STATUS_LABELS[claim.status]}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
