// Browser-side Supabase client
// Used in Client Components only

import { createBrowserClient } from '@supabase/ssr'
import type { Database } from '@/types/database'

type BrowserSupabaseClient = ReturnType<typeof createBrowserClient<Database>>

let browserClient: BrowserSupabaseClient | null = null

export function createClient() {
  if (!browserClient) {
    browserClient = createBrowserClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
  }

  return browserClient
}

type OAuthCallbackOptions = {
  browserOrigin?: string
  siteUrl?: string
}

function parseAllowedOrigin(candidate?: string): string | null {
  if (!candidate) return null
  try {
    const parsed = new URL(candidate)
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return null
    }
    return parsed.origin
  } catch {
    return null
  }
}

function resolveConfiguredSiteOrigin(siteUrl?: string): string | null {
  if (!siteUrl) return null

  const origin = parseAllowedOrigin(siteUrl)
  if (!origin) {
    throw new Error('Invalid NEXT_PUBLIC_SITE_URL. Expected a valid http(s) URL.')
  }

  return origin
}

/**
 * Build a callback URL for Supabase OAuth.
 * Prefer NEXT_PUBLIC_SITE_URL so callbacks stay on the configured allowlisted origin.
 */
export function resolveGoogleOAuthCallbackUrl(
  nextPath?: string,
  options: OAuthCallbackOptions = {}
): string {
  const configuredSiteUrl = options.siteUrl ?? process.env.NEXT_PUBLIC_SITE_URL
  const configuredOrigin = resolveConfiguredSiteOrigin(configuredSiteUrl)
  const runtimeOrigin = parseAllowedOrigin(options.browserOrigin)

  if (process.env.NODE_ENV === 'production' && !configuredOrigin) {
    throw new Error('NEXT_PUBLIC_SITE_URL must be set for Google OAuth in production.')
  }

  const callbackOrigin = configuredOrigin ?? runtimeOrigin

  if (!callbackOrigin) {
    throw new Error('Unable to determine OAuth callback origin.')
  }

  const callbackUrl = new URL('/auth/callback', callbackOrigin)
  if (nextPath) {
    callbackUrl.searchParams.set('next', nextPath)
  }
  return callbackUrl.toString()
}

/**
 * Sign in with Google OAuth via Supabase.
 * Must be called from a client component — triggers a full-page redirect.
 */
export async function signInWithGoogle(nextPath?: string) {
  const supabase = createClient()
  const callbackUrl = resolveGoogleOAuthCallbackUrl(nextPath, {
    browserOrigin: window.location.origin,
  })
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: callbackUrl,
    },
  })
  if (error) {
    throw new Error(error.message)
  }
}
