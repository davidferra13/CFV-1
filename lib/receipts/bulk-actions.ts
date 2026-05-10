// Bulk Operations for Receipts and Expenses
// Batch link, categorize, and export actions for multi-select workflows.

'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { revalidatePath } from 'next/cache'
import type { ExpenseCategory } from '@/lib/constants/expense-categories'
import { EXPENSE_CATEGORY_VALUES } from '@/lib/constants/expense-categories'

// ── Types ────────────────────────────────────────────────────────────────────

export type BulkResult = {
  succeeded: number
  failed: number
  errors: string[]
}

export type ExpenseExportRow = {
  date: string
  description: string
  vendorName: string | null
  category: string
  amountCents: number
  eventName: string | null
  isBusiness: boolean
  hasReceipt: boolean
}

export type ExpenseExportData = {
  summary: {
    totalCents: number
    count: number
    byCategory: Array<{ category: string; totalCents: number; count: number }>
  }
  rows: ExpenseExportRow[]
  receiptUrls: string[]
}

// ── Constants ────────────────────────────────────────────────────────────────

const MAX_BULK_SIZE = 100

// ── Helpers ──────────────────────────────────────────────────────────────────

function assertBatchSize(ids: string[], label: string): void {
  if (!ids.length) throw new Error(`No ${label} provided`)
  if (ids.length > MAX_BULK_SIZE) {
    throw new Error(
      `Bulk operations are limited to ${MAX_BULK_SIZE} items. Received ${ids.length} ${label}.`
    )
  }
}

async function validateEventOwnership(db: any, eventId: string, tenantId: string): Promise<void> {
  const { data: event } = await db
    .from('events')
    .select('id')
    .eq('id', eventId)
    .eq('tenant_id', tenantId)
    .single()

  if (!event) throw new Error('Event not found or does not belong to this tenant')
}

// ── 1. Bulk Link Receipts to Event ───────────────────────────────────────────

/**
 * Link multiple receipt photos to a single event.
 * Also updates any expenses already linked to those receipts (via receipt_photo_id).
 */
export async function bulkLinkReceiptsToEvent(
  receiptPhotoIds: string[],
  eventId: string
): Promise<BulkResult> {
  const user = await requireChef()
  const tenantId = user.tenantId!
  const db: any = createServerClient()

  assertBatchSize(receiptPhotoIds, 'receipt photo IDs')
  await validateEventOwnership(db, eventId, tenantId)

  const errors: string[] = []
  let succeeded = 0

  // Update receipt_photos
  const { data: updated, error: receiptError } = await db
    .from('receipt_photos')
    .update({ event_id: eventId })
    .in('id', receiptPhotoIds)
    .eq('tenant_id', tenantId)
    .select('id')

  if (receiptError) {
    errors.push(`Receipt update failed: ${receiptError.message}`)
  } else {
    succeeded = updated?.length ?? 0
    const missing = receiptPhotoIds.length - succeeded
    if (missing > 0) {
      errors.push(`${missing} receipt(s) not found or not owned by this tenant`)
    }
  }

  // Also update linked expenses (those with receipt_photo_id matching any of the IDs)
  try {
    await db
      .from('expenses')
      .update({ event_id: eventId })
      .in('receipt_photo_id', receiptPhotoIds)
      .eq('tenant_id', tenantId)
  } catch (err: any) {
    errors.push(`Linked expense update failed: ${err.message}`)
  }

  revalidatePath(`/events/${eventId}`)
  revalidatePath(`/events/${eventId}/receipts`)
  revalidatePath('/finance')

  return {
    succeeded,
    failed: receiptPhotoIds.length - succeeded,
    errors,
  }
}

// ── 2. Bulk Categorize Expenses ──────────────────────────────────────────────

/**
 * Set the category on multiple expenses at once.
 */
export async function bulkCategorizeExpenses(
  expenseIds: string[],
  category: ExpenseCategory
): Promise<BulkResult> {
  const user = await requireChef()
  const tenantId = user.tenantId!
  const db: any = createServerClient()

  assertBatchSize(expenseIds, 'expense IDs')

  if (!(EXPENSE_CATEGORY_VALUES as readonly string[]).includes(category)) {
    throw new Error(`Invalid expense category: ${category}`)
  }

  const errors: string[] = []
  let succeeded = 0

  const { data: updated, error } = await db
    .from('expenses')
    .update({ category })
    .in('id', expenseIds)
    .eq('tenant_id', tenantId)
    .select('id')

  if (error) {
    errors.push(`Categorize failed: ${error.message}`)
  } else {
    succeeded = updated?.length ?? 0
    const missing = expenseIds.length - succeeded
    if (missing > 0) {
      errors.push(`${missing} expense(s) not found or not owned by this tenant`)
    }
  }

  revalidatePath('/finance')
  revalidatePath('/expenses')

  return {
    succeeded,
    failed: expenseIds.length - succeeded,
    errors,
  }
}

// ── 3. Bulk Link Expenses to Event ───────────────────────────────────────────

/**
 * Assign multiple expenses to a single event.
 */
export async function bulkLinkExpensesToEvent(
  expenseIds: string[],
  eventId: string
): Promise<BulkResult> {
  const user = await requireChef()
  const tenantId = user.tenantId!
  const db: any = createServerClient()

  assertBatchSize(expenseIds, 'expense IDs')
  await validateEventOwnership(db, eventId, tenantId)

  const errors: string[] = []
  let succeeded = 0

  const { data: updated, error } = await db
    .from('expenses')
    .update({ event_id: eventId })
    .in('id', expenseIds)
    .eq('tenant_id', tenantId)
    .select('id')

  if (error) {
    errors.push(`Link failed: ${error.message}`)
  } else {
    succeeded = updated?.length ?? 0
    const missing = expenseIds.length - succeeded
    if (missing > 0) {
      errors.push(`${missing} expense(s) not found or not owned by this tenant`)
    }
  }

  revalidatePath(`/events/${eventId}`)
  revalidatePath('/finance')
  revalidatePath('/expenses')

  return {
    succeeded,
    failed: expenseIds.length - succeeded,
    errors,
  }
}

// ── 4. Export Expenses Bundle ────────────────────────────────────────────────

/**
 * Query expenses matching filters and return structured data for client-side
 * PDF/CSV generation. Includes receipt URLs for any expense with a photo.
 */
export async function exportExpensesBundle(opts: {
  eventId?: string
  startDate?: string
  endDate?: string
  categories?: string[]
}): Promise<ExpenseExportData> {
  const user = await requireChef()
  const tenantId = user.tenantId!
  const db: any = createServerClient()

  let query = db
    .from('expenses')
    .select(
      `
      id,
      expense_date,
      description,
      vendor_name,
      category,
      amount_cents,
      is_business,
      receipt_photo_url,
      event:events(id, occasion)
    `
    )
    .eq('tenant_id', tenantId)

  if (opts.eventId) {
    query = query.eq('event_id', opts.eventId)
  }
  if (opts.startDate) {
    query = query.gte('expense_date', opts.startDate)
  }
  if (opts.endDate) {
    query = query.lte('expense_date', opts.endDate)
  }
  if (opts.categories?.length) {
    query = query.in('category', opts.categories)
  }

  const { data, error } = await query.order('expense_date', { ascending: true })

  if (error) {
    console.error('[exportExpensesBundle] Error:', error)
    throw new Error('Failed to load expenses for export')
  }

  const expenses: any[] = data ?? []

  // Build rows and collect receipt URLs
  const rows: ExpenseExportRow[] = []
  const receiptUrls: string[] = []
  const categoryTotals = new Map<string, { totalCents: number; count: number }>()
  let totalCents = 0

  for (const exp of expenses) {
    const hasReceipt = !!exp.receipt_photo_url
    if (hasReceipt) {
      receiptUrls.push(exp.receipt_photo_url)
    }

    rows.push({
      date: exp.expense_date ?? '',
      description: exp.description ?? '',
      vendorName: exp.vendor_name ?? null,
      category: exp.category ?? 'other',
      amountCents: exp.amount_cents ?? 0,
      eventName: exp.event?.occasion ?? null,
      isBusiness: exp.is_business ?? false,
      hasReceipt,
    })

    totalCents += exp.amount_cents ?? 0

    const cat = exp.category ?? 'other'
    const existing = categoryTotals.get(cat) ?? { totalCents: 0, count: 0 }
    existing.totalCents += exp.amount_cents ?? 0
    existing.count += 1
    categoryTotals.set(cat, existing)
  }

  const byCategory = Array.from(categoryTotals.entries()).map(([category, totals]) => ({
    category,
    totalCents: totals.totalCents,
    count: totals.count,
  }))

  return {
    summary: {
      totalCents,
      count: rows.length,
      byCategory,
    },
    rows,
    receiptUrls,
  }
}
