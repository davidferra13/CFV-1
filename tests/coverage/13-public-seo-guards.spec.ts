import { test, expect } from '../helpers/fixtures'
import {
  PUBLIC_ROUTE_SEO_CHECKS,
  type PublicRouteSeoSnapshot,
  validatePublicRouteSeoSnapshot,
} from '../helpers/public-route-seo'

function stripHtmlToText(html: string) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\s+/g, ' ')
    .trim()
}

function readTagContent(html: string, patterns: string[]) {
  for (const pattern of patterns) {
    const match = new RegExp(pattern, 'i').exec(html)
    if (match?.[1]) return match[1].trim()
  }
  return null
}

function readRepeatedTagContent(html: string, patterns: string[]) {
  const values = new Set<string>()

  for (const pattern of patterns) {
    const regex = new RegExp(pattern, 'gi')
    for (const match of html.matchAll(regex)) {
      const value = match[1]?.trim()
      if (value) values.add(value)
    }
  }

  return [...values]
}

async function collectPublicRouteSeoSnapshot(
  baseURL: string,
  url: string
): Promise<PublicRouteSeoSnapshot> {
  const response = await fetch(new URL(url, baseURL), {
    signal: AbortSignal.timeout(90_000),
  })
  const status = response.status
  expect(status, `${url} returned HTTP ${status}`).toBeLessThan(500)

  const html = await response.text()
  const titleMatch = /<title>([\s\S]*?)<\/title>/i.exec(html)

  return {
    bodyText: stripHtmlToText(html),
    canonicalHref: readTagContent(html, [
      '<link[^>]+rel="canonical"[^>]+href="([^"]+)"',
      '<link[^>]+href="([^"]+)"[^>]+rel="canonical"',
    ]),
    openGraphImages: readRepeatedTagContent(html, [
      '<meta[^>]+property="og:image"[^>]+content="([^"]+)"',
      '<meta[^>]+content="([^"]+)"[^>]+property="og:image"',
    ]),
    robotsContent: readTagContent(html, [
      '<meta[^>]+name="robots"[^>]+content="([^"]+)"',
      '<meta[^>]+content="([^"]+)"[^>]+name="robots"',
    ]),
    title: titleMatch?.[1]?.trim() ?? '',
    twitterImages: readRepeatedTagContent(html, [
      '<meta[^>]+name="twitter:image(?::src)?"[^>]+content="([^"]+)"',
      '<meta[^>]+content="([^"]+)"[^>]+name="twitter:image(?::src)?"',
      '<meta[^>]+property="twitter:image(?::src)?"[^>]+content="([^"]+)"',
      '<meta[^>]+content="([^"]+)"[^>]+property="twitter:image(?::src)?"',
    ]),
  }
}

test.describe('Public - SEO and Metadata Guardrails', () => {
  test.describe.configure({ timeout: 120_000 })

  for (const route of PUBLIC_ROUTE_SEO_CHECKS) {
    test(`${route.path} - ${route.label}`, async () => {
      const baseURL =
        test.info().project.use.baseURL?.toString() ??
        process.env.PLAYWRIGHT_BASE_URL ??
        'http://127.0.0.1:3100'
      const snapshot = await collectPublicRouteSeoSnapshot(baseURL, route.path)
      const issues = validatePublicRouteSeoSnapshot(snapshot, route)

      expect(
        issues,
        `${route.path} SEO issues:\n${issues.map((issue) => `- ${issue}`).join('\n')}`
      ).toEqual([])
    })
  }
})
