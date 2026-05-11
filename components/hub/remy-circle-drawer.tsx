'use client'

import { useState, useRef, useEffect, useCallback } from 'react'

interface DrawerMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: number
}

interface RemyCircleDrawerProps {
  groupId: string
  isOpen: boolean
  onClose: () => void
}

/**
 * Private 1:1 Remy drawer within a circle view.
 * Messages stored client-side in IndexedDB (privacy-first).
 * Streams from /api/remy/circle with mode='private'.
 */
export function RemyCircleDrawer({ groupId, isOpen, onClose }: RemyCircleDrawerProps) {
  const [messages, setMessages] = useState<DrawerMessage[]>([])
  const [input, setInput] = useState('')
  const [isStreaming, setIsStreaming] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Focus input when drawer opens
  useEffect(() => {
    if (isOpen) inputRef.current?.focus()
  }, [isOpen])

  const sendMessage = useCallback(async () => {
    const trimmed = input.trim()
    if (!trimmed || isStreaming) return

    const userMsg: DrawerMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: trimmed,
      timestamp: Date.now(),
    }
    setMessages((prev) => [...prev, userMsg])
    setInput('')
    setIsStreaming(true)

    const assistantId = crypto.randomUUID()
    setMessages((prev) => [
      ...prev,
      { id: assistantId, role: 'assistant', content: '', timestamp: Date.now() },
    ])

    try {
      const history = messages.slice(-12).map((m) => ({
        role: m.role === 'user' ? 'user' : 'assistant',
        content: m.content,
      }))

      const res = await fetch('/api/remy/circle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: trimmed,
          groupId,
          mode: 'private',
          history,
        }),
      })

      if (!res.ok || !res.body) {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId ? { ...m, content: 'Something went wrong. Please try again.' } : m
          )
        )
        setIsStreaming(false)
        return
      }

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n\n')
        buffer = lines.pop() ?? ''

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          try {
            const event = JSON.parse(line.slice(6))
            if (event.type === 'token') {
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantId ? { ...m, content: m.content + event.data } : m
                )
              )
            } else if (event.type === 'error') {
              setMessages((prev) =>
                prev.map((m) => (m.id === assistantId ? { ...m, content: event.data } : m))
              )
            }
          } catch {
            // Skip malformed events
          }
        }
      }
    } catch {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantId ? { ...m, content: 'Connection lost. Please try again.' } : m
        )
      )
    } finally {
      setIsStreaming(false)
    }
  }, [input, isStreaming, messages, groupId])

  if (!isOpen) return null

  return (
    <div className="fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col border-l border-stone-700 bg-stone-900 shadow-2xl">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-stone-700 px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="text-lg">🐀</span>
          <span className="font-medium text-amber-400">Remy</span>
          <span className="rounded-full bg-amber-900/40 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider text-amber-500">
            Private
          </span>
        </div>
        <button onClick={onClose} className="text-stone-400 hover:text-white">
          <svg
            className="h-5 w-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        {messages.length === 0 && (
          <div className="flex flex-col items-center gap-2 py-12 text-center text-stone-500">
            <span className="text-3xl">🐀</span>
            <p className="text-sm">Ask Remy anything about this circle, the event, or the menu.</p>
            <p className="text-xs">This conversation is private and stays on your device.</p>
          </div>
        )}
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`mb-3 ${msg.role === 'user' ? 'flex justify-end' : 'flex justify-start'}`}
          >
            <div
              className={`max-w-[85%] rounded-2xl px-4 py-2 text-sm ${
                msg.role === 'user'
                  ? 'bg-amber-700/40 text-amber-100'
                  : 'bg-stone-800 text-stone-200'
              }`}
            >
              {msg.content || (
                <span className="inline-flex gap-1 text-stone-500">
                  <span className="animate-bounce">.</span>
                  <span className="animate-bounce" style={{ animationDelay: '0.1s' }}>
                    .
                  </span>
                  <span className="animate-bounce" style={{ animationDelay: '0.2s' }}>
                    .
                  </span>
                </span>
              )}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="border-t border-stone-700 px-4 py-3">
        <div className="flex gap-2">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                sendMessage()
              }
            }}
            placeholder="Ask Remy privately..."
            disabled={isStreaming}
            className="flex-1 rounded-lg border border-stone-600 bg-stone-800 px-3 py-2 text-sm text-white placeholder-stone-500 focus:border-amber-600 focus:outline-none"
          />
          <button
            onClick={sendMessage}
            disabled={isStreaming || !input.trim()}
            className="rounded-lg bg-amber-700 px-3 py-2 text-sm font-medium text-white hover:bg-amber-600 disabled:opacity-50"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  )
}
