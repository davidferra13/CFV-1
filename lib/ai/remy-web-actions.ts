'use server'

// Remy - Web Search & URL Reading Actions
// PUBLIC DATA ONLY: web search results are public by nature - no privacy concern.
// These actions allow Remy to search the internet and read web pages.

import { requireChef } from '@/lib/auth/get-user'
import { isUrlSafeForFetch } from '@/lib/ai/remy-input-validation'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface WebSearchResult {
  title: string
  snippet: string
  url: string
}

export interface WebReadResult {
  url: string
  title: string
  summary: string
  content: string
}

// ─── Web Search ───────────────────────────────────────────────────────────────

/**
 * Search the web using DuckDuckGo's HTML search.
 * No API key required - free and privacy-respecting.
 * Falls back to Tavily if TAVILY_API_KEY is configured.
 */
export async function searchWeb(query: string, limit = 5): Promise<WebSearchResult[]> {
  await requireChef()

  // Try Tavily first if configured (better results for AI use cases)
  if (process.env.TAVILY_API_KEY) {
    try {
      return await searchWithTavily(query, limit)
    } catch (err) {
      console.warn('[remy-web] Tavily search failed, falling back to DuckDuckGo:', err)
    }
  }

  // Fallback: DuckDuckGo instant answer API + lite HTML scrape
  return await searchWithDuckDuckGo(query, limit)
}

// ─── Web Read (fetch & extract text) ──────────────────────────────────────────

/**
 * Fetch a URL and extract its text content.
 * Returns a summary-length excerpt plus the full text.
 */
export async function readWebPage(url: string): Promise<WebReadResult> {
  await requireChef()

  // SSRF protection: block internal/private URLs
  const urlCheck = isUrlSafeForFetch(url)
  if (!urlCheck.safe) {
    throw new Error(urlCheck.reason ?? 'URL is not allowed.')
  }

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 15000)

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; ChefFlow/1.0; +https://cheflowhq.com)',
        Accept: 'text/html, application/xhtml+xml, text/plain',
      },
      signal: controller.signal,
    })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }

    const html = await response.text()

    // Extract title
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i)
    const title = titleMatch?.[1]?.trim() ?? url

    // Strip HTML tags and extract text
    const text = stripHtml(html)

    // First 2000 chars as summary, full text up to 10000
    const summary = text.slice(0, 2000).trim()
    const content = text.slice(0, 10000).trim()

    return { url, title, summary, content }
  } finally {
    clearTimeout(timeout)
  }
}

// ─── Tavily Search ────────────────────────────────────────────────────────────

async function searchWithTavily(query: string, limit: number): Promise<WebSearchResult[]> {
  const response = await fetch('https://api.tavily.com/search', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      api_key: process.env.TAVILY_API_KEY,
      query,
      max_results: limit,
      search_depth: 'basic',
      include_answer: false,
    }),
    signal: AbortSignal.timeout(10_000),
  })

  if (!response.ok) {
    throw new Error(`Tavily API error: ${response.status}`)
  }

  const data = await response.json()
  return (data.results ?? []).map((r: { title: string; content: string; url: string }) => ({
    title: r.title ?? '',
    snippet: (r.content ?? '').slice(0, 300),
    url: r.url ?? '',
  }))
}

// ─── DuckDuckGo Search ────────────────────────────────────────────────────────

async function searchWithDuckDuckGo(query: string, limit: number): Promise<WebSearchResult[]> {
  // DuckDuckGo instant answer API
  const encoded = encodeURIComponent(query)
  const url = `https://api.duckduckgo.com/?q=${encoded}&format=json&no_redirect=1&no_html=1&skip_disambig=1`

  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; ChefFlow/1.0)',
    },
    signal: AbortSignal.timeout(10_000),
  })

  if (!response.ok) {
    return []
  }

  const data = await response.json()
  const results: WebSearchResult[] = []

  // Abstract (main answer)
  if (data.Abstract) {
    results.push({
      title: data.Heading ?? query,
      snippet: data.Abstract,
      url: data.AbstractURL ?? '',
    })
  }

  // Related topics
  if (data.RelatedTopics) {
    for (const topic of data.RelatedTopics.slice(0, limit - results.length)) {
      if (topic.Text && topic.FirstURL) {
        results.push({
          title: topic.Text.split(' - ')[0] ?? topic.Text.slice(0, 80),
          snippet: topic.Text,
          url: topic.FirstURL,
        })
      }
    }
  }

  // If we got nothing from instant answers, try the HTML lite version
  if (results.length === 0) {
    try {
      const liteUrl = `https://lite.duckduckgo.com/lite/?q=${encoded}`
      const liteResponse = await fetch(liteUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; ChefFlow/1.0)',
        },
        signal: AbortSignal.timeout(10_000),
      })

      if (liteResponse.ok) {
        const html = await liteResponse.text()
        // Extract result links and snippets from the lite page
        const linkRegex = /<a[^>]*class="result-link"[^>]*href="([^"]*)"[^>]*>([^<]*)<\/a>/gi
        const snippetRegex = /<td[^>]*class="result-snippet"[^>]*>([^<]*(?:<[^>]+>[^<]*)*)<\/td>/gi

        const links: Array<{ url: string; title: string }> = []
        let match
        while ((match = linkRegex.exec(html)) !== null && links.length < limit) {
          links.push({ url: match[1], title: stripHtml(match[2]).trim() })
        }

        const snippets: string[] = []
        while ((match = snippetRegex.exec(html)) !== null && snippets.length < limit) {
          snippets.push(stripHtml(match[1]).trim())
        }

        for (let i = 0; i < links.length; i++) {
          results.push({
            title: links[i].title,
            snippet: snippets[i] ?? '',
            url: links[i].url,
          })
        }
      }
    } catch {
      // Non-critical fallback failure
    }
  }

  return results.slice(0, limit)
}

// ─── HTML Stripping ───────────────────────────────────────────────────────────

function stripHtml(html: string): string {
  return html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '') // Remove scripts
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '') // Remove styles
    .replace(/<nav[^>]*>[\s\S]*?<\/nav>/gi, '') // Remove nav
    .replace(/<header[^>]*>[\s\S]*?<\/header>/gi, '') // Remove header
    .replace(/<footer[^>]*>[\s\S]*?<\/footer>/gi, '') // Remove footer
    .replace(/<[^>]+>/g, ' ') // Remove all remaining tags
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ') // Collapse whitespace
    .trim()
}
