// Chef Chat View - Individual conversation with a client

import type { Metadata } from 'next'
import { requireChef } from '@/lib/auth/get-user'
import { redirect } from 'next/navigation'
import {
  getConversation,
  getConversationMessages,
  getConversationParticipants,
  markConversationRead,
} from '@/lib/chat/actions'
import { getClientNotes } from '@/lib/notes/actions'
import { getPendingInsights } from '@/lib/insights/actions'
import { ChatView } from '@/components/chat/chat-view'
import { ChatSidebar } from '@/components/chat/chat-sidebar'
import { createServerClient } from '@/lib/db/server'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>
}): Promise<Metadata> {
  const { id } = await params
  const conversation = await getConversation(id)
  return {
    title: 'Chat',
  }
}

export default async function ChefChatViewPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireChef()
  const { id: conversationId } = await params

  // Load conversation
  let conversation: Awaited<ReturnType<typeof getConversation>>
  try {
    conversation = await getConversation(conversationId)
  } catch {
    redirect('/chat')
  }
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

  // Get client participant for sidebar
  const clientParticipant = participants.find((p) => p.auth_user_id !== user.id)
  let clientId: string | null = null
  let clientName = clientParticipant?.name || 'Client'
  let pinnedNotes: any[] = []

  // Fetch insights for the conversation (regardless of client resolution)
  const pendingInsights = await getPendingInsights(conversationId)

  if (clientParticipant) {
    // Resolve client entity ID from auth_user_id
    const db: any = createServerClient()
    const { data: clientRow } = await db
      .from('clients')
      .select('id')
      .eq('auth_user_id', clientParticipant.auth_user_id)
      .eq('tenant_id', user.tenantId!)
      .single()

    if (clientRow) {
      clientId = clientRow.id
      pinnedNotes = await getClientNotes(clientRow.id, { pinned_only: true })
    }
  }

  return (
    <div className="flex h-[calc(100dvh-7rem)] lg:h-[calc(100vh-64px)]">
      <div className="flex-1 min-w-0">
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
      </div>
      {clientId && (
        <div className="hidden lg:block">
          <ChatSidebar
            clientId={clientId}
            clientName={clientName}
            pinnedNotes={pinnedNotes}
            initialInsights={pendingInsights}
          />
        </div>
      )}
    </div>
  )
}
