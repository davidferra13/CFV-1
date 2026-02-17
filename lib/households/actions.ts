// Household Server Actions
// CRUD for households and household members -- chef-only

'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

// ============================================
// TYPES
// ============================================

export type HouseholdRelationship = 'partner' | 'child' | 'family_member' | 'regular_guest'

export interface Household {
  id: string
  tenant_id: string
  name: string
  primary_client_id: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export interface HouseholdMember {
  id: string
  household_id: string
  client_id: string
  relationship: HouseholdRelationship
  joined_at: string
  // Joined from clients table
  client_name?: string
  client_email?: string
}

export interface HouseholdWithMembers extends Household {
  members: HouseholdMember[]
  primary_client_name?: string
}

// ============================================
// VALIDATION SCHEMAS
// ============================================

const CreateHouseholdSchema = z.object({
  name: z.string().min(1).max(200),
  primary_client_id: z.string().uuid().optional(),
  notes: z.string().max(2000).optional(),
})

const UpdateHouseholdSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  primary_client_id: z.string().uuid().nullable().optional(),
  notes: z.string().max(2000).nullable().optional(),
})

const AddMemberSchema = z.object({
  household_id: z.string().uuid(),
  client_id: z.string().uuid(),
  relationship: z.enum(['partner', 'child', 'family_member', 'regular_guest']),
})

// ============================================
// HOUSEHOLD CRUD
// ============================================

/**
 * Create a new household.
 */
export async function createHousehold(input: z.infer<typeof CreateHouseholdSchema>) {
  const user = await requireChef()
  const validated = CreateHouseholdSchema.parse(input)
  const supabase = createServerClient()

  const { data, error } = await supabase
    .from('households')
    .insert({
      tenant_id: user.tenantId!,
      name: validated.name,
      primary_client_id: validated.primary_client_id || null,
      notes: validated.notes || null,
    })
    .select()
    .single()

  if (error) {
    console.error('[createHousehold] Error:', error)
    throw new Error('Failed to create household')
  }

  revalidatePath('/households')
  return { household: data as Household }
}

/**
 * Update an existing household.
 */
export async function updateHousehold(
  householdId: string,
  input: z.infer<typeof UpdateHouseholdSchema>
) {
  const user = await requireChef()
  const validated = UpdateHouseholdSchema.parse(input)
  const supabase = createServerClient()

  const updates: Record<string, unknown> = {}
  if (validated.name !== undefined) updates.name = validated.name
  if (validated.primary_client_id !== undefined) updates.primary_client_id = validated.primary_client_id
  if (validated.notes !== undefined) updates.notes = validated.notes

  const { data, error } = await supabase
    .from('households')
    .update(updates)
    .eq('id', householdId)
    .eq('tenant_id', user.tenantId!)
    .select()
    .single()

  if (error) {
    console.error('[updateHousehold] Error:', error)
    throw new Error('Failed to update household')
  }

  revalidatePath('/households')
  revalidatePath(`/households/${householdId}`)
  return { household: data as Household }
}

/**
 * Delete a household.
 * Members are cascade-deleted by FK.
 */
export async function deleteHousehold(householdId: string) {
  const user = await requireChef()
  const supabase = createServerClient()

  const { error } = await supabase
    .from('households')
    .delete()
    .eq('id', householdId)
    .eq('tenant_id', user.tenantId!)

  if (error) {
    console.error('[deleteHousehold] Error:', error)
    throw new Error('Failed to delete household')
  }

  revalidatePath('/households')
  return { success: true as const }
}

/**
 * Get all households for the current chef.
 */
export async function getHouseholds(): Promise<HouseholdWithMembers[]> {
  const user = await requireChef()
  const supabase = createServerClient()

  const { data: households, error } = await supabase
    .from('households')
    .select('*')
    .eq('tenant_id', user.tenantId!)
    .order('name', { ascending: true })

  if (error) {
    console.error('[getHouseholds] Error:', error)
    return []
  }

  if (!households || households.length === 0) return []

  // Get all members for all households in one query
  const householdIds = households.map((h) => h.id)
  const { data: members } = await supabase
    .from('household_members')
    .select('*')
    .in('household_id', householdIds)

  // Get client names for members and primary clients
  const clientIds = new Set<string>()
  for (const m of members || []) clientIds.add(m.client_id)
  for (const h of households) if (h.primary_client_id) clientIds.add(h.primary_client_id)

  let clientMap: Record<string, { full_name: string; email: string }> = {}
  if (clientIds.size > 0) {
    const { data: clients } = await supabase
      .from('clients')
      .select('id, full_name, email')
      .in('id', Array.from(clientIds))

    for (const c of clients || []) {
      clientMap[c.id] = { full_name: c.full_name, email: c.email }
    }
  }

  // Assemble
  return households.map((h) => ({
    ...h,
    primary_client_name: h.primary_client_id ? clientMap[h.primary_client_id]?.full_name : undefined,
    members: (members || [])
      .filter((m) => m.household_id === h.id)
      .map((m) => ({
        ...m,
        client_name: clientMap[m.client_id]?.full_name,
        client_email: clientMap[m.client_id]?.email,
      })),
  })) as HouseholdWithMembers[]
}

/**
 * Get a single household with members.
 */
export async function getHousehold(householdId: string): Promise<HouseholdWithMembers | null> {
  const user = await requireChef()
  const supabase = createServerClient()

  const { data: household, error } = await supabase
    .from('households')
    .select('*')
    .eq('id', householdId)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (error || !household) return null

  const { data: members } = await supabase
    .from('household_members')
    .select('*')
    .eq('household_id', householdId)

  // Get client info
  const clientIds = new Set<string>()
  for (const m of members || []) clientIds.add(m.client_id)
  if (household.primary_client_id) clientIds.add(household.primary_client_id)

  let clientMap: Record<string, { full_name: string; email: string }> = {}
  if (clientIds.size > 0) {
    const { data: clients } = await supabase
      .from('clients')
      .select('id, full_name, email')
      .in('id', Array.from(clientIds))

    for (const c of clients || []) {
      clientMap[c.id] = { full_name: c.full_name, email: c.email }
    }
  }

  return {
    ...household,
    primary_client_name: household.primary_client_id
      ? clientMap[household.primary_client_id]?.full_name
      : undefined,
    members: (members || []).map((m) => ({
      ...m,
      client_name: clientMap[m.client_id]?.full_name,
      client_email: clientMap[m.client_id]?.email,
    })),
  } as HouseholdWithMembers
}

/**
 * Get the household a client belongs to (if any).
 */
export async function getClientHousehold(clientId: string): Promise<HouseholdWithMembers | null> {
  const user = await requireChef()
  const supabase = createServerClient()

  // Check if client is a member of any household
  const { data: membership } = await supabase
    .from('household_members')
    .select('household_id')
    .eq('client_id', clientId)
    .limit(1)
    .single()

  if (!membership) {
    // Also check if client is the primary of a household
    const { data: primaryOf } = await supabase
      .from('households')
      .select('id')
      .eq('primary_client_id', clientId)
      .eq('tenant_id', user.tenantId!)
      .limit(1)
      .single()

    if (!primaryOf) return null
    return getHousehold(primaryOf.id)
  }

  return getHousehold(membership.household_id)
}

// ============================================
// MEMBER MANAGEMENT
// ============================================

/**
 * Add a client to a household.
 */
export async function addHouseholdMember(input: z.infer<typeof AddMemberSchema>) {
  const user = await requireChef()
  const validated = AddMemberSchema.parse(input)
  const supabase = createServerClient()

  // Verify household belongs to chef
  const { data: household } = await supabase
    .from('households')
    .select('id')
    .eq('id', validated.household_id)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (!household) {
    throw new Error('Household not found')
  }

  // Verify client belongs to chef
  const { data: client } = await supabase
    .from('clients')
    .select('id')
    .eq('id', validated.client_id)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (!client) {
    throw new Error('Client not found')
  }

  const { data, error } = await supabase
    .from('household_members')
    .insert({
      household_id: validated.household_id,
      client_id: validated.client_id,
      relationship: validated.relationship,
    })
    .select()
    .single()

  if (error) {
    if (error.code === '23505') {
      throw new Error('Client is already a member of this household')
    }
    console.error('[addHouseholdMember] Error:', error)
    throw new Error('Failed to add member')
  }

  revalidatePath(`/households/${validated.household_id}`)
  revalidatePath(`/clients/${validated.client_id}`)
  return { member: data as HouseholdMember }
}

/**
 * Remove a member from a household.
 */
export async function removeHouseholdMember(memberId: string) {
  const user = await requireChef()
  const supabase = createServerClient()

  // Get member to find household for revalidation
  const { data: member } = await supabase
    .from('household_members')
    .select('household_id, client_id')
    .eq('id', memberId)
    .single()

  if (!member) {
    throw new Error('Member not found')
  }

  // Verify household belongs to chef
  const { data: household } = await supabase
    .from('households')
    .select('id')
    .eq('id', member.household_id)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (!household) {
    throw new Error('Household not found')
  }

  const { error } = await supabase
    .from('household_members')
    .delete()
    .eq('id', memberId)

  if (error) {
    console.error('[removeHouseholdMember] Error:', error)
    throw new Error('Failed to remove member')
  }

  revalidatePath(`/households/${member.household_id}`)
  revalidatePath(`/clients/${member.client_id}`)
  return { success: true as const }
}

/**
 * Update a member's relationship type.
 */
export async function updateMemberRelationship(
  memberId: string,
  relationship: HouseholdRelationship
) {
  const user = await requireChef()
  const supabase = createServerClient()

  // Get member and verify via household
  const { data: member } = await supabase
    .from('household_members')
    .select('household_id')
    .eq('id', memberId)
    .single()

  if (!member) throw new Error('Member not found')

  const { data: household } = await supabase
    .from('households')
    .select('id')
    .eq('id', member.household_id)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (!household) throw new Error('Household not found')

  const { error } = await supabase
    .from('household_members')
    .update({ relationship })
    .eq('id', memberId)

  if (error) {
    console.error('[updateMemberRelationship] Error:', error)
    throw new Error('Failed to update relationship')
  }

  revalidatePath(`/households/${member.household_id}`)
  return { success: true as const }
}

/**
 * Link an event to a household.
 */
export async function linkEventToHousehold(
  eventId: string,
  householdId: string | null
) {
  const user = await requireChef()
  const supabase = createServerClient()

  // Verify event belongs to chef
  const { data: event } = await supabase
    .from('events')
    .select('id')
    .eq('id', eventId)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (!event) throw new Error('Event not found')

  // If linking (not unlinking), verify household belongs to chef
  if (householdId) {
    const { data: household } = await supabase
      .from('households')
      .select('id')
      .eq('id', householdId)
      .eq('tenant_id', user.tenantId!)
      .single()

    if (!household) throw new Error('Household not found')
  }

  const { error } = await supabase
    .from('events')
    .update({ household_id: householdId })
    .eq('id', eventId)
    .eq('tenant_id', user.tenantId!)

  if (error) {
    console.error('[linkEventToHousehold] Error:', error)
    throw new Error('Failed to link event to household')
  }

  revalidatePath(`/events/${eventId}`)
  return { success: true as const }
}
