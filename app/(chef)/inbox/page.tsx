// Unified Inbox Page
// Aggregates chat, CRM messages, Wix submissions, and notifications
// into a single chronological feed with source filters.

import type { Metadata } from 'next'
import { requireChef } from '@/lib/auth/get-user'
import { getUnifiedInbox, getInboxStats } from '@/lib/inbox/actions'
import { InboxFeed } from '@/components/inbox/inbox-feed'

export const metadata: Metadata = { title: 'Inbox - ChefFlow' }

export default async function InboxPage() {
  await requireChef()

  const [items, stats] = await Promise.all([
    getUnifiedInbox({ limit: 50 }),
    getInboxStats(),
  ])

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-stone-900">Inbox</h1>
        <p className="text-stone-600 mt-1">
          Everything in one place — chat, messages, form submissions, and notifications.
        </p>
      </div>

      <InboxFeed items={items} stats={stats} />
    </div>
  )
}
