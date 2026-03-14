'use client'

import { useState, useEffect } from 'react'
import { DollarSign } from '@/components/ui/icons'
import { QuickExpenseModal } from './quick-expense-modal'

/**
 * Quick Expense trigger — FAB on mobile, keyboard shortcut on desktop.
 * Renders the modal when activated.
 *
 * Keyboard: Ctrl+Shift+E (or Cmd+Shift+E on Mac)
 */
export function QuickExpenseTrigger() {
  const [open, setOpen] = useState(false)

  // Register keyboard shortcut
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === 'e') {
        e.preventDefault()
        setOpen(true)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  return (
    <>
      {/* Mobile FAB — fixed bottom-right, hidden on desktop */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-4 md:hidden z-40 w-12 h-12 rounded-full bg-brand-600 hover:bg-brand-500 text-white shadow-lg flex items-center justify-center transition-colors"
        aria-label="Quick expense"
        title="Log expense (Ctrl+Shift+E)"
      >
        <DollarSign className="w-5 h-5" />
      </button>

      <QuickExpenseModal open={open} onClose={() => setOpen(false)} />
    </>
  )
}
