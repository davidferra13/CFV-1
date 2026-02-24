'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { format as formatDate } from 'date-fns'
import { Loader2 } from 'lucide-react'
import { ChatHeader } from './chat-header'
import { ChatMessageBubble } from './chat-message-bubble'
import { ChatInputBar } from './chat-input-bar'
import { ChatFileUpload } from './chat-file-upload'
import { ChatTypingIndicator } from './chat-typing-indicator'
import { ChatQuickReplies } from './chat-quick-replies'
import { ChatSearch } from './chat-search'
import {
  subscribeToChatMessages,
  createTypingIndicator,
  subscribeToPresence,
} from '@/lib/chat/realtime'
import {
  sendChatMessage,
  sendFileMessage,
  getConversationMessages,
  markConversationRead,
} from '@/lib/chat/actions'
import type {
  ChatMessage,
  Conversation,
  ConversationParticipant,
  ParticipantRole,
} from '@/lib/chat/types'

interface ParticipantInfo extends ConversationParticipant {
  name: string
  email: string
}

interface ChatViewProps {
  conversationId: string
  initialMessages: ChatMessage[]
  participants: ParticipantInfo[]
  currentUserId: string
  currentUserName: string
  currentUserRole: 'chef' | 'client'
  hasMore: boolean
  nextCursor: string | null
  conversation: Conversation
}

export function ChatView({
  conversationId,
  initialMessages,
  participants,
  currentUserId,
  currentUserName,
  currentUserRole,
  hasMore: initialHasMore,
  nextCursor: initialCursor,
  conversation,
}: ChatViewProps) {
  // Messages state (reversed for display: oldest at top)
  const [messages, setMessages] = useState<ChatMessage[]>([...initialMessages].reverse())
  const [hasMore, setHasMore] = useState(initialHasMore)
  const [nextCursor, setNextCursor] = useState(initialCursor)
  const [loadingMore, setLoadingMore] = useState(false)
  const [showFileUpload, setShowFileUpload] = useState(false)
  const [showSearch, setShowSearch] = useState(false)

  // Typing and presence
  const [typingUsers, setTypingUsers] = useState<Map<string, string>>(new Map())
  const [onlineUserIds, setOnlineUserIds] = useState<string[]>([])

  // Refs
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const messagesContainerRef = useRef<HTMLDivElement>(null)
  const isAtBottomRef = useRef(true)

  // Find the other participant
  const otherParticipant = participants.find((p) => p.auth_user_id !== currentUserId)
  const otherName = otherParticipant?.name || 'Unknown'
  const otherRole = (otherParticipant?.role || 'client') as ParticipantRole
  const isOtherOnline = otherParticipant
    ? onlineUserIds.includes(otherParticipant.auth_user_id)
    : false

  // Build sender lookup map
  const senderMap = new Map<string, { name: string; role: ParticipantRole }>()
  for (const p of participants) {
    senderMap.set(p.auth_user_id, { name: p.name, role: p.role as ParticipantRole })
  }

  const otherParticipantLastReadAt = otherParticipant?.last_read_at || null

  // Quick replies: show only for clients when last message is from chef
  const lastMessage = messages[messages.length - 1]
  const showQuickReplies =
    currentUserRole === 'client' &&
    lastMessage &&
    lastMessage.sender_id !== currentUserId &&
    lastMessage.message_type !== 'system'

  const backHref = currentUserRole === 'chef' ? '/chat' : '/my-chat'

  // Scroll to bottom on new messages (only if already at bottom)
  const scrollToBottom = useCallback(() => {
    if (isAtBottomRef.current) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [])

  // Track scroll position
  const handleScroll = useCallback(() => {
    const container = messagesContainerRef.current
    if (!container) return
    const { scrollTop, scrollHeight, clientHeight } = container
    isAtBottomRef.current = scrollHeight - scrollTop - clientHeight < 50
  }, [])

  // Scroll to bottom on initial load
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView()
  }, [])

  // Subscribe to new messages
  useEffect(() => {
    const unsubscribe = subscribeToChatMessages(conversationId, (newMessage) => {
      setMessages((prev) => {
        // Prevent duplicates
        if (prev.some((m) => m.id === newMessage.id)) return prev
        return [...prev, newMessage]
      })

      // Mark as read if the message is from someone else
      if (newMessage.sender_id !== currentUserId) {
        markConversationRead(conversationId)
      }

      // Scroll to bottom for new messages
      setTimeout(scrollToBottom, 100)
    })

    return unsubscribe
  }, [conversationId, currentUserId, scrollToBottom])

  // Typing indicators
  useEffect(() => {
    const { sendTyping, unsubscribe } = createTypingIndicator(
      conversationId,
      currentUserId,
      currentUserName,
      (state) => {
        setTypingUsers((prev) => {
          const next = new Map(prev)
          if (state.isTyping) {
            next.set(state.userId, state.userName)
          } else {
            next.delete(state.userId)
          }
          return next
        })
      }
    )

    // Store sendTyping for the input bar
    sendTypingRef.current = sendTyping

    return unsubscribe
  }, [conversationId, currentUserId, currentUserName])

  const sendTypingRef = useRef<(isTyping: boolean) => void>(() => {})

  // Presence
  useEffect(() => {
    const unsubscribe = subscribeToPresence(conversationId, currentUserId, setOnlineUserIds)

    return unsubscribe
  }, [conversationId, currentUserId])

  // Load older messages (infinite scroll up)
  const loadMore = useCallback(async () => {
    if (!hasMore || loadingMore || !nextCursor) return
    setLoadingMore(true)

    try {
      const result = await getConversationMessages({
        conversation_id: conversationId,
        cursor: nextCursor,
        limit: 50,
      })

      setMessages((prev) => [...result.messages.reverse(), ...prev])
      setHasMore(result.hasMore)
      setNextCursor(result.nextCursor)
    } finally {
      setLoadingMore(false)
    }
  }, [hasMore, loadingMore, nextCursor, conversationId])

  // Detect scroll to top for loading more
  useEffect(() => {
    const container = messagesContainerRef.current
    if (!container) return

    const handleScrollTop = () => {
      if (container.scrollTop < 100 && hasMore && !loadingMore) {
        loadMore()
      }
    }

    container.addEventListener('scroll', handleScrollTop)
    return () => container.removeEventListener('scroll', handleScrollTop)
  }, [hasMore, loadingMore, loadMore])

  // Send text message
  const handleSendText = async (text: string) => {
    await sendChatMessage({
      conversation_id: conversationId,
      message_type: 'text',
      body: text,
    })
  }

  // Send file/image message
  const handleSendFile = async (file: File, caption: string) => {
    const formData = new FormData()
    formData.set('file', file)
    if (caption) formData.set('caption', caption)

    await sendFileMessage(conversationId, formData)
    setShowFileUpload(false)
  }

  // Group messages by date for date separators
  const groupedMessages = groupMessagesByDate(messages)

  return (
    <div className="flex flex-col h-full bg-stone-800">
      {/* Header */}
      <ChatHeader
        participantName={otherName}
        participantRole={otherRole}
        isOnline={isOtherOnline}
        conversation={conversation}
        backHref={backHref}
        onSearchToggle={() => setShowSearch((prev) => !prev)}
      />

      {/* Search overlay */}
      {showSearch && (
        <ChatSearch conversationId={conversationId} onClose={() => setShowSearch(false)} />
      )}

      {/* Messages area */}
      <div
        ref={messagesContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto overflow-x-hidden px-4 py-4"
      >
        {/* Load more indicator */}
        {loadingMore && (
          <div className="flex justify-center py-3">
            <Loader2 className="w-5 h-5 text-stone-400 animate-spin" />
          </div>
        )}

        {hasMore && !loadingMore && (
          <button
            type="button"
            onClick={loadMore}
            className="w-full text-center py-2 text-xs text-stone-400 hover:text-stone-400"
          >
            Load older messages
          </button>
        )}

        {/* Messages */}
        {groupedMessages.map((group) => (
          <div key={group.date}>
            <div className="flex justify-center my-4">
              <span className="text-xs text-stone-400 bg-stone-800 px-3 py-1 rounded-full">
                {group.label}
              </span>
            </div>
            {group.messages.map((msg) => {
              const isOwn = msg.sender_id === currentUserId
              const sender = senderMap.get(msg.sender_id)
              return (
                <ChatMessageBubble
                  key={msg.id}
                  message={msg}
                  isOwn={isOwn}
                  senderName={sender?.name || 'System'}
                  senderRole={sender?.role || 'client'}
                  isChefViewer={currentUserRole === 'chef'}
                  otherParticipantLastReadAt={otherParticipantLastReadAt}
                />
              )
            })}
          </div>
        ))}

        {/* Typing indicator */}
        {typingUsers.size > 0 && (
          <ChatTypingIndicator userName={Array.from(typingUsers.values())[0]} />
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* File upload overlay */}
      {showFileUpload && (
        <ChatFileUpload onUpload={handleSendFile} onCancel={() => setShowFileUpload(false)} />
      )}

      {/* Quick replies for clients */}
      <ChatQuickReplies visible={!!showQuickReplies && !showFileUpload} onSelect={handleSendText} />

      {/* Input bar */}
      {!showFileUpload && (
        <ChatInputBar
          onSendText={handleSendText}
          onAttach={() => setShowFileUpload(true)}
          onTyping={(isTyping) => sendTypingRef.current(isTyping)}
        />
      )}
    </div>
  )
}

// ─── Helpers ────────────────────────────────────────

interface MessageGroup {
  date: string
  label: string
  messages: ChatMessage[]
}

function groupMessagesByDate(messages: ChatMessage[]): MessageGroup[] {
  const groups: MessageGroup[] = []
  let currentDate = ''

  for (const msg of messages) {
    const date = new Date(msg.created_at)
    const dateKey = date.toDateString()

    if (dateKey !== currentDate) {
      currentDate = dateKey

      const today = new Date()
      const yesterday = new Date(today)
      yesterday.setDate(yesterday.getDate() - 1)

      let label: string
      if (dateKey === today.toDateString()) {
        label = 'Today'
      } else if (dateKey === yesterday.toDateString()) {
        label = 'Yesterday'
      } else {
        label = formatDate(date, 'MMMM d, yyyy')
      }

      groups.push({ date: dateKey, label, messages: [] })
    }

    groups[groups.length - 1].messages.push(msg)
  }

  return groups
}
