// Shared constants for platform connections display.
// Extracted from platform-connections.ts because 'use server' files cannot export
// non-async values (Next.js restriction).
//
// Only platforms with real, working connections are listed here.
// Email parsing for booking platforms (Take a Chef, Bark, Thumbtack, etc.)
// is handled separately via Gmail sync, not through direct API integrations.

export const SUPPORTED_PLATFORMS = [
  {
    key: 'google_business',
    name: 'Google Business Profile',
    description: 'Uses your existing Google connection',
    authType: 'oauth' as const,
  },
]
