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
import { headers } from 'next/headers'
import { db } from '@/lib/db'
import { authUsers } from '@/lib/db/schema/auth'
import { userRoles, clients, staffMembers, referralPartners } from '@/lib/db/schema/schema'
import { eq } from 'drizzle-orm'
import { getSessionControlRow, recordSuccessfulAccountAccess } from './account-access'
import { shouldInvalidateJwtSession } from './account-access-core'

// Extend the Auth.js types to include our custom JWT/session fields
declare module 'next-auth' {
  interface User {
    role?: string
    entityId?: string
    tenantId?: string | null
  }
  interface Session {
    user: {
      id: string
      email: string
      role: string
      entityId: string
      tenantId: string | null
    }
  }
}

type AuthJwtToken = {
  userId?: string
  email?: string
  role?: string
  entityId?: string
  tenantId?: string | null
  sessionVersion?: number
  sessionAuthenticatedAt?: number
  iat?: number
}

/**
 * Resolve role and tenant for a given auth user ID.
 * Reused by both Credentials and Google providers.
 */
async function resolveRoleAndTenant(authUserId: string) {
  const [roleRow] = await db
    .select({ role: userRoles.role, entityId: userRoles.entityId })
    .from(userRoles)
    .where(eq(userRoles.authUserId, authUserId))
    .limit(1)

  if (!roleRow) return null

  let tenantId: string | null = null

  if (roleRow.role === 'chef') {
    tenantId = roleRow.entityId
  } else if (roleRow.role === 'client') {
    const [clientRow] = await db
      .select({ tenantId: clients.tenantId })
      .from(clients)
      .where(eq(clients.id, roleRow.entityId))
      .limit(1)
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

        // Look up user in auth.users by email
        const [user] = await db
          .select({
            id: authUsers.id,
            email: authUsers.email,
            encryptedPassword: authUsers.encryptedPassword,
            emailConfirmedAt: authUsers.emailConfirmedAt,
          })
          .from(authUsers)
          .where(eq(authUsers.email, email))
          .limit(1)

        if (!user || !user.encryptedPassword) return null

        // Check email confirmation
        if (!user.emailConfirmedAt) return null

        // Verify bcrypt password (compatible with the database-stored hashes)
        const valid = await bcrypt.compare(password, user.encryptedPassword)
        if (!valid) return null

        // Resolve role and tenant
        const roleInfo = await resolveRoleAndTenant(user.id)

        return {
          id: user.id,
          email: user.email ?? email,
          role: roleInfo?.role,
          entityId: roleInfo?.entityId,
          tenantId: roleInfo?.tenantId ?? null,
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
          .select({ id: authUsers.id })
          .from(authUsers)
          .where(eq(authUsers.email, email))
          .limit(1)

        if (existing) {
          // Link to existing auth user - use their ID
          user.id = existing.id
          trackedAuthUserId = existing.id
          const roleInfo = await resolveRoleAndTenant(existing.id)
          if (roleInfo) {
            user.role = roleInfo.role
            user.entityId = roleInfo.entityId
            user.tenantId = roleInfo.tenantId
            trackedTenantId = roleInfo.tenantId
          }
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
      }

      // On session update, re-resolve role (for role changes after OAuth signup)
      if (trigger === 'update' && authToken.userId) {
        const roleInfo = await resolveRoleAndTenant(authToken.userId)
        if (roleInfo) {
          authToken.role = roleInfo.role
          authToken.entityId = roleInfo.entityId
          authToken.tenantId = roleInfo.tenantId
        }
      }

      if (!authToken.userId) {
        return authToken
      }

      let sessionControl = null
      try {
        sessionControl = await getSessionControlRow(authToken.userId)
      } catch (error) {
        console.error('[auth] Failed to load session control state:', error)
      }

      if (user) {
        authToken.sessionVersion = sessionControl?.sessionVersion ?? 0
        authToken.sessionAuthenticatedAt = Date.now()
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
      return session
    },
  },

  // Trust the reverse proxy headers
  trustHost: true,
}
