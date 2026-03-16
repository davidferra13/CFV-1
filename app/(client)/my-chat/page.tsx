// Client Chat Inbox - View conversations with your chef

import type { Metadata } from 'next'
import { requireClient } from '@/lib/auth/get-user'
import { getConversationInbox } from '@/lib/chat/actions'
import { ChatInbox } from '@/components/chat/chat-inbox'

export const metadata: Metadata = { title: 'Messages - ChefFlow' }

export default async function ClientChatInboxPage() {
  const user = await requireClient()
  const conversations = await getConversationInbox()

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-stone-100">Messages</h1>
        <p className="text-stone-400 mt-1">Chat with your chef</p>
      </div>

      <ChatInbox
        initialConversations={conversations}
        currentUserId={user.id}
        tenantId={user.tenantId!}
        basePath="/my-chat"
      />
    </div>
  )
}
