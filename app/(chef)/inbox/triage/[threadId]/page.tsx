import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { requireChef } from '@/lib/auth/get-user'
import { getThreadWithEvents, markThreadRead } from '@/lib/communication/actions'
import { getClientContextForThread } from '@/lib/communication/client-context'
import { ThreadDetailClient } from '@/components/communication/thread-detail-client'
import { ClientContextSidebar } from '@/components/communication/client-context-sidebar'

export const metadata: Metadata = { title: 'Thread' }

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

  // Fetch client context if thread is linked to a client (non-blocking)
  let clientContext = null
  if (detail.thread.client_id) {
    try {
      clientContext = await getClientContextForThread(detail.thread.client_id)
    } catch {
      // Sidebar is optional; degrade gracefully
    }
  }

  return (
    <div className="max-w-5xl mx-auto pb-32">
      <div className="mb-6 flex items-center gap-2 text-sm text-stone-500">
        <Link href="/inbox" className="hover:text-stone-300">
          Inbox
        </Link>
        <span>&rsaquo;</span>
        <span className="text-stone-100">{displayName}</span>
      </div>
      <div className="flex gap-6 items-start">
        <div className="flex-1 min-w-0 space-y-6">
          <ThreadDetailClient detail={detail} threadId={params.threadId} />
        </div>
        {clientContext && (
          <aside className="w-72 shrink-0 hidden lg:block">
            <ClientContextSidebar context={clientContext} />
          </aside>
        )}
      </div>
    </div>
  )
}
