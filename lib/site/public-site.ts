import { cache } from 'react'
import type { Metadata } from 'next'
import { createServerClient } from '@/lib/db/server'
import { FOUNDER_EMAIL } from '@/lib/platform/owner-account'
import { PUBLIC_MARKET_SCOPE } from '@/lib/public/public-market-scope'
import {
  BRAND_NAME,
  BRAND_SUPPORT_EMAIL,
  BRAND_FOUNDER,
  BRAND_FOUNDER_ROLE,
} from '@/lib/brand/constants'
export { PUBLIC_MARKET_SCOPE } from '@/lib/public/public-market-scope'

const DEFAULT_PUBLIC_SITE_URL = 'https://cheflowhq.com'
const APP_SUBDOMAIN_PUBLIC_URL = 'https://app.cheflowhq.com'

export { BRAND_NAME as COMPANY_NAME } from '@/lib/brand/constants'
export { BRAND_SUPPORT_EMAIL as SUPPORT_EMAIL } from '@/lib/brand/constants'
export { BRAND_FOUNDER as FOUNDER_FULL_NAME } from '@/lib/brand/constants'
export { BRAND_FOUNDER_ROLE as FOUNDER_ROLE } from '@/lib/brand/constants'
function resolvePublicSiteUrl() {
  const configuredUrl =
    process.env.NEXT_PUBLIC_MARKETING_SITE_URL ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    DEFAULT_PUBLIC_SITE_URL

  const normalizedUrl = configuredUrl.replace(/\/+$/, '')

  return normalizedUrl === APP_SUBDOMAIN_PUBLIC_URL ? DEFAULT_PUBLIC_SITE_URL : normalizedUrl
}

export const PUBLIC_SITE_URL = resolvePublicSiteUrl()

export const PUBLIC_SITE_NAME = BRAND_NAME
export const PUBLIC_SITE_ALTERNATE_NAMES = [
  'ChefFlow Marketplace',
  'ChefFlow Chef Marketplace',
  'ChefFlow Food Directory',
] as const

export const PUBLIC_SITE_DESCRIPTION =
  'ChefFlow is a food and chef marketplace where clients find private chefs, caterers, and meal prep professionals, and chefs run inquiries, menus, quotes, payments, and kitchen operations.'

export const PUBLIC_MARKETPLACE_DESCRIPTION =
  'Find private chefs, caterers, and meal prep professionals near you, browse services and menus, and book food experiences through ChefFlow.'

export const SOCIAL_PROFILE_URLS = [
  'https://www.facebook.com/cheflowhq',
  'https://www.instagram.com/cheflowhq',
  'https://x.com/cheflowhq',
  'https://www.tiktok.com/@cheflowhq',
  'https://www.youtube.com/@cheflowhq',
  'https://www.pinterest.com/cheflowhq',
  'https://www.linkedin.com/company/cheflowhq',
] as const

export const PUBLIC_MARKETPLACE_CONTACT_POINTS = [
  {
    '@type': 'ContactPoint',
    email: BRAND_SUPPORT_EMAIL,
    contactType: 'customer support',
    availableLanguage: 'English',
  },
  {
    '@type': 'ContactPoint',
    email: BRAND_SUPPORT_EMAIL,
    contactType: 'marketplace inquiries',
    availableLanguage: 'English',
  },
] as const

const stableCache: typeof cache =
  typeof cache === 'function'
    ? cache
    : (((fn: typeof cache extends (callback: infer T) => unknown ? T : never) =>
        fn) as typeof cache)

export type FounderProfile = {
  fullName: string
  role: string
  supportEmail: string
  location: string
  city: string
  state: string
  headshotUrl: string | null
  bio: string
}

function normalizePath(path: string) {
  if (!path) return ''
  return path.startsWith('/') ? path : `/${path}`
}

export function absoluteUrl(path = ''): string {
  if (!path) return PUBLIC_SITE_URL
  if (/^https?:\/\//i.test(path)) return path
  return `${PUBLIC_SITE_URL}${normalizePath(path)}`
}

export function canonicalUrl(path = ''): string {
  const url = new URL(absoluteUrl(path || '/'))
  url.hash = ''
  url.search = ''

  if (url.pathname !== '/') {
    url.pathname = url.pathname.replace(/\/+$/, '')
  }

  return url.toString()
}

export function buildMarketingMetadata(params: {
  title: string
  description: string
  path: string
  imagePath?: string
  imageAlt?: string
  openGraphTitle?: string
  twitterTitle?: string
  twitterCard?: 'summary' | 'summary_large_image'
  type?: 'website' | 'profile'
}): Metadata {
  const {
    title,
    description,
    path,
    imagePath = '/social/chefflow-home.png',
    imageAlt = `${BRAND_NAME} preview`,
    openGraphTitle = title,
    twitterTitle = openGraphTitle,
    twitterCard = 'summary_large_image',
    type = 'website',
  } = params

  const pageUrl = canonicalUrl(path)
  const socialImageUrl = absoluteUrl(imagePath)

  return {
    applicationName: PUBLIC_SITE_NAME,
    metadataBase: new URL(PUBLIC_SITE_URL),
    title,
    description,
    category: 'Food marketplace',
    openGraph: {
      title: openGraphTitle,
      description,
      url: pageUrl,
      siteName: PUBLIC_SITE_NAME,
      type,
      images: [{ url: socialImageUrl, alt: imageAlt }],
    },
    twitter: {
      card: twitterCard,
      title: twitterTitle,
      description,
      images: [socialImageUrl],
    },
    alternates: {
      canonical: pageUrl,
    },
  }
}

export const getFounderProfile = stableCache(async (): Promise<FounderProfile> => {
  const fallback: FounderProfile = {
    fullName: BRAND_FOUNDER,
    role: BRAND_FOUNDER_ROLE,
    supportEmail: BRAND_SUPPORT_EMAIL,
    location: PUBLIC_MARKET_SCOPE,
    city: '',
    state: '',
    headshotUrl: null,
    bio: `${BRAND_FOUNDER} is a private chef and operator who built ChefFlow after more than a decade of running real dinners, proposals, shopping, costing, and follow-up without software that actually matched the work.`,
  }

  try {
    const db: any = createServerClient({ admin: true })
    const { data } = await db
      .from('chefs')
      .select('profile_image_url, bio, city, state')
      .ilike('email', FOUNDER_EMAIL)
      .maybeSingle()

    if (!data) return fallback

    const city =
      typeof data.city === 'string' && data.city.trim() ? data.city.trim() : fallback.city
    const state =
      typeof data.state === 'string' && data.state.trim() ? data.state.trim() : fallback.state

    return {
      ...fallback,
      location: [city, state].filter(Boolean).join(', ') || fallback.location,
      city,
      state,
      headshotUrl:
        typeof data.profile_image_url === 'string' && data.profile_image_url.trim()
          ? data.profile_image_url
          : fallback.headshotUrl,
      bio: typeof data.bio === 'string' && data.bio.trim() ? data.bio.trim() : fallback.bio,
    }
  } catch {
    return fallback
  }
})
