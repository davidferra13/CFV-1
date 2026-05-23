'use client'

import { useState, useRef, useEffect, useCallback, useMemo, useTransition } from 'react'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { LazyMarkdown } from '@/components/ui/lazy-markdown'
import remarkGfm from 'remark-gfm'
import { RemyAvatar } from '@/components/ai/remy-avatar'
import { RemyTaskCard } from '@/components/ai/remy-task-card'
import { RemyConversationList } from '@/components/ai/remy-conversation-list'
import { markdownComponents } from '@/lib/ai/remy-markdown-config'
import { getStartersForPage, getThinkingMessage } from '@/lib/ai/remy-starters'
import { useConversationManagement } from '@/lib/hooks/use-conversation-management'
import { useRemySend } from '@/lib/hooks/use-remy-send'
import { getLocalAiPreferences, type LocalAiPreferences } from '@/lib/ai/privacy-actions'
import { LocalAiIndicator } from '@/components/ai/local-ai-indicator'
import { getRemyConciergeContext, type RemyConciergeContext } from '@/lib/remy/remy-context-queries'
import type { RemyMessage } from '@/lib/ai/remy-types'
import {
  Send,
  Loader2,
  ArrowRight,
  Plus,
  MessageSquare,
  X,
  Square,
  CalendarDays,
  AlertTriangle,
  Mail,
  FileText,
  Bell,
  Menu,
  Bookmark,
  Check,
  Copy,
  RotateCcw,
} from '@/components/ui/icons'
import { Button } from '@/components/ui/button'

// ─── Noop body/lip-sync callbacks for full-page mode (no mascot) ────────────

const noop = () => {}
const noopBody = () => {}

// ─── Main Component ─────────────────────────────────────────────────────────

export function RemyConcierge() {
  const pathname = usePathname()

  // ─── State ──────────────────────────────────────────────────────────────────
  const [input, setInput] = useState('')
  const [soundEnabled, setSoundEnabled] = useState(true)
  const [showSidebar, setShowSidebar] = useState(false)
  const [localAiConfig, setLocalAiConfig] = useState<LocalAiPreferences | null>(null)
  const [context, setContext] = useState<RemyConciergeContext | null>(null)
  const [contextLoading, setContextLoadingState] = useState(false)
  const [copiedId, setCopiedId] = useState<string | null>(null)

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Dummy drawer view setter for conversation management (not used in full page)
  const [_drawerView, setDrawerView] = useState<
    'chat' | 'list' | 'search' | 'actions' | 'templates'
  >('chat')

  // ─── Hooks ──────────────────────────────────────────────────────────────────
  const convManager = useConversationManagement(setDrawerView)
  const {
    messages,
    setMessages,
    conversations,
    setConversations,
    currentConversationId,
    setCurrentConversationId,
    conversationsLoaded,
    isFirstExchange,
    setIsFirstExchange,
    projectSuggestion,
    setProjectSuggestion,
    loadConversationList,
    handleSelectConversation,
    handleNewConversation,
    handleDeleteConversation,
  } = convManager

  const sendHook = useRemySend({
    input,
    setInput,
    messages,
    setMessages,
    currentConversationId,
    setCurrentConversationId,
    conversations,
    setConversations,
    isFirstExchange,
    setIsFirstExchange,
    setProjectSuggestion,
    pathname: pathname ?? '/remy',
    soundEnabled,
    localAi: localAiConfig,
    feedText: noop,
    lipSyncStop: noop,
    resetLipSync: noop,
    dispatchBody: noopBody as any,
    setContextLoading: setContextLoadingState,
    closeDrawer: noop,
  })

  const {
    loading,
    streamingContent,
    streamingIntent,
    elapsedSec,
    localAiMode,
    handleSend,
    handleCancel,
    handleApproveTask,
    handleRejectTask,
  } = sendHook

  // Context-aware starters
  const starters = useMemo(() => getStartersForPage('/remy'), [])

  // ─── Load data on mount ─────────────────────────────────────────────────────

  useEffect(() => {
    getLocalAiPreferences()
      .then(setLocalAiConfig)
      .catch(() => {})
  }, [])

  useEffect(() => {
    if (!conversationsLoaded) {
      loadConversationList()
    }
  }, [conversationsLoaded, loadConversationList])

  // Load concierge context
  const [, startContextTransition] = useTransition()
  useEffect(() => {
    startContextTransition(() => {
      getRemyConciergeContext()
        .then(setContext)
        .catch((err) => {
          console.error('[remy-concierge] Failed to load context:', err)
        })
    })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-scroll on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, streamingContent])

  // Focus textarea on mount
  useEffect(() => {
    setTimeout(() => textareaRef.current?.focus(), 200)
  }, [])

  // ─── Handlers ───────────────────────────────────────────────────────────────

  const handleCopy = useCallback((id: string, content: string) => {
    navigator.clipboard.writeText(content)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }, [])

  const handleToggleBookmark = useCallback(
    (id: string) => {
      setMessages((prev) =>
        prev.map((m) => (m.id === id ? { ...m, bookmarked: !m.bookmarked } : m))
      )
    },
    [setMessages]
  )

  const handleSelectConv = useCallback(
    (id: string) => {
      handleSelectConversation(id)
      setShowSidebar(false)
    },
    [handleSelectConversation]
  )

  const handleNewConv = useCallback(
    (projectId?: string | null) => {
      handleNewConversation(projectId)
      setShowSidebar(false)
    },
    [handleNewConversation]
  )

  const handleAlertAction = useCallback(
    (alert: RemyConciergeContext['activeAlerts'][0]) => {
      const prompt = `Tell me about the alert: "${alert.title}" - ${alert.body}`
      handleSend(prompt)
    },
    [handleSend]
  )

  // ─── Render ─────────────────────────────────────────────────────────────────

  const hasMessages = messages.length > 0 || !!streamingContent

  return (
    <div className="flex h-[calc(100vh-4rem)] bg-stone-950">
      {/* Mobile sidebar overlay */}
      {showSidebar && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setShowSidebar(false)}
        />
      )}

      {/* Sidebar: conversation list */}
      <div
        className={`${
          showSidebar ? 'translate-x-0' : '-translate-x-full'
        } lg:translate-x-0 fixed lg:relative z-50 lg:z-auto w-80 h-full bg-stone-900 border-r border-stone-700 flex flex-col transition-transform duration-200`}
      >
        {/* Sidebar header */}
        <div className="flex items-center justify-between p-4 border-b border-stone-700">
          <div className="flex items-center gap-2">
            <RemyAvatar size="sm" />
            <span className="font-semibold text-stone-100">Conversations</span>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => handleNewConv()}
              className="p-1.5 rounded-lg text-stone-400 hover:text-stone-100 hover:bg-stone-800 transition-colors"
              title="New conversation"
            >
              <Plus className="h-4.5 w-4.5" />
            </button>
            <button
              onClick={() => setShowSidebar(false)}
              className="p-1.5 rounded-lg text-stone-400 hover:text-stone-100 hover:bg-stone-800 transition-colors lg:hidden"
              title="Close sidebar"
            >
              <X className="h-4.5 w-4.5" />
            </button>
          </div>
        </div>

        {/* Conversation list */}
        <div className="flex-1 overflow-hidden">
          <RemyConversationList
            currentConversationId={currentConversationId}
            onSelectConversation={handleSelectConv}
            onNewConversation={handleNewConv}
          />
        </div>
      </div>

      {/* Main chat area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar with context chips */}
        <div className="flex items-center gap-2 px-4 py-3 border-b border-stone-800 bg-stone-900/50">
          <button
            onClick={() => setShowSidebar(true)}
            className="p-1.5 rounded-lg text-stone-400 hover:text-stone-100 hover:bg-stone-800 transition-colors lg:hidden"
            title="Show conversations"
          >
            <Menu className="h-5 w-5" />
          </button>

          <div className="flex items-center gap-2 flex-1 overflow-x-auto scrollbar-none">
            {context && (
              <>
                {context.upcomingEventsCount > 0 && (
                  <ContextChip
                    icon={<CalendarDays className="h-3.5 w-3.5" />}
                    label={`${context.upcomingEventsCount} event${context.upcomingEventsCount !== 1 ? 's' : ''} this week`}
                    onClick={() => handleSend("What's on my schedule this week?")}
                  />
                )}
                {context.overdueInvoiceCount > 0 && (
                  <ContextChip
                    icon={<AlertTriangle className="h-3.5 w-3.5 text-amber-400" />}
                    label={`${context.overdueInvoiceCount} overdue invoice${context.overdueInvoiceCount !== 1 ? 's' : ''}`}
                    variant="warning"
                    onClick={() => handleSend('Show my overdue invoices')}
                  />
                )}
                {context.unreadMessageCount > 0 && (
                  <ContextChip
                    icon={<Mail className="h-3.5 w-3.5" />}
                    label={`${context.unreadMessageCount} unread`}
                    onClick={() => handleSend('Show my unread messages')}
                  />
                )}
                {context.pendingQuoteCount > 0 && (
                  <ContextChip
                    icon={<FileText className="h-3.5 w-3.5" />}
                    label={`${context.pendingQuoteCount} pending quote${context.pendingQuoteCount !== 1 ? 's' : ''}`}
                    onClick={() => handleSend('Show my pending quotes')}
                  />
                )}
              </>
            )}
          </div>

          <button
            onClick={() => handleNewConv()}
            className="p-1.5 rounded-lg text-stone-400 hover:text-stone-100 hover:bg-stone-800 transition-colors shrink-0"
            title="New conversation"
          >
            <Plus className="h-5 w-5" />
          </button>
        </div>

        {/* Message area */}
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-3xl mx-auto px-4 py-6 space-y-4">
            {/* Empty state: starters + alerts */}
            {!hasMessages && (
              <div className="space-y-6 pt-8">
                {/* Welcome */}
                <div className="text-center space-y-3">
                  <div className="flex justify-center">
                    <RemyAvatar size="lg" />
                  </div>
                  <h1 className="text-2xl font-bold text-stone-100">Hey, chef!</h1>
                  <p className="text-stone-400 text-sm max-w-md mx-auto">
                    I can check your schedule, look up clients, draft messages, crunch numbers, and
                    search the web. Whatever you need.
                  </p>
                </div>

                {/* Proactive action cards from alerts */}
                {context && context.activeAlerts.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-stone-500 uppercase tracking-wide px-1">
                      Needs attention
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {context.activeAlerts.slice(0, 4).map((alert) => (
                        <button
                          key={alert.id}
                          onClick={() => handleAlertAction(alert)}
                          className="flex items-start gap-3 text-left bg-brand-950 border border-brand-800 rounded-xl px-4 py-3 hover:border-brand-600 transition-colors group"
                        >
                          <Bell
                            className={`h-4 w-4 mt-0.5 shrink-0 ${
                              alert.priority === 'urgent'
                                ? 'text-red-400'
                                : alert.priority === 'high'
                                  ? 'text-amber-400'
                                  : 'text-brand-400'
                            }`}
                          />
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-stone-200 group-hover:text-stone-100 truncate">
                              {alert.title}
                            </p>
                            <p className="text-xs text-stone-500 mt-0.5 line-clamp-2">
                              {alert.body}
                            </p>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Quick-ask starters */}
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-stone-500 uppercase tracking-wide px-1">
                    Quick start
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {starters.map((starter) => {
                      const Icon = starter.icon
                      return (
                        <button
                          key={starter.text}
                          onClick={() => handleSend(starter.text)}
                          className="flex items-center gap-3 text-left text-sm bg-stone-900 border border-stone-700 rounded-xl px-4 py-3 hover:bg-stone-800 hover:border-stone-600 transition-colors text-stone-300"
                        >
                          <Icon className="h-4 w-4 text-brand-500 shrink-0" />
                          {starter.text}
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* Delegation buttons */}
                <div className="flex flex-wrap gap-2 justify-center pt-2">
                  {[
                    { label: 'Draft an email', prompt: 'Help me draft an email' },
                    { label: 'Create a reminder', prompt: 'Create a reminder for me' },
                    { label: 'Shopping list', prompt: 'Help me build a shopping list' },
                  ].map((action) => (
                    <button
                      key={action.label}
                      onClick={() => handleSend(action.prompt)}
                      className="text-xs bg-stone-800 border border-stone-600 rounded-full px-4 py-2 hover:bg-stone-700 hover:border-stone-500 transition-colors text-stone-300"
                    >
                      {action.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Message list */}
            {messages.map((msg) => (
              <MessageBubble
                key={msg.id}
                msg={msg}
                copiedId={copiedId}
                onCopy={handleCopy}
                onBookmark={handleToggleBookmark}
                onSend={handleSend}
                onApproveTask={handleApproveTask}
                onRejectTask={handleRejectTask}
                loading={loading}
                isLast={messages[messages.length - 1]?.id === msg.id}
              />
            ))}

            {/* Streaming indicator */}
            {loading && streamingContent && (
              <div className="flex gap-3 items-start">
                <RemyAvatar size="sm" />
                <div className="flex-1 max-w-[85%] space-y-1">
                  <div className="bg-stone-800/50 rounded-2xl px-4 py-3 text-sm text-stone-100">
                    <div className="prose prose-sm prose-stone prose-invert max-w-none [&>*:first-child]:mt-0 [&>*:last-child]:mb-0">
                      <LazyMarkdown
                        remarkPlugins={[remarkGfm]}
                        components={markdownComponents as any}
                      >
                        {streamingContent}
                      </LazyMarkdown>
                    </div>
                    <span className="inline-block w-1.5 h-4 bg-brand-500 animate-pulse ml-0.5 align-text-bottom" />
                  </div>
                  <button
                    onClick={handleCancel}
                    className="flex items-center gap-1 text-xs text-red-400 hover:text-red-300 transition-colors ml-1"
                  >
                    <Square className="h-3 w-3" />
                    Stop generating
                  </button>
                </div>
              </div>
            )}

            {/* Loading indicator (before streaming starts) */}
            {loading && !streamingContent && (
              <div className="flex gap-3 items-start">
                <RemyAvatar size="sm" />
                <div className="bg-stone-800/50 rounded-2xl px-4 py-3 flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin text-brand-500" />
                  <span className="text-xs text-stone-400">
                    {getThinkingMessage(elapsedSec, streamingIntent)}
                    {elapsedSec > 0 ? ` ${elapsedSec}s` : ''}
                  </span>
                  <button
                    onClick={handleCancel}
                    className="ml-2 text-xs text-red-400 hover:text-red-300 transition-colors"
                    title="Cancel request"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Input area (sticky bottom) */}
        <div className="border-t border-stone-800 bg-stone-900/80 backdrop-blur-sm">
          <div className="max-w-3xl mx-auto px-4 py-3">
            <div className="flex gap-2">
              <div className="flex-1 relative">
                <textarea
                  ref={textareaRef}
                  value={input}
                  onChange={(e) => {
                    if (e.target.value.length <= 8000) setInput(e.target.value)
                  }}
                  maxLength={8000}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault()
                      handleSend()
                    }
                  }}
                  placeholder="Ask Remy anything..."
                  aria-label="Message Remy"
                  className="w-full resize-none rounded-xl border border-stone-600 bg-stone-800 px-4 py-3 pr-12 text-sm text-stone-100 placeholder-stone-500 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 min-h-[48px] max-h-40"
                  rows={1}
                />
              </div>
              <Button
                onClick={() => handleSend()}
                disabled={!input.trim() || loading}
                variant="primary"
                size="sm"
                className="self-end h-12 w-12 rounded-xl"
              >
                <Send className="h-5 w-5" />
              </Button>
            </div>
            <div className="flex items-center justify-between mt-1.5">
              <p className="text-xs text-stone-500">
                Remy can make mistakes. Please double-check important info.
              </p>
              {localAiConfig?.enabled && <LocalAiIndicator mode={localAiMode} />}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Context Chip ───────────────────────────────────────────────────────────

function ContextChip({
  icon,
  label,
  variant = 'default',
  onClick,
}: {
  icon: React.ReactNode
  label: string
  variant?: 'default' | 'warning'
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 text-xs rounded-full px-3 py-1.5 whitespace-nowrap transition-colors shrink-0 ${
        variant === 'warning'
          ? 'bg-amber-500/10 border border-amber-500/20 text-amber-300 hover:bg-amber-500/20'
          : 'bg-stone-800 border border-stone-700 text-stone-300 hover:bg-stone-700 hover:border-stone-600'
      }`}
    >
      {icon}
      {label}
    </button>
  )
}

// ─── Message Bubble ─────────────────────────────────────────────────────────

function MessageBubble({
  msg,
  copiedId,
  onCopy,
  onBookmark,
  onSend,
  onApproveTask,
  onRejectTask,
  loading,
  isLast,
}: {
  msg: RemyMessage
  copiedId: string | null
  onCopy: (id: string, content: string) => void
  onBookmark: (id: string) => void
  onSend: (text: string) => void
  onApproveTask: (taskId: string, taskType: string, data: unknown, confirmation?: string) => void
  onRejectTask: (taskId: string) => void
  loading: boolean
  isLast: boolean
}) {
  if (msg.role === 'user') {
    return (
      <div className="flex justify-end">
        <div className="max-w-[80%] bg-stone-700 rounded-2xl px-4 py-3 text-sm text-stone-100">
          <p className="whitespace-pre-wrap">{msg.content}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex gap-3 items-start group">
      <RemyAvatar size="sm" />
      <div className="flex-1 max-w-[85%] space-y-2">
        {/* Message content */}
        <div className="bg-stone-800/50 rounded-2xl px-4 py-3 text-sm text-stone-100 relative">
          <div className="prose prose-sm prose-stone prose-invert max-w-none [&>*:first-child]:mt-0 [&>*:last-child]:mb-0">
            <LazyMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents as any}>
              {msg.content}
            </LazyMarkdown>
          </div>

          {/* Hover actions */}
          <div className="absolute -top-2 -right-2 opacity-0 group-hover:opacity-100 flex items-center gap-0.5 z-10 transition-all">
            <button
              onClick={() => onCopy(msg.id, msg.content)}
              className="bg-stone-900 rounded-full p-1 shadow-sm border border-stone-700 text-stone-400 hover:text-brand-400 transition-colors"
              title="Copy message"
            >
              {copiedId === msg.id ? (
                <Check className="h-3 w-3 text-green-500" />
              ) : (
                <Copy className="h-3 w-3" />
              )}
            </button>
            <button
              onClick={() => onBookmark(msg.id)}
              className={`bg-stone-900 rounded-full p-1 shadow-sm border border-stone-700 transition-colors ${
                msg.bookmarked ? 'text-amber-400' : 'text-stone-400 hover:text-amber-400'
              }`}
              title={msg.bookmarked ? 'Remove bookmark' : 'Bookmark'}
            >
              <Bookmark className={`h-3 w-3 ${msg.bookmarked ? 'fill-current' : ''}`} />
            </button>
          </div>
        </div>

        {/* Retry button */}
        {msg.isRetryable && msg.retryMessage && (
          <button
            type="button"
            onClick={() => onSend(msg.retryMessage!)}
            className="flex items-center gap-1.5 text-xs bg-brand-600 hover:bg-brand-500 text-white rounded-full px-3 py-1.5 transition-colors"
          >
            <RotateCcw className="h-3 w-3" />
            Retry
          </button>
        )}

        {/* Task cards */}
        {msg.tasks && msg.tasks.length > 0 && (
          <div className="space-y-2">
            {msg.tasks.map((task) => (
              <RemyTaskCard
                key={task.taskId}
                task={task}
                onApprove={onApproveTask}
                onReject={onRejectTask}
              />
            ))}
          </div>
        )}

        {/* Navigation suggestions */}
        {msg.navSuggestions && msg.navSuggestions.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {msg.navSuggestions.map((nav) =>
              nav.href.startsWith('remy:') ? (
                <button
                  type="button"
                  key={nav.href}
                  onClick={() => onSend(nav.href.slice(5))}
                  title={nav.description || undefined}
                  className="inline-flex items-center gap-1 text-xs bg-brand-950 text-brand-400 rounded-full px-3 py-1 hover:bg-brand-900 transition-colors cursor-pointer"
                >
                  <ArrowRight className="h-3 w-3" />
                  {nav.label}
                </button>
              ) : (
                <Link
                  key={nav.href}
                  href={nav.href}
                  className="inline-flex items-center gap-1 text-xs bg-brand-950 text-brand-400 rounded-full px-3 py-1 hover:bg-brand-900 transition-colors"
                >
                  <ArrowRight className="h-3 w-3" />
                  {nav.label}
                </Link>
              )
            )}
          </div>
        )}

        {/* Quick replies */}
        {msg.quickReplies && msg.quickReplies.length > 0 && isLast && !loading && (
          <div className="flex flex-wrap gap-2">
            {msg.quickReplies.map((label) => (
              <button
                key={label}
                onClick={() => onSend(label)}
                className="text-sm bg-stone-800 border border-stone-600 rounded-full px-3 py-1.5 hover:bg-stone-700 hover:border-stone-500 transition-colors text-stone-200"
              >
                {label}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
