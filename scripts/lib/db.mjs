/**
 * Shared database/auth helpers for .mjs scripts and tests.
 *
 * Auth is via Auth.js v5 (not Supabase - Supabase is forbidden in ChefFlow).
 * signInAgent() calls the /api/e2e/auth endpoint which returns an Auth.js session cookie.
 *
 * Usage:
 *   import { signInAgent, getDb } from '../lib/db.mjs'
 *   const cookieStr = await signInAgent()                  // default port 3100
 *   const cookieStr = await signInAgent(3200)              // beta server
 *   // then pass Cookie header in fetch calls: { Cookie: cookieStr }
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

/**
 * Load agent credentials from .auth/agent.json (relative to repo root).
 */
function loadAgentCredentials() {
  const agentJsonPath = path.resolve(__dirname, '../../.auth/agent.json')
  if (!fs.existsSync(agentJsonPath)) {
    throw new Error(
      `.auth/agent.json not found at ${agentJsonPath}. Run: npm run agent:setup`
    )
  }
  return JSON.parse(fs.readFileSync(agentJsonPath, 'utf8'))
}

/**
 * Sign in as the agent via the /api/e2e/auth endpoint.
 * Returns a cookie string to pass as the Cookie header in subsequent requests.
 *
 * Requires E2E_ALLOW_TEST_AUTH=true in .env.local (already set).
 *
 * @param {number} port - Dev server port (default 3100)
 * @returns {Promise<string>} Cookie header string
 */
export async function signInAgent(port = 3100) {
  const { email, password } = loadAgentCredentials()
  const url = `http://localhost:${port}/api/e2e/auth`

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
    redirect: 'manual',
  })

  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`Agent sign-in failed (HTTP ${res.status}): ${text}`)
  }

  // Extract all Set-Cookie headers and join them for use as Cookie header
  const setCookieHeaders = res.headers.getSetCookie
    ? res.headers.getSetCookie()
    : [res.headers.get('set-cookie')].filter(Boolean)

  if (!setCookieHeaders || setCookieHeaders.length === 0) {
    throw new Error('Agent sign-in succeeded but no session cookie was returned.')
  }

  // Parse cookie name=value pairs (strip attributes like path, httponly, etc.)
  const cookiePairs = setCookieHeaders
    .map((h) => h.split(';')[0].trim())
    .filter(Boolean)

  return cookiePairs.join('; ')
}

/**
 * Create a postgres.js client for direct DB access in scripts.
 * Uses the local PostgreSQL connection (not Supabase).
 *
 * Requires: NEXT_PUBLIC_DB_URL in .env.local
 */
export async function getDb() {
  const { default: postgres } = await import('postgres')
  const connectionString =
    process.env.NEXT_PUBLIC_DB_URL || 'postgresql://postgres:postgres@127.0.0.1:54322/postgres'
  return postgres(connectionString)
}

/**
 * @deprecated Use signInAgent() instead. Supabase is forbidden in ChefFlow.
 * Left as a stub to surface a clear error if accidentally called.
 */
export function createAnonClient() {
  throw new Error(
    'createAnonClient() is removed - Supabase is forbidden in ChefFlow.\n' +
    'Use signInAgent() instead:\n' +
    '  const cookieStr = await signInAgent(PORT)\n' +
    '  // pass as: { Cookie: cookieStr } in fetch headers'
  )
}

/**
 * @deprecated Use getDb() instead.
 */
export function createAdminClient() {
  throw new Error(
    'createAdminClient() is removed - Supabase is forbidden in ChefFlow.\n' +
    'Use getDb() for direct PostgreSQL access:\n' +
    '  const db = await getDb()'
  )
}
