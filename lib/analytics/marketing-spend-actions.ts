'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { revalidatePath } from 'next/cache'
import type { MarketingSpendEntry } from './marketing-spend-constants'

// Types, constants, and channel labels are in marketing-spend-constants.ts
// Import from there in client components - not from this file.

export async function getMarketingSpend(options?: {
  from?: string
  to?: string
}): Promise<{ data: MarketingSpendEntry[] | null; error: string | null }> {
  const user = await requireChef()
  const db: any = createServerClient()

  let query = db
    .from('marketing_spend_log')
    .select('*')
    .eq('chef_id', user.entityId)
    .order('spend_date', { ascending: false })

  if (options?.from) {
    query = query.gte('spend_date', options.from)
  }
  if (options?.to) {
    query = query.lte('spend_date', options.to)
  }

  const { data, error } = await query

  if (error) {
    // Table may not exist yet (migration not applied)
    if (error.code === '42P01') {
      return { data: [], error: null }
    }
    console.error('[getMarketingSpend]', error)
    return { data: null, error: 'Failed to load marketing spend' }
  }

  return { data: data as MarketingSpendEntry[], error: null }
}

export async function logMarketingSpend(input: {
  amount_cents: number
  channel: string
  description?: string
  spend_date: string
}): Promise<{ data: MarketingSpendEntry | null; error: string | null }> {
  const user = await requireChef()
  const db: any = createServerClient()

  if (input.amount_cents <= 0) {
    return { data: null, error: 'Amount must be greater than zero' }
  }

  const { data, error } = await db
    .from('marketing_spend_log')
    .insert({
      chef_id: user.entityId,
      amount_cents: input.amount_cents,
      channel: input.channel,
      description: input.description?.trim() || null,
      spend_date: input.spend_date,
    })
    .select()
    .single()

  if (error) {
    if (error.code === '42P01') {
      return {
        data: null,
        error: 'Marketing spend tracking is not set up yet. Apply the migration first.',
      }
    }
    console.error('[logMarketingSpend]', error)
    return { data: null, error: 'Failed to log marketing spend' }
  }

  revalidatePath('/analytics')
  revalidatePath('/analytics/marketing/spend')
  return { data: data as MarketingSpendEntry, error: null }
}

export async function deleteMarketingSpend(id: string): Promise<{ error: string | null }> {
  const user = await requireChef()
  const db: any = createServerClient()

  const { error } = await db
    .from('marketing_spend_log')
    .delete()
    .eq('id', id)
    .eq('chef_id', user.entityId)

  if (error) {
    console.error('[deleteMarketingSpend]', error)
    return { error: 'Failed to delete entry' }
  }

  revalidatePath('/analytics')
  revalidatePath('/analytics/marketing/spend')
  return { error: null }
}
