'use server'

/**
 * World Food Programme (WFP) news feed - fetches latest stories from WFP's RSS.
 * Free, no API key needed. Server-side only.
 *
 * Source: https://www.wfp.org/rss.xml (official WFP RSS feed)
 */

import { requireChef } from '@/lib/auth/get-user'

export type WfpStory = {
  title: string
  link: string
  pubDate: string
  description: string
}

/**
 * Fetch latest WFP news stories from their RSS feed.
 * Returns up to `limit` items (default 6). Non-blocking - returns empty on failure.
 */
export async function getWfpNews(limit = 6): Promise<WfpStory[]> {
  await requireChef()

  try {
    const res = await fetch('https://www.wfp.org/rss.xml', {
      next: { revalidate: 3600 }, // cache 1 hour
      signal: AbortSignal.timeout(8000),
    })
    if (!res.ok) return []
    const xml = await res.text()
    return parseRssItems(xml, limit)
  } catch (err) {
    console.warn('[wfp] RSS fetch failed (non-blocking):', err)
    return []
  }
}

/** Minimal RSS XML parser - extracts <item> elements without a library */
function parseRssItems(xml: string, limit: number): WfpStory[] {
  const items: WfpStory[] = []
  const itemRegex = /<item>([\s\S]*?)<\/item>/gi
  let match: RegExpExecArray | null

  while ((match = itemRegex.exec(xml)) !== null && items.length < limit) {
    const block = match[1]
    const title = extractTag(block, 'title')
    const link = extractTag(block, 'link')
    const pubDate = extractTag(block, 'pubDate')
    const description = extractTag(block, 'description')

    if (title && link) {
      items.push({
        title: stripCdata(title),
        link: stripCdata(link),
        pubDate: pubDate ? stripCdata(pubDate) : '',
        description: stripCdata(description ?? '')
          .replace(/<[^>]*>/g, '')
          .slice(0, 300),
      })
    }
  }

  return items
}

function extractTag(xml: string, tag: string): string | null {
  const regex = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, 'i')
  const m = xml.match(regex)
  return m ? m[1].trim() : null
}

function stripCdata(str: string): string {
  return str
    .replace(/^<!\[CDATA\[/, '')
    .replace(/\]\]>$/, '')
    .trim()
}
