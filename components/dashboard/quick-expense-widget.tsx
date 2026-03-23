// Quick Expense Capture - dashboard widget for fast expense entry
// Phase 2, Widget 13

'use client'

import { useState, useTransition } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { DollarSign, Check, Receipt } from '@/components/ui/icons'
import { formatCurrency } from '@/lib/utils/currency'
import { toast } from 'sonner'

const EXPENSE_CATEGORIES = [
  { value: 'groceries', label: 'Groceries' },
  { value: 'supplies', label: 'Supplies' },
  { value: 'equipment', label: 'Equipment' },
  { value: 'travel', label: 'Travel/Gas' },
  { value: 'rental', label: 'Rental' },
  { value: 'other', label: 'Other' },
] as const

interface QuickExpenseWidgetProps {
  upcomingEvents: Array<{ id: string; occasion: string; date: string }>
  recentExpenses: Array<{
    id: string
    description: string
    amountCents: number
    date: string
    category: string
  }>
}

export function QuickExpenseWidget({
  upcomingEvents,
  recentExpenses: initialExpenses,
}: QuickExpenseWidgetProps) {
  const [amount, setAmount] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState('groceries')
  const [eventId, setEventId] = useState(() => {
    // Pre-select nearest upcoming event
    if (upcomingEvents.length > 0) return upcomingEvents[0].id
    return ''
  })
  const [recentExpenses, setRecentExpenses] = useState(initialExpenses)
  const [isPending, startTransition] = useTransition()
  const [showSuccess, setShowSuccess] = useState(false)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    const amountNum = parseFloat(amount)
    if (!amountNum || amountNum <= 0 || !description.trim()) return

    const amountCents = Math.round(amountNum * 100)
    const now = new Date().toISOString().slice(0, 10)

    // Optimistic addition
    const optimisticExpense = {
      id: `temp-${Date.now()}`,
      description: description.trim(),
      amountCents,
      date: now,
      category,
    }

    const previous = recentExpenses
    setRecentExpenses([optimisticExpense, ...previous].slice(0, 3))

    // Reset form immediately for snappy UX
    const submittedData = {
      amountCents,
      description: description.trim(),
      category,
      eventId: eventId || undefined,
    }
    setAmount('')
    setDescription('')
    setCategory('groceries')

    startTransition(async () => {
      try {
        const { quickCaptureExpense } = await import('@/lib/dashboard/widget-actions')
        const result = await quickCaptureExpense(submittedData)
        if (!result.success) {
          setRecentExpenses(previous)
          toast.error('Failed to save expense')
          return
        }
        // Replace optimistic entry with real one if returned
        if (result.expense) {
          setRecentExpenses((curr) =>
            curr.map((exp) => (exp.id === optimisticExpense.id ? result.expense! : exp))
          )
        }
        setShowSuccess(true)
        setTimeout(() => setShowSuccess(false), 2000)
      } catch {
        setRecentExpenses(previous)
        toast.error('Failed to save expense')
      }
    })
  }

  const categoryLabel = (val: string) =>
    EXPENSE_CATEGORIES.find((c) => c.value === val)?.label ?? val

  return (
    <Card className="border-stone-700 bg-stone-800/50">
      <CardContent className="py-4 space-y-4">
        {/* Header */}
        <div className="flex items-center gap-2">
          <Receipt className="h-4 w-4 text-stone-400" />
          <span className="text-sm font-semibold text-stone-200">Quick Expense</span>
          {showSuccess && (
            <span className="ml-auto flex items-center gap-1 text-xs text-emerald-400 animate-in fade-in">
              <Check className="h-3 w-3" /> Saved
            </span>
          )}
        </div>

        {/* Compact form */}
        <form onSubmit={handleSubmit} className="space-y-3">
          {/* Amount + Description row */}
          <div className="flex gap-2">
            <div className="relative w-28 shrink-0">
              <DollarSign className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-stone-500" />
              <input
                type="number"
                step="0.01"
                min="0.01"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full pl-7 pr-2 py-1.5 text-sm bg-stone-900 border border-stone-700 rounded-md text-stone-200 placeholder:text-stone-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                required
              />
            </div>
            <input
              type="text"
              placeholder="Description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="flex-1 px-3 py-1.5 text-sm bg-stone-900 border border-stone-700 rounded-md text-stone-200 placeholder:text-stone-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
              required
            />
          </div>

          {/* Category + Event row */}
          <div className="flex gap-2">
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="flex-1 px-2 py-1.5 text-sm bg-stone-900 border border-stone-700 rounded-md text-stone-200 focus:outline-none focus:ring-1 focus:ring-brand-500"
            >
              {EXPENSE_CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
            <select
              value={eventId}
              onChange={(e) => setEventId(e.target.value)}
              className="flex-1 px-2 py-1.5 text-sm bg-stone-900 border border-stone-700 rounded-md text-stone-200 focus:outline-none focus:ring-1 focus:ring-brand-500"
            >
              <option value="">No event</option>
              {upcomingEvents.map((ev) => (
                <option key={ev.id} value={ev.id}>
                  {ev.occasion} ({ev.date})
                </option>
              ))}
            </select>
          </div>

          {/* Submit */}
          <Button
            type="submit"
            variant="primary"
            className="w-full"
            disabled={isPending || !amount || !description.trim()}
          >
            {isPending ? 'Saving...' : 'Log Expense'}
          </Button>
        </form>

        {/* Recent expenses mini list */}
        {recentExpenses.length > 0 && (
          <div className="space-y-1.5 pt-1 border-t border-stone-700/50">
            <span className="text-xs text-stone-500 font-medium">Recent</span>
            {recentExpenses.map((exp) => (
              <div key={exp.id} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-stone-500 shrink-0">{categoryLabel(exp.category)}</span>
                  <span className="text-stone-300 truncate">{exp.description}</span>
                </div>
                <span className="text-stone-200 font-medium shrink-0 ml-2">
                  {formatCurrency(exp.amountCents)}
                </span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
