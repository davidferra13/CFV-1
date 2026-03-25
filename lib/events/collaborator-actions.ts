'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { revalidatePath } from 'next/cache'

export type Collaborator = {
  id: string
  event_id: string
  chef_id: string
  collaborator_chef_id: string | null
  collaborator_name: string
  collaborator_email: string | null
  assigned_station: string | null
  role: 'lead' | 'collaborator' | 'assistant'
  revenue_split_pct: number
  notes: string | null
  status: 'invited' | 'confirmed' | 'declined'
  created_at: string
  updated_at: string
}

export type AddCollaboratorInput = {
  collaborator_chef_id?: string | null
  collaborator_name: string
  collaborator_email?: string | null
  assigned_station?: string | null
  role?: 'lead' | 'collaborator' | 'assistant'
  revenue_split_pct?: number
  notes?: string | null
}

export type UpdateCollaboratorInput = {
  collaborator_name?: string
  collaborator_email?: string | null
  assigned_station?: string | null
  role?: 'lead' | 'collaborator' | 'assistant'
  revenue_split_pct?: number
  notes?: string | null
  status?: 'invited' | 'confirmed' | 'declined'
}

export type CollaboratorSummary = {
  collaborators: Collaborator[]
  totalSplitPct: number
  hostRetainedPct: number
  splits: Array<{
    name: string
    role: string
    pct: number
    amountCents: number
    status: string
  }>
}

export async function getEventCollaborators(eventId: string): Promise<Collaborator[]> {
  const chef = await requireChef()
  const tenantId = chef.tenantId!
  const db: any = createServerClient()

  const { data, error } = await db
    .from('event_collaborators')
    .select('*')
    .eq('event_id', eventId)
    .eq('chef_id', tenantId)
    .order('created_at', { ascending: true })

  if (error) {
    throw new Error('Failed to load collaborators')
  }

  return (data ?? []) as Collaborator[]
}

export async function addCollaborator(
  eventId: string,
  input: AddCollaboratorInput
): Promise<{ success: boolean; error?: string }> {
  const chef = await requireChef()
  const tenantId = chef.tenantId!
  const db: any = createServerClient()

  if (!input.collaborator_name.trim()) {
    return { success: false, error: 'Collaborator name is required' }
  }

  const splitPct = input.revenue_split_pct ?? 0
  if (splitPct < 0 || splitPct > 100) {
    return { success: false, error: 'Revenue split must be between 0 and 100' }
  }

  // Check total split won't exceed 100%
  const { data: existing } = await db
    .from('event_collaborators')
    .select('revenue_split_pct')
    .eq('event_id', eventId)
    .eq('chef_id', tenantId)

  const currentTotal = (existing ?? []).reduce(
    (sum: number, c: { revenue_split_pct: number }) => sum + c.revenue_split_pct,
    0
  )

  if (currentTotal + splitPct > 100) {
    return {
      success: false,
      error: `Total revenue split would be ${currentTotal + splitPct}%. Maximum is 100%.`,
    }
  }

  const { error } = await db.from('event_collaborators').insert({
    event_id: eventId,
    chef_id: tenantId,
    collaborator_chef_id: input.collaborator_chef_id || null,
    collaborator_name: input.collaborator_name.trim(),
    collaborator_email: input.collaborator_email || null,
    assigned_station: input.assigned_station || null,
    role: input.role || 'collaborator',
    revenue_split_pct: splitPct,
    notes: input.notes || null,
  })

  if (error) {
    throw new Error('Failed to add collaborator')
  }

  revalidatePath(`/events/${eventId}`)
  return { success: true }
}

export async function updateCollaborator(
  collaboratorId: string,
  input: UpdateCollaboratorInput
): Promise<{ success: boolean; error?: string }> {
  const chef = await requireChef()
  const tenantId = chef.tenantId!
  const db: any = createServerClient()

  // Verify ownership
  const { data: collab } = await db
    .from('event_collaborators')
    .select('id, event_id, revenue_split_pct')
    .eq('id', collaboratorId)
    .eq('chef_id', tenantId)
    .single()

  if (!collab) {
    return { success: false, error: 'Collaborator not found' }
  }

  // If changing split, validate total
  if (input.revenue_split_pct !== undefined) {
    if (input.revenue_split_pct < 0 || input.revenue_split_pct > 100) {
      return { success: false, error: 'Revenue split must be between 0 and 100' }
    }

    const { data: others } = await db
      .from('event_collaborators')
      .select('revenue_split_pct')
      .eq('event_id', collab.event_id)
      .eq('chef_id', tenantId)
      .neq('id', collaboratorId)

    const othersTotal = (others ?? []).reduce(
      (sum: number, c: { revenue_split_pct: number }) => sum + c.revenue_split_pct,
      0
    )

    if (othersTotal + input.revenue_split_pct > 100) {
      return {
        success: false,
        error: `Total revenue split would be ${othersTotal + input.revenue_split_pct}%. Maximum is 100%.`,
      }
    }
  }

  const updateData: Record<string, unknown> = {}
  if (input.collaborator_name !== undefined) updateData.collaborator_name = input.collaborator_name
  if (input.collaborator_email !== undefined)
    updateData.collaborator_email = input.collaborator_email
  if (input.assigned_station !== undefined) updateData.assigned_station = input.assigned_station
  if (input.role !== undefined) updateData.role = input.role
  if (input.revenue_split_pct !== undefined) updateData.revenue_split_pct = input.revenue_split_pct
  if (input.notes !== undefined) updateData.notes = input.notes
  if (input.status !== undefined) updateData.status = input.status

  const { error } = await db
    .from('event_collaborators')
    .update(updateData)
    .eq('id', collaboratorId)
    .eq('chef_id', tenantId)

  if (error) {
    throw new Error('Failed to update collaborator')
  }

  revalidatePath(`/events/${collab.event_id}`)
  return { success: true }
}

export async function removeCollaborator(
  collaboratorId: string
): Promise<{ success: boolean; error?: string }> {
  const chef = await requireChef()
  const tenantId = chef.tenantId!
  const db: any = createServerClient()

  // Verify ownership and get event_id for revalidation
  const { data: collab } = await db
    .from('event_collaborators')
    .select('id, event_id')
    .eq('id', collaboratorId)
    .eq('chef_id', tenantId)
    .single()

  if (!collab) {
    return { success: false, error: 'Collaborator not found' }
  }

  const { error } = await db
    .from('event_collaborators')
    .delete()
    .eq('id', collaboratorId)
    .eq('chef_id', tenantId)

  if (error) {
    throw new Error('Failed to remove collaborator')
  }

  revalidatePath(`/events/${collab.event_id}`)
  return { success: true }
}

export async function getCollaboratorSummary(
  eventId: string,
  eventTotalCents: number
): Promise<CollaboratorSummary> {
  const collaborators = await getEventCollaborators(eventId)

  const totalSplitPct = collaborators.reduce((sum, c) => sum + c.revenue_split_pct, 0)
  const hostRetainedPct = 100 - totalSplitPct

  const splits = collaborators.map((c) => ({
    name: c.collaborator_name,
    role: c.role,
    pct: c.revenue_split_pct,
    amountCents: Math.round((eventTotalCents * c.revenue_split_pct) / 100),
    status: c.status,
  }))

  return {
    collaborators,
    totalSplitPct,
    hostRetainedPct,
    splits,
  }
}
