import { cache } from 'react'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { userRoles, clients, chefs, staffMembers, referralPartners } from '@/lib/db/schema/schema'
import { eq } from 'drizzle-orm'
import { isAdmin } from '@/lib/auth/admin'
import { readRequestAuthContext } from '@/lib/auth/request-auth-context'

const SESSION_EXPIRED_URL = '/auth/signin?message=Your+session+expired.+Please+sign+in+again.'

export type AuthUser = {
  id: string
  userId: string
  authUserId: string
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
  // Fast path: middleware already resolved auth context into request headers
  const requestAuthContext = readRequestAuthContext(headers())
  if (requestAuthContext) {
    return {
      id: requestAuthContext.userId,
      userId: requestAuthContext.userId,
      authUserId: requestAuthContext.userId,
      email: requestAuthContext.email,
      role: requestAuthContext.role,
      entityId: requestAuthContext.entityId,
      tenantId: requestAuthContext.tenantId,
    }
  }

  // Fallback: read from Auth.js session (e.g. in API routes without middleware)
  const session = await auth()

  if (!session?.user) {
    return null
  }

  const { user } = session

  // If the JWT already has role info, use it directly
  if (user.role && user.entityId && (user.role === 'chef' || user.role === 'client')) {
    return {
      id: user.id,
      userId: user.id,
      authUserId: user.id,
      email: user.email ?? '',
      role: user.role as 'chef' | 'client',
      entityId: user.entityId,
      tenantId: user.tenantId ?? null,
    }
  }

  // JWT doesn't have role info - query the database
  const [roleData] = await db
    .select({ role: userRoles.role, entityId: userRoles.entityId })
    .from(userRoles)
    .where(eq(userRoles.authUserId, user.id))
    .limit(1)

  if (!roleData) {
    console.error('[AUTH] User has no role assigned:', user.id)
    return null
  }

  if (roleData.role !== 'chef' && roleData.role !== 'client') {
    return null
  }

  let tenantId: string | null = null

  if (roleData.role === 'chef') {
    tenantId = roleData.entityId
  } else if (roleData.role === 'client') {
    const [clientData] = await db
      .select({ tenantId: clients.tenantId })
      .from(clients)
      .where(eq(clients.id, roleData.entityId))
      .limit(1)
    tenantId = clientData?.tenantId || null
  }

  return {
    id: user.id,
    userId: user.id,
    authUserId: user.id,
    email: user.email ?? '',
    role: roleData.role as 'chef' | 'client',
    entityId: roleData.entityId,
    tenantId,
  }
})

// Cached per-request suspension check to avoid N+1 DB queries
// when requireChef() is called multiple times in one render (e.g. inquiry scoring)
const _checkSuspension = cache(async (entityId: string): Promise<boolean> => {
  const [chef] = await db
    .select({ accountStatus: chefs.accountStatus })
    .from(chefs)
    .where(eq(chefs.id, entityId))
    .limit(1)
  return chef?.accountStatus === 'suspended'
})

/**
 * Require chef role - throws if not chef or if account is suspended.
 * Use in chef portal pages and server actions.
 */
export async function requireChef(): Promise<AuthUser> {
  const user = await getCurrentUser()

  if (!user || user.role !== 'chef') {
    redirect(SESSION_EXPIRED_URL)
  }

  // Guard: chef must have a tenantId. A null tenantId means the auth record
  // exists but the chef profile was never fully created - fail loudly rather
  // than silently propagating null into every DB query.
  if (!user.tenantId) {
    throw new Error('Chef account is missing tenant context. Please contact support.')
  }

  // Check suspension status (cached per request - safe to call in loops)
  if (user.entityId) {
    const suspended = await _checkSuspension(user.entityId)
    if (suspended) {
      throw new Error('Account suspended: Contact support.')
    }
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
    redirect(SESSION_EXPIRED_URL)
  }

  // Guard: client must have an entityId linking to a client record.
  // A null entityId means the auth record exists but no client profile was created.
  if (!user.entityId) {
    throw new Error('Client account is missing profile context. Please contact support.')
  }

  return user
}

/**
 * Require any authenticated user
 */
export async function requireAuth(): Promise<AuthUser> {
  const user = await getCurrentUser()

  if (!user) {
    redirect(SESSION_EXPIRED_URL)
  }

  return user
}

/**
 * Require partner role - used in partner portal pages and server actions.
 * Partners are referral sources (Airbnb hosts, venue owners) who have claimed
 * their invite and logged in. They are NOT chefs or clients.
 */
export async function requirePartner(): Promise<PartnerAuthUser> {
  const session = await auth()

  if (!session?.user) {
    redirect(SESSION_EXPIRED_URL)
  }

  const { user } = session

  // Check user_roles for the partner role
  const [roleData] = await db
    .select({ role: userRoles.role, entityId: userRoles.entityId })
    .from(userRoles)
    .where(eq(userRoles.authUserId, user.id))
    .limit(1)

  if (!roleData || roleData.role !== 'partner') {
    redirect(SESSION_EXPIRED_URL)
  }

  // Look up tenant_id from the partner record (direct DB query, no RLS needed)
  const [partner] = await db
    .select({ tenantId: referralPartners.tenantId })
    .from(referralPartners)
    .where(eq(referralPartners.id, roleData.entityId))
    .limit(1)

  if (!partner) {
    throw new Error('Partner record not found')
  }

  return {
    id: user.id,
    email: user.email ?? '',
    role: 'partner',
    partnerId: roleData.entityId,
    tenantId: partner.tenantId!,
  }
}

/**
 * Require staff role - used in staff portal pages and server actions.
 * Staff are kitchen/service team members who have their own limited login.
 * They see tasks, recipes, schedules, and station clipboards scoped to their chef (tenant).
 */
export async function requireStaff(): Promise<StaffAuthUser> {
  const session = await auth()

  if (!session?.user) {
    redirect(SESSION_EXPIRED_URL)
  }

  const { user } = session

  // Check user_roles for the staff role
  const [roleData] = await db
    .select({ role: userRoles.role, entityId: userRoles.entityId })
    .from(userRoles)
    .where(eq(userRoles.authUserId, user.id))
    .limit(1)

  if (!roleData || roleData.role !== 'staff') {
    redirect(SESSION_EXPIRED_URL)
  }

  // Look up chef_id (tenant) from the staff member record (direct DB query, no RLS needed)
  const [staffMember] = await db
    .select({ chefId: staffMembers.chefId })
    .from(staffMembers)
    .where(eq(staffMembers.id, roleData.entityId))
    .limit(1)

  if (!staffMember) {
    throw new Error('Staff member record not found')
  }

  return {
    id: user.id,
    email: user.email ?? '',
    role: 'staff',
    staffMemberId: roleData.entityId,
    tenantId: staffMember.chefId,
  }
}

/**
 * Require platform admin with chef context - email must be in ADMIN_EMAILS env var.
 * Returns full AuthUser (with tenantId) for server actions that need both admin + chef data.
 * For page-level admin gating (redirect on failure), use requireAdmin() from lib/auth/admin.ts.
 */
export async function requireChefAdmin(): Promise<AuthUser> {
  const user = await requireChef()
  const admin = await isAdmin().catch(() => false)

  if (!admin) {
    redirect(SESSION_EXPIRED_URL)
  }

  return user
}
