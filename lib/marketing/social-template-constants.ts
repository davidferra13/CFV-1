// Shared constants for social template display.
// Extracted from social-template-actions.ts because 'use server' files cannot export
// non-async values (Next.js restriction).

export type SocialPlatform = 'instagram' | 'facebook' | 'tiktok' | 'twitter' | 'linkedin'

export const PLATFORM_CHAR_LIMITS: Record<SocialPlatform, number> = {
  instagram: 2200,
  facebook: 63206,
  tiktok: 2200,
  twitter: 280,
  linkedin: 3000,
}
