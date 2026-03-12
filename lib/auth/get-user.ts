// Authoritative role resolution - System Law #2
// NEVER infer role from URL, client state, or JWT claims
// ALWAYS query user_roles table (single source of truth)

import { cache } from 'react'
import { createServerClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getAdminEmails } from '@/lib/platform/owner-account'
import { getImpersonatedChefId } from '@/lib/auth/admin-impersonation'
import { getImpersonatedClientId } from '@/lib/auth/client-impersonation'

export type AuthUser = {
  id: string
  email: string
  role: 'chef' | 'client'
  entityId: string // chef.id or client.id
  tenantId: string | null // chef.id if chef, client's tenant_id if client
}

export type StaffAuthUser = {
  id: string // auth.users.id
  email: string
  role: 'staff'
  staffMemberId: string // staff_members.id
  tenantId: string // the chef's ID (staff_members.chef_id)
}

export type PartnerAuthUser = {
  id: string // auth.users.id
  email: string
  role: 'partner'
  partnerId: string // referral_partners.id
  tenantId: string // the chef's ID (referral_partners.tenant_id)
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
 * Require chef role - throws if not chef or if account is suspended.
 * Use in chef portal pages and server actions.
 *
 * Admin impersonation: when an admin has the impersonation cookie set,
 * this returns the TARGET chef's context instead of the admin's own.
 * The admin's real auth is still validated first (must be a chef + admin).
 */
export async function requireChef(): Promise<AuthUser> {
  const user = await getCurrentUser()

  if (!user || user.role !== 'chef') {
    throw new Error('Unauthorized: Chef access required')
  }

  // Check suspension status — additive column added by migration 20260307000004
  // account_status defaults to 'active'; only present after that migration is applied.
  if (user.entityId) {
    const supabase = createServerClient()
    const { data: chef } = await supabase
      .from('chefs')
      .select('account_status')
      .eq('id', user.entityId)
      .single()

    if (chef?.account_status === 'suspended') {
      throw new Error('Account suspended: Contact support.')
    }
  }

  // Admin impersonation: if the admin has selected a chef to view as,
  // return a modified AuthUser with the target chef's tenant context.
  // The admin's real identity (user.id) is preserved for auth,
  // but entityId and tenantId point to the target chef.
  const impersonatedChefId = getImpersonatedChefId()
  if (impersonatedChefId && impersonatedChefId !== user.entityId) {
    // Verify caller is actually an admin
    const adminEmails = getAdminEmails()
    if (adminEmails.includes(user.email.toLowerCase())) {
      // Verify target chef exists
      const adminClient = createAdminClient()
      const { data: targetChef } = await adminClient
        .from('chefs')
        .select('id')
        .eq('id', impersonatedChefId)
        .single()

      if (targetChef) {
        return {
          ...user,
          entityId: impersonatedChefId,
          tenantId: impersonatedChefId,
        }
      }
    }
  }

  return user
}

/**
 * Require client role - throws if not client
 * Use in client portal pages and server actions
 *
 * Admin impersonation: when an admin has the client impersonation cookie set,
 * this returns the TARGET client's context. The admin's real auth identity
 * (user.id) is preserved. Admin must be a chef-role user with admin email.
 */
export async function requireClient(): Promise<AuthUser> {
  const user = await getCurrentUser()

  // Normal client auth
  if (user && user.role === 'client') {
    return user
  }

  // Admin client impersonation: admin (chef role) can view as a specific client
  if (user && user.role === 'chef') {
    const impersonatedClientId = getImpersonatedClientId()
    if (impersonatedClientId) {
      const adminEmails = getAdminEmails()
      if (adminEmails.includes(user.email.toLowerCase())) {
        const adminClient = createAdminClient()
        const { data: targetClient } = await adminClient
          .from('clients')
          .select('id, tenant_id')
          .eq('id', impersonatedClientId)
          .single()

        if (targetClient) {
          return {
            ...user,
            role: 'client',
            entityId: impersonatedClientId,
            tenantId: targetClient.tenant_id,
          }
        }
      }
    }
  }

  throw new Error('Unauthorized: Client access required')
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

/**
 * Require partner role — used in partner portal pages and server actions.
 * Partners are referral sources (Airbnb hosts, venue owners) who have claimed
 * their invite and logged in. They are NOT chefs or clients.
 */
export async function requirePartner(): Promise<PartnerAuthUser> {
  const supabase = createServerClient()

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error || !user) {
    throw new Error('Unauthorized: Authentication required')
  }

  // Check user_roles for the partner role (users can read their own role row)
  const { data: roleData } = await supabase
    .from('user_roles')
    .select('role, entity_id')
    .eq('auth_user_id', user.id)
    .single()

  if (!roleData || roleData.role !== 'partner') {
    throw new Error('Unauthorized: Partner access required')
  }

  // Look up tenant_id from the partner record.
  // Uses admin client because existing chef-only RLS blocks the partner session
  // from reading referral_partners directly (until migration applies the partner policy).
  const adminClient = createAdminClient()
  const { data: partner } = await adminClient
    .from('referral_partners')
    .select('tenant_id')
    .eq('id', roleData.entity_id)
    .single()

  if (!partner) {
    throw new Error('Partner record not found')
  }

  return {
    id: user.id,
    email: user.email!,
    role: 'partner',
    partnerId: roleData.entity_id,
    tenantId: partner.tenant_id,
  }
}

/**
 * Require staff role — used in staff portal pages and server actions.
 * Staff are kitchen/service team members who have their own limited login.
 * They see tasks, recipes, schedules, and station clipboards scoped to their chef (tenant).
 */
export async function requireStaff(): Promise<StaffAuthUser> {
  const supabase = createServerClient()

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error || !user) {
    throw new Error('Unauthorized: Authentication required')
  }

  // Check user_roles for the staff role
  const { data: roleData } = await supabase
    .from('user_roles')
    .select('role, entity_id')
    .eq('auth_user_id', user.id)
    .single()

  if (!roleData || roleData.role !== 'staff') {
    throw new Error('Unauthorized: Staff access required')
  }

  // Look up chef_id (tenant) from the staff member record.
  // Uses admin client because existing chef-only RLS blocks the staff session
  // from reading staff_members directly (until migration applies the staff policy).
  const adminClient = createAdminClient()
  const { data: staffMember } = await adminClient
    .from('staff_members')
    .select('chef_id')
    .eq('id', roleData.entity_id)
    .single()

  if (!staffMember) {
    throw new Error('Staff member record not found')
  }

  return {
    id: user.id,
    email: user.email!,
    role: 'staff',
    staffMemberId: roleData.entity_id,
    tenantId: staffMember.chef_id,
  }
}

// ---------------------------------------------------------------------------
// Marketplace auth (overlay — does NOT modify existing flows)
// ---------------------------------------------------------------------------

export type MarketplaceUser = {
  id: string // auth.users.id
  email: string
  marketplaceProfileId: string
  linkedTenants: Array<{
    tenantId: string
    clientId: string
    isFavorite: boolean
  }>
}

type MarketplaceProfileLookup = {
  id: string
}

type MarketplaceClientLinkLookup = {
  client_id: string
}

type MarketplaceClientLinkRecord = {
  tenant_id: string
  client_id: string
  is_favorite: boolean
}

// Keep these query result shapes narrow so TS does not expand the full generated
// Supabase builder types on a hot auth path.
async function findMarketplaceProfile(adminClient: any, authUserId: string) {
  const { data } = (await adminClient
    .from('marketplace_profiles')
    .select('id')
    .eq('auth_user_id', authUserId)
    .single()) as { data: MarketplaceProfileLookup | null }

  return data
}

async function createMarketplaceProfile(adminClient: any, user: AuthUser) {
  const { data, error } = (await adminClient
    .from('marketplace_profiles')
    .insert({
      auth_user_id: user.id,
      email: user.email,
      primary_client_id: user.entityId,
    })
    .select('id')
    .single()) as { data: MarketplaceProfileLookup | null; error: Error | null }

  return { data, error }
}

async function listMarketplaceClientLinks(adminClient: any, marketplaceProfileId: string) {
  const { data } = (await adminClient
    .from('marketplace_client_links')
    .select('tenant_id, client_id, is_favorite')
    .eq('marketplace_profile_id', marketplaceProfileId)) as {
    data: MarketplaceClientLinkRecord[] | null
  }

  return data ?? []
}

async function findMarketplaceClientLink(
  adminClient: any,
  marketplaceProfileId: string,
  tenantId: string
) {
  const { data } = (await adminClient
    .from('marketplace_client_links')
    .select('client_id')
    .eq('tenant_id', tenantId)
    .eq('marketplace_profile_id', marketplaceProfileId)
    .single()) as { data: MarketplaceClientLinkLookup | null }

  return data
}

/**
 * Require a marketplace-enabled client.
 * Returns the user's marketplace profile and all linked chef tenants.
 * Creates a marketplace_profile on the fly if the client doesn't have one yet.
 * Throws if the user is not authenticated or has no client role.
 */
export async function requireMarketplaceClient(): Promise<MarketplaceUser> {
  const user = await getCurrentUser()

  if (!user || user.role !== 'client') {
    throw new Error('Unauthorized: Client access required')
  }

  const adminClient = createAdminClient()

  // Find or create marketplace profile
  let profile = await findMarketplaceProfile(adminClient, user.id)

  if (!profile) {
    const { data: newProfile, error: createErr } = await createMarketplaceProfile(adminClient, user)

    if (createErr || !newProfile) {
      throw new Error('Failed to create marketplace profile')
    }
    profile = newProfile
  }

  // Fetch all linked tenants
  const links = await listMarketplaceClientLinks(adminClient, profile.id)

  return {
    id: user.id,
    email: user.email,
    marketplaceProfileId: profile.id,
    linkedTenants: (links ?? []).map((l) => ({
      tenantId: l.tenant_id,
      clientId: l.client_id,
      isFavorite: l.is_favorite,
    })),
  }
}

/**
 * Require client auth scoped to a specific chef tenant.
 * Validates the client has a relationship with that chef via marketplace_client_links.
 * Returns a standard AuthUser with tenantId set to the requested tenant.
 * Throws if the user has no link to that tenant.
 */
export async function requireClientForTenant(tenantId: string): Promise<AuthUser> {
  const user = await getCurrentUser()

  if (!user || user.role !== 'client') {
    throw new Error('Unauthorized: Client access required')
  }

  // If the user's existing tenantId matches, use the fast path (legacy single-tenant)
  if (user.tenantId === tenantId) {
    return user
  }

  // Check marketplace_client_links for a cross-tenant relationship
  const adminClient = createAdminClient()
  const profile = await findMarketplaceProfile(adminClient, user.id)

  if (!profile) {
    throw new Error('Unauthorized: No relationship with this chef')
  }

  const link = await findMarketplaceClientLink(adminClient, profile.id, tenantId)

  if (!link) {
    throw new Error('Unauthorized: No relationship with this chef')
  }

  return {
    ...user,
    entityId: link.client_id,
    tenantId,
  }
}

/**
 * Require platform admin with chef context - email must be in ADMIN_EMAILS env var.
 * Returns full AuthUser (with tenantId) for server actions that need both admin + chef data.
 * For page-level admin gating (redirect on failure), use requireAdmin() from lib/auth/admin.ts.
 */
export async function requireChefAdmin(): Promise<AuthUser> {
  const user = await requireChef()

  const adminEmails = getAdminEmails()

  if (!adminEmails.includes(user.email.toLowerCase())) {
    throw new Error('Unauthorized: Admin access required')
  }

  return user
}
