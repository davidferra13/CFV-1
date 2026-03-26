'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { revalidatePath } from 'next/cache'
import { EXPENSE_CATEGORY_VALUES } from '@/lib/constants/expense-categories'

// ============================================
// TYPES
// ============================================

export type ExpenseImportInput = {
  date: string // YYYY-MM-DD
  description: string
  amount_cents: number
  category: string // maps to expense category
  vendor: string | null
  notes: string | null
  tax_deductible: boolean
}

export type ExpenseImportResult = {
  success: boolean
  expenseId?: string
  error?: string
  label: string
}

// ============================================
// HELPERS
// ============================================

function isValidCategory(cat: string): boolean {
  return (EXPENSE_CATEGORY_VALUES as readonly string[]).includes(cat)
}

// ============================================
// SINGLE IMPORT
// ============================================

export async function importExpense(input: ExpenseImportInput): Promise<ExpenseImportResult> {
  const label = `${input.date} - ${input.description || 'Unnamed expense'}`

  try {
    const user = await requireChef()
    const tenantId = user.tenantId!
    const db: any = await createServerClient()

    if (!input.date) {
      return { success: false, error: 'Date is required', label }
    }
    if (!input.amount_cents || input.amount_cents <= 0) {
      return { success: false, error: 'Amount must be greater than zero', label }
    }

    const category = isValidCategory(input.category) ? input.category : 'other'

    const noteParts: string[] = []
    noteParts.push('[Historical import]')
    if (input.notes) noteParts.push(input.notes)
    const finalNotes = noteParts.join(' ')

    const { data, error } = await db
      .from('expenses')
      .insert({
        chef_id: tenantId,
        category,
        description: input.description || 'Imported expense',
        amount_cents: input.amount_cents,
        date: input.date,
        vendor: input.vendor || null,
        tax_deductible: input.tax_deductible ?? true,
        notes: finalNotes || null,
        event_id: null,
        is_recurring: false,
        recurrence_interval: null,
        receipt_url: null,
      })
      .select()
      .single()

    if (error) {
      console.error('[expense-import] insert failed:', error)
      return { success: false, error: 'Database insert failed', label }
    }

    return { success: true, expenseId: data.id, label }
  } catch (err) {
    console.error('[expense-import] importExpense error:', err)
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Unknown error',
      label,
    }
  }
}

// ============================================
// BATCH IMPORT
// ============================================

export async function importExpenses(
  inputs: ExpenseImportInput[]
): Promise<{ results: ExpenseImportResult[]; imported: number; failed: number }> {
  const results: ExpenseImportResult[] = []
  let imported = 0
  let failed = 0

  for (const input of inputs) {
    const result = await importExpense(input)
    results.push(result)
    if (result.success) {
      imported++
    } else {
      failed++
    }
  }

  // Revalidate once after the full batch
  revalidatePath('/finance')
  revalidatePath('/dashboard')

  return { results, imported, failed }
}
