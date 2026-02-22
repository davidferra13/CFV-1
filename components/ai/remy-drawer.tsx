'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import {
  Bot,
  X,
  Send,
  Loader2,
  ChevronRight,
  ArrowRight,
  CalendarDays,
  TrendingUp,
  Mail,
  Users,
  AlertCircle,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { RemyTaskCard } from '@/components/ai/remy-task-card'
import { sendRemyMessage } from '@/lib/ai/remy-actions'
import { approveTask } from '@/lib/ai/command-orchestrator'
import { toast } from 'sonner'
import type { RemyMessage } from '@/lib/ai/remy-types'

const REMY_STARTERS = [
  { text: "What's on my plate this week?", icon: CalendarDays },
  { text: "How's business looking this month?", icon: TrendingUp },
  { text: 'Draft a follow-up for my last event', icon: Mail },
  { text: 'Any clients I should reach out to?', icon: Users },
]

export function RemyDrawer() {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<RemyMessage[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const pathname = usePathname()

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Auto-focus textarea when drawer opens
  useEffect(() => {
    if (open) {
      setTimeout(() => textareaRef.current?.focus(), 100)
    }
  }, [open])

  const handleSend = useCallback(
    async (text?: string) => {
      const message = (text ?? input).trim()
      if (!message || loading) return
      setInput('')

      const userMsg: RemyMessage = {
        id: crypto.randomUUID(),
        role: 'user',
        content: message,
        timestamp: new Date().toISOString(),
      }
      setMessages((prev) => [...prev, userMsg])
      setLoading(true)

      try {
        const response = await sendRemyMessage(message, messages, pathname ?? undefined)
        const remyMsg: RemyMessage = {
          id: crypto.randomUUID(),
          role: 'remy',
          content: response.text,
          timestamp: new Date().toISOString(),
          tasks: response.tasks,
          navSuggestions: response.navSuggestions,
        }
        setMessages((prev) => [...prev, remyMsg])
      } catch (err: unknown) {
        const errMsg = err instanceof Error ? err.message : 'Remy is having trouble. Try again.'
        // Check if Ollama offline
        const isOllamaOffline = errMsg.includes('Local AI is offline') || errMsg.includes('Ollama')
        const remyErrorMsg: RemyMessage = {
          id: crypto.randomUUID(),
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
    [input, loading, messages, pathname]
  )

  const handleApproveTask = useCallback(async (taskId: string, taskType: string, data: unknown) => {
    try {
      const result = await approveTask(taskType, data)
      toast.success(result.message)
      // Update the task status in messages
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
                <Bot className="h-5 w-5 text-white" />
                <span className="font-semibold text-white">Remy</span>
                <span className="text-xs text-white/60 font-normal">AI Companion</span>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="text-white/80 hover:text-white transition-colors"
                aria-label="Close Remy"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {/* Welcome message */}
              {messages.length === 0 && (
                <div className="space-y-4">
                  <div className="bg-stone-50 dark:bg-stone-800 rounded-xl p-4">
                    <p className="text-sm text-stone-700 dark:text-stone-300">
                      Hey chef! I&apos;m <span className="font-semibold">Remy</span>, your kitchen
                      companion. I can check your schedule, look up clients, draft messages, crunch
                      numbers — whatever you need.
                    </p>
                    <p className="text-xs text-stone-400 mt-2">
                      Everything I suggest is a draft — you always have the final say.
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
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`max-w-[85%] space-y-2 ${msg.role === 'user' ? '' : ''}`}>
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
                    {msg.role === 'remy' && msg.navSuggestions && msg.navSuggestions.length > 0 && (
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
                  </div>
                </div>
              ))}

              {/* Loading indicator */}
              {loading && (
                <div className="flex justify-start">
                  <div className="bg-stone-100 dark:bg-stone-800 rounded-xl px-4 py-3 flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin text-brand-600" />
                    <span className="text-xs text-stone-500">Remy is thinking...</span>
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
          </div>
        </div>
      )}
    </>
  )
}
