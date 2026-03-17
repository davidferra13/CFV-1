// Shared constants for platform connections display.
// Extracted from platform-connections.ts because 'use server' files cannot export
// non-async values (Next.js restriction).

export const SUPPORTED_PLATFORMS = [
  {
    key: 'thumbtack',
    name: 'Thumbtack',
    description: 'Connect via Thumbtack Pro API key',
    authType: 'api_key' as const,
  },
  {
    key: 'google_business',
    name: 'Google Business Profile',
    description: 'Uses your existing Google connection',
    authType: 'oauth' as const,
  },
  {
    key: 'bark',
    name: 'Bark',
    description: 'API integration (coming soon)',
    authType: 'api_key' as const,
  },
  {
    key: 'theknot',
    name: 'The Knot',
    description: 'API integration (coming soon)',
    authType: 'api_key' as const,
  },
  {
    key: 'cozymeal',
    name: 'Cozymeal',
    description: 'API integration (coming soon)',
    authType: 'api_key' as const,
  },
  {
    key: 'gigsalad',
    name: 'GigSalad',
    description: 'API integration (coming soon)',
    authType: 'api_key' as const,
  },
]
