'use client'

import { useState, useTransition } from 'react'
import { Send, Loader2, DollarSign, StickyNote, ListChecks } from '@/components/ui/icons'
import { detectQuickLogType, type QuickLogType } from '@/lib/mobile/quick-log'
import { submitQuickLog } from '@/lib/mobile/quick-log-actions'
import { toast } from 'sonner'

const TYPE_CONFIG: Record<QuickLogType, { label: string; color: string; icon: typeof DollarSign }> = {
  expense: { label: 'Expense', color: 'bg-green-600', icon: DollarSign },
  note: { label: 'Note', color: 'bg-blue-600', icon: StickyNote },
  task: { label: 'Task', color: 'bg-amber-600', icon: ListChecks },
}

export function QuickLogInput({
  eventId,
  onSuccess,
}: {
  eventId?: string
  onSuccess?: () => void
}) {
  const [text, setText] = useState('')
  const [isPending, startTransition] = useTransition()
  const detectedType = detectQuickLogType(text)
  const config = TYPE_CONFIG[detectedType]
  const Icon = config.icon

  function handleSubmit() {
    if (!text.trim() || isPending) return

    startTransition(async () => {
      try {
        const result = await submitQuickLog(text, eventId)
        if (result.success) {
          const labels: Record<QuickLogType, string> = {
            expense: 'Expense logged',
            note: 'Note saved',
            task: 'Task created',
          }
          toast.success(labels[result.type])
          setText('')
          onSuccess?.()
        } else {
          toast.error(result.error ?? 'Failed to save')
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Failed to save'
        toast.error(msg)
      }
    })
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  return (
    <div className="space-y-3">
      {/* Type detection badge */}
      {text.trim() && (
        <div className="flex items-center gap-2">
          <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold text-white ${config.color}`}>
            <Icon className="h-3.5 w-3.5" />
            {config.label}
          </span>
          <span className="text-xs text-stone-500">
            {detectedType === 'expense' && 'Detected $ amount'}
            {detectedType === 'task' && 'Starts with task: or todo:'}
            {detectedType === 'note' && 'Will be saved as a note'}
          </span>
        </div>
      )}

      {/* Input area */}
      <div className="relative">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder='Type anything: "$47 Costco", "note: loved the risotto", "task: order truffle oil"'
          rows={3}
          className="w-full rounded-2xl border border-stone-700 bg-stone-900 px-4 py-4 pr-14 text-base text-stone-100 placeholder:text-stone-500 focus:outline-none focus:ring-2 focus:ring-stone-500 resize-none"
          autoFocus
          disabled={isPending}
        />
        <button
          onClick={handleSubmit}
          disabled={!text.trim() || isPending}
          className="absolute bottom-3 right-3 w-10 h-10 rounded-full bg-stone-700 text-white flex items-center justify-center hover:bg-stone-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors active:scale-95"
          aria-label="Log it"
        >
          {isPending ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <Send className="h-5 w-5" />
          )}
        </button>
      </div>

      {/* Hint text */}
      <p className="text-xs text-stone-600 px-1">
        Prefix with <span className="text-stone-400">task:</span> or <span className="text-stone-400">todo:</span> for tasks,{' '}
        <span className="text-stone-400">note:</span> for notes, or include a <span className="text-stone-400">$</span> amount for expenses.
      </p>
    </div>
  )
}
