'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { Send, Paperclip, X } from 'lucide-react'
import { useDebouncedCallback } from '@/lib/hooks/use-debounce'

interface ChatInputBarProps {
  onSendText: (text: string) => Promise<void>
  onAttach: () => void // Opens file/image upload UI
  onTyping: (isTyping: boolean) => void
  disabled?: boolean
}

export function ChatInputBar({
  onSendText,
  onAttach,
  onTyping,
  disabled = false,
}: ChatInputBarProps) {
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const isTypingRef = useRef(false)

  const stopTyping = useDebouncedCallback(() => {
    isTypingRef.current = false
    onTyping(false)
  }, 2000)

  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current
    if (!textarea) return
    textarea.style.height = 'auto'
    textarea.style.height = Math.min(textarea.scrollHeight, 120) + 'px'
  }, [text])

  const handleTyping = useCallback(() => {
    if (!isTypingRef.current) {
      isTypingRef.current = true
      onTyping(true)
    }
    stopTyping()
  }, [onTyping, stopTyping])

  const handleSend = async () => {
    const trimmed = text.trim()
    if (!trimmed || sending) return

    setSending(true)

    // Clear typing indicator immediately on send
    if (isTypingRef.current) {
      isTypingRef.current = false
      onTyping(false)
    }

    try {
      await onSendText(trimmed)
      setText('')
      // Re-focus the textarea
      textareaRef.current?.focus()
    } finally {
      setSending(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="border-t border-stone-700 bg-stone-900 px-4 py-3">
      <div className="flex items-end gap-2">
        {/* Attachment button */}
        <button
          onClick={onAttach}
          disabled={disabled || sending}
          className="flex-shrink-0 p-2 text-stone-400 hover:text-stone-400 disabled:opacity-50 transition-colors"
          title="Attach file"
          aria-label="Attach file"
        >
          <Paperclip className="w-5 h-5" />
        </button>

        {/* Text input */}
        <textarea
          ref={textareaRef}
          value={text}
          onChange={(e) => {
            setText(e.target.value)
            handleTyping()
          }}
          onKeyDown={handleKeyDown}
          placeholder="Type a message..."
          disabled={disabled || sending}
          rows={1}
          className="flex-1 resize-none text-sm border border-stone-600 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent disabled:opacity-50 placeholder:text-stone-400"
        />

        {/* Send button */}
        <button
          onClick={handleSend}
          disabled={!text.trim() || disabled || sending}
          className="flex-shrink-0 p-2.5 rounded-xl bg-brand-600 text-white hover:bg-brand-700 disabled:opacity-30 disabled:hover:bg-brand-600 transition-colors"
          title="Send message"
          aria-label="Send message"
        >
          <Send className="w-4 h-4" />
        </button>
      </div>
      <p className="text-[10px] text-stone-400 mt-1 ml-11">
        Press Enter to send, Shift+Enter for new line
      </p>
    </div>
  )
}
