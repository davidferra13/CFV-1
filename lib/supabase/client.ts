// Browser-side auth client
// Google OAuth now uses Auth.js signIn('google') instead of Supabase
//
// NOTE: The Supabase browser client (createClient) is still exported for
// Phase 2 migration. Components that use it for data queries will be migrated
// to server actions with Drizzle in Phase 2.

import { createBrowserClient } from '@supabase/ssr'
import type { Database } from '@/types/database'
import { signIn } from 'next-auth/react'

type BrowserSupabaseClient = ReturnType<typeof createBrowserClient<Database>>

let browserClient: BrowserSupabaseClient | null = null

/**
 * @deprecated Will be removed in Phase 4. Use server actions with Drizzle instead.
 */
export function createClient() {
  if (!browserClient) {
    browserClient = createBrowserClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
  }

  return browserClient
}

/**
 * Sign in with Google OAuth via Auth.js.
 * Must be called from a client component - triggers a full-page redirect.
 */
export async function signInWithGoogle(nextPath?: string) {
  await signIn('google', {
    callbackUrl: nextPath || '/dashboard',
  })
}
