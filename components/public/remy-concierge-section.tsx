'use client'

// Remy Concierge Section — Inline chat on the landing page
// The marketing hook: "Tell me what's eating your time."
// Visitors type their pain point → Remy maps it to a ChefFlow feature → aha moment.
// Falls back to a static FAQ accordion if Ollama is offline.

import { useState, useRef, useEffect, useCallback } from 'react'
import { Send, Loader2, MessageCircle, ChevronDown } from 'lucide-react'
import Link from 'next/link'
import { getStarterPainPoints, CHEFFLOW_FEATURE_MAP } from '@/lib/ai/chefflow-feature-map'

interface Message {
  id: string
  role: 'user' | 'remy'
  content: string
}

export function RemyConciergeSection() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isStreaming, setIsStreaming] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [ollamaOffline, setOllamaOffline] = useState(false)
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const abortRef = useRef<AbortController | null>(null)
  const chatAreaRef = useRef<HTMLDivElement>(null)

  const starters = getStarterPainPoints()

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

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
                const errorMsg = String(event.data)
                if (errorMsg.includes('quick break') || errorMsg.includes('back shortly')) {
                  setOllamaOffline(true)
                  // Remove the empty remy message
                  setMessages((prev) => prev.filter((m) => m.id !== remyMsg.id))
                } else {
                  setError(errorMsg)
                }
              }
            } catch {
              // Skip malformed events
            }
          }
        }
      } catch (err: any) {
        if (err?.name !== 'AbortError') {
          setOllamaOffline(true)
          setMessages((prev) => prev.filter((m) => m.id !== remyMsg.id))
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

  const hasConversation = messages.length > 0

  // Static FAQ fallback when Ollama is offline
  if (ollamaOffline && !hasConversation) {
    return (
      <section className="border-y border-stone-700 bg-gradient-to-b from-brand-50/60 to-white">
        <div className="mx-auto w-full max-w-6xl px-4 py-14 sm:px-6 md:py-20 lg:px-8">
          <div className="mb-10 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-900 text-brand-400">
              <MessageCircle className="h-7 w-7" />
            </div>
            <h2 className="text-3xl font-display tracking-tight text-stone-100 md:text-4xl">
              What do you need done?
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-stone-400">
              Here are the most common things private chefs ask about.
            </p>
          </div>
          <div className="mx-auto max-w-2xl space-y-3">
            {CHEFFLOW_FEATURE_MAP.slice(0, 8).map((feature, i) => (
              <div
                key={i}
                className="overflow-hidden rounded-xl border border-stone-700 bg-stone-900 transition-shadow hover:shadow-sm"
              >
                <button
                  onClick={() => setExpandedFaq(expandedFaq === i ? null : i)}
                  className="flex w-full items-center justify-between px-5 py-4 text-left"
                >
                  <span className="text-sm font-medium text-stone-200">{feature.painPoint}</span>
                  <ChevronDown
                    className={`h-4 w-4 shrink-0 text-stone-400 transition-transform ${expandedFaq === i ? 'rotate-180' : ''}`}
                  />
                </button>
                {expandedFaq === i && (
                  <div className="border-t border-stone-800 bg-stone-800 px-5 py-4">
                    <p className="text-sm leading-relaxed text-stone-400">{feature.solution}</p>
                    <p className="mt-3 text-xs font-medium text-brand-400">
                      {feature.featureName} — {feature.tier === 'free' ? 'included free' : 'Pro'}
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
          <div className="mt-10 text-center">
            <Link
              href="/auth/signup"
              className="inline-flex items-center justify-center rounded-lg bg-brand-600 px-7 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-brand-700"
            >
              Try it free
            </Link>
          </div>
        </div>
      </section>
    )
  }

  return (
    <section className="border-y border-stone-700 bg-gradient-to-b from-brand-50/60 to-white">
      <div className="mx-auto w-full max-w-6xl px-4 py-14 sm:px-6 md:py-20 lg:px-8">
        <div className="mb-10 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-900 text-brand-400">
            <MessageCircle className="h-7 w-7" />
          </div>
          <h2 className="text-3xl font-display tracking-tight text-stone-100 md:text-4xl">
            Tell me what&apos;s eating your time.
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-stone-400">
            Skeptical? Good. Ask Remy if ChefFlow can handle your specific problem — and he&apos;ll
            show you exactly how.
          </p>
        </div>

        <div className="mx-auto max-w-2xl">
          {/* Starter pills — only show before first message */}
          {!hasConversation && (
            <div className="mb-6 flex flex-wrap justify-center gap-2">
              {starters.map((s) => (
                <button
                  key={s.label}
                  onClick={() => sendMessage(s.message)}
                  disabled={isStreaming}
                  className="rounded-full border border-brand-700 bg-stone-900 px-4 py-2 text-sm text-brand-400 transition-all hover:border-brand-400 hover:bg-brand-950 hover:shadow-sm disabled:opacity-50"
                >
                  {s.label}
                </button>
              ))}
            </div>
          )}

          {/* Chat area */}
          {hasConversation && (
            <div
              ref={chatAreaRef}
              className="mb-4 max-h-[400px] overflow-y-auto rounded-2xl border border-stone-700 bg-stone-900 p-4 shadow-sm"
            >
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`mb-3 flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  {msg.role === 'remy' && (
                    <div className="mr-2 mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-600 text-xs font-bold text-white">
                      R
                    </div>
                  )}
                  <div
                    className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                      msg.role === 'user'
                        ? 'bg-brand-600 text-white'
                        : 'bg-stone-800 text-stone-200'
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
          )}

          {/* Input area */}
          <div className="flex items-end gap-2">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="What's your biggest challenge as a private chef?"
              rows={1}
              className="flex-1 resize-none rounded-xl border border-stone-600 bg-stone-900 px-4 py-3 text-sm text-stone-200 placeholder-stone-400 outline-none transition-all focus:border-brand-400 focus:ring-2 focus:ring-brand-400/20"
              disabled={isStreaming}
              style={{ maxHeight: '100px' }}
            />
            <button
              onClick={() => sendMessage()}
              disabled={!input.trim() || isStreaming}
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-brand-600 text-white transition-colors hover:bg-brand-700 disabled:opacity-40"
              aria-label="Send message"
            >
              {isStreaming ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </button>
          </div>

          <p className="mt-2 text-center text-xs text-stone-400">
            Powered by ChefFlow&apos;s private AI — no data stored
          </p>

          {/* CTA after conversation */}
          {messages.length >= 4 && !isStreaming && (
            <div className="mt-6 text-center">
              <Link
                href="/auth/signup"
                className="inline-flex items-center justify-center rounded-lg bg-brand-600 px-7 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-brand-700"
              >
                Try it free — no credit card needed
              </Link>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
