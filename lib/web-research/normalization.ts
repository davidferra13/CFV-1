import type { WebResearchSourceType } from './types'

const TAG_PATTERN = /<[^>]*>/g
const SPACE_PATTERN = /\s+/g

export function cleanWebResearchText(value: string | null | undefined, fallback = '') {
  if (typeof value !== 'string') return fallback
  return value.replace(TAG_PATTERN, ' ').replace(SPACE_PATTERN, ' ').trim()
}

export function canonicalizeSourceUrl(value: string) {
  try {
    const url = new URL(value)
    url.hash = ''
    url.protocol = url.protocol.toLowerCase()
    url.hostname = url.hostname.toLowerCase().replace(/^www\./, '')
    if (url.pathname !== '/') url.pathname = url.pathname.replace(/\/+$/, '')
    return url.toString()
  } catch {
    return value.trim()
  }
}

export function safeSourceUrl(value: string) {
  try {
    const url = new URL(value)
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return null
    return url.toString()
  } catch {
    return null
  }
}

export function inferSourceType(sourceUrl: string, title = ''): WebResearchSourceType {
  const combined = `${sourceUrl} ${title}`.toLowerCase()
  if (combined.includes('menu')) return 'menu'
  if (
    combined.includes('instagram.com') ||
    combined.includes('facebook.com') ||
    combined.includes('tiktok.com') ||
    combined.includes('linkedin.com')
  ) {
    return 'social_profile'
  }
  if (
    combined.includes('yelp.') ||
    combined.includes('tripadvisor.') ||
    combined.includes('opentable.') ||
    combined.includes('resy.') ||
    combined.includes('google.com/maps')
  ) {
    return 'directory'
  }
  if (
    combined.includes('restaurant') ||
    combined.includes('chef') ||
    combined.includes('catering')
  ) {
    return 'official_site'
  }
  return 'search_result'
}

export function stableWebResearchId(
  prefix: string,
  parts: Array<string | number | null | undefined>
) {
  const joined = parts
    .map((part) =>
      String(part ?? '')
        .toLowerCase()
        .trim()
    )
    .join('|')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 96)
  return `${prefix}-${joined || 'unknown'}`
}
