// Authoritative role resolution - System Law #2
// NEVER infer role from URL, client state, or JWT claims
// ALWAYS query user_roles table (single source of truth)

import { cache } from 'react'
import { createServerClient } from '@/lib/supabase/server'

export type AuthUser = {
  id: string
  email: string
  role: 'chef' | 'client'
  entityId: string // chef.id or client.id
  tenantId: string | null // chef.id if chef, client's tenant_id if client
}

/**
 * Get current authenticated user with authoritative role
 * Cached per request - single DB query
 * Returns null if not authenticated or no role assigned
 */
export const getCurrentUser = cache(async (): Promise<AuthUser | null> => {
  const supabase = createServerClient()

  // Get Supabase auth user
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error || !user) {
    return null
  }

  // Get role from authoritative source (user_roles table)
  const { data: roleData, error: roleError } = await supabase
    .from('user_roles')
    .select('role, entity_id')
    .eq('auth_user_id', user.id)
    .single()

  if (roleError || !roleData) {
    // User exists but no role assigned - should not happen in normal flow
    console.error('[AUTH] User has no role assigned:', user.id, roleError)
    return null
  }

  if (roleData.role !== 'chef' && roleData.role !== 'client') {
    // system or unknown roles are not valid portal users
    return null
  }

  // Get tenant_id based on role
  let tenantId: string | null = null

  if (roleData.role === 'chef') {
    // Chef's own ID is the tenant
    tenantId = roleData.entity_id
  } else if (roleData.role === 'client') {
    // Fetch client's tenant_id
    const { data: clientData } = await supabase
      .from('clients')
      .select('tenant_id')
      .eq('id', roleData.entity_id)
      .single()

    tenantId = clientData?.tenant_id || null
  }

  return {
    id: user.id,
    email: user.email!,
    role: roleData.role,
    entityId: roleData.entity_id,
    tenantId,
  }
})

/**
 * Require chef role - throws if not chef
 * Use in chef portal pages and server actions
 */
export async function requireChef(): Promise<AuthUser> {
  const user = await getCurrentUser()

  if (!user || user.role !== 'chef') {
    throw new Error('Unauthorized: Chef access required')
  }

  return user
}

/**
 * Require client role - throws if not client
 * Use in client portal pages and server actions
 */
export async function requireClient(): Promise<AuthUser> {
  const user = await getCurrentUser()

  if (!user || user.role !== 'client') {
    throw new Error('Unauthorized: Client access required')
  }

  return user
}

/**
 * Require any authenticated user
 */
export async function requireAuth(): Promise<AuthUser> {
  const user = await getCurrentUser()

  if (!user) {
    throw new Error('Unauthorized: Authentication required')
  }

  return user
}
