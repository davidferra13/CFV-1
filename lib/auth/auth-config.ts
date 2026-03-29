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
import { db } from '@/lib/db'
import { authUsers } from '@/lib/db/schema/auth'
import { userRoles, clients } from '@/lib/db/schema/schema'
import { eq } from 'drizzle-orm'

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

declare module 'next-auth/jwt' {
  interface JWT {
    userId: string
    email: string
    role: string
    entityId: string
    tenantId: string | null
  }
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
    maxAge: 30 * 24 * 60 * 60, // 30 days
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
          const roleInfo = await resolveRoleAndTenant(existing.id)
          if (roleInfo) {
            user.role = roleInfo.role
            user.entityId = roleInfo.entityId
            user.tenantId = roleInfo.tenantId
          }
        }
        // If no existing user, they'll go to role-selection page
        // The role-selection page will create auth.users + profile records
      }

      return true
    },

    /**
     * JWT callback - enrich the token with role/tenant info.
     */
    async jwt({ token, user, trigger }) {
      // On initial sign in, copy user fields into token
      if (user) {
        token.userId = user.id!
        token.email = user.email!
        token.role = user.role ?? ''
        token.entityId = user.entityId ?? ''
        token.tenantId = user.tenantId ?? null
      }

      // On session update, re-resolve role (for role changes after OAuth signup)
      if (trigger === 'update' && token.userId) {
        const roleInfo = await resolveRoleAndTenant(token.userId)
        if (roleInfo) {
          token.role = roleInfo.role
          token.entityId = roleInfo.entityId
          token.tenantId = roleInfo.tenantId
        }
      }

      return token
    },

    /**
     * Session callback - expose custom fields to the client.
     */
    async session({ session, token }) {
      session.user.id = token.userId
      session.user.email = token.email
      session.user.role = token.role
      session.user.entityId = token.entityId
      session.user.tenantId = token.tenantId
      return session
    },
  },

  // Trust the reverse proxy headers
  trustHost: true,
}
