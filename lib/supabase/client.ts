// Browser-side Supabase client
// Used in Client Components only

import { createBrowserClient } from '@supabase/ssr'
import type { Database } from '@/types/database'

export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

/**
 * Sign in with Google OAuth via Supabase.
 * Must be called from a client component — triggers a full-page redirect.
 */
export async function signInWithGoogle(nextPath?: string) {
  const supabase = createClient()
  const callbackUrl = new URL('/auth/callback', window.location.origin)
  if (nextPath) {
    callbackUrl.searchParams.set('next', nextPath)
  }
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: callbackUrl.toString(),
    },
  })
  if (error) {
    throw new Error(error.message)
  }
}
