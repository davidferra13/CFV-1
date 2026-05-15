'use server'

import { db } from '@/lib/db'
import { vendors, userRoles } from '@/lib/db/schema/schema'
import { requireChef } from '@/lib/auth/get-user'
import { eq, and, sql } from 'drizzle-orm'
import { hashToken } from '@/lib/auth/invitations'
import { randomUUID } from 'crypto'
import { hash } from 'bcryptjs'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

export async function generateVendorInvite(vendorId: string): Promise<{
  success: true
  inviteUrl: string
}> {
  const chef = await requireChef()

  const [vendor] = await db
    .select()
    .from(vendors)
    .where(and(eq(vendors.id, vendorId), eq(vendors.chefId, chef.entityId)))
    .limit(1)

  if (!vendor) {
    throw new Error('Vendor not found')
  }

  if (!vendor.email) {
    throw new Error('Vendor must have an email address to be invited')
  }

  const token = randomUUID()
  const hashedToken = hashToken(token)

  await db.execute(
    sql`INSERT INTO vendor_invitations (tenant_id, vendor_id, email, token, expires_at, created_by)
     VALUES (${chef.entityId}, ${vendorId}, ${vendor.email}, ${hashedToken}, NOW() + INTERVAL '7 days', ${chef.authUserId})`
  )

  const inviteUrl = `${APP_URL}/auth/vendor-signup?token=${token}`

  return { success: true, inviteUrl }
}

export async function claimVendorInvite(
  token: string,
  email: string,
  password: string
): Promise<{ success: true } | { error: string }> {
  if (!token || token.length < 10) {
    return { error: 'Invalid invitation token' }
  }

  const hashedToken = hashToken(token)

  const result = await db.execute(
    sql`SELECT vi.id, vi.tenant_id, vi.vendor_id, vi.email, vi.used_at, vi.expires_at,
            v.name as vendor_name
     FROM vendor_invitations vi
     JOIN vendors v ON v.id = vi.vendor_id
     WHERE vi.token = ${hashedToken}
     LIMIT 1`
  )

  const invitation = (result as unknown as Record<string, unknown>[])[0] as
    | Record<string, unknown>
    | undefined
  if (!invitation) {
    return { error: 'Invalid or expired invitation' }
  }

  if (invitation.used_at) {
    return { error: 'This invitation has already been used' }
  }

  if (new Date(invitation.expires_at as string) < new Date()) {
    return { error: 'This invitation has expired' }
  }

  if (email.toLowerCase() !== (invitation.email as string).toLowerCase()) {
    return { error: 'Email does not match the invitation' }
  }

  try {
    const existingUser = await db.execute(
      sql`SELECT id FROM auth.users WHERE lower(email) = lower(${email}) LIMIT 1`
    )

    let authUserId: string

    const existingUserRows = existingUser as unknown as Record<string, unknown>[]
    if (existingUserRows.length > 0) {
      authUserId = existingUserRows[0].id as string
    } else {
      const hashedPassword = await hash(password, 12)
      const newUser = await db.execute(
        sql`INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, created_at, updated_at)
         VALUES (gen_random_uuid(), ${email.toLowerCase()}, ${hashedPassword}, NOW(), NOW(), NOW())
         RETURNING id`
      )
      authUserId = (newUser as unknown as Record<string, unknown>[])[0].id as string
    }

    await db.insert(userRoles).values({
      authUserId,
      role: 'vendor',
      entityId: invitation.vendor_id as string,
    })

    await db.execute(sql`UPDATE vendor_invitations SET used_at = NOW() WHERE id = ${invitation.id}`)

    return { success: true }
  } catch (e) {
    console.error('Failed to claim vendor invite:', e)
    return { error: 'Failed to create account. Please try again.' }
  }
}
