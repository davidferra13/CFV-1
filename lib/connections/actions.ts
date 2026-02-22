// Client Connections Server Actions
// Lightweight peer-to-peer connections between clients — chef-only
// Replaces the heavyweight Households feature

'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

// ============================================
// TYPES
// ============================================

export interface ClientConnection {
  id: string
  tenant_id: string
  client_a_id: string
  client_b_id: string
  relationship_type: string
  notes: string | null
  created_at: string
  // Joined: the "other" client's info (relative to the queried client)
  connected_client_id: string
  connected_client_name: string
  connected_client_email: string
}

// ============================================
// VALIDATION SCHEMAS
// ============================================

const CreateConnectionSchema = z.object({
  client_a_id: z.string().uuid(),
  client_b_id: z.string().uuid(),
  relationship_type: z.string().min(1).max(100),
  notes: z.string().max(500).optional(),
})

const UpdateConnectionSchema = z.object({
  relationship_type: z.string().min(1).max(100).optional(),
  notes: z.string().max(500).nullable().optional(),
})

// ============================================
// QUERIES
// ============================================

/**
 * Get all connections for a specific client (from either side).
 * Returns the "other" client's info for each connection.
 */
export async function getClientConnections(clientId: string): Promise<ClientConnection[]> {
  const user = await requireChef()
  const supabase = createServerClient()

  // Get connections where this client is on either side
  const { data: connections, error } = await supabase
    .from('client_connections' as any)
    .select('*')
    .eq('tenant_id', user.tenantId!)
    .or(`client_a_id.eq.${clientId},client_b_id.eq.${clientId}`)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('[getClientConnections] Error:', error)
    return []
  }

  if (!connections || connections.length === 0) return []

  // Collect all "other" client IDs
  const otherClientIds = new Set<string>()
  for (const c of connections) {
    otherClientIds.add(c.client_a_id === clientId ? c.client_b_id : c.client_a_id)
  }

  // Fetch client info in one query
  const { data: clients } = await supabase
    .from('clients')
    .select('id, full_name, email')
    .in('id', Array.from(otherClientIds))

  const clientMap: Record<string, { full_name: string; email: string }> = {}
  for (const cl of clients || []) {
    clientMap[cl.id] = { full_name: cl.full_name, email: cl.email }
  }

  // Assemble with "other" client info
  return connections.map((c: any) => {
    const otherId = c.client_a_id === clientId ? c.client_b_id : c.client_a_id
    return {
      id: c.id,
      tenant_id: c.tenant_id,
      client_a_id: c.client_a_id,
      client_b_id: c.client_b_id,
      relationship_type: c.relationship_type,
      notes: c.notes,
      created_at: c.created_at,
      connected_client_id: otherId,
      connected_client_name: clientMap[otherId]?.full_name ?? 'Unknown',
      connected_client_email: clientMap[otherId]?.email ?? '',
    }
  })
}

// ============================================
// MUTATIONS
// ============================================

/**
 * Create a connection between two clients.
 */
export async function createConnection(input: z.infer<typeof CreateConnectionSchema>) {
  const user = await requireChef()
  const validated = CreateConnectionSchema.parse(input)
  const supabase = createServerClient()

  if (validated.client_a_id === validated.client_b_id) {
    throw new Error('Cannot connect a client to themselves')
  }

  // Verify both clients belong to this chef
  const { data: clientA } = await supabase
    .from('clients')
    .select('id')
    .eq('id', validated.client_a_id)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (!clientA) throw new Error('First client not found')

  const { data: clientB } = await supabase
    .from('clients')
    .select('id')
    .eq('id', validated.client_b_id)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (!clientB) throw new Error('Second client not found')

  const { data, error } = await supabase
    .from('client_connections' as any)
    .insert({
      tenant_id: user.tenantId!,
      client_a_id: validated.client_a_id,
      client_b_id: validated.client_b_id,
      relationship_type: validated.relationship_type,
      notes: validated.notes || null,
    })
    .select()
    .single()

  if (error) {
    if (error.code === '23505') {
      throw new Error('These clients are already connected')
    }
    console.error('[createConnection] Error:', error)
    throw new Error('Failed to create connection')
  }

  revalidatePath(`/clients/${validated.client_a_id}`)
  revalidatePath(`/clients/${validated.client_b_id}`)
  return { connection: data }
}

/**
 * Update a connection's relationship type or notes.
 */
export async function updateConnection(
  connectionId: string,
  input: z.infer<typeof UpdateConnectionSchema>
) {
  const user = await requireChef()
  const validated = UpdateConnectionSchema.parse(input)
  const supabase = createServerClient()

  // Build update object
  const updates: Record<string, unknown> = {}
  if (validated.relationship_type !== undefined)
    updates.relationship_type = validated.relationship_type
  if (validated.notes !== undefined) updates.notes = validated.notes

  if (Object.keys(updates).length === 0) {
    throw new Error('No fields to update')
  }

  const { data, error } = await supabase
    .from('client_connections' as any)
    .update(updates)
    .eq('id', connectionId)
    .eq('tenant_id', user.tenantId!)
    .select()
    .single()

  if (error) {
    console.error('[updateConnection] Error:', error)
    throw new Error('Failed to update connection')
  }

  const updated = data as any
  revalidatePath(`/clients/${updated.client_a_id}`)
  revalidatePath(`/clients/${updated.client_b_id}`)
  return { connection: updated }
}

/**
 * Remove a connection between two clients.
 */
export async function removeConnection(connectionId: string) {
  const user = await requireChef()
  const supabase = createServerClient()

  // Get connection first for revalidation paths
  const { data: connection } = await supabase
    .from('client_connections' as any)
    .select('client_a_id, client_b_id')
    .eq('id', connectionId)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (!connection) {
    throw new Error('Connection not found')
  }

  const { error } = await supabase
    .from('client_connections' as any)
    .delete()
    .eq('id', connectionId)
    .eq('tenant_id', user.tenantId!)

  if (error) {
    console.error('[removeConnection] Error:', error)
    throw new Error('Failed to remove connection')
  }

  const conn = connection as any
  revalidatePath(`/clients/${conn.client_a_id}`)
  revalidatePath(`/clients/${conn.client_b_id}`)
  return { success: true as const }
}
