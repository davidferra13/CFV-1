/* eslint-disable @next/next/no-img-element */
'use client'

import { useState } from 'react'
import type { HubMessage, HubGuestProfile } from '@/lib/hub/types'
import { addReaction, removeReaction } from '@/lib/hub/message-actions'

const QUICK_REACTIONS = ['🔥', '❤️', '😂', '🍽️', '👏', '🎉']

interface HubMessageBubbleProps {
  message: HubMessage
  currentProfileId: string | null
  profileToken: string | null
  onPin?: (messageId: string) => void
  onReply?: (message: HubMessage) => void
}

export function HubMessageBubble({
  message,
  currentProfileId,
  profileToken,
  onPin,
  onReply,
}: HubMessageBubbleProps) {
  const [showReactions, setShowReactions] = useState(false)

  const isOwn = message.author_profile_id === currentProfileId
  const author = message.author as HubGuestProfile | undefined

  // System messages render differently
  if (message.message_type === 'system') {
    return (
      <div className="flex justify-center py-2">
        <div className="rounded-full bg-stone-800/50 px-4 py-1.5 text-xs text-stone-400">
          {message.body ?? message.system_event_type?.replace(/_/g, ' ')}
        </div>
      </div>
    )
  }

  // Poll message
  if (message.message_type === 'poll') {
    return (
      <div className="flex justify-center py-2">
        <div className="rounded-lg border border-stone-700 bg-stone-800/50 px-4 py-3 text-sm text-stone-300">
          📊 {message.body}
        </div>
      </div>
    )
  }

  const handleReaction = async (emoji: string) => {
    if (!profileToken) return
    const existing = message.reaction_counts?.[emoji]
    try {
      if (existing) {
        await removeReaction({ messageId: message.id, profileToken, emoji })
      } else {
        await addReaction({ messageId: message.id, profileToken, emoji })
      }
    } catch {
      // Ignore reaction errors
    }
    setShowReactions(false)
  }

  const initials = (author?.display_name ?? '?')
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

  const timeStr = new Date(message.created_at).toLocaleTimeString([], {
    hour: 'numeric',
    minute: '2-digit',
  })

  return (
    <div
      className={`group flex gap-2.5 px-4 py-1.5 hover:bg-stone-800/30 ${isOwn ? 'flex-row-reverse' : ''}`}
    >
      {/* Avatar */}
      {!isOwn && (
        <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-stone-700 text-xs font-medium text-stone-300">
          {author?.avatar_url ? (
            <img src={author.avatar_url} alt="" className="h-8 w-8 rounded-full object-cover" />
          ) : (
            initials
          )}
        </div>
      )}

      <div className={`max-w-[75%] ${isOwn ? 'items-end' : 'items-start'} flex flex-col`}>
        {/* Name + time */}
        {!isOwn && (
          <div className="mb-0.5 flex items-center gap-2 text-xs">
            <span className="font-medium text-stone-400">{author?.display_name ?? 'Guest'}</span>
            <span className="text-stone-600">{timeStr}</span>
          </div>
        )}

        {/* Message bubble */}
        <div
          className={`rounded-2xl px-3.5 py-2 text-sm leading-relaxed ${
            isOwn
              ? 'rounded-tr-md bg-[var(--hub-primary,#e88f47)] text-white'
              : 'rounded-tl-md bg-stone-800 text-stone-200'
          }`}
        >
          {/* Reply context */}
          {message.reply_to && (
            <div className="mb-1.5 rounded border-l-2 border-stone-500 bg-stone-900/50 px-2 py-1 text-xs text-stone-400">
              {(message.reply_to as HubMessage).body?.slice(0, 80)}
            </div>
          )}

          {message.body}

          {/* Images */}
          {message.media_urls && message.media_urls.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {message.media_urls.map((url, i) => (
                <img
                  key={i}
                  src={url}
                  alt={message.media_captions?.[i] ?? ''}
                  className="max-h-48 rounded-lg object-cover"
                />
              ))}
            </div>
          )}

          {/* Pin badge */}
          {message.is_pinned && <div className="mt-1 text-xs opacity-60">📌 Pinned</div>}
        </div>

        {isOwn && <span className="mt-0.5 text-xs text-stone-600">{timeStr}</span>}

        {/* Reactions display */}
        {message.reaction_counts && Object.keys(message.reaction_counts).length > 0 && (
          <div className="mt-1 flex flex-wrap gap-1">
            {Object.entries(message.reaction_counts).map(([emoji, count]) => (
              <button
                key={emoji}
                onClick={() => handleReaction(emoji)}
                className="flex items-center gap-0.5 rounded-full bg-stone-800 px-2 py-0.5 text-xs hover:bg-stone-700"
              >
                <span>{emoji}</span>
                <span className="text-stone-400">{count as number}</span>
              </button>
            ))}
          </div>
        )}

        {/* Quick actions (on hover) */}
        <div className="mt-0.5 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
          <button
            onClick={() => setShowReactions(!showReactions)}
            className="rounded p-1 text-xs text-stone-500 hover:bg-stone-800 hover:text-stone-300"
            title="React"
          >
            😀
          </button>
          {onReply && (
            <button
              onClick={() => onReply(message)}
              className="rounded p-1 text-xs text-stone-500 hover:bg-stone-800 hover:text-stone-300"
              title="Reply"
            >
              ↩️
            </button>
          )}
          {onPin && (
            <button
              onClick={() => onPin(message.id)}
              className="rounded p-1 text-xs text-stone-500 hover:bg-stone-800 hover:text-stone-300"
              title={message.is_pinned ? 'Unpin' : 'Pin'}
            >
              📌
            </button>
          )}
        </div>

        {/* Reaction picker */}
        {showReactions && (
          <div className="mt-1 flex gap-1 rounded-lg bg-stone-800 p-1.5 shadow-lg">
            {QUICK_REACTIONS.map((emoji) => (
              <button
                key={emoji}
                onClick={() => handleReaction(emoji)}
                className="rounded p-1 text-lg transition-transform hover:scale-125 hover:bg-stone-700"
              >
                {emoji}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
