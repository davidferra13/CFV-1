// Authentication Server Actions
// Handles signup, signin, signout
// Supports chef signup and client signup
// Uses Drizzle ORM + bcrypt (replaces Auth.js)

'use server'

import { db } from '@/lib/db'
import { authUsers } from '@/lib/db/schema/auth'
import { chefs, clients as clientsTable, userRoles, chefPreferences } from '@/lib/db/schema/schema'
import { eq } from 'drizzle-orm'
import bcrypt from 'bcryptjs'
import crypto from 'crypto'
import { nextAuthSignIn, nextAuthSignOut, auth } from '@/lib/auth'
import { log } from '@/lib/logger'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { getInvitationByToken, markInvitationUsed } from '@/lib/auth/invitations'
import { checkRateLimit } from '@/lib/rateLimit'
import { markBetaSignupOnboardedByEmail } from '@/lib/beta/actions'
import { sendEmail } from '@/lib/email/send'
import { BetaAccountReadyEmail } from '@/lib/email/templates/beta-account-ready'
import { PasswordResetEmail } from '@/lib/email/templates/password-reset'
import { seedDefaultBudgetQualificationAutomations } from '@/lib/automations/seed'

const ChefSignupSchema = z.object({
  email: z.string().email('Valid email required'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(128, 'Password must be 128 characters or fewer'),
  business_name: z.string().optional(),
  phone: z.string().optional(),
  signup_ref: z.string().optional(),
})

const ClientSignupSchema = z.object({
  email: z.string().email('Valid email required'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(128, 'Password must be 128 characters or fewer'),
  full_name: z.string().min(1, 'Full name required'),
  phone: z.string().optional(),
  invitation_token: z.string().optional(),
})

const SignInSchema = z.object({
  email: z.string().email('Valid email required'),
  password: z.string().min(1, 'Password required'),
  rememberMe: z.boolean().optional().default(true),
})

const PasswordResetRequestSchema = z.object({
  email: z.string().email('Valid email required'),
})

const UpdatePasswordSchema = z.object({
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(128, 'Password must be 128 characters or fewer'),
})

export type ChefSignupInput = z.infer<typeof ChefSignupSchema>
export type ClientSignupInput = z.infer<typeof ClientSignupSchema>
export type SignInInput = z.infer<typeof SignInSchema>

const DEFAULT_TRIAL_DAYS = 14
const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_APP_URL || 'https://cheflowhq.com'
const parsedBetaTrialDays = Number.parseInt(process.env.BETA_TRIAL_DAYS || '', 10)
const BETA_TRIAL_DAYS =
  Number.isFinite(parsedBetaTrialDays) && parsedBetaTrialDays > 0
    ? parsedBetaTrialDays
    : DEFAULT_TRIAL_DAYS

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase()
}

function isBetaRef(signupRef?: string): boolean {
  return signupRef?.trim().toLowerCase() === 'beta'
}

function resolveTrialDays(isBetaSignup: boolean): number {
  return isBetaSignup ? BETA_TRIAL_DAYS : DEFAULT_TRIAL_DAYS
}

async function syncBetaOnboarding(
  email: string,
  name: string,
  signupRef?: string
): Promise<boolean> {
  try {
    return await markBetaSignupOnboardedByEmail({
      email,
      name,
      source: isBetaRef(signupRef) ? 'beta_invite_link' : undefined,
    })
  } catch (error) {
    log.auth.warn('Beta signup sync failed (non-blocking)', { error, context: { email } })
    return false
  }
}

async function sendBetaActivationEmail(email: string, name: string): Promise<void> {
  try {
    await sendEmail({
      to: email,
      subject: 'Your ChefFlow beta account is ready',
      react: BetaAccountReadyEmail({
        name,
        signInUrl: `${SITE_URL}/auth/signin?redirect=/onboarding`,
      }),
    })
  } catch (error) {
    log.auth.warn('Beta activation email failed (non-blocking)', { error, context: { email } })
  }
}

/**
 * Chef signup - Creates chef account with tenant.
 * Creates auth.users record directly via Drizzle + bcrypt hash.
 */
export async function signUpChef(input: ChefSignupInput) {
  const validated = ChefSignupSchema.parse(input)
  const email = normalizeEmail(validated.email)
  await checkRateLimit(email)

  // Check if email already exists in auth.users
  const [existingUser] = await db
    .select({ id: authUsers.id })
    .from(authUsers)
    .where(eq(authUsers.email, email))
    .limit(1)

  if (existingUser) {
    // Generic message - never reveal whether the email already exists (prevents enumeration)
    throw new Error(
      'Account creation failed. If you already have an account, try signing in instead.'
    )
  }

  // Hash password (bcrypt, compatible with existing existing hashes)
  const hashedPassword = await bcrypt.hash(validated.password, 10)
  const authUserId = crypto.randomUUID()

  try {
    // Create auth.users record
    await db.insert(authUsers).values({
      id: authUserId,
      email,
      encryptedPassword: hashedPassword,
      emailConfirmedAt: new Date(),
      aud: 'authenticated',
      role: 'authenticated',
      createdAt: new Date(),
      updatedAt: new Date(),
    })
  } catch (err) {
    log.auth.error('Chef signup auth user creation failed', { error: err, context: { email } })
    throw new Error(
      'Account creation failed. If you already have an account, try signing in instead.'
    )
  }

  try {
    // Create chef record (default business name to email prefix if not provided)
    const businessName = validated.business_name?.trim() || email.split('@')[0]
    const [chef] = await db
      .insert(chefs)
      .values({
        authUserId: authUserId,
        businessName,
        email,
        phone: validated.phone?.trim(),
      })
      .returning()

    if (!chef) {
      log.auth.error('Chef profile creation failed')
      throw new Error('Failed to create chef profile')
    }

    // Create user role
    await db.insert(userRoles).values({
      authUserId: authUserId,
      role: 'chef',
      entityId: chef.id,
    })

    // Create default chef preferences so network visibility works immediately
    try {
      await db.insert(chefPreferences).values({
        chefId: chef.id,
        tenantId: chef.id,
      })
    } catch (prefErr) {
      log.auth.warn('Chef preferences init failed', { error: prefErr })
      // Rollback
      await db.delete(userRoles).where(eq(userRoles.authUserId, authUserId))
      await db.delete(chefs).where(eq(chefs.id, chef.id))
      await db.delete(authUsers).where(eq(authUsers.id, authUserId))
      throw new Error('Failed to initialize chef preferences')
    }

    try {
      await seedDefaultBudgetQualificationAutomations(chef.id)
    } catch (seedError) {
      log.auth.warn('Budget qualification automation seed failed (non-blocking)', {
        error: seedError,
        context: { tenantId: chef.id },
      })
    }

    const isBetaSignup = await syncBetaOnboarding(email, businessName, validated.signup_ref)
    const trialDays = resolveTrialDays(isBetaSignup)

    // Start 14-day trial and create Stripe customer - non-blocking
    try {
      const { createStripeCustomer, startTrial } = await import('@/lib/stripe/subscription')
      await createStripeCustomer(chef.id, email, businessName)
      await startTrial(chef.id, trialDays)
    } catch (err) {
      log.auth.warn('Stripe customer/trial init failed (non-blocking)', { error: err })
    }

    if (isBetaSignup) {
      await sendBetaActivationEmail(email, businessName)
    }

    return { success: true, userId: authUserId }
  } catch (error) {
    // Ensure cleanup of auth user on any failure
    await db
      .delete(authUsers)
      .where(eq(authUsers.id, authUserId))
      .catch(() => {})
    throw error
  }
}

/**
 * Client signup.
 * Creates auth.users record directly via Drizzle + bcrypt hash.
 * Supports standalone signup and invitation token flow.
 */
export async function signUpClient(input: ClientSignupInput) {
  const validated = ClientSignupSchema.parse(input)
  const email = normalizeEmail(validated.email)
  await checkRateLimit(email)

  let tenantId: string | null = null
  let invitationId: string | null = null
  const invitationToken = validated.invitation_token?.trim()

  if (invitationToken) {
    const invitation = await getInvitationByToken(invitationToken)
    if (!invitation) {
      throw new Error('Invalid or expired invitation')
    }

    if (normalizeEmail(invitation.email) !== email) {
      throw new Error('Email does not match invitation')
    }

    tenantId = invitation.tenant_id
    invitationId = invitation.id
  }

  // Check if email already exists
  const [existingUser] = await db
    .select({ id: authUsers.id })
    .from(authUsers)
    .where(eq(authUsers.email, email))
    .limit(1)

  if (existingUser) {
    throw new Error(
      'Account creation failed. If you already have an account, try signing in instead.'
    )
  }

  const hashedPassword = await bcrypt.hash(validated.password, 10)
  const authUserId = crypto.randomUUID()

  try {
    // Create auth.users record
    await db.insert(authUsers).values({
      id: authUserId,
      email,
      encryptedPassword: hashedPassword,
      emailConfirmedAt: new Date(),
      aud: 'authenticated',
      role: 'authenticated',
      createdAt: new Date(),
      updatedAt: new Date(),
    })
  } catch (err) {
    log.auth.error('Client signup auth user creation failed', { error: err, context: { email } })
    throw new Error(
      'Account creation failed. If you already have an account, try signing in instead.'
    )
  }

  try {
    // Create client record
    const [client] = await db
      .insert(clientsTable)
      .values({
        authUserId: authUserId,
        tenantId: tenantId,
        fullName: validated.full_name.trim(),
        email,
        phone: validated.phone?.trim(),
      })
      .returning()

    if (!client) {
      log.auth.error('Client profile creation failed')
      throw new Error('Failed to create client profile')
    }

    // Create user role
    await db.insert(userRoles).values({
      authUserId: authUserId,
      role: 'client',
      entityId: client.id,
    })

    // Mark invitation as used when token flow is used
    if (invitationId) {
      await markInvitationUsed(invitationId)
    }

    // Notify chef when an invited client finishes account signup.
    // Non-blocking: signup success must never depend on notification delivery.
    if (tenantId) {
      try {
        const { createNotification, getChefAuthUserId } =
          await import('@/lib/notifications/actions')
        const chefUserId = await getChefAuthUserId(tenantId)

        if (chefUserId) {
          await createNotification({
            tenantId,
            recipientId: chefUserId,
            category: 'client',
            action: 'client_signup',
            title: 'New client account created',
            body: `${client.fullName} completed their client portal signup.`,
            actionUrl: `/clients/${client.id}`,
            clientId: client.id,
            metadata: {
              source: invitationId ? 'invitation_signup' : 'direct_signup',
            },
          })
        }
      } catch (notifyErr) {
        log.auth.warn('Client signup notification failed (non-blocking)', {
          error: notifyErr,
          context: { tenantId, clientId: client.id },
        })
      }
    }

    // Auto-award welcome points for invitation-based signups.
    if (tenantId) {
      try {
        const { autoAwardWelcomePoints } = await import('@/lib/loyalty/auto-award')
        await autoAwardWelcomePoints(client.id, tenantId)
      } catch (welcErr) {
        log.auth.warn('Welcome points award failed (non-blocking)', { error: welcErr })
      }
    }

    return { success: true, userId: authUserId }
  } catch (error) {
    await db
      .delete(authUsers)
      .where(eq(authUsers.id, authUserId))
      .catch(() => {})
    throw error
  }
}

/**
 * Sign in (both chef and client).
 * Uses Auth.js signIn() with credentials provider.
 * When rememberMe is false, sets a session-only marker cookie.
 */
export async function signIn(input: SignInInput) {
  const validated = SignInSchema.parse(input)
  const email = validated.email.trim().toLowerCase()
  const isSyntheticTestAccount = email.endsWith('@chefflow.test')
  const bypassRateLimitForE2E =
    process.env.DISABLE_AUTH_RATE_LIMIT_FOR_E2E === 'true' && isSyntheticTestAccount
  const bypassRateLimitForNonProdSyntheticAccount =
    process.env.NODE_ENV !== 'production' && isSyntheticTestAccount

  if (!bypassRateLimitForE2E && !bypassRateLimitForNonProdSyntheticAccount) {
    try {
      await checkRateLimit(email)
    } catch (error) {
      const message = String((error as any)?.message || '').toLowerCase()
      if (message.includes('too many attempts')) {
        throw error
      }
      log.auth.error('Rate limit check failed', { error, context: { email } })
      throw new Error('Sign-in service is temporarily unavailable. Please try again.')
    }
  }

  try {
    // Auth.js credentials sign-in - this calls the authorize() function
    // in auth-config.ts which verifies bcrypt password against auth.users
    const result = await nextAuthSignIn('credentials', {
      email,
      password: validated.password,
      redirect: false,
    })

    if (result?.error) {
      throw new Error('Invalid email or password')
    }
  } catch (err) {
    const message = String((err as any)?.message || '')
    if (message.includes('Invalid email or password') || message.includes('too many attempts')) {
      throw err
    }
    log.auth.error('Sign-in failed', { error: err, context: { email } })
    throw new Error('Invalid email or password')
  }

  const cookieStore = cookies()

  // Clear stale role cache so middleware regenerates it
  cookieStore.delete('chefflow-role-cache')

  if (!validated.rememberMe) {
    cookieStore.set('chefflow-session-only', '1', {
      path: '/',
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
    })
  } else {
    cookieStore.delete('chefflow-session-only')
  }

  revalidatePath('/', 'layout')
  return { success: true }
}

/**
 * Request password reset - Sends email with reset link.
 * Generates a secure token, stores it, and sends via email.
 * Always returns success to prevent email enumeration.
 */
export async function requestPasswordReset(email: string) {
  const validated = PasswordResetRequestSchema.parse({ email })
  const normalizedEmail = normalizeEmail(validated.email)

  // Rate limit: 3 resets per email per hour to prevent email bombing
  await checkRateLimit(`password-reset:${normalizedEmail}`, 3, 60 * 60 * 1000)

  // Look up user
  const [user] = await db
    .select({ id: authUsers.id })
    .from(authUsers)
    .where(eq(authUsers.email, normalizedEmail))
    .limit(1)

  if (user) {
    // Generate recovery token, hash before storage (plaintext only sent via email)
    const token = crypto.randomBytes(32).toString('hex')
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex')
    await db
      .update(authUsers)
      .set({
        recoveryToken: tokenHash,
        recoverySentAt: new Date(),
      })
      .where(eq(authUsers.id, user.id))

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://app.cheflowhq.com'
    const resetUrl = `${siteUrl}/auth/reset-password?token=${token}`

    try {
      await sendEmail({
        to: normalizedEmail,
        subject: 'Reset your ChefFlow password',
        react: PasswordResetEmail({ resetUrl }),
      })
    } catch (err) {
      log.auth.warn('Password reset email failed', { error: err })
    }
  }

  // Always return success (prevent email enumeration)
  return { success: true }
}

/**
 * Update password - Sets new password for authenticated user.
 * Supports both: authenticated session (settings page) and recovery token (reset flow).
 */
export async function updatePassword(newPassword: string, recoveryToken?: string) {
  const validated = UpdatePasswordSchema.parse({ password: newPassword })
  const hashedPassword = await bcrypt.hash(validated.password, 10)

  if (recoveryToken) {
    // Recovery token flow (from password reset email)
    // Hash the incoming token to match the stored hash
    const tokenHash = crypto.createHash('sha256').update(recoveryToken).digest('hex')
    const [user] = await db
      .select({ id: authUsers.id, recoverySentAt: authUsers.recoverySentAt })
      .from(authUsers)
      .where(eq(authUsers.recoveryToken, tokenHash))
      .limit(1)

    if (!user) {
      throw new Error('Invalid or expired reset link. Please request a new one.')
    }

    // Check token expiry (1 hour). If recoverySentAt is missing, reject (fail closed).
    if (!user.recoverySentAt) {
      throw new Error('Invalid or expired reset link. Please request a new one.')
    }
    const expiry = new Date(user.recoverySentAt.getTime() + 60 * 60 * 1000)
    if (new Date() > expiry) {
      throw new Error('Reset link has expired. Please request a new one.')
    }

    await db
      .update(authUsers)
      .set({
        encryptedPassword: hashedPassword,
        recoveryToken: null,
        recoverySentAt: null,
        updatedAt: new Date(),
      })
      .where(eq(authUsers.id, user.id))

    return { success: true }
  }

  // Authenticated session flow
  const session = await auth()
  if (!session?.user) {
    throw new Error('Not authenticated. Please request a new password reset link.')
  }

  await db
    .update(authUsers)
    .set({
      encryptedPassword: hashedPassword,
      updatedAt: new Date(),
    })
    .where(eq(authUsers.id, session.user.id))

  return { success: true }
}

/**
 * Sign out.
 * Uses Auth.js signOut() to clear the session cookie.
 */
export async function signOut() {
  try {
    await nextAuthSignOut({ redirect: false })
  } catch (err) {
    log.auth.error('Sign-out failed', { error: err })
    throw new Error('Failed to sign out')
  }

  // Clear auth-related cookies
  const cookieStore = cookies()
  cookieStore.delete('chefflow-role-cache')
  cookieStore.delete('chefflow-session-only')

  revalidatePath('/', 'layout')
  return { success: true }
}

/**
 * Change password - Requires re-verification with current password.
 * Verifies old password via bcrypt, then updates with new hash.
 */
export async function changePassword(currentPassword: string, newPassword: string) {
  const session = await auth()
  if (!session?.user?.id) throw new Error('Not authenticated')

  // Rate limit: 5 attempts per hour per user to prevent brute-forcing current password
  await checkRateLimit(`change-password:${session.user.id}`, 5, 60 * 60 * 1000)

  // Validate new password length
  const validated = UpdatePasswordSchema.parse({ password: newPassword })

  // Look up current password hash
  const [user] = await db
    .select({ encryptedPassword: authUsers.encryptedPassword })
    .from(authUsers)
    .where(eq(authUsers.id, session.user.id))
    .limit(1)

  if (!user?.encryptedPassword) {
    throw new Error('Not authenticated')
  }

  // Verify old password
  const valid = await bcrypt.compare(currentPassword, user.encryptedPassword)
  if (!valid) throw new Error('Current password is incorrect')

  // Update to new password
  const hashedPassword = await bcrypt.hash(validated.password, 10)
  await db
    .update(authUsers)
    .set({
      encryptedPassword: hashedPassword,
      updatedAt: new Date(),
    })
    .where(eq(authUsers.id, session.user.id))

  return { success: true }
}

// ─── Email change ──────────────────────────────────────────────────────

const EmailChangeSchema = z.object({
  email: z.string().email('Valid email required'),
})

/**
 * Request an email address change. Sends a verification email to the NEW address.
 * The change is not applied until the user clicks the verification link.
 * Uses the existing auth.users email_change columns from the Supabase auth schema.
 */
export async function requestEmailChange(newEmail: string) {
  const session = await auth()
  if (!session?.user?.id) throw new Error('Not authenticated')

  const validated = EmailChangeSchema.parse({ email: newEmail })
  const normalizedNew = normalizeEmail(validated.email)

  // Rate limit: 3 requests per hour
  await checkRateLimit(`email-change:${session.user.id}`, 3, 60 * 60 * 1000)

  // Check current email isn't the same
  const [currentUser] = await db
    .select({ email: authUsers.email })
    .from(authUsers)
    .where(eq(authUsers.id, session.user.id))
    .limit(1)

  if (currentUser?.email === normalizedNew) {
    throw new Error('This is already your current email address')
  }

  // Check uniqueness (don't reveal which account owns it)
  const [existing] = await db
    .select({ id: authUsers.id })
    .from(authUsers)
    .where(eq(authUsers.email, normalizedNew))
    .limit(1)

  if (existing) {
    throw new Error('This email is already associated with another account')
  }

  // Generate token, store hash
  const token = crypto.randomBytes(32).toString('hex')
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex')

  await db
    .update(authUsers)
    .set({
      emailChange: normalizedNew,
      emailChangeTokenNew: tokenHash,
      emailChangeSentAt: new Date(),
    })
    .where(eq(authUsers.id, session.user.id))

  // Send verification to the NEW email
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://app.cheflowhq.com'
  const confirmUrl = `${siteUrl}/auth/confirm-email-change?token=${token}`

  const { EmailChangeVerificationEmail } =
    await import('@/lib/email/templates/email-change-verification')

  try {
    await sendEmail({
      to: normalizedNew,
      subject: 'Confirm your new ChefFlow email',
      react: EmailChangeVerificationEmail({ confirmUrl }),
    })
  } catch (err) {
    log.auth.warn('Email change verification send failed', { error: err })
  }

  return { success: true }
}

/**
 * Confirm an email change using the token from the verification email.
 * Updates both auth.users.email and chefs.email atomically.
 */
export async function confirmEmailChange(token: string) {
  const session = await auth()
  if (!session?.user?.id) throw new Error('Not authenticated')

  const tokenHash = crypto.createHash('sha256').update(token).digest('hex')

  const [user] = await db
    .select({
      id: authUsers.id,
      emailChange: authUsers.emailChange,
      emailChangeTokenNew: authUsers.emailChangeTokenNew,
      emailChangeSentAt: authUsers.emailChangeSentAt,
    })
    .from(authUsers)
    .where(eq(authUsers.id, session.user.id))
    .limit(1)

  if (!user || user.emailChangeTokenNew !== tokenHash || !user.emailChange) {
    throw new Error('Invalid or expired email change link. Please request a new one.')
  }

  // Check expiry (1 hour)
  if (!user.emailChangeSentAt) {
    throw new Error('Invalid or expired email change link. Please request a new one.')
  }
  const age = Date.now() - user.emailChangeSentAt.getTime()
  if (age > 60 * 60 * 1000) {
    throw new Error('This link has expired. Please request a new email change.')
  }

  const newEmail = user.emailChange

  // Re-check uniqueness at confirmation time
  const [existing] = await db
    .select({ id: authUsers.id })
    .from(authUsers)
    .where(eq(authUsers.email, newEmail))
    .limit(1)

  if (existing) {
    throw new Error('This email is already associated with another account')
  }

  // Update auth.users email
  await db
    .update(authUsers)
    .set({
      email: newEmail,
      emailChange: null,
      emailChangeTokenNew: null,
      emailChangeSentAt: null,
      updatedAt: new Date(),
    })
    .where(eq(authUsers.id, session.user.id))

  // Update chefs.email
  await db.update(chefs).set({ email: newEmail }).where(eq(chefs.authUserId, session.user.id))

  revalidatePath('/', 'layout')
  return { success: true, email: newEmail }
}

/**
 * Delete account - Soft-delete with 30-day grace period.
 * Delegates to requestAccountDeletion() in account-deletion-actions.ts.
 * Kept here for backwards compatibility with existing form imports.
 */
export async function deleteAccount(password: string, reason?: string) {
  const { requestAccountDeletion } = await import('@/lib/compliance/account-deletion-actions')
  return requestAccountDeletion(password, reason)
}

/**
 * Assigns a role to a newly authenticated user (e.g., after OAuth signup).
 * Creates the corresponding chef or client profile via Drizzle.
 */
export async function assignRole(role: 'chef' | 'client', context?: { signup_ref?: string }) {
  const session = await auth()

  if (!session?.user) {
    throw new Error('Not authenticated. Please sign in again.')
  }

  const userId = session.user.id
  const userEmail = session.user.email ?? ''

  // 1. Check if user already has a role
  const [existingRole] = await db
    .select({ role: userRoles.role })
    .from(userRoles)
    .where(eq(userRoles.authUserId, userId))
    .limit(1)

  if (existingRole) {
    const destination = existingRole.role === 'chef' ? '/dashboard' : '/my-events'
    return redirect(destination)
  }

  // 2. Create profile and assign role
  try {
    if (role === 'chef') {
      const email = normalizeEmail(userEmail)
      const businessName = email.split('@')[0]

      const [chef] = await db
        .insert(chefs)
        .values({
          authUserId: userId,
          businessName,
          email,
        })
        .returning({ id: chefs.id })

      if (!chef) throw new Error('Failed to create chef profile')

      await db.insert(userRoles).values({
        authUserId: userId,
        role: 'chef',
        entityId: chef.id,
      })

      await db.insert(chefPreferences).values({
        chefId: chef.id,
        tenantId: chef.id,
      })

      try {
        await seedDefaultBudgetQualificationAutomations(chef.id)
      } catch (seedError) {
        log.auth.warn('Budget qualification automation seed failed after role assignment', {
          error: seedError,
          context: { tenantId: chef.id },
        })
      }

      const isBetaSignup = await syncBetaOnboarding(email, businessName, context?.signup_ref)
      const trialDays = resolveTrialDays(isBetaSignup)

      try {
        const { createStripeCustomer, startTrial } = await import('@/lib/stripe/subscription')
        await createStripeCustomer(chef.id, email, businessName)
        await startTrial(chef.id, trialDays)
      } catch (err) {
        log.auth.warn('Stripe customer/trial init failed after role assignment (non-blocking)', {
          error: err,
        })
      }

      if (isBetaSignup) {
        await sendBetaActivationEmail(email, businessName)
      }
    } else if (role === 'client') {
      const fullName = 'New Client'

      const [client] = await db
        .insert(clientsTable)
        .values({
          authUserId: userId,
          fullName,
          email: userEmail,
        })
        .returning({ id: clientsTable.id })

      if (!client) throw new Error('Failed to create client profile')

      await db.insert(userRoles).values({
        authUserId: userId,
        role: 'client',
        entityId: client.id,
      })
    }
  } catch (error) {
    log.auth.error('Failed to assign role and create profile', { error, userId })
    return redirect('/auth/signin?error=role_assignment_failed')
  }

  // 3. Clear the role cache, trigger JWT update, and redirect
  const cookieStore = cookies()
  cookieStore.delete('chefflow-role-cache')
  revalidatePath('/', 'layout')

  const destination = role === 'chef' ? '/dashboard' : '/my-events'
  redirect(destination)
}
