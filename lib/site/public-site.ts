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

const DEFAULT_PUBLIC_SITE_URL = 'https://app.cheflowhq.com'

export { BRAND_NAME as COMPANY_NAME } from '@/lib/brand/constants'
export { BRAND_SUPPORT_EMAIL as SUPPORT_EMAIL } from '@/lib/brand/constants'
export { BRAND_FOUNDER as FOUNDER_FULL_NAME } from '@/lib/brand/constants'
export { BRAND_FOUNDER_ROLE as FOUNDER_ROLE } from '@/lib/brand/constants'
export const PUBLIC_SITE_URL = (
  process.env.NEXT_PUBLIC_APP_URL ||
  process.env.NEXT_PUBLIC_SITE_URL ||
  DEFAULT_PUBLIC_SITE_URL
).replace(/\/+$/, '')

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

export function buildMarketingMetadata(params: {
  title: string
  description: string
  path: string
  imagePath: string
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
    imagePath,
    imageAlt = `${BRAND_NAME} preview`,
    openGraphTitle = title,
    twitterTitle = openGraphTitle,
    twitterCard = 'summary_large_image',
    type = 'website',
  } = params

  const pageUrl = absoluteUrl(path)
  const socialImageUrl = absoluteUrl(imagePath)

  return {
    title,
    description,
    openGraph: {
      title: openGraphTitle,
      description,
      url: pageUrl,
      siteName: BRAND_NAME,
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
