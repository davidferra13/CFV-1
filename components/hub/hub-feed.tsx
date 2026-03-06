'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import type { HubMessage } from '@/lib/hub/types'
import {
  getHubMessages,
  markHubRead,
  postHubMessage,
  togglePinMessage,
  editHubMessage,
  deleteHubMessage,
} from '@/lib/hub/message-actions'
import {
  subscribeToHubMessages,
  subscribeToHubMessageUpdates,
  createHubTypingIndicator,
} from '@/lib/hub/realtime'
import { HubMessageBubble } from './hub-message'
import { HubInput } from './hub-input'
import { HubFileShare } from './hub-file-share'

interface HubFeedProps {
  groupId: string
  profileToken: string | null
  currentProfileId: string | null
  isOwnerOrAdmin?: boolean
}

export function HubFeed({ groupId, profileToken, currentProfileId, isOwnerOrAdmin }: HubFeedProps) {
  const [messages, setMessages] = useState<HubMessage[]>([])
  const [loading, setLoading] = useState(true)
  const [nextCursor, setNextCursor] = useState<string | null>(null)
  const [loadingMore, setLoadingMore] = useState(false)
  const [replyTo, setReplyTo] = useState<HubMessage | null>(null)
  const [editingMessage, setEditingMessage] = useState<HubMessage | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [typingUsers, setTypingUsers] = useState<Map<string, string>>(new Map())
  const scrollRef = useRef<HTMLDivElement>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const lastReadTouchMsRef = useRef(0)
  const typingIndicatorRef = useRef<ReturnType<typeof createHubTypingIndicator> | null>(null)
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

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
        if (prev.some((m) => m.id === newMsg.id)) return prev
        return [...prev, newMsg]
      })
      if (newMsg.author_profile_id !== currentProfileId) {
        void touchReadMarker()
      }
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

  // Typing indicators
  useEffect(() => {
    if (!currentProfileId) return

    const indicator = createHubTypingIndicator(groupId)
    typingIndicatorRef.current = indicator

    indicator.subscribe((data) => {
      if (data.profileId === currentProfileId) return

      setTypingUsers((prev) => {
        const next = new Map(prev)
        next.set(data.profileId, data.displayName)
        return next
      })

      // Clear after 3 seconds
      setTimeout(() => {
        setTypingUsers((prev) => {
          const next = new Map(prev)
          next.delete(data.profileId)
          return next
        })
      }, 3000)
    })

    return () => {
      indicator.unsubscribe()
      typingIndicatorRef.current = null
    }
  }, [groupId, currentProfileId])

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
      setErrorMsg(null)
      try {
        await postHubMessage({
          groupId,
          profileToken,
          body,
          reply_to_message_id: replyTo?.id ?? null,
        })
        setReplyTo(null)
      } catch {
        setErrorMsg('Failed to send message. Please try again.')
      }
    },
    [groupId, profileToken, replyTo]
  )

  const handlePin = useCallback(
    async (messageId: string) => {
      if (!profileToken) return
      try {
        await togglePinMessage({ messageId, profileToken })
      } catch {
        // Ignore
      }
    },
    [profileToken]
  )

  const handleEdit = useCallback((message: HubMessage) => {
    setEditingMessage(message)
  }, [])

  const handleEditSubmit = useCallback(
    async (body: string) => {
      if (!profileToken || !editingMessage) return
      try {
        await editHubMessage({ messageId: editingMessage.id, profileToken, body })
        setMessages((prev) =>
          prev.map((m) =>
            m.id === editingMessage.id ? { ...m, body, edited_at: new Date().toISOString() } : m
          )
        )
      } catch {
        setErrorMsg('Failed to edit message')
      } finally {
        setEditingMessage(null)
      }
    },
    [profileToken, editingMessage]
  )

  const handleDelete = useCallback(
    async (messageId: string) => {
      if (!profileToken) return
      try {
        await deleteHubMessage({ messageId, profileToken })
        setMessages((prev) => prev.filter((m) => m.id !== messageId))
      } catch {
        setErrorMsg('Failed to delete message')
      }
    },
    [profileToken]
  )

  const handleTyping = useCallback(() => {
    if (!currentProfileId || !typingIndicatorRef.current) return
    if (typingTimeoutRef.current) return
    typingTimeoutRef.current = setTimeout(() => {
      typingTimeoutRef.current = null
    }, 2000)
    typingIndicatorRef.current.sendTyping(currentProfileId, '')
  }, [currentProfileId])

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="text-sm text-stone-500">Loading conversation...</div>
      </div>
    )
  }

  const typingNames = Array.from(typingUsers.values()).filter(Boolean)

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <div ref={scrollRef} className="flex-1 overflow-y-auto">
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

        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="mb-2 text-4xl">💬</div>
            <p className="text-sm text-stone-400">No messages yet</p>
            <p className="text-xs text-stone-600">Start the conversation!</p>
          </div>
        )}

        <div className="py-2">
          {messages.map((msg) => (
            <HubMessageBubble
              key={msg.id}
              message={msg}
              currentProfileId={currentProfileId}
              profileToken={profileToken}
              onPin={handlePin}
              onReply={setReplyTo}
              onEdit={handleEdit}
              onDelete={handleDelete}
              isOwnerOrAdmin={isOwnerOrAdmin}
            />
          ))}
        </div>

        {/* Typing indicator */}
        {typingUsers.size > 0 && (
          <div className="px-4 py-1">
            <div className="flex items-center gap-2 text-xs text-stone-500">
              <span className="flex gap-0.5">
                <span className="animate-bounce" style={{ animationDelay: '0ms' }}>
                  .
                </span>
                <span className="animate-bounce" style={{ animationDelay: '150ms' }}>
                  .
                </span>
                <span className="animate-bounce" style={{ animationDelay: '300ms' }}>
                  .
                </span>
              </span>
              <span>
                {typingNames.length > 0
                  ? `${typingNames.join(', ')} typing...`
                  : 'Someone is typing...'}
              </span>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Error banner */}
      {errorMsg && (
        <div className="flex items-center justify-between border-t border-red-900/30 bg-red-900/20 px-4 py-2">
          <span className="text-xs text-red-300">{errorMsg}</span>
          <button
            type="button"
            onClick={() => setErrorMsg(null)}
            className="text-xs text-red-400 hover:text-red-200"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Edit mode */}
      {editingMessage ? (
        <HubInput
          onSend={handleEditSubmit}
          placeholder="Edit your message..."
          initialValue={editingMessage.body ?? ''}
          onCancelReply={() => setEditingMessage(null)}
          replyTo={{ body: 'Editing message' } as HubMessage}
        />
      ) : profileToken ? (
        <HubInput
          onSend={handleSend}
          replyTo={replyTo}
          onCancelReply={() => setReplyTo(null)}
          onTyping={handleTyping}
          fileShareSlot={<HubFileShare groupId={groupId} profileToken={profileToken} />}
        />
      ) : (
        <div className="border-t border-stone-800 p-4 text-center text-sm text-stone-500">
          Join the group to start chatting
        </div>
      )}
    </div>
  )
}
