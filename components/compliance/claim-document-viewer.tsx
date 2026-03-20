'use client'

import { useEffect, useState, useTransition } from 'react'
import { getClaimDocumentPackage } from '@/lib/compliance/claim-actions'

type ClaimType =
  | 'property_damage'
  | 'bodily_injury'
  | 'food_illness'
  | 'equipment_loss'
  | 'vehicle'
  | 'other'
type ClaimStatus = 'documenting' | 'filed' | 'under_review' | 'approved' | 'denied' | 'settled'

interface DocumentPackage {
  claim: {
    id: string
    claim_type: ClaimType
    incident_date: string
    description: string
    amount_cents: number | null
    status: ClaimStatus
    policy_number: string | null
    adjuster_name: string | null
    adjuster_phone: string | null
    adjuster_email: string | null
    evidence_urls: string[]
    witness_info: string | null
    resolution_notes: string | null
    resolved_at: string | null
    created_at: string
  }
  event: Record<string, unknown> | null
  client: {
    id: string
    first_name: string
    last_name: string
    email: string | null
    phone: string | null
    company: string | null
  } | null
  menu: Record<string, unknown>[]
  timeline: {
    id: string
    from_status: string
    to_status: string
    created_at: string
    note: string | null
  }[]
}

const TYPE_LABELS: Record<ClaimType, string> = {
  property_damage: 'Property Damage',
  bodily_injury: 'Bodily Injury',
  food_illness: 'Food Illness',
  equipment_loss: 'Equipment Loss',
  vehicle: 'Vehicle',
  other: 'Other',
}

const STATUS_LABELS: Record<ClaimStatus, string> = {
  documenting: 'Documenting',
  filed: 'Filed',
  under_review: 'Under Review',
  approved: 'Approved',
  denied: 'Denied',
  settled: 'Settled',
}

interface ClaimDocumentViewerProps {
  claimId: string
  onClose?: () => void
}

export function ClaimDocumentViewer({ claimId, onClose }: ClaimDocumentViewerProps) {
  const [pkg, setPkg] = useState<DocumentPackage | null>(null)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setError(null)
    startTransition(async () => {
      try {
        const data = await getClaimDocumentPackage(claimId)
        setPkg(data as DocumentPackage)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load document package')
      }
    })
  }, [claimId])

  function formatCurrency(cents: number | null) {
    if (cents === null || cents === undefined) return 'Not specified'
    return `$${(cents / 100).toLocaleString('en-US', { minimumFractionDigits: 2 })}`
  }

  function handlePrint() {
    window.print()
  }

  if (isPending) {
    return (
      <div className="py-12 text-center text-sm text-gray-500">Loading document package...</div>
    )
  }

  if (error) {
    return <div className="rounded-md bg-red-50 p-4 text-sm text-red-700">{error}</div>
  }

  if (!pkg) return null

  const { claim, event, client, menu, timeline } = pkg

  return (
    <div className="space-y-6 print:space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Insurance Claim Document Package</h2>
          <p className="mt-1 text-sm text-gray-500">
            Claim ID: {claim.id.slice(0, 8)}... | Created:{' '}
            {new Date(claim.created_at).toLocaleDateString()}
          </p>
        </div>
        <div className="flex gap-2 print:hidden">
          <button
            onClick={handlePrint}
            className="rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium hover:bg-gray-50"
          >
            Print
          </button>
          {onClose && (
            <button
              onClick={onClose}
              className="rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium hover:bg-gray-50"
            >
              Close
            </button>
          )}
        </div>
      </div>

      {/* Claim Details */}
      <section className="rounded-lg border border-gray-200 p-4">
        <h3 className="mb-3 text-sm font-semibold uppercase text-gray-500">Claim Details</h3>
        <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
          <div>
            <dt className="text-gray-500">Type</dt>
            <dd className="font-medium">{TYPE_LABELS[claim.claim_type]}</dd>
          </div>
          <div>
            <dt className="text-gray-500">Status</dt>
            <dd className="font-medium">{STATUS_LABELS[claim.status]}</dd>
          </div>
          <div>
            <dt className="text-gray-500">Incident Date</dt>
            <dd className="font-medium">{new Date(claim.incident_date).toLocaleDateString()}</dd>
          </div>
          <div>
            <dt className="text-gray-500">Claim Amount</dt>
            <dd className="font-medium">{formatCurrency(claim.amount_cents)}</dd>
          </div>
          {claim.policy_number && (
            <div>
              <dt className="text-gray-500">Policy Number</dt>
              <dd className="font-medium">{claim.policy_number}</dd>
            </div>
          )}
          {claim.resolved_at && (
            <div>
              <dt className="text-gray-500">Resolved</dt>
              <dd className="font-medium">{new Date(claim.resolved_at).toLocaleDateString()}</dd>
            </div>
          )}
        </dl>
        <div className="mt-4">
          <dt className="text-sm text-gray-500">Description</dt>
          <dd className="mt-1 whitespace-pre-wrap text-sm">{claim.description}</dd>
        </div>
      </section>

      {/* Adjuster Info */}
      {(claim.adjuster_name || claim.adjuster_phone || claim.adjuster_email) && (
        <section className="rounded-lg border border-gray-200 p-4">
          <h3 className="mb-3 text-sm font-semibold uppercase text-gray-500">Insurance Adjuster</h3>
          <dl className="grid grid-cols-3 gap-4 text-sm">
            {claim.adjuster_name && (
              <div>
                <dt className="text-gray-500">Name</dt>
                <dd className="font-medium">{claim.adjuster_name}</dd>
              </div>
            )}
            {claim.adjuster_phone && (
              <div>
                <dt className="text-gray-500">Phone</dt>
                <dd className="font-medium">{claim.adjuster_phone}</dd>
              </div>
            )}
            {claim.adjuster_email && (
              <div>
                <dt className="text-gray-500">Email</dt>
                <dd className="font-medium">{claim.adjuster_email}</dd>
              </div>
            )}
          </dl>
        </section>
      )}

      {/* Event Details */}
      {event && (
        <section className="rounded-lg border border-gray-200 p-4">
          <h3 className="mb-3 text-sm font-semibold uppercase text-gray-500">Linked Event</h3>
          <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
            <div>
              <dt className="text-gray-500">Event</dt>
              <dd className="font-medium">
                {String((event as Record<string, any>).title || 'Untitled')}
              </dd>
            </div>
            {(event as Record<string, any>).event_date && (
              <div>
                <dt className="text-gray-500">Date</dt>
                <dd className="font-medium">
                  {new Date(String((event as Record<string, any>).event_date)).toLocaleDateString()}
                </dd>
              </div>
            )}
            {(event as Record<string, any>).status && (
              <div>
                <dt className="text-gray-500">Event Status</dt>
                <dd className="font-medium">{String((event as Record<string, any>).status)}</dd>
              </div>
            )}
            {(event as Record<string, any>).guest_count && (
              <div>
                <dt className="text-gray-500">Guest Count</dt>
                <dd className="font-medium">
                  {Number((event as Record<string, any>).guest_count)}
                </dd>
              </div>
            )}
            {(event as Record<string, any>).venue_name && (
              <div className="col-span-2">
                <dt className="text-gray-500">Venue</dt>
                <dd className="font-medium">{String((event as Record<string, any>).venue_name)}</dd>
              </div>
            )}
          </dl>
        </section>
      )}

      {/* Client Info */}
      {client && (
        <section className="rounded-lg border border-gray-200 p-4">
          <h3 className="mb-3 text-sm font-semibold uppercase text-gray-500">Client Information</h3>
          <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
            <div>
              <dt className="text-gray-500">Name</dt>
              <dd className="font-medium">
                {client.first_name} {client.last_name}
              </dd>
            </div>
            {client.email && (
              <div>
                <dt className="text-gray-500">Email</dt>
                <dd className="font-medium">{client.email}</dd>
              </div>
            )}
            {client.phone && (
              <div>
                <dt className="text-gray-500">Phone</dt>
                <dd className="font-medium">{client.phone}</dd>
              </div>
            )}
            {client.company && (
              <div>
                <dt className="text-gray-500">Company</dt>
                <dd className="font-medium">{client.company}</dd>
              </div>
            )}
          </dl>
        </section>
      )}

      {/* Menu Served */}
      {menu.length > 0 && (
        <section className="rounded-lg border border-gray-200 p-4">
          <h3 className="mb-3 text-sm font-semibold uppercase text-gray-500">Menu Served</h3>
          <ul className="space-y-1 text-sm">
            {menu.map((item, i) => (
              <li key={i} className="text-gray-700">
                {String(
                  (item as Record<string, any>).name ||
                    (item as Record<string, any>).recipe_name ||
                    `Item ${i + 1}`
                )}
                {(item as Record<string, any>).course && (
                  <span className="ml-2 text-gray-400">
                    ({String((item as Record<string, any>).course)})
                  </span>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Event Timeline */}
      {timeline.length > 0 && (
        <section className="rounded-lg border border-gray-200 p-4">
          <h3 className="mb-3 text-sm font-semibold uppercase text-gray-500">Event Timeline</h3>
          <ol className="space-y-2 text-sm">
            {timeline.map((t) => (
              <li key={t.id} className="flex items-start gap-3">
                <span className="whitespace-nowrap text-gray-400">
                  {new Date(t.created_at).toLocaleString()}
                </span>
                <span>
                  {t.from_status} → {t.to_status}
                  {t.note && <span className="ml-1 text-gray-500">({t.note})</span>}
                </span>
              </li>
            ))}
          </ol>
        </section>
      )}

      {/* Evidence */}
      {claim.evidence_urls.length > 0 && (
        <section className="rounded-lg border border-gray-200 p-4">
          <h3 className="mb-3 text-sm font-semibold uppercase text-gray-500">
            Evidence / Attachments
          </h3>
          <ul className="space-y-1 text-sm">
            {claim.evidence_urls.map((url, i) => (
              <li key={i}>
                <a
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline"
                >
                  {url}
                </a>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Witness Statements */}
      {claim.witness_info && (
        <section className="rounded-lg border border-gray-200 p-4">
          <h3 className="mb-3 text-sm font-semibold uppercase text-gray-500">
            Witness Information
          </h3>
          <p className="whitespace-pre-wrap text-sm">{claim.witness_info}</p>
        </section>
      )}

      {/* Resolution Notes */}
      {claim.resolution_notes && (
        <section className="rounded-lg border border-gray-200 p-4">
          <h3 className="mb-3 text-sm font-semibold uppercase text-gray-500">Resolution Notes</h3>
          <p className="whitespace-pre-wrap text-sm">{claim.resolution_notes}</p>
        </section>
      )}
    </div>
  )
}
