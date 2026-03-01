'use client'

// Remy Mascot Chat — Compact inline chat panel above the mascot avatar.
// Ephemeral (session-only) — no IndexedDB persistence, no conversation management.
// The "quick chat" channel: fast, conversational, person-like.
// For deeper work, the chef uses the full drawer (Ctrl+K).

import { useState, useRef, useEffect, useCallback } from 'react'
import { usePathname } from 'next/navigation'
import { X, Send, Loader2, RotateCcw } from 'lucide-react'
import { useRemyContext } from '@/components/ai/remy-context'
import { useRemyMascotSend } from '@/lib/hooks/use-remy-mascot-send'
import { RemyAvatar } from '@/components/ai/remy-avatar'
import { getStartersForPage } from '@/lib/ai/remy-starters'
import type { RemyMessage } from '@/lib/ai/remy-types'

export function RemyMascotChat() {
  const pathname = usePathname()
  const {
    isMascotChatOpen,
    closeMascotChat,
    feedText,
    stopSpeaking: lipSyncStop,
    resetLipSync,
    dispatchBody,
    isLoading: drawerBusy,
    setIsMascotLoading,
  } = useRemyContext()

  const [messages, setMessages] = useState<RemyMessage[]>([])
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)

  const { input, setInput, loading, streamingContent, handleSend, handleCancel } =
    useRemyMascotSend({
      messages,
      setMessages,
      pathname,
      feedText,
      lipSyncStop,
      resetLipSync,
      dispatchBody,
      setMascotLoading: setIsMascotLoading,
      drawerBusy,
    })

  // Auto-scroll to bottom on new messages or streaming
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, streamingContent])

  // Focus input when opened
  useEffect(() => {
    if (isMascotChatOpen) {
      setTimeout(() => inputRef.current?.focus(), 150)
    }
  }, [isMascotChatOpen])

  // Click outside to close
  useEffect(() => {
    if (!isMascotChatOpen) return
    const handleClick = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        closeMascotChat()
      }
    }
    // Delay to prevent the opening click from immediately closing
    const timer = setTimeout(() => {
      window.addEventListener('mousedown', handleClick)
    }, 100)
    return () => {
      clearTimeout(timer)
      window.removeEventListener('mousedown', handleClick)
    }
  }, [isMascotChatOpen, closeMascotChat])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault()
        handleSend()
      }
    },
    [handleSend]
  )

  const handleRetry = useCallback(
    (retryMessage: string) => {
      handleSend(retryMessage)
    },
    [handleSend]
  )

  if (!isMascotChatOpen) return null

  const starters = getStartersForPage(pathname ?? '/dashboard').slice(0, 3)

  return (
    <div
      ref={panelRef}
      className="fixed bottom-[120px] left-4 lg:left-64 z-40 w-[340px] max-w-[calc(100vw-2rem)] flex flex-col overflow-hidden rounded-2xl border border-stone-700 bg-stone-900 shadow-2xl animate-scale-in"
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-stone-700 bg-brand-950 px-3 py-2.5">
        <div className="flex items-center gap-2">
          <RemyAvatar size="sm" />
          <div>
            <div className="text-sm font-semibold text-stone-100">Remy</div>
            <div className="text-[10px] text-stone-400">Quick chat</div>
          </div>
        </div>
        <button
          onClick={closeMascotChat}
          className="rounded-lg p-1.5 text-stone-400 transition-colors hover:bg-stone-800 hover:text-stone-300"
          aria-label="Close chat"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Messages */}
      <div
        className="flex-1 overflow-y-auto p-3 custom-scrollbar"
        style={{ maxHeight: '320px', minHeight: '120px' }}
      >
        {/* Empty state with starters */}
        {messages.length === 0 && !streamingContent && (
          <div className="py-4 text-center">
            <p className="text-xs text-stone-400 mb-3">What can I help with?</p>
            <div className="flex flex-col gap-1.5">
              {starters.map((s) => (
                <button
                  key={s.text}
                  onClick={() => handleSend(s.text)}
                  disabled={loading || drawerBusy}
                  className="text-left rounded-lg border border-stone-700 bg-stone-800/50 px-3 py-2 text-xs text-stone-300 transition-colors hover:bg-stone-800 hover:text-stone-100 disabled:opacity-40"
                >
                  {s.text}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Message bubbles */}
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`mb-2 flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm leading-relaxed ${
                msg.role === 'user' ? 'bg-brand-600 text-white' : 'bg-stone-800 text-stone-200'
              }`}
            >
              {msg.content}
              {/* Retry button */}
              {msg.isRetryable && msg.retryMessage && (
                <button
                  onClick={() => handleRetry(msg.retryMessage!)}
                  disabled={loading || drawerBusy}
                  className="mt-1.5 flex items-center gap-1 text-[10px] text-brand-400 hover:text-brand-300 disabled:opacity-40"
                >
                  <RotateCcw className="h-3 w-3" />
                  Retry
                </button>
              )}
            </div>
          </div>
        ))}

        {/* Streaming content */}
        {streamingContent && (
          <div className="mb-2 flex justify-start">
            <div className="max-w-[85%] rounded-2xl bg-stone-800 px-3 py-2 text-sm leading-relaxed text-stone-200">
              {streamingContent}
              <span className="inline-block w-1.5 h-4 ml-0.5 bg-brand-500 animate-pulse rounded-sm" />
            </div>
          </div>
        )}

        {/* Loading indicator (before first token) */}
        {loading && !streamingContent && (
          <div className="mb-2 flex justify-start">
            <div className="rounded-2xl bg-stone-800 px-3 py-2">
              <Loader2 className="h-4 w-4 animate-spin text-stone-400" />
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="border-t border-stone-700 bg-stone-900 p-2.5">
        {drawerBusy && !loading && (
          <p className="text-[10px] text-stone-500 mb-1.5 text-center">
            Remy is busy in the drawer...
          </p>
        )}
        <div className="flex items-end gap-1.5">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask Remy anything..."
            rows={1}
            className="flex-1 resize-none rounded-xl border border-stone-600 bg-stone-800 px-3 py-2 text-sm text-stone-200 placeholder-stone-500 outline-none transition-colors focus:border-brand-400 focus:ring-1 focus:ring-brand-400"
            disabled={loading || drawerBusy}
            style={{ maxHeight: '80px' }}
          />
          {loading ? (
            <button
              onClick={handleCancel}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-stone-700 text-stone-300 transition-colors hover:bg-stone-600"
              aria-label="Cancel"
            >
              <X className="h-4 w-4" />
            </button>
          ) : (
            <button
              onClick={() => handleSend()}
              disabled={!input.trim() || drawerBusy}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-600 text-white transition-colors hover:bg-brand-700 disabled:opacity-40"
              aria-label="Send message"
            >
              <Send className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
        <p className="mt-1 text-center text-[9px] text-stone-600">
          Quick chat — use Ctrl+K for deeper conversations
        </p>
      </div>
    </div>
  )
}
