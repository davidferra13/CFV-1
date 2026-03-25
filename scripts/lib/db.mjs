/**
 * Shared database client factory for .mjs scripts and tests.
 *
 * Centralizes the @supabase/supabase-js dependency (used only in devDependencies
 * for scripts/tests) so individual scripts don't import it directly.
 *
 * Usage:
 *   import { createAdminClient, createAnonClient } from '../lib/db.mjs'
 *   const admin = createAdminClient()
 *   const anon = createAnonClient()
 */

import { createClient } from '@supabase/supabase-js'

/**
 * Reads env vars, with optional dotenv pre-loading.
 * Most scripts call dotenv.config() themselves before importing this,
 * so we just read process.env here.
 */
function getEnvOrThrow(name) {
  const val = process.env[name]
  if (!val) throw new Error(`Missing env var: ${name}`)
  return val
}

/**
 * Create a service-role (admin) client that bypasses RLS.
 */
export function createAdminClient(opts = {}) {
  const url = getEnvOrThrow('NEXT_PUBLIC_DB_URL')
  const key = getEnvOrThrow('DB_SERVICE_ROLE_KEY')
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    ...opts,
  })
}

/**
 * Create an anon-key client (used for auth sign-in tests).
 */
export function createAnonClient(opts = {}) {
  const url = getEnvOrThrow('NEXT_PUBLIC_DB_URL')
  const key = getEnvOrThrow('NEXT_PUBLIC_DB_ANON_KEY')
  return createClient(url, key, opts)
}

/**
 * Create a client with explicit URL and key (for scripts that use custom config).
 */
export { createClient }
