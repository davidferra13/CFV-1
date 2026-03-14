'use client'

import { useState, useRef, useCallback } from 'react'
import type { HubMessage } from '@/lib/hub/types'

const EMOJI_PICKS = ['🔥', '❤️', '😂', '🍽️', '👏', '🎉', '😍', '🤤', '🥂', '👨‍🍳']

interface HubInputProps {
  onSend: (body: string) => Promise<void>
  replyTo?: HubMessage | null
  onCancelReply?: () => void
  disabled?: boolean
  placeholder?: string
}

export function HubInput({
  onSend,
  replyTo,
  onCancelReply,
  disabled,
  placeholder = 'Type a message...',
}: HubInputProps) {
  const [text, setText] = useState('')
  const [showEmoji, setShowEmoji] = useState(false)
  const [sending, setSending] = useState(false)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  const handleSubmit = useCallback(async () => {
    const trimmed = text.trim()
    if (!trimmed || sending) return

    setSending(true)
    try {
      await onSend(trimmed)
      setText('')
      setShowEmoji(false)
      inputRef.current?.focus()
    } catch {
      // Error handled by caller
    } finally {
      setSending(false)
    }
  }, [text, sending, onSend])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  return (
    <div className="border-t border-stone-800 bg-stone-900/80 p-3">
      {/* Reply indicator */}
      {replyTo && (
        <div className="mb-2 flex items-center gap-2 rounded bg-stone-800 px-3 py-1.5 text-xs text-stone-400">
          <span>↩️ Replying to</span>
          <span className="truncate font-medium text-stone-300">{replyTo.body?.slice(0, 60)}</span>
          <button onClick={onCancelReply} className="ml-auto text-stone-500 hover:text-stone-300">
            ✕
          </button>
        </div>
      )}

      <div className="flex items-end gap-2">
        {/* Emoji toggle */}
        <button
          onClick={() => setShowEmoji(!showEmoji)}
          className="flex-shrink-0 rounded-full p-2 text-stone-400 hover:bg-stone-800 hover:text-stone-200"
          type="button"
        >
          😊
        </button>

        {/* Text area */}
        <textarea
          ref={inputRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled || sending}
          rows={1}
          className="flex-1 resize-none rounded-xl bg-stone-800 px-4 py-2.5 text-sm text-stone-200 placeholder-stone-500 outline-none ring-1 ring-stone-700 focus:ring-[var(--hub-primary,#e88f47)]"
          style={{ maxHeight: '120px' }}
        />

        {/* Send button */}
        <button
          onClick={handleSubmit}
          disabled={!text.trim() || sending || disabled}
          className="flex-shrink-0 rounded-full bg-[var(--hub-primary,#e88f47)] p-2.5 text-white transition-opacity disabled:opacity-30"
          type="button"
        >
          <svg
            className="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5"
            />
          </svg>
        </button>
      </div>

      {/* Emoji picker */}
      {showEmoji && (
        <div className="mt-2 flex flex-wrap gap-1 rounded-lg bg-stone-800 p-2">
          {EMOJI_PICKS.map((emoji) => (
            <button
              key={emoji}
              onClick={() => {
                setText((t) => t + emoji)
                inputRef.current?.focus()
              }}
              className="rounded p-1.5 text-xl transition-transform hover:scale-110 hover:bg-stone-700"
              type="button"
            >
              {emoji}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
