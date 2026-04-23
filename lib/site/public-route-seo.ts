export type PublicRouteSeoSnapshot = {
  bodyText: string
  canonicalHref: string | null
  openGraphImages: string[]
  robotsContent: string | null
  title: string
  twitterImages: string[]
}

export type PublicRouteSeoExpectation = {
  canonicalPath?: string
  expectedIndexable?: boolean
  forbiddenBodyPatterns?: RegExp[]
  label: string
  path: string
  requireCanonical?: boolean
  requireOpenGraphImage?: boolean
  requireTwitterImage?: boolean
}

const COMPANY_NAME = 'ChefFlow'

export const DEFAULT_BODY_PATTERNS: RegExp[] = [/\bfarm_to_table\b/i]

export const PUBLIC_ROUTE_SEO_CHECKS: PublicRouteSeoExpectation[] = [
  {
    label: 'Home',
    path: '/',
  },
  {
    label: 'Book',
    path: '/book',
  },
  {
    label: 'Chefs',
    path: '/chefs',
  },
  {
    label: 'For Operators',
    path: '/for-operators',
  },
  {
    label: 'Marketplace Chefs',
    path: '/marketplace-chefs',
  },
  {
    label: 'Nearby',
    path: '/nearby',
  },
  {
    label: 'Partner Signup',
    path: '/partner-signup',
    expectedIndexable: false,
  },
]

export function hasPublicRouteSeoExpectation(route: string): boolean {
  return PUBLIC_ROUTE_SEO_CHECKS.some((expectation) => expectation.path === route)
}

function normalizeWhitespace(value: string) {
  return value.replace(/\s+/g, ' ').trim()
}

function hasDuplicateBrandSuffix(title: string) {
  const normalized = normalizeWhitespace(title)
  if (new RegExp(`(?:\\|\\s*${COMPANY_NAME}){2,}`, 'i').test(normalized)) {
    return true
  }

  const segments = normalized
    .split('|')
    .map((segment) => segment.trim().toLowerCase())
    .filter(Boolean)

  if (segments.length < 2) return false

  const brand = COMPANY_NAME.toLowerCase()
  const last = segments[segments.length - 1]
  const secondLast = segments[segments.length - 2]

  return last === brand && secondLast === brand
}

function readCanonicalPath(canonicalHref: string | null) {
  if (!canonicalHref) return null

  try {
    const url = new URL(canonicalHref)
    return `${url.pathname}${url.search}`
  } catch {
    return null
  }
}

function readsNoIndex(robotsContent: string | null) {
  return /(?:^|[\s,])noindex(?:$|[\s,])/i.test(robotsContent ?? '')
}

export function validatePublicRouteSeoSnapshot(
  snapshot: PublicRouteSeoSnapshot,
  expectation: PublicRouteSeoExpectation
) {
  const issues: string[] = []
  const {
    canonicalPath = expectation.path,
    expectedIndexable = true,
    forbiddenBodyPatterns = DEFAULT_BODY_PATTERNS,
    requireCanonical = true,
    requireOpenGraphImage = true,
    requireTwitterImage = true,
  } = expectation

  if (requireCanonical) {
    if (!snapshot.canonicalHref) {
      issues.push('Missing canonical tag')
    } else {
      const actualCanonicalPath = readCanonicalPath(snapshot.canonicalHref)
      if (!actualCanonicalPath) {
        issues.push(`Canonical is not a valid absolute URL: ${snapshot.canonicalHref}`)
      } else if (actualCanonicalPath !== canonicalPath) {
        issues.push(
          `Canonical path mismatch: expected ${canonicalPath}, received ${actualCanonicalPath}`
        )
      }
    }
  }

  if (requireOpenGraphImage && snapshot.openGraphImages.length === 0) {
    issues.push('Missing og:image tag')
  }

  if (requireTwitterImage && snapshot.twitterImages.length === 0) {
    issues.push('Missing twitter:image tag')
  }

  if (hasDuplicateBrandSuffix(snapshot.title)) {
    issues.push(`Duplicate brand suffix in title: ${snapshot.title}`)
  }

  const hasNoIndex = readsNoIndex(snapshot.robotsContent)
  if (expectedIndexable && hasNoIndex) {
    issues.push(`Route unexpectedly rendered noindex: ${snapshot.robotsContent}`)
  }
  if (!expectedIndexable && !hasNoIndex) {
    issues.push('Route should render noindex')
  }

  const bodyText = normalizeWhitespace(snapshot.bodyText)
  for (const pattern of forbiddenBodyPatterns) {
    if (pattern.test(bodyText)) {
      issues.push(`Raw taxonomy label leaked into visible UI: ${pattern}`)
    }
  }

  return issues
}
