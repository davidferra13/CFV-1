'use server'
// Owner Draw Actions
// Chef-only CRUD for recording equity draws from the business.
// Owner draws are excluded from revenue, expense, COGS, and net profit totals.
// They appear in the CPA export detail as equity movements only.

import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'

// ---- Types ----

export type OwnerDraw = {
  id: string
  drawDate: string
  amountCents: number
  paymentMethod: string
  description: string
  notes: string | null
  createdAt: string
}

// ---- Schemas ----

const PAYMENT_METHODS = ['cash', 'venmo', 'paypal', 'zelle', 'card', 'check', 'other'] as const

const RecordOwnerDrawSchema = z.object({
  drawDate: z.string().min(1, 'Draw date is required'),
  amountCents: z.number().int().positive('Amount must be a positive integer in cents'),
  paymentMethod: z.enum(PAYMENT_METHODS),
  description: z.string().min(1, 'Description is required').max(500),
  notes: z.string().max(1000).nullable().optional(),
})

export type RecordOwnerDrawInput = z.infer<typeof RecordOwnerDrawSchema>

// ---- Actions ----

/**
 * Record a new owner draw.
 * Revalidates ledger, year-end, and tax center surfaces.
 */
export async function recordOwnerDraw(
  input: RecordOwnerDrawInput
): Promise<{ success: true; ownerDraw: OwnerDraw }> {
  const user = await requireChef()
  const validated = RecordOwnerDrawSchema.parse(input)
  const db: any = createServerClient()

  const { data, error } = await db
    .from('owner_draws')
    .insert({
      tenant_id: user.tenantId!,
      draw_date: validated.drawDate,
      amount_cents: validated.amountCents,
      payment_method: validated.paymentMethod,
      description: validated.description,
      notes: validated.notes ?? null,
      created_by: user.id,
      updated_by: user.id,
    })
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to record owner draw: ${error.message}`)
  }

  revalidatePath('/finance/ledger')
  revalidatePath('/finance/ledger/owner-draws')
  revalidatePath('/finance/year-end')
  revalidatePath('/finance/tax')

  return { success: true, ownerDraw: mapOwnerDraw(data) }
}

/**
 * Get owner draws, optionally filtered by year.
 */
export async function getOwnerDraws(year?: number): Promise<OwnerDraw[]> {
  const user = await requireChef()
  const db: any = createServerClient()

  let query = db
    .from('owner_draws')
    .select('*')
    .eq('tenant_id', user.tenantId!)
    .order('draw_date', { ascending: false })

  if (year) {
    query = query.gte('draw_date', `${year}-01-01`).lte('draw_date', `${year}-12-31`)
  }

  const { data, error } = await query

  if (error) {
    throw new Error(`Failed to load owner draws: ${error.message}`)
  }

  return (data ?? []).map(mapOwnerDraw)
}

/**
 * Delete an owner draw.
 * Revalidates all affected surfaces.
 */
export async function deleteOwnerDraw(id: string): Promise<{ success: true }> {
  const user = await requireChef()

  if (!id || typeof id !== 'string') {
    throw new Error('Invalid owner draw id')
  }

  const db: any = createServerClient()

  const { error } = await db
    .from('owner_draws')
    .delete()
    .eq('id', id)
    .eq('tenant_id', user.tenantId!)

  if (error) {
    throw new Error(`Failed to delete owner draw: ${error.message}`)
  }

  revalidatePath('/finance/ledger')
  revalidatePath('/finance/ledger/owner-draws')
  revalidatePath('/finance/year-end')
  revalidatePath('/finance/tax')

  return { success: true }
}

// ---- Mapping helper ----

function mapOwnerDraw(row: any): OwnerDraw {
  return {
    id: row.id,
    drawDate: row.draw_date,
    amountCents: row.amount_cents,
    paymentMethod: row.payment_method,
    description: row.description,
    notes: row.notes ?? null,
    createdAt: row.created_at,
  }
}
