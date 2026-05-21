'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { requireClient, requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'

// ---------------------------------------------------------------------------
// Shared helpers (inline to keep this file self-contained)
// ---------------------------------------------------------------------------

async function getCallerProfile(db: any, userId: string, entityId: string): Promise<string> {
  const { data: profile } = await db
    .from('hub_guest_profiles')
    .select('id')
    .or(`auth_user_id.eq.${userId},client_id.eq.${entityId}`)
    .maybeSingle()
  if (!profile) throw new Error('Hub profile not found')
  return profile.id as string
}

async function assertMembership(
  db: any,
  circleId: string,
  profileId: string
): Promise<{ role: string }> {
  const { data: member } = await db
    .from('hub_group_members')
    .select('role')
    .eq('group_id', circleId)
    .eq('profile_id', profileId)
    .maybeSingle()
  if (!member) throw new Error('You are not a member of this circle')
  return member as { role: string }
}

async function getCircleTenantId(db: any, circleId: string): Promise<string> {
  const { data: circle } = await db
    .from('hub_groups')
    .select('tenant_id')
    .eq('id', circleId)
    .maybeSingle()
  if (!circle) throw new Error('Circle not found')
  if (!circle.tenant_id) throw new Error('Circle missing tenant context')
  return circle.tenant_id as string
}

// ---------------------------------------------------------------------------
// Schemas
// ---------------------------------------------------------------------------

const CreateItemSchema = z.object({
  circleId: z.string().uuid(),
  itemName: z.string().min(1).max(200),
  itemNotes: z.string().max(1000).optional(),
  imageUrl: z.string().url().optional(),
  required: z.boolean().optional().default(false),
  quantity: z.string().max(100).optional(),
  category: z.enum(['drinks', 'snacks', 'supplies', 'food', 'other']).optional(),
})

const ClaimItemSchema = z.object({
  circleId: z.string().uuid(),
  itemId: z.string().uuid(),
})

const UnclaimItemSchema = z.object({
  circleId: z.string().uuid(),
  itemId: z.string().uuid(),
})

const MarkBroughtSchema = z.object({
  circleId: z.string().uuid(),
  itemId: z.string().uuid(),
})

const AddNoteSchema = z.object({
  circleId: z.string().uuid(),
  itemId: z.string().uuid(),
  note: z.string().max(1000),
})

const SetReminderSchema = z.object({
  circleId: z.string().uuid(),
  itemId: z.string().uuid(),
  reminderAt: z.string().datetime(),
})

const GetListSchema = z.object({
  circleId: z.string().uuid(),
})

const DeleteItemSchema = z.object({
  circleId: z.string().uuid(),
  itemId: z.string().uuid(),
})

// ---------------------------------------------------------------------------
// Actions
// ---------------------------------------------------------------------------

/** Create a new bring item. Host/co_host and members with can_post may create. */
export async function createBringItem(input: z.infer<typeof CreateItemSchema>) {
  const user = await requireClient()
  const validated = CreateItemSchema.parse(input)
  const db: any = createServerClient()

  const tenantId = await getCircleTenantId(db, validated.circleId)
  const profileId = await getCallerProfile(db, user.id, user.entityId)
  const membership = await assertMembership(db, validated.circleId, profileId)

  // Fetch can_post flag
  const { data: memberRow } = await db
    .from('hub_group_members')
    .select('can_post')
    .eq('group_id', validated.circleId)
    .eq('profile_id', profileId)
    .maybeSingle()

  const isHost = ['owner', 'host', 'co_host'].includes(membership.role)
  if (!isHost && !memberRow?.can_post) {
    throw new Error('You do not have permission to add items to this list')
  }

  const { data, error } = await db
    .from('dinner_circle_bring_items')
    .insert({
      circle_id: validated.circleId,
      item_name: validated.itemName,
      item_notes: validated.itemNotes ?? null,
      image_url: validated.imageUrl ?? null,
      required: validated.required,
      quantity: validated.quantity ?? null,
      category: validated.category ?? null,
      created_by: profileId,
      tenant_id: tenantId,
    })
    .select('id')
    .single()

  if (error) throw new Error(`Failed to create item: ${error.message}`)

  revalidatePath(`/my-hub/g`)
  return { success: true, itemId: data.id }
}

/** Claim an unclaimed bring item. */
export async function claimBringItem(input: z.infer<typeof ClaimItemSchema>) {
  const user = await requireClient()
  const validated = ClaimItemSchema.parse(input)
  const db: any = createServerClient()

  const tenantId = await getCircleTenantId(db, validated.circleId)
  const profileId = await getCallerProfile(db, user.id, user.entityId)
  await assertMembership(db, validated.circleId, profileId)

  const { data: item } = await db
    .from('dinner_circle_bring_items')
    .select('id, item_name, claimed_by')
    .eq('id', validated.itemId)
    .eq('circle_id', validated.circleId)
    .eq('tenant_id', tenantId)
    .maybeSingle()

  if (!item) throw new Error('Item not found')
  if (item.claimed_by) throw new Error('This item is already claimed')

  const { error } = await db
    .from('dinner_circle_bring_items')
    .update({
      claimed_by: profileId,
      claimed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', validated.itemId)
    .eq('circle_id', validated.circleId)
    .eq('tenant_id', tenantId)

  if (error) throw new Error(`Failed to claim item: ${error.message}`)

  revalidatePath(`/my-hub/g`)
  return { success: true }
}

/** Unclaim a bring item that the caller previously claimed. */
export async function unclaimBringItem(input: z.infer<typeof UnclaimItemSchema>) {
  const user = await requireClient()
  const validated = UnclaimItemSchema.parse(input)
  const db: any = createServerClient()

  const tenantId = await getCircleTenantId(db, validated.circleId)
  const profileId = await getCallerProfile(db, user.id, user.entityId)
  await assertMembership(db, validated.circleId, profileId)

  const { data: item } = await db
    .from('dinner_circle_bring_items')
    .select('id, claimed_by, brought_at')
    .eq('id', validated.itemId)
    .eq('circle_id', validated.circleId)
    .eq('tenant_id', tenantId)
    .maybeSingle()

  if (!item) throw new Error('Item not found')
  if (item.claimed_by !== profileId) throw new Error('You did not claim this item')
  if (item.brought_at) throw new Error('Cannot unclaim after marking as brought')

  const { error } = await db
    .from('dinner_circle_bring_items')
    .update({ claimed_by: null, claimed_at: null, updated_at: new Date().toISOString() })
    .eq('id', validated.itemId)
    .eq('circle_id', validated.circleId)
    .eq('tenant_id', tenantId)

  if (error) throw new Error(`Failed to unclaim item: ${error.message}`)

  revalidatePath(`/my-hub/g`)
  return { success: true }
}

/** Mark a bring item as brought. Only the claimant can do this. */
export async function markBrought(input: z.infer<typeof MarkBroughtSchema>) {
  const user = await requireClient()
  const validated = MarkBroughtSchema.parse(input)
  const db: any = createServerClient()

  const tenantId = await getCircleTenantId(db, validated.circleId)
  const profileId = await getCallerProfile(db, user.id, user.entityId)
  await assertMembership(db, validated.circleId, profileId)

  const { data: item } = await db
    .from('dinner_circle_bring_items')
    .select('id, claimed_by')
    .eq('id', validated.itemId)
    .eq('circle_id', validated.circleId)
    .eq('tenant_id', tenantId)
    .maybeSingle()

  if (!item) throw new Error('Item not found')
  if (item.claimed_by !== profileId)
    throw new Error('You must claim an item before marking it brought')

  const { error } = await db
    .from('dinner_circle_bring_items')
    .update({
      brought_at: new Date().toISOString(),
      is_fulfilled: true,
      updated_at: new Date().toISOString(),
    })
    .eq('id', validated.itemId)
    .eq('circle_id', validated.circleId)
    .eq('tenant_id', tenantId)

  if (error) throw new Error(`Failed to mark as brought: ${error.message}`)

  revalidatePath(`/my-hub/g`)
  return { success: true }
}

/** Add a note to a bring item (creator or host can add notes). */
export async function addBringItemNote(input: z.infer<typeof AddNoteSchema>) {
  const user = await requireClient()
  const validated = AddNoteSchema.parse(input)
  const db: any = createServerClient()

  const tenantId = await getCircleTenantId(db, validated.circleId)
  const profileId = await getCallerProfile(db, user.id, user.entityId)
  const membership = await assertMembership(db, validated.circleId, profileId)

  const { data: item } = await db
    .from('dinner_circle_bring_items')
    .select('id, created_by')
    .eq('id', validated.itemId)
    .eq('circle_id', validated.circleId)
    .eq('tenant_id', tenantId)
    .maybeSingle()

  if (!item) throw new Error('Item not found')

  const isHost = ['owner', 'host', 'co_host'].includes(membership.role)
  if (item.created_by !== profileId && !isHost) {
    throw new Error('Only the item creator or a host can add notes')
  }

  const { error } = await db
    .from('dinner_circle_bring_items')
    .update({ item_notes: validated.note, updated_at: new Date().toISOString() })
    .eq('id', validated.itemId)
    .eq('circle_id', validated.circleId)
    .eq('tenant_id', tenantId)

  if (error) throw new Error(`Failed to add note: ${error.message}`)

  revalidatePath(`/my-hub/g`)
  return { success: true }
}

/** Set a reminder on a bring item. Only the claimant can set a reminder. */
export async function setBringItemReminder(input: z.infer<typeof SetReminderSchema>) {
  const user = await requireClient()
  const validated = SetReminderSchema.parse(input)
  const db: any = createServerClient()

  const tenantId = await getCircleTenantId(db, validated.circleId)
  const profileId = await getCallerProfile(db, user.id, user.entityId)
  await assertMembership(db, validated.circleId, profileId)

  const { data: item } = await db
    .from('dinner_circle_bring_items')
    .select('id, claimed_by')
    .eq('id', validated.itemId)
    .eq('circle_id', validated.circleId)
    .eq('tenant_id', tenantId)
    .maybeSingle()

  if (!item) throw new Error('Item not found')
  if (item.claimed_by !== profileId) throw new Error('Only the claimant can set a reminder')

  const { error } = await db
    .from('dinner_circle_bring_items')
    .update({ reminder_at: validated.reminderAt, updated_at: new Date().toISOString() })
    .eq('id', validated.itemId)
    .eq('circle_id', validated.circleId)
    .eq('tenant_id', tenantId)

  if (error) throw new Error(`Failed to set reminder: ${error.message}`)

  revalidatePath(`/my-hub/g`)
  return { success: true }
}

/** Get the bring list for a circle. */
export async function getBringList(input: z.infer<typeof GetListSchema>) {
  const user = await requireClient()
  const validated = GetListSchema.parse(input)
  const db: any = createServerClient()

  const tenantId = await getCircleTenantId(db, validated.circleId)
  const profileId = await getCallerProfile(db, user.id, user.entityId)
  await assertMembership(db, validated.circleId, profileId)

  const { data, error } = await db
    .from('dinner_circle_bring_items')
    .select('*')
    .eq('circle_id', validated.circleId)
    .eq('tenant_id', tenantId)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true })

  if (error) throw new Error(`Failed to fetch bring list: ${error.message}`)

  return { success: true, items: data ?? [] }
}

/** Delete a bring item (creator or host only). Cannot delete if fulfilled. */
export async function deleteBringItem(input: z.infer<typeof DeleteItemSchema>) {
  const user = await requireClient()
  const validated = DeleteItemSchema.parse(input)
  const db: any = createServerClient()

  const tenantId = await getCircleTenantId(db, validated.circleId)
  const profileId = await getCallerProfile(db, user.id, user.entityId)
  const membership = await assertMembership(db, validated.circleId, profileId)

  const { data: item } = await db
    .from('dinner_circle_bring_items')
    .select('id, created_by, is_fulfilled')
    .eq('id', validated.itemId)
    .eq('circle_id', validated.circleId)
    .eq('tenant_id', tenantId)
    .maybeSingle()

  if (!item) throw new Error('Item not found')
  if (item.is_fulfilled) throw new Error('Cannot delete a fulfilled item')

  const isHost = ['owner', 'host', 'co_host'].includes(membership.role)
  if (item.created_by !== profileId && !isHost) {
    throw new Error('Only the item creator or a host can delete this item')
  }

  const { error } = await db
    .from('dinner_circle_bring_items')
    .delete()
    .eq('id', validated.itemId)
    .eq('circle_id', validated.circleId)
    .eq('tenant_id', tenantId)

  if (error) throw new Error(`Failed to delete item: ${error.message}`)

  revalidatePath(`/my-hub/g`)
  return { success: true }
}
