// Insurance Claims
// Lists all insurance claims filed by the chef.

import type { Metadata } from 'next'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { getClaims, getClaimStats } from '@/lib/compliance/claim-actions'

export const metadata: Metadata = { title: 'Insurance Claims' }

type Claim = Awaited<ReturnType<typeof getClaims>>[number]

const statusColor: Record<string, string> = {
  documenting: 'text-amber-400',
  filed: 'text-blue-400',
  under_review: 'text-sky-400',
  approved: 'text-green-400',
  denied: 'text-red-400',
  settled: 'text-emerald-400',
}

const claimTypeLabels: Record<string, string> = {
  property_damage: 'Property Damage',
  bodily_injury: 'Bodily Injury',
  food_illness: 'Food Illness',
  equipment_loss: 'Equipment Loss',
  vehicle: 'Vehicle',
  other: 'Other',
}

function formatMoney(cents: number | null) {
  if (cents == null) return null
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(cents / 100)
}

function formatDate(date: string) {
  return new Date(`${date}T00:00:00`).toLocaleDateString()
}

function formatStatus(status: string) {
  return status.replaceAll('_', ' ')
}

function getEvidenceCount(claim: Claim) {
  return Array.isArray(claim.evidence_urls) ? claim.evidence_urls.length : 0
}

function ClaimsLoadError() {
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-stone-100">Insurance Claims</h1>
        <p className="mt-1 text-sm text-stone-500">
          Track all insurance claims you have filed. Keep claim details and supporting documents in
          one place.
        </p>
      </div>

      <div className="rounded-xl border border-red-500/30 bg-red-950/30 p-5">
        <h2 className="text-base font-semibold text-red-100">Claims could not be loaded</h2>
        <p className="mt-1 text-sm text-red-200/80">
          Refresh the page before filing or reviewing insurance claims.
        </p>
      </div>
    </div>
  )
}

export default async function InsuranceClaimsPage() {
  let claimList: Claim[]
  let stats: Awaited<ReturnType<typeof getClaimStats>>

  try {
    const [loadedClaims, loadedStats] = await Promise.all([getClaims(), getClaimStats()])
    claimList = loadedClaims
    stats = loadedStats
  } catch {
    return <ClaimsLoadError />
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-stone-100">Insurance Claims</h1>
          <p className="mt-1 text-sm text-stone-500">
            Track all insurance claims you have filed. Keep claim details and supporting documents
            in one place.
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/safety/claims/documents">
            <Button variant="secondary" size="sm">
              Documents
            </Button>
          </Link>
          <Link href="/safety/claims/new">
            <Button variant="primary" size="sm">
              File Claim
            </Button>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-stone-700 bg-stone-800 p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-stone-500">Open Claims</p>
          <p className="mt-2 text-2xl font-semibold text-stone-100">{stats.openClaims}</p>
        </div>
        <div className="rounded-xl border border-stone-700 bg-stone-800 p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-stone-500">
            Total Claimed
          </p>
          <p className="mt-2 text-2xl font-semibold text-stone-100">
            {formatMoney(stats.totalClaimedCents)}
          </p>
        </div>
        <div className="rounded-xl border border-stone-700 bg-stone-800 p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-stone-500">
            Approved or Settled
          </p>
          <p className="mt-2 text-2xl font-semibold text-stone-100">
            {formatMoney(stats.totalSettledCents)}
          </p>
        </div>
      </div>

      {claimList.length === 0 ? (
        <div className="text-center py-20 bg-stone-800 rounded-xl border border-dashed border-stone-600">
          <h3 className="text-lg font-semibold text-stone-200 mb-1">No claims filed</h3>
          <p className="text-sm text-stone-500 max-w-sm mx-auto">
            File a claim to start documenting the incident, policy details, insurer contacts, and
            supporting evidence.
          </p>
          <div className="mt-5">
            <Link href="/safety/claims/new">
              <Button variant="primary" size="sm">
                File First Claim
              </Button>
            </Link>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {claimList.map((claim) => {
            const amount = formatMoney(claim.amount_cents)
            const evidenceCount = getEvidenceCount(claim)

            return (
              <div key={claim.id} className="bg-stone-800 rounded-xl p-4 border border-stone-700">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-stone-100">
                        {claimTypeLabels[claim.claim_type] ?? 'Insurance Claim'}
                      </p>
                      {claim.status && (
                        <span
                          className={`text-xs font-medium capitalize ${statusColor[claim.status] ?? 'text-stone-400'}`}
                        >
                          {formatStatus(claim.status)}
                        </span>
                      )}
                    </div>
                    {claim.policy_number && (
                      <p className="text-sm text-stone-500">Policy {claim.policy_number}</p>
                    )}
                    {claim.description && (
                      <p className="text-sm text-stone-400 mt-1 line-clamp-2">
                        {claim.description}
                      </p>
                    )}
                    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-stone-500">
                      <span>Incident: {formatDate(claim.incident_date)}</span>
                      {claim.adjuster_name && <span>Adjuster: {claim.adjuster_name}</span>}
                      {evidenceCount > 0 && (
                        <span>
                          {evidenceCount} evidence {evidenceCount === 1 ? 'link' : 'links'}
                        </span>
                      )}
                    </div>
                  </div>
                  {amount && <p className="shrink-0 font-semibold text-stone-100">{amount}</p>}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
