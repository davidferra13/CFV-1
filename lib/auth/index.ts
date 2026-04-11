/**
 * Auth.js v5 entry point.
 * Exports the auth() helper (for middleware/server components),
 * handlers (for the route handler), and signIn/signOut actions.
 */
import NextAuth from 'next-auth'
import { authConfig } from './auth-config'

// Let Auth.js derive the canonical origin from each incoming request when trustHost is enabled.
// A fixed NEXTAUTH_URL/AUTH_URL forces HTTPS cookie semantics even for local HTTP aliases
// like http://10.0.0.153:3000, and browsers will drop those Secure cookies.
if (authConfig.trustHost) {
  const configuredAuthOrigin = process.env.AUTH_URL || process.env.NEXTAUTH_URL
  if (configuredAuthOrigin && !process.env.CHEFFLOW_AUTH_ORIGIN) {
    process.env.CHEFFLOW_AUTH_ORIGIN = configuredAuthOrigin
  }

  delete process.env.AUTH_URL
  delete process.env.NEXTAUTH_URL
}

export const {
  handlers,
  auth,
  signIn: nextAuthSignIn,
  signOut: nextAuthSignOut,
} = NextAuth(authConfig)
