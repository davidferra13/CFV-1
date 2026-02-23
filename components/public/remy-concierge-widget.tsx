'use client'

// Remy Concierge Widget — Floating chatbot on ALL public pages (including landing).
// Open by default on first visit. Collapsible. Inviting chatbot look.
// Platform-level concierge: no tenantId, hits /api/remy/landing endpoint.

import { useState, useRef, useEffect, useCallback } from 'react'
import { MessageCircle, X, Send, Loader2, Minus } from 'lucide-react'
import { getStarterPainPoints } from '@/lib/ai/chefflow-feature-map'

interface Message {
  id: string
  role: 'user' | 'remy'
  content: string
}

export function RemyConciergeWidget() {
  const [isOpen, setIsOpen] = useState(true) // Open by default
  const [hasAutoOpened, setHasAutoOpened] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isStreaming, setIsStreaming] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const abortRef = useRef<AbortController | null>(null)

  const starters = getStarterPainPoints()

  // Check sessionStorage — restore collapsed state if user dismissed previously
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const dismissed = sessionStorage.getItem('remy-concierge-dismissed')
      if (dismissed === '1') {
        setIsOpen(false)
      }
      setHasAutoOpened(true)
    }
  }, [])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    if (isOpen && hasAutoOpened) {
      setTimeout(() => inputRef.current?.focus(), 200)
    }
  }, [isOpen, hasAutoOpened])

  const handleCollapse = useCallback(() => {
    setIsOpen(false)
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('remy-concierge-dismissed', '1')
    }
  }, [])

  const handleOpen = useCallback(() => {
    setIsOpen(true)
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem('remy-concierge-dismissed')
    }
  }, [])

  const sendMessage = useCallback(
    async (text?: string) => {
      const trimmed = (text ?? input).trim()
      if (!trimmed || isStreaming) return

      setError(null)

      const userMsg: Message = {
        id: `user-${Date.now()}`,
        role: 'user',
        content: trimmed,
      }

      const remyMsg: Message = {
        id: `remy-${Date.now()}`,
        role: 'remy',
        content: '',
      }

      setMessages((prev) => [...prev, userMsg, remyMsg])
      if (!text) setInput('')
      setIsStreaming(true)

      const history = messages.slice(-6).map((m) => ({
        role: m.role === 'user' ? 'user' : 'assistant',
        content: m.content,
      }))

      try {
        abortRef.current = new AbortController()
        const response = await fetch('/api/remy/landing', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: trimmed, history }),
          signal: abortRef.current.signal,
        })

        if (!response.ok || !response.body) {
          throw new Error('Failed to connect')
        }

        const reader = response.body.getReader()
        const decoder = new TextDecoder()
        let buffer = ''

        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          buffer += decoder.decode(value, { stream: true })
          const lines = buffer.split('\n\n')
          buffer = lines.pop() || ''

          for (const line of lines) {
            if (!line.startsWith('data: ')) continue
            try {
              const event = JSON.parse(line.slice(6))
              if (event.type === 'token') {
                setMessages((prev) => {
                  const updated = [...prev]
                  const last = updated[updated.length - 1]
                  if (last && last.role === 'remy') {
                    last.content += event.data
                  }
                  return updated
                })
              } else if (event.type === 'error') {
                setError(String(event.data))
              }
            } catch {
              // Skip malformed events
            }
          }
        }
      } catch (err: any) {
        if (err?.name !== 'AbortError') {
          setError("Couldn't reach Remy — try again in a moment.")
        }
      } finally {
        setIsStreaming(false)
        abortRef.current = null
      }
    },
    [input, isStreaming, messages]
  )

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  // Collapsed state — floating branded button
  if (!isOpen) {
    return (
      <button
        onClick={handleOpen}
        className="fixed bottom-6 right-6 z-50 flex items-center gap-2.5 rounded-full bg-brand-600 px-5 py-3.5 text-white shadow-xl transition-all hover:bg-brand-700 hover:shadow-2xl hover:scale-105 active:scale-95 animate-in fade-in slide-in-from-bottom-4 duration-300"
        aria-label="Chat with Remy"
      >
        <MessageCircle className="h-5 w-5" />
        <span className="text-sm font-semibold">Chat with Remy</span>
        <span className="relative flex h-2.5 w-2.5">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-300 opacity-75" />
          <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-green-400" />
        </span>
      </button>
    )
  }

  // Open state — full chatbot widget
  return (
    <div className="fixed bottom-6 right-6 z-50 flex w-[380px] max-w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-2xl animate-in fade-in slide-in-from-bottom-4 duration-300">
      {/* Header */}
      <div className="flex items-center justify-between bg-brand-600 px-4 py-3.5">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white/20 text-lg">
            👨‍🍳
          </div>
          <div>
            <div className="text-sm font-semibold text-white">Remy</div>
            <div className="flex items-center gap-1.5 text-xs text-white/70">
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-300 opacity-75" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-green-400" />
              </span>
              Online now
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={handleCollapse}
            className="rounded-lg p-1.5 text-white/60 transition-colors hover:bg-white/10 hover:text-white"
            aria-label="Minimize chat"
          >
            <Minus className="h-4 w-4" />
          </button>
          <button
            onClick={handleCollapse}
            className="rounded-lg p-1.5 text-white/60 transition-colors hover:bg-white/10 hover:text-white"
            aria-label="Close chat"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div
        className="flex-1 overflow-y-auto bg-stone-50 p-4"
        style={{ maxHeight: '360px', minHeight: '180px' }}
      >
        {messages.length === 0 && (
          <div className="space-y-4">
            {/* Welcome message — looks like a chat bubble from Remy */}
            <div className="flex items-start gap-2">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-600 text-xs font-bold text-white">
                R
              </div>
              <div className="max-w-[85%] rounded-2xl rounded-tl-sm bg-white px-4 py-3 text-sm leading-relaxed text-stone-700 shadow-sm">
                Hey! I&apos;m Remy, your ChefFlow concierge. 👋
                <br />
                <br />
                Tell me what&apos;s eating your time as a private chef — I&apos;ll show you how
                ChefFlow handles it.
              </div>
            </div>

            {/* Starter suggestions */}
            <div className="ml-9 flex flex-wrap gap-1.5">
              {starters.map((s) => (
                <button
                  key={s.label}
                  onClick={() => sendMessage(s.message)}
                  disabled={isStreaming}
                  className="rounded-full border border-brand-200 bg-white px-3 py-1.5 text-xs font-medium text-brand-700 transition-all hover:border-brand-400 hover:bg-brand-50 hover:shadow-sm disabled:opacity-50"
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`mb-3 flex ${msg.role === 'user' ? 'justify-end' : 'items-start gap-2'}`}
          >
            {msg.role === 'remy' && (
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-600 text-xs font-bold text-white">
                R
              </div>
            )}
            <div
              className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
                msg.role === 'user'
                  ? 'bg-brand-600 text-white rounded-br-sm'
                  : 'bg-white text-stone-800 shadow-sm rounded-tl-sm'
              }`}
            >
              {msg.content ||
                (isStreaming && msg.role === 'remy' ? (
                  <div className="flex items-center gap-1">
                    <span className="inline-block h-1.5 w-1.5 animate-bounce rounded-full bg-stone-400 [animation-delay:0ms]" />
                    <span className="inline-block h-1.5 w-1.5 animate-bounce rounded-full bg-stone-400 [animation-delay:150ms]" />
                    <span className="inline-block h-1.5 w-1.5 animate-bounce rounded-full bg-stone-400 [animation-delay:300ms]" />
                  </div>
                ) : null)}
            </div>
          </div>
        ))}

        {error && (
          <div className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
            {error}
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="border-t border-stone-200 bg-white p-3">
        <div className="flex items-end gap-2">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a message..."
            rows={1}
            className="flex-1 resize-none rounded-xl border border-stone-200 bg-stone-50 px-3.5 py-2.5 text-sm text-stone-800 placeholder-stone-400 outline-none transition-colors focus:border-brand-400 focus:bg-white focus:ring-1 focus:ring-brand-400"
            disabled={isStreaming}
            style={{ maxHeight: '80px' }}
          />
          <button
            onClick={() => sendMessage()}
            disabled={!input.trim() || isStreaming}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-600 text-white transition-all hover:bg-brand-700 disabled:opacity-40"
            aria-label="Send message"
          >
            {isStreaming ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </button>
        </div>
        <p className="mt-1.5 text-center text-[10px] text-stone-400">
          Powered by ChefFlow AI — private &amp; secure
        </p>
      </div>
    </div>
  )
}
