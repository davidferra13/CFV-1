'use client'

import { useState, useRef, useEffect } from 'react'
import { Bot, X, Send, Loader2, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { sendCopilotMessage, type CopilotMessage } from '@/lib/ai/copilot-actions'
import { toast } from 'sonner'

const STARTER_PROMPTS = [
  'Draft a follow-up for my last client',
  'Suggest a menu for 8 guests',
  'How is my revenue this month?',
  'Write a quote introduction',
]

export function CopilotDrawer() {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<CopilotMessage[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function handleSend(text?: string) {
    const message = (text ?? input).trim()
    if (!message || loading) return
    setInput('')
    const userMsg: CopilotMessage = {
      role: 'user',
      content: message,
      timestamp: new Date().toISOString(),
    }
    setMessages(prev => [...prev, userMsg])
    setLoading(true)
    try {
      const reply = await sendCopilotMessage(message, messages)
      const assistantMsg: CopilotMessage = {
        role: 'assistant',
        content: reply,
        timestamp: new Date().toISOString(),
      }
      setMessages(prev => [...prev, assistantMsg])
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'AI assistant error'
      toast.error(message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      {/* Floating trigger button */}
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-40 flex items-center gap-2 bg-brand-600 text-white rounded-full px-4 py-3 shadow-lg hover:bg-brand-700 transition-all"
        aria-label="Open AI Co-Pilot"
      >
        <Bot className="h-5 w-5" />
        <span className="text-sm font-medium hidden sm:inline">AI Assistant</span>
      </button>

      {/* Drawer overlay */}
      {open && (
        <div
          className="fixed inset-0 z-50 flex justify-end"
          onClick={e => {
            if (e.target === e.currentTarget) setOpen(false)
          }}
        >
          <div className="w-full max-w-md bg-white dark:bg-stone-900 shadow-2xl flex flex-col h-full border-l border-stone-200 dark:border-stone-700">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-stone-200 dark:border-stone-700 bg-brand-600">
              <div className="flex items-center gap-2">
                <Bot className="h-5 w-5 text-white" />
                <span className="font-semibold text-white">AI Assistant</span>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="text-white/80 hover:text-white"
                aria-label="Close AI Assistant"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.length === 0 && (
                <div className="space-y-3">
                  <p className="text-sm text-stone-500 dark:text-stone-400">
                    Hi! I can help you draft messages, suggest menus, analyze revenue, and more.
                    What would you like to do?
                  </p>
                  <div className="grid grid-cols-1 gap-2">
                    {STARTER_PROMPTS.map(prompt => (
                      <button
                        key={prompt}
                        onClick={() => handleSend(prompt)}
                        className="text-left text-sm bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-lg px-3 py-2 hover:bg-stone-100 dark:hover:bg-stone-700 transition-colors text-stone-700 dark:text-stone-300"
                      >
                        <ChevronRight className="h-3 w-3 inline mr-1 text-brand-600" />
                        {prompt}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {messages.map((msg, i) => (
                <div
                  key={i}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[85%] rounded-xl px-4 py-2 text-sm ${
                      msg.role === 'user'
                        ? 'bg-brand-600 text-white'
                        : 'bg-stone-100 dark:bg-stone-800 text-stone-900 dark:text-stone-100'
                    }`}
                  >
                    <pre className="whitespace-pre-wrap font-sans">{msg.content}</pre>
                  </div>
                </div>
              ))}

              {loading && (
                <div className="flex justify-start">
                  <div className="bg-stone-100 dark:bg-stone-800 rounded-xl px-4 py-3">
                    <Loader2 className="h-4 w-4 animate-spin text-stone-500" />
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="p-4 border-t border-stone-200 dark:border-stone-700">
              <div className="flex gap-2">
                <textarea
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault()
                      handleSend()
                    }
                  }}
                  placeholder="Ask me anything..."
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
              <p className="text-xs text-stone-400 mt-1">
                All suggestions require your review before use
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
