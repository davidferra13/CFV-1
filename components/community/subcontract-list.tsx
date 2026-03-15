// Subcontract Agreements List
// Table view with status filtering and COI warning badges

'use client'

import { useState, useEffect, useTransition } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  getSubcontracts,
  type SubcontractAgreement,
} from '@/lib/community/subcontract-actions'

type StatusFilter = 'all' | 'draft' | 'sent' | 'accepted' | 'active' | 'completed' | 'cancelled'

const STATUS_BADGE: Record<string, { label: string; variant: 'default' | 'warning' | 'info' | 'success' | 'error' }> = {
  draft:     { label: 'Draft',     variant: 'default' },
  sent:      { label: 'Sent',      variant: 'warning' },
  accepted:  { label: 'Accepted',  variant: 'info' },
  active:    { label: 'Active',    variant: 'success' },
  completed: { label: 'Completed', variant: 'success' },
  cancelled: { label: 'Cancelled', variant: 'error' },
}

const ROLE_LABELS: Record<string, string> = {
  sous_chef: 'Sous Chef',
  line_cook: 'Line Cook',
  prep_cook: 'Prep Cook',
  server: 'Server',
  bartender: 'Bartender',
  pastry: 'Pastry',
  lead_chef: 'Lead Chef',
  other: 'Other',
}

function formatRate(rateCents: number, rateType: string, estimatedHours: number | null): string {
  const dollars = (rateCents / 100).toFixed(2)
  if (rateType === 'hourly') return `$${dollars}/hr${estimatedHours ? ` (${estimatedHours}h est.)` : ''}`
  if (rateType === 'flat') return `$${dollars} flat`
  if (rateType === 'percentage') return `${rateCents / 100}%`
  return `$${dollars}`
}

function COIBadge({ agreement }: { agreement: SubcontractAgreement }) {
  if (!agreement.insurance_required) {
    return <Badge variant="default">N/A</Badge>
  }
  if (!agreement.coi_verified) {
    return <Badge variant="error">Not Verified</Badge>
  }
  if (!agreement.coi_expiry_date) {
    return <Badge variant="success">Verified</Badge>
  }

  const today = new Date().toISOString().split('T')[0]
  const thirtyDaysOut = new Date()
  thirtyDaysOut.setDate(thirtyDaysOut.getDate() + 30)
  const warningDate = thirtyDaysOut.toISOString().split('T')[0]

  if (agreement.coi_expiry_date < today) {
    return <Badge variant="error">Expired</Badge>
  }
  if (agreement.coi_expiry_date <= warningDate) {
    return <Badge variant="warning">Expiring Soon</Badge>
  }
  return <Badge variant="success">Verified</Badge>
}

type SubcontractListProps = {
  onEdit?: (agreement: SubcontractAgreement) => void
  onCreateNew?: () => void
  eventId?: string
}

export function SubcontractList({ onEdit, onCreateNew, eventId }: SubcontractListProps) {
  const [agreements, setAgreements] = useState<SubcontractAgreement[]>([])
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [isPending, startTransition] = useTransition()
  const [loadError, setLoadError] = useState<string | null>(null)

  useEffect(() => {
    loadAgreements()
  }, [statusFilter, eventId]) // eslint-disable-line react-hooks/exhaustive-deps

  function loadAgreements() {
    startTransition(async () => {
      try {
        const filters: { status?: string; eventId?: string } = {}
        if (statusFilter !== 'all') filters.status = statusFilter
        if (eventId) filters.eventId = eventId
        const data = await getSubcontracts(filters as Parameters<typeof getSubcontracts>[0])
        setAgreements(data)
        setLoadError(null)
      } catch (err) {
        console.error('[SubcontractList] Load error:', err)
        setLoadError('Failed to load subcontract agreements')
      }
    })
  }

  const statusOptions: StatusFilter[] = ['all', 'draft', 'sent', 'accepted', 'active', 'completed', 'cancelled']

  if (loadError) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">
        {loadError}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          {statusOptions.map(s => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`rounded-md px-3 py-1 text-sm font-medium transition-colors ${
                statusFilter === s
                  ? 'bg-stone-900 text-white'
                  : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
              }`}
            >
              {s === 'all' ? 'All' : STATUS_BADGE[s]?.label ?? s}
            </button>
          ))}
        </div>
        {onCreateNew && (
          <Button variant="primary" onClick={onCreateNew}>
            + New Agreement
          </Button>
        )}
      </div>

      {isPending ? (
        <div className="py-8 text-center text-stone-500">Loading...</div>
      ) : agreements.length === 0 ? (
        <div className="py-8 text-center text-stone-500">
          No subcontract agreements found.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead className="bg-stone-50 text-left text-stone-600">
              <tr>
                <th className="px-4 py-3 font-medium">Subcontractor</th>
                <th className="px-4 py-3 font-medium">Role</th>
                <th className="px-4 py-3 font-medium">Rate</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">COI</th>
                <th className="px-4 py-3 font-medium"></th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {agreements.map(a => (
                <tr key={a.id} className="hover:bg-stone-50">
                  <td className="px-4 py-3">
                    <div className="font-medium text-stone-900">{a.subcontractor_name}</div>
                    {a.subcontractor_email && (
                      <div className="text-xs text-stone-500">{a.subcontractor_email}</div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-stone-700">
                    {ROLE_LABELS[a.role] ?? a.role}
                  </td>
                  <td className="px-4 py-3 text-stone-700">
                    {formatRate(a.rate_cents, a.rate_type, a.estimated_hours)}
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={STATUS_BADGE[a.status]?.variant ?? 'default'}>
                      {STATUS_BADGE[a.status]?.label ?? a.status}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <COIBadge agreement={a} />
                  </td>
                  <td className="px-4 py-3 text-right">
                    {onEdit && (
                      <button
                        onClick={() => onEdit(a)}
                        className="text-sm font-medium text-stone-600 hover:text-stone-900"
                      >
                        Edit
                      </button>
                    )}
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
