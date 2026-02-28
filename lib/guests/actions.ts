'use server'

import { createServerClient } from '@/lib/supabase/server'
import { requireChef } from '@/lib/auth/get-user'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

// ============================================
// SCHEMAS
// ============================================

const CreateGuestSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  notes: z.string().optional(),
})

export type CreateGuestInput = z.infer<typeof CreateGuestSchema>

const UpdateGuestSchema = CreateGuestSchema.partial()
export type UpdateGuestInput = z.infer<typeof UpdateGuestSchema>

// ============================================
// GUEST CRUD
// ============================================

export async function createGuest(input: CreateGuestInput) {
  const user = await requireChef()
  const supabase: any = createServerClient()
  const data = CreateGuestSchema.parse(input)

  const { data: guest, error } = await supabase
    .from('guests')
    .insert({
      name: data.name,
      phone: data.phone || null,
      email: data.email || null,
      notes: data.notes || null,
      chef_id: user.tenantId!,
    })
    .select()
    .single()

  if (error) {
    console.error('[guests] createGuest error:', error)
    throw new Error('Failed to create guest')
  }

  revalidatePath('/guests')
  return guest
}

export async function updateGuest(id: string, input: UpdateGuestInput) {
  const user = await requireChef()
  const supabase: any = createServerClient()
  const data = UpdateGuestSchema.parse(input)

  const updateData: Record<string, unknown> = {}
  if (data.name !== undefined) updateData.name = data.name
  if (data.phone !== undefined) updateData.phone = data.phone || null
  if (data.email !== undefined) updateData.email = data.email || null
  if (data.notes !== undefined) updateData.notes = data.notes || null
  updateData.updated_at = new Date().toISOString()

  const { error } = await supabase
    .from('guests')
    .update(updateData)
    .eq('id', id)
    .eq('chef_id', user.tenantId!)

  if (error) {
    console.error('[guests] updateGuest error:', error)
    throw new Error('Failed to update guest')
  }

  revalidatePath('/guests')
  revalidatePath(`/guests/${id}`)
}

export async function deleteGuest(id: string) {
  const user = await requireChef()
  const supabase: any = createServerClient()

  const { error } = await supabase
    .from('guests')
    .delete()
    .eq('id', id)
    .eq('chef_id', user.tenantId!)

  if (error) {
    console.error('[guests] deleteGuest error:', error)
    throw new Error('Failed to delete guest')
  }

  revalidatePath('/guests')
}

export async function listGuests(search?: string) {
  const user = await requireChef()
  const supabase: any = createServerClient()

  let q = supabase
    .from('guests')
    .select('*, guest_tags(tag, color), guest_comps(id, description, redeemed_at)')
    .eq('chef_id', user.tenantId!)
    .order('name', { ascending: true })

  if (search && search.trim()) {
    q = q.or(`name.ilike.%${search.trim()}%,phone.ilike.%${search.trim()}%`)
  }

  const { data, error } = await q

  if (error) {
    console.error('[guests] listGuests error:', error)
    throw new Error('Failed to list guests')
  }

  return data ?? []
}

export async function getGuest(id: string) {
  const user = await requireChef()
  const supabase: any = createServerClient()

  const { data: guest, error } = await supabase
    .from('guests')
    .select('*')
    .eq('id', id)
    .eq('chef_id', user.tenantId!)
    .single()

  if (error) {
    console.error('[guests] getGuest error:', error)
    throw new Error('Guest not found')
  }

  // Fetch tags
  const { data: tags } = await supabase
    .from('guest_tags')
    .select('*')
    .eq('guest_id', id)
    .eq('chef_id', user.tenantId!)
    .order('tag', { ascending: true })

  // Fetch active comps
  const { data: comps } = await supabase
    .from('guest_comps')
    .select('*')
    .eq('guest_id', id)
    .eq('chef_id', user.tenantId!)
    .order('created_at', { ascending: false })

  // Fetch recent visits
  const { data: visits } = await supabase
    .from('guest_visits')
    .select('*')
    .eq('guest_id', id)
    .eq('chef_id', user.tenantId!)
    .order('visit_date', { ascending: false })
    .limit(20)

  // Fetch reservations
  const { data: reservations } = await supabase
    .from('guest_reservations')
    .select('*')
    .eq('guest_id', id)
    .eq('chef_id', user.tenantId!)
    .order('reservation_date', { ascending: false })
    .limit(20)

  // Compute stats
  const allVisits = visits ?? []
  const totalVisits = allVisits.length
  const totalSpendCents = allVisits.reduce((sum: number, v: any) => sum + (v.spend_cents || 0), 0)
  const avgSpendCents = totalVisits > 0 ? Math.round(totalSpendCents / totalVisits) : 0
  const firstVisit = allVisits.length > 0 ? allVisits[allVisits.length - 1]?.visit_date : null
  const lastVisit = allVisits.length > 0 ? allVisits[0]?.visit_date : null

  return {
    ...guest,
    tags: tags ?? [],
    comps: comps ?? [],
    visits: allVisits,
    reservations: reservations ?? [],
    stats: {
      totalVisits,
      totalSpendCents,
      avgSpendCents,
      firstVisit,
      lastVisit,
    },
  }
}

export async function searchGuests(query: string) {
  const user = await requireChef()
  const supabase: any = createServerClient()

  if (!query.trim()) return []

  const { data, error } = await supabase
    .from('guests')
    .select('id, name, phone, email, guest_tags(tag, color), guest_comps(id, redeemed_at)')
    .eq('chef_id', user.tenantId!)
    .or(`name.ilike.%${query.trim()}%,phone.ilike.%${query.trim()}%`)
    .order('name', { ascending: true })
    .limit(10)

  if (error) {
    console.error('[guests] searchGuests error:', error)
    throw new Error('Failed to search guests')
  }

  return data ?? []
}
