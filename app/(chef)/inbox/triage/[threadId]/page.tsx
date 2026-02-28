import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { requireChef } from '@/lib/auth/get-user'
import { getThreadWithEvents, markThreadRead } from '@/lib/communication/actions'
import { ThreadDetailClient } from '@/components/communication/thread-detail-client'

export const metadata: Metadata = { title: 'Thread — ChefFlow' }

export default async function ThreadDetailPage({ params }: { params: { threadId: string } }) {
  await requireChef()

  let detail
  try {
    detail = await getThreadWithEvents(params.threadId)
    // Mark thread as read when opened (non-blocking)
    markThreadRead(params.threadId).catch(() => {})
  } catch {
    notFound()
  }

  const displayName = detail.thread.client_name ?? detail.events[0]?.sender_identity ?? 'Unknown'

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-32">
      <div className="flex items-center gap-2 text-sm text-stone-500">
        <Link href="/inbox" className="hover:text-stone-300">
          Inbox
        </Link>
        <span>›</span>
        <span className="text-stone-100">{displayName}</span>
      </div>

      <ThreadDetailClient detail={detail} threadId={params.threadId} />
    </div>
  )
}
