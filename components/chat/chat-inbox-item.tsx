'use client'

import Link from 'next/link'
import { format, isToday, isYesterday } from 'date-fns'
import { ChatUnreadBadge } from './chat-unread-badge'
import { ChatPresenceDot } from './chat-presence-dot'
import type { ConversationWithDetails } from '@/lib/chat/types'

interface ChatInboxItemProps {
  conversation: ConversationWithDetails
  currentUserId: string
  isOnline?: boolean
  basePath: string // '/chat' for chef, '/my-chat' for client
}

function formatMessageTime(dateStr: string): string {
  const date = new Date(dateStr)
  if (isToday(date)) return format(date, 'h:mm a')
  if (isYesterday(date)) return 'Yesterday'
  return format(date, 'MMM d')
}

export function ChatInboxItem({
  conversation,
  currentUserId,
  isOnline = false,
  basePath,
}: ChatInboxItemProps) {
  const name = conversation.other_participant_name || conversation.other_participant_email || 'Unknown'
  const initial = name.charAt(0).toUpperCase()
  const isLastMessageFromMe = conversation.last_message_sender_id === currentUserId

  const contextBadge =
    conversation.context_type === 'event'
      ? 'Event'
      : conversation.context_type === 'inquiry'
        ? 'Inquiry'
        : null

  return (
    <Link
      href={`${basePath}/${conversation.id}`}
      className="flex items-center gap-3 px-4 py-3 hover:bg-stone-50 transition-colors border-b border-stone-100 last:border-b-0"
    >
      {/* Avatar */}
      <div className="relative flex-shrink-0">
        <div className="w-11 h-11 rounded-full bg-stone-200 flex items-center justify-center">
          <span className="text-base font-medium text-stone-600">{initial}</span>
        </div>
        <div className="absolute -bottom-0.5 -right-0.5">
          <ChatPresenceDot online={isOnline} />
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-0.5">
          <div className="flex items-center gap-2 min-w-0">
            <p className={`text-sm truncate ${conversation.unread_count > 0 ? 'font-semibold text-stone-900' : 'font-medium text-stone-800'}`}>
              {name}
            </p>
            {contextBadge && (
              <span className="flex-shrink-0 text-[10px] px-1.5 py-0.5 rounded bg-stone-100 text-stone-500">
                {contextBadge}
              </span>
            )}
          </div>
          {conversation.last_message_at && (
            <span className={`flex-shrink-0 text-xs ${conversation.unread_count > 0 ? 'text-brand-600 font-medium' : 'text-stone-400'}`}>
              {formatMessageTime(conversation.last_message_at)}
            </span>
          )}
        </div>

        <div className="flex items-center justify-between">
          <p className={`text-xs truncate pr-2 ${conversation.unread_count > 0 ? 'text-stone-700' : 'text-stone-500'}`}>
            {conversation.last_message_preview
              ? `${isLastMessageFromMe ? 'You: ' : ''}${conversation.last_message_preview}`
              : 'No messages yet'}
          </p>
          <ChatUnreadBadge count={conversation.unread_count} />
        </div>
      </div>
    </Link>
  )
}
