// Import Receipt as Expense
// Maps AI receipt extraction to createExpense()

'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createExpense } from '@/lib/expenses/actions'
import type { ReceiptExtraction } from '@/lib/ai/parse-receipt'

export async function importReceiptAsExpense(
  extraction: ReceiptExtraction,
  eventId: string | null,
  paymentMethod: string,
  category: string
) {
  await requireChef()

  // Build description from line items
  const items = extraction.lineItems
  const desc = items.length <= 3
    ? items.map(i => i.description).join(', ')
    : `${items.length} items from ${extraction.storeName || 'store'}`

  return createExpense({
    event_id: eventId || null,
    amount_cents: extraction.totalCents,
    category: category as any,
    payment_method: paymentMethod as any,
    description: desc,
    expense_date: extraction.purchaseDate || new Date().toISOString().split('T')[0],
    vendor_name: extraction.storeName || null,
    notes: `Smart receipt import: ${extraction.itemCount} items, ${extraction.confidence} confidence`,
    is_business: true,
  })
}
