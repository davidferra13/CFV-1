'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

const CreatePayoutSchema = z.object({
  partner_id: z.string().uuid(),
  amount_cents: z.number().int().min(1),
  paid_on: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  method: z
    .enum(['check', 'venmo', 'zelle', 'bank_transfer', 'cash', 'paypal', 'other'])
    .default('other'),
  reference: z.string().optional(),
  notes: z.string().optional(),
})

export type CreatePayoutInput = z.infer<typeof CreatePayoutSchema>

export interface PartnerPayout {
  id: string
  partner_id: string
  amount_cents: number
  paid_on: string
  method: string
  reference: string | null
  notes: string | null
  created_at: string
}

export async function recordPartnerPayout(input: CreatePayoutInput): Promise<PartnerPayout> {
  const user = await requireChef()
  const parsed = CreatePayoutSchema.parse(input)
  const db: any = createServerClient()

  const { data, error } = await db
    .from('partner_payouts')
    .insert({ ...parsed, tenant_id: user.tenantId! })
    .select()
    .single()

  if (error) {
    console.error('[recordPartnerPayout] Error:', error)
    throw new Error('Failed to record payout')
  }

  revalidatePath(`/partners/${parsed.partner_id}`)
  return data as PartnerPayout
}

export async function getPartnerPayouts(partnerId: string): Promise<PartnerPayout[]> {
  const user = await requireChef()
  const db: any = createServerClient()

  const { data, error } = await db
    .from('partner_payouts')
    .select('*')
    .eq('tenant_id', user.tenantId!)
    .eq('partner_id', partnerId)
    .order('paid_on', { ascending: false })

  if (error) {
    console.error('[getPartnerPayouts] Error:', error)
    throw new Error('Failed to fetch payouts')
  }

  return (data ?? []) as PartnerPayout[]
}

export async function deletePartnerPayout(payoutId: string, partnerId: string): Promise<void> {
  const user = await requireChef()
  const db: any = createServerClient()

  const { error } = await db
    .from('partner_payouts')
    .delete()
    .eq('id', payoutId)
    .eq('tenant_id', user.tenantId!)

  if (error) {
    console.error('[deletePartnerPayout] Error:', error)
    throw new Error('Failed to delete payout')
  }

  revalidatePath(`/partners/${partnerId}`)
}
