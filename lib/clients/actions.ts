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
  phone: z.string().optional()
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

  revalidatePath('/chef/clients')

  // V1: Return invitation URL (no email sending)
  const invitationUrl = `${process.env.NEXT_PUBLIC_APP_URL}/auth/signup?token=${token}`

  return { success: true, invitation, invitationUrl }
}

/**
 * Get invitation by token (public - for signup flow)
 */
export async function getInvitationByToken(token: string) {
  const supabase = createServerClient()

  const { data: invitation, error } = await supabase
    .from('client_invitations')
    .select('*')
    .eq('token', token)
    .is('used_at', null)
    .gt('expires_at', new Date().toISOString())
    .single()

  if (error || !invitation) {
    return null
  }

  return invitation
}

/**
 * Mark invitation as used (called during signup)
 */
export async function markInvitationUsed(invitationId: string) {
  const supabase = createServerClient({ admin: true })

  const { error } = await supabase
    .from('client_invitations')
    .update({ used_at: new Date().toISOString() })
    .eq('id', invitationId)

  if (error) {
    console.error('[markInvitationUsed] Error:', error)
    throw new Error('Failed to mark invitation as used')
  }

  return { success: true }
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

  revalidatePath('/chef/clients')
  revalidatePath(`/chef/clients/${clientId}`)
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

  revalidatePath('/chef/clients')
  return { success: true }
}
