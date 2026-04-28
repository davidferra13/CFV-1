// Claim Documents
// Documents and files associated with insurance claims.

import type { Metadata } from 'next'
import Link from 'next/link'
import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { Button } from '@/components/ui/button'

export const metadata: Metadata = { title: 'Claim Documents' }

type ClaimDocumentRow = {
  id: string
  claim_type: string
  status: string
  incident_date: string
  description: string
  policy_number: string | null
  evidence_urls: unknown
  created_at: string
}

type ClaimEvidenceDocument = {
  id: string
  fileName: string
  fileUrl: string
  claimType: string
  status: string
  incidentDate: string
  policyNumber: string | null
  description: string
}

function normalizeEvidenceUrls(value: unknown) {
  if (!Array.isArray(value)) return []

  return value.filter((item): item is string => {
    if (typeof item !== 'string') return false

    try {
      const url = new URL(item)
      return url.protocol === 'http:' || url.protocol === 'https:'
    } catch {
      return false
    }
  })
}

function formatClaimType(value: string) {
  return value
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

function getDocumentName(url: string, index: number) {
  try {
    const parsed = new URL(url)
    const lastPathPart = parsed.pathname.split('/').filter(Boolean).pop()
    if (lastPathPart) return decodeURIComponent(lastPathPart)
  } catch {
    // normalizeEvidenceUrls already validates URLs. Keep a fallback for malformed legacy rows.
  }

  return `Evidence ${index + 1}`
}

function formatDate(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(date)
}

export default async function ClaimDocumentsPage() {
  const chef = await requireChef()
  const db: any = createServerClient()

  const { data: claims, error } = await db
    .from('insurance_claims')
    .select(
      'id, claim_type, status, incident_date, description, policy_number, evidence_urls, created_at'
    )
    .eq('chef_id', chef.tenantId!)
    .order('created_at', { ascending: false })

  if (error) {
    throw new Error(`Failed to load claim documents: ${error.message}`)
  }

  const docList = ((claims ?? []) as ClaimDocumentRow[]).flatMap((claim) =>
    normalizeEvidenceUrls(claim.evidence_urls).map(
      (url, index): ClaimEvidenceDocument => ({
        id: `${claim.id}-${index}`,
        fileName: getDocumentName(url, index),
        fileUrl: url,
        claimType: claim.claim_type,
        status: claim.status,
        incidentDate: claim.incident_date,
        policyNumber: claim.policy_number,
        description: claim.description,
      })
    )
  )

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-stone-100">Claim Documents</h1>
          <p className="mt-1 text-sm text-stone-500">
            Supporting documents for your insurance claims: photos, receipts, police reports, and
            correspondence.
          </p>
        </div>
        <Link href="/safety/claims">
          <Button variant="secondary" size="sm">
            All Claims
          </Button>
        </Link>
      </div>

      {docList.length === 0 ? (
        <div className="rounded-lg border border-dashed border-stone-600 bg-stone-800 py-20 text-center">
          <h3 className="text-lg font-semibold text-stone-200 mb-1">No documents yet</h3>
          <p className="text-sm text-stone-500 max-w-sm mx-auto">
            Add evidence URLs when filing or updating a claim, and they will appear here.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {docList.map((doc) => (
            <div
              key={doc.id}
              className="flex items-center justify-between gap-4 rounded-lg border border-stone-700 bg-stone-800 p-4"
            >
              <div className="min-w-0">
                <p className="font-medium text-stone-100">{doc.fileName}</p>
                <p className="mt-1 text-sm text-stone-500">
                  {formatClaimType(doc.claimType)} claim, {doc.status.replaceAll('_', ' ')},{' '}
                  incident {formatDate(doc.incidentDate)}
                  {doc.policyNumber ? `, policy ${doc.policyNumber}` : ''}
                </p>
                <p className="mt-1 truncate text-xs text-stone-600">{doc.description}</p>
              </div>
              <a
                href={doc.fileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="shrink-0 text-sm font-medium text-amber-400 hover:text-amber-300"
              >
                View
              </a>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
