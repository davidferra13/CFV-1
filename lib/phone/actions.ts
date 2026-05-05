'use server'

import { requireChef } from '@/lib/auth/get-user'
import { db } from '@/lib/db'
import { phoneNumbers } from '@/lib/db/schema/schema'
import { and, eq, sql } from 'drizzle-orm'
import { normalizePhone } from './normalize'
import { revalidateTag } from 'next/cache'
import { randomInt } from 'crypto'
import { hash, compare } from 'bcryptjs'

// ── Helpers (not exported, not 'use server') ──────────────────────────

function generateVerificationCode(): string {
  return String(randomInt(100000, 999999))
}

async function hashCode(code: string): Promise<string> {
  return hash(code, 10)
}

async function sendVerificationSms(to: string, code: string): Promise<void> {
  const { sendSms } = await import('@/lib/sms/send')
  const body = `Your ChefFlow verification code is: ${code}. Expires in 5 minutes.`
  const result = await sendSms(to, body)
  if (result === 'failed') {
    throw new Error('Failed to send verification SMS')
  }
}

// ── Server Actions ────────────────────────────────────────────────────

export async function addPhoneNumber(input: {
  entityType: 'chef' | 'client' | 'staff' | 'vendor' | 'venue'
  entityId: string
  phone: string
  label?: string
  type?: 'primary' | 'secondary' | 'emergency'
}): Promise<{ success: boolean; phoneNumberId?: string; error?: string }> {
  const user = await requireChef()
  if (!user.tenantId) return { success: false, error: 'No tenant' }

  // Tenant scoping: chef can only add phones for entities they own
  // For chef entity type, entityId must match tenantId
  if (input.entityType === 'chef' && input.entityId !== user.tenantId) {
    return { success: false, error: 'Unauthorized' }
  }

  const normalized = normalizePhone(input.phone)
  if (!normalized) {
    return { success: false, error: 'Invalid phone number' }
  }

  const code = generateVerificationCode()
  const codeHash = await hashCode(code)
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString()

  try {
    const [inserted] = await db
      .insert(phoneNumbers)
      .values({
        entityType: input.entityType,
        entityId: input.entityId,
        phoneE164: normalized.e164,
        phoneDisplay: normalized.display,
        label: input.label ?? 'mobile',
        type: input.type ?? 'primary',
        canText: normalized.canText,
        verified: false,
        verificationCodeHash: codeHash,
        verificationExpiresAt: expiresAt,
        verificationAttempts: 0,
      })
      .onConflictDoNothing()
      .returning({ id: phoneNumbers.id })

    if (!inserted) {
      return { success: false, error: 'Phone number already registered for this entity' }
    }

    // Send verification SMS (non-blocking failure)
    try {
      await sendVerificationSms(normalized.e164, code)
    } catch (smsErr) {
      console.error('[addPhoneNumber] Verification SMS failed:', smsErr)
      // Phone is saved but unverified; user can resend
    }

    revalidateTag(`phone-numbers-${input.entityType}-${input.entityId}`)

    return { success: true, phoneNumberId: inserted.id }
  } catch (err) {
    console.error('[addPhoneNumber] Insert failed:', err)
    return { success: false, error: 'Failed to add phone number' }
  }
}

export async function verifyPhoneNumber(
  phoneNumberId: string,
  code: string
): Promise<{ success: boolean; error?: string }> {
  const user = await requireChef()
  if (!user.tenantId) return { success: false, error: 'No tenant' }

  // Fetch the phone record
  const [record] = await db
    .select()
    .from(phoneNumbers)
    .where(eq(phoneNumbers.id, phoneNumberId))
    .limit(1)

  if (!record) return { success: false, error: 'Phone number not found' }

  // Tenant scoping: verify ownership
  if (record.entityType === 'chef' && record.entityId !== user.tenantId) {
    return { success: false, error: 'Unauthorized' }
  }

  if (record.verified) {
    return { success: true }
  }

  // Check attempts (max 3)
  if ((record.verificationAttempts ?? 0) >= 3) {
    return { success: false, error: 'Too many attempts. Request a new code.' }
  }

  // Check expiry
  if (!record.verificationExpiresAt || new Date(record.verificationExpiresAt) < new Date()) {
    return { success: false, error: 'Verification code expired. Request a new one.' }
  }

  // Increment attempts first
  await db
    .update(phoneNumbers)
    .set({ verificationAttempts: (record.verificationAttempts ?? 0) + 1 })
    .where(eq(phoneNumbers.id, phoneNumberId))

  // Verify code
  if (!record.verificationCodeHash) {
    return { success: false, error: 'No verification code set. Request a new one.' }
  }

  const matches = await compare(code, record.verificationCodeHash)
  if (!matches) {
    return { success: false, error: 'Invalid verification code' }
  }

  // Mark verified
  await db
    .update(phoneNumbers)
    .set({
      verified: true,
      verifiedAt: new Date().toISOString(),
      verificationCodeHash: null,
      verificationExpiresAt: null,
      verificationAttempts: 0,
      updatedAt: new Date().toISOString(),
    })
    .where(eq(phoneNumbers.id, phoneNumberId))

  revalidateTag(`phone-numbers-${record.entityType}-${record.entityId}`)

  return { success: true }
}

export async function removePhoneNumber(
  phoneNumberId: string
): Promise<{ success: boolean; error?: string }> {
  const user = await requireChef()
  if (!user.tenantId) return { success: false, error: 'No tenant' }

  const [record] = await db
    .select()
    .from(phoneNumbers)
    .where(eq(phoneNumbers.id, phoneNumberId))
    .limit(1)

  if (!record) return { success: false, error: 'Phone number not found' }

  // Tenant scoping
  if (record.entityType === 'chef' && record.entityId !== user.tenantId) {
    return { success: false, error: 'Unauthorized' }
  }

  // Prevent removing the sole verified number
  if (record.verified) {
    const otherVerified = await db
      .select({ id: phoneNumbers.id })
      .from(phoneNumbers)
      .where(
        and(
          eq(phoneNumbers.entityType, record.entityType),
          eq(phoneNumbers.entityId, record.entityId),
          eq(phoneNumbers.verified, true),
          sql`${phoneNumbers.id} != ${phoneNumberId}`
        )
      )
      .limit(1)

    if (otherVerified.length === 0) {
      return { success: false, error: 'Cannot remove the only verified phone number' }
    }
  }

  await db.delete(phoneNumbers).where(eq(phoneNumbers.id, phoneNumberId))

  revalidateTag(`phone-numbers-${record.entityType}-${record.entityId}`)

  return { success: true }
}

export async function resendVerificationCode(
  phoneNumberId: string
): Promise<{ success: boolean; error?: string }> {
  const user = await requireChef()
  if (!user.tenantId) return { success: false, error: 'No tenant' }

  const [record] = await db
    .select()
    .from(phoneNumbers)
    .where(eq(phoneNumbers.id, phoneNumberId))
    .limit(1)

  if (!record) return { success: false, error: 'Phone number not found' }

  // Tenant scoping
  if (record.entityType === 'chef' && record.entityId !== user.tenantId) {
    return { success: false, error: 'Unauthorized' }
  }

  if (record.verified) {
    return { success: true } // Already verified, nothing to do
  }

  // Rate limit: max 3 resends per 10 minutes
  // Check if verification_expires_at was recently set (within 2 minutes = likely a resend)
  // Simple approach: count recent resets by checking if code was set recently
  if (record.verificationExpiresAt) {
    const expiresAt = new Date(record.verificationExpiresAt)
    const codeSetAt = new Date(expiresAt.getTime() - 5 * 60 * 1000)
    const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000)
    if (codeSetAt > twoMinutesAgo) {
      return { success: false, error: 'Please wait before requesting another code' }
    }
  }

  const code = generateVerificationCode()
  const codeHash = await hashCode(code)
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString()

  await db
    .update(phoneNumbers)
    .set({
      verificationCodeHash: codeHash,
      verificationExpiresAt: expiresAt,
      verificationAttempts: 0,
      updatedAt: new Date().toISOString(),
    })
    .where(eq(phoneNumbers.id, phoneNumberId))

  try {
    await sendVerificationSms(record.phoneE164, code)
  } catch (smsErr) {
    console.error('[resendVerificationCode] SMS failed:', smsErr)
    return { success: false, error: 'Failed to send SMS' }
  }

  return { success: true }
}

export async function getPhoneNumbers(
  entityType: string,
  entityId: string
): Promise<{
  success: boolean
  data?: Array<{
    id: string
    phoneE164: string
    phoneDisplay: string
    label: string | null
    type: string | null
    canText: boolean | null
    verified: boolean | null
    verifiedAt: string | null
    createdAt: string
  }>
  error?: string
}> {
  const user = await requireChef()
  if (!user.tenantId) return { success: false, error: 'No tenant' }

  // Tenant scoping
  if (entityType === 'chef' && entityId !== user.tenantId) {
    return { success: false, error: 'Unauthorized' }
  }

  const rows = await db
    .select({
      id: phoneNumbers.id,
      phoneE164: phoneNumbers.phoneE164,
      phoneDisplay: phoneNumbers.phoneDisplay,
      label: phoneNumbers.label,
      type: phoneNumbers.type,
      canText: phoneNumbers.canText,
      verified: phoneNumbers.verified,
      verifiedAt: phoneNumbers.verifiedAt,
      createdAt: phoneNumbers.createdAt,
    })
    .from(phoneNumbers)
    .where(and(eq(phoneNumbers.entityType, entityType), eq(phoneNumbers.entityId, entityId)))

  return { success: true, data: rows }
}

export async function setPrimaryPhone(
  phoneNumberId: string
): Promise<{ success: boolean; error?: string }> {
  const user = await requireChef()
  if (!user.tenantId) return { success: false, error: 'No tenant' }

  const [record] = await db
    .select()
    .from(phoneNumbers)
    .where(eq(phoneNumbers.id, phoneNumberId))
    .limit(1)

  if (!record) return { success: false, error: 'Phone number not found' }

  // Tenant scoping
  if (record.entityType === 'chef' && record.entityId !== user.tenantId) {
    return { success: false, error: 'Unauthorized' }
  }

  // Unset all other primary phones for this entity
  await db
    .update(phoneNumbers)
    .set({ type: 'secondary', updatedAt: new Date().toISOString() })
    .where(
      and(
        eq(phoneNumbers.entityType, record.entityType),
        eq(phoneNumbers.entityId, record.entityId),
        eq(phoneNumbers.type, 'primary'),
        sql`${phoneNumbers.id} != ${phoneNumberId}`
      )
    )

  // Set this one as primary
  await db
    .update(phoneNumbers)
    .set({ type: 'primary', updatedAt: new Date().toISOString() })
    .where(eq(phoneNumbers.id, phoneNumberId))

  revalidateTag(`phone-numbers-${record.entityType}-${record.entityId}`)

  return { success: true }
}
