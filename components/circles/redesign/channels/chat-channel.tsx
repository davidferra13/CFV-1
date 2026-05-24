'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'
import type { CircleDetail, CircleMessage } from '@/lib/hub/circle-detail-actions'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function relativeTime(timestamp: string): string {
  const now = Date.now()
  const then = new Date(timestamp).getTime()
  const diff = Math.max(0, now - then)
  const seconds = Math.floor(diff / 1000)
  if (seconds < 60) return 'just now'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h`
  const days = Math.floor(hours / 24)
  return `${days}d`
}

function avatarFallback(name: string): string {
  return (name[0] ?? '?').toUpperCase()
}

// ---------------------------------------------------------------------------
// Message grouping: consecutive messages from the same author collapse
// ---------------------------------------------------------------------------

interface MessageGroup {
  author_name: string
  author_avatar: string | null
  message_type: string
  messages: CircleMessage[]
}

function groupMessages(msgs: CircleMessage[]): MessageGroup[] {
  const groups: MessageGroup[] = []
  for (const msg of msgs) {
    if (msg.message_type === 'system') {
      groups.push({
        author_name: msg.author_name,
        author_avatar: msg.author_avatar,
        message_type: 'system',
        messages: [msg],
      })
      continue
    }
    const last = groups[groups.length - 1]
    if (
      last &&
      last.message_type !== 'system' &&
      last.author_name === msg.author_name &&
      last.message_type === msg.message_type
    ) {
      last.messages.push(msg)
    } else {
      groups.push({
        author_name: msg.author_name,
        author_avatar: msg.author_avatar,
        message_type: msg.message_type,
        messages: [msg],
      })
    }
  }
  return groups
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function Avatar({ name, url }: { name: string; url: string | null }) {
  if (url) {
    return (
      <img src={url} alt={name} className="h-10 w-10 rounded-full object-cover flex-shrink-0" />
    )
  }
  return (
    <div className="h-10 w-10 rounded-full bg-stone-700 flex items-center justify-center flex-shrink-0 text-sm font-semibold text-stone-300">
      {avatarFallback(name)}
    </div>
  )
}

function PinnedBanner({ messages }: { messages: CircleMessage[] }) {
  const [expanded, setExpanded] = useState(false)
  const pinned = messages.filter((m) => m.is_pinned)
  if (pinned.length === 0) return null

  return (
    <div className="border-b border-stone-700/50 bg-stone-800/40">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center gap-2 px-4 py-2 text-xs text-stone-400 hover:text-stone-300 transition-colors"
      >
        <svg
          className="h-3.5 w-3.5 flex-shrink-0"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"
          />
        </svg>
        <span className="font-medium">
          {pinned.length} pinned message{pinned.length > 1 ? 's' : ''}
        </span>
        <svg
          className={cn('ml-auto h-3.5 w-3.5 transition-transform', expanded && 'rotate-180')}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {expanded && (
        <div className="space-y-1 px-4 pb-2">
          {pinned.map((msg) => (
            <div
              key={msg.id}
              className="rounded-lg bg-stone-700/30 px-3 py-1.5 text-xs text-stone-300"
            >
              <span className="font-semibold text-stone-200">{msg.author_name}:</span>{' '}
              {msg.body ?? ''}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function SystemMessage({ msg }: { msg: CircleMessage }) {
  return (
    <div className="flex justify-center py-1">
      <span className="text-xs text-stone-500 italic">{msg.body}</span>
    </div>
  )
}

function MessageHeader({
  name,
  avatar,
  timestamp,
  isPinned,
  isRemy,
}: {
  name: string
  avatar: string | null
  timestamp: string
  isPinned: boolean
  isRemy: boolean
}) {
  return (
    <div className="flex items-start gap-3">
      <Avatar name={name} url={avatar} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-stone-200 text-sm">{name}</span>
          {isRemy && (
            <span className="bg-brand-500/20 text-brand-400 text-[10px] px-1.5 rounded font-semibold leading-4">
              BOT
            </span>
          )}
          <span className="text-xs text-stone-500">{relativeTime(timestamp)}</span>
          {isPinned && (
            <svg
              className="h-3 w-3 text-stone-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"
              />
            </svg>
          )}
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function ChatChannel({ circle }: { circle: CircleDetail }) {
  const messages = circle.recent_messages
  const groups = groupMessages(messages)
  const hasPinned = messages.some((m) => m.is_pinned)

  return (
    <div className="flex h-full flex-col">
      {/* Pinned banner */}
      {hasPinned && <PinnedBanner messages={messages} />}

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
        {messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-2">
            <span className="text-4xl">👋</span>
            <p className="text-sm text-stone-400">Start the conversation</p>
          </div>
        ) : (
          groups.map((group, gi) => {
            // System messages render inline
            if (group.message_type === 'system') {
              return group.messages.map((msg) => <SystemMessage key={msg.id} msg={msg} />)
            }

            const isRemy = group.message_type === 'remy'

            return (
              <div
                key={`g-${gi}`}
                className={cn('group rounded-sm', isRemy && 'border-l-2 border-brand-500/30 pl-2')}
              >
                {group.messages.map((msg, mi) => (
                  <div
                    key={msg.id}
                    className="rounded-sm py-0.5 hover:bg-stone-800/20 transition-colors"
                  >
                    {mi === 0 ? (
                      /* First message in group: full header */
                      <div>
                        <MessageHeader
                          name={msg.author_name}
                          avatar={msg.author_avatar}
                          timestamp={msg.created_at}
                          isPinned={msg.is_pinned}
                          isRemy={isRemy}
                        />
                        {msg.body && (
                          <p className="pl-[52px] text-sm text-stone-300 mt-0.5">{msg.body}</p>
                        )}
                      </div>
                    ) : (
                      /* Continuation: just body */
                      <div className="flex items-start">
                        <p className="pl-[52px] text-sm text-stone-300">{msg.body}</p>
                        {msg.is_pinned && (
                          <svg
                            className="ml-1 mt-0.5 h-3 w-3 text-stone-500 flex-shrink-0"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            strokeWidth={2}
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"
                            />
                          </svg>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )
          })
        )}
      </div>

      {/* Input area */}
      <div className="border-t border-stone-700/50 px-4 py-3">
        <div className="flex items-center gap-2 rounded-xl bg-stone-700/50 px-4 py-3">
          <button
            className="flex-shrink-0 text-stone-400 hover:text-stone-300 transition-colors"
            title="Attachments (coming soon)"
            disabled
          >
            <svg
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
          </button>
          <input
            type="text"
            placeholder={`Message ${circle.name}...`}
            disabled
            title="Chat coming soon"
            className="flex-1 bg-transparent text-sm text-stone-300 placeholder-stone-500 outline-none disabled:cursor-not-allowed"
          />
          <button
            className="flex-shrink-0 text-stone-400 hover:text-stone-300 transition-colors"
            title="Emoji (coming soon)"
            disabled
          >
            <svg
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <circle cx="12" cy="12" r="10" />
              <path strokeLinecap="round" d="M8 14s1.5 2 4 2 4-2 4-2" />
              <circle cx="9" cy="9" r="0.5" fill="currentColor" />
              <circle cx="15" cy="9" r="0.5" fill="currentColor" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  )
}
