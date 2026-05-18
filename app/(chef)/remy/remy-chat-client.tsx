'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { parseRemyStream } from '@/lib/ai/remy-stream-parser'
import {
  createConversation,
  saveMessage,
  autoTitleConversation,
  setMessageFeedback,
} from '@/lib/remy/actions'
import type { RemyConciergeContext } from '@/lib/remy/types'
import type { RemyTaskResult, NavigationSuggestion } from '@/lib/ai/remy-types'
import { RemyChatView, type ChatMessage } from './remy-chat-components'

interface RemyChatClientProps {
  initialContext: RemyConciergeContext | null
  remyEnabled: boolean
}

function generateId(): string {
  try {
    if (typeof crypto !== 'undefined' && (crypto as any).randomUUID)
      return (crypto as any).randomUUID()
  } catch {
    // fallback
  }
  return 'rm_' + Math.random().toString(36).slice(2) + Date.now().toString(36)
}

// ---- Component -------------------------------------------------------------

export function RemyChatClient({ initialContext, remyEnabled }: RemyChatClientProps) {
  const pathname = usePathname()

  // State
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [isStreaming, setIsStreaming] = useState(false)
  const [streamingContent, setStreamingContent] = useState('')
  const [streamingTasks, setStreamingTasks] = useState<RemyTaskResult[]>([])
  const [streamingNav, setStreamingNav] = useState<NavigationSuggestion[]>([])
  const [streamingQuickReplies, setStreamingQuickReplies] = useState<string[]>([])
  const [conversationId, setConversationId] = useState<string | null>(null)
  const [contextOpen, setContextOpen] = useState(false)
  const [context] = useState<RemyConciergeContext | null>(initialContext)

  // Refs
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const abortRef = useRef<AbortController | null>(null)
  const messageCountRef = useRef(0)

  // Auto-scroll to bottom
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [messages, streamingContent, scrollToBottom])

  // Auto-resize textarea
  const handleTextareaChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value)
    const ta = e.target
    ta.style.height = 'auto'
    ta.style.height = Math.min(ta.scrollHeight, 128) + 'px'
  }, [])

  // ---- Conversation management ---------------------------------------------

  const startNewConversation = useCallback(() => {
    abortRef.current?.abort()
    setMessages([])
    setConversationId(null)
    setStreamingContent('')
    setStreamingTasks([])
    setStreamingNav([])
    setStreamingQuickReplies([])
    setIsStreaming(false)
    setInput('')
    messageCountRef.current = 0
    textareaRef.current?.focus()
  }, [])

  const ensureConversation = useCallback(async (): Promise<string> => {
    if (conversationId) return conversationId
    const convo = await createConversation()
    setConversationId(convo.id)
    return convo.id
  }, [conversationId])

  // ---- Send message --------------------------------------------------------

  const sendMessage = useCallback(
    async (text?: string) => {
      const content = (text ?? input).trim()
      if (!content || isStreaming) return

      setInput('')
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto'
      }

      const userMsg: ChatMessage = {
        id: generateId(),
        localId: generateId(),
        role: 'user',
        content,
        timestamp: new Date().toISOString(),
      }
      setMessages((prev) => [...prev, userMsg])
      setIsStreaming(true)
      setStreamingContent('')
      setStreamingTasks([])
      setStreamingNav([])
      setStreamingQuickReplies([])

      let reader: ReadableStreamDefaultReader<Uint8Array> | undefined
      const controller = new AbortController()
      abortRef.current = controller
      const timeout = setTimeout(() => controller.abort(), 120_000)

      try {
        // Ensure conversation exists and save user message
        const convoId = await ensureConversation()
        const isFirstMessage = messageCountRef.current === 0
        messageCountRef.current += 1

        // Save user message to server (non-blocking)
        saveMessage(convoId, { role: 'user', content }).catch(() => {})

        // Auto-title from first user message (non-blocking)
        if (isFirstMessage) {
          autoTitleConversation(convoId, content).catch(() => {})
        }

        // Build history for the API (last 20 messages)
        const history = messages.slice(-20).map((m) => ({
          role: m.role,
          content: m.content,
        }))

        const response = await fetch('/api/remy/stream', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: content,
            history,
            pathname,
            activeForm: 'remy-concierge',
          }),
          signal: controller.signal,
        })

        if (!response.ok) throw new Error(`HTTP ${response.status}`)
        reader = response.body?.getReader()
        if (!reader) throw new Error('No response body')

        const result = await parseRemyStream(reader, {
          onToken: (token) => {
            setStreamingContent((prev) => prev + token)
          },
          onTasks: (tasks) => {
            setStreamingTasks(tasks)
          },
          onNav: (navs) => {
            setStreamingNav(navs)
          },
          onQuickReplies: (replies) => {
            setStreamingQuickReplies(replies)
          },
          onError: () => {
            setStreamingContent('')
          },
        })

        // Build final Remy message
        const remyMsg: ChatMessage = {
          id: generateId(),
          localId: generateId(),
          role: 'remy',
          content: result.fullContent.replace(/\nNAV_SUGGESTIONS:\s*\[[\s\S]*\]/, '').trim(),
          tasks: result.tasks,
          navSuggestions: result.navSuggestions,
          quickReplies: result.quickReplies,
          timestamp: new Date().toISOString(),
        }

        setMessages((prev) => [...prev, remyMsg])
        setStreamingContent('')
        setStreamingTasks([])
        setStreamingNav([])
        setStreamingQuickReplies([])

        // Save Remy message to server (non-blocking)
        saveMessage(convoId, {
          role: 'remy',
          content: remyMsg.content,
          tasks: remyMsg.tasks,
          nav_suggestions: remyMsg.navSuggestions,
          quick_replies: remyMsg.quickReplies,
        })
          .then((saved) => {
            // Store server ID for feedback
            setMessages((prev) =>
              prev.map((m) => (m.id === remyMsg.id ? { ...m, serverId: saved.id } : m))
            )
          })
          .catch(() => {})
      } catch (err: unknown) {
        if (err instanceof DOMException && err.name === 'AbortError') {
          const cancelMsg: ChatMessage = {
            id: generateId(),
            localId: generateId(),
            role: 'remy',
            content: 'Request was cancelled or timed out. Try again when ready.',
            timestamp: new Date().toISOString(),
          }
          setMessages((prev) => [...prev, cancelMsg])
        } else {
          const errText = err instanceof Error ? err.message : 'Something went wrong. Try again.'
          const errorMsg: ChatMessage = {
            id: generateId(),
            localId: generateId(),
            role: 'remy',
            content: errText,
            timestamp: new Date().toISOString(),
          }
          setMessages((prev) => [...prev, errorMsg])
        }
        setStreamingContent('')
        setStreamingTasks([])
        setStreamingNav([])
        setStreamingQuickReplies([])
      } finally {
        clearTimeout(timeout)
        reader?.cancel().catch(() => {})
        abortRef.current = null
        setIsStreaming(false)
      }
    },
    [input, isStreaming, messages, pathname, ensureConversation]
  )

  // ---- Stop streaming ------------------------------------------------------

  const handleStop = useCallback(() => {
    abortRef.current?.abort()
  }, [])

  // ---- Feedback ------------------------------------------------------------

  const handleFeedback = useCallback((msg: ChatMessage, type: 'up' | 'down') => {
    const newFeedback = msg.feedback === type ? null : type
    setMessages((prev) => prev.map((m) => (m.id === msg.id ? { ...m, feedback: newFeedback } : m)))
    if (msg.serverId) {
      setMessageFeedback(msg.serverId, newFeedback).catch(() => {})
    }
  }, [])

  // ---- Key handling --------------------------------------------------------

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault()
        sendMessage()
      }
    },
    [sendMessage]
  )

  // ---- Quick ask -----------------------------------------------------------

  const handleQuickAsk = useCallback(
    (label: string) => {
      sendMessage(label)
    },
    [sendMessage]
  )

  // ---- Navigation suggestion click -----------------------------------------

  const handleNavClick = useCallback((href: string) => {
    window.location.href = href
  }, [])

  // ---- Quick reply click ---------------------------------------------------

  const handleQuickReply = useCallback(
    (reply: string) => {
      sendMessage(reply)
    },
    [sendMessage]
  )

  // ---- Cleanup on unmount --------------------------------------------------

  useEffect(() => {
    return () => {
      abortRef.current?.abort()
    }
  }, [])

  // ---- Context stats -------------------------------------------------------

  const upcomingCount = context?.upcoming_events?.length ?? 0
  const overdueCount = context?.overdue_tasks?.length ?? 0
  const unreadCount = context?.unread_inbox ?? 0
  const insightCount = context?.cil_insights?.length ?? 0
  const hasContext = upcomingCount > 0 || overdueCount > 0 || unreadCount > 0 || insightCount > 0

  // ---- Render --------------------------------------------------------------

  const isEmpty = messages.length === 0 && !isStreaming

  return (
    <RemyChatView
      remyEnabled={remyEnabled}
      messages={messages}
      input={input}
      isStreaming={isStreaming}
      streamingContent={streamingContent}
      streamingTasks={streamingTasks}
      streamingNav={streamingNav}
      streamingQuickReplies={streamingQuickReplies}
      context={context}
      contextOpen={contextOpen}
      hasContext={hasContext}
      isEmpty={isEmpty}
      textareaRef={textareaRef}
      messagesEndRef={messagesEndRef}
      setContextOpen={setContextOpen}
      startNewConversation={startNewConversation}
      handleQuickAsk={handleQuickAsk}
      handleFeedback={handleFeedback}
      handleNavClick={handleNavClick}
      handleQuickReply={handleQuickReply}
      handleTextareaChange={handleTextareaChange}
      handleKeyDown={handleKeyDown}
      handleStop={handleStop}
      sendMessage={sendMessage}
    />
  )
}
