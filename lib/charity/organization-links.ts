import type { CharityOrganizationLinks } from './hours-types'

function normalizeWebsiteUrl(value: string | null | undefined): string | null {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  if (!trimmed) return null

  const withScheme = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`
  try {
    return new URL(withScheme).toString()
  } catch {
    return null
  }
}

export function normalizeEin(value: string | null | undefined): string | null {
  if (typeof value !== 'string') return null
  const digitsOnly = value.replace(/\D/g, '')
  return digitsOnly ? digitsOnly : null
}

export function getPropublicaOrganizationUrl(ein: string | null | undefined): string | null {
  const normalizedEin = normalizeEin(ein)
  return normalizedEin
    ? `https://projects.propublica.org/nonprofits/organizations/${normalizedEin}`
    : null
}

export function getGoogleMapsOrganizationUrl(input: {
  organizationName: string
  organizationAddress?: string | null
  googlePlaceId?: string | null
}): string | null {
  const query = [input.organizationName, input.organizationAddress]
    .filter(Boolean)
    .join(', ')
    .trim()
  if (!query && !input.googlePlaceId) return null

  const url = new URL('https://www.google.com/maps/search/')
  url.searchParams.set('api', '1')
  if (query) url.searchParams.set('query', query)
  if (input.googlePlaceId) url.searchParams.set('query_place_id', input.googlePlaceId)
  return url.toString()
}

export function getOrganizationLinks(input: {
  organizationName: string
  organizationAddress?: string | null
  googlePlaceId?: string | null
  ein?: string | null
  websiteUrl?: string | null
  verificationUrl?: string | null
}): CharityOrganizationLinks {
  return {
    websiteUrl: normalizeWebsiteUrl(input.websiteUrl),
    mapsUrl: getGoogleMapsOrganizationUrl(input),
    verificationUrl: input.verificationUrl ?? getPropublicaOrganizationUrl(input.ein),
  }
}

export { normalizeWebsiteUrl }
