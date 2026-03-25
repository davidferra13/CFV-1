'use server'

import { createServerClient } from '@/lib/db/server'
import { requireChef } from '@/lib/auth/get-user'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

// ============================================
// SCHEMAS
// ============================================

const AddTagSchema = z.object({
  guest_id: z.string().uuid(),
  tag: z.string().min(1, 'Tag is required'),
  color: z.string().optional(),
})

export type AddTagInput = z.infer<typeof AddTagSchema>

// ============================================
// TAG MANAGEMENT
// ============================================

export async function addTag(guestId: string, tag: string, color?: string) {
  const user = await requireChef()
  const db: any = createServerClient()

  const validated = AddTagSchema.parse({ guest_id: guestId, tag, color })

  // Check if tag already exists for this guest
  const { data: existing } = await db
    .from('guest_tags')
    .select('id')
    .eq('guest_id', validated.guest_id)
    .eq('tag', validated.tag)
    .eq('chef_id', user.tenantId!)
    .maybeSingle()

  if (existing) {
    return // Tag already exists, no-op
  }

  const { error } = await db.from('guest_tags').insert({
    guest_id: validated.guest_id,
    tag: validated.tag,
    color: validated.color || null,
    chef_id: user.tenantId!,
  })

  if (error) {
    console.error('[tags] addTag error:', error)
    throw new Error('Failed to add tag')
  }

  revalidatePath('/guests')
  revalidatePath(`/guests/${guestId}`)
}

export async function removeTag(guestId: string, tag: string) {
  const user = await requireChef()
  const db: any = createServerClient()

  const { error } = await db
    .from('guest_tags')
    .delete()
    .eq('guest_id', guestId)
    .eq('tag', tag)
    .eq('chef_id', user.tenantId!)

  if (error) {
    console.error('[tags] removeTag error:', error)
    throw new Error('Failed to remove tag')
  }

  revalidatePath('/guests')
  revalidatePath(`/guests/${guestId}`)
}

export async function listTags(guestId: string) {
  const user = await requireChef()
  const db: any = createServerClient()

  const { data, error } = await db
    .from('guest_tags')
    .select('*')
    .eq('guest_id', guestId)
    .eq('chef_id', user.tenantId!)
    .order('tag', { ascending: true })

  if (error) {
    console.error('[tags] listTags error:', error)
    throw new Error('Failed to list tags')
  }

  return data ?? []
}
