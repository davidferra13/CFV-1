// Vendor Payment Aging — pure computation, no server action.
// Buckets outstanding vendor payments by days past due.

export type VendorAgingEntry = {
  vendorName: string
  amountCents: number
  daysPastDue: number
  agingBucket: 'current' | '1-30' | '31-60' | '61-90' | '90+'
}

function getAgingBucket(daysPastDue: number): VendorAgingEntry['agingBucket'] {
  if (daysPastDue <= 0) return 'current'
  if (daysPastDue <= 30) return '1-30'
  if (daysPastDue <= 60) return '31-60'
  if (daysPastDue <= 90) return '61-90'
  return '90+'
}

export function computeVendorAging(
  expenses: Array<{
    vendor_name: string
    amount_cents: number
    due_date?: string | null
    paid_at?: string | null
  }>
): VendorAgingEntry[] {
  const now = new Date()
  const entries: VendorAgingEntry[] = []

  for (const expense of expenses) {
    // Skip already paid expenses
    if (expense.paid_at) continue

    let daysPastDue = 0
    if (expense.due_date) {
      const dueDate = new Date(expense.due_date)
      const diffMs = now.getTime() - dueDate.getTime()
      daysPastDue = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)))
    }

    entries.push({
      vendorName: expense.vendor_name,
      amountCents: expense.amount_cents,
      daysPastDue,
      agingBucket: getAgingBucket(daysPastDue),
    })
  }

  // Sort by most overdue first
  return entries.sort((a, b) => b.daysPastDue - a.daysPastDue)
}
