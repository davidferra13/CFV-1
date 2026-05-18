import type { Metadata } from 'next'
import { requireChef } from '@/lib/auth/get-user'
import { getDraftMessages } from '@/lib/communication/scheduled-message-actions'
import { DraftReviewClient } from './draft-review-client'

export const metadata: Metadata = { title: 'Draft Review' }

export default async function DraftsPage() {
  await requireChef()

  const { data: drafts, error } = await getDraftMessages()

  return (
    <div className="min-h-screen bg-stone-900 p-6">
      <div className="mx-auto max-w-4xl">
        <h1 className="mb-1 text-2xl font-semibold text-stone-100">Draft Review Queue</h1>
        <p className="mb-6 text-sm text-stone-400">
          Review, edit, and approve auto-generated messages before they send.
        </p>
        <DraftReviewClient initialDrafts={drafts ?? []} initialError={error} />
      </div>
    </div>
  )
}
