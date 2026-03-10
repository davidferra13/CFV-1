'use server'

import { z } from 'zod'
import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

// ============================================
// Types
// ============================================

export type ContainerType =
  | 'small_round'
  | 'medium_round'
  | 'large_rect'
  | 'soup_cup'
  | 'salad_bowl'
  | 'custom'

export type ContainerMaterial = 'plastic' | 'glass' | 'aluminum' | 'compostable'

export type TransactionType = 'purchase' | 'deploy' | 'return' | 'retire' | 'lost'

export interface ContainerInventoryItem {
  id: string
  chef_id: string
  container_type: ContainerType
  custom_label: string | null
  material: ContainerMaterial
  is_reusable: boolean
  total_owned: number
  currently_available: number
  deployed_count: number
  retired_count: number
  cost_per_unit_cents: number | null
  notes: string | null
  created_at: string
  updated_at: string
}

export interface ContainerTransaction {
  id: string
  chef_id: string
  container_type_id: string
  transaction_type: TransactionType
  quantity: number
  client_id: string | null
  program_id: string | null
  notes: string | null
  created_at: string
  container_inventory?: { container_type: string; custom_label: string | null } | null
  client?: { full_name: string } | null
}

// ============================================
// Validation
// ============================================

const addContainerSchema = z.object({
  container_type: z.enum([
    'small_round',
    'medium_round',
    'large_rect',
    'soup_cup',
    'salad_bowl',
    'custom',
  ]),
  custom_label: z.string().optional(),
  material: z.enum(['plastic', 'glass', 'aluminum', 'compostable']),
  is_reusable: z.boolean().default(true),
  total_owned: z.number().int().min(0).default(0),
  cost_per_unit_cents: z.number().int().min(0).nullable().optional(),
  notes: z.string().nullable().optional(),
})

const updateContainerSchema = z.object({
  container_type: z
    .enum(['small_round', 'medium_round', 'large_rect', 'soup_cup', 'salad_bowl', 'custom'])
    .optional(),
  custom_label: z.string().nullable().optional(),
  material: z.enum(['plastic', 'glass', 'aluminum', 'compostable']).optional(),
  is_reusable: z.boolean().optional(),
  total_owned: z.number().int().min(0).optional(),
  cost_per_unit_cents: z.number().int().min(0).nullable().optional(),
  notes: z.string().nullable().optional(),
})

const recordTransactionSchema = z.object({
  containerTypeId: z.string().uuid(),
  type: z.enum(['purchase', 'deploy', 'return', 'retire', 'lost']),
  quantity: z.number().int().min(1),
  clientId: z.string().uuid().optional(),
  programId: z.string().uuid().optional(),
  notes: z.string().optional(),
})

// ============================================
// Container Type CRUD
// ============================================

export async function addContainerType(
  input: z.infer<typeof addContainerSchema>
): Promise<{ id?: string; error?: string }> {
  const user = await requireChef()
  const supabase: any = createServerClient()
  const parsed = addContainerSchema.parse(input)

  const { data, error } = await supabase
    .from('container_inventory')
    .insert({
      chef_id: user.tenantId!,
      container_type: parsed.container_type,
      custom_label: parsed.custom_label ?? null,
      material: parsed.material,
      is_reusable: parsed.is_reusable,
      total_owned: parsed.total_owned,
      currently_available: parsed.total_owned, // all available initially
      deployed_count: 0,
      retired_count: 0,
      cost_per_unit_cents: parsed.cost_per_unit_cents ?? null,
      notes: parsed.notes ?? null,
    })
    .select('id')
    .single()

  if (error) return { error: error.message }

  // If initial stock, log a purchase transaction
  if (parsed.total_owned > 0) {
    await supabase.from('container_transactions').insert({
      chef_id: user.tenantId!,
      container_type_id: data.id,
      transaction_type: 'purchase',
      quantity: parsed.total_owned,
      notes: 'Initial stock',
    })
  }

  revalidatePath('/meal-prep/containers')
  return { id: data.id }
}

export async function updateContainerType(
  id: string,
  input: z.infer<typeof updateContainerSchema>
): Promise<{ success?: boolean; error?: string }> {
  const user = await requireChef()
  const supabase: any = createServerClient()
  const parsed = updateContainerSchema.parse(input)

  const cleanUpdates = Object.fromEntries(Object.entries(parsed).filter(([, v]) => v !== undefined))

  if (Object.keys(cleanUpdates).length === 0) {
    return { error: 'No updates provided' }
  }

  // If total_owned changed, recalculate currently_available
  if (parsed.total_owned !== undefined) {
    const { data: current } = await supabase
      .from('container_inventory')
      .select('deployed_count, retired_count')
      .eq('id', id)
      .eq('chef_id', user.tenantId!)
      .single()

    if (current) {
      ;(cleanUpdates as any).currently_available = Math.max(
        0,
        parsed.total_owned - (current.deployed_count ?? 0) - (current.retired_count ?? 0)
      )
    }
  }

  const { error } = await supabase
    .from('container_inventory')
    .update(cleanUpdates)
    .eq('id', id)
    .eq('chef_id', user.tenantId!)

  if (error) return { error: error.message }

  revalidatePath('/meal-prep/containers')
  return { success: true }
}

// ============================================
// Queries
// ============================================

export async function getContainerInventory(): Promise<ContainerInventoryItem[]> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  const { data, error } = await supabase
    .from('container_inventory')
    .select('*')
    .eq('chef_id', user.tenantId!)
    .order('created_at', { ascending: true })

  if (error) {
    console.error('[containers] getInventory error:', error.message)
    return []
  }

  return data ?? []
}

export async function getContainerHistory(
  containerTypeId?: string
): Promise<ContainerTransaction[]> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  let query = supabase
    .from('container_transactions')
    .select(
      `
      *,
      container_inventory:container_inventory(container_type, custom_label),
      client:clients(full_name)
    `
    )
    .eq('chef_id', user.tenantId!)
    .order('created_at', { ascending: false })
    .limit(50)

  if (containerTypeId) {
    query = query.eq('container_type_id', containerTypeId)
  }

  const { data, error } = await query

  if (error) {
    console.error('[containers] getHistory error:', error.message)
    return []
  }

  return data ?? []
}

export async function getContainersByClient(
  clientId: string
): Promise<{ containerType: string; deployed: number }[]> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  // Get all deploy/return transactions for this client
  const { data, error } = await supabase
    .from('container_transactions')
    .select(
      `
      container_type_id,
      transaction_type,
      quantity,
      container_inventory:container_inventory(container_type, custom_label)
    `
    )
    .eq('chef_id', user.tenantId!)
    .eq('client_id', clientId)
    .in('transaction_type', ['deploy', 'return'])

  if (error || !data) return []

  // Sum by container type
  const byType = new Map<string, { containerType: string; deployed: number }>()
  for (const tx of data) {
    const typeId = tx.container_type_id
    const label =
      tx.container_inventory?.custom_label || tx.container_inventory?.container_type || typeId
    if (!byType.has(typeId)) {
      byType.set(typeId, { containerType: label, deployed: 0 })
    }
    const entry = byType.get(typeId)!
    if (tx.transaction_type === 'deploy') {
      entry.deployed += tx.quantity
    } else if (tx.transaction_type === 'return') {
      entry.deployed -= tx.quantity
    }
  }

  return Array.from(byType.values()).filter((e) => e.deployed > 0)
}

export async function getLowStockAlerts(): Promise<ContainerInventoryItem[]> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  const { data, error } = await supabase
    .from('container_inventory')
    .select('*')
    .eq('chef_id', user.tenantId!)
    .gt('total_owned', 0)

  if (error || !data) return []

  // Low stock: available < 20% of total
  return data.filter(
    (item: ContainerInventoryItem) => item.currently_available < item.total_owned * 0.2
  )
}

// ============================================
// Record Transaction
// ============================================

export async function recordTransaction(
  input: z.infer<typeof recordTransactionSchema>
): Promise<{ success?: boolean; error?: string }> {
  const user = await requireChef()
  const supabase: any = createServerClient()
  const parsed = recordTransactionSchema.parse(input)

  // Get current inventory
  const { data: container, error: fetchErr } = await supabase
    .from('container_inventory')
    .select('*')
    .eq('id', parsed.containerTypeId)
    .eq('chef_id', user.tenantId!)
    .single()

  if (fetchErr || !container) {
    return { error: 'Container type not found' }
  }

  // Calculate new counts based on transaction type
  let newTotal = container.total_owned
  let newAvailable = container.currently_available
  let newDeployed = container.deployed_count
  let newRetired = container.retired_count

  switch (parsed.type) {
    case 'purchase':
      newTotal += parsed.quantity
      newAvailable += parsed.quantity
      break
    case 'deploy':
      if (newAvailable < parsed.quantity) {
        return { error: `Only ${newAvailable} available to deploy` }
      }
      newAvailable -= parsed.quantity
      newDeployed += parsed.quantity
      break
    case 'return':
      newDeployed = Math.max(0, newDeployed - parsed.quantity)
      newAvailable += parsed.quantity
      break
    case 'retire':
      if (newAvailable < parsed.quantity) {
        return { error: `Only ${newAvailable} available to retire` }
      }
      newAvailable -= parsed.quantity
      newRetired += parsed.quantity
      break
    case 'lost':
      newDeployed = Math.max(0, newDeployed - parsed.quantity)
      newTotal = Math.max(0, newTotal - parsed.quantity)
      break
  }

  // Insert transaction
  const { error: txErr } = await supabase.from('container_transactions').insert({
    chef_id: user.tenantId!,
    container_type_id: parsed.containerTypeId,
    transaction_type: parsed.type,
    quantity: parsed.quantity,
    client_id: parsed.clientId ?? null,
    program_id: parsed.programId ?? null,
    notes: parsed.notes ?? null,
  })

  if (txErr) return { error: txErr.message }

  // Update inventory counts
  const { error: updateErr } = await supabase
    .from('container_inventory')
    .update({
      total_owned: newTotal,
      currently_available: newAvailable,
      deployed_count: newDeployed,
      retired_count: newRetired,
    })
    .eq('id', parsed.containerTypeId)
    .eq('chef_id', user.tenantId!)

  if (updateErr) return { error: updateErr.message }

  revalidatePath('/meal-prep/containers')
  return { success: true }
}
