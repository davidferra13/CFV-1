'use server'

// Server actions for social platform connection management.
// Returns connection status - no tokens are ever sent to the browser.
// Connect/disconnect flow goes through API routes (which need HTTP redirects).

import { requireChef } from '@/lib/auth/get-user'
import {
  listConnections,
  disconnectCredential,
  getCredential,
  updateTokens,
} from '@/lib/social/oauth/token-store'
import type { SocialPlatform } from '@/lib/social/types'
import { revalidatePath } from 'next/cache'

// ── Public shape returned to the UI ──────────────────────────────────────────
// Deliberately omits access_token, refresh_token - never sent to the browser.

export type SocialConnectionStatus = {
  platform: SocialPlatform
  isConnected: boolean
  accountName: string | null
  accountHandle: string | null
  accountAvatar: string | null
  accountType: string | null
  /** For Meta connections: the Facebook Page name used for posting */
  metaPageName: string | null
  /** For Instagram: the IG Business Account ID */
  metaIgAccountId: string | null
  connectedAt: string | null
  tokenExpiresAt: string | null
  lastError: string | null
  errorCount: number
}

const ALL_PLATFORMS: SocialPlatform[] = [
  'instagram',
  'facebook',
  'tiktok',
  'linkedin',
  'x',
  'pinterest',
  'youtube_shorts',
]

function buildDisconnected(platform: SocialPlatform): SocialConnectionStatus {
  return {
    platform,
    isConnected: false,
    accountName: null,
    accountHandle: null,
    accountAvatar: null,
    accountType: null,
    metaPageName: null,
    metaIgAccountId: null,
    connectedAt: null,
    tokenExpiresAt: null,
    lastError: null,
    errorCount: 0,
  }
}

// ── getSocialConnections ──────────────────────────────────────────────────────

/**
 * Returns the connection status for all 7 social platforms.
 * Platforms with no row in social_platform_credentials are returned as isConnected: false.
 */
export async function getSocialConnections(): Promise<SocialConnectionStatus[]> {
  const chef = await requireChef()
  if (!chef.tenantId) return ALL_PLATFORMS.map(buildDisconnected)

  const rows = await listConnections(chef.tenantId)
  const connMap = new Map(rows.map((r) => [r.platform, r]))

  return ALL_PLATFORMS.map((platform) => {
    const row = connMap.get(platform)
    if (!row) return buildDisconnected(platform)

    const additional = row.additionalData ?? {}

    return {
      platform,
      isConnected: row.isActive,
      accountName: row.externalAccountName,
      accountHandle: row.externalAccountUsername,
      accountAvatar: row.externalAccountAvatarUrl,
      accountType: null,
      metaPageName: (additional.facebook_page_name as string) ?? null,
      metaIgAccountId: (additional.instagram_user_id as string) ?? null,
      connectedAt: row.connectedAt,
      tokenExpiresAt: row.tokenExpiresAt,
      lastError: row.lastError,
      errorCount: row.failedAttempts,
    }
  })
}

// ── getConnectedPlatformSet ───────────────────────────────────────────────────

/**
 * Lightweight set of connected platforms - used by the post editor UI.
 */
export async function getConnectedPlatformSet(): Promise<Set<SocialPlatform>> {
  const chef = await requireChef()
  if (!chef.tenantId) return new Set()

  const rows = await listConnections(chef.tenantId)
  return new Set(rows.map((r) => r.platform as SocialPlatform))
}

// ── Token retrieval (server-only, used by publishing cron) ───────────────────

/**
 * Retrieves the full decrypted token record for a platform.
 * Used exclusively by the publishing engine - never called from client components.
 */
export async function getSocialConnectionToken(
  tenantId: string,
  platform: SocialPlatform
): Promise<{
  accessToken: string
  refreshToken: string | null
  expiresAt: string | null
  additionalData: Record<string, unknown>
} | null> {
  const cred = await getCredential(tenantId, platform)
  if (!cred) return null

  return {
    accessToken: cred.accessToken,
    refreshToken: cred.refreshToken,
    expiresAt: cred.tokenExpiresAt?.toISOString() ?? null,
    additionalData: cred.additionalData,
  }
}

// ── updateConnectionAfterRefresh (used by Phase 3 cron) ──────────────────────

/**
 * After a token refresh, persists the new tokens.
 */
export async function updateConnectionAfterRefresh(
  tenantId: string,
  platform: SocialPlatform,
  newAccessToken: string,
  newRefreshToken: string | null,
  newExpiresAt: Date | null
): Promise<void> {
  await updateTokens(tenantId, platform, newAccessToken, newRefreshToken, newExpiresAt)
}

// ── disconnectSocialPlatform (called from disconnect API route) ───────────────

export async function disconnectSocialPlatform(
  platform: string
): Promise<{ success: boolean; error?: string }> {
  const chef = await requireChef()
  if (!chef.tenantId) return { success: false, error: 'No tenant' }

  try {
    await disconnectCredential(chef.tenantId, platform)
    revalidatePath('/social/connections')
    return { success: true }
  } catch (err) {
    return { success: false, error: (err as Error).message }
  }
}
