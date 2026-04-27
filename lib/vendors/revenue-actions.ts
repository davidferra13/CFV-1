'use server'

import { createServerClient } from '@/lib/db/server'
import { requireChef } from '@/lib/auth/get-user'
import { revalidatePath } from 'next/cache'
import { broadcastTenantMutation } from '@/lib/realtime/broadcast'
import { z } from 'zod'

// ============================================
// SCHEMAS
// ============================================

const UpsertDailyRevenueSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD'),
  total_revenue_cents: z.number().int().min(0),
  source: z.enum(['manual', 'csv']).default('manual'),
  notes: z.string().optional(),
})

export type UpsertDailyRevenueInput = z.infer<typeof UpsertDailyRevenueSchema>

// ============================================
// DAILY REVENUE
// ============================================

export async function upsertDailyRevenue(input: UpsertDailyRevenueInput) {
  const user = await requireChef()
  const db: any = createServerClient()
  const data = UpsertDailyRevenueSchema.parse(input)

  // Check if entry already exists for this date
  const { data: existing } = await db
    .from('daily_revenue')
    .select('id')
    .eq('chef_id', user.tenantId!)
    .eq('date', data.date)
    .maybeSingle()

  if (existing) {
    // Update existing entry
    const { error } = await db
      .from('daily_revenue')
      .update({
        total_revenue_cents: data.total_revenue_cents,
        source: data.source,
        notes: data.notes || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', existing.id)
      .eq('chef_id', user.tenantId!)

    if (error) {
      console.error('[revenue] upsertDailyRevenue update error:', error)
      throw new Error('Failed to update daily revenue')
    }
  } else {
    // Insert new entry
    const { error } = await db.from('daily_revenue').insert({
      date: data.date,
      total_revenue_cents: data.total_revenue_cents,
      source: data.source,
      notes: data.notes || null,
      chef_id: user.tenantId!,
    })

    if (error) {
      console.error('[revenue] upsertDailyRevenue insert error:', error)
      throw new Error('Failed to save daily revenue')
    }
  }

  revalidatePath('/food-cost')
  try {
    broadcastTenantMutation(user.tenantId!, {
      entity: 'daily_revenue',
      action: existing ? 'update' : 'insert',
      reason: existing ? 'Daily revenue updated' : 'Daily revenue created',
    })
  } catch {}
}

export async function listDailyRevenue(startDate: string, endDate: string) {
  const user = await requireChef()
  const db: any = createServerClient()

  const { data, error } = await db
    .from('daily_revenue')
    .select('*')
    .eq('chef_id', user.tenantId!)
    .gte('date', startDate)
    .lte('date', endDate)
    .order('date', { ascending: false })

  if (error) {
    console.error('[revenue] listDailyRevenue error:', error)
    throw new Error('Failed to list daily revenue')
  }

  return data ?? []
}

export async function getDailyRevenue(date: string) {
  const user = await requireChef()
  const db: any = createServerClient()

  const { data, error } = await db
    .from('daily_revenue')
    .select('*')
    .eq('chef_id', user.tenantId!)
    .eq('date', date)
    .maybeSingle()

  if (error) {
    console.error('[revenue] getDailyRevenue error:', error)
    throw new Error('Failed to get daily revenue')
  }

  return data
}
