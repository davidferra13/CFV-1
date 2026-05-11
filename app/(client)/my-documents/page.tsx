import type { Metadata } from 'next'
import { requireClient } from '@/lib/auth/get-user'
import { getClientDocuments } from '@/lib/documents/client-document-actions'
import { DocumentsClient } from './documents-client'
import { ActivityTracker } from '@/components/activity/activity-tracker'

export const metadata: Metadata = { title: 'My Documents' }

export default async function MyDocumentsPage() {
  await requireClient()
  const documents = await getClientDocuments()

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-stone-100">Documents</h1>
        <p className="text-stone-400 mt-1">
          Contracts, invoices, and proposals from all your events.
        </p>
      </div>
      <DocumentsClient documents={documents} />
      <ActivityTracker eventType="page_viewed" metadata={{ document_count: documents.length }} />
    </div>
  )
}
