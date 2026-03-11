import Link from 'next/link'
import { ArrowLeft } from '@/components/ui/icons'
import { ApprovalQueueClient } from '@/components/messages/approval-queue-client'
import { requireChef } from '@/lib/auth/get-user'
import { getApprovalQueueMessages } from '@/lib/gmail/actions'

export default async function MessageApprovalQueuePage() {
  await requireChef()
  const drafts = await getApprovalQueueMessages()

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-stone-100">Email Approval Queue</h1>
          <p className="mt-1 text-sm text-stone-400">
            Review, edit, and send every outbound email draft from one place.
          </p>
        </div>
        <Link
          href="/queue"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-brand-400 hover:text-brand-300"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Priority Queue
        </Link>
      </div>

      <ApprovalQueueClient drafts={drafts} />
    </div>
  )
}
