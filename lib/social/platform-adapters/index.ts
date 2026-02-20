// Platform adapter router.
// Import this and call getAdapter(platform) to get the right adapter.

import { metaAdapter } from './meta'
import { tiktokAdapter } from './tiktok'
import { xAdapter } from './x'
import { linkedinAdapter } from './linkedin'
import { pinterestAdapter } from './pinterest'
import { youtubeAdapter } from './youtube'

export type { PlatformAdapter, TokenSet, AccountInfo } from './types'
export { generateState, generateCodeVerifier } from './types'

// ── Platform → adapter map ────────────────────────────────────────────────────

// Meta handles both Instagram and Facebook via the same OAuth app.
// The callback route creates two rows (one per sub-platform) from a single OAuth flow.
const ADAPTERS = {
  instagram:      metaAdapter,      // Meta
  facebook:       metaAdapter,      // Meta (same app)
  tiktok:         tiktokAdapter,
  x:              xAdapter,
  linkedin:       linkedinAdapter,
  pinterest:      pinterestAdapter,
  youtube_shorts: youtubeAdapter,
} as const

export type SupportedSocialPlatform = keyof typeof ADAPTERS

export function getAdapter(platform: string) {
  const adapter = ADAPTERS[platform as SupportedSocialPlatform]
  if (!adapter) throw new Error(`No adapter found for platform: ${platform}`)
  return adapter
}

// The set of valid platform slugs accepted by the OAuth routes
export const SUPPORTED_PLATFORMS = Object.keys(ADAPTERS) as SupportedSocialPlatform[]

// Platforms that share a single OAuth flow (Meta)
export const META_PLATFORMS = ['instagram', 'facebook'] as const

// Whether a given platform slug triggers the Meta flow
export function isMetaPlatform(platform: string): boolean {
  return META_PLATFORMS.includes(platform as (typeof META_PLATFORMS)[number])
}
