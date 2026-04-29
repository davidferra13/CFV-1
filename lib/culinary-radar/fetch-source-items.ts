import 'server-only'

import {
  parseCdcRecord,
  parseFdaRecord,
  parseFsisRecord,
  parseIftRecord,
  parseWckRecord,
  parseWorldchefsRecord,
} from './adapters'
import { getSourceDefinition } from './source-registry'
import type { CulinaryRadarRawItem, CulinaryRadarSourceKey } from './types'

type SourceFetchResult = {
  sourceKey: CulinaryRadarSourceKey
  items: CulinaryRadarRawItem[]
  checkedAt: string
}

type JsonRecord = Record<string, unknown>

const PAGE_SOURCES: Record<
  CulinaryRadarSourceKey,
  {
    urls: Array<{ url: string; titleFallback: string; summaryFallback: string }>
    parser: (record: JsonRecord) => CulinaryRadarRawItem
  }
> = {
  fda_recalls: { urls: [], parser: parseFdaRecord },
  fsis_recalls: { urls: [], parser: parseFsisRecord },
  cdc_foodborne_outbreaks: {
    parser: parseCdcRecord,
    urls: [
      {
        url: 'https://www.cdc.gov/foodborne-outbreaks/index.html',
        titleFallback: 'CDC current foodborne outbreak investigations',
        summaryFallback: 'CDC publishes current foodborne outbreak investigations and notices.',
      },
    ],
  },
  wck_opportunities: {
    parser: parseWckRecord,
    urls: [
      {
        url: 'https://wck.org/careers/',
        titleFallback: 'World Central Kitchen current openings',
        summaryFallback: 'World Central Kitchen publishes relief team and operations openings.',
      },
      {
        url: 'https://wck.org/chef-corps/',
        titleFallback: 'World Central Kitchen Chef Corps',
        summaryFallback: 'World Central Kitchen describes chef participation in relief work.',
      },
      {
        url: 'https://wck.org/en-us/volunteer',
        titleFallback: 'World Central Kitchen volunteer opportunities',
        summaryFallback: 'World Central Kitchen publishes volunteer participation information.',
      },
    ],
  },
  worldchefs_sustainability: {
    parser: parseWorldchefsRecord,
    urls: [
      {
        url: 'https://feedtheplanet.worldchefs.org/our-trainers/',
        titleFallback: 'Worldchefs Feed the Planet trainers',
        summaryFallback: 'Worldchefs publishes sustainability education resources for chefs.',
      },
      {
        url: 'https://worldchefs.org/tvs/sustainability-education-for-culinary-professionals-start-your-online-learning-journey/',
        titleFallback: 'Worldchefs sustainability education',
        summaryFallback:
          'Worldchefs publishes sustainability education for culinary professionals.',
      },
    ],
  },
  ift_food_science: {
    parser: parseIftRecord,
    urls: [
      {
        url: 'https://www.ift.org/news-and-publications',
        titleFallback: 'IFT food science news and publications',
        summaryFallback: 'IFT publishes food science, policy, innovation, and safety material.',
      },
    ],
  },
}

export async function fetchRadarSourceItems(
  sourceKey: CulinaryRadarSourceKey
): Promise<SourceFetchResult> {
  const checkedAt = new Date().toISOString()

  if (sourceKey === 'fda_recalls') {
    return { sourceKey, checkedAt, items: await fetchFdaItems() }
  }

  if (sourceKey === 'fsis_recalls') {
    return { sourceKey, checkedAt, items: await fetchFsisItems() }
  }

  const pageSource = PAGE_SOURCES[sourceKey]
  if (!pageSource) {
    throw new Error(`No Culinary Radar fetcher registered for ${sourceKey}`)
  }

  const pages = await Promise.all(
    pageSource.urls.map(async (page) => pageSource.parser(await fetchPageRecord(page)))
  )
  return { sourceKey, checkedAt, items: pages }
}

async function fetchFdaItems(): Promise<CulinaryRadarRawItem[]> {
  const source = getSourceDefinition('fda_recalls')
  const payload = await fetchJson(source.feedUrl ?? source.homepageUrl)
  const records = Array.isArray(payload.results) ? payload.results : []
  return records.slice(0, 25).map((record) => parseFdaRecord(record as JsonRecord))
}

async function fetchFsisItems(): Promise<CulinaryRadarRawItem[]> {
  const source = getSourceDefinition('fsis_recalls')
  const payload = await fetchJson(source.feedUrl ?? source.homepageUrl)
  const records = extractRecordArray(payload)
  return records.slice(0, 25).map((record) => parseFsisRecord(record))
}

async function fetchJson(url: string): Promise<JsonRecord> {
  const response = await fetchWithTimeout(url, {
    headers: {
      accept: 'application/json',
      'user-agent': 'ChefFlow Culinary Radar source monitor',
    },
  })

  if (!response.ok) {
    throw new Error(`Source returned ${response.status} for ${url}`)
  }

  return (await response.json()) as JsonRecord
}

async function fetchPageRecord(page: {
  url: string
  titleFallback: string
  summaryFallback: string
}): Promise<JsonRecord> {
  const response = await fetchWithTimeout(page.url, {
    headers: {
      accept: 'text/html',
      'user-agent': 'ChefFlow Culinary Radar source monitor',
    },
  })

  if (!response.ok) {
    throw new Error(`Source returned ${response.status} for ${page.url}`)
  }

  const html = await response.text()
  return {
    id: page.url,
    slug: page.url,
    url: page.url,
    link: page.url,
    title: extractHtmlTitle(html) ?? page.titleFallback,
    headline: extractHtmlTitle(html) ?? page.titleFallback,
    summary: extractMetaDescription(html) ?? page.summaryFallback,
    description: extractMetaDescription(html) ?? page.summaryFallback,
    date: new Date().toISOString(),
    publishedAt: new Date().toISOString(),
    status: 'monitored',
  }
}

async function fetchWithTimeout(url: string, init: RequestInit): Promise<Response> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 15_000)
  try {
    return await fetch(url, { ...init, signal: controller.signal, cache: 'no-store' })
  } finally {
    clearTimeout(timeout)
  }
}

function extractRecordArray(payload: JsonRecord): JsonRecord[] {
  for (const key of ['data', 'results', 'items', 'recalls']) {
    const value = payload[key]
    if (Array.isArray(value)) return value.filter(isRecord)
  }

  if (Array.isArray(payload)) return payload.filter(isRecord)
  return []
}

function isRecord(value: unknown): value is JsonRecord {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value))
}

function extractHtmlTitle(html: string): string | null {
  const og = html.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i)
  if (og?.[1]) return decodeHtml(og[1])
  const title = html.match(/<title[^>]*>([^<]+)<\/title>/i)
  return title?.[1] ? decodeHtml(title[1]) : null
}

function extractMetaDescription(html: string): string | null {
  const match = html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i)
  return match?.[1] ? decodeHtml(match[1]) : null
}

function decodeHtml(value: string): string {
  return value
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim()
}
