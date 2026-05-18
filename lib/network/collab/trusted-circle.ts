'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { TrustedChefSchema } from './schemas'
import { trustedCircleTable } from './tables'
import { getChefCardsById, getConnectedChefIds } from './helpers'
import type { TrustedCircleMember, TrustLevel } from './types'

export async function getTrustedCircle(): Promise<TrustedCircleMember[]> {
  const user = await requireChef()
  const db = createServerClient({ admin: true })

  const { data } = await trustedCircleTable(db)
    .select('id, trusted_chef_id, trust_level, notes, created_at')
    .eq('chef_id', user.entityId)
    .order('created_at', { ascending: false })

  const trustedRows = (data ?? []) as Array<{
    id: string
    trusted_chef_id: string
    trust_level: TrustLevel
    notes: string | null
    created_at: string
  }>

  if (trustedRows.length === 0) return []
  const chefMap = await getChefCardsById(
    db,
    trustedRows.map((row) => row.trusted_chef_id)
  )

  return trustedRows
    .map((row) => {
      const chef = chefMap.get(row.trusted_chef_id)
      if (!chef) return null
      return {
        id: row.id,
        trust_level: row.trust_level,
        notes: row.notes,
        created_at: row.created_at,
        chef,
      }
    })
    .filter((row): row is TrustedCircleMember => Boolean(row))
}

export async function addTrustedChef(input: z.infer<typeof TrustedChefSchema>) {
  const user = await requireChef()
  const validated = TrustedChefSchema.parse(input)
  const db = createServerClient({ admin: true })

  if (validated.trustedChefId === user.entityId) {
    throw new Error('You cannot add yourself to your trusted circle.')
  }

  const connected = await getConnectedChefIds(db, user.entityId)
  if (!connected.has(validated.trustedChefId)) {
    throw new Error('You can only add accepted connections to your trusted circle.')
  }

  const { error } = await trustedCircleTable(db).upsert(
    {
      chef_id: user.entityId,
      trusted_chef_id: validated.trustedChefId,
      trust_level: validated.trustLevel ?? 'partner',
      notes: validated.notes ?? null,
    },
    { onConflict: 'chef_id,trusted_chef_id' }
  )

  if (error) {
    console.error('[addTrustedChef] Error:', error)
    throw new Error('Failed to update trusted circle.')
  }

  revalidatePath('/network')
  return { success: true }
}

export async function removeTrustedChef(trustedChefId: string) {
  const user = await requireChef()
  z.string().uuid().parse(trustedChefId)
  const db = createServerClient({ admin: true })

  const { error } = await trustedCircleTable(db)
    .delete()
    .eq('chef_id', user.entityId)
    .eq('trusted_chef_id', trustedChefId)

  if (error) {
    console.error('[removeTrustedChef] Error:', error)
    throw new Error('Failed to remove trusted chef.')
  }

  revalidatePath('/network')
  return { success: true }
}
