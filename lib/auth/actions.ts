// Authentication Server Actions
// Handles signup, signin, signout
// Enforces invitation-based client signup

'use server'

import { createServerClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { getInvitationByToken, markInvitationUsed } from '@/lib/clients/actions'

const ChefSignupSchema = z.object({
  email: z.string().email('Valid email required'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  business_name: z.string().min(1, 'Business name required'),
  phone: z.string().optional()
})

const ClientSignupSchema = z.object({
  email: z.string().email('Valid email required'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  full_name: z.string().min(1, 'Full name required'),
  phone: z.string().optional(),
  invitation_token: z.string().min(1, 'Invitation token required')
})

const SignInSchema = z.object({
  email: z.string().email('Valid email required'),
  password: z.string().min(1, 'Password required')
})

export type ChefSignupInput = z.infer<typeof ChefSignupSchema>
export type ClientSignupInput = z.infer<typeof ClientSignupSchema>
export type SignInInput = z.infer<typeof SignInSchema>

/**
 * Chef signup - Creates chef account with tenant
 */
export async function signUpChef(input: ChefSignupInput) {
  const validated = ChefSignupSchema.parse(input)

  // Use service role for creating user and tenant atomically
  const supabase = createServerClient({ admin: true })

  // Create auth user
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email: validated.email,
    password: validated.password,
    email_confirm: true // Auto-confirm for V1 (no email verification)
  })

  if (authError || !authData.user) {
    console.error('[signUpChef] Auth error:', authError)
    throw new Error(authError?.message || 'Failed to create account')
  }

  try {
    // Create chef record
    const { data: chef, error: chefError } = await supabase
      .from('chefs')
      .insert({
        auth_user_id: authData.user.id,
        business_name: validated.business_name,
        email: validated.email,
        phone: validated.phone
      })
      .select()
      .single()

    if (chefError) {
      console.error('[signUpChef] Chef creation error:', chefError)
      // Rollback: delete auth user
      await supabase.auth.admin.deleteUser(authData.user.id)
      throw new Error('Failed to create chef profile')
    }

    // Create user role
    const { error: roleError } = await supabase
      .from('user_roles')
      .insert({
        auth_user_id: authData.user.id,
        role: 'chef',
        entity_id: chef.id
      })

    if (roleError) {
      console.error('[signUpChef] Role creation error:', roleError)
      // Rollback: delete chef and auth user
      await supabase.from('chefs').delete().eq('id', chef.id)
      await supabase.auth.admin.deleteUser(authData.user.id)
      throw new Error('Failed to assign role')
    }

    return { success: true, userId: authData.user.id }
  } catch (error) {
    // Ensure cleanup
    await supabase.auth.admin.deleteUser(authData.user.id)
    throw error
  }
}

/**
 * Client signup - Invitation-based only
 */
export async function signUpClient(input: ClientSignupInput) {
  const validated = ClientSignupSchema.parse(input)

  // Verify invitation
  const invitation = await getInvitationByToken(validated.invitation_token)
  if (!invitation) {
    throw new Error('Invalid or expired invitation')
  }

  // Verify email matches invitation
  if (invitation.email.toLowerCase() !== validated.email.toLowerCase()) {
    throw new Error('Email does not match invitation')
  }

  // Use service role for atomic creation
  const supabase = createServerClient({ admin: true })

  // Create auth user
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email: validated.email,
    password: validated.password,
    email_confirm: true // Auto-confirm for V1
  })

  if (authError || !authData.user) {
    console.error('[signUpClient] Auth error:', authError)
    throw new Error(authError?.message || 'Failed to create account')
  }

  try {
    // Create client record
    const { data: client, error: clientError } = await supabase
      .from('clients')
      .insert({
        auth_user_id: authData.user.id,
        tenant_id: invitation.tenant_id,
        full_name: validated.full_name,
        email: validated.email,
        phone: validated.phone
      })
      .select()
      .single()

    if (clientError) {
      console.error('[signUpClient] Client creation error:', clientError)
      await supabase.auth.admin.deleteUser(authData.user.id)
      throw new Error('Failed to create client profile')
    }

    // Create user role
    const { error: roleError } = await supabase
      .from('user_roles')
      .insert({
        auth_user_id: authData.user.id,
        role: 'client',
        entity_id: client.id
      })

    if (roleError) {
      console.error('[signUpClient] Role creation error:', roleError)
      await supabase.from('clients').delete().eq('id', client.id)
      await supabase.auth.admin.deleteUser(authData.user.id)
      throw new Error('Failed to assign role')
    }

    // Mark invitation as used
    await markInvitationUsed(invitation.id)

    return { success: true, userId: authData.user.id }
  } catch (error) {
    await supabase.auth.admin.deleteUser(authData.user.id)
    throw error
  }
}

/**
 * Sign in (both chef and client)
 */
export async function signIn(input: SignInInput) {
  const validated = SignInSchema.parse(input)

  const supabase = createServerClient()

  const { data, error } = await supabase.auth.signInWithPassword({
    email: validated.email,
    password: validated.password
  })

  if (error) {
    console.error('[signIn] Error:', error)
    throw new Error('Invalid email or password')
  }

  revalidatePath('/', 'layout')
  return { success: true, user: data.user }
}

/**
 * Sign out
 */
export async function signOut() {
  const supabase = createServerClient()

  const { error } = await supabase.auth.signOut()

  if (error) {
    console.error('[signOut] Error:', error)
    throw new Error('Failed to sign out')
  }

  revalidatePath('/', 'layout')
  redirect('/')
}
