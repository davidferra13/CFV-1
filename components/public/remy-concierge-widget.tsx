'use client'

// Remy Concierge Widget - Floating chatbot on ALL public pages (including landing).
// Open by default on first visit. Collapsible. Inviting chatbot look.
// Platform-level concierge: no tenantId, hits /api/remy/landing endpoint.

import { useState, useRef, useEffect, useCallback } from 'react'
import { X, Send, Loader2, Minus, Maximize2, Minimize2 } from '@/components/ui/icons'
import { RemyMascotButton } from '@/components/ai/remy-mascot-button'
import { RemyAvatar } from '@/components/ai/remy-avatar'
import { ANALYTICS_EVENTS, trackEvent } from '@/lib/analytics/posthog'
import { getStarterPainPoints } from '@/lib/ai/chefflow-feature-map'
import { useRemyDisplayMode } from '@/lib/hooks/use-remy-display-mode'

const DEFAULT_WIDTH = 380
const DEFAULT_HEIGHT = 520
const MIN_WIDTH = 300
const MIN_HEIGHT = 350

interface Message {
  id: string
  role: 'user' | 'remy'
  content: string
}

export function RemyConciergeWidget() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isStreaming, setIsStreaming] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isMaximized, setIsMaximized] = useState(false)
  const [size, setSize] = useState({ w: DEFAULT_WIDTH, h: DEFAULT_HEIGHT })
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const abortRef = useRef<AbortController | null>(null)
  const widgetRef = useRef<HTMLDivElement>(null)
  const resizingRef = useRef<{
    edge: string
    startX: number
    startY: number
    startW: number
    startH: number
  } | null>(null)
  const { mode, isHydrated, isMobile, setMode } = useRemyDisplayMode({
    storageKey: 'cf:remy:public-concierge:display-mode',
    desktopDefault: 'docked',
    mobileDefault: 'hidden',
  })
  const isOpen = mode === 'expanded'

  const starters = getStarterPainPoints()

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    if (isOpen && isHydrated) {
      setTimeout(() => inputRef.current?.focus(), 200)
    }
  }, [isOpen, isHydrated])

  const handleCollapse = useCallback(() => {
    setMode('docked')
  }, [setMode])

  const handleOpen = useCallback(() => {
    trackEvent(ANALYTICS_EVENTS.REMY_CHAT_OPENED, { source: 'public_widget' })
    setMode('expanded')
  }, [setMode])

  const sendMessage = useCallback(
    async (text?: string) => {
      const trimmed = (text ?? input).trim()
      if (!trimmed || isStreaming) return

      trackEvent(ANALYTICS_EVENTS.REMY_MESSAGE_SENT, {
        source: 'public_widget',
        message_length: trimmed.length,
      })
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
          setError("Couldn't reach Remy - try again in a moment.")
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

  const toggleMaximize = useCallback(() => {
    if (isMobile) return
    setIsMaximized((prev) => {
      const next = !prev
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('remy-maximized', next ? '1' : '0')
      }
      return next
    })
  }, [isMobile])

  // Restore maximized state from session
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const max = sessionStorage.getItem('remy-maximized')
      if (max === '1') setIsMaximized(true)
      const savedW = sessionStorage.getItem('remy-width')
      const savedH = sessionStorage.getItem('remy-height')
      if (savedW && savedH) {
        setSize({ w: parseInt(savedW, 10), h: parseInt(savedH, 10) })
      }
    }
  }, [])

  // Track active drag listeners so they can be cleaned up on unmount
  const dragCleanupRef = useRef<(() => void) | null>(null)

  // Cleanup drag listeners on unmount (prevents leak if component unmounts mid-drag)
  useEffect(() => {
    return () => {
      dragCleanupRef.current?.()
    }
  }, [])

  // Edge/corner resize via mouse drag
  const startResize = useCallback(
    (edge: string) => (e: React.MouseEvent) => {
      e.preventDefault()
      if (isMaximized || isMobile) return
      resizingRef.current = {
        edge,
        startX: e.clientX,
        startY: e.clientY,
        startW: size.w,
        startH: size.h,
      }

      const onMouseMove = (ev: MouseEvent) => {
        if (!resizingRef.current) return
        const { edge: ed, startX, startY, startW, startH } = resizingRef.current
        let newW = startW
        let newH = startH

        if (ed.includes('w')) newW = Math.max(MIN_WIDTH, startW + (startX - ev.clientX))
        if (ed.includes('e')) newW = Math.max(MIN_WIDTH, startW + (ev.clientX - startX))
        if (ed.includes('n')) newH = Math.max(MIN_HEIGHT, startH + (startY - ev.clientY))
        if (ed.includes('s')) newH = Math.max(MIN_HEIGHT, startH + (ev.clientY - startY))

        // Clamp to viewport
        newW = Math.min(newW, window.innerWidth - 32)
        newH = Math.min(newH, window.innerHeight - 32)

        setSize({ w: newW, h: newH })
      }

      const cleanup = () => {
        document.removeEventListener('mousemove', onMouseMove)
        document.removeEventListener('mouseup', onMouseUp)
        dragCleanupRef.current = null
      }

      const onMouseUp = () => {
        if (resizingRef.current) {
          const el = widgetRef.current
          if (el) {
            sessionStorage.setItem('remy-width', String(el.offsetWidth))
            sessionStorage.setItem('remy-height', String(el.offsetHeight))
          }
        }
        resizingRef.current = null
        cleanup()
      }

      document.addEventListener('mousemove', onMouseMove)
      document.addEventListener('mouseup', onMouseUp)
      dragCleanupRef.current = cleanup
    },
    [isMaximized, isMobile, size]
  )

  if (!isHydrated || mode === 'hidden') {
    return null
  }

  // Docked state - compact launcher
  if (!isOpen) {
    return (
      <RemyMascotButton
        onClick={handleOpen}
        variant="docked"
        showOnlineDot
        className={isMobile ? 'bottom-3 right-3' : 'bottom-6 right-6'}
        ariaLabel="Open Remy chat"
      />
    )
  }

  // Open state - full chatbot widget
  // Outer wrapper: NO overflow-hidden so resize handles are never clipped.
  // Inner wrapper: overflow-hidden + rounded corners for content clipping.
  return (
    <div
      ref={widgetRef}
      className={`fixed z-50 ${isMobile ? 'inset-x-2 bottom-2 top-20' : isMaximized ? 'inset-4' : 'bottom-6 right-6'}`}
      style={
        isMobile || isMaximized
          ? undefined
          : {
              width: `min(${size.w}px, calc(100vw - 2rem))`,
              height: `min(${size.h}px, calc(100vh - 2rem))`,
            }
      }
    >
      {/* Resize handles - OUTSIDE overflow-hidden so they are NEVER clipped.
           Corner handles are 20px hit area and higher z-index (z-30) so they
           ALWAYS win over edge handles. This is a permanent rule - do not
           shrink corners or lower their z-index. Ever. */}
      {!isMobile && !isMaximized && (
        <>
          {/* Edge handles (z-20) - inset so they don't overlap corners */}
          <div
            onMouseDown={startResize('n')}
            className="absolute top-0 left-5 right-5 h-2 z-20 cursor-n-resize hover:bg-brand-400/20 active:bg-brand-400/40 transition-colors"
          />
          <div
            onMouseDown={startResize('s')}
            className="absolute bottom-0 left-5 right-5 h-2 z-20 cursor-s-resize hover:bg-brand-400/20 active:bg-brand-400/40 transition-colors"
          />
          <div
            onMouseDown={startResize('w')}
            className="absolute left-0 top-5 bottom-5 w-2 z-20 cursor-w-resize hover:bg-brand-400/20 active:bg-brand-400/40 transition-colors"
          />
          <div
            onMouseDown={startResize('e')}
            className="absolute right-0 top-5 bottom-5 w-2 z-20 cursor-e-resize hover:bg-brand-400/20 active:bg-brand-400/40 transition-colors"
          />
          {/* Corner handles (z-30, 20px) - MUST be larger and above edges.
               These extend slightly OUTSIDE the rounded border to ensure
               they are always grabbable and never clipped. */}
          <div
            onMouseDown={startResize('nw')}
            className="absolute -top-1 -left-1 h-5 w-5 z-30 cursor-nw-resize hover:bg-brand-400/20 active:bg-brand-400/40 transition-colors rounded-tl-lg"
          />
          <div
            onMouseDown={startResize('ne')}
            className="absolute -top-1 -right-1 h-5 w-5 z-30 cursor-ne-resize hover:bg-brand-400/20 active:bg-brand-400/40 transition-colors rounded-tr-lg"
          />
          <div
            onMouseDown={startResize('sw')}
            className="absolute -bottom-1 -left-1 h-5 w-5 z-30 cursor-sw-resize hover:bg-brand-400/20 active:bg-brand-400/40 transition-colors rounded-bl-lg"
          />
          <div
            onMouseDown={startResize('se')}
            className="absolute -bottom-1 -right-1 h-5 w-5 z-30 cursor-se-resize hover:bg-brand-400/20 active:bg-brand-400/40 transition-colors rounded-br-lg"
          />
        </>
      )}

      {/* Inner content wrapper - overflow-hidden here for rounded clipping.
           z-10 ensures resize handles (z-20 edges, z-30 corners) are ALWAYS above content.
           Without this, animate-in / shadow-2xl can create a stacking context that covers handles. */}
      <div
        className={`relative z-10 flex flex-col h-full overflow-hidden border border-stone-700 bg-stone-900 shadow-2xl animate-in fade-in slide-in-from-bottom-4 duration-300 ${
          isMaximized ? 'rounded-xl' : 'rounded-2xl'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between bg-brand-600 px-4 py-3.5">
          <div className="flex items-center gap-3">
            <RemyAvatar size="sm" />
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
            {!isMobile && (
              <button
                onClick={toggleMaximize}
                className="rounded-lg p-1.5 text-white/60 transition-colors hover:bg-stone-800/10 hover:text-white"
                aria-label={isMaximized ? 'Restore chat size' : 'Maximize chat'}
                title={isMaximized ? 'Restore' : 'Maximize'}
              >
                {isMaximized ? (
                  <Minimize2 className="h-4 w-4" />
                ) : (
                  <Maximize2 className="h-4 w-4" />
                )}
              </button>
            )}
            <button
              onClick={handleCollapse}
              className="rounded-lg p-1.5 text-white/60 transition-colors hover:bg-stone-800/10 hover:text-white"
              aria-label="Minimize chat"
            >
              <Minus className="h-4 w-4" />
            </button>
            <button
              onClick={handleCollapse}
              className="rounded-lg p-1.5 text-white/60 transition-colors hover:bg-stone-800/10 hover:text-white"
              aria-label="Close chat"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto bg-stone-800 p-4" style={{ minHeight: '120px' }}>
          {messages.length === 0 && (
            <div className="space-y-4">
              {/* Welcome message - looks like a chat bubble from Remy */}
              <div className="flex items-start gap-2">
                <RemyAvatar size="sm" className="!w-7 !h-7" />
                <div className="max-w-[85%] rounded-2xl rounded-tl-sm bg-stone-900 px-4 py-3 text-sm leading-relaxed text-stone-300 shadow-sm">
                  I&apos;m Remy, your ChefFlow concierge.
                  <br />
                  <br />
                  Tell me your biggest admin bottleneck and I&apos;ll show you how ChefFlow handles
                  it.
                </div>
              </div>

              {/* Starter suggestions */}
              <div className="ml-9 flex flex-wrap gap-1.5">
                {starters.map((s) => (
                  <button
                    key={s.label}
                    onClick={() => sendMessage(s.message)}
                    disabled={isStreaming}
                    className="rounded-full border border-brand-700 bg-stone-900 px-3 py-1.5 text-xs font-medium text-brand-400 transition-all hover:border-brand-400 hover:bg-brand-950 hover:shadow-sm disabled:opacity-50"
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
              {msg.role === 'remy' && <RemyAvatar size="sm" className="!w-7 !h-7" />}
              <div
                className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
                  msg.role === 'user'
                    ? 'bg-brand-600 text-white rounded-br-sm'
                    : 'bg-stone-900 text-stone-200 shadow-sm rounded-tl-sm'
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
              onChange={(e) => {
                if (e.target.value.length <= 500) setInput(e.target.value)
              }}
              maxLength={500}
              onKeyDown={handleKeyDown}
              placeholder="Type a message..."
              rows={1}
              className="flex-1 resize-none rounded-xl border border-stone-700 bg-stone-800 px-3.5 py-2.5 text-sm text-stone-200 placeholder-stone-400 outline-none transition-colors focus:border-brand-400 focus:bg-stone-900 focus:ring-1 focus:ring-brand-400"
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
          <div className="mt-1.5 flex flex-col gap-0.5 px-1">
            <div className="flex items-center justify-between">
              <p className="text-[10px] text-stone-400">
                Remy can make mistakes. Verify important details.
              </p>
              <span
                className={`text-[10px] tabular-nums ${input.length >= 450 ? (input.length >= 500 ? 'text-red-500 font-medium' : 'text-amber-500') : 'text-stone-400'}`}
              >
                {input.length}/500
              </span>
            </div>
            <p className="text-[10px] text-stone-500 italic">Replies may take a moment.</p>
          </div>
        </div>
      </div>
      {/* end inner content wrapper */}
    </div>
  )
}
