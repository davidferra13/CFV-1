// Chef Chat View — Individual conversation with a client

import { requireChef } from '@/lib/auth/get-user'
import { redirect } from 'next/navigation'
import {
  getConversation,
  getConversationMessages,
  getConversationParticipants,
  markConversationRead,
} from '@/lib/chat/actions'
import { ChatView } from '@/components/chat/chat-view'

export default async function ChefChatViewPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const user = await requireChef()
  const { id: conversationId } = await params

  // Load conversation
  const conversation = await getConversation(conversationId)
  if (!conversation) {
    redirect('/chat')
  }

  // Load messages and participants in parallel
  const [messagesResult, participants] = await Promise.all([
    getConversationMessages({ conversation_id: conversationId, limit: 50 }),
    getConversationParticipants(conversationId),
  ])

  // Mark as read on page load
  await markConversationRead(conversationId)

  // Get chef's display name
  const chefParticipant = participants.find((p) => p.auth_user_id === user.id)
  const chefName = chefParticipant?.name || 'Chef'

  return (
    <ChatView
      conversationId={conversationId}
      initialMessages={messagesResult.messages}
      participants={participants}
      currentUserId={user.id}
      currentUserName={chefName}
      currentUserRole="chef"
      hasMore={messagesResult.hasMore}
      nextCursor={messagesResult.nextCursor}
      conversation={conversation}
    />
  )
}
