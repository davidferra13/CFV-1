'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import type { HubMessage } from '@/lib/hub/types'
import {
  getHubMessages,
  markHubRead,
  postHubMessage,
  togglePinMessage,
} from '@/lib/hub/message-actions'
import { subscribeToHubMessages, subscribeToHubMessageUpdates } from '@/lib/hub/realtime'
import { HubMessageBubble } from './hub-message'
import { HubInput } from './hub-input'

interface HubFeedProps {
  groupId: string
  profileToken: string | null
  currentProfileId: string | null
}

export function HubFeed({ groupId, profileToken, currentProfileId }: HubFeedProps) {
  const [messages, setMessages] = useState<HubMessage[]>([])
  const [loading, setLoading] = useState(true)
  const [nextCursor, setNextCursor] = useState<string | null>(null)
  const [loadingMore, setLoadingMore] = useState(false)
  const [replyTo, setReplyTo] = useState<HubMessage | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const lastReadTouchMsRef = useRef(0)

  const touchReadMarker = useCallback(
    async (force = false) => {
      if (!profileToken) return
      const now = Date.now()
      if (!force && now - lastReadTouchMsRef.current < 8000) return
      lastReadTouchMsRef.current = now
      try {
        await markHubRead({ groupId, profileToken })
      } catch {
        // Non-blocking
      }
    },
    [groupId, profileToken]
  )

  // Load initial messages
  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const result = await getHubMessages({ groupId, limit: 50 })
        if (!cancelled) {
          setMessages(result.messages.reverse()) // oldest first
          setNextCursor(result.nextCursor)
          setLoading(false)
          void touchReadMarker(true)
          // Scroll to bottom
          setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'instant' }), 50)
        }
      } catch {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [groupId, touchReadMarker])

  // Realtime subscriptions
  useEffect(() => {
    const unsubNew = subscribeToHubMessages(groupId, (newMsg) => {
      setMessages((prev) => {
        // Deduplicate
        if (prev.some((m) => m.id === newMsg.id)) return prev
        return [...prev, newMsg]
      })
      if (newMsg.author_profile_id !== currentProfileId) {
        void touchReadMarker()
      }
      // Auto-scroll if near bottom
      setTimeout(() => {
        const el = scrollRef.current
        if (el) {
          const isNearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 200
          if (isNearBottom) {
            bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
          }
        }
      }, 50)
    })

    const unsubUpdates = subscribeToHubMessageUpdates(groupId, (updated) => {
      setMessages((prev) => prev.map((m) => (m.id === updated.id ? { ...m, ...updated } : m)))
    })

    return () => {
      unsubNew()
      unsubUpdates()
    }
  }, [groupId, currentProfileId, touchReadMarker])

  // Load more (scroll up to load history)
  const loadMore = useCallback(async () => {
    if (!nextCursor || loadingMore) return
    setLoadingMore(true)
    try {
      const result = await getHubMessages({ groupId, cursor: nextCursor, limit: 50 })
      setMessages((prev) => [...result.messages.reverse(), ...prev])
      setNextCursor(result.nextCursor)
    } catch {
      // Ignore
    } finally {
      setLoadingMore(false)
    }
  }, [groupId, nextCursor, loadingMore])

  const handleSend = useCallback(
    async (body: string) => {
      if (!profileToken) return

      await postHubMessage({
        groupId,
        profileToken,
        body,
        reply_to_message_id: replyTo?.id ?? null,
      })
      setReplyTo(null)
    },
    [groupId, profileToken, replyTo]
  )

  const handlePin = useCallback(
    async (messageId: string) => {
      if (!profileToken) return
      try {
        await togglePinMessage({ messageId, profileToken })
      } catch {
        // Ignore pin errors
      }
    },
    [profileToken]
  )

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="text-sm text-stone-500">Loading conversation...</div>
      </div>
    )
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      {/* Messages area */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto">
        {/* Load more button */}
        {nextCursor && (
          <div className="flex justify-center py-3">
            <button
              onClick={loadMore}
              disabled={loadingMore}
              className="rounded-full bg-stone-800 px-4 py-1.5 text-xs text-stone-400 hover:bg-stone-700"
            >
              {loadingMore ? 'Loading...' : 'Load earlier messages'}
            </button>
          </div>
        )}

        {/* Empty state */}
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="mb-2 text-4xl">💬</div>
            <p className="text-sm text-stone-400">No messages yet</p>
            <p className="text-xs text-stone-600">Start the conversation!</p>
          </div>
        )}

        {/* Messages */}
        <div className="py-2">
          {messages.map((msg) => (
            <HubMessageBubble
              key={msg.id}
              message={msg}
              currentProfileId={currentProfileId}
              profileToken={profileToken}
              onPin={handlePin}
              onReply={setReplyTo}
            />
          ))}
        </div>

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      {profileToken ? (
        <HubInput onSend={handleSend} replyTo={replyTo} onCancelReply={() => setReplyTo(null)} />
      ) : (
        <div className="border-t border-stone-800 p-4 text-center text-sm text-stone-500">
          Join the group to start chatting
        </div>
      )}
    </div>
  )
}
