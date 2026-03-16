// Add Expense Page
// Three modes: manual entry, receipt upload with AI extraction, and OCR receipt scan

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'
import { ExpenseForm } from '@/components/expenses/expense-form'
import { ReceiptScanner } from '@/components/expenses/receipt-scanner'
import { NewExpenseClient } from './new-expense-client'

async function getEventsForDropdown() {
  const supabase: any = createServerClient()
  const { data } = await supabase
    .from('events')
    .select('id, occasion, event_date, client:clients(full_name)')
    .order('event_date', { ascending: false })
    .limit(50)

  return data || []
}

export default async function NewExpensePage({
  searchParams,
}: {
  searchParams: { event_id?: string; mode?: string }
}) {
  const user = await requireChef()
  const events = await getEventsForDropdown()

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <h1 className="text-3xl font-bold text-stone-100">Add Expense</h1>
      <NewExpenseClient
        events={events}
        defaultEventId={searchParams.event_id}
        defaultMode={searchParams.mode === 'scan' ? 'scan' : undefined}
        chefId={user.entityId}
      />
    </div>
  )
}
