'use client'

// Remy - Client Portal Chat Component
// Inline chat panel for the client portal. Simpler than the chef drawer -
// no commands, no tasks, no memory management. Just conversational Q&A.

import { useState, useRef, useEffect, useCallback } from 'react'
import { X, Send, Loader2, ChevronDown, Minus } from '@/components/ui/icons'
import { RemyMascotButton } from '@/components/ai/remy-mascot-button'
import { RemyAvatar } from '@/components/ai/remy-avatar'
import { useRemyDisplayMode } from '@/lib/hooks/use-remy-display-mode'
import { SPEED_PRIVACY_SHORT } from '@/lib/ai/privacy-narrative'

interface Message {
  id: string
  role: 'user' | 'remy'
  content: string
  timestamp: string
}

interface NavSuggestion {
  label: string
  href: string
}

const ALLOWED_NAV_PREFIXES = [
  '/my-events',
  '/my-inquiries',
  '/my-quotes',
  '/my-profile',
  '/my-hub',
  '/my-rewards',
  '/my-bookings',
]

function sanitizeNavSuggestion(value: unknown): NavSuggestion | null {
  if (!value || typeof value !== 'object') return null
  const raw = value as Record<string, unknown>
  const label = typeof raw.label === 'string' ? raw.label.trim().slice(0, 80) : ''
  const href = typeof raw.href === 'string' ? raw.href.trim() : ''

  if (!label || !href.startsWith('/') || href.startsWith('//')) return null
  if (href.includes('\\') || /[\r\n]/.test(href)) return null
  if (!ALLOWED_NAV_PREFIXES.some((prefix) => href === prefix || href.startsWith(`${prefix}/`))) {
    return null
  }

  return { label, href }
}

export function RemyClientChat() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isStreaming, setIsStreaming] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [navSuggestions, setNavSuggestions] = useState<NavSuggestion[]>([])
  const { mode, isHydrated, isMobile, setMode } = useRemyDisplayMode({
    storageKey: 'cf:remy:client-portal:display-mode',
    desktopDefault: 'docked',
    mobileDefault: 'hidden',
  })
  const isOpen = mode === 'expanded'
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const abortRef = useRef<AbortController | null>(null)
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

  // Parse nav suggestions from response
  const parseNavSuggestions = (
    content: string
  ): { cleanContent: string; navs: NavSuggestion[] } => {
    const navMatch = content.match(/NAV_SUGGESTIONS:\s*(\[[\s\S]*?\])/)
    if (!navMatch) return { cleanContent: content, navs: [] }

    try {
      const parsed = JSON.parse(navMatch[1])
      const navs = Array.isArray(parsed)
        ? parsed.map(sanitizeNavSuggestion).filter((nav): nav is NavSuggestion => Boolean(nav))
        : []
      const cleanContent = content.replace(/NAV_SUGGESTIONS:\s*\[[\s\S]*?\]/, '').trim()
      return { cleanContent, navs }
    } catch {
      return { cleanContent: content, navs: [] }
    }
  }

  const sendMessage = useCallback(async (overrideText?: string) => {
    const trimmed = (overrideText ?? input).trim()
    if (!trimmed || isStreaming) return

    setError(null)
    setNavSuggestions([])

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

    // Build history for context
    const history = messages.slice(-8).map((m) => ({
      role: m.role === 'user' ? 'user' : 'assistant',
      content: m.content,
    }))

    try {
      abortRef.current = new AbortController()
      const response = await fetch('/api/remy/client', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: trimmed, history }),
        signal: abortRef.current.signal,
      })

      if (response.status === 401) {
        setError('Please sign in to chat with Remy.')
        setIsStreaming(false)
        return
      }

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
            } else if (event.type === 'done') {
              // Parse nav suggestions from final content
              setMessages((prev) => {
                const updated = [...prev]
                const last = updated[updated.length - 1]
                if (last && last.role === 'remy') {
                  const { cleanContent, navs } = parseNavSuggestions(last.content)
                  last.content = cleanContent
                  if (navs.length > 0) setNavSuggestions(navs)
                }
                return updated
              })
            }
          } catch {
            // Skip malformed events
          }
        }
      }
    } catch (err: any) {
      if (err?.name !== 'AbortError') {
        setError("Couldn't reach Remy - try again in a moment.")
      }
    } finally {
      setIsStreaming(false)
      abortRef.current = null
    }
  }, [input, isStreaming, messages])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  if (!isOpen) {
    if (!isHydrated || mode === 'hidden') return null

    return (
      <RemyMascotButton
        onClick={() => setMode('expanded')}
        variant="docked"
        className={isMobile ? 'bottom-3 right-3' : 'bottom-6 right-6'}
        ariaLabel="Open Remy chat"
      />
    )
  }

  return (
    <div
      className={`fixed z-50 flex flex-col overflow-hidden rounded-2xl border border-stone-700 bg-stone-900 shadow-2xl ${
        isMobile
          ? 'inset-x-2 bottom-2 top-20'
          : 'bottom-6 right-6 w-[400px] max-w-[calc(100vw-2rem)]'
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-stone-700 bg-brand-950 px-4 py-3">
        <div className="flex items-center gap-2">
          <RemyAvatar size="sm" />
          <div>
            <div className="text-sm font-semibold text-stone-100">Remy</div>
            <div className="text-xs text-stone-400">Your event concierge</div>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setMode('docked')}
            className="rounded-lg p-1.5 text-stone-400 transition-colors hover:bg-stone-800 hover:text-stone-300"
            aria-label="Minimize chat"
          >
            <Minus className="h-4 w-4" />
          </button>
          <button
            onClick={() => setMode('hidden')}
            className="rounded-lg p-1.5 text-stone-400 transition-colors hover:bg-stone-800 hover:text-stone-300"
            aria-label="Close chat"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div
        className="flex-1 overflow-y-auto p-4"
        style={{ maxHeight: isMobile ? 'none' : '450px', minHeight: '250px' }}
      >
        {messages.length === 0 && (
          <div className="py-8 text-center">
            <div className="text-3xl">👨‍🍳</div>
            <p className="mt-2 text-sm font-medium text-stone-200">
              Hi! I&apos;m Remy, your event concierge.
            </p>
            <p className="mt-1 text-xs text-stone-400">
              Ask me about your upcoming events, menus, quotes, or dietary needs.
            </p>
            <div className="mt-4 flex flex-wrap justify-center gap-1.5">
              {['When is my next event?', 'Show me my menu', "What's the payment status?"].map(
                (q) => (
                  <button
                    key={q}
                    onClick={() => sendMessage(q)}
                    className="rounded-full border border-brand-700 bg-brand-950 px-3 py-1.5 text-xs text-brand-400 transition-colors hover:bg-brand-900"
                  >
                    {q}
                  </button>
                )
              )}
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

        {/* Nav suggestions */}
        {navSuggestions.length > 0 && !isStreaming && (
          <div className="mb-3 flex flex-wrap gap-1.5">
            {navSuggestions.map((nav) => (
              <a
                key={nav.href}
                href={nav.href}
                className="inline-flex items-center gap-1 rounded-full border border-brand-700 bg-brand-950 px-3 py-1.5 text-xs font-medium text-brand-400 transition-colors hover:bg-brand-900"
              >
                {nav.label}
                <ChevronDown className="h-3 w-3 rotate-[-90deg]" />
              </a>
            ))}
          </div>
        )}

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
            placeholder="Ask about your events, menus, or bookings..."
            rows={1}
            className="flex-1 resize-none rounded-xl border border-stone-600 bg-stone-800 px-3.5 py-2.5 text-sm text-stone-200 placeholder-stone-500 outline-none transition-colors focus:border-brand-400 focus:ring-1 focus:ring-brand-400"
            disabled={isStreaming}
            style={{ maxHeight: '100px' }}
          />
          <button
            onClick={() => sendMessage()}
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
        <p className="mt-1.5 text-center text-xxs text-stone-500">{SPEED_PRIVACY_SHORT}</p>
      </div>
    </div>
  )
}
