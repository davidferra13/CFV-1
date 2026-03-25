// Meal Prep - Container Tracking Server Actions
// Track containers sent to clients (count, type, returned/outstanding).
//
// NOTE: This feature requires database tables that do not yet exist:
//   - meal_prep_containers (container inventory and tracking)
// Functions return stub errors until migrations are applied.

'use server'

import { requirePro } from '@/lib/billing/require-pro'
import { createServerClient } from '@/lib/db/server'
import { revalidatePath } from 'next/cache'

// ============================================
// TYPES
// ============================================

export type ContainerStatus = 'with_client' | 'returned' | 'lost' | 'retired'
export type ContainerType = 'glass' | 'plastic' | 'metal' | 'ceramic' | 'insulated' | 'other'

export interface Container {
  id: string
  chefId: string
  clientId: string | null
  clientName: string | null
  containerType: ContainerType
  label: string // e.g. "Large Glass #3"
  sentDate: string | null
  returnedDate: string | null
  status: ContainerStatus
  notes: string | null
  createdAt: string
}

export interface ContainerSummary {
  totalOwned: number
  withClients: number
  returned: number
  lost: number
  retired: number
  byType: { type: ContainerType; count: number }[]
  outstandingByClient: { clientId: string; clientName: string; count: number }[]
}

// ============================================
// STUB ERROR
// ============================================

const MIGRATION_ERROR = 'Feature requires database migration. Contact support.'

async function checkTableExists(db: any, tableName: string): Promise<boolean> {
  try {
    const { error } = await db.from(tableName).select('id').limit(0)
    return !error || !error.message?.includes('does not exist')
  } catch {
    return false
  }
}

// ============================================
// ACTIONS
// ============================================

/**
 * Register a new container in inventory.
 */
export async function addContainer(input: {
  containerType: ContainerType
  label: string
  notes?: string | null
}): Promise<Container | { error: string }> {
  const user = await requirePro('meal-prep')
  const db: any = createServerClient()

  const tableExists = await checkTableExists(db, 'meal_prep_containers')
  if (!tableExists) return { error: MIGRATION_ERROR }

  const { data, error } = await (db as any)
    .from('meal_prep_containers')
    .insert({
      chef_id: user.tenantId!,
      container_type: input.containerType,
      label: input.label,
      status: 'returned', // starts in inventory (available)
      notes: input.notes ?? null,
    })
    .select()
    .single()

  if (error) {
    console.error('[addContainer] Error:', error)
    return { error: 'Failed to add container' }
  }

  revalidatePath('/meal-prep')
  return mapContainer(data)
}

/**
 * Send a container to a client (mark as checked out).
 */
export async function sendContainerToClient(
  containerId: string,
  clientId: string,
  clientName: string
): Promise<Container | { error: string }> {
  const user = await requirePro('meal-prep')
  const db: any = createServerClient()

  const tableExists = await checkTableExists(db, 'meal_prep_containers')
  if (!tableExists) return { error: MIGRATION_ERROR }

  const { data, error } = await (db as any)
    .from('meal_prep_containers')
    .update({
      client_id: clientId,
      client_name: clientName,
      sent_date: new Date().toISOString().slice(0, 10),
      returned_date: null,
      status: 'with_client',
    })
    .eq('id', containerId)
    .eq('chef_id', user.tenantId!)
    .select()
    .single()

  if (error) {
    console.error('[sendContainerToClient] Error:', error)
    return { error: 'Failed to send container' }
  }

  revalidatePath('/meal-prep')
  return mapContainer(data)
}

/**
 * Mark a container as returned.
 */
export async function markContainerReturned(
  containerId: string
): Promise<Container | { error: string }> {
  const user = await requirePro('meal-prep')
  const db: any = createServerClient()

  const tableExists = await checkTableExists(db, 'meal_prep_containers')
  if (!tableExists) return { error: MIGRATION_ERROR }

  const { data, error } = await (db as any)
    .from('meal_prep_containers')
    .update({
      returned_date: new Date().toISOString().slice(0, 10),
      status: 'returned',
    })
    .eq('id', containerId)
    .eq('chef_id', user.tenantId!)
    .select()
    .single()

  if (error) {
    console.error('[markContainerReturned] Error:', error)
    return { error: 'Failed to mark container returned' }
  }

  revalidatePath('/meal-prep')
  return mapContainer(data)
}

/**
 * Mark a container as lost.
 */
export async function markContainerLost(
  containerId: string
): Promise<Container | { error: string }> {
  const user = await requirePro('meal-prep')
  const db: any = createServerClient()

  const tableExists = await checkTableExists(db, 'meal_prep_containers')
  if (!tableExists) return { error: MIGRATION_ERROR }

  const { data, error } = await (db as any)
    .from('meal_prep_containers')
    .update({ status: 'lost' })
    .eq('id', containerId)
    .eq('chef_id', user.tenantId!)
    .select()
    .single()

  if (error) return { error: 'Failed to update container' }

  revalidatePath('/meal-prep')
  return mapContainer(data)
}

/**
 * Get all containers, optionally filtered by status.
 */
export async function getContainers(
  statusFilter?: ContainerStatus
): Promise<Container[] | { error: string }> {
  const user = await requirePro('meal-prep')
  const db: any = createServerClient()

  const tableExists = await checkTableExists(db, 'meal_prep_containers')
  if (!tableExists) return { error: MIGRATION_ERROR }

  let query = (db as any)
    .from('meal_prep_containers')
    .select('*')
    .eq('chef_id', user.tenantId!)
    .order('label')

  if (statusFilter) query = query.eq('status', statusFilter)

  const { data, error } = await query

  if (error) return { error: 'Failed to load containers' }

  return (data ?? []).map(mapContainer)
}

/**
 * Get a summary of container inventory and outstanding items.
 */
export async function getContainerSummary(): Promise<ContainerSummary | { error: string }> {
  const user = await requirePro('meal-prep')
  const db: any = createServerClient()

  const tableExists = await checkTableExists(db, 'meal_prep_containers')
  if (!tableExists) return { error: MIGRATION_ERROR }

  const { data, error } = await (db as any)
    .from('meal_prep_containers')
    .select('*')
    .eq('chef_id', user.tenantId!)

  if (error) return { error: 'Failed to load container summary' }

  const containers = data ?? []

  // Count by status
  let withClients = 0,
    returned = 0,
    lost = 0,
    retired = 0
  const typeCounts = new Map<ContainerType, number>()
  const clientCounts = new Map<string, { name: string; count: number }>()

  for (const c of containers) {
    switch (c.status) {
      case 'with_client':
        withClients++
        break
      case 'returned':
        returned++
        break
      case 'lost':
        lost++
        break
      case 'retired':
        retired++
        break
    }

    const ct = (c.container_type ?? 'other') as ContainerType
    typeCounts.set(ct, (typeCounts.get(ct) ?? 0) + 1)

    if (c.status === 'with_client' && c.client_id) {
      const existing = clientCounts.get(c.client_id) ?? {
        name: c.client_name ?? 'Unknown',
        count: 0,
      }
      existing.count++
      clientCounts.set(c.client_id, existing)
    }
  }

  return {
    totalOwned: containers.length,
    withClients,
    returned,
    lost,
    retired,
    byType: Array.from(typeCounts.entries())
      .map(([type, count]) => ({ type, count }))
      .sort((a, b) => b.count - a.count),
    outstandingByClient: Array.from(clientCounts.entries())
      .map(([clientId, { name, count }]) => ({ clientId, clientName: name, count }))
      .sort((a, b) => b.count - a.count),
  }
}

// ============================================
// HELPERS
// ============================================

function mapContainer(row: any): Container {
  return {
    id: row.id,
    chefId: row.chef_id,
    clientId: row.client_id ?? null,
    clientName: row.client_name ?? null,
    containerType: row.container_type ?? 'other',
    label: row.label ?? '',
    sentDate: row.sent_date ?? null,
    returnedDate: row.returned_date ?? null,
    status: row.status ?? 'returned',
    notes: row.notes ?? null,
    createdAt: row.created_at,
  }
}
