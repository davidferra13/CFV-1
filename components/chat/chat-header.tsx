'use client'

import Link from 'next/link'
import { ArrowLeft, ExternalLink, Search } from 'lucide-react'
import { ChatPresenceDot } from './chat-presence-dot'
import type { Conversation } from '@/lib/chat/types'

interface ChatHeaderProps {
  participantName: string
  participantRole: 'chef' | 'client'
  isOnline: boolean
  conversation: Conversation
  backHref: string
  onSearchToggle?: () => void
}

export function ChatHeader({
  participantName,
  participantRole,
  isOnline,
  conversation,
  backHref,
  onSearchToggle,
}: ChatHeaderProps) {
  const contextLabel =
    conversation.context_type === 'event'
      ? 'Event'
      : conversation.context_type === 'inquiry'
        ? 'Inquiry'
        : null

  const contextHref =
    conversation.context_type === 'event' && conversation.event_id
      ? `/events/${conversation.event_id}`
      : conversation.context_type === 'inquiry' && conversation.inquiry_id
        ? `/inquiries/${conversation.inquiry_id}`
        : null

  return (
    <div className="border-b border-stone-700 bg-stone-900 px-4 py-3 flex items-center gap-3">
      {/* Back button */}
      <Link
        href={backHref}
        className="flex-shrink-0 p-1 -ml-1 text-stone-500 hover:text-stone-300 transition-colors"
      >
        <ArrowLeft className="w-5 h-5" />
      </Link>

      {/* Avatar placeholder */}
      <div className="relative flex-shrink-0">
        <div className="w-9 h-9 rounded-full bg-stone-700 flex items-center justify-center">
          <span className="text-sm font-medium text-stone-400">
            {participantName.charAt(0).toUpperCase()}
          </span>
        </div>
        <div className="absolute -bottom-0.5 -right-0.5">
          <ChatPresenceDot online={isOnline} />
        </div>
      </div>

      {/* Name and status */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-stone-100 truncate">{participantName}</p>
        <p className="text-xs text-stone-400">
          {isOnline ? 'Online' : participantRole === 'chef' ? 'Chef' : 'Client'}
        </p>
      </div>

      {/* Context link */}
      {contextLabel && contextHref && (
        <Link
          href={contextHref}
          className="flex items-center gap-1 text-xs text-brand-600 hover:text-brand-400 transition-colors"
        >
          <ExternalLink className="w-3.5 h-3.5" />
          {contextLabel}
        </Link>
      )}

      {/* Search button */}
      {onSearchToggle && (
        <button
          type="button"
          onClick={onSearchToggle}
          className="flex-shrink-0 p-1.5 text-stone-400 hover:text-stone-400 transition-colors"
          title="Search messages"
        >
          <Search className="w-4.5 h-4.5" />
        </button>
      )}
    </div>
  )
}
