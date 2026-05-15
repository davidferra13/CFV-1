/**
 * Auth.js v5 configuration
 * Replaces Auth.js auth with direct PostgreSQL authentication.
 *
 * Credentials provider: verifies bcrypt hashes in auth.users.encrypted_password
 * Google provider: matches by email to existing auth.users records
 *
 * JWT session strategy - no database session table needed.
 * Role/tenant resolved at login and cached in the JWT token.
 */
import type { NextAuthConfig } from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import Google from 'next-auth/providers/google'
import bcrypt from 'bcryptjs'
import { cookies, headers } from 'next/headers'
import { db } from '@/lib/db'
import { authUsers } from '@/lib/db/schema/auth'
import { userRoles, clients, staffMembers, referralPartners } from '@/lib/db/schema/schema'
import { and, eq, sql } from 'drizzle-orm'
import { getSessionControlRow, recordSuccessfulAccountAccess } from './account-access'
import { hasAdminAccess } from './admin-access'
import { shouldInvalidateJwtSession } from './account-access-core'
import {
  userHasMfaEnabled,
  getMfaMethodType,
  createMfaChallenge,
  isMfaChallengeVerified,
} from '@/lib/mfa/challenge'
import { checkLoginAttempts, recordFailedAttempt, clearAttempts } from '@/lib/security/brute-force'
import { logSecurityEvent } from '@/lib/security/audit'

// Extend the Auth.js types to include our custom JWT/session fields
declare module 'next-auth' {
  interface User {
    role?: string
    entityId?: string
    tenantId?: string | null
    activeRoleId?: string
    mfaPending?: boolean
    mfaChallengeId?: string
  }
  interface Session {
    user: {
      id: string
      email: string
      role: string
      entityId: string
      tenantId: string | null
      activeRoleId?: string
      mfaPending?: boolean
      mfaChallengeId?: string
      isAdmin?: boolean
    }
  }
}

type AuthJwtToken = {
  userId?: string
  email?: string
  role?: string
  entityId?: string
  tenantId?: string | null
  activeRoleId?: string
  sessionVersion?: number
  sessionAuthenticatedAt?: number
  sessionControlCheckedAt?: number
  mfaPending?: boolean
  mfaChallengeId?: string
  isAdmin?: boolean
  adminCheckedAt?: number
  iat?: number
}

const AUTH_SESSION_CONTROL_REFRESH_MS = 60 * 1000

function isEdgeRuntime(): boolean {
  return typeof (globalThis as { EdgeRuntime?: unknown }).EdgeRuntime === 'string'
}

/**
 * Resolve role and tenant for a given auth user ID.
 * Supports multi-role: if preferredRoleId is set, use that role (verified ownership).
 * Otherwise falls back to the first role found.
 */
async function resolveRoleAndTenant(authUserId: string, preferredRoleId?: string | null) {
  let roleRow: { id: string; role: string; entityId: string } | undefined

  // Try preferred role first (must belong to this user)
  if (preferredRoleId) {
    const [preferred] = await db
      .select({ id: userRoles.id, role: userRoles.role, entityId: userRoles.entityId })
      .from(userRoles)
      .where(and(eq(userRoles.id, preferredRoleId), eq(userRoles.authUserId, authUserId)))
      .limit(1)
    roleRow = preferred
  }

  // Fallback: first available role
  if (!roleRow) {
    const [first] = await db
      .select({ id: userRoles.id, role: userRoles.role, entityId: userRoles.entityId })
      .from(userRoles)
      .where(eq(userRoles.authUserId, authUserId))
      .limit(1)
    roleRow = first
  }

  if (!roleRow) return null

  let tenantId: string | null = null

  if (roleRow.role === 'chef') {
    tenantId = roleRow.entityId
  } else if (roleRow.role === 'client') {
    const [clientRow] = await db
      .select({
        tenantId: clients.tenantId,
        deletedAt: clients.deletedAt,
        deletionScheduledFor: clients.accountDeletionScheduledFor,
      })
      .from(clients)
      .where(eq(clients.id, roleRow.entityId))
      .limit(1)
    if (clientRow?.deletedAt) return null
    if (clientRow?.deletionScheduledFor && new Date(clientRow.deletionScheduledFor) <= new Date()) {
      return null
    }
    tenantId = clientRow?.tenantId ?? null
  } else if (roleRow.role === 'staff') {
    const [staffRow] = await db
      .select({ tenantId: staffMembers.chefId })
      .from(staffMembers)
      .where(eq(staffMembers.id, roleRow.entityId))
      .limit(1)
    tenantId = staffRow?.tenantId ?? null
  } else if (roleRow.role === 'partner') {
    const [partnerRow] = await db
      .select({ tenantId: referralPartners.tenantId })
      .from(referralPartners)
      .where(eq(referralPartners.id, roleRow.entityId))
      .limit(1)
    tenantId = partnerRow?.tenantId ?? null
  }

  return {
    roleId: roleRow.id,
    role: roleRow.role,
    entityId: roleRow.entityId,
    tenantId,
  }
}

export const authConfig: NextAuthConfig = {
  providers: [
    Credentials({
      id: 'credentials',
      name: 'Email & Password',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        const email = (credentials?.email as string)?.trim().toLowerCase()
        const password = credentials?.password as string

        if (!email || !password) return null

        // Brute-force check: block locked-out accounts before any DB work
        try {
          const loginCheck = await checkLoginAttempts(email)
          if (!loginCheck.allowed) {
            const lockoutMinutes = loginCheck.lockoutUntil
              ? Math.ceil((loginCheck.lockoutUntil.getTime() - Date.now()) / 60000)
              : 15
            logSecurityEvent({
              eventType: 'login_failed',
              metadata: { email, reason: 'account_locked', lockoutMinutes },
            })
            return null
          }
        } catch (err) {
          console.error('[auth] Brute-force check failed, allowing attempt:', err)
        }

        // Look up user in auth.users by email
        const [user] = await db
          .select({
            id: authUsers.id,
            email: authUsers.email,
            encryptedPassword: authUsers.encryptedPassword,
            emailConfirmedAt: authUsers.emailConfirmedAt,
            bannedUntil: authUsers.bannedUntil,
          })
          .from(authUsers)
          .where(sql`lower(${authUsers.email}) = ${email}`)
          .limit(1)

        if (!user || !user.encryptedPassword) {
          logSecurityEvent({
            eventType: 'login_failed',
            metadata: { email, reason: 'user_not_found' },
          })
          return null
        }

        // Check email confirmation
        if (!user.emailConfirmedAt) {
          logSecurityEvent({
            eventType: 'login_failed',
            metadata: { email, reason: 'email_not_confirmed' },
          })
          return null
        }

        // Check ban status
        if (user.bannedUntil && new Date(user.bannedUntil) > new Date()) {
          logSecurityEvent({
            eventType: 'login_failed',
            metadata: { email, reason: 'user_banned' },
          })
          return null
        }

        // Verify bcrypt password (compatible with the database-stored hashes)
        const valid = await bcrypt.compare(password, user.encryptedPassword)
        if (!valid) {
          try {
            await recordFailedAttempt(email)
          } catch (err) {
            console.error('[auth] Failed to record brute-force attempt:', err)
          }
          logSecurityEvent({
            eventType: 'login_failed',
            metadata: { email, reason: 'invalid_password' },
          })
          return null
        }

        // Successful credential login: clear brute-force counters
        try {
          await clearAttempts(email)
        } catch (err) {
          console.error('[auth] Failed to clear brute-force attempts:', err)
        }

        // Resolve role and tenant
        const roleInfo = await resolveRoleAndTenant(user.id)

        // Check if MFA is enabled for this user
        const mfaEnabled = await userHasMfaEnabled(user.id)
        if (mfaEnabled) {
          const mfaType = await getMfaMethodType(user.id)
          const { challengeId } = await createMfaChallenge(user.id, mfaType ?? 'totp')

          logSecurityEvent({
            authUserId: user.id,
            eventType: 'login_success',
            metadata: { provider: 'credentials', mfaPending: true },
          })

          return {
            id: user.id,
            email: user.email ?? email,
            role: roleInfo?.role,
            entityId: roleInfo?.entityId,
            tenantId: roleInfo?.tenantId ?? null,
            activeRoleId: roleInfo?.roleId,
            mfaPending: true,
            mfaChallengeId: challengeId,
          }
        }

        // Audit: credential login success (no MFA)
        logSecurityEvent({
          authUserId: user.id,
          eventType: 'login_success',
          metadata: { provider: 'credentials' },
        })

        return {
          id: user.id,
          email: user.email ?? email,
          role: roleInfo?.role,
          entityId: roleInfo?.entityId,
          tenantId: roleInfo?.tenantId ?? null,
          activeRoleId: roleInfo?.roleId,
        }
      },
    }),
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID ?? '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? '',
      // Disabled: allowDangerousEmailAccountLinking enables account takeover
      // if an attacker controls the victim's email. Users must link accounts
      // manually through settings instead.
      allowDangerousEmailAccountLinking: false,
    }),
  ],

  session: {
    strategy: 'jwt',
    maxAge: 7 * 24 * 60 * 60, // 7 days (reduced from 30 for security)
  },

  pages: {
    signIn: '/auth/signin',
    error: '/auth/signin',
    newUser: '/auth/role-selection',
  },

  callbacks: {
    /**
     * signIn callback - runs after provider authenticates but before JWT is created.
     * For Google OAuth: find or create the auth.users record.
     */
    async signIn({ user, account }) {
      let trackedAuthUserId: string | null = null
      let trackedTenantId: string | null = null

      if (account?.provider === 'google') {
        const email = user.email?.trim().toLowerCase()
        if (!email) return false

        // Check if auth.users record exists for this email
        const [existing] = await db
          .select({ id: authUsers.id, bannedUntil: authUsers.bannedUntil })
          .from(authUsers)
          .where(eq(authUsers.email, email))
          .limit(1)

        // Block banned users from Google OAuth login
        if (existing?.bannedUntil && new Date(existing.bannedUntil) > new Date()) {
          logSecurityEvent({
            eventType: 'login_failed',
            metadata: { email, reason: 'user_banned', provider: 'google' },
          })
          return false
        }

        if (existing) {
          // Link to existing auth user - use their ID
          user.id = existing.id
          trackedAuthUserId = existing.id
          const roleInfo = await resolveRoleAndTenant(existing.id)
          if (roleInfo) {
            user.role = roleInfo.role
            user.entityId = roleInfo.entityId
            user.tenantId = roleInfo.tenantId
            user.activeRoleId = roleInfo.roleId
            trackedTenantId = roleInfo.tenantId
          }
          // Audit: Google OAuth login success
          logSecurityEvent({
            authUserId: existing.id,
            eventType: 'login_success',
            metadata: { provider: 'google' },
          })
        }
        // If no existing user, they'll go to role-selection page
        // The role-selection page will create auth.users + profile records
      } else if (user.id) {
        trackedAuthUserId = user.id
        trackedTenantId = user.tenantId ?? null
      }

      if (trackedAuthUserId) {
        try {
          await recordSuccessfulAccountAccess({
            authUserId: trackedAuthUserId,
            tenantId: trackedTenantId,
            authProvider: account?.provider ?? null,
            requestHeaders: headers(),
          })
        } catch (error) {
          console.error('[auth] Failed to record successful account access:', error)
        }
      }

      return true
    },

    /**
     * JWT callback - enrich the token with role/tenant info.
     */
    async jwt({ token, user, trigger }) {
      const authToken = token as typeof token & AuthJwtToken

      // On initial sign in, copy user fields into token
      if (user) {
        authToken.userId = user.id ?? undefined
        authToken.email = user.email ?? undefined
        authToken.role = user.role ?? ''
        authToken.entityId = user.entityId ?? ''
        authToken.tenantId = user.tenantId ?? null
        authToken.activeRoleId = user.activeRoleId ?? undefined
        authToken.mfaPending = user.mfaPending ?? false
        authToken.mfaChallengeId = user.mfaChallengeId ?? undefined
      }

      // On session update: if MFA was pending, check if the challenge is now verified
      if (
        trigger === 'update' &&
        authToken.mfaPending &&
        authToken.mfaChallengeId &&
        authToken.userId
      ) {
        try {
          const verified = await isMfaChallengeVerified(authToken.mfaChallengeId)
          if (verified) {
            authToken.mfaPending = false
            authToken.mfaChallengeId = undefined
            logSecurityEvent({
              authUserId: authToken.userId,
              eventType: 'login_success',
              metadata: { provider: 'credentials', mfaVerified: true },
            })
          }
        } catch {
          // Keep MFA pending on failure
        }
      }

      // On session update, re-resolve role (for role changes after OAuth signup)
      if (trigger === 'update' && authToken.userId) {
        const roleInfo = await resolveRoleAndTenant(authToken.userId, authToken.activeRoleId)
        if (roleInfo) {
          authToken.role = roleInfo.role
          authToken.entityId = roleInfo.entityId
          authToken.tenantId = roleInfo.tenantId
          authToken.activeRoleId = roleInfo.roleId
        }
      }

      if (!authToken.userId) {
        return authToken
      }

      // Auth.js also runs this callback from middleware, which is Edge runtime.
      // Node database drivers cannot open TCP sockets there, so middleware must
      // rely on the already-signed JWT claims and leave revocation checks to
      // Node routes/actions.
      if (isEdgeRuntime()) {
        return authToken
      }

      // Detect role switch: cookie set by switchRole() server action
      try {
        const cookieStore = await cookies()
        const activeRoleCookie = cookieStore.get('chefflow-active-role-id')?.value
        if (activeRoleCookie && activeRoleCookie !== authToken.activeRoleId) {
          const roleInfo = await resolveRoleAndTenant(authToken.userId, activeRoleCookie)
          if (roleInfo) {
            authToken.role = roleInfo.role
            authToken.entityId = roleInfo.entityId
            authToken.tenantId = roleInfo.tenantId
            authToken.activeRoleId = roleInfo.roleId
          }
        }
      } catch {
        // cookies() not available in this context
      }

      // Refresh admin status periodically (same cadence as session control)
      const now = Date.now()
      const shouldRefreshAdmin =
        Boolean(user) ||
        trigger === 'update' ||
        !authToken.adminCheckedAt ||
        now - authToken.adminCheckedAt > AUTH_SESSION_CONTROL_REFRESH_MS

      if (shouldRefreshAdmin && authToken.userId) {
        try {
          authToken.isAdmin = await hasAdminAccess(authToken.userId)
          authToken.adminCheckedAt = now
        } catch {
          // Keep previous value on failure
        }
      }

      let sessionControl = null
      const shouldRefreshSessionControl =
        Boolean(user) ||
        trigger === 'update' ||
        !authToken.sessionControlCheckedAt ||
        now - authToken.sessionControlCheckedAt > AUTH_SESSION_CONTROL_REFRESH_MS

      if (shouldRefreshSessionControl) {
        try {
          sessionControl = await getSessionControlRow(authToken.userId)
          authToken.sessionControlCheckedAt = now
        } catch (error) {
          console.error('[auth] Failed to load session control state:', error)
        }
      }

      if (user) {
        authToken.sessionVersion = sessionControl?.sessionVersion ?? 0
        authToken.sessionAuthenticatedAt = now
      }

      if (sessionControl && shouldInvalidateJwtSession(authToken, sessionControl)) {
        return null
      }

      return authToken
    },

    /**
     * Session callback - expose custom fields to the client.
     */
    async session({ session, token }) {
      const authToken = token as typeof token & AuthJwtToken
      session.user.id = authToken.userId ?? ''
      session.user.email = authToken.email ?? ''
      session.user.role = authToken.role ?? ''
      session.user.entityId = authToken.entityId ?? ''
      session.user.tenantId = authToken.tenantId ?? null
      session.user.activeRoleId = authToken.activeRoleId ?? ''
      session.user.isAdmin = authToken.isAdmin ?? false
      session.user.mfaPending = authToken.mfaPending ?? false
      session.user.mfaChallengeId = authToken.mfaChallengeId ?? undefined
      return session
    },
  },

  // Trust the reverse proxy headers
  trustHost: true,
}
