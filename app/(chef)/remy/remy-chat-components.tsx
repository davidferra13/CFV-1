'use client'

import type { Dispatch, Ref, SetStateAction } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { RemyAvatar } from '@/components/ai/remy-avatar'
import { RemyTaskCard } from '@/components/ai/remy-task-card'
import { QUICK_ASK_PATTERNS } from '@/lib/remy/types'
import type { RemyConciergeContext } from '@/lib/remy/types'
import type { RemyTaskResult, NavigationSuggestion } from '@/lib/ai/remy-types'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Bot,
  Send,
  Loader2,
  Plus,
  X,
  Calendar,
  AlertTriangle,
  Mail,
  ThumbsUp,
  ThumbsDown,
  List,
  Square,
} from '@/components/ui/icons'

export interface ChatMessage {
  id: string
  localId: string
  role: 'user' | 'remy'
  content: string
  tasks?: RemyTaskResult[]
  navSuggestions?: NavigationSuggestion[]
  quickReplies?: string[]
  feedback?: 'up' | 'down' | null
  timestamp: string
  /** Server-persisted message id (set after save) */
  serverId?: string
}

type RemyChatViewProps = {
  remyEnabled: boolean
  messages: ChatMessage[]
  input: string
  isStreaming: boolean
  streamingContent: string
  streamingTasks: RemyTaskResult[]
  streamingNav: NavigationSuggestion[]
  streamingQuickReplies: string[]
  context: RemyConciergeContext | null
  contextOpen: boolean
  hasContext: boolean
  isEmpty: boolean
  textareaRef: Ref<HTMLTextAreaElement>
  messagesEndRef: Ref<HTMLDivElement>
  setContextOpen: Dispatch<SetStateAction<boolean>>
  startNewConversation: () => void
  handleQuickAsk: (label: string) => void
  handleFeedback: (msg: ChatMessage, type: 'up' | 'down') => void
  handleNavClick: (href: string) => void
  handleQuickReply: (reply: string) => void
  handleTextareaChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void
  handleKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void
  handleStop: () => void
  sendMessage: (text?: string) => void
}

export function RemyChatView({
  remyEnabled,
  messages,
  input,
  isStreaming,
  streamingContent,
  streamingTasks,
  streamingNav,
  streamingQuickReplies,
  context,
  contextOpen,
  hasContext,
  isEmpty,
  textareaRef,
  messagesEndRef,
  setContextOpen,
  startNewConversation,
  handleQuickAsk,
  handleFeedback,
  handleNavClick,
  handleQuickReply,
  handleTextareaChange,
  handleKeyDown,
  handleStop,
  sendMessage,
}: RemyChatViewProps) {
  return (
    <div className="flex h-full overflow-hidden bg-stone-900">
      {/* Main chat area */}
      <div className="flex flex-1 flex-col min-w-0">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-stone-800 px-4 py-3">
          <div className="flex items-center gap-3">
            <RemyAvatar size="sm" />
            <div>
              <h1 className="text-sm font-semibold text-stone-100">Remy</h1>
              <p className="text-xs text-stone-500">Your AI concierge</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={startNewConversation}
              className="text-stone-400 hover:text-stone-200"
            >
              <Plus className="h-4 w-4 mr-1" />
              <span className="hidden sm:inline">New chat</span>
            </Button>
            {hasContext && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setContextOpen(!contextOpen)}
                className="text-stone-400 hover:text-stone-200 lg:hidden"
              >
                {contextOpen ? <X className="h-4 w-4" /> : <List className="h-4 w-4" />}
              </Button>
            )}
          </div>
        </div>

        {/* Messages area */}
        <div className="flex-1 overflow-y-auto px-4 py-4">
          {isEmpty ? (
            <EmptyState onQuickAsk={handleQuickAsk} />
          ) : (
            <div className="mx-auto max-w-2xl space-y-4">
              {messages.map((msg) => (
                <MessageBubble
                  key={msg.id}
                  message={msg}
                  onFeedback={handleFeedback}
                  onNavClick={handleNavClick}
                  onQuickReply={handleQuickReply}
                />
              ))}

              {/* Streaming indicator */}
              {isStreaming && (
                <div className="flex gap-3">
                  <RemyAvatar size="sm" />
                  <div className="max-w-[85%] rounded-2xl rounded-tl-sm bg-stone-800 px-4 py-3 text-sm text-stone-200">
                    {streamingContent ? (
                      <div className="prose prose-sm prose-invert max-w-none">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                          {streamingContent}
                        </ReactMarkdown>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-stone-400">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>Thinking...</span>
                      </div>
                    )}
                    {streamingTasks.length > 0 && (
                      <div className="mt-3 space-y-2">
                        {streamingTasks.map((task) => (
                          <RemyTaskCard key={task.taskId} task={task} />
                        ))}
                      </div>
                    )}
                    {streamingNav.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {streamingNav.map((nav) => (
                          <button
                            key={nav.href}
                            onClick={() => handleNavClick(nav.href)}
                            className="rounded-full border border-brand-700 bg-brand-950/50 px-3 py-1 text-xs text-brand-400 hover:bg-brand-900/50 transition-colors"
                          >
                            {nav.label}
                          </button>
                        ))}
                      </div>
                    )}
                    {streamingQuickReplies.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {streamingQuickReplies.map((reply) => (
                          <button
                            key={reply}
                            onClick={() => handleQuickReply(reply)}
                            className="rounded-full border border-stone-700 bg-stone-800 px-3 py-1 text-xs text-stone-300 hover:bg-stone-700 transition-colors"
                          >
                            {reply}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Input area */}
        <div className="border-t border-stone-800 bg-stone-900 px-4 py-3">
          <div className="mx-auto flex max-w-2xl items-end gap-2">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={handleTextareaChange}
              onKeyDown={handleKeyDown}
              placeholder={remyEnabled ? 'Ask Remy anything...' : 'Remy is disabled in settings'}
              disabled={!remyEnabled}
              rows={1}
              className="flex-1 resize-none rounded-xl border border-stone-700 bg-stone-800 px-4 py-3 text-sm text-stone-100 placeholder:text-stone-500 focus:border-brand-600 focus:outline-none focus:ring-1 focus:ring-brand-600 disabled:opacity-50"
              style={{ maxHeight: 128 }}
            />
            {isStreaming ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleStop}
                className="mb-0.5 h-10 w-10 shrink-0 rounded-xl border border-red-700/50 text-red-400 hover:bg-red-950/50 hover:text-red-300"
              >
                <Square className="h-4 w-4" />
              </Button>
            ) : (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => sendMessage()}
                disabled={!input.trim() || !remyEnabled}
                className="mb-0.5 h-10 w-10 shrink-0 rounded-xl border border-brand-700/50 text-brand-400 hover:bg-brand-950/50 hover:text-brand-300 disabled:opacity-30"
              >
                <Send className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Context sidebar (desktop: always visible if context exists; mobile: sheet) */}
      {hasContext && (
        <>
          {/* Mobile overlay */}
          {contextOpen && (
            <div
              className="fixed inset-0 z-40 bg-black/50 lg:hidden"
              onClick={() => setContextOpen(false)}
            />
          )}
          <aside
            className={`
              ${contextOpen ? 'translate-x-0' : 'translate-x-full'}
              fixed right-0 top-0 z-50 h-full w-80 border-l border-stone-800 bg-stone-900 p-4 transition-transform duration-200
              lg:static lg:translate-x-0 lg:z-auto lg:block
            `}
          >
            <div className="flex items-center justify-between mb-4 lg:hidden">
              <h2 className="text-sm font-semibold text-stone-200">Context</h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setContextOpen(false)}
                className="text-stone-400"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <h2 className="text-sm font-semibold text-stone-200 mb-4 hidden lg:block">Context</h2>
            <ContextPanel context={context!} />
          </aside>
        </>
      )}
    </div>
  )
}

// ---- Empty State -----------------------------------------------------------

function EmptyState({ onQuickAsk }: { onQuickAsk: (label: string) => void }) {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center justify-center h-full py-12">
      <RemyAvatar size="xl" className="mb-6" />
      <h2 className="text-lg font-semibold text-stone-100 mb-1">Hey, Chef</h2>
      <p className="text-sm text-stone-400 mb-8 text-center">
        I can check your schedule, draft emails, look up clients, run your numbers, and more. What
        do you need?
      </p>
      <div className="grid grid-cols-2 gap-2 w-full">
        {QUICK_ASK_PATTERNS.map((pattern) => (
          <button
            key={pattern.label}
            onClick={() => onQuickAsk(pattern.label)}
            className="flex items-center gap-2 rounded-xl border border-stone-700 bg-stone-800/60 px-3 py-3 text-left text-sm text-stone-300 hover:bg-stone-800 hover:border-stone-600 transition-colors"
          >
            <span className="text-base">{pattern.icon}</span>
            <span className="line-clamp-1">{pattern.label}</span>
          </button>
        ))}
      </div>
    </div>
  )
}

// ---- Message Bubble --------------------------------------------------------

function MessageBubble({
  message,
  onFeedback,
  onNavClick,
  onQuickReply,
}: {
  message: ChatMessage
  onFeedback: (msg: ChatMessage, type: 'up' | 'down') => void
  onNavClick: (href: string) => void
  onQuickReply: (reply: string) => void
}) {
  if (message.role === 'user') {
    return (
      <div className="flex justify-end">
        <div className="max-w-[85%] rounded-2xl rounded-tr-sm border border-brand-700/40 bg-brand-950 px-4 py-3 text-sm text-stone-100">
          {message.content}
        </div>
      </div>
    )
  }

  return (
    <div className="flex gap-3">
      <RemyAvatar size="sm" />
      <div className="max-w-[85%] space-y-2">
        <div className="rounded-2xl rounded-tl-sm bg-stone-800 px-4 py-3 text-sm text-stone-200">
          <div className="prose prose-sm prose-invert max-w-none [&>*:first-child]:mt-0 [&>*:last-child]:mb-0">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{message.content}</ReactMarkdown>
          </div>
        </div>

        {/* Task cards */}
        {message.tasks && message.tasks.length > 0 && (
          <div className="space-y-2">
            {message.tasks.map((task) => (
              <RemyTaskCard key={task.taskId} task={task} />
            ))}
          </div>
        )}

        {/* Navigation suggestions */}
        {message.navSuggestions && message.navSuggestions.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {message.navSuggestions.map((nav) => (
              <button
                key={nav.href}
                onClick={() => onNavClick(nav.href)}
                className="rounded-full border border-brand-700 bg-brand-950/50 px-3 py-1 text-xs text-brand-400 hover:bg-brand-900/50 transition-colors"
              >
                {nav.label}
              </button>
            ))}
          </div>
        )}

        {/* Quick replies */}
        {message.quickReplies && message.quickReplies.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {message.quickReplies.map((reply) => (
              <button
                key={reply}
                onClick={() => onQuickReply(reply)}
                className="rounded-full border border-stone-700 bg-stone-800 px-3 py-1 text-xs text-stone-300 hover:bg-stone-700 transition-colors"
              >
                {reply}
              </button>
            ))}
          </div>
        )}

        {/* Feedback */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => onFeedback(message, 'up')}
            className={`rounded p-1 transition-colors ${
              message.feedback === 'up' ? 'text-brand-400' : 'text-stone-600 hover:text-stone-400'
            }`}
            aria-label="Good response"
          >
            <ThumbsUp className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => onFeedback(message, 'down')}
            className={`rounded p-1 transition-colors ${
              message.feedback === 'down' ? 'text-red-400' : 'text-stone-600 hover:text-stone-400'
            }`}
            aria-label="Poor response"
          >
            <ThumbsDown className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  )
}

// ---- Context Panel ---------------------------------------------------------

function ContextPanel({ context }: { context: RemyConciergeContext }) {
  return (
    <div className="space-y-4 text-sm">
      {/* Upcoming events */}
      {context.upcoming_events.length > 0 && (
        <div>
          <div className="flex items-center gap-2 text-stone-400 mb-2">
            <Calendar className="h-4 w-4" />
            <span className="font-medium">Upcoming events</span>
            <Badge variant="default" className="ml-auto text-xs">
              {context.upcoming_events.length}
            </Badge>
          </div>
          <div className="space-y-1.5">
            {context.upcoming_events.slice(0, 5).map((ev) => (
              <div
                key={ev.id}
                className="rounded-lg border border-stone-800 bg-stone-800/40 px-3 py-2"
              >
                <p className="text-xs font-medium text-stone-200 truncate">{ev.title}</p>
                <p className="text-xs text-stone-500">
                  {new Date(ev.date).toLocaleDateString()} &middot; {ev.guest_count} guests
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Overdue tasks */}
      {context.overdue_tasks.length > 0 && (
        <div>
          <div className="flex items-center gap-2 text-amber-400 mb-2">
            <AlertTriangle className="h-4 w-4" />
            <span className="font-medium">Overdue tasks</span>
            <Badge variant="warning" className="ml-auto text-xs">
              {context.overdue_tasks.length}
            </Badge>
          </div>
          <div className="space-y-1.5">
            {context.overdue_tasks.slice(0, 5).map((task) => (
              <div
                key={task.id}
                className="rounded-lg border border-amber-900/50 bg-amber-950/20 px-3 py-2"
              >
                <p className="text-xs font-medium text-stone-200 truncate">{task.title}</p>
                <p className="text-xs text-stone-500">
                  Due {new Date(task.due_date).toLocaleDateString()}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Unread inbox */}
      {context.unread_inbox > 0 && (
        <div className="flex items-center gap-2 rounded-lg border border-stone-800 bg-stone-800/40 px-3 py-2.5">
          <Mail className="h-4 w-4 text-stone-400" />
          <span className="text-xs text-stone-300">Unread messages</span>
          <Badge variant="default" className="ml-auto text-xs">
            {context.unread_inbox}
          </Badge>
        </div>
      )}

      {/* CIL Insights */}
      {context.cil_insights.length > 0 && (
        <div>
          <div className="flex items-center gap-2 text-stone-400 mb-2">
            <Bot className="h-4 w-4" />
            <span className="font-medium">Insights</span>
          </div>
          <div className="space-y-1.5">
            {context.cil_insights.map((insight, i) => (
              <div
                key={i}
                className={`rounded-lg border px-3 py-2 ${
                  insight.severity === 'high'
                    ? 'border-red-900/50 bg-red-950/20'
                    : 'border-stone-800 bg-stone-800/40'
                }`}
              >
                <p className="text-xs font-medium text-stone-200">{insight.title}</p>
                <p className="text-xs text-stone-500 line-clamp-2">{insight.detail}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
