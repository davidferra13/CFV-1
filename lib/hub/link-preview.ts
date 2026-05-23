export type HubLinkResourceType =
  | 'image'
  | 'map'
  | 'playlist'
  | 'invitation'
  | 'venue'
  | 'document'
  | 'link'

export interface HubLinkPreview {
  href: string
  host: string
  sourceLabel: string
  title: string
  resourceType: HubLinkResourceType
}

export interface HubTextPart {
  type: 'text' | 'link'
  text: string
  href?: string
}

const HTTP_URL_PATTERN = /https?:\/\/[^\s<>"'`]+/gi
const TRAILING_PUNCTUATION_PATTERN = /[),.;:!?]+$/
const IMAGE_EXTENSION_PATTERN = /\.(?:avif|gif|jpe?g|png|webp)(?:[?#].*)?$/i
const DOCUMENT_EXTENSION_PATTERN = /\.(?:csv|docx?|pdf|pptx?|txt|xlsx?)(?:[?#].*)?$/i

const PRIVATE_HOST_PATTERNS = [
  /^localhost$/i,
  /^127\./,
  /^10\./,
  /^192\.168\./,
  /^169\.254\./,
  /^172\.(1[6-9]|2\d|3[0-1])\./,
  /^0\./,
]

function stripTrailingPunctuation(candidate: string): string {
  return candidate.replace(TRAILING_PUNCTUATION_PATTERN, '')
}

function normalizeHostname(hostname: string): string {
  return hostname.replace(/^\[(.*)\]$/, '$1').toLowerCase()
}

function isPrivateOrInternalHost(hostname: string): boolean {
  const normalized = normalizeHostname(hostname)
  if (!normalized.includes('.') && normalized !== 'localhost') return true
  if (normalized === '::1') return true
  if (/^(fc|fd|fe80):/i.test(normalized)) return true
  return PRIVATE_HOST_PATTERNS.some((pattern) => pattern.test(normalized))
}

export function getSafeHubLinkHref(candidate: string): string | null {
  const cleaned = stripTrailingPunctuation(candidate.trim())
  if (!cleaned) return null

  let url: URL
  try {
    url = new URL(cleaned)
  } catch {
    return null
  }

  if (url.protocol !== 'https:' && url.protocol !== 'http:') return null
  if (isPrivateOrInternalHost(url.hostname)) return null
  url.hash = ''
  return url.href
}

function classifyResource(url: URL): HubLinkResourceType {
  const host = normalizeHostname(url.hostname)
  const href = url.href

  if (IMAGE_EXTENSION_PATTERN.test(href)) return 'image'
  if (DOCUMENT_EXTENSION_PATTERN.test(href)) return 'document'
  if (/maps\.google|goo\.gl\/maps|waze\.com|mapquest\.com/.test(host)) return 'map'
  if (/spotify\.com|music\.apple\.com|youtube\.com|youtu\.be|soundcloud\.com/.test(host)) {
    return 'playlist'
  }
  if (/eventbrite\.com|paperlesspost\.com|partiful\.com|evite\.com/.test(host)) {
    return 'invitation'
  }
  if (/opentable\.com|resy\.com|tock\.com|tripadvisor\.com|yelp\.com/.test(host)) {
    return 'venue'
  }

  return 'link'
}

function buildPreviewTitle(url: URL, resourceType: HubLinkResourceType): string {
  const host = normalizeHostname(url.hostname).replace(/^www\./, '')
  const labelByType: Record<HubLinkResourceType, string> = {
    image: 'Image reference',
    map: 'Map or directions',
    playlist: 'Playlist or audio',
    invitation: 'Invitation link',
    venue: 'Venue reference',
    document: 'Document',
    link: 'Shared link',
  }
  const pathLabel = decodeURIComponent(url.pathname)
    .split('/')
    .filter(Boolean)
    .at(-1)
    ?.replace(/[-_]+/g, ' ')
    .replace(/\.[a-z0-9]+$/i, '')
    .trim()

  return pathLabel
    ? `${labelByType[resourceType]}: ${pathLabel}`
    : `${labelByType[resourceType]} from ${host}`
}

export function extractHubLinkPreviews(body: string | null | undefined, max = 3): HubLinkPreview[] {
  if (!body) return []

  const seen = new Set<string>()
  const previews: HubLinkPreview[] = []
  for (const match of body.matchAll(HTTP_URL_PATTERN)) {
    const href = getSafeHubLinkHref(match[0])
    if (!href || seen.has(href)) continue

    const url = new URL(href)
    const host = normalizeHostname(url.hostname).replace(/^www\./, '')
    const resourceType = classifyResource(url)
    seen.add(href)
    previews.push({
      href,
      host,
      sourceLabel: host,
      title: buildPreviewTitle(url, resourceType),
      resourceType,
    })

    if (previews.length >= max) break
  }

  return previews
}

export function splitHubTextBySafeLinks(body: string | null | undefined): HubTextPart[] {
  if (!body) return []

  const parts: HubTextPart[] = []
  let cursor = 0
  for (const match of body.matchAll(HTTP_URL_PATTERN)) {
    const raw = match[0]
    const index = match.index ?? 0
    if (index > cursor) parts.push({ type: 'text', text: body.slice(cursor, index) })

    const href = getSafeHubLinkHref(raw)
    const safeText = stripTrailingPunctuation(raw)
    if (href) {
      parts.push({ type: 'link', text: safeText, href })
    } else {
      parts.push({ type: 'text', text: raw })
    }

    cursor = index + raw.length
  }

  if (cursor < body.length) parts.push({ type: 'text', text: body.slice(cursor) })
  return parts
}
