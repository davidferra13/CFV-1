// New Expense Client — Mode switcher between Manual, Receipt Upload, and OCR Scan
'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { ExpenseForm } from '@/components/expenses/expense-form'
import { ReceiptScanner } from '@/components/expenses/receipt-scanner'

type EventOption = {
  id: string
  occasion: string | null
  event_date: string
  client: { full_name: string } | null
}

type Props = {
  events: EventOption[]
  defaultEventId?: string
  defaultMode?: 'manual' | 'scan'
}

export function NewExpenseClient({ events, defaultEventId, defaultMode }: Props) {
  const [mode, setMode] = useState<'form' | 'scan'>(defaultMode === 'scan' ? 'scan' : 'form')

  return (
    <div className="space-y-6">
      {/* Mode Toggle */}
      <div className="flex gap-2">
        <Button variant={mode === 'form' ? 'primary' : 'secondary'} onClick={() => setMode('form')}>
          Manual / Receipt Upload
        </Button>
        <Button variant={mode === 'scan' ? 'primary' : 'secondary'} onClick={() => setMode('scan')}>
          OCR Scan
        </Button>
      </div>

      {/* Content */}
      {mode === 'form' && <ExpenseForm events={events} defaultEventId={defaultEventId} />}

      {mode === 'scan' && <ReceiptScanner events={events} defaultEventId={defaultEventId} />}
    </div>
  )
}
