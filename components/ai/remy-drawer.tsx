'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import {
  Bot,
  X,
  Send,
  Loader2,
  ArrowRight,
  CalendarDays,
  TrendingUp,
  Mail,
  Users,
  AlertCircle,
  History,
  Plus,
  MessageSquare,
  ChevronLeft,
  Trash2,
  Brain,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { RemyTaskCard } from '@/components/ai/remy-task-card'
import { sendRemyMessage } from '@/lib/ai/remy-actions'
import { approveTask } from '@/lib/ai/command-orchestrator'
import { saveRemyMessage, saveRemyTaskResult } from '@/lib/ai/remy-artifact-actions'
import {
  createConversation,
  listConversations,
  loadConversationMessages,
  saveConversationMessage,
  autoTitleConversation,
  deleteConversation,
} from '@/lib/ai/remy-conversation-actions'
import { extractAndSaveMemories, deleteRemyMemory } from '@/lib/ai/remy-memory-actions'
import { toast } from 'sonner'
import type { RemyMessage, RemyMemoryItem } from '@/lib/ai/remy-types'
import type { RemyConversation } from '@/lib/ai/remy-conversation-actions'

function generateId(): string {
  try {
    if (typeof crypto !== 'undefined' && (crypto as any).randomUUID)
      return (crypto as any).randomUUID()
    if (typeof window !== 'undefined' && window.crypto && (window.crypto as any).randomUUID)
      return (window.crypto as any).randomUUID()
  } catch (e) {
    // ignore and fallback
  }
  return 'id_' + Math.random().toString(36).slice(2) + Date.now().toString(36)
}

const REMY_STARTERS = [
  { text: "What's on my plate this week?", icon: CalendarDays },
  { text: "How's business looking this month?", icon: TrendingUp },
  { text: 'Draft a follow-up for my last event', icon: Mail },
  { text: 'Show my memories', icon: Brain },
]

export function RemyDrawer() {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<RemyMessage[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [elapsedSec, setElapsedSec] = useState(0)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const pathname = usePathname()

  // Conversation threading state
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null)
  const [conversations, setConversations] = useState<RemyConversation[]>([])
  const [showConversationList, setShowConversationList] = useState(false)
  const [conversationsLoaded, setConversationsLoaded] = useState(false)
  const [isFirstExchange, setIsFirstExchange] = useState(true)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Auto-focus textarea when drawer opens
  useEffect(() => {
    if (open) {
      setTimeout(() => textareaRef.current?.focus(), 100)
    }
  }, [open])

  // Elapsed timer while loading
  useEffect(() => {
    if (!loading) {
      setElapsedSec(0)
      return
    }
    const interval = setInterval(() => setElapsedSec((s) => s + 1), 1000)
    return () => clearInterval(interval)
  }, [loading])

  // Load conversations when drawer opens for the first time
  useEffect(() => {
    if (open && !conversationsLoaded) {
      loadConversationList()
    }
  }, [open, conversationsLoaded])

  const loadConversationList = useCallback(async () => {
    try {
      const result = await listConversations({ limit: 30 })
      setConversations(result.conversations)
      setConversationsLoaded(true)

      // Auto-load the most recent conversation if one exists
      if (result.conversations.length > 0 && !currentConversationId) {
        const latest = result.conversations[0]
        setCurrentConversationId(latest.id)
        const msgs = await loadConversationMessages(latest.id)
        setMessages(msgs)
        setIsFirstExchange(msgs.length === 0)
      }
    } catch (err) {
      console.error('[remy] Failed to load conversations:', err)
    }
  }, [currentConversationId])

  const handleSelectConversation = useCallback(async (convId: string) => {
    try {
      const msgs = await loadConversationMessages(convId)
      setMessages(msgs)
      setCurrentConversationId(convId)
      setShowConversationList(false)
      setIsFirstExchange(msgs.length === 0)
    } catch (err) {
      console.error('[remy] Failed to load conversation:', err)
      toast.error('Failed to load conversation')
    }
  }, [])

  const handleNewConversation = useCallback(async () => {
    try {
      const { id } = await createConversation()
      setCurrentConversationId(id)
      setMessages([])
      setShowConversationList(false)
      setIsFirstExchange(true)
      // Add to local list
      setConversations((prev) => [
        {
          id,
          title: 'New conversation',
          isActive: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        ...prev,
      ])
    } catch (err) {
      console.error('[remy] Failed to create conversation:', err)
      toast.error('Failed to start new conversation')
    }
  }, [])

  const handleDeleteConversation = useCallback(
    async (convId: string) => {
      try {
        await deleteConversation(convId)
        setConversations((prev) => prev.filter((c) => c.id !== convId))
        if (currentConversationId === convId) {
          setCurrentConversationId(null)
          setMessages([])
          setIsFirstExchange(true)
        }
        toast.success('Conversation deleted')
      } catch (err) {
        console.error('[remy] Failed to delete conversation:', err)
        toast.error('Failed to delete conversation')
      }
    },
    [currentConversationId]
  )

  const handleDeleteMessage = useCallback((msgId: string) => {
    setMessages((prev) => prev.filter((m) => m.id !== msgId))
    toast.success('Message removed')
  }, [])

  const handleDeleteMemory = useCallback(async (memoryId: string) => {
    try {
      await deleteRemyMemory(memoryId)
      // Remove the memory item from the message that contains it
      setMessages((prev) =>
        prev.map((msg) => {
          if (!msg.memoryItems) return msg
          return {
            ...msg,
            memoryItems: msg.memoryItems.filter((m) => m.id !== memoryId),
          }
        })
      )
      toast.success('Memory deleted')
    } catch (err) {
      console.error('[remy] Failed to delete memory:', err)
      toast.error('Failed to delete memory')
    }
  }, [])

  // Non-blocking auto-save: persist to artifacts + extract memories
  const autoSave = useCallback((userMessage: string, remyMsg: RemyMessage) => {
    // Save the conversational text to artifacts (non-blocking side effect)
    const title =
      remyMsg.content.length > 60 ? remyMsg.content.slice(0, 57) + '...' : remyMsg.content
    saveRemyMessage({ title, content: remyMsg.content, sourceMessage: userMessage }).catch((err) =>
      console.error('[non-blocking] Auto-save message failed', err)
    )

    // Save each task result individually (non-blocking)
    if (remyMsg.tasks?.length) {
      for (const task of remyMsg.tasks) {
        if (task.status === 'error') continue
        saveRemyTaskResult({
          taskType: task.taskType,
          taskName: task.name,
          data: task.data,
          sourceMessage: userMessage,
        }).catch((err) => console.error('[non-blocking] Auto-save task failed', err))
      }
    }

    // Extract and save memories (non-blocking, background)
    extractAndSaveMemories(userMessage, remyMsg.content).catch((err) =>
      console.error('[non-blocking] Memory extraction failed', err)
    )
  }, [])

  const handleSend = useCallback(
    async (text?: string) => {
      const message = (text ?? input).trim()
      if (!message || loading) return
      setInput('')

      // Ensure we have a conversation
      let convId = currentConversationId
      if (!convId) {
        try {
          const { id } = await createConversation()
          convId = id
          setCurrentConversationId(id)
          setConversations((prev) => [
            {
              id,
              title: 'New conversation',
              isActive: true,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            },
            ...prev,
          ])
        } catch (err) {
          console.error('[remy] Failed to create conversation:', err)
          toast.error('Failed to start conversation')
          return
        }
      }

      const userMsg: RemyMessage = {
        id: generateId(),
        role: 'user',
        content: message,
        timestamp: new Date().toISOString(),
      }
      setMessages((prev) => [...prev, userMsg])
      setLoading(true)

      // Save user message to DB (non-blocking)
      saveConversationMessage({
        conversationId: convId,
        role: 'user',
        content: message,
      }).catch((err) => console.error('[non-blocking] Save user msg failed', err))

      try {
        const response = await sendRemyMessage(message, messages, pathname ?? undefined)
        const remyMsg: RemyMessage = {
          id: generateId(),
          role: 'remy',
          content: response.text,
          timestamp: new Date().toISOString(),
          tasks: response.tasks,
          navSuggestions: response.navSuggestions,
          memoryItems: response.memoryItems,
        }
        setMessages((prev) => [...prev, remyMsg])

        // Save Remy's response to DB (non-blocking)
        saveConversationMessage({
          conversationId: convId,
          role: 'remy',
          content: response.text,
          tasks: response.tasks,
          navSuggestions: response.navSuggestions,
        }).catch((err) => console.error('[non-blocking] Save remy msg failed', err))

        // Auto-title after first exchange
        if (isFirstExchange) {
          setIsFirstExchange(false)
          autoTitleConversation(convId, message, response.text)
            .then(() => loadConversationList())
            .catch((err) => console.error('[non-blocking] Auto-title failed', err))
        }

        // Auto-save to artifacts + extract memories
        autoSave(message, remyMsg)
      } catch (err: unknown) {
        const errMsg = err instanceof Error ? err.message : 'Remy is having trouble. Try again.'
        const isOllamaOffline = errMsg.includes('Local AI is offline') || errMsg.includes('Ollama')
        const remyErrorMsg: RemyMessage = {
          id: generateId(),
          role: 'remy',
          content: isOllamaOffline
            ? "I'm offline right now — Ollama needs to be running for me to help. Start it up and try again!"
            : errMsg,
          timestamp: new Date().toISOString(),
        }
        setMessages((prev) => [...prev, remyErrorMsg])
        if (!isOllamaOffline) {
          toast.error(errMsg)
        }
      } finally {
        setLoading(false)
      }
    },
    [
      input,
      loading,
      messages,
      pathname,
      autoSave,
      currentConversationId,
      isFirstExchange,
      loadConversationList,
    ]
  )

  const handleApproveTask = useCallback(async (taskId: string, taskType: string, data: unknown) => {
    try {
      const result = await approveTask(taskType, data)
      toast.success(result.message)
      setMessages((prev) =>
        prev.map((msg) => {
          if (!msg.tasks) return msg
          return {
            ...msg,
            tasks: msg.tasks.map((t) =>
              t.taskId === taskId ? { ...t, status: 'done' as const } : t
            ),
          }
        })
      )
    } catch {
      toast.error('Failed to approve task')
    }
  }, [])

  const handleRejectTask = useCallback((taskId: string) => {
    setMessages((prev) =>
      prev.map((msg) => {
        if (!msg.tasks) return msg
        return {
          ...msg,
          tasks: msg.tasks.filter((t) => t.taskId !== taskId),
        }
      })
    )
    toast.success('Task dismissed')
  }, [])

  // Find current conversation title
  const currentConvTitle = conversations.find((c) => c.id === currentConversationId)?.title

  return (
    <>
      {/* Floating trigger button */}
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-40 flex items-center gap-2 bg-brand-600 text-white rounded-full px-4 py-3 shadow-lg hover:bg-brand-700 transition-all hover:scale-105 active:scale-95"
        aria-label="Open Remy"
      >
        <Bot className="h-5 w-5" />
        <span className="text-sm font-medium hidden sm:inline">Remy</span>
      </button>

      {/* Drawer overlay */}
      {open && (
        <div
          className="fixed inset-0 z-50 flex justify-end"
          onClick={(e) => {
            if (e.target === e.currentTarget) setOpen(false)
          }}
        >
          <div className="w-full max-w-md bg-white dark:bg-stone-900 shadow-2xl flex flex-col h-full border-l border-stone-200 dark:border-stone-700">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-stone-200 dark:border-stone-700 bg-brand-600">
              <div className="flex items-center gap-2">
                {showConversationList ? (
                  <button
                    onClick={() => setShowConversationList(false)}
                    className="text-white/80 hover:text-white transition-colors p-0.5"
                    aria-label="Back to chat"
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </button>
                ) : (
                  <Bot className="h-5 w-5 text-white" />
                )}
                <span className="font-semibold text-white">
                  {showConversationList ? 'Conversations' : 'Remy'}
                </span>
                {!showConversationList &&
                  currentConvTitle &&
                  currentConvTitle !== 'New conversation' && (
                    <span className="text-xs text-white/60 font-normal truncate max-w-[140px]">
                      {currentConvTitle}
                    </span>
                  )}
              </div>
              <div className="flex items-center gap-1">
                {!showConversationList && (
                  <>
                    <button
                      onClick={handleNewConversation}
                      className="text-white/80 hover:text-white transition-colors p-1"
                      title="New conversation"
                    >
                      <Plus className="h-4.5 w-4.5" />
                    </button>
                    <button
                      onClick={() => setShowConversationList(true)}
                      className="text-white/80 hover:text-white transition-colors p-1"
                      title="All conversations"
                    >
                      <MessageSquare className="h-4.5 w-4.5" />
                    </button>
                  </>
                )}
                <Link
                  href="/remy"
                  onClick={() => setOpen(false)}
                  className="text-white/80 hover:text-white transition-colors p-1"
                  title="Remy History"
                >
                  <History className="h-4.5 w-4.5" />
                </Link>
                <button
                  onClick={() => setOpen(false)}
                  className="text-white/80 hover:text-white transition-colors p-1"
                  aria-label="Close Remy"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Conversation list view */}
            {showConversationList ? (
              <div className="flex-1 overflow-y-auto">
                <div className="p-3">
                  <button
                    onClick={handleNewConversation}
                    className="w-full flex items-center gap-2 text-sm bg-brand-50 dark:bg-brand-900/30 text-brand-700 dark:text-brand-300 rounded-lg px-3 py-2.5 hover:bg-brand-100 dark:hover:bg-brand-900/50 transition-colors mb-2"
                  >
                    <Plus className="h-4 w-4" />
                    New conversation
                  </button>
                </div>
                <div className="px-3 pb-3 space-y-1">
                  {conversations.map((conv) => (
                    <div
                      key={conv.id}
                      className={`group flex items-center gap-2 rounded-lg px-3 py-2.5 cursor-pointer transition-colors ${
                        conv.id === currentConversationId
                          ? 'bg-stone-100 dark:bg-stone-800'
                          : 'hover:bg-stone-50 dark:hover:bg-stone-800/50'
                      }`}
                    >
                      <button
                        onClick={() => handleSelectConversation(conv.id)}
                        className="flex-1 text-left min-w-0"
                      >
                        <p className="text-sm font-medium text-stone-900 dark:text-stone-100 truncate">
                          {conv.title}
                        </p>
                        {conv.lastMessage && (
                          <p className="text-xs text-stone-500 dark:text-stone-400 truncate mt-0.5">
                            {conv.lastMessage}
                          </p>
                        )}
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleDeleteConversation(conv.id)
                        }}
                        className="opacity-0 group-hover:opacity-100 text-stone-400 hover:text-red-500 transition-all p-1"
                        title="Delete conversation"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                  {conversations.length === 0 && (
                    <p className="text-sm text-stone-400 text-center py-8">
                      No conversations yet. Start one!
                    </p>
                  )}
                </div>
              </div>
            ) : (
              <>
                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                  {/* Welcome message */}
                  {messages.length === 0 && (
                    <div className="space-y-4">
                      <div className="bg-stone-50 dark:bg-stone-800 rounded-xl p-4">
                        <p className="text-sm text-stone-700 dark:text-stone-300">
                          Hey chef! I&apos;m <span className="font-semibold">Remy</span>, your
                          kitchen companion. I can check your schedule, look up clients, draft
                          messages, crunch numbers — whatever you need.
                        </p>
                        <p className="text-xs text-stone-400 mt-2">
                          Everything stays on this machine. I remember our past conversations and
                          learn your preferences over time.
                        </p>
                      </div>

                      <div className="grid grid-cols-1 gap-2">
                        {REMY_STARTERS.map((starter) => {
                          const Icon = starter.icon
                          return (
                            <button
                              key={starter.text}
                              onClick={() => handleSend(starter.text)}
                              className="flex items-center gap-2 text-left text-sm bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-lg px-3 py-2.5 hover:bg-stone-50 dark:hover:bg-stone-700 transition-colors text-stone-700 dark:text-stone-300"
                            >
                              <Icon className="h-4 w-4 text-brand-600 flex-shrink-0" />
                              {starter.text}
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  )}

                  {/* Message list */}
                  {messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`group flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div className={`max-w-[85%] space-y-2 relative`}>
                        {/* Delete button on hover */}
                        <button
                          onClick={() => handleDeleteMessage(msg.id)}
                          className="absolute -top-2 -right-2 opacity-0 group-hover:opacity-100 bg-white dark:bg-stone-700 rounded-full p-1 shadow-sm border border-stone-200 dark:border-stone-600 text-stone-400 hover:text-red-500 transition-all z-10"
                          title="Remove message"
                        >
                          <X className="h-3 w-3" />
                        </button>

                        {/* Message bubble */}
                        <div
                          className={`rounded-xl px-4 py-2.5 text-sm ${
                            msg.role === 'user'
                              ? 'bg-brand-600 text-white'
                              : 'bg-stone-100 dark:bg-stone-800 text-stone-900 dark:text-stone-100'
                          }`}
                        >
                          <pre className="whitespace-pre-wrap font-sans">{msg.content}</pre>
                        </div>

                        {/* Task result cards (Remy messages only) */}
                        {msg.role === 'remy' && msg.tasks && msg.tasks.length > 0 && (
                          <div className="space-y-2">
                            {msg.tasks.map((task) => (
                              <RemyTaskCard
                                key={task.taskId}
                                task={task}
                                onApprove={handleApproveTask}
                                onReject={handleRejectTask}
                              />
                            ))}
                          </div>
                        )}

                        {/* Navigation suggestions (Remy messages only) */}
                        {msg.role === 'remy' &&
                          msg.navSuggestions &&
                          msg.navSuggestions.length > 0 && (
                            <div className="flex flex-wrap gap-1.5">
                              {msg.navSuggestions.map((nav) => (
                                <Link
                                  key={nav.href}
                                  href={nav.href}
                                  onClick={() => setOpen(false)}
                                  className="inline-flex items-center gap-1 text-xs bg-brand-50 dark:bg-brand-900/30 text-brand-700 dark:text-brand-300 rounded-full px-3 py-1 hover:bg-brand-100 dark:hover:bg-brand-900/50 transition-colors"
                                >
                                  <ArrowRight className="h-3 w-3" />
                                  {nav.label}
                                </Link>
                              ))}
                            </div>
                          )}

                        {/* Memory items with delete buttons */}
                        {msg.role === 'remy' && msg.memoryItems && msg.memoryItems.length > 0 && (
                          <div className="mt-2 space-y-1 max-h-80 overflow-y-auto">
                            {(() => {
                              // Group by category
                              const grouped = new Map<string, RemyMemoryItem[]>()
                              for (const item of msg.memoryItems) {
                                const cat = item.category
                                if (!grouped.has(cat)) grouped.set(cat, [])
                                grouped.get(cat)!.push(item)
                              }
                              return Array.from(grouped.entries()).map(([category, items]) => (
                                <div key={category} className="mb-2">
                                  <p className="text-xs font-semibold text-stone-500 dark:text-stone-400 uppercase tracking-wide mb-1 px-1">
                                    {category.replace(/_/g, ' ')}
                                  </p>
                                  {items.map((item) => (
                                    <div
                                      key={item.id}
                                      className="group/mem flex items-start gap-1.5 rounded-lg px-2 py-1.5 hover:bg-stone-50 dark:hover:bg-stone-700/50 transition-colors"
                                    >
                                      <span className="flex-1 text-xs text-stone-700 dark:text-stone-300 leading-relaxed">
                                        {item.content}
                                        {item.importance >= 8 && (
                                          <span
                                            className="ml-1 text-amber-500"
                                            title="High importance"
                                          >
                                            !
                                          </span>
                                        )}
                                      </span>
                                      <button
                                        onClick={() => handleDeleteMemory(item.id)}
                                        className="opacity-0 group-hover/mem:opacity-100 flex-shrink-0 mt-0.5 text-stone-400 hover:text-red-500 transition-all p-0.5"
                                        title="Delete this memory"
                                      >
                                        <X className="h-3 w-3" />
                                      </button>
                                    </div>
                                  ))}
                                </div>
                              ))
                            })()}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}

                  {/* Loading indicator */}
                  {loading && (
                    <div className="flex justify-start">
                      <div className="bg-stone-100 dark:bg-stone-800 rounded-xl px-4 py-3 flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin text-brand-600" />
                        <span className="text-xs text-stone-500">
                          Remy is thinking{elapsedSec > 0 ? `... ${elapsedSec}s` : '...'}
                        </span>
                      </div>
                    </div>
                  )}

                  <div ref={messagesEndRef} />
                </div>

                {/* Input */}
                <div className="p-4 border-t border-stone-200 dark:border-stone-700">
                  <div className="flex gap-2">
                    <textarea
                      ref={textareaRef}
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault()
                          handleSend()
                        }
                      }}
                      placeholder="Ask Remy anything..."
                      className="flex-1 resize-none rounded-lg border border-stone-300 dark:border-stone-600 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 dark:bg-stone-800 dark:text-stone-100 min-h-[40px] max-h-32"
                      rows={1}
                    />
                    <Button
                      onClick={() => handleSend()}
                      disabled={!input.trim() || loading}
                      variant="primary"
                      size="sm"
                    >
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                  <p className="text-xs text-stone-400 mt-1.5 flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    Powered by local AI — your data never leaves this machine
                  </p>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  )
}
