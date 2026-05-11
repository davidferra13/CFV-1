'use server'

// Grocery Run Mode - Server Actions
// Auth-gated, tenant-scoped actions for mobile grocery shopping.

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { generateGroceryList } from '@/lib/grocery/generate-grocery-list'
import { buildGroceryRunData, type GroceryRunData } from './grocery-run'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

// ── Grocery Run List ──────────────────────────────────────────────────

/**
 * Get the grocery run list for an event, grouped by store section.
 * Fetches checked items from the DB to restore state.
 */
export async function getGroceryRunList(eventId: string): Promise<GroceryRunData> {
  const user = await requireChef()
  if (!eventId) throw new Error('Event ID is required')

  // Generate the full grocery list (reuses existing logic)
  const groceryList = await generateGroceryList(eventId)

  // Fetch previously checked items for this event
  const db: any = createServerClient()
  const { data: checkedRows } = await db
    .from('grocery_run_checks')
    .select('ingredient_id')
    .eq('event_id', eventId)
    .eq('tenant_id', user.tenantId!)

  const checkedIds = new Set<string>(
    (checkedRows ?? []).map((r: { ingredient_id: string }) => r.ingredient_id)
  )

  return buildGroceryRunData(eventId, groceryList, checkedIds)
}

// ── Check Off Item ────────────────────────────────────────────────────

const CheckOffSchema = z.object({
  eventId: z.string().uuid(),
  ingredientId: z.string().uuid(),
  checked: z.boolean(),
})

/**
 * Toggle an item as checked/unchecked during a grocery run.
 * Uses upsert with soft-delete pattern (insert on check, delete on uncheck).
 */
export async function checkOffItem(
  eventId: string,
  ingredientId: string,
  checked: boolean
): Promise<{ success: boolean }> {
  const user = await requireChef()
  const validated = CheckOffSchema.parse({ eventId, ingredientId, checked })
  const db: any = createServerClient()

  if (validated.checked) {
    // Insert check record (upsert to handle re-checks)
    const { error } = await db
      .from('grocery_run_checks')
      .upsert(
        {
          event_id: validated.eventId,
          ingredient_id: validated.ingredientId,
          tenant_id: user.tenantId!,
          checked_at: new Date().toISOString(),
          checked_by: user.id,
        },
        { onConflict: 'event_id,ingredient_id,tenant_id' }
      )

    if (error) throw new Error('Failed to check off item')
  } else {
    // Remove check record
    const { error } = await db
      .from('grocery_run_checks')
      .delete()
      .eq('event_id', validated.eventId)
      .eq('ingredient_id', validated.ingredientId)
      .eq('tenant_id', user.tenantId!)

    if (error) throw new Error('Failed to uncheck item')
  }

  return { success: true }
}

// ── Quick Receipt Logging ─────────────────────────────────────────────

const LogReceiptSchema = z.object({
  eventId: z.string().uuid(),
  amountCents: z.number().int().positive('Amount must be positive'),
  vendorName: z.string().min(1, 'Vendor name is required').max(255),
  notes: z.string().max(500).optional(),
})

/**
 * Quick-log a receipt as an expense linked to an event.
 * Minimal input for speed in the field.
 */
export async function logReceipt(input: {
  eventId: string
  amountCents: number
  vendorName: string
  notes?: string
}): Promise<{ success: boolean; expenseId?: string }> {
  const user = await requireChef()
  const validated = LogReceiptSchema.parse(input)
  const db: any = createServerClient()

  const today = new Date().toISOString().split('T')[0]

  const { data, error } = await db
    .from('expenses')
    .insert({
      event_id: validated.eventId,
      tenant_id: user.tenantId!,
      created_by: user.id,
      amount_cents: validated.amountCents,
      category: 'groceries',
      payment_method: 'card',
      description: `Grocery run at ${validated.vendorName}`,
      vendor_name: validated.vendorName,
      expense_date: today,
      is_business: true,
      notes: validated.notes || null,
    })
    .select('id')
    .single()

  if (error) {
    console.error('[logReceipt] Error:', error)
    throw new Error('Failed to log receipt')
  }

  // Revalidate expense-related paths
  revalidatePath(`/events/${validated.eventId}`)
  revalidatePath('/expenses')
  revalidatePath('/financials')

  // Log activity (non-blocking)
  try {
    const { logChefActivity } = await import('@/lib/activity/log-chef')
    await logChefActivity({
      tenantId: user.tenantId!,
      actorId: user.id,
      action: 'expense_created',
      domain: 'financial',
      entityType: 'expense',
      entityId: data.id,
      summary: `Grocery receipt: $${(validated.amountCents / 100).toFixed(2)} at ${validated.vendorName}`,
      context: {
        amount_cents: validated.amountCents,
        category: 'groceries',
        event_id: validated.eventId,
        source: 'grocery_run',
      },
    })
  } catch {
    // Non-blocking
  }

  return { success: true, expenseId: data.id }
}
