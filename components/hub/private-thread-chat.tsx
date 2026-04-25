'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import {
  getPrivateMessages,
  markPrivateThreadRead,
  sendPrivateMessage,
} from '@/lib/hub/private-message-actions'
import type { PrivateMessage } from '@/lib/hub/types'

interface PrivateThreadChatProps {
  threadId: string
  profileToken: string
  currentProfileId: string
  otherParticipantName: string
  onBack?: () => void
}

function formatTime(value: string) {
  return new Date(value).toLocaleTimeString([], {
    hour: 'numeric',
    minute: '2-digit',
  })
}

export function PrivateThreadChat({
  threadId,
  profileToken,
  currentProfileId,
  otherParticipantName,
  onBack,
}: PrivateThreadChatProps) {
  const router = useRouter()
  const [messages, setMessages] = useState<PrivateMessage[]>([])
  const [nextCursor, setNextCursor] = useState<string | null>(null)
  const [body, setBody] = useState('')
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [sending, setSending] = useState(false)

  useEffect(() => {
    let cancelled = false

    async function loadMessages() {
      setLoading(true)
      try {
        const result = await getPrivateMessages({ threadId, profileToken })
        if (!cancelled) {
          setMessages(result.messages)
          setNextCursor(result.nextCursor)
        }
        await markPrivateThreadRead({ threadId, profileToken })
      } catch {
        if (!cancelled) toast.error('Could not load private messages')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    loadMessages()

    return () => {
      cancelled = true
    }
  }, [profileToken, threadId])

  const chronologicalMessages = useMemo(() => [...messages].reverse(), [messages])

  const loadMore = async () => {
    if (!nextCursor || loadingMore) return

    setLoadingMore(true)
    try {
      const result = await getPrivateMessages({ threadId, profileToken, cursor: nextCursor })
      setMessages((current) => [...current, ...result.messages])
      setNextCursor(result.nextCursor)
    } catch {
      toast.error('Could not load older messages')
    } finally {
      setLoadingMore(false)
    }
  }

  const handleSend = async () => {
    const trimmedBody = body.trim()
    if (!trimmedBody || sending) return

    const optimisticMessage: PrivateMessage = {
      id: `temp-${Date.now()}`,
      thread_id: threadId,
      sender_profile_id: currentProfileId,
      body: trimmedBody,
      created_at: new Date().toISOString(),
      deleted_at: null,
    }

    setSending(true)
    setBody('')
    setMessages((current) => [optimisticMessage, ...current])

    try {
      const savedMessage = await sendPrivateMessage({
        threadId,
        profileToken,
        body: trimmedBody,
      })
      setMessages((current) =>
        current.map((message) => (message.id === optimisticMessage.id ? savedMessage : message))
      )
      router.refresh()
    } catch {
      setMessages((current) => current.filter((message) => message.id !== optimisticMessage.id))
      setBody(trimmedBody)
      toast.error('Could not send private message')
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="flex h-[32rem] min-h-0 flex-col overflow-hidden rounded-lg border border-stone-700 bg-stone-900">
      <div className="flex items-center gap-3 border-b border-stone-800 px-4 py-3">
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            className="rounded-md p-1 text-stone-400 hover:bg-stone-800 hover:text-stone-100"
            aria-label="Back to private conversations"
          >
            <svg
              className="h-5 w-5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
        )}
        <h3 className="truncate text-sm font-semibold text-stone-100">{otherParticipantName}</h3>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-3">
        {nextCursor && (
          <div className="mb-3 flex justify-center">
            <button
              type="button"
              onClick={loadMore}
              disabled={loadingMore}
              className="rounded-full border border-stone-700 px-3 py-1 text-xs font-medium text-stone-300 hover:bg-stone-800 disabled:opacity-50"
            >
              {loadingMore ? 'Loading...' : 'Load more'}
            </button>
          </div>
        )}

        {loading ? (
          <div className="py-12 text-center text-sm text-stone-500">Loading...</div>
        ) : chronologicalMessages.length === 0 ? (
          <div className="py-12 text-center text-sm text-stone-500">No private messages yet.</div>
        ) : (
          <div className="space-y-3">
            {chronologicalMessages.map((message) => {
              const isMine = message.sender_profile_id === currentProfileId

              return (
                <div
                  key={message.id}
                  className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[78%] rounded-lg px-3 py-2 ${
                      isMine ? 'bg-amber-600 text-white' : 'bg-stone-700 text-stone-100'
                    }`}
                  >
                    <p className="whitespace-pre-wrap break-words text-sm">{message.body}</p>
                    <p
                      className={`mt-1 text-right text-[11px] ${
                        isMine ? 'text-amber-100' : 'text-stone-400'
                      }`}
                    >
                      {formatTime(message.created_at)}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      <div className="border-t border-stone-800 p-3">
        <div className="flex items-end gap-2">
          <textarea
            value={body}
            onChange={(event) => setBody(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault()
                void handleSend()
              }
            }}
            rows={2}
            maxLength={2000}
            placeholder="Write a private message..."
            className="min-h-[44px] flex-1 resize-none rounded-lg border border-stone-700 bg-stone-800 px-3 py-2 text-sm text-stone-100 placeholder-stone-500 outline-none focus:border-amber-600"
          />
          <button
            type="button"
            onClick={() => void handleSend()}
            disabled={sending || body.trim().length === 0}
            className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  )
}
