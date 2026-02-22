'use client'

import { useState, useRef, useCallback } from 'react'
import { Bot, Send, Loader2, Zap } from 'lucide-react'
import { runCommand } from '@/lib/ai/command-orchestrator'
import { CommandResultCard } from '@/components/ai/command-result-card'
import type { CommandRun, TaskResult } from '@/lib/ai/command-types'

// ─── Quick Prompts ────────────────────────────────────────────────────────────

const QUICK_PROMPTS = [
  'What are my upcoming events this week?',
  'Draft a follow-up for my last client',
  'How much revenue have I made this year?',
  'Is March 20th available for a new event?',
]

// ─── Tier Legend ──────────────────────────────────────────────────────────────

function TierLegend() {
  return (
    <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-xs text-gray-500">
      <span className="flex items-center gap-1.5">
        <span className="inline-block w-2.5 h-2.5 rounded-full bg-emerald-500" />
        Auto (instant)
      </span>
      <span className="flex items-center gap-1.5">
        <span className="inline-block w-2.5 h-2.5 rounded-full bg-amber-500" />
        Draft — needs your approval
      </span>
      <span className="flex items-center gap-1.5">
        <span className="inline-block w-2.5 h-2.5 rounded-full bg-red-500" />
        Held — needs clarification
      </span>
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function CommandCenterClient() {
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [currentRun, setCurrentRun] = useState<CommandRun | null>(null)
  const [resultStatuses, setResultStatuses] = useState<Record<string, TaskResult['status']>>({})
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const handleSubmit = useCallback(
    async (e?: React.FormEvent) => {
      e?.preventDefault()
      const trimmed = input.trim()
      if (!trimmed || loading) return

      setLoading(true)
      setCurrentRun(null)
      setResultStatuses({})

      try {
        const run = await runCommand(trimmed)
        setCurrentRun(run)
      } catch {
        setCurrentRun({
          runId: 'err',
          rawInput: trimmed,
          startedAt: new Date().toISOString(),
          results: [
            {
              taskId: 'err',
              taskType: 'error',
              tier: 3,
              name: 'Error',
              status: 'error',
              error: 'Something went wrong. Please try again.',
            },
          ],
        })
      } finally {
        setLoading(false)
      }
    },
    [input, loading]
  )

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  const handleQuickPrompt = (prompt: string) => {
    setInput(prompt)
    textareaRef.current?.focus()
  }

  const handleStatusChange = useCallback((taskId: string, status: 'approved' | 'rejected') => {
    setResultStatuses((prev) => ({ ...prev, [taskId]: status }))
  }, [])

  const pendingApprovals =
    currentRun?.results.filter(
      (r) =>
        r.tier === 2 &&
        r.status === 'pending' &&
        resultStatuses[r.taskId] !== 'approved' &&
        resultStatuses[r.taskId] !== 'rejected'
    ).length ?? 0

  return (
    <div className="space-y-6">
      {/* Input form */}
      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="relative">
          <Bot className="absolute top-4 left-4 w-5 h-5 text-gray-500 pointer-events-none" />
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Tell me what you need… Find Sarah Johnson, check if March 15th is free, and draft her a follow-up."
            rows={4}
            disabled={loading}
            className="w-full rounded-xl border border-gray-700 bg-gray-900 pl-12 pr-14 py-4 text-sm text-white placeholder-gray-500 resize-none focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 disabled:opacity-60 transition-colors"
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="absolute bottom-3.5 right-3.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:bg-gray-700 disabled:cursor-not-allowed p-2 transition-colors"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 text-white animate-spin" />
            ) : (
              <Send className="w-4 h-4 text-white" />
            )}
          </button>
        </div>
        <p className="text-xs text-gray-600">
          Press Enter to run &middot; Shift+Enter for new line
        </p>
      </form>

      {/* Quick prompts — shown only before first run */}
      {!currentRun && !loading && (
        <div className="space-y-2">
          <p className="text-xs text-gray-500 uppercase tracking-wider">Quick start</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {QUICK_PROMPTS.map((prompt) => (
              <button
                type="button"
                key={prompt}
                onClick={() => handleQuickPrompt(prompt)}
                className="flex items-center gap-2 rounded-lg border border-gray-800 bg-gray-900 hover:border-gray-600 hover:bg-gray-800 px-3 py-2.5 text-left text-sm text-gray-400 hover:text-white transition-all"
              >
                <Zap className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                {prompt}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Loading state */}
      {loading && (
        <div className="flex items-center gap-3 text-sm text-gray-400 py-4">
          <Loader2 className="w-4 h-4 animate-spin text-indigo-400" />
          Parsing your command and running agents in parallel…
        </div>
      )}

      {/* Ollama offline */}
      {currentRun?.ollamaOffline && (
        <div className="rounded-lg border border-red-800 bg-red-950/50 p-4 text-sm text-red-300">
          <span className="font-medium">Ollama is offline.</span> Start Ollama to use the Command
          Center — your data stays private within ChefFlow.
        </div>
      )}

      {/* Results */}
      {currentRun && !currentRun.ollamaOffline && currentRun.results.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <TierLegend />
            {pendingApprovals > 0 && (
              <span className="text-xs text-amber-400 font-medium">
                {pendingApprovals} draft{pendingApprovals !== 1 ? 's' : ''} awaiting your approval
              </span>
            )}
          </div>

          <div className="space-y-2">
            {currentRun.results.map((result) => (
              <CommandResultCard
                key={result.taskId}
                result={result}
                onStatusChange={handleStatusChange}
              />
            ))}
          </div>

          <div className="flex items-center justify-between text-xs text-gray-700">
            <span>
              {currentRun.results.length} task{currentRun.results.length !== 1 ? 's' : ''} processed
            </span>
            <span>Run at {new Date(currentRun.startedAt).toLocaleTimeString()}</span>
          </div>
        </div>
      )}
    </div>
  )
}
