// Add Expense Page
// Two modes: manual entry and receipt upload with AI extraction

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'
import { ExpenseForm } from '@/components/expenses/expense-form'

async function getEventsForDropdown() {
  const supabase = createServerClient()
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
  searchParams: { event_id?: string }
}) {
  await requireChef()
  const events = await getEventsForDropdown()

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <h1 className="text-3xl font-bold text-stone-100">Add Expense</h1>
      <ExpenseForm events={events} defaultEventId={searchParams.event_id} />
    </div>
  )
}
