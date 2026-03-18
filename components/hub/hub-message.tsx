/* eslint-disable @next/next/no-img-element */
'use client'

import { useState, useEffect, useCallback, memo } from 'react'
import type { HubMessage, HubGuestProfile, HubPoll } from '@/lib/hub/types'
import { addReaction, removeReaction, getMessageReaders } from '@/lib/hub/message-actions'
import { getPoll } from '@/lib/hub/poll-actions'
import { HubPollCard } from './hub-poll-card'
import { HubNotificationCard } from './hub-notification-card'

const QUICK_REACTIONS = ['🔥', '❤️', '😂', '🍽️', '👏', '🎉']

interface HubMessageBubbleProps {
  message: HubMessage
  currentProfileId: string | null
  profileToken: string | null
  onPin?: (messageId: string) => void
  onReply?: (message: HubMessage) => void
  onEdit?: (message: HubMessage) => void
  onDelete?: (messageId: string) => void
  isOwnerOrAdmin?: boolean
}

// Memoized: rendered in .map() inside hub feed. Receives stable message objects.
// Note: parent should wrap onPin, onReply, onEdit, onDelete with useCallback.
export const HubMessageBubble = memo(function HubMessageBubble({
  message,
  currentProfileId,
  profileToken,
  onPin,
  onReply,
  onEdit,
  onDelete,
  isOwnerOrAdmin,
}: HubMessageBubbleProps) {
  const [showReactions, setShowReactions] = useState(false)

  const isOwn = message.author_profile_id === currentProfileId
  const author = message.author as HubGuestProfile | undefined

  // Notification cards - rich actionable messages (quote, payment, etc.)
  if (message.message_type === 'notification') {
    return <HubNotificationCard message={message} />
  }

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

  // Poll message - render interactive poll card
  if (message.message_type === 'poll') {
    const pollId = (message.system_metadata as Record<string, unknown>)?.poll_id as
      | string
      | undefined
    return (
      <div className="px-4 py-2">
        {pollId ? (
          <InlinePollCard
            pollId={pollId}
            currentProfileId={currentProfileId}
            profileToken={profileToken}
          />
        ) : (
          <div className="rounded-lg border border-stone-700 bg-stone-800/50 px-4 py-3 text-sm text-stone-300">
            📊 {message.body}
          </div>
        )}
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

          {/* Inline images */}
          {message.media_urls && message.media_urls.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {message.media_urls.map((url, i) => (
                <a
                  key={i}
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block overflow-hidden rounded-lg"
                >
                  <img
                    src={url}
                    alt={message.media_captions?.[i] ?? ''}
                    className="max-h-48 rounded-lg object-cover transition-transform hover:scale-105"
                  />
                </a>
              ))}
            </div>
          )}

          {/* Pin badge */}
          {message.is_pinned && <div className="mt-1 text-xs opacity-60">📌 Pinned</div>}

          {/* Source badge (email, remy) */}
          {message.source === 'email' && (
            <div className="mt-1 flex items-center gap-1 text-xxs opacity-50">
              <svg
                className="h-2.5 w-2.5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
              >
                <rect x="2" y="4" width="20" height="16" rx="2" />
                <path d="M22 4L12 13L2 4" />
              </svg>
              via email
            </div>
          )}

          {/* Edited indicator */}
          {message.edited_at && <span className="mt-0.5 text-xs opacity-50">(edited)</span>}
        </div>

        {isOwn && <span className="mt-0.5 text-xs text-stone-600">{timeStr}</span>}

        {/* Seen by indicator (own messages only) */}
        {isOwn && <SeenByIndicator messageId={message.id} />}

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
          {/* Edit (own messages only) */}
          {isOwn && onEdit && (
            <button
              onClick={() => onEdit(message)}
              className="rounded p-1 text-xs text-stone-500 hover:bg-stone-800 hover:text-stone-300"
              title="Edit"
            >
              ✏️
            </button>
          )}
          {/* Delete (own messages or admin moderation) */}
          {(isOwn || isOwnerOrAdmin) && onDelete && (
            <button
              onClick={() => onDelete(message.id)}
              className="rounded p-1 text-xs text-stone-500 hover:bg-stone-800 hover:text-red-400"
              title="Delete"
            >
              🗑️
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
})

// "Seen by" indicator for own messages - lazy-loads readers on hover/click
function SeenByIndicator({ messageId }: { messageId: string }) {
  const [readers, setReaders] = useState<
    { profile_id: string; display_name: string; avatar_url: string | null }[] | null
  >(null)
  const [loading, setLoading] = useState(false)
  const [expanded, setExpanded] = useState(false)

  const loadReaders = useCallback(async () => {
    if (readers !== null || loading) return
    setLoading(true)
    try {
      const data = await getMessageReaders(messageId)
      setReaders(data)
    } catch {
      setReaders([])
    } finally {
      setLoading(false)
    }
  }, [messageId, readers, loading])

  if (readers !== null && readers.length === 0) return null

  return (
    <div className="mt-0.5 flex items-center gap-1">
      <button
        type="button"
        onClick={() => {
          void loadReaders()
          setExpanded(!expanded)
        }}
        onMouseEnter={() => void loadReaders()}
        className="flex items-center gap-1 text-xxs text-stone-500 hover:text-stone-400"
      >
        {loading ? (
          <span>...</span>
        ) : readers === null ? (
          <span className="opacity-0 transition-opacity group-hover:opacity-100">Seen?</span>
        ) : (
          <>
            <svg
              className="h-3 w-3"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M1 13l4 4L15 7" opacity={0.4} />
            </svg>
            <span>
              {readers.length === 1
                ? `Seen by ${readers[0].display_name}`
                : readers.length > 1
                  ? `Seen by ${readers.length}`
                  : null}
            </span>
          </>
        )}
      </button>

      {expanded && readers && readers.length > 1 && (
        <div className="absolute right-0 top-full z-20 mt-1 rounded-lg bg-stone-800 px-3 py-2 shadow-lg">
          <div className="text-xxs font-medium text-stone-400">Seen by</div>
          {readers.map((r) => (
            <div
              key={r.profile_id}
              className="mt-1 flex items-center gap-1.5 text-xs text-stone-300"
            >
              {r.avatar_url ? (
                <img src={r.avatar_url} alt="" className="h-4 w-4 rounded-full object-cover" />
              ) : (
                <div className="flex h-4 w-4 items-center justify-center rounded-full bg-stone-700 text-3xs">
                  {r.display_name[0]?.toUpperCase()}
                </div>
              )}
              <span>{r.display_name}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// Inline poll card that loads poll data by ID
function InlinePollCard({
  pollId,
  currentProfileId,
  profileToken,
}: {
  pollId: string
  currentProfileId: string | null
  profileToken: string | null
}) {
  const [poll, setPoll] = useState<HubPoll | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const data = await getPoll(pollId, currentProfileId ?? undefined)
        if (!cancelled) setPoll(data)
      } catch {
        // Ignore
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [pollId, currentProfileId])

  if (loading) {
    return (
      <div className="rounded-xl border border-stone-700 bg-stone-800/60 p-4 text-sm text-stone-400">
        Loading poll...
      </div>
    )
  }

  if (!poll) {
    return (
      <div className="rounded-xl border border-stone-700 bg-stone-800/60 p-4 text-sm text-stone-400">
        Poll not found
      </div>
    )
  }

  return (
    <HubPollCard
      poll={poll}
      profileToken={profileToken}
      onVoted={() => {
        // Re-fetch poll after voting
        getPoll(pollId, currentProfileId ?? undefined).then((data) => {
          if (data) setPoll(data)
        })
      }}
    />
  )
}
