'use client'

// Remy — Public Chat Widget
// Lightweight inline chat for public-facing pages (no auth required).
// Compact design: floating button → expandable card (not a full drawer).

import { useState, useRef, useEffect, useCallback } from 'react'
import { X, Send, Loader2 } from 'lucide-react'
import { RemyMascotButton } from '@/components/ai/remy-mascot-button'
import { RemyTalkingAvatar } from '@/components/ai/remy-talking-avatar'
import { useRemyLipSync } from '@/lib/ai/use-remy-lip-sync'

interface Message {
  id: string
  role: 'user' | 'remy'
  content: string
  timestamp: string
}

interface RemyPublicWidgetProps {
  /** The chef's tenant ID — required to load public context */
  tenantId: string
  /** Optional chef name for the greeting */
  chefName?: string
}

export function RemyPublicWidget({ tenantId, chefName }: RemyPublicWidgetProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isStreaming, setIsStreaming] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const abortRef = useRef<AbortController | null>(null)
  const lipSync = useRemyLipSync()

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }, [isOpen])

  const sendMessage = useCallback(async () => {
    const trimmed = input.trim()
    if (!trimmed || isStreaming) return

    setError(null)

    const userMsg: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: trimmed,
      timestamp: new Date().toISOString(),
    }

    const remyMsg: Message = {
      id: `remy-${Date.now()}`,
      role: 'remy',
      content: '',
      timestamp: new Date().toISOString(),
    }

    setMessages((prev) => [...prev, userMsg, remyMsg])
    setInput('')
    setIsStreaming(true)
    lipSync.reset()

    // Build history for context (last 6 messages)
    const history = messages.slice(-6).map((m) => ({
      role: m.role === 'user' ? 'user' : 'assistant',
      content: m.content,
    }))

    try {
      abortRef.current = new AbortController()
      const response = await fetch('/api/remy/public', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: trimmed, history, tenantId }),
        signal: abortRef.current.signal,
      })

      if (!response.ok || !response.body) {
        throw new Error('Failed to connect to Remy')
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
              lipSync.feedText(event.data as string)
              setMessages((prev) => {
                const updated = [...prev]
                const last = updated[updated.length - 1]
                if (last && last.role === 'remy') {
                  last.content += event.data
                }
                return updated
              })
            } else if (event.type === 'error') {
              setError(event.data)
            }
          } catch {
            // Skip malformed events
          }
        }
      }
    } catch (err: any) {
      lipSync.reset()
      if (err?.name !== 'AbortError') {
        setError("Couldn't reach Remy — try again in a moment.")
      }
    } finally {
      lipSync.stopSpeaking()
      setIsStreaming(false)
      abortRef.current = null
    }
  }, [input, isStreaming, messages, tenantId, lipSync])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  if (!isOpen) {
    return <RemyMascotButton onClick={() => setIsOpen(true)} ariaLabel="Chat with Remy" />
  }

  return (
    <div className="fixed bottom-6 right-6 z-50 flex w-[380px] max-w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-2xl border border-stone-700 bg-stone-900 shadow-2xl">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-stone-700 bg-brand-950 px-4 py-3">
        <div className="flex items-center gap-2">
          <RemyTalkingAvatar
            viseme={lipSync.currentViseme}
            isSpeaking={lipSync.isSpeaking}
            emotion={lipSync.currentEmotion}
            size="sm"
          />
          <div>
            <div className="text-sm font-semibold text-stone-100">Remy</div>
            <div className="text-xs text-stone-400">
              {chefName ? `${chefName}'s concierge` : 'Your food concierge'}
            </div>
          </div>
        </div>
        <button
          onClick={() => setIsOpen(false)}
          className="rounded-lg p-1.5 text-stone-400 transition-colors hover:bg-stone-800 hover:text-stone-300"
          aria-label="Close chat"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Messages */}
      <div
        className="flex-1 overflow-y-auto p-4"
        style={{ maxHeight: '400px', minHeight: '200px' }}
      >
        {messages.length === 0 && (
          <div className="py-8 text-center">
            <div className="text-3xl">👨‍🍳</div>
            <p className="mt-2 text-sm font-medium text-stone-200">Hi! I&apos;m Remy.</p>
            <p className="mt-1 text-xs text-stone-400">
              Ask me about {chefName ? `${chefName}'s` : 'our'} cuisine, services, or how to book an
              event.
            </p>
            <div className="mt-4 flex flex-wrap justify-center gap-1.5">
              {[
                'What cuisines do you specialize in?',
                'How do I book an event?',
                'Do you handle dietary restrictions?',
              ].map((q) => (
                <button
                  key={q}
                  onClick={() => {
                    setInput(q)
                    setTimeout(() => sendMessage(), 50)
                  }}
                  className="rounded-full border border-brand-700 bg-brand-950 px-3 py-1.5 text-xs text-brand-400 transition-colors hover:bg-brand-900"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`mb-3 flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
                msg.role === 'user' ? 'bg-brand-600 text-white' : 'bg-stone-800 text-stone-200'
              }`}
            >
              {msg.content ||
                (isStreaming && msg.role === 'remy' ? (
                  <Loader2 className="h-4 w-4 animate-spin text-stone-400" />
                ) : null)}
            </div>
          </div>
        ))}

        {error && (
          <div className="mb-3 rounded-lg border border-red-200 bg-red-950 px-3 py-2 text-xs text-red-700">
            {error}
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="border-t border-stone-700 bg-stone-900 p-3">
        <div className="flex items-end gap-2">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask about food, events, or services..."
            rows={1}
            className="flex-1 resize-none rounded-xl border border-stone-600 bg-stone-800 px-3.5 py-2.5 text-sm text-stone-200 placeholder-stone-500 outline-none transition-colors focus:border-brand-400 focus:ring-1 focus:ring-brand-400"
            disabled={isStreaming}
            style={{ maxHeight: '100px' }}
          />
          <button
            onClick={sendMessage}
            disabled={!input.trim() || isStreaming}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-600 text-white transition-colors hover:bg-brand-700 disabled:opacity-40"
            aria-label="Send message"
          >
            {isStreaming ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </button>
        </div>
        <p className="mt-1.5 text-center text-[10px] text-stone-500">
          Remy can make mistakes. Please double-check important info.
        </p>
      </div>
    </div>
  )
}
