/**
 * Auth.js v5 entry point.
 * Exports the auth() helper (for middleware/server components),
 * handlers (for the route handler), and signIn/signOut actions.
 */
import NextAuth from 'next-auth'
import { authConfig } from './auth-config'

export const {
  handlers,
  auth,
  signIn: nextAuthSignIn,
  signOut: nextAuthSignOut,
} = NextAuth(authConfig)
