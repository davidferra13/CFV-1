// ChefFlow Brand Identity - Single Source of Truth
// All brand constants live here. Other files import or re-export from this module.

export const BRAND_NAME = 'ChefFlow'
export const BRAND_TAGLINE = 'Ops for Artists'
export const BRAND_DOMAIN = 'cheflowhq.com'
export const BRAND_APP_URL = 'https://app.cheflowhq.com'
export const BRAND_SUPPORT_EMAIL = 'support@cheflowhq.com'
export const BRAND_THEME_COLOR = '#e88f47'
export const BRAND_FOUNDER = 'David Ferragamo'
export const BRAND_FOUNDER_ROLE = 'Founder & Chef Operator'

// Handle preferences (in priority order)
export const BRAND_HANDLES = ['ChefFlow', 'ChefFlowHQ', 'ChefFlowApp'] as const

// Hashtags
export const BRAND_HASHTAGS = ['#ChefFlow', '#OpsForArtists', '#PrivateChef', '#ChefLife'] as const

// Social profile links (populated after accounts are created)
export const BRAND_SOCIAL_LINKS: Record<string, string> = {}
