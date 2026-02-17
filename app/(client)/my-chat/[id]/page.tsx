// Client Chat View — Individual conversation with your chef

import { requireClient } from '@/lib/auth/get-user'
import { redirect } from 'next/navigation'
import {
  getConversation,
  getConversationMessages,
  getConversationParticipants,
  markConversationRead,
} from '@/lib/chat/actions'
import { ChatView } from '@/components/chat/chat-view'

export default async function ClientChatViewPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const user = await requireClient()
  const { id: conversationId } = await params

  // Load conversation
  const conversation = await getConversation(conversationId)
  if (!conversation) {
    redirect('/my-chat')
  }

  // Load messages and participants in parallel
  const [messagesResult, participants] = await Promise.all([
    getConversationMessages({ conversation_id: conversationId, limit: 50 }),
    getConversationParticipants(conversationId),
  ])

  // Mark as read on page load
  await markConversationRead(conversationId)

  // Get client's display name
  const clientParticipant = participants.find((p) => p.auth_user_id === user.id)
  const clientName = clientParticipant?.name || 'Client'

  return (
    <ChatView
      conversationId={conversationId}
      initialMessages={messagesResult.messages}
      participants={participants}
      currentUserId={user.id}
      currentUserName={clientName}
      currentUserRole="client"
      hasMore={messagesResult.hasMore}
      nextCursor={messagesResult.nextCursor}
      conversation={conversation}
    />
  )
}
