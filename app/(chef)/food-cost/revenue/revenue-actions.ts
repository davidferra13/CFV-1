'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { revalidatePath } from 'next/cache'

export async function saveRevenueEntry(formData: FormData) {
  const user = await requireChef()
  const db: any = createServerClient()
  const date = formData.get('date') as string
  const amount = formData.get('amount') as string
  const notes = formData.get('notes') as string

  if (!date || !amount) throw new Error('Date and amount are required')

  const totalRevenueCents = Math.round(parseFloat(amount) * 100)
  if (isNaN(totalRevenueCents) || totalRevenueCents <= 0) {
    throw new Error('Amount must be a positive number')
  }

  const { error } = await db.from('daily_revenue').upsert(
    {
      chef_id: user.tenantId!,
      date,
      total_revenue_cents: totalRevenueCents,
      source: 'manual',
      notes: notes?.trim() || null,
    },
    { onConflict: 'chef_id,date' }
  )

  if (error) {
    console.error('[saveRevenueEntry] Error:', error)
    throw new Error('Failed to save revenue entry')
  }

  revalidatePath('/food-cost/revenue')
  revalidatePath('/food-cost')
}
