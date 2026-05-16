'use server'

/**
 * Staff invite flow using HMAC-signed tokens.
 * No DB migration needed: token encodes memberId + tenantId + email + expiry,
 * verified server-side via HMAC signature.
 *
 * Flow:
 *   1. Chef clicks "Invite" on a staff member → generateStaffInviteUrl()
 *   2. Staff member opens link → /auth/staff-signup?token=<signed>
 *   3. Staff member enters password → claimStaffInvite()
 *   4. Server validates signature, creates/finds auth user, adds staff role
 */

import crypto from 'crypto'
import bcrypt from 'bcryptjs'
import { db } from '@/lib/db'
import { authUsers } from '@/lib/db/schema/auth'
import { staffMembers, userRoles } from '@/lib/db/schema/schema'
import { eq, and } from 'drizzle-orm'
import { requireChef } from '@/lib/auth/get-user'
import { recordPolicyAcceptancesForSubject } from '@/lib/legal/persistence'

const APP_URL =
  process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_SITE_URL || 'https://cheflowhq.com'

const INVITE_SECRET =
  process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET || 'chefflow-staff-invite-fallback'
const INVITE_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000 // 7 days

type StaffInvitePayload = {
  memberId: string
  tenantId: string
  email: string
  name: string
  exp: number
}

function signPayload(payload: StaffInvitePayload): string {
  const data = JSON.stringify(payload)
  const encoded = Buffer.from(data).toString('base64url')
  const sig = crypto.createHmac('sha256', INVITE_SECRET).update(encoded).digest('base64url')
  return `${encoded}.${sig}`
}

function verifyAndDecodeToken(token: string): StaffInvitePayload | null {
  const parts = token.split('.')
  if (parts.length !== 2) return null

  const [encoded, sig] = parts
  const expectedSig = crypto.createHmac('sha256', INVITE_SECRET).update(encoded).digest('base64url')

  if (sig !== expectedSig) return null

  try {
    const data = JSON.parse(Buffer.from(encoded, 'base64url').toString())
    if (!data.memberId || !data.tenantId || !data.email || !data.exp) return null
    if (Date.now() > data.exp) return null
    return data as StaffInvitePayload
  } catch {
    return null
  }
}

/**
 * Generate a signed invite URL for a staff member.
 * Called by the chef from the team/staff management page.
 */
export async function generateStaffInviteUrl(
  staffMemberId: string
): Promise<{ success: true; inviteUrl: string; staffName: string }> {
  const chef = await requireChef()

  const [member] = await db
    .select({
      id: staffMembers.id,
      name: staffMembers.name,
      email: staffMembers.email,
      chefId: staffMembers.chefId,
    })
    .from(staffMembers)
    .where(and(eq(staffMembers.id, staffMemberId), eq(staffMembers.chefId, chef.entityId)))
    .limit(1)

  if (!member) {
    throw new Error('Staff member not found')
  }

  if (!member.email) {
    throw new Error('Staff member must have an email address to be invited')
  }

  const payload: StaffInvitePayload = {
    memberId: member.id,
    tenantId: chef.entityId,
    email: member.email.toLowerCase(),
    name: member.name,
    exp: Date.now() + INVITE_EXPIRY_MS,
  }

  const token = signPayload(payload)
  const inviteUrl = `${APP_URL}/auth/staff-signup?token=${encodeURIComponent(token)}`

  return { success: true, inviteUrl, staffName: member.name }
}

/**
 * Decode a staff invite token for display purposes (no side effects).
 * Used by the signup page to show who the invite is for.
 */
export async function decodeStaffInviteToken(
  token: string
): Promise<{ valid: true; name: string; email: string } | { valid: false; error: string }> {
  const payload = verifyAndDecodeToken(token)
  if (!payload) {
    return {
      valid: false,
      error: 'This invite link is invalid or has expired. Ask your chef for a new one.',
    }
  }
  return { valid: true, name: payload.name, email: payload.email }
}

/**
 * Claim a staff invite. Creates or finds auth user, adds staff role.
 */
export async function claimStaffInvite(
  token: string,
  email: string,
  password: string,
  acceptedLegalTerms: boolean
): Promise<{ success: true } | { error: string }> {
  if (!acceptedLegalTerms) {
    return { error: 'You must accept the required ChefFlow policies.' }
  }

  const payload = verifyAndDecodeToken(token)
  if (!payload) {
    return { error: 'This invite link is invalid or has expired. Ask your chef for a new one.' }
  }

  if (email.toLowerCase() !== payload.email) {
    return { error: 'Email does not match the invitation. Use the email your chef has on file.' }
  }

  // Verify the staff member still exists and belongs to the right tenant
  const [member] = await db
    .select({ id: staffMembers.id, chefId: staffMembers.chefId })
    .from(staffMembers)
    .where(and(eq(staffMembers.id, payload.memberId), eq(staffMembers.chefId, payload.tenantId)))
    .limit(1)

  if (!member) {
    return { error: 'This staff position no longer exists. Contact your chef.' }
  }

  // Check for existing auth user (multi-role support)
  const [existingUser] = await db
    .select({ id: authUsers.id })
    .from(authUsers)
    .where(eq(authUsers.email, email.toLowerCase()))
    .limit(1)

  let authUserId: string

  if (existingUser) {
    authUserId = existingUser.id
  } else {
    // Create new auth user
    const hashedPassword = await bcrypt.hash(password, 10)
    authUserId = crypto.randomUUID()

    await db.insert(authUsers).values({
      id: authUserId,
      email: email.toLowerCase(),
      encryptedPassword: hashedPassword,
      emailConfirmedAt: new Date(), // invite is the trust signal
      aud: 'authenticated',
      role: 'authenticated',
      createdAt: new Date(),
      updatedAt: new Date(),
    })
  }

  // Check if staff role already exists for this entity
  const [existingRole] = await db
    .select({ id: userRoles.id })
    .from(userRoles)
    .where(
      and(
        eq(userRoles.authUserId, authUserId),
        eq(userRoles.role, 'staff'),
        eq(userRoles.entityId, member.id)
      )
    )
    .limit(1)

  if (!existingRole) {
    await db.insert(userRoles).values({
      authUserId,
      role: 'staff',
      entityId: member.id,
    })
  }

  // Update staff member status to active
  await db
    .update(staffMembers)
    .set({ status: 'active', updatedAt: new Date().toISOString() })
    .where(eq(staffMembers.id, member.id))

  const acceptanceResult = await recordPolicyAcceptancesForSubject({
    role: 'staff',
    userId: authUserId,
    tenantId: member.chefId,
    subjectId: member.id,
    source: 'auth/staff-invite-claim',
  })
  if (!acceptanceResult.success || acceptanceResult.warning) {
    console.warn('[claimStaffInvite] Legal acceptance persistence warning', {
      memberId: member.id,
      warning: acceptanceResult.warning,
    })
  }

  return { success: true }
}
