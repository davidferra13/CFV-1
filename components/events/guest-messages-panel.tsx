'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ConfirmModal } from '@/components/ui/confirm-modal'
import {
  toggleMessageVisibility,
  toggleMessagePin,
  deleteGuestMessage,
} from '@/lib/guest-messages/actions'

type Message = {
  id: string
  guest_name: string
  message: string
  emoji: string | null
  is_visible: boolean
  is_pinned: boolean
  created_at: string
}

type Props = {
  messages: Message[]
  eventId: string
}

export function GuestMessagesPanel({ messages, eventId }: Props) {
  const router = useRouter()
  const [loadingId, setLoadingId] = useState<string | null>(null)
  const [deleteMessageId, setDeleteMessageId] = useState<string | null>(null)

  const visibleCount = messages.filter((m) => m.is_visible).length
  const hiddenCount = messages.filter((m) => !m.is_visible).length

  async function handleToggleVisibility(id: string, currentVisible: boolean) {
    setLoadingId(id)
    try {
      await toggleMessageVisibility(id, !currentVisible)
      router.refresh()
    } catch (err) {
      console.error('Failed to toggle visibility:', err)
    } finally {
      setLoadingId(null)
    }
  }

  async function handleTogglePin(id: string, currentPinned: boolean) {
    setLoadingId(id)
    try {
      await toggleMessagePin(id, !currentPinned)
      router.refresh()
    } catch (err) {
      console.error('Failed to toggle pin:', err)
    } finally {
      setLoadingId(null)
    }
  }

  function handleDelete(id: string) {
    setDeleteMessageId(id)
  }

  async function handleConfirmedDelete() {
    if (!deleteMessageId) return
    const id = deleteMessageId
    setDeleteMessageId(null)
    setLoadingId(id)
    try {
      await deleteGuestMessage(id)
      router.refresh()
    } catch (err) {
      console.error('Failed to delete:', err)
    } finally {
      setLoadingId(null)
    }
  }

  if (messages.length === 0) {
    return (
      <Card className="p-4">
        <h3 className="font-semibold text-stone-100 mb-1">Guest Wall</h3>
        <p className="text-sm text-stone-500">
          No guest messages yet. Messages will appear here once guests post on the share page.
        </p>
      </Card>
    )
  }

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-stone-100">Guest Wall</h3>
        <div className="flex gap-2">
          <Badge variant="success">{visibleCount} visible</Badge>
          {hiddenCount > 0 && <Badge variant="default">{hiddenCount} hidden</Badge>}
        </div>
      </div>

      <div className="space-y-2 max-h-96 overflow-y-auto">
        {messages.map((msg) => {
          const isLoading = loadingId === msg.id
          const date = new Date(msg.created_at).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
          })

          return (
            <div
              key={msg.id}
              className={`rounded-lg border p-3 ${
                !msg.is_visible
                  ? 'border-stone-700 bg-stone-800 opacity-60'
                  : msg.is_pinned
                    ? 'border-brand-700 bg-brand-950/30'
                    : 'border-stone-700'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-sm text-stone-100">{msg.guest_name}</span>
                    {msg.is_pinned && <Badge variant="info">Pinned</Badge>}
                    {!msg.is_visible && <Badge variant="default">Hidden</Badge>}
                    <span className="text-xs text-stone-400">{date}</span>
                  </div>
                  <p className="text-sm text-stone-300 mt-0.5">
                    {msg.emoji && <span className="mr-1">{msg.emoji}</span>}
                    {msg.message}
                  </p>
                </div>

                <div className="flex items-center gap-1 flex-shrink-0">
                  <button
                    onClick={() => handleTogglePin(msg.id, msg.is_pinned)}
                    disabled={isLoading}
                    className="p-1 text-stone-400 hover:text-brand-600 disabled:opacity-50"
                    title={msg.is_pinned ? 'Unpin' : 'Pin'}
                  >
                    <svg
                      className="w-4 h-4"
                      fill={msg.is_pinned ? 'currentColor' : 'none'}
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"
                      />
                    </svg>
                  </button>

                  <button
                    onClick={() => handleToggleVisibility(msg.id, msg.is_visible)}
                    disabled={isLoading}
                    className="p-1 text-stone-400 hover:text-stone-300 disabled:opacity-50"
                    title={msg.is_visible ? 'Hide' : 'Show'}
                  >
                    {msg.is_visible ? (
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                        />
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                        />
                      </svg>
                    ) : (
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"
                        />
                      </svg>
                    )}
                  </button>

                  <button
                    onClick={() => handleDelete(msg.id)}
                    disabled={isLoading}
                    className="p-1 text-stone-400 hover:text-red-600 disabled:opacity-50"
                    title="Delete"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                      />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      <ConfirmModal
        open={deleteMessageId !== null}
        title="Delete this message?"
        description="This will permanently remove the message. This cannot be undone."
        confirmLabel="Delete"
        variant="danger"
        loading={loadingId !== null}
        onConfirm={handleConfirmedDelete}
        onCancel={() => setDeleteMessageId(null)}
      />
    </Card>
  )
}
