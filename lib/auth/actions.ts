// Authentication Server Actions
// Handles signup, signin, signout
// Supports chef signup and client signup

'use server'

import { createServerClient } from '@/lib/supabase/server'
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
import { seedDefaultBudgetQualificationAutomations } from '@/lib/automations/seed'
import { signRoleCookie } from '@/lib/auth/signed-cookie'

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
const ROLE_COOKIE_NAME = 'chefflow-role-cache'
const ROLE_COOKIE_MAX_AGE_SECONDS = 300
const PORTAL_DESTINATIONS = {
  chef: '/dashboard',
  client: '/my-events',
  staff: '/staff-dashboard',
  partner: '/partner/dashboard',
} as const

type PortalRole = keyof typeof PORTAL_DESTINATIONS

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase()
}

function isPortalRole(role: unknown): role is PortalRole {
  return role === 'chef' || role === 'client' || role === 'staff' || role === 'partner'
}

async function resolvePostSignInDestination(
  supabase: any,
  userId: string
): Promise<{ role: PortalRole | null; destination: string }> {
  const { data, error } = await supabase
    .from('user_roles')
    .select('role')
    .eq('auth_user_id', userId)
    .single()

  if (error) {
    if ((error as any)?.code === 'PGRST116') {
      return { role: null, destination: '/auth/role-selection' }
    }

    log.auth.warn('Post sign-in role lookup failed; falling back to landing page', {
      error,
      context: { userId },
    })
    return { role: null, destination: '/' }
  }

  if (!isPortalRole(data?.role)) {
    return { role: null, destination: '/auth/role-selection' }
  }

  return { role: data.role, destination: PORTAL_DESTINATIONS[data.role] }
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
 * Chef signup - Creates chef account with tenant
 */
export async function signUpChef(input: ChefSignupInput) {
  const validated = ChefSignupSchema.parse(input)
  const email = normalizeEmail(validated.email)
  await checkRateLimit(email)

  // Use service role for creating user and tenant atomically
  const supabase = createServerClient({ admin: true })

  // Create auth user
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email,
    password: validated.password,
    email_confirm: true,
  })

  if (authError || !authData.user) {
    log.auth.error('Chef signup auth error', { error: authError, context: { email } })
    // Generic message — never reveal whether the email already exists (prevents enumeration)
    throw new Error(
      'Account creation failed. If you already have an account, try signing in instead.'
    )
  }

  try {
    // Create chef record (default business name to email prefix if not provided)
    const businessName = validated.business_name?.trim() || email.split('@')[0]
    const { data: chef, error: chefError } = await supabase
      .from('chefs')
      .insert({
        auth_user_id: authData.user.id,
        business_name: businessName,
        email,
        phone: validated.phone?.trim(),
      })
      .select()
      .single()

    if (chefError) {
      log.auth.error('Chef profile creation failed', { error: chefError })
      // Rollback: delete auth user
      await supabase.auth.admin.deleteUser(authData.user.id)
      throw new Error('Failed to create chef profile')
    }

    // Create user role
    const { error: roleError } = await supabase.from('user_roles').insert({
      auth_user_id: authData.user.id,
      role: 'chef',
      entity_id: chef.id,
    })

    if (roleError) {
      log.auth.error('Chef role assignment failed', { error: roleError })
      // Rollback: delete chef and auth user
      await supabase.from('chefs').delete().eq('id', chef.id)
      await supabase.auth.admin.deleteUser(authData.user.id)
      throw new Error('Failed to assign role')
    }

    // Create default chef preferences so network visibility works immediately
    const { error: preferencesError } = await supabase.from('chef_preferences').insert({
      chef_id: chef.id,
      tenant_id: chef.id,
    })

    if (preferencesError) {
      log.auth.warn('Chef preferences init failed (non-blocking)', { error: preferencesError })
      await supabase.from('user_roles').delete().eq('auth_user_id', authData.user.id)
      await supabase.from('chefs').delete().eq('id', chef.id)
      await supabase.auth.admin.deleteUser(authData.user.id)
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

    // Start 14-day trial and create Stripe customer — non-blocking
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

    return { success: true, userId: authData.user.id }
  } catch (error) {
    // Ensure cleanup
    await supabase.auth.admin.deleteUser(authData.user.id)
    throw error
  }
}

/**
 * Client signup
 * Supports:
 * - standalone signup (no chef required)
 * - invitation token flow
 */
export async function signUpClient(input: ClientSignupInput) {
  const validated = ClientSignupSchema.parse(input)
  const email = normalizeEmail(validated.email)
  await checkRateLimit(email)

  let tenantId: string | null = null
  let invitationId: string | null = null
  const invitationToken = validated.invitation_token?.trim()

  if (invitationToken) {
    // Invitation path
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

  // Use service role for atomic creation
  const supabase = createServerClient({ admin: true })

  // Create auth user
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email,
    password: validated.password,
    email_confirm: true,
  })

  if (authError || !authData.user) {
    log.auth.error('Client signup auth error', {
      error: authError,
      context: { email },
    })
    // Generic message — never reveal whether the email already exists (prevents enumeration)
    throw new Error(
      'Account creation failed. If you already have an account, try signing in instead.'
    )
  }

  try {
    // Create client record
    const { data: client, error: clientError } = await supabase
      .from('clients')
      .insert({
        auth_user_id: authData.user.id,
        tenant_id: tenantId as any,
        full_name: validated.full_name.trim(),
        email,
        phone: validated.phone?.trim(),
      })
      .select()
      .single()

    if (clientError) {
      log.auth.error('Client profile creation failed', { error: clientError })
      await supabase.auth.admin.deleteUser(authData.user.id)
      throw new Error('Failed to create client profile')
    }

    // Create user role
    const { error: roleError } = await supabase.from('user_roles').insert({
      auth_user_id: authData.user.id,
      role: 'client',
      entity_id: client.id,
    })

    if (roleError) {
      log.auth.error('Client role assignment failed', { error: roleError })
      await supabase.from('clients').delete().eq('id', client.id)
      await supabase.auth.admin.deleteUser(authData.user.id)
      throw new Error('Failed to assign role')
    }

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
            body: `${client.full_name} completed their client portal signup.`,
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
    // Tenant is known at signup time only when an invitation token was used.
    // Non-blocking — welcome point failure must never break account creation.
    if (tenantId) {
      try {
        const { autoAwardWelcomePoints } = await import('@/lib/loyalty/auto-award')
        await autoAwardWelcomePoints(client.id, tenantId)
      } catch (welcErr) {
        log.auth.warn('Welcome points award failed (non-blocking)', { error: welcErr })
      }
    }

    return { success: true, userId: authData.user.id }
  } catch (error) {
    await supabase.auth.admin.deleteUser(authData.user.id)
    throw error
  }
}

/**
 * Sign in (both chef and client)
 * When rememberMe is false, sets a session-only marker cookie so the middleware
 * strips maxAge from Supabase auth cookies, making them expire when the browser closes.
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

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
  if (
    process.env.NODE_ENV === 'production' &&
    (supabaseUrl.includes('127.0.0.1') || supabaseUrl.includes('localhost'))
  ) {
    log.auth.error('Misconfigured Supabase URL in production', { context: { supabaseUrl } })
    throw new Error('Sign-in is temporarily unavailable. Please contact support.')
  }

  const supabase: any = createServerClient()

  let data: Awaited<ReturnType<typeof supabase.auth.signInWithPassword>>['data'] | null = null
  let error: Awaited<ReturnType<typeof supabase.auth.signInWithPassword>>['error'] | null = null
  try {
    const result = await supabase.auth.signInWithPassword({
      email,
      password: validated.password,
    })
    data = result.data
    error = result.error
  } catch (err) {
    log.auth.error('Sign-in transport failure', { error: err, context: { email } })
    throw new Error('Sign-in service is temporarily unavailable. Please try again.')
  }

  if (error) {
    log.auth.error('Sign-in failed', { error })
    const errorCode = String((error as any)?.code || '')
    const errorMessage = String((error as any)?.message || '').toLowerCase()
    const errorStatus = Number((error as any)?.status || 0)

    if (errorCode === 'email_not_confirmed') {
      throw new Error(
        'Your email is not confirmed. Please use Forgot password or create a new account.'
      )
    }

    const invalidCredentials =
      errorCode === 'invalid_credentials' ||
      errorMessage.includes('invalid login credentials') ||
      errorMessage.includes('invalid email or password') ||
      errorMessage.includes('invalid grant')

    if (invalidCredentials) {
      throw new Error('Invalid email or password')
    }

    const serviceUnavailable =
      errorStatus >= 500 ||
      errorMessage.includes('fetch failed') ||
      errorMessage.includes('network') ||
      errorMessage.includes('timed out') ||
      errorMessage.includes('temporarily unavailable')

    if (serviceUnavailable) {
      throw new Error('Sign-in service is temporarily unavailable. Please try again.')
    }

    throw new Error('Sign-in failed. Please try again or reset your password.')
  }

  const cookieStore = cookies()

  // Clear stale role cache so middleware regenerates it with the correct maxAge
  cookieStore.delete(ROLE_COOKIE_NAME)

  if (!validated.rememberMe) {
    // Session-only cookie (no maxAge) — cleared when browser closes.
    // Middleware uses this to strip maxAge from Supabase auth cookies too.
    cookieStore.set('chefflow-session-only', '1', {
      path: '/',
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
    })
  } else {
    // Clear the marker if it was previously set
    cookieStore.delete('chefflow-session-only')
  }

  const routing = await resolvePostSignInDestination(supabase, data.user.id)

  if (routing.role) {
    cookieStore.set(ROLE_COOKIE_NAME, await signRoleCookie(routing.role), {
      maxAge: validated.rememberMe ? ROLE_COOKIE_MAX_AGE_SECONDS : undefined,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
    })
  }

  revalidatePath('/', 'layout')
  return { success: true, user: data.user, destination: routing.destination }
}

/**
 * Request password reset - Sends email with reset link
 * Always returns success to prevent email enumeration
 */
export async function requestPasswordReset(email: string) {
  const validated = PasswordResetRequestSchema.parse({ email })

  // Rate limit: 3 resets per email per hour to prevent email bombing
  await checkRateLimit(`password-reset:${validated.email.toLowerCase()}`, 3, 60 * 60 * 1000)

  const supabase: any = createServerClient()

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'

  const { error } = await supabase.auth.resetPasswordForEmail(validated.email, {
    redirectTo: `${siteUrl}/auth/callback?next=/auth/reset-password`,
  })

  if (error) {
    log.auth.warn('Password reset email failed', { error })
    // Don't reveal whether the email exists — always return success
  }

  return { success: true }
}

/**
 * Update password - Sets new password for authenticated user
 * Requires an active session (e.g. from password recovery token exchange)
 */
export async function updatePassword(newPassword: string) {
  const validated = UpdatePasswordSchema.parse({ password: newPassword })

  const supabase: any = createServerClient()

  // Verify user is authenticated (session from recovery token exchange)
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    throw new Error('Not authenticated. Please request a new password reset link.')
  }

  const { error } = await supabase.auth.updateUser({
    password: validated.password,
  })

  if (error) {
    log.auth.error('Password update failed', { error })
    throw new Error(error.message || 'Failed to update password')
  }

  return { success: true }
}

/**
 * Sign out
 * Returns success instead of calling redirect() so callers can handle
 * navigation client-side. Using redirect() inside a server action called
 * from onClick (not a form action) causes an unhandled NEXT_REDIRECT throw.
 */
export async function signOut() {
  const supabase: any = createServerClient()

  const { error } = await supabase.auth.signOut()

  if (error) {
    log.auth.error('Sign-out failed', { error })
    throw new Error('Failed to sign out')
  }

  // Clear auth-related cookies so middleware doesn't use stale data on next login
  const cookieStore = cookies()
  cookieStore.delete('chefflow-role-cache')
  cookieStore.delete('chefflow-session-only')

  revalidatePath('/', 'layout')
  return { success: true }
}

/**
 * Change password - Requires re-verification with current password
 */
export async function changePassword(currentPassword: string, newPassword: string) {
  const supabase: any = createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user?.email) throw new Error('Not authenticated')

  // Rate limit: 5 attempts per hour per user to prevent brute-forcing current password
  await checkRateLimit(`change-password:${user.id}`, 5, 60 * 60 * 1000)

  // Validate new password length
  const validated = UpdatePasswordSchema.parse({ password: newPassword })

  // Verify old password by attempting sign in
  const { error: verifyError } = await supabase.auth.signInWithPassword({
    email: user.email,
    password: currentPassword,
  })
  if (verifyError) throw new Error('Current password is incorrect')

  // Update to new password
  const { error } = await supabase.auth.updateUser({ password: validated.password })
  if (error) throw new Error('Failed to update password')

  return { success: true }
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
 * Creates the corresponding chef or client profile.
 */
export async function assignRole(role: 'chef' | 'client', context?: { signup_ref?: string }) {
  const supabase: any = createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('Not authenticated. Please sign in again.')
  }

  // Use admin client for the rest of the operations
  const adminSupabase = createServerClient({ admin: true })

  // 1. Check if user already has a role
  const { data: existingRole, error: existingRoleError } = await adminSupabase
    .from('user_roles')
    .select('role')
    .eq('auth_user_id', user.id)
    .single()

  if (existingRoleError && existingRoleError.code !== 'PGRST116') {
    // Ignore 'no rows found'
    log.auth.error('Error checking for existing user role', { error: existingRoleError })
    throw new Error('Could not process role selection. Please try again.')
  }

  if (existingRole) {
    // User already has a role, just redirect them
    const destination = existingRole.role === 'chef' ? '/dashboard' : '/my-events'
    return redirect(destination)
  }

  // 2. Create profile and assign role
  try {
    if (role === 'chef') {
      const email = normalizeEmail(user.email!)
      const businessName = user.user_metadata?.full_name || email.split('@')[0]
      const { data: chef, error: chefError } = await adminSupabase
        .from('chefs')
        .insert({
          auth_user_id: user.id,
          business_name: businessName,
          email,
        })
        .select('id')
        .single()
      if (chefError) throw chefError

      const { error: roleError } = await adminSupabase.from('user_roles').insert({
        auth_user_id: user.id,
        role: 'chef',
        entity_id: chef.id,
      })
      if (roleError) throw roleError

      const { error: prefError } = await adminSupabase.from('chef_preferences').insert({
        chef_id: chef.id,
        tenant_id: chef.id,
      })
      if (prefError) throw prefError

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
      const fullName = user.user_metadata?.full_name || 'New Client'
      const { data: client, error: clientError } = await adminSupabase
        .from('clients')
        .insert({
          auth_user_id: user.id,
          full_name: fullName,
          email: user.email!,
        })
        .select('id')
        .single()
      if (clientError) throw clientError

      const { error: roleError } = await adminSupabase.from('user_roles').insert({
        auth_user_id: user.id,
        role: 'client',
        entity_id: client.id,
      })
      if (roleError) throw roleError
    }
  } catch (error) {
    log.auth.error('Failed to assign role and create profile', { error, userId: user.id })
    // In case of failure, we don't want the user stuck in a loop.
    // Send them to an error page or back to the sign-in page with an error.
    return redirect('/auth/signin?error=role_assignment_failed')
  }

  // 3. Clear the role cache and redirect
  const cookieStore = cookies()
  cookieStore.delete('chefflow-role-cache')
  revalidatePath('/', 'layout')

  const destination = role === 'chef' ? '/dashboard' : '/my-events'
  redirect(destination)
}
