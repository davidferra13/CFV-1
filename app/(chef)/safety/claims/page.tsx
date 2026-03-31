// Insurance Claims
// Lists all insurance claims filed by the chef.

import type { Metadata } from 'next'
import Link from 'next/link'
import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { Button } from '@/components/ui/button'

export const metadata: Metadata = { title: 'Insurance Claims' }

export default async function InsuranceClaimsPage() {
  const chef = await requireChef()
  const db: any = createServerClient()

  const { data: claims } = await db
    .from('insurance_claims')
    .select(
      'id, claim_number, incident_date, description, status, amount_cents, insurer, created_at'
    )
    .eq('tenant_id', chef.tenantId!)
    .order('incident_date', { ascending: false })

  const claimList = claims ?? []

  const statusColor: Record<string, string> = {
    open: 'text-amber-400',
    submitted: 'text-blue-400',
    approved: 'text-green-400',
    denied: 'text-red-400',
    closed: 'text-stone-400',
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-stone-100">Insurance Claims</h1>
          <p className="mt-1 text-sm text-stone-500">
            Track all insurance claims you have filed. Keep claim numbers, dates, and supporting
            documents in one place.
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
              New Claim
            </Button>
          </Link>
        </div>
      </div>

      {claimList.length === 0 ? (
        <div className="text-center py-20 bg-stone-800 rounded-xl border border-dashed border-stone-600">
          <h3 className="text-lg font-semibold text-stone-200 mb-1">No claims filed</h3>
          <p className="text-sm text-stone-500 mb-4 max-w-sm mx-auto">
            If you need to file an insurance claim, use the button above to document the details.
          </p>
          <Link href="/safety/claims/new">
            <Button variant="primary">File a Claim</Button>
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {claimList.map((claim: any) => (
            <div key={claim.id} className="bg-stone-800 rounded-xl p-4 border border-stone-700">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-stone-100">
                      {claim.claim_number ? `Claim #${claim.claim_number}` : 'Untitled Claim'}
                    </p>
                    {claim.status && (
                      <span
                        className={`text-xs font-medium capitalize ${statusColor[claim.status] ?? 'text-stone-400'}`}
                      >
                        {claim.status}
                      </span>
                    )}
                  </div>
                  {claim.insurer && <p className="text-sm text-stone-500">{claim.insurer}</p>}
                  {claim.description && (
                    <p className="text-sm text-stone-400 mt-1 line-clamp-2">{claim.description}</p>
                  )}
                </div>
                {claim.amount_cents && (
                  <p className="shrink-0 font-semibold text-stone-100">
                    ${(claim.amount_cents / 100).toLocaleString()}
                  </p>
                )}
              </div>
              {claim.incident_date && (
                <p className="text-xs text-stone-500 mt-2">
                  Incident: {new Date(claim.incident_date).toLocaleDateString()}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
