// Shared types for social platform OAuth adapters.
// Each adapter builds auth URLs, exchanges codes for tokens, refreshes tokens,
// and fetches the connected account's public profile info.

import type { SocialPlatform } from '@/lib/social/types'

// ── Token set returned after exchange or refresh ─────────────────────────────

export type TokenSet = {
  accessToken: string
  refreshToken: string | null
  /** UTC ISO string for expiry, or null if non-expiring */
  expiresAt: string | null
  /** Scopes actually granted by the user (space- or comma-separated, or array) */
  scope: string
}

// ── Public account info (safe to store and display in UI) ────────────────────

export type AccountInfo = {
  /** Opaque platform user/page ID */
  platformAccountId: string
  /** Display name (e.g. "David's Kitchen") */
  platformAccountName: string | null
  /** @username or handle where applicable */
  platformAccountHandle: string | null
  /** 'personal' | 'business' | 'creator' | 'page' */
  platformAccountType: string | null
  /** Public avatar URL (may be ephemeral for some platforms) */
  platformAccountAvatar: string | null
  /** Meta-specific: Facebook Page ID the chef chose */
  metaPageId?: string | null
  /** Meta-specific: Facebook Page display name */
  metaPageName?: string | null
  /** Meta-specific: Instagram Business Account ID linked to the chosen FB Page */
  metaIgAccountId?: string | null
}

// ── Platform adapter interface ───────────────────────────────────────────────

export type PlatformAdapter = {
  platform: SocialPlatform

  /**
   * Build the OAuth authorisation URL to redirect the browser to.
   * @param state     Random state string stored in social_oauth_states
   * @param codeVerifier  PKCE code verifier (adapters that need PKCE set this)
   */
  buildAuthUrl(state: string, codeVerifier?: string): string

  /**
   * Exchange an authorisation code for a token set.
   * @param code          The `code` query param from the OAuth callback
   * @param codeVerifier  PKCE verifier (required for PKCE adapters)
   */
  exchangeCode(code: string, codeVerifier?: string): Promise<TokenSet>

  /**
   * Use a refresh token to obtain a new access token.
   * Throw if refresh is not supported or the token is revoked.
   */
  refreshAccessToken(refreshToken: string): Promise<TokenSet>

  /**
   * Fetch the connected account's public profile using the access token.
   * Called right after exchangeCode() to populate social_connected_accounts.
   */
  getAccountInfo(accessToken: string): Promise<AccountInfo>

  /** Whether this platform requires PKCE (S256) */
  requiresPkce: boolean

  /** The redirect URI this adapter expects (must match the app registration) */
  redirectUri: string
}

// ── PKCE helpers ─────────────────────────────────────────────────────────────

/**
 * Generate a cryptographically random code verifier (43–128 chars, URL-safe).
 * Works in both Node.js (crypto) and Edge runtimes (Web Crypto).
 */
export async function generateCodeVerifier(): Promise<string> {
  const array = new Uint8Array(32)
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    crypto.getRandomValues(array)
  } else {
    // Node.js fallback
    const { randomFillSync } = await import('crypto')
    randomFillSync(array)
  }
  return base64UrlEncode(array)
}

/**
 * Derive the S256 code challenge from the verifier.
 */
export async function generateCodeChallenge(verifier: string): Promise<string> {
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    const encoder = new TextEncoder()
    const data = encoder.encode(verifier)
    const digest = await crypto.subtle.digest('SHA-256', data)
    return base64UrlEncode(new Uint8Array(digest))
  } else {
    const { createHash } = await import('crypto')
    const hash = createHash('sha256').update(verifier).digest()
    return base64UrlEncode(hash)
  }
}

function base64UrlEncode(bytes: Uint8Array | Buffer): string {
  let str = ''
  if (bytes instanceof Buffer) {
    str = bytes.toString('base64')
  } else {
    const binary = Array.from(bytes)
      .map((b) => String.fromCharCode(b))
      .join('')
    str = btoa(binary)
  }
  return str.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
}

/**
 * Generate a cryptographically random state string.
 */
export async function generateState(): Promise<string> {
  return generateCodeVerifier()
}
