// Chef Chat Inbox — Real-time messaging with clients

import type { Metadata } from 'next'
import { requireChef } from '@/lib/auth/get-user'
import { getConversationInbox } from '@/lib/chat/actions'
import { getInquiriesNeedingFirstContact } from '@/lib/inquiries/actions'
import { ChatInbox } from '@/components/chat/chat-inbox'
import { NeedsFirstContact } from '@/components/chat/needs-first-contact'
import { NewConversationButton } from '@/components/chat/new-conversation-button'

export const metadata: Metadata = { title: 'Messages - ChefFlow' }

export default async function ChefChatInboxPage() {
  const user = await requireChef()
  const [conversations, needsContact] = await Promise.all([
    getConversationInbox(),
    getInquiriesNeedingFirstContact(),
  ])

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-stone-100">Messages</h1>
          <p className="text-stone-400 mt-1">Chat with your clients in real time</p>
        </div>
        <NewConversationButton />
      </div>

      <NeedsFirstContact inquiries={needsContact} />

      <ChatInbox
        initialConversations={conversations}
        currentUserId={user.id}
        tenantId={user.tenantId!}
        basePath="/chat"
      />
    </div>
  )
}
