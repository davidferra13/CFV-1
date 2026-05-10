import { Bot } from '@/components/ui/icons'
import { requireChef } from '@/lib/auth/get-user'
import { getConversations } from '@/lib/remy/actions'
import { RemyHistoryClient } from './remy-history-client'

export const metadata = {
  title: 'Remy History',
  description: 'Browse your conversations with Remy',
}

export default async function RemyHistoryPage() {
  await requireChef()

  const conversations = await getConversations()

  return (
    <div className="container max-w-4xl py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex items-center justify-center h-10 w-10 rounded-full bg-brand-900">
          <Bot className="h-5 w-5 text-brand-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-stone-100">Remy History</h1>
          <p className="text-sm text-stone-400">Browse your conversations with Remy</p>
        </div>
      </div>

      <RemyHistoryClient initialConversations={conversations} />
    </div>
  )
}
