// Claim Documents
// Documents and files associated with insurance claims.

import type { Metadata } from 'next'
import Link from 'next/link'
import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { Button } from '@/components/ui/button'

export const metadata: Metadata = { title: 'Claim Documents' }

export default async function ClaimDocumentsPage() {
  const chef = await requireChef()
  const db: any = createServerClient()

  const { data: docs } = await db
    .from('insurance_claim_documents')
    .select('id, file_name, file_url, document_type, claim_number, created_at')
    .eq('tenant_id', chef.tenantId!)
    .order('created_at', { ascending: false })

  const docList = docs ?? []

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
        <div className="text-center py-20 bg-stone-800 rounded-xl border border-dashed border-stone-600">
          <h3 className="text-lg font-semibold text-stone-200 mb-1">No documents yet</h3>
          <p className="text-sm text-stone-500 max-w-sm mx-auto">
            Supporting documents attached to your insurance claims will appear here.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {docList.map((doc: any) => (
            <div
              key={doc.id}
              className="bg-stone-800 rounded-xl p-4 border border-stone-700 flex items-center justify-between gap-4"
            >
              <div>
                <p className="font-medium text-stone-100">{doc.file_name ?? 'Document'}</p>
                <p className="text-sm text-stone-500">
                  {doc.document_type ?? 'Document'}
                  {doc.claim_number ? ` - Claim #${doc.claim_number}` : ''}
                </p>
              </div>
              {doc.file_url && (
                <a
                  href={doc.file_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="shrink-0 text-sm text-amber-400 hover:text-amber-300 font-medium"
                >
                  View
                </a>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
