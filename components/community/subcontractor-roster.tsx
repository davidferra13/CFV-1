// Subcontractor Roster
// Shows all unique subcontractors with usage stats and COI status

'use client'

import { useState, useEffect, useTransition } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { getSubcontractorRoster } from '@/lib/community/subcontract-actions'
import { todayLocalDateString } from '@/lib/utils/format'

type RosterEntry = {
  name: string
  email: string | null
  phone: string | null
  chefId: string | null
  usageCount: number
  lastUsed: string
  coiVerified: boolean
  coiExpiry: string | null
}

function COIRosterBadge({ entry }: { entry: RosterEntry }) {
  if (!entry.coiVerified) {
    return <Badge variant="error">No COI</Badge>
  }
  if (!entry.coiExpiry) {
    return <Badge variant="success">Verified</Badge>
  }

  const today = todayLocalDateString()
  const thirtyDaysOut = new Date()
  thirtyDaysOut.setDate(thirtyDaysOut.getDate() + 30)
  const warningDate = [
    thirtyDaysOut.getFullYear(),
    String(thirtyDaysOut.getMonth() + 1).padStart(2, '0'),
    String(thirtyDaysOut.getDate()).padStart(2, '0'),
  ].join('-')

  if (entry.coiExpiry < today) {
    return <Badge variant="error">COI Expired</Badge>
  }
  if (entry.coiExpiry <= warningDate) {
    return <Badge variant="warning">Expiring Soon</Badge>
  }
  return <Badge variant="success">Verified</Badge>
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  } catch {
    return iso
  }
}

type SubcontractorRosterProps = {
  onCreateAgreement?: (prefill: {
    name: string
    email: string | null
    phone: string | null
  }) => void
}

export function SubcontractorRoster({ onCreateAgreement }: SubcontractorRosterProps) {
  const [roster, setRoster] = useState<RosterEntry[]>([])
  const [isPending, startTransition] = useTransition()
  const [loadError, setLoadError] = useState<string | null>(null)

  useEffect(() => {
    startTransition(async () => {
      try {
        const data = await getSubcontractorRoster()
        setRoster(data)
        setLoadError(null)
      } catch (err) {
        console.error('[SubcontractorRoster] Load error:', err)
        setLoadError('Failed to load subcontractor roster')
      }
    })
  }, [])

  if (loadError) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">{loadError}</div>
    )
  }

  if (isPending) {
    return <div className="py-8 text-center text-stone-500">Loading roster...</div>
  }

  if (roster.length === 0) {
    return (
      <div className="py-8 text-center text-stone-500">
        No subcontractors yet. Create your first agreement to build your roster.
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-stone-900">Subcontractor Roster</h3>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {roster.map((entry, idx) => (
          <div key={idx} className="rounded-lg border border-stone-200 bg-white p-4 shadow-sm">
            <div className="flex items-start justify-between">
              <div>
                <h4 className="font-medium text-stone-900">{entry.name}</h4>
                {entry.email && <p className="text-xs text-stone-500">{entry.email}</p>}
                {entry.phone && <p className="text-xs text-stone-500">{entry.phone}</p>}
              </div>
              <COIRosterBadge entry={entry} />
            </div>

            <div className="mt-3 flex items-center gap-4 text-xs text-stone-500">
              <span>
                {entry.usageCount} agreement{entry.usageCount !== 1 ? 's' : ''}
              </span>
              <span>Last: {formatDate(entry.lastUsed)}</span>
            </div>

            {entry.chefId && (
              <div className="mt-2">
                <Badge variant="info">ChefFlow Member</Badge>
              </div>
            )}

            {onCreateAgreement && (
              <div className="mt-3 border-t border-stone-100 pt-3">
                <Button
                  variant="ghost"
                  onClick={() =>
                    onCreateAgreement({
                      name: entry.name,
                      email: entry.email,
                      phone: entry.phone,
                    })
                  }
                  className="w-full text-xs"
                >
                  + New Agreement
                </Button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
