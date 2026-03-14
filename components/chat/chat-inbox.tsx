'use client'

import { useState, useEffect } from 'react'
import { MessageCircle } from 'lucide-react'
import { ChatInboxItem } from './chat-inbox-item'
import { subscribeToInboxUpdates } from '@/lib/chat/realtime'
import type { ConversationWithDetails } from '@/lib/chat/types'

interface ChatInboxProps {
  initialConversations: ConversationWithDetails[]
  currentUserId: string
  tenantId: string
  basePath: string // '/chat' for chef, '/my-chat' for client
}

export function ChatInbox({
  initialConversations,
  currentUserId,
  tenantId,
  basePath,
}: ChatInboxProps) {
  const [conversations, setConversations] = useState(initialConversations)

  // Subscribe to real-time inbox updates
  useEffect(() => {
    const unsubscribe = subscribeToInboxUpdates(tenantId, (updated) => {
      setConversations((prev) => {
        const idx = prev.findIndex((c) => c.id === updated.id)
        if (idx === -1) return prev

        // Update the conversation in place
        const updatedConv = {
          ...prev[idx],
          last_message_at: updated.last_message_at as string,
          last_message_preview: updated.last_message_preview as string,
          last_message_sender_id: updated.last_message_sender_id as string,
        }

        // Increment unread if the message wasn't from us
        if (updated.last_message_sender_id !== currentUserId) {
          updatedConv.unread_count = (updatedConv.unread_count || 0) + 1
        }

        // Re-sort: move updated conversation to top
        const newList = prev.filter((c) => c.id !== updated.id)
        return [updatedConv, ...newList]
      })
    })

    return unsubscribe
  }, [tenantId, currentUserId])

  if (conversations.length === 0) {
    return (
      <div className="text-center py-16">
        <MessageCircle className="w-12 h-12 text-stone-300 mx-auto mb-3" />
        <p className="text-stone-500 text-sm">No conversations yet</p>
        <p className="text-stone-400 text-xs mt-1">
          Click &quot;+ New Conversation&quot; above to start chatting with a client
        </p>
      </div>
    )
  }

  return (
    <div className="bg-stone-900 rounded-xl border border-stone-700 overflow-hidden">
      {conversations.map((conv) => (
        <ChatInboxItem
          key={conv.id}
          conversation={conv}
          currentUserId={currentUserId}
          basePath={basePath}
        />
      ))}
    </div>
  )
}
