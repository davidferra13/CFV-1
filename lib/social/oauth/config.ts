// OAuth 2.0 configuration for each social platform.
// Client IDs are public (safe to reference by env var name).
// Client secrets are server-only and never leave the server.

export type SocialOAuthPlatform =
  | 'instagram'
  | 'facebook'
  | 'tiktok'
  | 'linkedin'
  | 'x'
  | 'pinterest'
  | 'youtube_shorts'

export type OAuthConfig = {
  platform: SocialOAuthPlatform
  authUrl: string
  tokenUrl: string
  /** Space-separated for most platforms; Meta uses comma-separated (handled in route) */
  scopes: string[]
  /** process.env key for the OAuth client ID */
  clientIdEnv: string
  /** process.env key for the OAuth client secret */
  clientSecretEnv: string
  /** Whether this platform requires PKCE (S256) */
  usePKCE: boolean
}

export const OAUTH_CONFIGS: Record<SocialOAuthPlatform, OAuthConfig> = {
  instagram: {
    platform: 'instagram',
    // Instagram Business uses Facebook Login - same OAuth endpoint as Facebook
    authUrl: 'https://www.facebook.com/v21.0/dialog/oauth',
    tokenUrl: 'https://graph.facebook.com/v21.0/oauth/access_token',
    scopes: [
      'instagram_business_content_publish',
      'instagram_business_manage_insights',
      'pages_read_engagement',
      'pages_manage_posts',
      'pages_show_list',
    ],
    clientIdEnv: 'META_APP_ID',
    clientSecretEnv: 'META_APP_SECRET',
    usePKCE: false,
  },

  facebook: {
    platform: 'facebook',
    authUrl: 'https://www.facebook.com/v21.0/dialog/oauth',
    tokenUrl: 'https://graph.facebook.com/v21.0/oauth/access_token',
    scopes: ['pages_manage_posts', 'pages_read_engagement', 'pages_show_list', 'publish_video'],
    clientIdEnv: 'META_APP_ID',
    clientSecretEnv: 'META_APP_SECRET',
    usePKCE: false,
  },

  tiktok: {
    platform: 'tiktok',
    authUrl: 'https://www.tiktok.com/v2/auth/authorize/',
    tokenUrl: 'https://open.tiktokapis.com/v2/oauth/token/',
    scopes: ['user.info.basic', 'video.upload', 'video.publish'],
    clientIdEnv: 'TIKTOK_CLIENT_KEY',
    clientSecretEnv: 'TIKTOK_CLIENT_SECRET',
    usePKCE: true,
  },

  linkedin: {
    platform: 'linkedin',
    authUrl: 'https://www.linkedin.com/oauth/v2/authorization',
    tokenUrl: 'https://www.linkedin.com/oauth/v2/accessToken',
    scopes: ['w_member_social', 'r_member_social', 'openid', 'profile', 'email'],
    clientIdEnv: 'LINKEDIN_CLIENT_ID',
    clientSecretEnv: 'LINKEDIN_CLIENT_SECRET',
    usePKCE: false,
  },

  x: {
    platform: 'x',
    authUrl: 'https://twitter.com/i/oauth2/authorize',
    tokenUrl: 'https://api.twitter.com/2/oauth2/token',
    // offline.access grants a refresh token (required to re-authenticate without user action)
    scopes: ['tweet.write', 'tweet.read', 'users.read', 'offline.access'],
    clientIdEnv: 'X_CLIENT_ID',
    clientSecretEnv: 'X_CLIENT_SECRET',
    usePKCE: true, // X OAuth 2.0 requires PKCE
  },

  pinterest: {
    platform: 'pinterest',
    authUrl: 'https://www.pinterest.com/oauth/',
    tokenUrl: 'https://api.pinterest.com/v5/oauth/token',
    scopes: ['boards:read', 'pins:create', 'user_accounts:read'],
    clientIdEnv: 'PINTEREST_APP_ID',
    clientSecretEnv: 'PINTEREST_APP_SECRET',
    usePKCE: false,
  },

  youtube_shorts: {
    platform: 'youtube_shorts',
    authUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
    tokenUrl: 'https://oauth2.googleapis.com/token',
    scopes: [
      'https://www.googleapis.com/auth/youtube.upload',
      'https://www.googleapis.com/auth/youtube',
    ],
    clientIdEnv: 'YOUTUBE_CLIENT_ID',
    clientSecretEnv: 'YOUTUBE_CLIENT_SECRET',
    usePKCE: false,
  },
}

export function getOAuthConfig(platform: string): OAuthConfig | null {
  return OAUTH_CONFIGS[platform as SocialOAuthPlatform] ?? null
}

/** Canonical redirect URI for each platform's OAuth callback */
export function getRedirectUri(platform: string): string {
  const base =
    process.env.NEXT_PUBLIC_APP_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000')
  return `${base}/api/integrations/social/callback/${platform}`
}

export const SOCIAL_PLATFORMS = new Set<string>([
  'instagram',
  'facebook',
  'tiktok',
  'linkedin',
  'x',
  'pinterest',
  'youtube_shorts',
])
