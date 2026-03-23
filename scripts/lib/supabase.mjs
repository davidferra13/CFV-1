/**
 * Shared Supabase client factory for .mjs scripts and tests.
 *
 * Centralizes the @supabase/supabase-js dependency so individual scripts
 * don't import it directly. When the SDK is eventually removed entirely,
 * only this file needs to change.
 *
 * Usage:
 *   import { createAdminClient, createAnonClient } from '../lib/supabase.mjs'
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
 * Requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in env.
 */
export function createAdminClient(opts = {}) {
  const url = getEnvOrThrow('NEXT_PUBLIC_SUPABASE_URL')
  const key = getEnvOrThrow('SUPABASE_SERVICE_ROLE_KEY')
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    ...opts,
  })
}

/**
 * Create an anon-key client (respects RLS, used for auth sign-in tests).
 * Requires NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in env.
 */
export function createAnonClient(opts = {}) {
  const url = getEnvOrThrow('NEXT_PUBLIC_SUPABASE_URL')
  const key = getEnvOrThrow('NEXT_PUBLIC_SUPABASE_ANON_KEY')
  return createClient(url, key, opts)
}

/**
 * Create a client with explicit URL and key (for scripts that use custom config).
 * Re-export of the raw createClient for backward compatibility.
 */
export { createClient }
