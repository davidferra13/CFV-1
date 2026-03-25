'use server'

import { createServerClient } from '@/lib/db/server'
import { requireChef } from '@/lib/auth/get-user'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

// ============================================
// SCHEMAS
// ============================================

const AddCompSchema = z.object({
  guest_id: z.string().uuid(),
  description: z.string().min(1, 'Description is required'),
  created_by: z.string().optional(),
})

export type AddCompInput = z.infer<typeof AddCompSchema>

// ============================================
// COMP MANAGEMENT
// ============================================

export async function addComp(input: AddCompInput) {
  const user = await requireChef()
  const db: any = createServerClient()
  const data = AddCompSchema.parse(input)

  const { data: comp, error } = await db
    .from('guest_comps')
    .insert({
      guest_id: data.guest_id,
      description: data.description,
      created_by: data.created_by || null,
      chef_id: user.tenantId!,
    })
    .select()
    .single()

  if (error) {
    console.error('[comps] addComp error:', error)
    throw new Error('Failed to add comp')
  }

  revalidatePath('/guests')
  revalidatePath(`/guests/${data.guest_id}`)
  return comp
}

export async function redeemComp(compId: string, redeemedBy?: string) {
  const user = await requireChef()
  const db: any = createServerClient()

  const { data: comp, error } = await db
    .from('guest_comps')
    .update({
      redeemed_at: new Date().toISOString(),
      redeemed_by: redeemedBy || null,
    })
    .eq('id', compId)
    .eq('chef_id', user.tenantId!)
    .select('guest_id')
    .single()

  if (error) {
    console.error('[comps] redeemComp error:', error)
    throw new Error('Failed to redeem comp')
  }

  revalidatePath('/guests')
  if (comp?.guest_id) {
    revalidatePath(`/guests/${comp.guest_id}`)
  }
}

export async function listActiveComps(guestId?: string) {
  const user = await requireChef()
  const db: any = createServerClient()

  let q = db
    .from('guest_comps')
    .select('*, guests(name)')
    .eq('chef_id', user.tenantId!)
    .is('redeemed_at', null)
    .order('created_at', { ascending: false })

  if (guestId) {
    q = q.eq('guest_id', guestId)
  }

  const { data, error } = await q

  if (error) {
    console.error('[comps] listActiveComps error:', error)
    throw new Error('Failed to list active comps')
  }

  return data ?? []
}

export async function listAllComps(guestId: string) {
  const user = await requireChef()
  const db: any = createServerClient()

  const { data, error } = await db
    .from('guest_comps')
    .select('*')
    .eq('guest_id', guestId)
    .eq('chef_id', user.tenantId!)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('[comps] listAllComps error:', error)
    throw new Error('Failed to list comps')
  }

  return data ?? []
}
