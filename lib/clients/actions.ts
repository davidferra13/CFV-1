// Client Management Server Actions
// Chef-only: Invitation-based client signup
// Enforces tenant scoping

'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import crypto from 'crypto'

const InviteClientSchema = z.object({
  email: z.string().email('Valid email required'),
  full_name: z.string().min(1, 'Name required')
})

const UpdateClientSchema = z.object({
  full_name: z.string().min(1).optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
  preferred_contact_method: z.enum(['phone', 'email', 'text', 'instagram']).optional(),
  dietary_restrictions: z.array(z.string()).optional(),
  allergies: z.array(z.string()).optional(),
  dislikes: z.array(z.string()).optional(),
  spice_tolerance: z.enum(['none', 'mild', 'medium', 'hot', 'very_hot']).optional(),
  favorite_cuisines: z.array(z.string()).optional(),
  favorite_dishes: z.array(z.string()).optional(),
  wine_beverage_preferences: z.string().optional(),
  partner_name: z.string().optional(),
  parking_instructions: z.string().optional(),
  access_instructions: z.string().optional(),
  kitchen_size: z.string().optional(),
  kitchen_constraints: z.string().optional(),
  house_rules: z.string().optional(),
  equipment_available: z.array(z.string()).optional(),
  equipment_must_bring: z.array(z.string()).optional(),
  vibe_notes: z.string().optional(),
  what_they_care_about: z.string().optional(),
  status: z.enum(['active', 'dormant', 'repeat_ready', 'vip']).optional()
})

export type InviteClientInput = z.infer<typeof InviteClientSchema>
export type UpdateClientInput = z.infer<typeof UpdateClientSchema>

/**
 * Send client invitation (chef-only)
 * Creates invitation record with unique token
 * V1: No email sending, just creates DB record
 */
export async function inviteClient(input: InviteClientInput) {
  const user = await requireChef()
  const validated = InviteClientSchema.parse(input)

  const supabase = createServerClient()

  // Check if client already exists with this email in this tenant
  const { data: existingClient } = await supabase
    .from('clients')
    .select('id')
    .eq('tenant_id', user.tenantId!)
    .eq('email', validated.email)
    .single()

  if (existingClient) {
    throw new Error('Client with this email already exists in your tenant')
  }

  // Check if pending invitation exists
  const { data: existingInvitation } = await supabase
    .from('client_invitations')
    .select('id, used_at')
    .eq('tenant_id', user.tenantId!)
    .eq('email', validated.email)
    .is('used_at', null)
    .single()

  if (existingInvitation) {
    throw new Error('Pending invitation already exists for this email')
  }

  // Generate secure token
  const token = crypto.randomBytes(32).toString('hex')

  // Create invitation (expires in 7 days)
  const expiresAt = new Date()
  expiresAt.setDate(expiresAt.getDate() + 7)

  const { data: invitation, error } = await supabase
    .from('client_invitations')
    .insert({
      tenant_id: user.tenantId!,
      email: validated.email,
      full_name: validated.full_name,
      token,
      expires_at: expiresAt.toISOString(),
      created_by: user.id
    })
    .select()
    .single()

  if (error) {
    console.error('[inviteClient] Error:', error)
    throw new Error('Failed to create invitation')
  }

  revalidatePath('/clients')

  // V1: Return invitation URL (no email sending)
  const invitationUrl = `${process.env.NEXT_PUBLIC_APP_URL}/auth/signup?token=${token}`

  return { success: true, invitation, invitationUrl }
}

/**
 * Get all clients for chef's tenant
 */
export async function getClients() {
  const user = await requireChef()
  const supabase = createServerClient()

  const { data: clients, error } = await supabase
    .from('clients')
    .select('*')
    .eq('tenant_id', user.tenantId!)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('[getClients] Error:', error)
    throw new Error('Failed to fetch clients')
  }

  return clients
}

/**
 * Get single client by ID (chef-only, RLS enforces tenant scoping)
 */
export async function getClientById(clientId: string) {
  const user = await requireChef()
  const supabase = createServerClient()

  const { data: client, error } = await supabase
    .from('clients')
    .select('*')
    .eq('id', clientId)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (error) {
    console.error('[getClientById] Error:', error)
    return null
  }

  return client
}

/**
 * Update client (chef-only)
 */
export async function updateClient(clientId: string, input: UpdateClientInput) {
  const user = await requireChef()
  const validated = UpdateClientSchema.parse(input)

  const supabase = createServerClient()

  const { data: client, error } = await supabase
    .from('clients')
    .update(validated)
    .eq('id', clientId)
    .eq('tenant_id', user.tenantId!)
    .select()
    .single()

  if (error) {
    console.error('[updateClient] Error:', error)
    throw new Error('Failed to update client')
  }

  revalidatePath('/clients')
  revalidatePath(`/clients/${clientId}`)
  return { success: true, client }
}

/**
 * Get pending invitations for tenant
 */
export async function getPendingInvitations() {
  const user = await requireChef()
  const supabase = createServerClient()

  const { data: invitations, error } = await supabase
    .from('client_invitations')
    .select('*')
    .eq('tenant_id', user.tenantId!)
    .is('used_at', null)
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false })

  if (error) {
    console.error('[getPendingInvitations] Error:', error)
    throw new Error('Failed to fetch invitations')
  }

  return invitations
}

/**
 * Cancel invitation (chef-only)
 * V1: Just delete the record
 */
export async function cancelInvitation(invitationId: string) {
  const user = await requireChef()
  const supabase = createServerClient()

  const { error } = await supabase
    .from('client_invitations')
    .delete()
    .eq('id', invitationId)
    .eq('tenant_id', user.tenantId!)

  if (error) {
    console.error('[cancelInvitation] Error:', error)
    throw new Error('Failed to cancel invitation')
  }

  revalidatePath('/clients')
  return { success: true }
}

/**
 * Get clients with statistics (chef-only)
 * Uses client_financial_summary view for computed stats
 */
export async function getClientsWithStats() {
  const user = await requireChef()
  const supabase = createServerClient()

  // Get all clients
  const { data: clients, error: clientsError } = await supabase
    .from('clients')
    .select('*')
    .eq('tenant_id', user.tenantId!)
    .order('created_at', { ascending: false })

  if (clientsError) {
    console.error('[getClientsWithStats] Error:', clientsError)
    throw new Error('Failed to fetch clients')
  }

  // Use the client_financial_summary view for stats
  const { data: financialSummaries } = await supabase
    .from('client_financial_summary')
    .select('*')
    .eq('tenant_id', user.tenantId!)

  // Build stats map from the view
  const statsMap = new Map<string, {
    totalEvents: number
    totalSpentCents: number
    lastEventDate: string | null
  }>()

  if (financialSummaries) {
    for (const summary of financialSummaries) {
      if (summary.client_id) {
        statsMap.set(summary.client_id, {
          totalEvents: summary.total_events_count ?? 0,
          totalSpentCents: summary.lifetime_value_cents ?? 0,
          lastEventDate: summary.last_event_date
        })
      }
    }
  }

  // Merge clients with stats
  return clients.map(client => ({
    ...client,
    totalEvents: statsMap.get(client.id)?.totalEvents ?? 0,
    totalSpentCents: statsMap.get(client.id)?.totalSpentCents ?? 0,
    lastEventDate: statsMap.get(client.id)?.lastEventDate ?? null
  }))
}

/**
 * Get events for a specific client (chef-only)
 */
export async function getClientEvents(clientId: string) {
  const user = await requireChef()
  const supabase = createServerClient()

  // Verify client belongs to tenant
  const { data: client } = await supabase
    .from('clients')
    .select('id')
    .eq('id', clientId)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (!client) {
    throw new Error('Client not found')
  }

  // Get events for this client
  const { data: events, error } = await supabase
    .from('events')
    .select('*')
    .eq('client_id', clientId)
    .eq('tenant_id', user.tenantId!)
    .order('event_date', { ascending: false })

  if (error) {
    console.error('[getClientEvents] Error:', error)
    throw new Error('Failed to fetch client events')
  }

  return events
}

/**
 * Get client with detailed statistics
 * Uses client_financial_summary view for computed metrics
 */
export async function getClientWithStats(clientId: string) {
  const user = await requireChef()
  const supabase = createServerClient()

  // Get client
  const { data: client, error: clientError } = await supabase
    .from('clients')
    .select('*')
    .eq('id', clientId)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (clientError || !client) {
    console.error('[getClientWithStats] Error:', clientError)
    return null
  }

  // Use the client_financial_summary view
  const { data: financialSummary } = await supabase
    .from('client_financial_summary')
    .select('*')
    .eq('client_id', clientId)
    .single()

  return {
    ...client,
    totalEvents: financialSummary?.total_events_count ?? 0,
    completedEvents: financialSummary?.total_events_completed ?? 0,
    totalSpentCents: financialSummary?.lifetime_value_cents ?? 0,
    averageEventValueCents: financialSummary?.average_spend_per_event ?? 0,
    lastEventDate: financialSummary?.last_event_date ?? null,
    outstandingBalanceCents: financialSummary?.outstanding_balance_cents ?? 0
  }
}
